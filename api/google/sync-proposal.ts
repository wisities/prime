import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGoogleClients, getGoogleCredentials } from './auth';
import { setupProjectFolderHierarchy, uploadFileToDrive, UploadedFileResult } from './driveService';
import { syncProjectToGoogleSheet, syncMasterLibraryToGoogleSheet } from './sheetsService';
import { BiddingProject } from '../../src/types/proposal';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // รองรับ CORS preflight
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Health check endpoint
    const creds = getGoogleCredentials();
    return res.status(200).json({
      status: 'ok',
      configured: creds.isConfigured,
      hasEmail: Boolean(creds.clientEmail),
      hasKey: Boolean(creds.privateKey),
      hasFolderId: Boolean(creds.parentFolderId),
      hasSheetId: Boolean(creds.masterSheetId),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. กรุณาใช้ POST' });
  }

  try {
    // กรณีซิงค์ข้อมูลกลาง (Master Library)
    if (req.body.action === 'sync_master_library' || req.body.masterProjects) {
      const { masterProjects = [], masterTeam = [], masterBom = [], masterCompany = {} } = req.body;
      const { masterSheetId } = getGoogleCredentials();
      const { sheets } = await getGoogleClients();

      const sheetUrl = await syncMasterLibraryToGoogleSheet(sheets, masterSheetId, {
        masterProjects,
        masterTeam,
        masterBom,
        masterCompany,
      });

      return res.status(200).json({
        success: true,
        message: `ซิงค์คลังข้อมูลกลาง (${masterProjects.length} ผลงาน, ${masterTeam.length} บุคลากร, ${masterBom.length} BOM) เข้าสู่ Google Sheet สำเร็จเรียบร้อย!`,
        sheetUrl,
        counts: {
          projects: masterProjects.length,
          team: masterTeam.length,
          bom: masterBom.length,
          company: 1,
        },
      });
    }

    const { project, docxBase64, docxFileName, files } = req.body as {
      project: BiddingProject;
      docxBase64?: string;
      docxFileName?: string;
      files?: Array<{
        name: string;
        category: 'tor' | 'announcement' | 'contract_cert' | 'other';
        base64: string;
        type: string;
      }>;
    };

    if (!project || !project.projectTitle) {
      return res.status(400).json({
        error: 'ข้อมูลโครงการไม่ครบถ้วน ต้องระบุ projectTitle และ projectCode',
      });
    }

    const { parentFolderId, masterSheetId } = getGoogleCredentials();
    const { drive, sheets } = await getGoogleClients();

    // กำหนดปี พ.ศ. ของโครงการ
    const yearBE =
      project.proposalData?.section5?.pastProjects?.[0]?.contractYearBE ||
      new Date().getFullYear() + 543;

    // 1. จัดเตรียมโครงสร้างโฟลเดอร์ใน Google Drive
    const folderStructure = await setupProjectFolderHierarchy(
      drive,
      parentFolderId,
      yearBE,
      project.projectCode || 'NO-CODE',
      project.projectTitle
    );

    const uploadedResults: UploadedFileResult[] = [];

    // 2. อัปโหลดไฟล์แนบโครงการที่มีอยู่ (TOR, ประกาศจัดจ้าง ฯลฯ)
    const projectAttachments = project.attachments || [];
    for (const att of projectAttachments) {
      if (att.dataUrl) {
        const subfolderId =
          att.category === 'announcement' || att.category === 'tor'
            ? folderStructure.subfolders.tor.id
            : folderStructure.subfolders.other.id;

        const uploaded = await uploadFileToDrive(
          drive,
          subfolderId,
          att.name,
          att.type || 'application/pdf',
          att.dataUrl,
          att.category
        );
        uploadedResults.push(uploaded);
      }
    }

    // 3. อัปโหลดสำเนาสัญญา / หนังสือรับรองผลงาน (Section 5 Past Projects)
    const pastProjects = project.proposalData?.section5?.pastProjects || [];
    for (const p of pastProjects) {
      if (p.certificateFileUrl) {
        const isPdf =
          p.certificateFileUrl.startsWith('data:application/pdf') ||
          (p.certificateFileName || '').toLowerCase().endsWith('.pdf');

        const ext = isPdf ? '.pdf' : '.png';
        const certName =
          p.certificateFileName ||
          `สัญญา_${(p.projectCode || p.projectName).replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30)}${ext}`;

        const uploadedCert = await uploadFileToDrive(
          drive,
          folderStructure.subfolders.contracts.id,
          certName,
          isPdf ? 'application/pdf' : 'image/png',
          p.certificateFileUrl,
          'contract_cert'
        );
        uploadedResults.push(uploadedCert);
      }
    }

    // 4. อัปโหลดไฟล์เพิ่มเติมที่ส่งมาเฉพาะกิจ (Custom files)
    if (Array.isArray(files)) {
      for (const f of files) {
        if (f.base64) {
          let targetFolder = folderStructure.subfolders.other.id;
          if (f.category === 'tor' || f.category === 'announcement') {
            targetFolder = folderStructure.subfolders.tor.id;
          } else if (f.category === 'contract_cert') {
            targetFolder = folderStructure.subfolders.contracts.id;
          }

          const uploadedCustom = await uploadFileToDrive(
            drive,
            targetFolder,
            f.name,
            f.type || 'application/octet-stream',
            f.base64,
            f.category
          );
          uploadedResults.push(uploadedCustom);
        }
      }
    }

    // 5. อัปโหลดไฟล์เล่มข้อเสนอโครงการ (.docx) ไปยังโฟลเดอร์ 03_เล่มข้อเสนอโครงการ
    if (docxBase64) {
      const fileName =
        docxFileName ||
        `ข้อเสนอโครงการ_${project.projectTitle.replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 40)}_${project.projectCode}.docx`;

      const uploadedDocx = await uploadFileToDrive(
        drive,
        folderStructure.subfolders.outputs.id,
        fileName,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        docxBase64,
        'docx_output'
      );
      uploadedResults.push(uploadedDocx);
    }

    // 6. ซิงค์ข้อมูลทั้งหมดลง Google Sheets พร้อมผูกลิงก์ไฟล์ที่อัปโหลด
    let sheetUrl = '';
    if (masterSheetId) {
      sheetUrl = await syncProjectToGoogleSheet(
        sheets,
        masterSheetId,
        project,
        folderStructure,
        uploadedResults
      );
    }

    return res.status(200).json({
      success: true,
      message: 'ซิงค์ข้อมูลข้อเสนอโครงการและอัปโหลดไฟล์ขึ้น Google Drive & Sheets สำเร็จเรียบร้อย',
      driveFolderUrl: folderStructure.projectFolderUrl,
      sheetUrl: sheetUrl || `https://docs.google.com/spreadsheets/d/${masterSheetId}`,
      folderStructure: {
        rootUrl: folderStructure.projectFolderUrl,
        torFolderUrl: folderStructure.subfolders.tor.url,
        contractsFolderUrl: folderStructure.subfolders.contracts.url,
        outputsFolderUrl: folderStructure.subfolders.outputs.url,
      },
      uploadedFilesCount: uploadedResults.length,
      uploadedFiles: uploadedResults,
    });
  } catch (error: any) {
    console.error('Error syncing proposal to Google:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google APIs',
      details: error.stack || null,
    });
  }
}
