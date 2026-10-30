import { BiddingProject, PastProject, TeamMember } from '../types/proposal';
import { generateProposalDocxBlob } from './docxExport';
import {
  getMasterProjectsLibrary,
  getMasterTeamLibrary,
  getMasterBomLibrary,
  getMasterCompanyProfile,
  saveMultipleProjectsToMasterLibrary,
  saveMultipleMembersToMasterLibrary,
} from './masterLibraryService';

export interface GoogleSyncResult {
  success: boolean;
  message: string;
  driveFolderUrl?: string;
  sheetUrl?: string;
  folderStructure?: {
    rootUrl: string;
    torFolderUrl: string;
    contractsFolderUrl: string;
    outputsFolderUrl: string;
  };
  uploadedFilesCount?: number;
  uploadedFiles?: Array<{
    name: string;
    category: string;
    webViewLink: string;
  }>;
  error?: string;
}

export interface GoogleSyncHealth {
  status: string;
  configured: boolean;
  hasEmail: boolean;
  hasKey: boolean;
  hasFolderId: boolean;
  hasSheetId: boolean;
}

export const DEFAULT_GOOGLE_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzE7jWQPQq16UgNWwZPopPiZg8na22WEvxoctreMNojrhK3s62avlqyyaBiEk3Zd4Bu5A/exec';

export function getEffectiveAppsScriptUrl(): string {
  const custom = typeof localStorage !== 'undefined' ? localStorage.getItem('prime_google_apps_script_url') : '';
  if (custom && custom.trim().startsWith('https://script.google.com/')) {
    return custom.trim();
  }
  const envUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;
  if (envUrl && envUrl.trim().startsWith('https://script.google.com/')) {
    return envUrl.trim();
  }
  return DEFAULT_GOOGLE_APPS_SCRIPT_URL;
}

/**
 * แปลง Blob เป็น Base64 String
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * ตรวจสอบความพร้อมของการเชื่อมต่อ Google API
 */
export async function checkGoogleSyncHealth(): Promise<GoogleSyncHealth> {
  try {
    const res = await fetch('/api/google/sync-proposal', {
      method: 'GET',
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Google sync health check failed:', e);
  }

  return {
    status: 'unreachable',
    configured: false,
    hasEmail: false,
    hasKey: false,
    hasFolderId: false,
    hasSheetId: false,
  };
}

/**
 * ปรับโครงสร้าง imageBlocks ของผลงานโครงการให้รองรับทั้ง type 'pair' (leftUrl/rightUrl)
 * และ 'double' (urlLeft/urlRight) สำหรับ Google Apps Script และ API
 */
function normalizeProjectsForGoogleSync(projects: PastProject[] = []): PastProject[] {
  return projects.map((p) => {
    const rawBlocks = Array.isArray(p.imageBlocks) ? p.imageBlocks : [];
    const hasBlockImages = rawBlocks.some(
      (b) => b && (b.url || b.leftUrl || b.rightUrl || (b as any).urlLeft || (b as any).urlRight)
    );
    const normalizedBlocks = rawBlocks.map((b) => {
      if (!b) return b;
      if (b.type === 'pair' || (b as any).type === 'double') {
        const left = b.leftUrl || (b as any).urlLeft || '';
        const right = b.rightUrl || (b as any).urlRight || '';
        return {
          ...b,
          type: 'double' as any,
          leftUrl: left,
          rightUrl: right,
          urlLeft: left,
          urlRight: right,
        };
      }
      return b;
    });

    return {
      ...p,
      // หากมีภาพประกอบใน imageBlocks อยู่แล้ว ไม่ต้องส่ง projectImageUrl ซ้ำเพื่อป้องกันการอัปโหลดซ้ำ 2 รอบ
      projectImageUrl: hasBlockImages ? undefined : (p.projectImageUrl || p.clientLogoUrl),
      imageBlocks: normalizedBlocks,
    };
  });
}

/**
 * ซิงค์ข้อมูลข้อเสนอโครงการทั้งเล่ม พร้อมไฟล์แนบขึ้น Google Drive และ Google Sheets
 */
export async function syncProposalToGoogle(
  project: BiddingProject,
  options?: {
    generateDocx?: boolean;
    onProgress?: (message: string, percent: number) => void;
  }
): Promise<GoogleSyncResult> {
  const onProgress = options?.onProgress || (() => {});

  try {
    onProgress('กำลังจัดเตรียมข้อมูลโครงการและเอกสารแนบ...', 15);

    const normalizedProject: BiddingProject = project.proposalData?.section5?.pastProjects
      ? {
          ...project,
          proposalData: {
            ...project.proposalData,
            section5: {
              ...project.proposalData.section5,
              pastProjects: normalizeProjectsForGoogleSync(project.proposalData.section5.pastProjects),
            },
          },
        }
      : project;

    let docxBase64: string | undefined = undefined;
    let docxFileName: string | undefined = undefined;

    // 1. ส่งออกเล่มข้อเสนอโครงการ Word (.docx) เพื่อนำไปอัปโหลดขึ้น Google Drive ด้วย
    if (options?.generateDocx !== false && project.proposalData) {
      onProgress('กำลังประมวลผลเล่มข้อเสนอโครงการ (.docx)...', 35);
      try {
        const { blob, fileName } = await generateProposalDocxBlob(project.proposalData);
        docxBase64 = await blobToBase64(blob);
        docxFileName = fileName;
      } catch (docErr) {
        console.warn('Could not generate DOCX for sync, continuing with metadata:', docErr);
      }
    }

    const appsScriptUrl = getEffectiveAppsScriptUrl();
    let data: any;

    // ตรวจสอบว่ามีไฟล์ใหม่ที่เป็น base64 (data:) หรือไฟล์ Word (.docx) ที่ต้องอัปโหลดเข้า Drive หรือไม่
    const hasNewProposalBase64 =
      Boolean(docxBase64) ||
      (normalizedProject.attachments || []).some((a) => Boolean(a.dataUrl?.startsWith('data:'))) ||
      (normalizedProject.proposalData?.section5?.pastProjects || []).some((p) => {
        if (p.certificateFileUrl?.startsWith('data:') || p.projectImageUrl?.startsWith('data:')) return true;
        return (p.imageBlocks || []).some((b: any) =>
          Boolean(b?.url?.startsWith('data:') || (b?.leftUrl || b?.urlLeft)?.startsWith('data:') || (b?.rightUrl || b?.urlRight)?.startsWith('data:'))
        );
      }) ||
      (normalizedProject.proposalData?.section4?.teamMembers || []).some((m) => Boolean(m.photoUrl?.startsWith('data:')));

    if (hasNewProposalBase64 && appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
      onProgress('กำลังอัปโหลดเฉพาะไฟล์ใหม่ผ่าน Google Apps Script (Drive ส่วนตัวของคุณ)...', 55);

      // ส่งเฉพาะโครงการที่มีไฟล์ base64 ใหม่ไปยัง Apps Script เพื่อความรวดเร็วในการอัปโหลดเข้า Drive
      const projectForDriveUpload: BiddingProject = {
        ...normalizedProject,
        proposalData: normalizedProject.proposalData
          ? {
              ...normalizedProject.proposalData,
              section5: normalizedProject.proposalData.section5
                ? {
                    ...normalizedProject.proposalData.section5,
                    pastProjects: (normalizedProject.proposalData.section5.pastProjects || []).filter((p) => {
                      if (p.certificateFileUrl?.startsWith('data:') || p.projectImageUrl?.startsWith('data:')) return true;
                      return (p.imageBlocks || []).some((b: any) =>
                        Boolean(b?.url?.startsWith('data:') || (b?.leftUrl || b?.urlLeft)?.startsWith('data:') || (b?.rightUrl || b?.urlRight)?.startsWith('data:'))
                      );
                    }),
                  }
                : normalizedProject.proposalData.section5,
            }
          : normalizedProject.proposalData,
      };

      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          project: projectForDriveUpload,
          docxBase64,
          docxFileName,
        }),
      });

      onProgress('กำลังบันทึกข้อมูลลง Google Sheet และจัดเรียงไดรฟ์...', 80);
      const rawText = await response.text();
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error('การตอบกลับจาก Google Apps Script: ' + rawText.substring(0, 120));
      }

      // อัปเดต Google Sheet ผ่าน Service Account ซ้ำอีกครั้งเพื่อให้สูตร =IMAGE(...) ของภาพทั้ง 73 ภาพและสูตรผูกข้ามแท็บครบถ้วน 100%
      try {
        await fetch('/api/google/sync-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sheetOnly: true,
            project: normalizedProject,
            driveFolderUrl: data?.driveFolderUrl,
            folderStructure: data?.folderStructure,
            uploadedFiles: data?.uploadedFiles || [],
          }),
        });
      } catch (sheetSyncErr) {
        console.warn('Secondary sheet sync skipped:', sheetSyncErr);
      }
    } else {
      onProgress('กำลังอัปเดตข้อมูลล่าสุดลง Google Sheet อย่างรวดเร็ว...', 60);

      // เรียก Vercel Serverless Function /api/google/sync-proposal
      const response = await fetch('/api/google/sync-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sheetOnly: !hasNewProposalBase64,
          project: normalizedProject,
          docxBase64,
          docxFileName,
        }),
      });

      onProgress('กำลังบันทึกข้อมูลลง Google Sheet...', 85);
      data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'การซิงค์ข้อมูลล้มเหลว กรุณาตรวจสอบการตั้งค่า Service Account');
      }
    }

    if (!data.success) {
      throw new Error(data.error || 'การซิงค์ข้อมูลล้มเหลว');
    }

    onProgress('ซิงค์ข้อมูลและอัปโหลดไฟล์เสร็จสมบูรณ์ 100%', 100);
    return data;
  } catch (error: any) {
    console.error('Google Sync Service Error:', error);
    return {
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google',
      error: error.message,
    };
  }
}

export interface MasterLibrarySyncResult {
  success: boolean;
  message: string;
  sheetUrl?: string;
  driveFolderUrl?: string;
  updatedProjects?: PastProject[];
  updatedTeam?: TeamMember[];
  counts?: {
    projects: number;
    team: number;
    bom: number;
    company: number;
  };
  error?: string;
}

/**
 * ซิงค์ข้อมูลคลังกลาง (รองรับทั้งโหมด Incremental ซิงค์เฉพาะโครงการ/บุคลากรที่เลือก และโหมด Full Sync ซิงค์ทั้งหมด)
 * ขึ้นสู่แท็บ [คลังกลาง] ใน Google Sheet และ Google Drive
 */
export async function syncMasterLibraryToGoogle(options?: {
  onProgress?: (message: string, percent: number) => void;
  projectsToSync?: PastProject[];
  teamToSync?: TeamMember[];
  incremental?: boolean;
}): Promise<MasterLibrarySyncResult> {
  const onProgress = options?.onProgress || (() => {});
  const hasProjectsToSync = Boolean(options?.projectsToSync && options.projectsToSync.length > 0);
  const hasTeamToSync = Boolean(options?.teamToSync && options.teamToSync.length > 0);
  const isIncremental = Boolean(options?.incremental && (hasProjectsToSync || hasTeamToSync));

  try {
    const rawProjects = isIncremental ? (options?.projectsToSync || []) : getMasterProjectsLibrary();
    const masterProjects = normalizeProjectsForGoogleSync(rawProjects);
    const masterTeam = isIncremental ? (options?.teamToSync || []) : getMasterTeamLibrary();
    const masterBom = isIncremental ? [] : getMasterBomLibrary();
    const masterCompany = isIncremental ? {} : getMasterCompanyProfile();

    const incrementalSummary =
      masterProjects.length > 0 && masterTeam.length === 0
        ? `เฉพาะโครงการที่เลือก (${masterProjects.length} โครงการ)`
        : masterProjects.length === 0 && masterTeam.length > 0
        ? `เฉพาะบุคลากรที่เลือก (${masterTeam.length} ท่าน)`
        : `เฉพาะรายการที่เลือก (${masterProjects.length} โครงการ, ${masterTeam.length} ท่าน)`;

    onProgress(
      isIncremental
        ? `กำลังเตรียมซิงค์${incrementalSummary}...`
        : 'กำลังรวบรวมข้อมูลคลังกลางทั้งหมด (ผลงาน บุคลากร BOM บริษัท)...',
      20
    );

    // ตรวจสอบว่ามีไฟล์ใหม่ที่เป็น base64 (data:) ที่ต้องอัปโหลดขึ้น Google Drive หรือไม่
    const hasNewBase64Files =
      masterProjects.some((p) => {
        if (p.certificateFileUrl?.startsWith('data:')) return true;
        if (p.clientLogoUrl?.startsWith('data:')) return true;
        if (p.projectImageUrl?.startsWith('data:')) return true;
        if (Array.isArray(p.imageBlocks)) {
          return p.imageBlocks.some((b: any) => {
            if (!b) return false;
            if (b.type === 'single') return Boolean(b.url?.startsWith('data:'));
            return Boolean((b.leftUrl || b.urlLeft)?.startsWith('data:') || (b.rightUrl || b.urlRight)?.startsWith('data:'));
          });
        }
        return false;
      }) ||
      masterTeam.some((t) => {
        if (t.photoUrl?.startsWith('data:')) return true;
        const bioBlocks = (t as any).bioImageBlocks || t.imageBlocks || [];
        if (Array.isArray(bioBlocks)) {
          return bioBlocks.some((b: any) => {
            if (!b) return false;
            if (b.type === 'single') return Boolean(b.url?.startsWith('data:'));
            return Boolean((b.leftUrl || b.urlLeft)?.startsWith('data:') || (b.rightUrl || b.urlRight)?.startsWith('data:'));
          });
        }
        return false;
      });

    const response = await fetch('/api/google/sync-proposal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'sync_master_library',
        sheetOnly: !hasNewBase64Files,
        incremental: isIncremental,
        masterProjects,
        masterTeam,
        masterBom,
        masterCompany,
      }),
    });

    onProgress('กำลังบันทึกลงแท็บคลังกลางและตารางอ้างอิงใน Google Sheet...', 85);
    const parsed = await response.json();
    if (!response.ok || !parsed?.success) {
      throw new Error(parsed?.error || `การซิงค์ผ่านเซิร์ฟเวอร์ล้มเหลว (HTTP ${response.status})`);
    }
    const data = parsed;
    if (Array.isArray(parsed.updatedProjects) && parsed.updatedProjects.length > 0) {
      saveMultipleProjectsToMasterLibrary(parsed.updatedProjects);
    }
    if (Array.isArray(parsed.updatedTeam) && parsed.updatedTeam.length > 0) {
      saveMultipleMembersToMasterLibrary(parsed.updatedTeam);
    }

    onProgress('ซิงค์ข้อมูลสำเร็จสมบูรณ์ 100%', 100);
    return data;
  } catch (error: any) {
    console.error('Master Library Google Sync Error:', error);
    return {
      success: false,
      message: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Sheets',
      error: error.message,
    };
  }
}


/**
 * ดึงข้อมูลคลังกลางล่าสุด (ผลงาน 33 คอลัมน์พร้อม imageBlocks และบุคลากร) จาก Google Sheet & Drive
 */
export async function fetchMasterLibraryFromGoogleSheet(): Promise<{
  success: boolean;
  projects?: PastProject[];
  team?: TeamMember[];
  message?: string;
  error?: string;
}> {
  let data: any = null;
  let isOutdatedScript = false;

  // 1. ดึงผ่านระบบหลังบ้าน Serverless / Local API (Service Account) เป็นลำดับแรก
  // เพื่อให้อ่านคอลัมน์ A2:AG ทั้ง 33 คอลัมน์และถอดรหัส imageBlocks ทั้ง 73 ภาพได้ครบถ้วน 100%
  try {
    const apiRes = await fetch('/api/google/sync-proposal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_master_library',
      }),
    });

    if (apiRes.ok) {
      const parsed = await apiRes.json();
      if (parsed.success && Array.isArray(parsed.projects)) {
        data = parsed;
      }
    }
  } catch (apiErr) {
    console.warn('Backend API master library pull error, trying Apps Script fallback:', apiErr);
  }

  // 2. หาก Backend API ไม่พร้อมใช้งาน ให้ดึงผ่าน Google Apps Script Web App
  const appsScriptUrl = getEffectiveAppsScriptUrl();
  if (!data && appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
    try {
      const res = await fetch(appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'get_master_library',
        }),
      });

      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        if (parsed.success && Array.isArray(parsed.projects)) {
          data = parsed;
        } else if (parsed.error && String(parsed.error).includes('Missing project data')) {
          isOutdatedScript = true;
        }
      } catch {
        console.warn('Apps Script returned non-JSON response');
      }
    } catch (gasErr) {
      console.warn('Could not pull master library via Apps Script:', gasErr);
    }
  }

  if (data && data.success && Array.isArray(data.projects)) {
    const enrichedProjects = normalizeProjectsForGoogleSync(data.projects);
    return {
      success: true,
      projects: enrichedProjects,
      team: data.team || [],
      message: `ดึงข้อมูลล่าสุดจาก Google Sheet & Drive สำเร็จ: พบผลงาน ${enrichedProjects.length} โครงการ, บุคลากร ${(data.team || []).length} ท่าน`,
    };
  }

  if (isOutdatedScript) {
    return {
      success: false,
      error:
        'Google Apps Script บน Google Drive ของคุณยังเป็นเวอร์ชันเก่า (ยังไม่รองรับ action: get_master_library)\n\nวิธีแก้ไข:\n1. เปิด Google Sheet แล้วไปที่เมนู "ส่วนขยาย (Extensions) > Apps Script"\n2. คัดลอกโค้ดจากไฟล์ google_apps_script_sync.js ในระบบไปวางแทนที่ทั้งหมด\n3. กดปุ่ม "ทำให้ใช้งานได้ (Deploy) > การทำให้ใช้งานได้รายการใหม่ (New deployment)" แล้วบันทึก',
    };
  }

  return {
    success: false,
    error:
      data?.error ||
      'ไม่สามารถดึงข้อมูลจาก Google Sheet ได้ กรุณาตรวจสอบว่ากำหนด Google Apps Script Web App URL หรือ Google Sheets API เรียบร้อยแล้ว',
  };
}

/**
 * ดึงข้อมูลล่าสุดของโครงการที่เสนอ (Overview + ผลงานอ้างอิง Section 5 + คลังกลาง) จาก Google Sheet & Drive
 * เพื่อนำมาอัปเดตลงในเครื่อง Local ก่อนแก้ไขเพิ่มเติม
 */
export async function fetchProposalFromGoogleSheet(
  projectCode: string,
  projectTitle?: string
): Promise<{
  success: boolean;
  overview?: any;
  pastProjects?: PastProject[];
  masterProjects?: PastProject[];
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/google/sync-proposal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_proposal_from_sheet',
        projectCode,
        projectTitle,
      }),
    });

    if (res.ok) {
      const parsed = await res.json();
      if (parsed.success) {
        return {
          success: true,
          overview: parsed.overview,
          pastProjects: Array.isArray(parsed.pastProjects)
            ? normalizeProjectsForGoogleSync(parsed.pastProjects)
            : [],
          masterProjects: Array.isArray(parsed.masterProjects)
            ? normalizeProjectsForGoogleSync(parsed.masterProjects)
            : [],
          message: parsed.message || 'ดึงข้อมูลโครงการล่าสุดจาก Google Sheet & Drive สำเร็จ',
        };
      }
    }

    // Fallback: ดึงคลังกลางหากยังไม่พบแถวโครงการใน Overview
    const masterFallback = await fetchMasterLibraryFromGoogleSheet();
    if (masterFallback.success && masterFallback.projects) {
      return {
        success: true,
        pastProjects: masterFallback.projects,
        masterProjects: masterFallback.projects,
        message: masterFallback.message,
      };
    }

    return {
      success: false,
      error: 'ไม่สามารถดึงข้อมูลโครงการจาก Google Sheet ได้',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลโครงการจาก Google Sheet',
    };
  }
}
