import { google } from 'googleapis';
import { Readable } from 'stream';

type DriveClient = ReturnType<typeof google.drive>;

export interface UploadedFileResult {
  fileId: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  category: string;
  projectRef?: string;
  memberRef?: string;
}

export interface ProjectFolderStructure {
  yearFolderId: string;
  projectFolderId: string;
  projectFolderUrl: string;
  subfolders: {
    tor: { id: string; url: string };
    contracts: { id: string; url: string };
    outputs: { id: string; url: string };
    other: { id: string; url: string };
  };
}

/**
 * ค้นหาโฟลเดอร์ตามชื่อใต้โฟลเดอร์แม่ หากยังไม่มีให้สร้างใหม่
 */
export async function getOrCreateFolder(
  drive: DriveClient,
  parentFolderId: string,
  folderName: string
): Promise<{ id: string; url: string }> {
  const safeName = folderName.replace(/'/g, "\\'");
  const q = `'${parentFolderId}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const searchRes = await drive.files.list({
    q,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    const existing = searchRes.data.files[0];
    return {
      id: existing.id!,
      url: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
    };
  }

  // สร้างโฟลเดอร์ใหม่
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });

  const newId = createRes.data.id!;
  return {
    id: newId,
    url: createRes.data.webViewLink || `https://drive.google.com/drive/folders/${newId}`,
  };
}

/**
 * สร้างโครงสร้างโฟลเดอร์สำหรับข้อเสนอโครงการตามปี พ.ศ. และรหัสโครงการ
 */
export async function setupProjectFolderHierarchy(
  drive: DriveClient,
  rootParentId: string,
  yearBE: number,
  projectCode: string,
  projectTitle: string
): Promise<ProjectFolderStructure> {
  // 1. โฟลเดอร์ปี พ.ศ. (เช่น "ปี 2569")
  const yearFolderName = `ปี ${yearBE || 2569}`;
  const yearFolder = await getOrCreateFolder(drive, rootParentId, yearFolderName);

  // 2. โฟลเดอร์เฉพาะของโครงการนี้ (เช่น "[EGP-69-39837] กิจกรรมการสร้างความตระหนักรู้...")
  const cleanTitle = projectTitle.replace(/[\/\\?%*:|"<>]/g, '_').trim().substring(0, 60);
  const projectFolderName = `[${projectCode || 'DRAFT'}] ${cleanTitle}`;
  const projectFolder = await getOrCreateFolder(drive, yearFolder.id, projectFolderName);

  // 3. โฟลเดอร์ย่อย 4 หมวด
  const torSubfolder = await getOrCreateFolder(drive, projectFolder.id, '01_TOR_และประกาศจัดจ้าง');
  const contractsSubfolder = await getOrCreateFolder(drive, projectFolder.id, '02_สำเนาสัญญาและหนังสือรับรองผลงาน');
  const outputsSubfolder = await getOrCreateFolder(drive, projectFolder.id, '03_เล่มข้อเสนอโครงการ');
  const otherSubfolder = await getOrCreateFolder(drive, projectFolder.id, '04_เอกสารอื่นๆ');

  return {
    yearFolderId: yearFolder.id,
    projectFolderId: projectFolder.id,
    projectFolderUrl: projectFolder.url,
    subfolders: {
      tor: torSubfolder,
      contracts: contractsSubfolder,
      outputs: outputsSubfolder,
      other: otherSubfolder,
    },
  };
}

/**
 * แปลง Base64 หรือ Buffer เป็น Stream เพื่ออัปโหลดขึ้น Drive
 */
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

const DEFAULT_APPS_SCRIPT_BRIDGE_URL =
  process.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbzE7jWQPQq16UgNWwZPopPiZg8na22WEvxoctreMNojrhK3s62avlqyyaBiEk3Zd4Bu5A/exec';

async function uploadFileViaAppsScriptBridge(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  category: string,
  projectRef?: string,
  memberRef?: string
): Promise<UploadedFileResult> {
  const dataUri = `data:${mimeType || 'image/png'};base64,${buffer.toString('base64')}`;
  const mappedCategory =
    category === 'contract_cert' || category === 'master_cert'
      ? 'contract_cert'
      : category === 'tor' || category === 'announcement'
      ? 'tor'
      : 'other';

  const res = await fetch(DEFAULT_APPS_SCRIPT_BRIDGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      project: {
        projectCode: '__DRIVE_UPLOAD_BRIDGE__',
        projectTitle: '00_คลังข้อมูลกลาง_Master_Library',
        status: 'active',
      },
      files: [
        {
          name: fileName,
          category: mappedCategory,
          base64: dataUri,
          type: mimeType || 'image/png',
        },
      ],
    }),
  });

  const rawText = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(`Apps Script Drive Bridge returned non-JSON: ${rawText.substring(0, 120)}`);
  }

  const uploaded = parsed?.uploadedFiles?.[0];
  if (!parsed?.success || !uploaded?.fileId) {
    throw new Error(parsed?.error || 'Apps Script Drive Bridge did not return a fileId');
  }

  return {
    fileId: uploaded.fileId,
    name: fileName,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.fileId}/view?usp=drivesdk`,
    category,
    projectRef,
    memberRef,
  };
}

/**
 * อัปโหลดไฟล์ขึ้น Google Drive (รองรับ Fallback ผ่าน Apps Script Bridge อัตโนมัติเมื่อ Service Account ติดโควตา)
 */
export async function uploadFileToDrive(
  drive: DriveClient,
  targetFolderId: string,
  fileName: string,
  mimeType: string,
  fileContent: Buffer | string,
  category: string = 'other',
  projectRef?: string,
  memberRef?: string
): Promise<UploadedFileResult> {
  let buffer: Buffer;

  if (Buffer.isBuffer(fileContent)) {
    buffer = fileContent;
  } else if (typeof fileContent === 'string') {
    // กรณี Base64 มี data URI prefix เช่น "data:application/pdf;base64,..."
    const pureBase64 = fileContent.includes(',') ? fileContent.split(',')[1] : fileContent;
    buffer = Buffer.from(pureBase64, 'base64');
  } else {
    throw new Error('รูปแบบไฟล์ไม่ถูกต้อง ต้องเป็น Buffer หรือ Base64 string');
  }

  try {
    if (targetFolderId) {
      // ตรวจสอบว่าไฟล์ชื่อซ้ำในโฟลเดอร์นั้นหรือไม่
      const safeName = fileName.replace(/'/g, "\\'");
      const q = `'${targetFolderId}' in parents and name = '${safeName}' and trashed = false`;
      const existingFiles = await drive.files.list({
        q,
        fields: 'files(id, name, webViewLink)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: bufferToStream(buffer),
      };

      let fileId = '';
      let webViewLink = '';
      let webContentLink = '';

      if (existingFiles.data.files && existingFiles.data.files.length > 0) {
        // อัปเดตไฟล์เดิม (Overwrite version)
        fileId = existingFiles.data.files[0].id!;
        const updateRes = await drive.files.update({
          fileId,
          media,
          fields: 'id, name, webViewLink, webContentLink',
          supportsAllDrives: true,
        });
        webViewLink = updateRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
        webContentLink = updateRes.data.webContentLink || undefined;
      } else {
        // สร้างไฟล์ใหม่
        const createRes = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [targetFolderId],
            mimeType: mimeType || 'application/octet-stream',
          },
          media,
          fields: 'id, name, webViewLink, webContentLink',
          supportsAllDrives: true,
        });
        fileId = createRes.data.id!;
        webViewLink = createRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
        webContentLink = createRes.data.webContentLink || undefined;
      }

      return {
        fileId,
        name: fileName,
        webViewLink,
        webContentLink,
        category,
        projectRef,
        memberRef,
      };
    }
  } catch (driveErr: any) {
    console.warn(`Service Account Drive upload fallback to Apps Script Bridge for ${fileName}:`, driveErr?.message || driveErr);
  }

  return uploadFileViaAppsScriptBridge(fileName, mimeType, buffer, category, projectRef, memberRef);
}

/**
 * ดาวน์โหลดและ parse ไฟล์ JSON (เช่น proposal_data.json) จากโฟลเดอร์โครงการบน Google Drive
 */
export async function downloadJsonFileFromDrive(
  drive: DriveClient,
  folderId: string,
  fileName: string = 'proposal_data.json'
): Promise<any | null> {
  if (!drive || !folderId) return null;
  try {
    const safeName = fileName.replace(/'/g, "\\'");
    const q = `'${folderId}' in parents and name = '${safeName}' and trashed = false`;
    const searchRes = await drive.files.list({
      q,
      fields: 'files(id, name)',
      spaces: 'drive',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (!searchRes.data.files || searchRes.data.files.length === 0) {
      return null;
    }

    const fileId = searchRes.data.files[0].id!;
    const fileRes = await drive.files.get(
      {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      },
      { responseType: 'text' }
    );

    if (typeof fileRes.data === 'string') {
      try {
        return JSON.parse(fileRes.data);
      } catch (pErr) {
        console.warn(`File ${fileName} is not valid JSON:`, pErr);
        return null;
      }
    }
    return fileRes.data;
  } catch (err: any) {
    console.warn(`Could not download ${fileName} from Drive folder ${folderId}:`, err?.message || err);
    return null;
  }
}

/**
 * ค้นหาโฟลเดอร์ของโครงการใน Google Drive โดยใช้รหัสโครงการ หรือดึง ID จาก URL
 */
export async function findProjectFolderId(
  drive: DriveClient,
  parentFolderId: string,
  projectCode: string,
  driveFolderUrl?: string
): Promise<string | null> {
  if (!drive) return null;

  // 1. ลองดึง File/Folder ID จาก URL ก่อน
  if (driveFolderUrl) {
    const idFromUrl = extractDriveFileIdFromUrl(driveFolderUrl);
    if (idFromUrl) return idFromUrl;
  }

  // 2. ค้นหาโฟลเดอร์ที่มีรหัสโครงการในชื่อโฟลเดอร์ (เช่น [2568-PRJ-001] ...)
  if (projectCode && parentFolderId) {
    try {
      const safeCode = projectCode.replace(/'/g, "\\'");
      const q = `mimeType = 'application/vnd.google-apps.folder' and name contains '${safeCode}' and trashed = false`;
      const searchRes = await drive.files.list({
        q,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (searchRes.data.files && searchRes.data.files.length > 0) {
        return searchRes.data.files[0].id || null;
      }
    } catch (searchErr) {
      console.warn('Could not search folder by projectCode:', searchErr);
    }
  }

  return null;
}

function extractDriveFileIdFromUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const m1 = url.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (m1 && m1[1]) return m1[1];
  const m2 = url.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
  if (m2 && m2[1]) return m2[1];
  const m3 = url.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (m3 && m3[1]) return m3[1];
  return '';
}

