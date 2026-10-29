import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGoogleClients, getGoogleCredentials } from './auth';
import { setupProjectFolderHierarchy, uploadFileToDrive, UploadedFileResult } from './driveService';
import { syncProjectToGoogleSheet, syncMasterLibraryToGoogleSheet, getMasterLibraryFromGoogleSheet } from './sheetsService';
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
    // กรณีขออ่านข้อมูลคลังกลางจาก Google Sheet (Pull / Read)
    if (req.body.action === 'get_master_library') {
      const { masterSheetId } = getGoogleCredentials();
      const { sheets } = await getGoogleClients();
      if (!sheets || !masterSheetId) {
        return res.status(400).json({
          success: false,
          error: 'Google Sheets API หรือ Master Sheet ID ยังไม่ได้ตั้งค่า',
        });
      }
      const readRes = await getMasterLibraryFromGoogleSheet(sheets, masterSheetId);
      return res.status(200).json({
        success: true,
        projects: readRes.projects,
        team: readRes.team,
        message: `ดึงข้อมูลจาก Google Sheet สำเร็จ: พบผลงาน ${readRes.projects.length} รายการ, บุคลากร ${readRes.team.length} ท่าน`,
      });
    }

    // กรณีซิงค์ข้อมูลกลาง (Master Library)
    if (req.body.action === 'sync_master_library' || req.body.masterProjects) {
      const { masterProjects = [], masterTeam = [], masterBom = [], masterCompany = {} } = req.body;
      const { parentFolderId, masterSheetId } = getGoogleCredentials();
      const { drive, sheets } = await getGoogleClients();

      const uploadedCerts: Record<string, string> = {};
      const uploadedProjectImages: Record<string, { mainUrl?: string; mainFileId?: string; blockUrls: string[]; count: number }> = {};
      const uploadedTeamPhotos: Record<string, { photoUrl: string; fileId: string }> = {};

      if (drive && parentFolderId) {
        try {
          const { getOrCreateFolder } = await import('./driveService');
          const masterFolder = await getOrCreateFolder(drive, parentFolderId, '00_คลังข้อมูลกลาง_Master_Library');
          const certsFolder = await getOrCreateFolder(drive, masterFolder.id, '01_สำเนาสัญญาและใบรับรองผลงานกลาง');
          const projImagesFolder = await getOrCreateFolder(drive, masterFolder.id, '02_ภาพผลงานโครงการกลาง');
          const teamPhotosFolder = await getOrCreateFolder(drive, masterFolder.id, '03_รูปถ่ายบุคลากรกลาง');

          // อัปโหลดสัญญาและภาพผลงานโครงการ
          for (let i = 0; i < masterProjects.length; i++) {
            const p = masterProjects[i];
            if (!p) continue;
            const pRef = p.id || p.projectCode || ('prj_' + i);
            const pCode = (p.projectCode || p.projectName || ('PRJ-' + (i + 1))).replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30);

            if (p.certificateFileUrl && p.certificateFileUrl.startsWith('data:')) {
              const isPdf = p.certificateFileUrl.startsWith('data:application/pdf') || (p.certificateFileName || '').toLowerCase().endsWith('.pdf');
              const ext = isPdf ? '.pdf' : '.png';
              const certName = p.certificateFileName || `สัญญา_${pCode}${ext}`;
              const upCert = await uploadFileToDrive(drive, certsFolder.id, certName, isPdf ? 'application/pdf' : 'image/png', p.certificateFileUrl, 'master_cert', pRef);
              uploadedCerts[pRef] = upCert.webViewLink;
            }

            let mainUrl: string | undefined;
            let mainFileId: string | undefined;
            const blockUrls: string[] = [];

            if (p.projectImageUrl && p.projectImageUrl.startsWith('data:')) {
              const imgName = `ภาพผลงาน_${pCode}_หลัก.png`;
              const upImg = await uploadFileToDrive(drive, projImagesFolder.id, imgName, 'image/png', p.projectImageUrl, 'master_project_image', pRef);
              mainUrl = upImg.webViewLink;
              mainFileId = upImg.fileId;
            }

            if (p.imageBlocks && Array.isArray(p.imageBlocks)) {
              for (let b = 0; b < p.imageBlocks.length; b++) {
                const block = p.imageBlocks[b];
                if (!block) continue;
                if (block.type === 'single' && block.url && block.url.startsWith('data:')) {
                  const bName = `ภาพผลงาน_${pCode}_ภาพที่${b + 1}.png`;
                  const upB = await uploadFileToDrive(drive, projImagesFolder.id, bName, 'image/png', block.url, 'master_project_image_block', pRef);
                  if (!mainUrl) {
                    mainUrl = upB.webViewLink;
                    mainFileId = upB.fileId;
                  }
                  blockUrls.push(upB.webViewLink);
                } else if (block.type === 'double') {
                  if (block.urlLeft && block.urlLeft.startsWith('data:')) {
                    const bNameL = `ภาพผลงาน_${pCode}_ภาพที่${b + 1}a.png`;
                    const upBL = await uploadFileToDrive(drive, projImagesFolder.id, bNameL, 'image/png', block.urlLeft, 'master_project_image_block', pRef);
                    if (!mainUrl) {
                      mainUrl = upBL.webViewLink;
                      mainFileId = upBL.fileId;
                    }
                    blockUrls.push(upBL.webViewLink);
                  }
                  if (block.urlRight && block.urlRight.startsWith('data:')) {
                    const bNameR = `ภาพผลงาน_${pCode}_ภาพที่${b + 1}b.png`;
                    const upBR = await uploadFileToDrive(drive, projImagesFolder.id, bNameR, 'image/png', block.urlRight, 'master_project_image_block', pRef);
                    blockUrls.push(upBR.webViewLink);
                  }
                }
              }
            }

            if (mainUrl || blockUrls.length > 0) {
              uploadedProjectImages[pRef] = {
                mainUrl,
                mainFileId,
                blockUrls,
                count: (mainUrl ? 1 : 0) + blockUrls.length,
              };
            }
          }

          // อัปโหลดรูปถ่ายบุคลากร
          for (let k = 0; k < masterTeam.length; k++) {
            const tm = masterTeam[k];
            if (tm && tm.photoUrl && tm.photoUrl.startsWith('data:')) {
              const tRef = tm.id || tm.memberCode || tm.name;
              const phName = `รูปถ่าย_${(tm.name || ('บุคลากร_' + (k + 1))).replace(/[\/\\?%*:|"<>]/g, '_')}.png`;
              const upPhoto = await uploadFileToDrive(drive, teamPhotosFolder.id, phName, 'image/png', tm.photoUrl, 'master_team_photo', undefined, tRef);
              uploadedTeamPhotos[tRef] = {
                photoUrl: upPhoto.webViewLink,
                fileId: upPhoto.fileId,
              };
            }
          }
        } catch (driveErr) {
          console.warn('Could not upload master library images to Drive:', driveErr);
        }
      }

      const sheetUrl = await syncMasterLibraryToGoogleSheet(sheets, masterSheetId, {
        masterProjects,
        masterTeam,
        masterBom,
        masterCompany,
        uploadedCerts,
        uploadedProjectImages,
        uploadedTeamPhotos,
      });

      return res.status(200).json({
        success: true,
        message: `ซิงค์คลังข้อมูลกลางพร้อมภาพผลงานและรูปถ่ายบุคลากร (${masterProjects.length} ผลงาน, ${masterTeam.length} บุคลากร, ${masterBom.length} BOM) เข้าสู่ Google Sheet สำเร็จเรียบร้อย!`,
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

    // 3. อัปโหลดสำเนาสัญญา / ภาพผลงาน / ภาพประกอบ (Section 5 Past Projects)
    const { getOrCreateFolder } = await import('./driveService');
    const projImagesSubfolder = await getOrCreateFolder(drive, folderStructure.projectFolderId, '05_ภาพผลงานและกิจกรรมโครงการ');
    const teamPhotosSubfolder = await getOrCreateFolder(drive, folderStructure.projectFolderId, '06_รูปถ่ายบุคลากร');

    const pastProjects = project.proposalData?.section5?.pastProjects || [];
    for (const p of pastProjects) {
      const pRef = p.id || p.projectCode || p.projectName;
      const pCodeClean = (p.projectCode || p.projectName || 'project').replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30);

      // 3.1 สำเนาสัญญา
      if (p.certificateFileUrl && p.certificateFileUrl.startsWith('data:')) {
        const isPdf =
          p.certificateFileUrl.startsWith('data:application/pdf') ||
          (p.certificateFileName || '').toLowerCase().endsWith('.pdf');

        const ext = isPdf ? '.pdf' : '.png';
        const certName =
          p.certificateFileName ||
          `สัญญา_${pCodeClean}${ext}`;

        const uploadedCert = await uploadFileToDrive(
          drive,
          folderStructure.subfolders.contracts.id,
          certName,
          isPdf ? 'application/pdf' : 'image/png',
          p.certificateFileUrl,
          'contract_cert',
          pRef
        );
        uploadedResults.push(uploadedCert);
      }

      // 3.2 ภาพหลักของผลงานโครงการ
      if (p.projectImageUrl && p.projectImageUrl.startsWith('data:')) {
        const imgName = `ภาพผลงาน_${pCodeClean}_หลัก.png`;
        const uploadedImg = await uploadFileToDrive(
          drive,
          projImagesSubfolder.id,
          imgName,
          'image/png',
          p.projectImageUrl,
          'project_image',
          pRef
        );
        uploadedResults.push(uploadedImg);
      }

      // 3.3 ภาพประกอบใน imageBlocks
      if (p.imageBlocks && Array.isArray(p.imageBlocks)) {
        for (let b = 0; b < p.imageBlocks.length; b++) {
          const block = p.imageBlocks[b];
          if (!block) continue;
          if (block.type === 'single' && block.url && block.url.startsWith('data:')) {
            const bName = `ภาพผลงาน_${pCodeClean}_ภาพที่${b + 1}.png`;
            const upB = await uploadFileToDrive(
              drive,
              projImagesSubfolder.id,
              bName,
              'image/png',
              block.url,
              'project_image_block',
              pRef
            );
            uploadedResults.push(upB);
          } else if (block.type === 'double') {
            if (block.urlLeft && block.urlLeft.startsWith('data:')) {
              const bNameL = `ภาพผลงาน_${pCodeClean}_ภาพที่${b + 1}a.png`;
              const upBL = await uploadFileToDrive(
                drive,
                projImagesSubfolder.id,
                bNameL,
                'image/png',
                block.urlLeft,
                'project_image_block',
                pRef
              );
              uploadedResults.push(upBL);
            }
            if (block.urlRight && block.urlRight.startsWith('data:')) {
              const bNameR = `ภาพผลงาน_${pCodeClean}_ภาพที่${b + 1}b.png`;
              const upBR = await uploadFileToDrive(
                drive,
                projImagesSubfolder.id,
                bNameR,
                'image/png',
                block.urlRight,
                'project_image_block',
                pRef
              );
              uploadedResults.push(upBR);
            }
          }
        }
      }
    }

    // 3.4 อัปโหลดรูปถ่ายบุคลากร (Section 4 Team)
    const teamMembers = project.proposalData?.section4?.teamMembers || [];
    for (let tmIdx = 0; tmIdx < teamMembers.length; tmIdx++) {
      const tm = teamMembers[tmIdx];
      if (tm && tm.photoUrl && tm.photoUrl.startsWith('data:')) {
        const mRef = tm.id || tm.memberCode || tm.name;
        const phName = `รูปถ่าย_${(tm.name || ('บุคลากร_' + (tmIdx + 1))).replace(/[\/\\?%*:|"<>]/g, '_')}.png`;
        const upPhoto = await uploadFileToDrive(
          drive,
          teamPhotosSubfolder.id,
          phName,
          'image/png',
          tm.photoUrl,
          'team_photo',
          undefined,
          mRef
        );
        uploadedResults.push(upPhoto);
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
