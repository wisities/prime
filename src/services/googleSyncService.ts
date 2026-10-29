import { BiddingProject, PastProject, TeamMember } from '../types/proposal';
import { generateProposalDocxBlob } from './docxExport';
import {
  getMasterProjectsLibrary,
  getMasterTeamLibrary,
  getMasterBomLibrary,
  getMasterCompanyProfile,
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

    if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
      onProgress('กำลังส่งข้อมูลผ่าน Google Apps Script (Drive ส่วนตัวของคุณ)...', 55);

      // เรียกตรงไปยัง Google Apps Script Web App เพื่อใช้ Quota บัญชีส่วนตัวของผู้ใช้โดยตรง
      const response = await fetch(appsScriptUrl, {
        method: 'POST',
        // ใช้ text/plain เพื่อป้องกันปัญหา CORS Preflight ใน Google Apps Script
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          project,
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
    } else {
      onProgress('กำลังเชื่อมต่อ Google Cloud Serverless API...', 55);

      // เรียก Vercel Serverless Function /api/google/sync-proposal
      const response = await fetch('/api/google/sync-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project,
          docxBase64,
          docxFileName,
        }),
      });

      onProgress('กำลังบันทึกข้อมูลลง Google Sheet และจัดเรียงไดรฟ์...', 80);
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
  counts?: {
    projects: number;
    team: number;
    bom: number;
    company: number;
  };
  error?: string;
}

/**
 * ซิงค์ข้อมูลคลังกลางทั้งหมด (Master Projects, Master Team, Master BOM, Master Company)
 * ขึ้นสู่แท็บ [คลังกลาง] ทั้ง 4 แท็บใน Google Sheet และ Google Drive
 */
export async function syncMasterLibraryToGoogle(options?: {
  onProgress?: (message: string, percent: number) => void;
}): Promise<MasterLibrarySyncResult> {
  const onProgress = options?.onProgress || (() => {});

  try {
    onProgress('กำลังรวบรวมข้อมูลคลังกลาง (ผลงาน บุคลากร BOM บริษัท)...', 20);

    const masterProjects = getMasterProjectsLibrary();
    const masterTeam = getMasterTeamLibrary();
    const masterBom = getMasterBomLibrary();
    const masterCompany = getMasterCompanyProfile();

    const appsScriptUrl = getEffectiveAppsScriptUrl();
    let data: any;

    if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
      onProgress('กำลังส่งข้อมูลคลังกลางผ่าน Google Apps Script...', 50);

      try {
        const response = await fetch(appsScriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'sync_master_library',
            masterProjects,
            masterTeam,
            masterBom,
            masterCompany,
          }),
        });

        const rawText = await response.text();
        try {
          const parsed = JSON.parse(rawText);
          if (parsed.success) {
            data = parsed;
          } else {
            console.warn('Apps Script returned error:', parsed.error);
            if (String(parsed.error).includes('Missing project data')) {
              throw new Error(
                'Google Apps Script บน Google Drive ยังเป็นเวอร์ชันเก่า กรุณานำโค้ดล่าสุดจากไฟล์ google_apps_script_sync.js ไปวางในส่วนขยาย Apps Script บน Google Sheet แล้วกด "ทำให้ใช้งานได้ > การทำให้ใช้งานได้รายการใหม่" เพื่อเปิดใช้งานคอลัมน์ประวัติย่อและคลังกลาง'
              );
            }
          }
        } catch (jsonErr: any) {
          if (jsonErr.message && jsonErr.message.includes('google_apps_script_sync.js')) {
            throw jsonErr;
          }
          console.warn('Apps Script response not JSON, falling back');
        }
      } catch (gasErr: any) {
        if (gasErr.message && gasErr.message.includes('google_apps_script_sync.js')) {
          throw gasErr;
        }
        console.warn('Apps Script fetch failed, falling back:', gasErr);
      }
    }

    if (!data) {
      onProgress('กำลังเชื่อมต่อ Google Sheets API...', 65);

      const response = await fetch('/api/google/sync-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sync_master_library',
          masterProjects,
          masterTeam,
          masterBom,
          masterCompany,
        }),
      });

      onProgress('กำลังบันทึกลงแท็บคลังกลางใน Google Sheet...', 85);
      data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'การซิงค์ข้อมูลคลังกลางล้มเหลว');
      }
    }

    if (!data.success) {
      throw new Error(data.error || 'การซิงค์ข้อมูลคลังกลางล้มเหลว');
    }

    onProgress('ซิงค์คลังข้อมูลกลางสำเร็จสมบูรณ์ 100%', 100);
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
 * ดึงข้อมูลคลังกลาง (ผลงาน และบุคลากร) จาก Google Sheet ผ่าน Google Apps Script Web App
 */
export async function fetchMasterLibraryFromGoogleSheet(): Promise<{
  success: boolean;
  projects?: PastProject[];
  team?: TeamMember[];
  message?: string;
  error?: string;
}> {
  const appsScriptUrl = getEffectiveAppsScriptUrl();
  let data: any = null;
  let isOutdatedScript = false;

  // 1. ลองดึงผ่าน Google Apps Script Web App หากกำหนดไว้
  if (appsScriptUrl && appsScriptUrl.startsWith('https://script.google.com/')) {
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
        console.warn('Apps Script returned non-JSON response, attempting backend API fallback');
      }
    } catch (gasErr) {
      console.warn('Could not pull master library via Apps Script, attempting backend API fallback:', gasErr);
    }
  }

  // 2. หากยังไม่ได้ข้อมูล ให้ลองดึงผ่านระบบหลังบ้าน Serverless / Local API
  if (!data) {
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
      console.warn('Backend API master library pull error:', apiErr);
    }
  }

  if (data && data.success && Array.isArray(data.projects)) {
    return {
      success: true,
      projects: data.projects,
      team: data.team || [],
      message: `ดึงข้อมูลจาก Google Sheet สำเร็จ: พบผลงาน ${data.projects.length} รายการ, บุคลากร ${(data.team || []).length} ท่าน`,
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
