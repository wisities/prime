import { BiddingProject } from '../types/proposal';
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

    const appsScriptUrl =
      import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
      localStorage.getItem('prime_google_apps_script_url') ||
      '';

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

    const appsScriptUrl =
      import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
      localStorage.getItem('prime_google_apps_script_url') ||
      '';

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
            console.warn('Apps Script returned error, falling back to direct API:', parsed.error);
          }
        } catch {
          console.warn('Apps Script response not JSON, falling back');
        }
      } catch (gasErr) {
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

