import { google } from 'googleapis';
import type { BiddingProject, ProposalData } from '../../src/types/proposal';
import type { UploadedFileResult, ProjectFolderStructure } from './driveService';

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

const MAX_EXTRA_PROJECT_THUMBS = 15;

export function extractDriveFileIdFromUrl(url?: string): string {
  if (!url || typeof url !== 'string') return '';
  const m1 = url.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (m1 && m1[1]) return m1[1];
  const m2 = url.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (m2 && m2[1]) return m2[1];
  return '';
}

export function collectProjectDriveFileIds(
  proj: any,
  uploadedFiles: UploadedFileResult[] = [],
  uploadedImgInfo?: { mainUrl?: string; mainFileId?: string; blockUrls?: string[]; count?: number }
): string[] {
  const ids: string[] = [];
  const addId = (id?: string) => {
    if (id && !ids.includes(id)) ids.push(id);
  };

  const pRef = proj.id || proj.projectCode || proj.projectName;

  // 1. ดึงจาก imageBlocks ตามลำดับที่ผู้ใช้จัดเรียงไว้ก่อนเสมอ
  if (Array.isArray(proj.imageBlocks)) {
    for (const b of proj.imageBlocks) {
      if (!b) continue;
      if (b.type === 'single') {
        addId(extractDriveFileIdFromUrl(b.url));
      } else if (b.type === 'pair' || b.type === 'double') {
        addId(extractDriveFileIdFromUrl(b.leftUrl || b.urlLeft));
        addId(extractDriveFileIdFromUrl(b.rightUrl || b.urlRight));
      }
    }
  }

  // 2. ดึงจากรายการไฟล์ที่เพิ่งอัปโหลดในรอบนี้
  for (const uf of uploadedFiles) {
    const ref = (uf as any).refId || uf.projectRef;
    if (
      (uf.category === 'project_image' || uf.category === 'project_image_block') &&
      (ref === pRef || (proj.projectCode && uf.name.includes(proj.projectCode)))
    ) {
      addId(uf.fileId || extractDriveFileIdFromUrl(uf.webViewLink));
    }
  }

  if (uploadedImgInfo) {
    addId(uploadedImgInfo.mainFileId || extractDriveFileIdFromUrl(uploadedImgInfo.mainUrl));
    for (const u of uploadedImgInfo.blockUrls || []) {
      addId(extractDriveFileIdFromUrl(u));
    }
  }

  // 3. ดึงจาก projectImageUrl และ fallback ไปยัง clientLogoUrl หากยังไม่มีภาพประกอบโครงการ
  if (ids.length === 0 && proj.projectImageUrl) {
    addId(extractDriveFileIdFromUrl(proj.projectImageUrl));
  }
  if (ids.length === 0 && proj.clientLogoUrl) {
    addId(extractDriveFileIdFromUrl(proj.clientLogoUrl));
  }

  return ids;
}

export function extractUrlFromCell(val: any): string {
  const s = String(val || '').trim();
  if (!s || s === '-') return '';
  const hyperMatch = s.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
  if (hyperMatch && hyperMatch[1] && hyperMatch[1].startsWith('http')) {
    return hyperMatch[1];
  }
  const imgMatch = s.match(/IMAGE\(\s*["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1] && imgMatch[1].startsWith('http')) {
    return imgMatch[1];
  }
  if (s.startsWith('http')) {
    return s;
  }
  return '';
}

export function extractAllDriveFileIdsFromSheetRow(
  row: any[],
  allLinksColIdx: number,
  extraStartColIdx: number,
  mainImgColIdx: number,
  mainThumbColIdx: number
): string[] {
  const ids: string[] = [];
  const addId = (fid?: string) => {
    if (fid && !ids.includes(fid)) ids.push(fid);
  };

  // 1. ดึงจากคอลัมน์รวมลิงก์ทั้งหมด (เช่น "ภาพที่ 1: https://drive.google.com/file/d/...")
  const allLinksText = String(row?.[allLinksColIdx] || '');
  if (allLinksText && allLinksText !== '-') {
    const regex = /\/d\/([a-zA-Z0-9_-]{15,})|[?&]id=([a-zA-Z0-9_-]{15,})/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(allLinksText)) !== null) {
      addId(m[1] || m[2]);
    }
  }

  // 2. ดึงจากคอลัมน์ภาพประกอบที่ 1..15 (=IMAGE("https://drive.google.com/thumbnail?id=..."))
  for (let c = extraStartColIdx; c < extraStartColIdx + MAX_EXTRA_PROJECT_THUMBS; c++) {
    const cellVal = String(row?.[c] || '');
    if (cellVal) {
      addId(extractDriveFileIdFromUrl(cellVal));
    }
  }

  // 3. ดึงจากคอลัมน์ลิงก์ภาพหลัก และตัวอย่างภาพหลัก
  addId(extractDriveFileIdFromUrl(String(row?.[mainImgColIdx] || '')));
  addId(extractDriveFileIdFromUrl(String(row?.[mainThumbColIdx] || '')));

  return ids;
}

export function reconstructImageBlocksFromDriveIds(
  _projectCode: string,
  _projectName: string,
  projectId: string,
  driveFileIds: string[]
): { imageBlocks: any[]; projectImageUrl?: string; clientLogoUrl?: string } {
  if (driveFileIds.length === 0) {
    return { imageBlocks: [] };
  }

  const toThumbUrl = (fid: string) => `https://drive.google.com/thumbnail?id=${fid}&sz=w1200`;
  const mainImageUrl = toThumbUrl(driveFileIds[0]);

  const blocks = driveFileIds.map((fid, idx) => ({
    id: `img-${projectId}-${idx + 1}`,
    type: 'single' as const,
    url: toThumbUrl(fid),
    caption: `ภาพประกอบผลงานที่ ${idx + 1}`,
  }));

  return {
    imageBlocks: blocks,
    projectImageUrl: mainImageUrl,
  };
}

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
        'ตัวอย่างภาพผลงานหลัก',
        'รวมลิงก์ภาพประกอบทั้งหมดในโครงการ (Google Drive)',
        ...Array.from({ length: MAX_EXTRA_PROJECT_THUMBS }, (_, i) => `ภาพประกอบที่ ${i + 1}`),
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
        'หน้าที่ความรับผิดชอบ',
        'ประวัติย่อและความเชี่ยวชาญสำคัญ',
        'ใบรับรอง/Certifications',
        'ลิงก์รูปถ่าย (Google Drive)',
        'ตัวอย่างรูปถ่าย 1.5 นิ้ว',
        'ภาพประกอบประวัติย่อ (Google Drive)',
        'จำนวนภาพประกอบประวัติย่อ',
        'ตัวอย่างภาพประกอบประวัติย่อ',
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
    const checkHeader = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tab.title}'!A1:AZ1`,
    });

    if (!checkHeader.data.values || checkHeader.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tab.title}'!A1`,
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
  const overviewRange = `'${SHEET_TABS.OVERVIEW}'!A:B`;
  const existingRowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: overviewRange,
  });

  const rows = existingRowsRes.data.values || [];
  let targetRowIndex = -1;
  let oldProjectCode = '';
  const prevCode = (project as any).previousProjectCode || '';

  for (let i = 1; i < rows.length; i++) {
    const rCode = String(rows[i]?.[0] || '').trim();
    const rTitle = String(rows[i]?.[1] || '').trim();
    if (
      rCode === projectCode ||
      (prevCode && rCode === prevCode) ||
      (projectTitle && projectTitle !== 'ไม่มีชื่อโครงการ' && rTitle === projectTitle)
    ) {
      targetRowIndex = i + 1; // 1-indexed
      oldProjectCode = rCode;
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

  let overviewRowNum = targetRowIndex;
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
    overviewRowNum = rows.length + 1;
  }

  const codeRefFormula = `='${SHEET_TABS.OVERVIEW}'!$A$${overviewRowNum}`;
  const titleRefFormula = `='${SHEET_TABS.OVERVIEW}'!$B$${overviewRowNum}`;

  async function replaceProjectRowsInTab(tabTitle: string, endCol: string, newRows: any[][]) {
    const getRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tabTitle}'!A1:${endCol}`,
      valueRenderOption: 'FORMULA',
    });
    const getFormattedRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tabTitle}'!A1:B`,
    });
    const formulaRows = getRes.data.values || [];
    const formattedRows = getFormattedRes.data.values || [];
    const headerRow = formulaRows[0] || [];
    const keptRows: any[][] = headerRow.length > 0 ? [headerRow] : [];

    for (let r = 1; r < formulaRows.length; r++) {
      const dispCode = String(formattedRows[r]?.[0] || formulaRows[r]?.[0] || '').trim();
      const dispTitle = String(formattedRows[r]?.[1] || formulaRows[r]?.[1] || '').trim();
      const rawFormulaCode = String(formulaRows[r]?.[0] || '').trim();
      const isSameOverviewRow = rawFormulaCode.includes(`$A$${overviewRowNum}`);
      const isMatchedProject =
        isSameOverviewRow ||
        dispCode === projectCode ||
        (oldProjectCode && dispCode === oldProjectCode) ||
        (prevCode && dispCode === prevCode) ||
        (projectTitle && projectTitle !== 'ไม่มีชื่อโครงการ' && dispTitle === projectTitle);

      if (!isMatchedProject) {
        keptRows.push(formulaRows[r]);
      }
    }

    const finalRows = [...keptRows, ...newRows];
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${tabTitle}'!A1:${endCol}`,
    });
    if (finalRows.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${tabTitle}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: finalRows },
      });
    }
  }

  // --------------------------------------------------------------------------
  // TAB 2: บันทึก "งวดงานและการส่งมอบ (Milestones)"
  // --------------------------------------------------------------------------
  const milestones = proposalData.section2?.milestones || [];
  if (milestones.length > 0) {
    const milestoneRows = milestones.map((m) => [
      codeRefFormula,
      titleRefFormula,
      `งวดที่ ${m.installment}`,
      m.title || '',
      Number(m.percentage || 0),
      Number(m.amount || 0),
      m.timeframe || '',
      Array.isArray(m.deliverables) ? m.deliverables.join('\n- ') : '',
    ]);

    await replaceProjectRowsInTab(SHEET_TABS.MILESTONES, 'H', milestoneRows);
  }

  // --------------------------------------------------------------------------
  // TAB 3: บันทึก "ถอดแบบงบประมาณ (BOM)"
  // --------------------------------------------------------------------------
  const bomItems = proposalData.section2?.bomItems || [];
  if (bomItems.length > 0) {
    const bomRows = bomItems.map((b: any) => [
      codeRefFormula,
      titleRefFormula,
      b.category || 'ทั่วไป',
      b.title || '',
      b.responsibleRole || '',
      Number(b.quantity || 1),
      b.unit || 'ชุด',
      Number(b.unitPrice || 0),
      Number(b.totalPrice || 0),
    ]);

    await replaceProjectRowsInTab(SHEET_TABS.BOM, 'I', bomRows);
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
          (((f as any).refId || f.projectRef) === pRef ||
            f.name.includes(proj.projectCode || '') ||
            f.name.includes(proj.projectName.substring(0, 15)))
      );

      const certUrl = uploadedCert?.webViewLink || (proj.certificateFileUrl?.startsWith('http') ? proj.certificateFileUrl : '');
      const contractDriveLink = certUrl
        ? `=HYPERLINK("${certUrl}", "เปิดดูสำเนาสัญญา (Drive)")`
        : '-';

      const driveFileIds = collectProjectDriveFileIds(proj, uploadedFiles);
      const mainFileId = driveFileIds[0] || '';
      const mainViewUrl = mainFileId ? `https://drive.google.com/file/d/${mainFileId}/view?usp=drivesdk` : '';

      const imgDriveLink = mainViewUrl
        ? `=HYPERLINK("${mainViewUrl}", "เปิดดูภาพผลงาน (Drive)")`
        : '-';

      const countText = driveFileIds.length > 0 ? `มีภาพประกอบ ${driveFileIds.length} ภาพ` : '-';
      const imgThumbnail = mainFileId
        ? `=IMAGE("https://drive.google.com/thumbnail?id=${mainFileId}&sz=w400")`
        : '-';

      const allLinksText = driveFileIds.length > 0
        ? driveFileIds.map((id, idx) => `ภาพที่ ${idx + 1}: https://drive.google.com/file/d/${id}/view?usp=drivesdk`).join('\n')
        : '-';

      const extraThumbs = Array.from({ length: MAX_EXTRA_PROJECT_THUMBS }, (_, idx) => {
        const fid = driveFileIds[idx];
        return fid ? `=IMAGE("https://drive.google.com/thumbnail?id=${fid}&sz=w400")` : '';
      });

      return [
        codeRefFormula,
        titleRefFormula,
        proj.projectCode || '-',
        proj.projectName || '',
        proj.clientName || '',
        proj.contractYearBE || proj.completionYearBE || '',
        Number(proj.contractValue || 0),
        proj.periodDuration || '',
        proj.certificateFileName || uploadedCert?.name || (certUrl ? 'มีไฟล์แนบในไดรฟ์' : 'ไม่มีไฟล์แนบ'),
        contractDriveLink,
        imgDriveLink,
        countText,
        imgThumbnail,
        allLinksText,
        ...extraThumbs,
      ];
    });

    await replaceProjectRowsInTab(SHEET_TABS.CONTRACTS, 'AC', contractRows);
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

      const uploadedBioImages = uploadedFiles.filter(
        (f) =>
          f.category === 'team_bio_image_block' &&
          (f.memberRef === mRef || (m.name && f.name.includes(m.name)))
      );

      const mainBioImg = uploadedBioImages.length > 0 ? uploadedBioImages[0] : null;
      const bioImgDriveFormula = mainBioImg
        ? `=HYPERLINK("${mainBioImg.webViewLink}", "เปิดดูภาพประกอบประวัติย่อ (Drive)")`
        : '-';
      const bioImgCountStr = uploadedBioImages.length > 0
        ? `มีภาพประกอบ ${uploadedBioImages.length} ภาพ`
        : '-';
      const bioImgThumbnailFormula = mainBioImg && mainBioImg.fileId
        ? `=IMAGE("https://drive.google.com/thumbnail?id=${mainBioImg.fileId}&sz=w400")`
        : '-';

      return [
        codeRefFormula,
        titleRefFormula,
        m.name || '',
        m.proposedRole || '',
        m.education || '',
        Number(m.experienceYears || 0),
        m.responsibilities || '',
        m.personalBio || '',
        m.certifications || '',
        photoDriveLink,
        photoThumbnail,
        bioImgDriveFormula,
        bioImgCountStr,
        bioImgThumbnailFormula,
      ];
    });

    await replaceProjectRowsInTab(SHEET_TABS.TEAM, 'N', teamRows);
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
    incremental?: boolean;
    uploadedCerts?: Record<string, string>;
    uploadedProjectImages?: Record<string, { mainUrl?: string; mainFileId?: string; blockUrls: string[]; count: number }>;
    uploadedTeamPhotos?: Record<string, { photoUrl: string; fileId: string }>;
    uploadedTeamBioImages?: Record<string, { mainUrl?: string; mainFileId?: string; count: number }>;
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
        'ตัวอย่างภาพผลงานหลัก',
        'วันที่อัปเดตล่าสุด',
        'รวมลิงก์ภาพประกอบทั้งหมดในโครงการ (Google Drive)',
        ...Array.from({ length: MAX_EXTRA_PROJECT_THUMBS }, (_, i) => `ภาพประกอบที่ ${i + 1}`),
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
        'ประวัติย่อและความเชี่ยวชาญสำคัญ',
        'ใบรับรอง/Certifications',
        'ลิงก์รูปถ่าย (Google Drive)',
        'ตัวอย่างรูปถ่าย 1.5 นิ้ว',
        'ภาพประกอบประวัติย่อ (Google Drive)',
        'จำนวนภาพประกอบประวัติย่อ',
        'ตัวอย่างภาพประกอบประวัติย่อ',
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
  const {
    masterProjects = [],
    masterTeam = [],
    masterBom = [],
    masterCompany,
    incremental = false,
    uploadedCerts = {},
    uploadedProjectImages = {},
    uploadedTeamPhotos = {},
  } = masterData;

  const normStr = (s?: any) => String(s || '').trim().toLowerCase();

  // --------------------------------------------------------------------------
  // 1. [คลังกลาง] ผลงานและสัญญา (รองรับทั้ง Incremental Row Upsert และ Full Sync)
  // --------------------------------------------------------------------------
  const projHeaders = masterTabsConfig[0].headers;
  let existingProjRows: any[][] = [];
  try {
    const getExistProj = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${MASTER_SHEET_TABS.PROJECTS}'`,
      valueRenderOption: 'FORMULA',
    });
    existingProjRows = getExistProj.data.values || [];
    while (
      existingProjRows.length > 1 &&
      !String(existingProjRows[existingProjRows.length - 1]?.[0] || '').trim() &&
      !String(existingProjRows[existingProjRows.length - 1]?.[2] || '').trim()
    ) {
      existingProjRows.pop();
    }
  } catch (readProjErr) {
    if (incremental) {
      throw readProjErr;
    }
    existingProjRows = [];
  }

  const buildMasterProjectRow = (mp: any, idx: number, existingRow?: any[]) => {
    const pRef = mp.id || mp.projectCode || ('prj_' + idx);
    const existingCertUrl = existingRow ? extractUrlFromCell(existingRow[12]) : '';
    const certLink =
      uploadedCerts[pRef] ||
      (mp.certificateFileUrl?.startsWith('http') ? mp.certificateFileUrl : null) ||
      existingCertUrl ||
      null;
    const certFormula = certLink ? `=HYPERLINK("${certLink}", "เปิดดูสำเนาสัญญา (Drive)")` : '-';

    const imgInfo = uploadedProjectImages[pRef];
    let driveFileIds = collectProjectDriveFileIds(mp, [], imgInfo);
    if (driveFileIds.length === 0 && existingRow) {
      driveFileIds = extractAllDriveFileIdsFromSheetRow(existingRow, 17, 18, 13, 15);
    }

    const mainFileId = driveFileIds[0] || '';
    const existingImgLink = existingRow ? extractUrlFromCell(existingRow[13]) : '';
    const imgLink = mainFileId
      ? `https://drive.google.com/file/d/${mainFileId}/view?usp=drivesdk`
      : (imgInfo?.mainUrl || (mp.projectImageUrl?.startsWith('http') ? mp.projectImageUrl : null) || existingImgLink || null);
    const imgFormula = imgLink ? `=HYPERLINK("${imgLink}", "เปิดดูภาพผลงาน (Drive)")` : '-';
    const imgCountStr = driveFileIds.length > 0
      ? `มีภาพประกอบ ${driveFileIds.length} ภาพ`
      : (imgInfo && imgInfo.count > 0 ? `มีภาพประกอบ ${imgInfo.count} ภาพ` : '-');
    const imgThumbFormula = mainFileId
      ? `=IMAGE("https://drive.google.com/thumbnail?id=${mainFileId}&sz=w400")`
      : '-';

    const allLinksText = driveFileIds.length > 0
      ? driveFileIds.map((id, i) => `ภาพที่ ${i + 1}: https://drive.google.com/file/d/${id}/view?usp=drivesdk`).join('\n')
      : '-';

    const extraThumbs = Array.from({ length: MAX_EXTRA_PROJECT_THUMBS }, (_, i) => {
      const fid = driveFileIds[i];
      return fid ? `=IMAGE("https://drive.google.com/thumbnail?id=${fid}&sz=w400")` : '';
    });

    const contractYr = Number(mp.contractYearBE || mp.completionYearBE || (existingRow ? existingRow[1] : 2568)) || 2568;
    const completionYr = Number(mp.completionYearBE || mp.contractYearBE || (existingRow ? existingRow[5] : contractYr)) || contractYr;
    const defaultRelNote =
      mp.projectType === 'supplementary'
        ? 'ผลงานเสริมศักยภาพและประสบการณ์ของบริษัท'
        : 'ผลงานอ้างอิงหลักตรงตามเกณฑ์ TOR';

    return [
      mp.projectCode || (existingRow ? existingRow[0] : `PRJ-${idx + 1}`),
      contractYr,
      mp.projectName || (existingRow ? existingRow[2] : '-'),
      mp.clientName || (existingRow ? existingRow[3] : '-'),
      Number(mp.contractValue ?? (existingRow ? existingRow[4] : 0)),
      completionYr,
      mp.periodDuration || (existingRow ? existingRow[6] : '-') || '-',
      mp.category || (existingRow ? existingRow[7] : 'ทั่วไป') || 'ทั่วไป',
      mp.projectType === 'supplementary' ? 'ผลงานเสริม (อื่นๆ)' : 'ผลงานตรง TOR',
      mp.description || (existingRow ? existingRow[9] : '-') || '-',
      mp.relevanceNote || (existingRow ? existingRow[10] : defaultRelNote) || defaultRelNote,
      mp.certificateFileName || (existingRow && existingRow[11] && existingRow[11] !== 'ไม่มีไฟล์แนบ' ? existingRow[11] : (certLink ? 'มีไฟล์แนบในไดรฟ์' : 'ไม่มีไฟล์แนบ')),
      certFormula,
      imgFormula,
      imgCountStr,
      imgThumbFormula,
      nowThai,
      allLinksText,
      ...extraThumbs,
    ];
  };

  // Helper แปลงแถว Master Project (33 คอลัมน์ A..AG) เป็นคอลัมน์ C..AC (27 คอลัมน์) ของแท็บ Contracts
  const toContractColsCtoAC = (masterRowBuilt: any[]) => [
    masterRowBuilt[0], // C: รหัสผลงานอ้างอิง
    masterRowBuilt[2], // D: ชื่อผลงาน/โครงการเดิม
    masterRowBuilt[3], // E: หน่วยงานคู่สัญญา
    masterRowBuilt[1], // F: ปีที่ได้สัญญา (พ.ศ.)
    masterRowBuilt[4], // G: มูลค่าสัญญา (บาท)
    masterRowBuilt[6], // H: ระยะเวลาดำเนินการ
    masterRowBuilt[11], // I: ชื่อไฟล์สำเนาสัญญา/ใบรับรอง
    masterRowBuilt[12], // J: ลิงก์เปิดดูสัญญา (Google Drive)
    masterRowBuilt[13], // K: ภาพผลงานโครงการ (Google Drive)
    masterRowBuilt[14], // L: จำนวนภาพประกอบ
    masterRowBuilt[15], // M: ตัวอย่างภาพผลงานหลัก
    masterRowBuilt[17], // N: รวมลิงก์ภาพประกอบทั้งหมด
    ...masterRowBuilt.slice(18, 18 + MAX_EXTRA_PROJECT_THUMBS), // O..AC: ภาพประกอบที่ 1..15
  ];

  // ดึงสูตรอ้างอิงโครงการที่เสนอกลางจากแท็บ Overview หรือ Contracts เพื่อให้การเพิ่มข้อมูลใหม่อัปเดตครบทั้ง 29 คอลัมน์ (A..AC)
  const resolveDefaultOverviewFormulaRefs = async (existingRowsInTab: any[][]): Promise<{ codeRef: string; titleRef: string }> => {
    for (let r = existingRowsInTab.length - 1; r >= 1; r--) {
      const fA = String(existingRowsInTab[r]?.[0] || '').trim();
      const fB = String(existingRowsInTab[r]?.[1] || '').trim();
      if (fA.startsWith('=') && fB.startsWith('=')) {
        return { codeRef: fA, titleRef: fB };
      }
    }
    try {
      const ovRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${SHEET_TABS.OVERVIEW}'!A1:B`,
      });
      const ovRows = ovRes.data.values || [];
      let lastValidOvRow = 2;
      for (let i = ovRows.length - 1; i >= 1; i--) {
        if (String(ovRows[i]?.[0] || '').trim() || String(ovRows[i]?.[1] || '').trim()) {
          lastValidOvRow = i + 1;
          break;
        }
      }
      return {
        codeRef: `='${SHEET_TABS.OVERVIEW}'!$A$${lastValidOvRow}`,
        titleRef: `='${SHEET_TABS.OVERVIEW}'!$B$${lastValidOvRow}`,
      };
    } catch {
      return {
        codeRef: `='${SHEET_TABS.OVERVIEW}'!$A$2`,
        titleRef: `='${SHEET_TABS.OVERVIEW}'!$B$2`,
      };
    }
  };

  if (masterProjects.length > 0) {
    const builtRowsByIndex: any[][] = [];

    if (incremental) {
      if (existingProjRows.length === 0) {
        existingProjRows = [projHeaders];
      }
      // โหมด Incremental Upsert: อัปเดตเฉพาะแถวของโครงการที่มีการแก้ไข หรือต่อท้ายโครงการใหม่ที่แถวถัดไป (ไม่ล้างแถวอื่นเด็ดขาด)
      const rowsToAppend: any[][] = [];
      for (let j = 0; j < masterProjects.length; j++) {
        const mp = masterProjects[j];
        const targetCode = normStr(mp.projectCode);
        const prevCode = normStr(mp.previousProjectCode);
        const targetName = normStr(mp.projectName);

        let matchedRowIndex = -1; // index ใน existingProjRows (0 = header, 1 = แถวที่ 2 ในชีต)
        for (let r = 1; r < existingProjRows.length; r++) {
          const rCode = normStr(existingProjRows[r]?.[0]);
          const rName = normStr(existingProjRows[r]?.[2]);
          if (
            (targetCode && rCode === targetCode) ||
            (prevCode && rCode === prevCode) ||
            (targetName && rName === targetName)
          ) {
            matchedRowIndex = r;
            break;
          }
        }

        if (matchedRowIndex >= 1) {
          const sheetRowNumber = matchedRowIndex + 1;
          const updatedRow = buildMasterProjectRow(mp, matchedRowIndex - 1, existingProjRows[matchedRowIndex]);
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${MASTER_SHEET_TABS.PROJECTS}'!A${sheetRowNumber}:AG${sheetRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [updatedRow] },
          });
          existingProjRows[matchedRowIndex] = updatedRow;
          builtRowsByIndex[j] = updatedRow;
        } else {
          const newRow = buildMasterProjectRow(mp, existingProjRows.length - 1 + rowsToAppend.length);
          rowsToAppend.push(newRow);
          builtRowsByIndex[j] = newRow;
        }
      }

      if (rowsToAppend.length > 0) {
        const startRow = Math.max(existingProjRows.length + 1, 2);
        const endRow = startRow + rowsToAppend.length - 1;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${MASTER_SHEET_TABS.PROJECTS}'!A${startRow}:AG${endRow}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rowsToAppend },
        });
      }
    } else {
      // โหมด Full Sync: ผสานข้อมูลจากแถวเดิมในชีตเพื่อไม่ให้ลิงก์ Drive หรือโครงการที่มีอยู่แล้วในชีตสูญหาย
      const projRows: any[][] = [projHeaders];
      const matchedExistingIndices = new Set<number>();

      for (let j = 0; j < masterProjects.length; j++) {
        const mp = masterProjects[j];
        const targetCode = normStr(mp.projectCode);
        const prevCode = normStr(mp.previousProjectCode);
        const targetName = normStr(mp.projectName);

        let existingRow: any[] | undefined;
        for (let r = 1; r < existingProjRows.length; r++) {
          if (matchedExistingIndices.has(r)) continue;
          const rCode = normStr(existingProjRows[r]?.[0]);
          const rName = normStr(existingProjRows[r]?.[2]);
          if (
            (targetCode && rCode === targetCode) ||
            (prevCode && rCode === prevCode) ||
            (targetName && rName === targetName)
          ) {
            existingRow = existingProjRows[r];
            matchedExistingIndices.add(r);
            break;
          }
        }

        const built = buildMasterProjectRow(mp, j, existingRow);
        projRows.push(built);
        builtRowsByIndex[j] = built;
      }

      // เก็บแถวเดิมในชีตที่อาจไม่ได้อยู่ใน masterProjects รอบนี้ไว้ด้วย เพื่อป้องกันข้อมูลในชีตหาย
      for (let r = 1; r < existingProjRows.length; r++) {
        if (!matchedExistingIndices.has(r) && (existingProjRows[r]?.[0] || existingProjRows[r]?.[2])) {
          projRows.push(existingProjRows[r]);
        }
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${MASTER_SHEET_TABS.PROJECTS}'!A:AG`,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${MASTER_SHEET_TABS.PROJECTS}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: projRows },
      });
    }

    // ซิงค์อัปเดตและเพิ่มโครงการใหม่เข้าสู่แท็บ "ผลงานอ้างอิงและสัญญา (Contracts)" ให้ครบทั้ง 29 คอลัมน์ (A..AC)
    try {
      const contractsRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${SHEET_TABS.CONTRACTS}'`,
        valueRenderOption: 'FORMULA',
      });
      const cRows = contractsRes.data.values || [];
      while (
        cRows.length > 1 &&
        !String(cRows[cRows.length - 1]?.[0] || '').trim() &&
        !String(cRows[cRows.length - 1]?.[2] || '').trim() &&
        !String(cRows[cRows.length - 1]?.[3] || '').trim()
      ) {
        cRows.pop();
      }

      if (cRows.length >= 1) {
        const { codeRef, titleRef } = await resolveDefaultOverviewFormulaRefs(cRows);
        const newContractRowsToAppend: any[][] = [];

        for (let j = 0; j < masterProjects.length; j++) {
          const mp = masterProjects[j];
          const targetCode = normStr(mp.projectCode);
          const prevCode = normStr(mp.previousProjectCode);
          const targetName = normStr(mp.projectName);
          const masterRowBuilt = builtRowsByIndex[j] || buildMasterProjectRow(mp, j);
          const colsCtoAC = toContractColsCtoAC(masterRowBuilt);

          let matchedCRow = -1;
          for (let cr = 1; cr < cRows.length; cr++) {
            const cRefCode = normStr(cRows[cr]?.[2]);
            const cRefName = normStr(cRows[cr]?.[3]);
            if (
              (targetCode && cRefCode === targetCode) ||
              (prevCode && cRefCode === prevCode) ||
              (targetName && cRefName === targetName)
            ) {
              matchedCRow = cr;
              break;
            }
          }

          if (matchedCRow >= 1) {
            const sheetCRowNum = matchedCRow + 1;
            const existCodeFormula = String(cRows[matchedCRow]?.[0] || '').trim() || codeRef;
            const existTitleFormula = String(cRows[matchedCRow]?.[1] || '').trim() || titleRef;
            const fullContractRow = [existCodeFormula, existTitleFormula, ...colsCtoAC];
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `'${SHEET_TABS.CONTRACTS}'!A${sheetCRowNum}:AC${sheetCRowNum}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [fullContractRow] },
            });
            cRows[matchedCRow] = fullContractRow;
          } else if (mp.isSelected !== false) {
            newContractRowsToAppend.push([codeRef, titleRef, ...colsCtoAC]);
          }
        }

        if (newContractRowsToAppend.length > 0) {
          const startCRow = Math.max(cRows.length + 1, 2);
          const endCRow = startCRow + newContractRowsToAppend.length - 1;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${SHEET_TABS.CONTRACTS}'!A${startCRow}:AC${endCRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: newContractRowsToAppend },
          });
        }
      }
    } catch (cSyncErr) {
      console.warn('Could not sync project updates to Contracts tab:', cSyncErr);
    }
  }

  // --------------------------------------------------------------------------
  // 2. [คลังกลาง] บุคลากร
  // --------------------------------------------------------------------------
  if (!incremental || masterTeam.length > 0) {
    const teamHeaders = masterTabsConfig[1].headers;
    let existingTeamRows: any[][] = [];
    try {
      const getExistTeam = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${MASTER_SHEET_TABS.TEAM}'`,
        valueRenderOption: 'FORMULA',
      });
      existingTeamRows = getExistTeam.data.values || [];
      while (
        existingTeamRows.length > 1 &&
        !String(existingTeamRows[existingTeamRows.length - 1]?.[0] || '').trim() &&
        !String(existingTeamRows[existingTeamRows.length - 1]?.[2] || '').trim()
      ) {
        existingTeamRows.pop();
      }
    } catch (readTeamErr) {
      if (incremental) {
        throw readTeamErr;
      }
      existingTeamRows = [];
    }

    const buildTeamRow = (tm: any, k: number, existingRow?: any[]) => {
      const tRef = tm.id || tm.memberCode || tm.name;
      const photoInfo = uploadedTeamPhotos[tRef];
      const existingPhotoId =
        extractDriveFileIdFromUrl(tm.photoUrl) ||
        (existingRow ? extractDriveFileIdFromUrl(existingRow[11]) || extractDriveFileIdFromUrl(existingRow[12]) : '');
      const photoFileId = photoInfo?.fileId || existingPhotoId;
      const photoLink =
        photoInfo?.photoUrl ||
        (photoFileId ? `https://drive.google.com/file/d/${photoFileId}/view?usp=drivesdk` : (tm.photoUrl?.startsWith('http') ? tm.photoUrl : null));
      const photoFormula = photoLink ? `=HYPERLINK("${photoLink}", "เปิดดูรูปถ่าย (Drive)")` : (existingRow?.[11] || '-');
      const photoThumbFormula = photoFileId
        ? `=IMAGE("https://drive.google.com/thumbnail?id=${photoFileId}&sz=w400")`
        : (existingRow?.[12] || '-');

      const bioImgInfo = masterData.uploadedTeamBioImages?.[tRef];
      const bioBlocks = tm.bioImageBlocks || tm.imageBlocks || [];
      const bioIds: string[] = [];
      if (bioImgInfo?.mainFileId) bioIds.push(bioImgInfo.mainFileId);
      if (Array.isArray(bioBlocks)) {
        for (const b of bioBlocks) {
          if (!b) continue;
          if (b.type === 'single') {
            const id = extractDriveFileIdFromUrl(b.url);
            if (id && !bioIds.includes(id)) bioIds.push(id);
          } else if (b.type === 'pair' || b.type === 'double') {
            const idL = extractDriveFileIdFromUrl(b.leftUrl || b.urlLeft);
            const idR = extractDriveFileIdFromUrl(b.rightUrl || b.urlRight);
            if (idL && !bioIds.includes(idL)) bioIds.push(idL);
            if (idR && !bioIds.includes(idR)) bioIds.push(idR);
          }
        }
      }
      const mainBioFileId = bioIds[0] || (existingRow ? extractDriveFileIdFromUrl(existingRow[13]) || extractDriveFileIdFromUrl(existingRow[15]) : '');
      const bioImgLink =
        bioImgInfo?.mainUrl ||
        (mainBioFileId ? `https://drive.google.com/file/d/${mainBioFileId}/view?usp=drivesdk` : null);
      const bioImgFormula = bioImgLink ? `=HYPERLINK("${bioImgLink}", "เปิดดูภาพประกอบประวัติย่อ (Drive)")` : (existingRow?.[13] || '-');
      const totalBioCount = bioIds.length > 0 ? bioIds.length : (bioImgInfo?.count || 0);
      const bioImgCountStr = totalBioCount > 0 ? `มีภาพประกอบ ${totalBioCount} ภาพ` : (existingRow?.[14] || '-');
      const bioImgThumbFormula = mainBioFileId
        ? `=IMAGE("https://drive.google.com/thumbnail?id=${mainBioFileId}&sz=w400")`
        : (existingRow?.[15] || '-');

      return [
        tm.memberCode || tm.id || (existingRow ? existingRow[0] : `EMP-${k + 1}`),
        Number(tm.recordedYearBE || (existingRow ? existingRow[1] : 2568)),
        tm.name || (existingRow ? existingRow[2] : '-'),
        tm.proposedRole || (existingRow ? existingRow[3] : '-'),
        tm.education || (existingRow ? existingRow[4] : '-'),
        Number(tm.experienceYears ?? (existingRow ? existingRow[5] : 0)),
        Number(tm.startWorkYearBE || (existingRow ? existingRow[6] : 2560)),
        tm.responsibilities || (existingRow ? existingRow[7] : '-'),
        tm.highlightProjects || (existingRow ? existingRow[8] : '-'),
        tm.personalBio || (existingRow ? existingRow[9] : '-'),
        tm.certifications || (existingRow ? existingRow[10] : '-'),
        photoFormula,
        photoThumbFormula,
        bioImgFormula,
        bioImgCountStr,
        bioImgThumbFormula,
        nowThai,
      ];
    };

    const builtTeamRowsByIndex: Record<number, any[]> = {};

    if (incremental) {
      if (existingTeamRows.length === 0) {
        existingTeamRows = [teamHeaders];
      }
      const teamToAppend: any[][] = [];
      for (let k = 0; k < masterTeam.length; k++) {
        const tm = masterTeam[k];
        const tCode = normStr(tm.memberCode);
        const tName = normStr(tm.name);
        let matchedIdx = -1;
        for (let r = 1; r < existingTeamRows.length; r++) {
          if ((tCode && normStr(existingTeamRows[r]?.[0]) === tCode) || (tName && normStr(existingTeamRows[r]?.[2]) === tName)) {
            matchedIdx = r;
            break;
          }
        }
        if (matchedIdx >= 1) {
          const sheetRowNum = matchedIdx + 1;
          const updatedTRow = buildTeamRow(tm, matchedIdx - 1, existingTeamRows[matchedIdx]);
          builtTeamRowsByIndex[k] = updatedTRow;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${MASTER_SHEET_TABS.TEAM}'!A${sheetRowNum}:Q${sheetRowNum}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [updatedTRow] },
          });
          existingTeamRows[matchedIdx] = updatedTRow;
        } else {
          const built = buildTeamRow(tm, existingTeamRows.length - 1 + teamToAppend.length);
          builtTeamRowsByIndex[k] = built;
          teamToAppend.push(built);
        }
      }
      if (teamToAppend.length > 0) {
        const startTRow = Math.max(existingTeamRows.length + 1, 2);
        const endTRow = startTRow + teamToAppend.length - 1;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${MASTER_SHEET_TABS.TEAM}'!A${startTRow}:Q${endTRow}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: teamToAppend },
        });
      }
    } else if (!incremental) {
      const teamRows: any[][] = [teamHeaders];
      const matchedTeamIndices = new Set<number>();
      for (let k = 0; k < masterTeam.length; k++) {
        const tm = masterTeam[k];
        const tCode = normStr(tm.memberCode);
        const tName = normStr(tm.name);
        let existingRow: any[] | undefined;
        for (let r = 1; r < existingTeamRows.length; r++) {
          if (matchedTeamIndices.has(r)) continue;
          if ((tCode && normStr(existingTeamRows[r]?.[0]) === tCode) || (tName && normStr(existingTeamRows[r]?.[2]) === tName)) {
            existingRow = existingTeamRows[r];
            matchedTeamIndices.add(r);
            break;
          }
        }
        const built = buildTeamRow(tm, k, existingRow);
        builtTeamRowsByIndex[k] = built;
        teamRows.push(built);
      }

      for (let r = 1; r < existingTeamRows.length; r++) {
        if (!matchedTeamIndices.has(r) && (existingTeamRows[r]?.[0] || existingTeamRows[r]?.[2])) {
          teamRows.push(existingTeamRows[r]);
        }
      }

      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `'${MASTER_SHEET_TABS.TEAM}'!A:Q`,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${MASTER_SHEET_TABS.TEAM}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: teamRows },
      });
    }

    // ซิงค์อัปเดตและเพิ่มบุคลากรเข้าสู่แท็บ "บุคลากรหลัก (Team)" ให้ครบทั้ง 14 คอลัมน์ (A..N)
    try {
      const teamTabRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${SHEET_TABS.TEAM}'`,
        valueRenderOption: 'FORMULA',
      });
      const tRows = teamTabRes.data.values || [];
      while (
        tRows.length > 1 &&
        !String(tRows[tRows.length - 1]?.[0] || '').trim() &&
        !String(tRows[tRows.length - 1]?.[2] || '').trim()
      ) {
        tRows.pop();
      }

      if (tRows.length >= 1) {
        const { codeRef, titleRef } = await resolveDefaultOverviewFormulaRefs(tRows);
        const newTeamTabRowsToAppend: any[][] = [];

        for (let k = 0; k < masterTeam.length; k++) {
          const tm = masterTeam[k];
          const tName = normStr(tm.name);
          const masterTRow = builtTeamRowsByIndex[k] || buildTeamRow(tm, k);
          // แปลง 17 คอลัมน์ของ [คลังกลาง] บุคลากร เป็นคอลัมน์ C..N (12 คอลัมน์) ของแท็บ บุคลากรหลัก (Team)
          const colsCtoN = [
            masterTRow[2], // C: ชื่อ-นามสกุล บุคลากร
            masterTRow[3], // D: ตำแหน่งที่เสนอในโครงการ
            masterTRow[4], // E: วุฒิการศึกษา
            masterTRow[5], // F: ประสบการณ์ทำงาน (ปี)
            masterTRow[7], // G: ขอบเขตหน้าที่รับผิดชอบ
            masterTRow[9], // H: ประวัติย่อและความเชี่ยวชาญ
            masterTRow[10], // I: ใบรับรองวิชาชีพ (Certifications)
            masterTRow[11], // J: รูปถ่ายบุคลากร (Google Drive)
            masterTRow[12], // K: ตัวอย่างรูปถ่าย
            masterTRow[13], // L: ภาพประกอบประวัติย่อ (Google Drive)
            masterTRow[14], // M: จำนวนภาพประกอบประวัติย่อ
            masterTRow[15], // N: ตัวอย่างภาพประกอบประวัติย่อ
          ];

          let matchedTRow = -1;
          for (let tr = 1; tr < tRows.length; tr++) {
            const trName = normStr(tRows[tr]?.[2]);
            if (tName && trName === tName) {
              matchedTRow = tr;
              break;
            }
          }

          if (matchedTRow >= 1) {
            const sheetTRowNum = matchedTRow + 1;
            const existCodeFormula = String(tRows[matchedTRow]?.[0] || '').trim() || codeRef;
            const existTitleFormula = String(tRows[matchedTRow]?.[1] || '').trim() || titleRef;
            const fullTeamRow = [existCodeFormula, existTitleFormula, ...colsCtoN];
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `'${SHEET_TABS.TEAM}'!A${sheetTRowNum}:N${sheetTRowNum}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [fullTeamRow] },
            });
            tRows[matchedTRow] = fullTeamRow;
          } else {
            newTeamTabRowsToAppend.push([codeRef, titleRef, ...colsCtoN]);
          }
        }

        if (newTeamTabRowsToAppend.length > 0) {
          const startTRow = Math.max(tRows.length + 1, 2);
          const endTRow = startTRow + newTeamTabRowsToAppend.length - 1;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${SHEET_TABS.TEAM}'!A${startTRow}:N${endTRow}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: newTeamTabRowsToAppend },
          });
        }
      }
    } catch (tSyncErr) {
      console.warn('Could not sync team updates to Team tab:', tSyncErr);
    }
  }

  // --------------------------------------------------------------------------
  // 3. [คลังกลาง] แคตตาล็อก BOM (ข้ามในโหมด incremental หากไม่ได้ส่งมา)
  // --------------------------------------------------------------------------
  if (!incremental || masterBom.length > 0) {
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
  }

  // --------------------------------------------------------------------------
  // 4. [คลังกลาง] ข้อมูลบริษัท (ข้ามในโหมด incremental หากไม่ได้ส่งมา)
  // --------------------------------------------------------------------------
  if (!incremental && masterCompany && Object.keys(masterCompany).length > 0) {
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
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}

/**
 * ดึงข้อมูลคลังกลาง (ผลงานและสัญญา, บุคลากร) จาก Google Sheet ผ่าน Google Sheets API
 * พร้อมถอดรหัสภาพประกอบทั้ง 33 คอลัมน์ (A2:AG) กลับมาเป็น imageBlocks อย่างครบถ้วน
 */
export async function getMasterLibraryFromGoogleSheet(
  sheets: SheetsClient,
  spreadsheetId: string
): Promise<{
  projects: any[];
  team: any[];
}> {
  const projects: any[] = [];
  const team: any[] = [];

  try {
    const projRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${MASTER_SHEET_TABS.PROJECTS}'!A2:AG`,
      valueRenderOption: 'FORMULA',
    });

    const pRows = projRes.data.values || [];
    for (let i = 0; i < pRows.length; i++) {
      const row = pRows[i];
      const code = String(row[0] || '').trim();
      const cYear = Number(row[1]) || 2567;
      const name = String(row[2] || '').trim();
      if (!name && !code) continue;

      const certUrl = extractUrlFromCell(row[12]);
      const id = 'lib-proj-' + (code ? code.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : `row-${i + 1}`);

      const driveFileIds = extractAllDriveFileIdsFromSheetRow(row, 17, 18, 13, 15);
      const { imageBlocks, projectImageUrl, clientLogoUrl } = reconstructImageBlocksFromDriveIds(
        code,
        name,
        id,
        driveFileIds
      );
      const fallbackImgUrl = projectImageUrl || extractUrlFromCell(row[13]) || extractUrlFromCell(row[15]);

      projects.push({
        id,
        originalMasterId: id,
        projectCode: code || `${cYear}-PRJ-${String(i + 1).padStart(3, '0')}`,
        contractYearBE: cYear,
        projectName: name,
        clientName: String(row[3] || '').trim(),
        clientLogoUrl,
        contractValue: Number(row[4]) || 0,
        completionYearBE: Number(row[5]) || cYear,
        periodDuration: String(row[6] || '').trim(),
        category: String(row[7] || '').trim(),
        projectType: String(row[8] || '').includes('ตรง TOR') ? 'tor_reference' : 'supplementary',
        description: String(row[9] || '').trim(),
        relevanceNote: String(row[10] || '').trim(),
        certificateFileName: String(row[11] || '').trim(),
        certificateFileUrl: certUrl || undefined,
        projectImageUrl: fallbackImgUrl || undefined,
        isSelected: true,
        imageBlocks,
      });
    }
  } catch (err) {
    console.warn('Could not read projects from master sheet:', err);
  }

  try {
    const teamRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${MASTER_SHEET_TABS.TEAM}'!A1:Q`,
      valueRenderOption: 'FORMULA',
    });

    const allRows = teamRes.data.values || [];
    const tHeaders = allRows[0] || [];
    let bioIdx = -1;
    let certIdx = -1;
    let photoIdx = -1;
    let bioImgIdx = -1;
    for (let h = 0; h < tHeaders.length; h++) {
      const hText = String(tHeaders[h] || '');
      if (hText.includes('ประวัติย่อ') && !hText.includes('ภาพประกอบ')) bioIdx = h;
      else if (hText.includes('ใบรับรอง') || hText.includes('Certification')) certIdx = h;
      else if (hText.includes('ลิงก์รูปถ่าย')) photoIdx = h;
      else if (hText.includes('ภาพประกอบประวัติย่อ')) bioImgIdx = h;
    }
    if (bioIdx === -1 && tHeaders.length >= 17) { bioIdx = 9; certIdx = 10; photoIdx = 11; bioImgIdx = 13; }
    else if (bioIdx === -1 && tHeaders.length >= 14) { bioIdx = 9; certIdx = 10; photoIdx = 11; }
    else if (bioIdx === -1 && tHeaders.length < 14) { bioIdx = -1; certIdx = 9; photoIdx = 10; }

    const tRows = allRows.slice(1);
    for (let j = 0; j < tRows.length; j++) {
      const tRow = tRows[j];
      const mCode = String(tRow[0] || '').trim();
      const recYear = Number(tRow[1]) || 2568;
      const tName = String(tRow[2] || '').trim();
      if (!tName && !mCode) continue;

      const pBio = bioIdx >= 0 ? String(tRow[bioIdx] || '').trim() : '';
      const cCert = certIdx >= 0 ? String(tRow[certIdx] || '').trim() : '';
      const pIdx = photoIdx >= 0 ? photoIdx : 11;
      const photoUrl = extractUrlFromCell(tRow[pIdx]) || extractUrlFromCell(tRow[pIdx + 1]);

      const bioImgUrl = bioImgIdx >= 0 ? (extractUrlFromCell(tRow[bioImgIdx]) || extractUrlFromCell(tRow[bioImgIdx + 2])) : '';
      const bioBlocks = bioImgUrl ? [{
        id: `bio-img-${j + 1}`,
        type: 'single' as const,
        url: bioImgUrl,
        caption: 'ภาพประกอบประวัติย่อ/ความเชี่ยวชาญ',
      }] : [];

      const mId = 'lib-team-' + (mCode ? mCode.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : `row-${j + 1}`);

      team.push({
        id: mId,
        originalMasterId: mId,
        memberCode: mCode || `${recYear}-EMP-${String(j + 1).padStart(3, '0')}`,
        recordedYearBE: recYear,
        name: tName,
        proposedRole: String(tRow[3] || '').trim(),
        education: String(tRow[4] || '').trim(),
        experienceYears: Number(tRow[5]) || 0,
        startWorkYearBE: Number(tRow[6]) || (recYear - 5),
        responsibilities: String(tRow[7] || '').trim(),
        highlightProjects: String(tRow[8] || '').trim(),
        personalBio: pBio || undefined,
        certifications: cCert || undefined,
        photoUrl: photoUrl || undefined,
        bioImageBlocks: bioBlocks,
      });
    }
  } catch (err) {
    console.warn('Could not read team from master sheet:', err);
  }

  return { projects, team };
}

/**
 * ดึงข้อมูลล่าสุดของโครงการที่เสนอ (Overview + Contracts + Milestones + Team) จาก Google Sheet
 * เพื่อให้เครื่อง Local สามารถดึงข้อมูลล่าสุดจาก Drive & Sheet มาแก้ไขต่อได้ทันที
 */
export async function getProposalFromGoogleSheet(
  sheets: SheetsClient,
  spreadsheetId: string,
  projectCode: string,
  projectTitle?: string
): Promise<{
  overview?: any;
  pastProjects: any[];
  milestones: any[];
  teamMembers: any[];
  masterProjects: any[];
}> {
  const norm = (s?: any) => String(s || '').trim().toLowerCase();
  const targetCode = norm(projectCode);
  const targetTitle = norm(projectTitle);

  let overview: any = undefined;
  const pastProjects: any[] = [];
  const milestones: any[] = [];
  const teamMembers: any[] = [];

  // ดึงคลังกลางมาเป็นฐานข้อมูลรายละเอียดและบล็อกภาพด้วย
  const masterLib = await getMasterLibraryFromGoogleSheet(sheets, spreadsheetId);
  const masterMapByCode = new Map<string, any>();
  const masterMapByName = new Map<string, any>();
  for (const mp of masterLib.projects) {
    if (mp.projectCode) masterMapByCode.set(norm(mp.projectCode), mp);
    if (mp.projectName) masterMapByName.set(norm(mp.projectName), mp);
  }

  // 1. อ่านแท็บ ภาพรวมโครงการ (Overview)
  try {
    const ovDispRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_TABS.OVERVIEW}'!A2:M`,
    });
    const ovFormulaRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_TABS.OVERVIEW}'!A2:M`,
      valueRenderOption: 'FORMULA',
    });
    const dispRows = ovDispRes.data.values || [];
    const formRows = ovFormulaRes.data.values || [];
    for (let i = 0; i < dispRows.length; i++) {
      const rCode = norm(dispRows[i]?.[0]);
      const rTitle = norm(dispRows[i]?.[1]);
      if ((targetCode && rCode === targetCode) || (targetTitle && rTitle === targetTitle)) {
        overview = {
          projectCode: String(dispRows[i]?.[0] || '').trim(),
          projectTitle: String(dispRows[i]?.[1] || '').trim(),
          clientAgency: String(dispRows[i]?.[2] || '').trim(),
          budgetAmount: Number(String(dispRows[i]?.[3] || '0').replace(/,/g, '')) || 0,
          announcementDate: String(dispRows[i]?.[4] || '').trim(),
          submissionDeadline: String(dispRows[i]?.[5] || '').trim(),
          status: String(dispRows[i]?.[6] || 'draft').trim(),
          assignedTo: String(dispRows[i]?.[7] || '').trim(),
          progressPercent: Number(dispRows[i]?.[8]) || 0,
          driveFolderUrl: extractUrlFromCell(formRows[i]?.[9]),
          docxUrl: extractUrlFromCell(formRows[i]?.[10]),
          torUrl: extractUrlFromCell(formRows[i]?.[11]),
          lastSyncedAt: String(dispRows[i]?.[12] || '').trim(),
        };
        break;
      }
    }
  } catch (err) {
    console.warn('Could not read Overview tab:', err);
  }

  // 2. อ่านแท็บ ผลงานอ้างอิงและสัญญา (Contracts)
  try {
    const cDispRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_TABS.CONTRACTS}'!A2:B`,
    });
    const cFormRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${SHEET_TABS.CONTRACTS}'!A2:AC`,
      valueRenderOption: 'FORMULA',
    });
    const cDispRows = cDispRes.data.values || [];
    const cFormRows = cFormRes.data.values || [];

    for (let i = 0; i < cFormRows.length; i++) {
      const row = cFormRows[i];
      const pCodeInRow = norm(cDispRows[i]?.[0] || row?.[0]);
      const pTitleInRow = norm(cDispRows[i]?.[1] || row?.[1]);
      const isMatch =
        (targetCode && pCodeInRow === targetCode) ||
        (targetTitle && pTitleInRow === targetTitle) ||
        (overview?.projectCode && pCodeInRow === norm(overview.projectCode));
      if (!isMatch) continue;

      const refCode = String(row[2] || '').trim();
      const refName = String(row[3] || '').trim();
      if (!refCode && !refName) continue;

      const matchedMaster =
        (refCode ? masterMapByCode.get(norm(refCode)) : undefined) ||
        (refName ? masterMapByName.get(norm(refName)) : undefined);

      const certUrl = extractUrlFromCell(row[9]) || matchedMaster?.certificateFileUrl;
      const driveFileIds = extractAllDriveFileIdsFromSheetRow(row, 13, 14, 10, 12);
      const id = matchedMaster?.id || ('proj-sheet-' + (refCode ? refCode.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : `row-${i + 1}`));
      const { imageBlocks, projectImageUrl, clientLogoUrl } = reconstructImageBlocksFromDriveIds(
        refCode,
        refName,
        id,
        driveFileIds
      );

      pastProjects.push({
        ...(matchedMaster || {}),
        id,
        projectCode: refCode,
        projectName: refName,
        clientName: String(row[4] || matchedMaster?.clientName || '').trim(),
        clientLogoUrl: clientLogoUrl || matchedMaster?.clientLogoUrl,
        contractYearBE: Number(row[5]) || matchedMaster?.contractYearBE || 2567,
        completionYearBE: matchedMaster?.completionYearBE || Number(row[5]) || 2567,
        contractValue: Number(row[6]) || matchedMaster?.contractValue || 0,
        periodDuration: String(row[7] || matchedMaster?.periodDuration || '').trim(),
        certificateFileName: String(row[8] || matchedMaster?.certificateFileName || '').trim(),
        certificateFileUrl: certUrl || undefined,
        projectImageUrl: projectImageUrl || matchedMaster?.projectImageUrl || undefined,
        imageBlocks: imageBlocks.length > 0 ? imageBlocks : (matchedMaster?.imageBlocks || []),
        isSelected: true,
      });
    }
  } catch (err) {
    console.warn('Could not read Contracts tab:', err);
  }

  return {
    overview,
    pastProjects,
    milestones,
    teamMembers,
    masterProjects: masterLib.projects,
  };
}


