import { google } from 'googleapis';
import { BiddingProject, ProposalData } from '../../src/types/proposal';
import { UploadedFileResult, ProjectFolderStructure } from './driveService';

type SheetsClient = ReturnType<typeof google.sheets>;

export const SHEET_TABS = {
  OVERVIEW: 'ภาพรวมโครงการ (Overview)',
  MILESTONES: 'งวดงานและการส่งมอบ (Milestones)',
  BOM: 'ถอดแบบงบประมาณ (BOM)',
  CONTRACTS: 'ผลงานอ้างอิงและสัญญา (Contracts)',
  TEAM: 'บุคลากรหลัก (Team)',
};

export const MASTER_SHEET_TABS = {
  PROJECTS: '[คลังกลาง] ผลงานและสัญญา',
  TEAM: '[คลังกลาง] บุคลากร',
  BOM: '[คลังกลาง] แคตตาล็อก BOM',
  COMPANY: '[คลังกลาง] ข้อมูลบริษัท',
};

/**
 * สร้าง Header และตรวจสอบแท็บที่จำเป็นใน Google Sheet
 */
export async function initializeSheetTabs(sheets: SheetsClient, spreadsheetId: string): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const existingTitles = existingSheets.map((s) => s.properties?.title || '');

  const neededTabs = [
    {
      title: SHEET_TABS.OVERVIEW,
      headers: [
        'รหัสโครงการ',
        'ชื่อโครงการข้อเสนอ',
        'หน่วยงานผู้ว่าจ้าง',
        'วงเงินงบประมาณ (บาท)',
        'วันที่ประกาศจัดจ้าง',
        'กำหนดยื่นข้อเสนอ',
        'สถานะโครงการ',
        'ผู้รับผิดชอบหลัก',
        'ความคืบหน้า (%)',
        'โฟลเดอร์ Google Drive',
        'เล่มข้อเสนอ Word (.docx)',
        'เอกสาร TOR ประกาศจัดจ้าง',
        'วันที่ซิงค์ล่าสุด',
      ],
    },
    {
      title: SHEET_TABS.MILESTONES,
      headers: [
        'รหัสโครงการ',
        'ชื่อโครงการ',
        'งวดที่',
        'รายละเอียดงวดงาน',
        'สัดส่วน (%)',
        'วงเงินงวดงาน (บาท)',
        'กำหนดเวลาส่งมอบ',
        'รายการเอกสารสิ่งส่งมอบ',
      ],
    },
    {
      title: SHEET_TABS.BOM,
      headers: [
        'รหัสโครงการ',
        'ชื่อโครงการ',
        'หมวดหมู่ค่าใช้จ่าย',
        'รายการงาน/อุปกรณ์',
        'ตำแหน่ง/ผู้รับผิดชอบ',
        'จำนวน',
        'หน่วยนับ',
        'ราคาต่อหน่วย (บาท)',
        'ราคารวม (บาท)',
      ],
    },
    {
      title: SHEET_TABS.CONTRACTS,
      headers: [
        'รหัสโครงการที่เสนอ',
        'ชื่อโครงการที่เสนอ',
        'รหัสผลงานอ้างอิง',
        'ชื่อผลงาน/โครงการเดิม',
        'หน่วยงานคู่สัญญา',
        'ปีที่ได้สัญญา (พ.ศ.)',
        'มูลค่าสัญญา (บาท)',
        'ระยะเวลาดำเนินการ',
        'ชื่อไฟล์สำเนาสัญญา/ใบรับรอง',
        'ลิงก์เปิดดูสัญญา (Google Drive)',
        'ภาพผลงานโครงการ (Google Drive)',
        'จำนวนภาพประกอบ',
        'ตัวอย่างภาพผลงาน',
      ],
    },
    {
      title: SHEET_TABS.TEAM,
      headers: [
        'รหัสโครงการ',
        'ชื่อโครงการ',
        'ชื่อ-นามสกุล บุคลากร',
        'ตำแหน่งที่เสนอในโครงการ',
        'วุฒิการศึกษา',
        'ประสบการณ์ทำงาน (ปี)',
        'ภาระหน้าที่รับผิดชอบ',
        'ใบรับรอง/Certifications',
        'ลิงก์รูปถ่าย (Google Drive)',
        'ตัวอย่างรูปถ่าย 1.5 นิ้ว',
      ],
    },
  ];

  const requests: any[] = [];

  // เพิ่มแท็บที่ยังไม่มี
  for (const tab of neededTabs) {
    if (!existingTitles.includes(tab.title)) {
      requests.push({
        addSheet: {
          properties: {
            title: tab.title,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // เซ็ต Headers แถวแรกของทุกแท็บ
  for (const tab of neededTabs) {
    const range = `'${tab.title}'!A1:${String.fromCharCode(64 + tab.headers.length)}1`;
    const checkHeader = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    if (!checkHeader.data.values || checkHeader.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [tab.headers],
        },
      });
    }
  }
}

/**
 * บันทึกข้อมูลทั้งโครงการลงในแต่ละแท็บของ Google Sheet
 */
export async function syncProjectToGoogleSheet(
  sheets: SheetsClient,
  spreadsheetId: string,
  project: BiddingProject,
  folderStructure: ProjectFolderStructure,
  uploadedFiles: UploadedFileResult[]
): Promise<string> {
  // 1. ตรวจสอบให้มีแท็บครบถ้วน
  await initializeSheetTabs(sheets, spreadsheetId);

  const proposalData: ProposalData = project.proposalData || ({} as ProposalData);
  const cover = proposalData.cover || { projectTitle: project.projectTitle, projectCode: project.projectCode };
  const projectCode = project.projectCode || cover.projectCode || 'NO-CODE';
  const projectTitle = project.projectTitle || cover.projectTitle || 'ไม่มีชื่อโครงการ';

  // หาลิงก์ไฟล์สำคัญ
  const docxFile = uploadedFiles.find((f) => f.name.endsWith('.docx') || f.category === 'docx_output');
  const torFile = uploadedFiles.find((f) => f.category === 'announcement' || f.category === 'tor');

  const docxLink = docxFile
    ? `=HYPERLINK("${docxFile.webViewLink}", "เปิดไฟล์เล่ม Word")`
    : folderStructure.subfolders.outputs.url;
  const torLink = torFile
    ? `=HYPERLINK("${torFile.webViewLink}", "${torFile.name}")`
    : folderStructure.subfolders.tor.url;
  const driveFolderLink = `=HYPERLINK("${folderStructure.projectFolderUrl}", "เปิดโฟลเดอร์ Drive")`;

  const nowThai = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

  // --------------------------------------------------------------------------
  // TAB 1: อัปเดต/เพิ่มแถวใน "ภาพรวมโครงการ (Overview)"
  // --------------------------------------------------------------------------
  const overviewRange = `'${SHEET_TABS.OVERVIEW}'!A:A`;
  const existingRowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: overviewRange,
  });

  const rows = existingRowsRes.data.values || [];
  let targetRowIndex = -1;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i] && rows[i][0] === projectCode) {
      targetRowIndex = i + 1; // 1-indexed
      break;
    }
  }

  const overviewRowData = [
    projectCode,
    projectTitle,
    project.clientAgency || cover.clientAgency || '-',
    Number(project.budgetAmount || 0),
    project.announcementDate || '-',
    project.submissionDeadline ? project.submissionDeadline.replace('T', ' ') : '-',
    project.status || 'draft',
    project.assignedTo || '-',
    project.progressPercent || 0,
    driveFolderLink,
    docxLink,
    torLink,
    nowThai,
  ];

  if (targetRowIndex > 0) {
    // อัปเดตแถวเดิม
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${SHEET_TABS.OVERVIEW}'!A${targetRowIndex}:M${targetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [overviewRowData] },
    });
  } else {
    // เพิ่มแถวใหม่
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_TABS.OVERVIEW}'!A:M`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [overviewRowData] },
    });
  }

  // --------------------------------------------------------------------------
  // TAB 2: บันทึก "งวดงานและการส่งมอบ (Milestones)"
  // --------------------------------------------------------------------------
  const milestones = proposalData.section2?.milestones || [];
  if (milestones.length > 0) {
    const milestoneRows = milestones.map((m) => [
      projectCode,
      projectTitle,
      `งวดที่ ${m.installment}`,
      m.title || '',
      Number(m.percentage || 0),
      Number(m.amount || 0),
      m.timeframe || '',
      Array.isArray(m.deliverables) ? m.deliverables.join('\n- ') : '',
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_TABS.MILESTONES}'!A:H`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: milestoneRows },
    });
  }

  // --------------------------------------------------------------------------
  // TAB 3: บันทึก "ถอดแบบงบประมาณ (BOM)"
  // --------------------------------------------------------------------------
  const bomItems = proposalData.section2?.bomItems || [];
  if (bomItems.length > 0) {
    const bomRows = bomItems.map((b: any) => [
      projectCode,
      projectTitle,
      b.category || 'ทั่วไป',
      b.title || '',
      b.responsibleRole || '',
      Number(b.quantity || 1),
      b.unit || 'ชุด',
      Number(b.unitPrice || 0),
      Number(b.totalPrice || 0),
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_TABS.BOM}'!A:I`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: bomRows },
    });
  }

  // --------------------------------------------------------------------------
  // TAB 4: บันทึก "ผลงานอ้างอิงและสัญญา (Contracts)" พร้อมลิงก์ Google Drive
  // --------------------------------------------------------------------------
  const pastProjects = proposalData.section5?.pastProjects || [];
  const selectedPastProjects = pastProjects.filter((p) => p.isSelected !== false);

  if (selectedPastProjects.length > 0) {
    const contractRows = selectedPastProjects.map((proj) => {
      const pRef = proj.id || proj.projectCode || proj.projectName;

      // ค้นหาว่าไฟล์สัญญานี้ถูกอัปโหลดขึ้น Google Drive ได้ลิงก์อะไร
      const uploadedCert = uploadedFiles.find(
        (f) =>
          f.category === 'contract_cert' &&
          (f.projectRef === pRef ||
            f.name.includes(proj.projectCode || '') ||
            f.name.includes(proj.projectName.substring(0, 15)))
      );

      const contractDriveLink = uploadedCert
        ? `=HYPERLINK("${uploadedCert.webViewLink}", "เปิดดูสำเนาสัญญา (Drive)")`
        : '-';

      // ค้นหาภาพหลักของผลงาน
      const mainImg = uploadedFiles.find(
        (f) =>
          f.category === 'project_image' &&
          (f.projectRef === pRef || (proj.projectCode && f.name.includes(proj.projectCode)))
      );

      // ค้นหาภาพประกอบใน imageBlocks
      const blockImages = uploadedFiles.filter(
        (f) =>
          f.category === 'project_image_block' &&
          (f.projectRef === pRef || (proj.projectCode && f.name.includes(proj.projectCode)))
      );

      const effectiveMainImg = mainImg || (blockImages.length > 0 ? blockImages[0] : null);
      const imgDriveLink = effectiveMainImg
        ? `=HYPERLINK("${effectiveMainImg.webViewLink}", "เปิดดูภาพผลงาน (Drive)")`
        : '-';

      const totalImgCount = (mainImg ? 1 : 0) + (mainImg === blockImages[0] ? blockImages.length - 1 : blockImages.length);
      const countText = totalImgCount > 0 ? `มีภาพประกอบ ${totalImgCount} ภาพ` : '-';
      const imgThumbnail = effectiveMainImg && effectiveMainImg.fileId
        ? `=IMAGE("https://drive.google.com/thumbnail?id=${effectiveMainImg.fileId}&sz=w400")`
        : '-';

      return [
        projectCode,
        projectTitle,
        proj.projectCode || '-',
        proj.projectName || '',
        proj.clientName || '',
        proj.contractYearBE || proj.completionYearBE || '',
        Number(proj.contractValue || 0),
        proj.periodDuration || '',
        proj.certificateFileName || uploadedCert?.name || 'ไม่มีไฟล์แนบ',
        contractDriveLink,
        imgDriveLink,
        countText,
        imgThumbnail,
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_TABS.CONTRACTS}'!A:M`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: contractRows },
    });
  }

  // --------------------------------------------------------------------------
  // TAB 5: บันทึก "บุคลากรหลัก (Team)"
  // --------------------------------------------------------------------------
  const teamMembers = proposalData.section4?.teamMembers || [];
  if (teamMembers.length > 0) {
    const teamRows = teamMembers.map((m) => {
      const mRef = m.id || m.memberCode || m.name;
      const uploadedPhoto = uploadedFiles.find(
        (f) =>
          f.category === 'team_photo' &&
          (f.memberRef === mRef || (m.name && f.name.includes(m.name)))
      );

      const photoDriveLink = uploadedPhoto
        ? `=HYPERLINK("${uploadedPhoto.webViewLink}", "เปิดดูรูปถ่าย (Drive)")`
        : '-';
      const photoThumbnail = uploadedPhoto && uploadedPhoto.fileId
        ? `=IMAGE("https://drive.google.com/thumbnail?id=${uploadedPhoto.fileId}&sz=w400")`
        : '-';

      return [
        projectCode,
        projectTitle,
        m.name || '',
        m.proposedRole || '',
        m.education || '',
        Number(m.experienceYears || 0),
        m.responsibilities || '',
        m.certifications || '',
        photoDriveLink,
        photoThumbnail,
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${SHEET_TABS.TEAM}'!A:J`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: teamRows },
    });
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/**
 * ซิงค์ข้อมูลกลางทั้งหมด (Master Library) ลงในแท็บ [คลังกลาง] ทั้ง 4 แท็บใน Google Sheet
 */
export async function syncMasterLibraryToGoogleSheet(
  sheets: SheetsClient,
  spreadsheetId: string,
  masterData: {
    masterProjects?: any[];
    masterTeam?: any[];
    masterBom?: any[];
    masterCompany?: any;
    uploadedCerts?: Record<string, string>;
    uploadedProjectImages?: Record<string, { mainUrl?: string; mainFileId?: string; blockUrls: string[]; count: number }>;
    uploadedTeamPhotos?: Record<string, { photoUrl: string; fileId: string }>;
  }
): Promise<string> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  const existingTitles = existingSheets.map((s) => s.properties?.title || '');

  const masterTabsConfig = [
    {
      title: MASTER_SHEET_TABS.PROJECTS,
      headers: [
        'รหัสผลงาน',
        'ปีที่ได้สัญญา (พ.ศ.)',
        'ชื่อผลงาน/โครงการ',
        'หน่วยงานผู้ว่าจ้าง',
        'มูลค่าสัญญา (บาท)',
        'ปีแล้วเสร็จ (พ.ศ.)',
        'ระยะเวลาสัญญา',
        'หมวดหมู่งาน',
        'ประเภทงาน',
        'รายละเอียด/ขอบเขตงาน',
        'หมายเหตุความสอดคล้อง TOR',
        'ชื่อไฟล์สำเนาสัญญา',
        'ลิงก์เปิดดูสัญญา (Google Drive)',
        'ภาพผลงานโครงการ (Google Drive)',
        'จำนวนภาพประกอบ',
        'ตัวอย่างภาพผลงาน',
        'วันที่อัปเดตล่าสุด',
      ],
    },
    {
      title: MASTER_SHEET_TABS.TEAM,
      headers: [
        'รหัสบุคลากร',
        'ปีที่บันทึก (พ.ศ.)',
        'ชื่อ-นามสกุล',
        'ตำแหน่งหลักที่เสนอ',
        'วุฒิการศึกษา',
        'ประสบการณ์ (ปี)',
        'ปีเริ่มทำงาน (พ.ศ.)',
        'หน้าที่ความรับผิดชอบหลัก',
        'ผลงานเด่นที่ผ่านมา',
        'ใบรับรอง/Certifications',
        'ลิงก์รูปถ่าย (Google Drive)',
        'ตัวอย่างรูปถ่าย 1.5 นิ้ว',
        'วันที่อัปเดตล่าสุด',
      ],
    },
    {
      title: MASTER_SHEET_TABS.BOM,
      headers: [
        'หมวดหมู่งาน',
        'รายการงาน/อุปกรณ์',
        'ตำแหน่งผู้รับผิดชอบ',
        'หน่วยนับ',
        'ราคาต่อหน่วยมาตรฐาน (บาท)',
        'จำนวนตั้งต้น',
        'รายละเอียด/ขอบเขตงาน',
        'เอกสารสิ่งส่งมอบ',
        'สถานะมาตรฐาน',
        'วันที่อัปเดตล่าสุด',
      ],
    },
    {
      title: MASTER_SHEET_TABS.COMPANY,
      headers: [
        'ชื่อบริษัท/นิติบุคคล',
        'ปีก่อตั้ง (พ.ศ.)',
        'ทุนจดทะเบียน',
        'ความเชี่ยวชาญหลัก',
        'มาตรฐานและการรับรอง',
        'วิสัยทัศน์และพันธกิจ',
        'ประวัติและภาพรวมบริษัท',
        'วันที่อัปเดตล่าสุด',
      ],
    },
  ];

  const addRequests: any[] = [];
  for (const tab of masterTabsConfig) {
    if (!existingTitles.includes(tab.title)) {
      addRequests.push({
        addSheet: {
          properties: {
            title: tab.title,
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      });
    }
  }

  if (addRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: addRequests },
    });
  }

  const nowThai = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  const { masterProjects = [], masterTeam = [], masterBom = [], masterCompany = {}, uploadedCerts = {} } = masterData;

  // 1. [คลังกลาง] ผลงานและสัญญา
  const { uploadedProjectImages = {}, uploadedTeamPhotos = {} } = masterData;
  const projHeaders = masterTabsConfig[0].headers;
  const projRows: any[][] = [projHeaders];
  for (let j = 0; j < masterProjects.length; j++) {
    const mp = masterProjects[j];
    const pRef = mp.id || mp.projectCode || ('prj_' + j);
    const certLink = uploadedCerts[pRef] || (mp.certificateFileUrl?.startsWith('http') ? mp.certificateFileUrl : null);
    const certFormula = certLink ? `=HYPERLINK("${certLink}", "เปิดดูสำเนาสัญญา (Drive)")` : '-';

    const imgInfo = uploadedProjectImages[pRef];
    const imgLink = imgInfo?.mainUrl || (mp.projectImageUrl?.startsWith('http') ? mp.projectImageUrl : null);
    const imgFormula = imgLink ? `=HYPERLINK("${imgLink}", "เปิดดูภาพผลงาน (Drive)")` : '-';
    const imgCountStr = (imgInfo && imgInfo.count > 0) ? `มีภาพประกอบ ${imgInfo.count} ภาพ` : '-';
    const imgThumbFormula = (imgInfo && imgInfo.mainFileId)
      ? `=IMAGE("https://drive.google.com/thumbnail?id=${imgInfo.mainFileId}&sz=w400")`
      : '-';

    projRows.push([
      mp.projectCode || `PRJ-${j + 1}`,
      Number(mp.contractYearBE || mp.completionYearBE || 2568),
      mp.projectName || '',
      mp.clientName || '',
      Number(mp.contractValue || 0),
      Number(mp.completionYearBE || mp.contractYearBE || 2568),
      mp.periodDuration || '',
      mp.category || 'ทั่วไป',
      mp.projectType === 'supplementary' ? 'ผลงานเสริม (อื่นๆ)' : 'ผลงานตรง TOR',
      mp.description || '',
      mp.relevanceNote || '',
      mp.certificateFileName || (certLink ? 'มีไฟล์แนบในไดรฟ์' : 'ไม่มีไฟล์แนบ'),
      certFormula,
      imgFormula,
      imgCountStr,
      imgThumbFormula,
      nowThai,
    ]);
  }

  // เคลียร์และเขียนข้อมูลแท็บ Projects
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${MASTER_SHEET_TABS.PROJECTS}'!A:Q`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${MASTER_SHEET_TABS.PROJECTS}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: projRows },
  });

  // 2. [คลังกลาง] บุคลากร
  const teamHeaders = masterTabsConfig[1].headers;
  const teamRows: any[][] = [teamHeaders];
  for (let k = 0; k < masterTeam.length; k++) {
    const tm = masterTeam[k];
    const tRef = tm.id || tm.memberCode || tm.name;
    const photoInfo = uploadedTeamPhotos[tRef];
    const photoLink = photoInfo?.photoUrl || (tm.photoUrl?.startsWith('http') ? tm.photoUrl : null);
    const photoFormula = photoLink ? `=HYPERLINK("${photoLink}", "เปิดดูรูปถ่าย (Drive)")` : '-';
    const photoThumbFormula = (photoInfo && photoInfo.fileId)
      ? `=IMAGE("https://drive.google.com/thumbnail?id=${photoInfo.fileId}&sz=w400")`
      : '-';

    teamRows.push([
      tm.memberCode || tm.id || `EMP-${k + 1}`,
      Number(tm.recordedYearBE || 2568),
      tm.name || '',
      tm.proposedRole || '',
      tm.education || '',
      Number(tm.experienceYears || 0),
      Number(tm.startWorkYearBE || 2560),
      tm.responsibilities || '',
      tm.highlightProjects || '',
      tm.certifications || '',
      photoFormula,
      photoThumbFormula,
      nowThai,
    ]);
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${MASTER_SHEET_TABS.TEAM}'!A:M`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${MASTER_SHEET_TABS.TEAM}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: teamRows },
  });

  // 3. [คลังกลาง] แคตตาล็อก BOM
  const bomHeaders = masterTabsConfig[2].headers;
  const bomRows: any[][] = [bomHeaders];
  for (let b = 0; b < masterBom.length; b++) {
    const mb = masterBom[b];
    bomRows.push([
      mb.category || 'ทั่วไป',
      mb.title || '',
      mb.responsibleRole || '',
      mb.unit || 'ชุด',
      Number(mb.defaultRate || 0),
      Number(mb.defaultQuantity || 1),
      mb.description || '',
      mb.deliverable || '',
      mb.isStandard ? 'มาตรฐาน' : 'กำหนดเอง',
      nowThai,
    ]);
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${MASTER_SHEET_TABS.BOM}'!A:J`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${MASTER_SHEET_TABS.BOM}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: bomRows },
  });

  // 4. [คลังกลาง] ข้อมูลบริษัท
  const compHeaders = masterTabsConfig[3].headers;
  const specs = Array.isArray(masterCompany.specializations)
    ? masterCompany.specializations.join(', ')
    : (masterCompany.specializations || '-');
  const certs = Array.isArray(masterCompany.certifications)
    ? masterCompany.certifications.join(', ')
    : (masterCompany.certifications || '-');

  const compRows: any[][] = [
    compHeaders,
    [
      masterCompany.companyName || '-',
      Number(masterCompany.establishedYearBE || 2558),
      masterCompany.registeredCapital || '-',
      specs,
      certs,
      masterCompany.visionMission || '-',
      masterCompany.companyProfile || '-',
      nowThai,
    ],
  ];

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${MASTER_SHEET_TABS.COMPANY}'!A:H`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${MASTER_SHEET_TABS.COMPANY}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: compRows },
  });

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

