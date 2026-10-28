import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export interface GoogleAuthClients {
  drive: ReturnType<typeof google.drive>;
  sheets: ReturnType<typeof google.sheets>;
  auth: InstanceType<typeof google.auth.JWT>;
}

export function getGoogleCredentials() {
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
  let parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '157aWxavvB6eKzjb3iCiRJRyzMO_pbCj9';
  let masterSheetId = process.env.GOOGLE_MASTER_SHEET_ID || '1fT8DsROkO0xJ9XL0NtkFlgct6G_NzdU8WBtCRlv3NYI';

  // หากไม่มี privateKey ใน env ให้ลองค้นหาไฟล์ Service Account JSON ในโฟลเดอร์โปรเจกต์
  if (!clientEmail || !privateKey) {
    try {
      const rootDir = process.cwd();
      const files = fs.readdirSync(rootDir);
      const jsonKeyFile = files.find(
        (f) => (f.startsWith('prime-proposal-') || f.includes('serviceaccount')) && f.endsWith('.json')
      );
      if (jsonKeyFile) {
        const fileContent = JSON.parse(fs.readFileSync(path.join(rootDir, jsonKeyFile), 'utf-8'));
        if (fileContent.client_email && fileContent.private_key) {
          clientEmail = fileContent.client_email;
          privateKey = fileContent.private_key;
        }
      }
    } catch {}
  }

  // จัดการขึ้นบรรทัดใหม่ใน Private Key (ทั้งแบบ \n และ \\n ที่มักเจอบน Vercel/Environment)
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
    }
  }

  return {
    clientEmail,
    privateKey,
    parentFolderId,
    masterSheetId,
    isConfigured: Boolean(clientEmail && privateKey && parentFolderId),
  };
}

export async function getGoogleClients(): Promise<GoogleAuthClients> {
  const { clientEmail, privateKey, isConfigured } = getGoogleCredentials();

  if (!isConfigured) {
    throw new Error(
      'Google Service Account ยังไม่ได้รับการตั้งค่า กรุณาระบุ GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY และ GOOGLE_DRIVE_PARENT_FOLDER_ID ใน Environment Variables'
    );
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets',
  ];

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes,
  });

  await auth.authorize();

  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  return { drive, sheets, auth };
}
