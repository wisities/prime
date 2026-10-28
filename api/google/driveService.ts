import { google } from 'googleapis';
import { Readable } from 'stream';

type DriveClient = ReturnType<typeof google.drive>;

export interface UploadedFileResult {
  fileId: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  category: string;
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

/**
 * อัปโหลดไฟล์ขึ้น Google Drive
 */
export async function uploadFileToDrive(
  drive: DriveClient,
  targetFolderId: string,
  fileName: string,
  mimeType: string,
  fileContent: Buffer | string,
  category: string = 'other'
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
  };
}
