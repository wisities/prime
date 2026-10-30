import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGoogleClients, getGoogleCredentials } from './auth';
import { setupProjectFolderHierarchy, uploadFileToDrive, getOrCreateFolder, downloadJsonFileFromDrive, findProjectFolderId } from './driveService';
import type { UploadedFileResult } from './driveService';
import { syncProjectToGoogleSheet, syncMasterLibraryToGoogleSheet, getMasterLibraryFromGoogleSheet, getProposalFromGoogleSheet, SHEET_TABS } from './sheetsService';
import type { BiddingProject } from '../../src/types/proposal';

export const maxDuration = 60;

export const config = {
  maxDuration: 60,
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
      const { sheets, drive } = await getGoogleClients();
      if (!sheets || !masterSheetId) {
        return res.status(400).json({
          success: false,
          error: 'Google Sheets API หรือ Master Sheet ID ยังไม่ได้ตั้งค่า',
        });
      }
      const readRes = await getMasterLibraryFromGoogleSheet(sheets, masterSheetId, drive);
      return res.status(200).json({
        success: true,
        projects: readRes.projects,
        team: readRes.team,
        message: `ดึงข้อมูลจาก Google Sheet สำเร็จ: พบผลงาน ${readRes.projects.length} รายการ, บุคลากร ${readRes.team.length} ท่าน`,
      });
    }

    // กรณีขออ่านข้อมูลล่าสุดของโครงการที่เสนอจาก Google Sheet (Pull Proposal + Master Library)
    if (req.body.action === 'get_proposal_from_sheet') {
      const { masterSheetId } = getGoogleCredentials();
      const { sheets, drive } = await getGoogleClients();
      if (!sheets || !masterSheetId) {
        return res.status(400).json({
          success: false,
          error: 'Google Sheets API หรือ Master Sheet ID ยังไม่ได้ตั้งค่า',
        });
      }
      const { projectCode = '', projectTitle = '' } = req.body;
      const pullRes = await getProposalFromGoogleSheet(sheets, masterSheetId, projectCode, projectTitle, drive);
      return res.status(200).json({
        success: true,
        ...pullRes,
        message: `ดึงข้อมูลล่าสุดของโครงการ ${projectCode || projectTitle} จาก Google Sheet สำเร็จ (${pullRes.pastProjects.length} ผลงานอ้างอิง)`,
      });
    }

    // กรณีขอรายชื่อข้อเสนอโครงการทั้งหมดบน Google Cloud (เพื่อแสดงให้ผู้ใช้เลือกหยิบเป็นเรื่องๆ)
    if (req.body.action === 'list_cloud_proposals') {
      const { masterSheetId } = getGoogleCredentials();
      const { sheets } = await getGoogleClients();
      if (!sheets || !masterSheetId) {
        return res.status(400).json({
          success: false,
          error: 'Google Sheets API หรือ Master Sheet ID ยังไม่ได้ตั้งค่า',
        });
      }

      try {
        const ovRes = await sheets.spreadsheets.values.get({
          spreadsheetId: masterSheetId,
          range: `'${SHEET_TABS.OVERVIEW}'!A2:M`,
          valueRenderOption: 'FORMULA',
        });
        const ovDispRes = await sheets.spreadsheets.values.get({
          spreadsheetId: masterSheetId,
          range: `'${SHEET_TABS.OVERVIEW}'!A2:M`,
        });

        const formRows = ovRes.data.values || [];
        const dispRows = ovDispRes.data.values || [];
        const cloudProposals: any[] = [];

        function extractUrl(val: any): string {
          if (!val) return '';
          const s = String(val).trim();
          const m = s.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
          if (m && m[1]) return m[1];
          if (s.startsWith('http')) return s;
          return '';
        }

        for (let i = 0; i < dispRows.length; i++) {
          const dRow = dispRows[i] || [];
          const fRow = formRows[i] || [];
          const pCode = String(dRow[0] || fRow[0] || '').trim();
          const pTitle = String(dRow[1] || fRow[1] || '').trim();
          if (!pCode && !pTitle) continue;

          cloudProposals.push({
            projectCode: pCode,
            projectTitle: pTitle,
            clientAgency: String(dRow[2] || '').trim(),
            budgetAmount: Number(String(dRow[3] || '0').replace(/,/g, '')) || 0,
            announcementDate: String(dRow[4] || '').trim(),
            submissionDeadline: String(dRow[5] || '').trim(),
            status: String(dRow[6] || 'draft').trim(),
            assignedTo: String(dRow[7] || '').trim(),
            progressPercent: Number(dRow[8]) || 0,
            driveFolderUrl: extractUrl(fRow[9]) || extractUrl(dRow[9]),
            docxUrl: extractUrl(fRow[10]) || extractUrl(dRow[10]),
            torUrl: extractUrl(fRow[11]) || extractUrl(dRow[11]),
            lastSyncedAt: String(dRow[12] || '').trim(),
          });
        }

        return res.status(200).json({
          success: true,
          proposals: cloudProposals,
          count: cloudProposals.length,
          message: `พบข้อเสนอโครงการบน Google Cloud ทั้งหมด ${cloudProposals.length} เรื่อง`,
        });
      } catch (listErr: any) {
        return res.status(500).json({
          success: false,
          error: `ไม่สามารถดึงรายชื่อโครงการจาก Google Sheet ได้: ${listErr?.message || listErr}`,
        });
      }
    }

    // กรณีขออ่านร่างข้อเสนอโครงการฉบับเต็ม (proposal_data.json จาก Drive หรือ fallback Sheet)
    if (req.body.action === 'get_cloud_proposal_full') {
      const { parentFolderId, masterSheetId } = getGoogleCredentials();
      const { drive, sheets } = await getGoogleClients();
      const { projectCode = '', projectTitle = '', driveFolderUrl = '' } = req.body;

      let fullProjectData: any = null;

      // 1. ลองค้นหาและดาวน์โหลด proposal_data.json จาก Google Drive โดยตรง
      if (drive) {
        try {
          const folderId = await findProjectFolderId(drive, parentFolderId, projectCode, driveFolderUrl);
          if (folderId) {
            fullProjectData = await downloadJsonFileFromDrive(drive, folderId, 'proposal_data.json');
          }
        } catch (driveReadErr) {
          console.warn('Could not read proposal_data.json directly from Drive:', driveReadErr);
        }
      }

      // 2. หากพบ proposal_data.json ใน Drive ให้ส่งกลับทันที (ข้อมูลครบถ้วน 100% ทุก Section)
      if (fullProjectData && typeof fullProjectData === 'object') {
        return res.status(200).json({
          success: true,
          source: 'drive_json',
          project: fullProjectData,
          message: `กู้คืนเล่มข้อเสนอ "${projectCode || projectTitle}" จาก Google Drive สมบูรณ์แบบ 100%`,
        });
      }

      // 3. Fallback: หากยังไม่มี proposal_data.json (เช่น ซิงค์รุ่นก่อน) ให้อ่านโครงสร้างจาก Google Sheet
      if (sheets && masterSheetId) {
        const pullRes = await getProposalFromGoogleSheet(sheets, masterSheetId, projectCode, projectTitle, drive);
        return res.status(200).json({
          success: true,
          source: 'sheet_overview',
          overview: pullRes.overview,
          pastProjects: pullRes.pastProjects,
          masterProjects: pullRes.masterProjects,
          message: `ดึงข้อมูลโครงการ "${projectCode || projectTitle}" จาก Google Sheet สำเร็จ`,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'ไม่พบข้อมูลโครงการใน Google Drive หรือ Sheet',
      });
    }

    // กรณีซิงค์ข้อมูลกลาง (Master Library) รองรับทั้ง Incremental (เฉพาะโครงการที่แก้ไข) และ Full Sync
    if (req.body.action === 'sync_master_library' || req.body.masterProjects) {
      const { masterProjects = [], masterTeam = [], masterBom = [], masterCompany = {}, sheetOnly = false, incremental = false } = req.body;
      const { parentFolderId, masterSheetId } = getGoogleCredentials();
      const { drive, sheets } = await getGoogleClients();

      const uploadedCerts: Record<string, string> = {};
      const uploadedProjectImages: Record<string, { mainUrl?: string; mainFileId?: string; blockUrls: string[]; count: number }> = {};
      const uploadedTeamPhotos: Record<string, { photoUrl: string; fileId: string }> = {};
      const uploadedTeamBioImages: Record<string, { mainUrl?: string; mainFileId?: string; count: number }> = {};

      if (!sheetOnly && drive) {
        let certsFolderId = '';
        let projImagesFolderId = '';
        let teamPhotosFolderId = '';
        let uploadedAnyViaDrive = false;

        if (parentFolderId) {
          try {
            const masterFolder = await getOrCreateFolder(drive, parentFolderId, '00_คลังข้อมูลกลาง_Master_Library');
            const certsFolder = await getOrCreateFolder(drive, masterFolder.id, '01_สำเนาสัญญาและใบรับรองผลงานกลาง');
            const projImagesFolder = await getOrCreateFolder(drive, masterFolder.id, '02_ภาพผลงานโครงการกลาง');
            const teamPhotosFolder = await getOrCreateFolder(drive, masterFolder.id, '03_รูปถ่ายและภาพประกอบบุคลากรกลาง');
            certsFolderId = certsFolder.id;
            projImagesFolderId = projImagesFolder.id;
            teamPhotosFolderId = teamPhotosFolder.id;
          } catch (folderErr) {
            console.warn('Master folder lookup fallback to bridge:', folderErr);
          }
        }

        // อัปโหลดสัญญา โลโก้หน่วยงาน และภาพผลงานโครงการ
        for (let i = 0; i < masterProjects.length; i++) {
          const p = masterProjects[i];
          if (!p) continue;
          const pRef = p.id || p.projectCode || ('prj_' + i);
          const pCode = (p.projectCode || p.projectName || ('PRJ-' + (i + 1))).replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30);

          try {
            if (p.certificateFileUrl && p.certificateFileUrl.startsWith('data:')) {
              const isPdf = p.certificateFileUrl.startsWith('data:application/pdf') || (p.certificateFileName || '').toLowerCase().endsWith('.pdf');
              const ext = isPdf ? '.pdf' : '.png';
              const certName = p.certificateFileName || `สัญญา_${pCode}${ext}`;
              const upCert = await uploadFileToDrive(drive, certsFolderId, certName, isPdf ? 'application/pdf' : 'image/png', p.certificateFileUrl, 'master_cert', pRef);
              uploadedCerts[pRef] = upCert.webViewLink;
              p.certificateFileUrl = upCert.webViewLink;
              uploadedAnyViaDrive = true;
            }

            if (p.clientLogoUrl && p.clientLogoUrl.startsWith('data:')) {
              const cleanClient = (p.clientName || pCode).replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30);
              const logoName = `โลโก้หน่วยงาน_${cleanClient}.png`;
              const upLogo = await uploadFileToDrive(drive, projImagesFolderId, logoName, 'image/png', p.clientLogoUrl, 'master_project_image', pRef);
              p.clientLogoUrl = `https://drive.google.com/thumbnail?id=${upLogo.fileId}&sz=w1000`;
              uploadedAnyViaDrive = true;
            }

            let mainUrl: string | undefined;
            let mainFileId: string | undefined;
            const blockUrls: string[] = [];

            if (p.projectImageUrl && p.projectImageUrl.startsWith('data:')) {
              const imgName = `ภาพผลงาน_${pCode}_หลัก.png`;
              const upImg = await uploadFileToDrive(drive, projImagesFolderId, imgName, 'image/png', p.projectImageUrl, 'master_project_image', pRef);
              mainUrl = upImg.webViewLink;
              mainFileId = upImg.fileId;
              p.projectImageUrl = `https://drive.google.com/thumbnail?id=${upImg.fileId}&sz=w1000`;
              uploadedAnyViaDrive = true;
            }

            if (p.imageBlocks && Array.isArray(p.imageBlocks)) {
              for (let b = 0; b < p.imageBlocks.length; b++) {
                const block = p.imageBlocks[b];
                if (!block) continue;
                if (block.type === 'single' && block.url && block.url.startsWith('data:')) {
                  const bName = `ภาพผลงาน_${pCode}_ภาพที่${b + 1}.png`;
                  const upB = await uploadFileToDrive(drive, projImagesFolderId, bName, 'image/png', block.url, 'master_project_image_block', pRef);
                  const thumbUrl = `https://drive.google.com/thumbnail?id=${upB.fileId}&sz=w1000`;
                  block.url = thumbUrl;
                  if (!mainUrl) {
                    mainUrl = upB.webViewLink;
                    mainFileId = upB.fileId;
                  }
                  blockUrls.push(upB.webViewLink);
                  uploadedAnyViaDrive = true;
                } else if (block.type === 'double' || block.type === 'pair') {
                  const left = block.urlLeft || block.leftUrl;
                  if (left && left.startsWith('data:')) {
                    const bNameL = `ภาพผลงาน_${pCode}_ภาพที่${b + 1}a.png`;
                    const upBL = await uploadFileToDrive(drive, projImagesFolderId, bNameL, 'image/png', left, 'master_project_image_block', pRef);
                    const thumbUrlL = `https://drive.google.com/thumbnail?id=${upBL.fileId}&sz=w1000`;
                    block.leftUrl = thumbUrlL;
                    if ('urlLeft' in block) block.urlLeft = thumbUrlL;
                    if (!mainUrl) {
                      mainUrl = upBL.webViewLink;
                      mainFileId = upBL.fileId;
                    }
                    blockUrls.push(upBL.webViewLink);
                    uploadedAnyViaDrive = true;
                  }
                  const right = block.urlRight || block.rightUrl;
                  if (right && right.startsWith('data:')) {
                    const bNameR = `ภาพผลงาน_${pCode}_ภาพที่${b + 1}b.png`;
                    const upBR = await uploadFileToDrive(drive, projImagesFolderId, bNameR, 'image/png', right, 'master_project_image_block', pRef);
                    const thumbUrlR = `https://drive.google.com/thumbnail?id=${upBR.fileId}&sz=w1000`;
                    block.rightUrl = thumbUrlR;
                    if ('urlRight' in block) block.urlRight = thumbUrlR;
                    if (!mainUrl) {
                      mainUrl = upBR.webViewLink;
                      mainFileId = upBR.fileId;
                    }
                    blockUrls.push(upBR.webViewLink);
                    uploadedAnyViaDrive = true;
                  }
                }
              }
            }

            if (mainUrl || blockUrls.length > 0) {
              uploadedProjectImages[pRef] = {
                mainUrl,
                mainFileId,
                blockUrls,
                count: blockUrls.length > 0 ? blockUrls.length : (mainUrl ? 1 : 0),
              };
            }
          } catch (projDriveErr) {
            console.warn(`Could not upload files for project ${pCode}:`, projDriveErr);
          }
        }

        // อัปโหลดรูปถ่ายและภาพประกอบประวัติย่อบุคลากร
        for (let k = 0; k < masterTeam.length; k++) {
          const tm = masterTeam[k];
          if (!tm) continue;
          const tRef = tm.id || tm.memberCode || tm.name;
          const cleanTName = (tm.name || (`บุคลากร_${k + 1}`)).replace(/[\/\\?%*:|"<>]/g, '_');

          try {
            if (tm.photoUrl && tm.photoUrl.startsWith('data:')) {
              const phName = `รูปถ่าย_${cleanTName}.png`;
              const upPhoto = await uploadFileToDrive(drive, teamPhotosFolderId, phName, 'image/png', tm.photoUrl, 'master_team_photo', undefined, tRef);
              tm.photoUrl = `https://drive.google.com/thumbnail?id=${upPhoto.fileId}&sz=w1000`;
              uploadedTeamPhotos[tRef] = {
                photoUrl: upPhoto.webViewLink,
                fileId: upPhoto.fileId,
              };
              uploadedAnyViaDrive = true;
            }

            const bioBlocks = tm.bioImageBlocks || tm.imageBlocks || [];
            let bioMainUrl: string | undefined;
            let bioMainFileId: string | undefined;
            let bioCount = 0;

            if (Array.isArray(bioBlocks)) {
              for (let b = 0; b < bioBlocks.length; b++) {
                const block = bioBlocks[b];
                if (!block) continue;
                if (block.type === 'single' && block.url && block.url.startsWith('data:')) {
                  const bName = `ภาพประวัติย่อ_${cleanTName}_ภาพที่${b + 1}.png`;
                  const upBio = await uploadFileToDrive(drive, teamPhotosFolderId, bName, 'image/png', block.url, 'master_team_bio_image', undefined, tRef);
                  block.url = `https://drive.google.com/thumbnail?id=${upBio.fileId}&sz=w1000`;
                  if (!bioMainUrl) {
                    bioMainUrl = upBio.webViewLink;
                    bioMainFileId = upBio.fileId;
                  }
                  bioCount++;
                  uploadedAnyViaDrive = true;
                } else if (block.type === 'double' || block.type === 'pair') {
                  const left = block.urlLeft || block.leftUrl;
                  if (left && left.startsWith('data:')) {
                    const bNameL = `ภาพประวัติย่อ_${cleanTName}_ภาพที่${b + 1}a.png`;
                    const upBioL = await uploadFileToDrive(drive, teamPhotosFolderId, bNameL, 'image/png', left, 'master_team_bio_image', undefined, tRef);
                    const thumbBioL = `https://drive.google.com/thumbnail?id=${upBioL.fileId}&sz=w1000`;
                    block.leftUrl = thumbBioL;
                    if ('urlLeft' in block) block.urlLeft = thumbBioL;
                    if (!bioMainUrl) {
                      bioMainUrl = upBioL.webViewLink;
                      bioMainFileId = upBioL.fileId;
                    }
                    bioCount++;
                    uploadedAnyViaDrive = true;
                  }
                  const right = block.urlRight || block.rightUrl;
                  if (right && right.startsWith('data:')) {
                    const bNameR = `ภาพประวัติย่อ_${cleanTName}_ภาพที่${b + 1}b.png`;
                    const upBioR = await uploadFileToDrive(drive, teamPhotosFolderId, bNameR, 'image/png', right, 'master_team_bio_image', undefined, tRef);
                    const thumbBioR = `https://drive.google.com/thumbnail?id=${upBioR.fileId}&sz=w1000`;
                    block.rightUrl = thumbBioR;
                    if ('urlRight' in block) block.urlRight = thumbBioR;
                    bioCount++;
                    uploadedAnyViaDrive = true;
                  }
                }
              }
            }

            if (bioMainUrl || bioCount > 0) {
              uploadedTeamBioImages[tRef] = {
                mainUrl: bioMainUrl,
                mainFileId: bioMainFileId,
                count: bioCount,
              };
            }
          } catch (teamDriveErr) {
            console.warn(`Could not upload files for team member ${cleanTName}:`, teamDriveErr);
          }
        }

        // ล้างแถวชั่วคราว __DRIVE_UPLOAD_BRIDGE__ ในแท็บ Overview หากมีการอัปโหลดผ่าน Bridge
        if (uploadedAnyViaDrive && sheets && masterSheetId) {
          try {
            const ovRes = await sheets.spreadsheets.values.get({
              spreadsheetId: masterSheetId,
              range: `'ภาพรวมโครงการ (Overview)'!A1:M`,
              valueRenderOption: 'FORMULA',
            });
            const ovRows = ovRes.data.values || [];
            const filteredOv = ovRows.filter((r, idx) => idx === 0 || String(r?.[0] || '').trim() !== '__DRIVE_UPLOAD_BRIDGE__');
            if (filteredOv.length !== ovRows.length) {
              await sheets.spreadsheets.values.clear({
                spreadsheetId: masterSheetId,
                range: `'ภาพรวมโครงการ (Overview)'!A1:M`,
              });
              await sheets.spreadsheets.values.update({
                spreadsheetId: masterSheetId,
                range: `'ภาพรวมโครงการ (Overview)'!A1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: filteredOv },
              });
            }
          } catch {}
        }
      }

      const sheetUrl = await syncMasterLibraryToGoogleSheet(sheets, masterSheetId, {
        masterProjects,
        masterTeam,
        masterBom,
        masterCompany,
        incremental: Boolean(incremental),
        uploadedCerts,
        uploadedProjectImages,
        uploadedTeamPhotos,
        uploadedTeamBioImages,
      });

      let syncModeText = `ซิงค์คลังข้อมูลกลางทั้งหมด (${masterProjects.length} ผลงาน, ${masterTeam.length} บุคลากร, ${masterBom.length} BOM)`;
      if (incremental) {
        if (masterProjects.length > 0 && masterTeam.length === 0) {
          syncModeText = masterProjects.length === 1
            ? `ซิงค์โครงการ "${masterProjects[0]?.projectCode || ''} ${masterProjects[0]?.projectName || ''}"`
            : `ซิงค์เฉพาะโครงการที่เลือก (${masterProjects.length} โครงการ)`;
        } else if (masterProjects.length === 0 && masterTeam.length > 0) {
          syncModeText = masterTeam.length === 1
            ? `ซิงค์ข้อมูลบุคลากร "${masterTeam[0]?.name || ''}"`
            : `ซิงค์เฉพาะบุคลากรที่เลือก (${masterTeam.length} ท่าน)`;
        } else {
          syncModeText = `ซิงค์เฉพาะรายการที่แก้ไข (${masterProjects.length} โครงการ, ${masterTeam.length} บุคลากร)`;
        }
      }

      return res.status(200).json({
        success: true,
        message: `${syncModeText} เข้าสู่ Google Sheet & Drive สำเร็จเรียบร้อย!`,
        sheetUrl,
        updatedProjects: masterProjects,
        updatedTeam: masterTeam,
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

    if (req.body.sheetOnly === true && masterSheetId) {
      const fallbackFolderStructure: any = {
        yearFolderId: '',
        yearFolderUrl: req.body.driveFolderUrl || '',
        projectFolderId: '',
        projectFolderUrl: req.body.driveFolderUrl || 'https://drive.google.com/drive/folders/1Frre37vc1NZ1rnSa2Dbece1_j2W5KucX',
        subfolders: {
          tor: { id: '', url: req.body.folderStructure?.torFolderUrl || '-' },
          contracts: { id: '', url: req.body.folderStructure?.contractsFolderUrl || '-' },
          outputs: { id: '', url: req.body.folderStructure?.outputsFolderUrl || '-' },
          other: { id: '', url: '-' },
        },
      };
      const sheetUrl = await syncProjectToGoogleSheet(
        sheets,
        masterSheetId,
        project,
        fallbackFolderStructure,
        req.body.uploadedFiles || []
      );
      return res.status(200).json({
        success: true,
        message: 'อัปเดตตาราง Google Sheets พร้อมลิงก์และรูปภาพผลงานครบถ้วนสำเร็จ',
        sheetUrl,
      });
    }

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
          } else if ((block.type as string) === 'double' || block.type === 'pair') {
            const left = (block as any).urlLeft || block.leftUrl;
            if (left && left.startsWith('data:')) {
              const bNameL = `ภาพผลงาน_${pCodeClean}_ภาพที่${b + 1}a.png`;
              const upBL = await uploadFileToDrive(
                drive,
                projImagesSubfolder.id,
                bNameL,
                'image/png',
                left,
                'project_image_block',
                pRef
              );
              uploadedResults.push(upBL);
            }
            const right = (block as any).urlRight || block.rightUrl;
            if (right && right.startsWith('data:')) {
              const bNameR = `ภาพผลงาน_${pCodeClean}_ภาพที่${b + 1}b.png`;
              const upBR = await uploadFileToDrive(
                drive,
                projImagesSubfolder.id,
                bNameR,
                'image/png',
                right,
                'project_image_block',
                pRef
              );
              uploadedResults.push(upBR);
            }
          }
        }
      }
    }

    // 3.4 อัปโหลดรูปถ่ายบุคลากร และภาพประกอบประวัติย่อ (Section 4 Team)
    const teamMembers = project.proposalData?.section4?.teamMembers || [];
    for (let tmIdx = 0; tmIdx < teamMembers.length; tmIdx++) {
      const tm = teamMembers[tmIdx];
      if (!tm) continue;
      const mRef = tm.id || tm.memberCode || tm.name;
      const cleanMemberName = (tm.name || (`บุคลากร_${tmIdx + 1}`)).replace(/[\/\\?%*:|"<>]/g, '_');

      // 3.4.1 รูปถ่ายทางการ 1.5 นิ้ว
      if (tm.photoUrl && tm.photoUrl.startsWith('data:')) {
        const phName = `รูปถ่าย_${cleanMemberName}.png`;
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

      // 3.4.2 ภาพประกอบประวัติย่อ / ความเชี่ยวชาญ (bioImageBlocks)
      const bioBlocks = tm.bioImageBlocks || tm.imageBlocks || [];
      if (Array.isArray(bioBlocks)) {
        for (let b = 0; b < bioBlocks.length; b++) {
          const block = bioBlocks[b];
          if (!block) continue;
          if (block.type === 'single' && block.url && block.url.startsWith('data:')) {
            const bName = `ภาพประวัติย่อ_${cleanMemberName}_ภาพที่${b + 1}.png`;
            const upB = await uploadFileToDrive(
              drive,
              teamPhotosSubfolder.id,
              bName,
              'image/png',
              block.url,
              'team_bio_image_block',
              undefined,
              mRef
            );
            uploadedResults.push(upB);
          } else if ((block.type as string) === 'double' || block.type === 'pair') {
            const left = (block as any).urlLeft || block.leftUrl;
            if (left && left.startsWith('data:')) {
              const bNameL = `ภาพประวัติย่อ_${cleanMemberName}_ภาพที่${b + 1}a.png`;
              const upBL = await uploadFileToDrive(
                drive,
                teamPhotosSubfolder.id,
                bNameL,
                'image/png',
                left,
                'team_bio_image_block',
                undefined,
                mRef
              );
              uploadedResults.push(upBL);
            }
            const right = (block as any).urlRight || block.rightUrl;
            if (right && right.startsWith('data:')) {
              const bNameR = `ภาพประวัติย่อ_${cleanMemberName}_ภาพที่${b + 1}b.png`;
              const upBR = await uploadFileToDrive(
                drive,
                teamPhotosSubfolder.id,
                bNameR,
                'image/png',
                right,
                'team_bio_image_block',
                undefined,
                mRef
              );
              uploadedResults.push(upBR);
            }
          }
        }
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

    // 5.5 อัปโหลดไฟล์ก้อนข้อมูลโครงการฉบับเต็ม (proposal_data.json) ลงในโฟลเดอร์โครงการ เพื่อให้สลับไปเปิดเครื่องอื่นได้ครบ 100%
    try {
      const cleanProjectPayload = {
        ...project,
        driveFolderUrl: folderStructure.projectFolderUrl,
        lastSyncedAt: new Date().toISOString(),
      };
      const jsonContent = Buffer.from(JSON.stringify(cleanProjectPayload, null, 2), 'utf-8');
      const uploadedJson = await uploadFileToDrive(
        drive,
        folderStructure.projectFolderId,
        'proposal_data.json',
        'application/json',
        jsonContent,
        'proposal_json_snapshot'
      );
      uploadedResults.push(uploadedJson);
    } catch (jsonErr) {
      console.warn('Could not upload proposal_data.json:', jsonErr);
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
