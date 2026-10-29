/**
 * ==============================================================================
 * สคริปต์ Google Apps Script สำหรับระบบจัดทำข้อเสนอโครงการ (Prime Proposal Report)
 * ==============================================================================
 * วิธีใช้งาน:
 * 1. เปิด Google Sheet ของคุณ (https://docs.google.com/spreadsheets/d/1fT8DsROkO0xJ9XL0NtkFlgct6G_NzdU8WBtCRlv3NYI/edit)
 * 2. ไปที่เมนู ส่วนขยาย (Extensions) > Apps Script
 * 3. ลบโค้ดเดิมทั้งหมดออก แล้วนำโค้ดในไฟล์นี้ไปวางแทนที่
 * 4. กดปุ่ม "บันทึก" (รูปแผ่นดิสก์)
 * 5. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) มุมขวาบน > เลือก "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภทเป็น "เว็บแอป" (Web app)
 *    - คำอธิบาย: Prime Proposal Sync
 *    - ดำเนินการในฐานะ (Execute as): "ฉัน (อีเมลของคุณ)"
 *    - ผู้มีสิทธิ์เข้าถึง (Who has access): "ทุกคน (Anyone)"
 * 7. กด "ทำให้ใช้งานได้" (Deploy) > กด "ให้สิทธิ์การเข้าถึง" (Authorize access)
 * 8. คัดลอก "URL ของเว็บแอป" (ลงท้ายด้วย /exec) นำไปวางในระบบ Prime Proposal Report
 * ==============================================================================
 */

// รหัสโฟลเดอร์ Google Drive หลัก และรหัส Google Sheet
var DEFAULT_PARENT_FOLDER_ID = "157aWxavvB6eKzjb3iCiRJRyzMO_pbCj9";
var DEFAULT_SPREADSHEET_ID = "1fT8DsROkO0xJ9XL0NtkFlgct6G_NzdU8WBtCRlv3NYI";

function doGet(e) {
  var action = (e && e.parameter) ? e.parameter.action : '';
  if (action === 'get_master_library') {
    var spreadsheetId = (e.parameter && e.parameter.spreadsheetId) || DEFAULT_SPREADSHEET_ID;
    var result = handleGetMasterLibrary(spreadsheetId);
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    message: "Prime Proposal Sync Service is online and ready!"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);

    var parentFolderId = data.parentFolderId || DEFAULT_PARENT_FOLDER_ID;
    var spreadsheetId = data.spreadsheetId || DEFAULT_SPREADSHEET_ID;

    // 1. ตรวจสอบและดึงโฟลเดอร์แม่
    var rootFolder;
    try {
      rootFolder = DriveApp.getFolderById(parentFolderId);
    } catch (fErr) {
      rootFolder = DriveApp.getRootFolder();
    }

    // กรณีขออ่านข้อมูลคลังกลางจาก Google Sheet (Pull / Read)
    if (data.action === 'get_master_library') {
      var readResult = handleGetMasterLibrary(spreadsheetId);
      return ContentService.createTextOutput(JSON.stringify(readResult)).setMimeType(ContentService.MimeType.JSON);
    }

    // กรณีซิงค์คลังข้อมูลกลาง (Master Library)
    if (data.action === 'sync_master_library' || data.masterProjects) {
      var masterResult = handleSyncMasterLibrary(data, rootFolder, spreadsheetId);
      return ContentService.createTextOutput(JSON.stringify(masterResult)).setMimeType(ContentService.MimeType.JSON);
    }

    var project = data.project;
    var docxBase64 = data.docxBase64;
    var docxFileName = data.docxFileName;
    var customFiles = data.files || [];

    if (!project) {
      throw new Error("ไม่พบข้อมูลโครงการ (Missing project data)");
    }

    // 2. โฟลเดอร์ปี พ.ศ.
    var yearBE = 2569;
    if (project.proposalData && project.proposalData.section5 && project.proposalData.section5.pastProjects && project.proposalData.section5.pastProjects[0]) {
      yearBE = project.proposalData.section5.pastProjects[0].contractYearBE || 2569;
    }
    var yearFolder = getOrCreateSubFolder(rootFolder, "ปี " + yearBE);

    // 3. โฟลเดอร์เฉพาะโครงการนี้
    var pCode = project.projectCode || (project.proposalData && project.proposalData.cover ? project.proposalData.cover.projectCode : 'NO-CODE');
    var pTitle = project.projectTitle || (project.proposalData && project.proposalData.cover ? project.proposalData.cover.projectTitle : 'โครงการใหม่');
    var cleanTitle = pTitle.replace(/[\/\\?%*:|"<>]/g, '_').trim().substring(0, 60);
    var projectFolder = getOrCreateSubFolder(yearFolder, "[" + pCode + "] " + cleanTitle);

    // 4. สร้างโฟลเดอร์ย่อย 4 หมวด
    var torFolder = getOrCreateSubFolder(projectFolder, "01_TOR_และประกาศจัดจ้าง");
    var contractsFolder = getOrCreateSubFolder(projectFolder, "02_สำเนาสัญญาและหนังสือรับรองผลงาน");
    var outputsFolder = getOrCreateSubFolder(projectFolder, "03_เล่มข้อเสนอโครงการ");
    var otherFolder = getOrCreateSubFolder(projectFolder, "04_เอกสารอื่นๆ");

    var uploadedFiles = [];

    // 5. อัปโหลดไฟล์แนบ TOR / ประกาศจัดจ้าง
    var attachments = project.attachments || [];
    for (var i = 0; i < attachments.length; i++) {
      var att = attachments[i];
      if (att && att.dataUrl) {
        var targetF = (att.category === 'announcement' || att.category === 'tor') ? torFolder : otherFolder;
        var up = uploadBase64File(targetF, att.name, att.dataUrl, att.category || 'tor');
        if (up) uploadedFiles.push(up);
      }
    }

    // 6. อัปโหลดสำเนาสัญญา / ใบรับรองผลงาน (Section 5)
    var pastProjects = (project.proposalData && project.proposalData.section5 && project.proposalData.section5.pastProjects) ? project.proposalData.section5.pastProjects : [];
    for (var j = 0; j < pastProjects.length; j++) {
      var p = pastProjects[j];
      if (p && p.certificateFileUrl) {
        var isPdf = p.certificateFileUrl.indexOf('data:application/pdf') === 0 || (p.certificateFileName || '').toLowerCase().indexOf('.pdf') !== -1;
        var ext = isPdf ? '.pdf' : '.png';
        var cName = p.certificateFileName || ('สัญญา_' + (p.projectCode || p.projectName || 'project').replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30) + ext);
        var upCert = uploadBase64File(contractsFolder, cName, p.certificateFileUrl, 'contract_cert');
        if (upCert) uploadedFiles.push(upCert);
      }
    }

    // 7. อัปโหลด Custom Files อื่นๆ
    for (var k = 0; k < customFiles.length; k++) {
      var cf = customFiles[k];
      if (cf && cf.base64) {
        var fTarget = (cf.category === 'contract_cert') ? contractsFolder : (cf.category === 'tor' ? torFolder : otherFolder);
        var upCf = uploadBase64File(fTarget, cf.name, cf.base64, cf.category || 'other');
        if (upCf) uploadedFiles.push(upCf);
      }
    }

    // 8. อัปโหลดไฟล์เล่มข้อเสนอโครงการ Word (.docx)
    if (docxBase64) {
      var dName = docxFileName || ('ข้อเสนอโครงการ_' + cleanTitle.substring(0, 40) + '_' + pCode + '.docx');
      var upDocx = uploadBase64File(outputsFolder, dName, docxBase64, 'docx_output');
      if (upDocx) uploadedFiles.push(upDocx);
    }

    // 9. บันทึกข้อมูลลงใน Google Sheet
    var sheetUrl = syncToSheets(spreadsheetId, project, projectFolder, uploadedFiles);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "ซิงค์ข้อมูลและอัปโหลดไฟล์ขึ้น Google Drive & Sheets สำเร็จเรียบร้อย 100%",
      driveFolderUrl: projectFolder.getUrl(),
      sheetUrl: sheetUrl,
      folderStructure: {
        rootUrl: projectFolder.getUrl(),
        torFolderUrl: torFolder.getUrl(),
        contractsFolderUrl: contractsFolder.getUrl(),
        outputsFolderUrl: outputsFolder.getUrl()
      },
      uploadedFilesCount: uploadedFiles.length,
      uploadedFiles: uploadedFiles
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ฟังก์ชันสร้างหรือดึงโฟลเดอร์ย่อย
 */
function getOrCreateSubFolder(parent, name) {
  var folders = parent.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parent.createFolder(name);
}

/**
 * ฟังก์ชันอัปโหลดไฟล์จาก Base64 ลงในโฟลเดอร์ Drive
 */
function uploadBase64File(folder, fileName, base64Data, category) {
  try {
    var pureBase64 = base64Data;
    var mimeType = "application/octet-stream";
    if (base64Data.indexOf('data:') === 0 && base64Data.indexOf(';base64,') !== -1) {
      var parts = base64Data.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      pureBase64 = parts[1];
    }

    var decoded = Utilities.base64Decode(pureBase64);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);

    // ตรวจสอบว่ามีไฟล์เดิมชื่อซ้ำหรือไม่
    var existing = folder.getFilesByName(fileName);
    var file;
    if (existing.hasNext()) {
      var oldFile = existing.next();
      oldFile.setTrashed(true);
    }
    file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      name: fileName,
      category: category,
      webViewLink: file.getUrl()
    };
  } catch (e) {
    return null;
  }
}

/**
 * บันทึกข้อมูลทั้ง 5 แท็บลงใน Google Sheet
 */
function syncToSheets(spreadsheetId, project, projectFolder, uploadedFiles) {
  var ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  var TAB_OVERVIEW = "ภาพรวมโครงการ (Overview)";
  var TAB_MILESTONES = "งวดงานและการส่งมอบ (Milestones)";
  var TAB_BOM = "ถอดแบบงบประมาณ (BOM)";
  var TAB_CONTRACTS = "ผลงานอ้างอิงและสัญญา (Contracts)";
  var TAB_TEAM = "บุคลากรหลัก (Team)";

  var pData = project.proposalData || {};
  var cover = pData.cover || {};
  var projectCode = project.projectCode || cover.projectCode || "NO-CODE";
  var projectTitle = project.projectTitle || cover.projectTitle || "ไม่มีชื่อโครงการ";

  // ค้นหาลิงก์ไฟล์
  var docxFile = null;
  var torFile = null;
  for (var i = 0; i < uploadedFiles.length; i++) {
    if (uploadedFiles[i].category === 'docx_output' || uploadedFiles[i].name.indexOf('.docx') !== -1) {
      docxFile = uploadedFiles[i];
    }
    if (uploadedFiles[i].category === 'tor' || uploadedFiles[i].category === 'announcement') {
      torFile = uploadedFiles[i];
    }
  }

  var docxFormula = docxFile ? '=HYPERLINK("' + docxFile.webViewLink + '", "เปิดไฟล์เล่ม Word")' : "-";
  var torFormula = torFile ? '=HYPERLINK("' + torFile.webViewLink + '", "' + torFile.name + '")' : "-";
  var driveFormula = '=HYPERLINK("' + projectFolder.getUrl() + '", "เปิดโฟลเดอร์ Drive")';
  var nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");

  // 1. TAB OVERVIEW
  var shOverview = getOrCreateSheet(ss, TAB_OVERVIEW, [
    "รหัสโครงการ", "ชื่อโครงการข้อเสนอ", "หน่วยงานผู้ว่าจ้าง", "วงเงินงบประมาณ (บาท)",
    "วันที่ประกาศจัดจ้าง", "กำหนดยื่นข้อเสนอ", "สถานะโครงการ", "ผู้รับผิดชอบหลัก",
    "ความคืบหน้า (%)", "โฟลเดอร์ Google Drive", "เล่มข้อเสนอ Word (.docx)", "เอกสาร TOR ประกาศจัดจ้าง", "วันที่ซิงค์ล่าสุด"
  ]);

  var dataRows = shOverview.getDataRange().getValues();
  var targetRow = -1;
  for (var r = 1; r < dataRows.length; r++) {
    if (dataRows[r][0] == projectCode) {
      targetRow = r + 1;
      break;
    }
  }

  var overviewRow = [
    projectCode, projectTitle, project.clientAgency || cover.clientAgency || "-",
    Number(project.budgetAmount || 0), project.announcementDate || "-",
    project.submissionDeadline ? project.submissionDeadline.replace("T", " ") : "-",
    project.status || "draft", project.assignedTo || "-",
    project.progressPercent || 0, driveFormula, docxFormula, torFormula, nowStr
  ];

  if (targetRow > 0) {
    shOverview.getRange(targetRow, 1, 1, overviewRow.length).setValues([overviewRow]);
  } else {
    shOverview.appendRow(overviewRow);
  }

  // 2. TAB MILESTONES
  var milestones = (pData.section2 && pData.section2.milestones) ? pData.section2.milestones : [];
  if (milestones.length > 0) {
    var shMilestones = getOrCreateSheet(ss, TAB_MILESTONES, [
      "รหัสโครงการ", "ชื่อโครงการ", "งวดที่", "รายละเอียดงวดงาน", "สัดส่วน (%)", "วงเงินงวดงาน (บาท)", "กำหนดเวลาส่งมอบ", "รายการเอกสารสิ่งส่งมอบ"
    ]);
    for (var m = 0; m < milestones.length; m++) {
      var item = milestones[m];
      var deliv = Array.isArray(item.deliverables) ? item.deliverables.join("\n- ") : (item.deliverables || "");
      shMilestones.appendRow([
        projectCode, projectTitle, "งวดที่ " + item.installment, item.title || "",
        Number(item.percentage || 0), Number(item.amount || 0), item.timeframe || "", deliv
      ]);
    }
  }

  // 3. TAB BOM
  var bomItems = (pData.section2 && pData.section2.bomItems) ? pData.section2.bomItems : [];
  if (bomItems.length > 0) {
    var shBom = getOrCreateSheet(ss, TAB_BOM, [
      "รหัสโครงการ", "ชื่อโครงการ", "หมวดหมู่ค่าใช้จ่าย", "รายการงาน/อุปกรณ์", "ตำแหน่ง/ผู้รับผิดชอบ", "จำนวน", "หน่วยนับ", "ราคาต่อหน่วย (บาท)", "ราคารวม (บาท)"
    ]);
    for (var b = 0; b < bomItems.length; b++) {
      var bom = bomItems[b];
      shBom.appendRow([
        projectCode, projectTitle, bom.category || "ทั่วไป", bom.title || "",
        bom.responsibleRole || "", Number(bom.quantity || 1), bom.unit || "ชุด",
        Number(bom.unitPrice || 0), Number(bom.totalPrice || 0)
      ]);
    }
  }

  // 4. TAB CONTRACTS
  var pastProjects = (pData.section5 && pData.section5.pastProjects) ? pData.section5.pastProjects : [];
  if (pastProjects.length > 0) {
    var shContracts = getOrCreateSheet(ss, TAB_CONTRACTS, [
      "รหัสโครงการที่เสนอ", "ชื่อโครงการที่เสนอ", "รหัสผลงานอ้างอิง", "ชื่อผลงาน/โครงการเดิม", "หน่วยงานคู่สัญญา", "ปีที่ได้สัญญา (พ.ศ.)", "มูลค่าสัญญา (บาท)", "ระยะเวลาดำเนินการ", "ชื่อไฟล์สำเนาสัญญา/ใบรับรอง", "ลิงก์เปิดดูสัญญา (Google Drive)"
    ]);
    for (var c = 0; c < pastProjects.length; c++) {
      var cp = pastProjects[c];
      var uploadedCert = null;
      for (var u = 0; u < uploadedFiles.length; u++) {
        if (uploadedFiles[u].category === 'contract_cert' && uploadedFiles[u].name.indexOf(cp.projectCode || cp.projectName.substring(0, 15)) !== -1) {
          uploadedCert = uploadedFiles[u];
          break;
        }
      }
      var certFormula = uploadedCert ? '=HYPERLINK("' + uploadedCert.webViewLink + '", "เปิดดูสำเนาสัญญา (Drive)")' : "-";
      shContracts.appendRow([
        projectCode, projectTitle, cp.projectCode || "-", cp.projectName || "",
        cp.clientName || "", cp.contractYearBE || cp.completionYearBE || "",
        Number(cp.contractValue || 0), cp.periodDuration || "",
        cp.certificateFileName || (uploadedCert ? uploadedCert.name : "ไม่มีไฟล์แนบ"),
        certFormula
      ]);
    }
  }

  // 5. TAB TEAM
  var teamMembers = (pData.section4 && pData.section4.teamMembers) ? pData.section4.teamMembers : [];
  if (teamMembers.length > 0) {
    var shTeam = getOrCreateSheet(ss, TAB_TEAM, [
      "รหัสโครงการ", "ชื่อโครงการ", "ชื่อ-นามสกุล บุคลากร", "ตำแหน่งที่เสนอในโครงการ", "วุฒิการศึกษา", "ประสบการณ์ทำงาน (ปี)", "ภาระหน้าที่รับผิดชอบ", "ใบรับรอง/Certifications"
    ]);
    for (var t = 0; t < teamMembers.length; t++) {
      var tm = teamMembers[t];
      shTeam.appendRow([
        projectCode, projectTitle, tm.name || "", tm.proposedRole || "",
        tm.education || "", Number(tm.experienceYears || 0), tm.responsibilities || "", tm.certifications || ""
      ]);
    }
  }

  return ss.getUrl();
}

function getOrCreateSheet(ss, tabName, headers) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.setFrozenRows(1);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#F1F5F9");
  }
  return sheet;
}

/**
 * บันทึกคลังข้อมูลกลาง (Master Library) ทั้งหมดลงใน Google Sheet และ Google Drive
 */
function handleSyncMasterLibrary(data, rootFolder, spreadsheetId) {
  var masterProjects = data.masterProjects || [];
  var masterTeam = data.masterTeam || [];
  var masterBom = data.masterBom || [];
  var masterCompany = data.masterCompany || {};

  var ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  // 1. โฟลเดอร์คลังข้อมูลกลางใน Google Drive
  var masterFolder = getOrCreateSubFolder(rootFolder, "00_คลังข้อมูลกลาง_Master_Library");
  var certsFolder = getOrCreateSubFolder(masterFolder, "01_สำเนาสัญญาและใบรับรองผลงานกลาง");

  // 2. อัปโหลดสำเนาสัญญา/ใบรับรองผลงานของ Master Projects (ถ้ามี)
  var uploadedCerts = {};
  for (var i = 0; i < masterProjects.length; i++) {
    var p = masterProjects[i];
    if (p && p.certificateFileUrl && p.certificateFileUrl.indexOf('data:') === 0) {
      var isPdf = p.certificateFileUrl.indexOf('data:application/pdf') === 0 || (p.certificateFileName || '').toLowerCase().indexOf('.pdf') !== -1;
      var ext = isPdf ? '.pdf' : '.png';
      var pCode = p.projectCode || ('PRJ-' + (i + 1));
      var cName = p.certificateFileName || ('สัญญา_' + pCode + '_' + (p.projectName || 'project').replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30) + ext);
      var up = uploadBase64File(certsFolder, cName, p.certificateFileUrl, 'master_contract_cert');
      if (up) {
        uploadedCerts[p.id || pCode] = up.webViewLink;
      }
    }
  }

  var nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");

  // 3. แท็บ [คลังกลาง] ผลงานและสัญญา
  var TAB_M_PROJECTS = "[คลังกลาง] ผลงานและสัญญา";
  var shProj = getOrCreateSheet(ss, TAB_M_PROJECTS, [
    "รหัสผลงาน", "ปีที่ได้สัญญา (พ.ศ.)", "ชื่อผลงาน/โครงการ", "หน่วยงานผู้ว่าจ้าง",
    "มูลค่าสัญญา (บาท)", "ปีแล้วเสร็จ (พ.ศ.)", "ระยะเวลาสัญญา", "หมวดหมู่งาน",
    "ประเภทงาน", "รายละเอียด/ขอบเขตงาน", "หมายเหตุความสอดคล้อง TOR",
    "ชื่อไฟล์สำเนาสัญญา", "ลิงก์เปิดดูสัญญา (Google Drive)", "วันที่อัปเดตล่าสุด"
  ]);

  if (shProj.getLastRow() > 1) {
    shProj.getRange(2, 1, shProj.getLastRow() - 1, 14).clearContent();
  }

  var projRows = [];
  for (var j = 0; j < masterProjects.length; j++) {
    var mp = masterProjects[j];
    var certLink = uploadedCerts[mp.id || mp.projectCode] || (mp.certificateFileUrl && mp.certificateFileUrl.indexOf('http') === 0 ? mp.certificateFileUrl : null);
    var certFormula = certLink ? '=HYPERLINK("' + certLink + '", "เปิดดูสำเนาสัญญา (Drive)")' : "-";
    projRows.push([
      mp.projectCode || ("PRJ-" + (j + 1)),
      Number(mp.contractYearBE || mp.completionYearBE || 2568),
      mp.projectName || "",
      mp.clientName || "",
      Number(mp.contractValue || 0),
      Number(mp.completionYearBE || mp.contractYearBE || 2568),
      mp.periodDuration || "",
      mp.category || "ทั่วไป",
      mp.projectType === 'supplementary' ? 'ผลงานเสริม (อื่นๆ)' : 'ผลงานตรง TOR',
      mp.description || "",
      mp.relevanceNote || "",
      mp.certificateFileName || (certLink ? "มีไฟล์แนบในไดรฟ์" : "ไม่มีไฟล์แนบ"),
      certFormula,
      nowStr
    ]);
  }
  if (projRows.length > 0) {
    shProj.getRange(2, 1, projRows.length, 14).setValues(projRows);
  }

  // 4. แท็บ [คลังกลาง] บุคลากร
  var TAB_M_TEAM = "[คลังกลาง] บุคลากร";
  var shTeam = getOrCreateSheet(ss, TAB_M_TEAM, [
    "รหัสบุคลากร", "ปีที่บันทึก (พ.ศ.)", "ชื่อ-นามสกุล", "ตำแหน่งหลักที่เสนอ",
    "วุฒิการศึกษา", "ประสบการณ์ (ปี)", "ปีเริ่มทำงาน (พ.ศ.)", "หน้าที่ความรับผิดชอบหลัก",
    "ผลงานเด่นที่ผ่านมา", "ใบรับรอง/Certifications", "วันที่อัปเดตล่าสุด"
  ]);

  if (shTeam.getLastRow() > 1) {
    shTeam.getRange(2, 1, shTeam.getLastRow() - 1, 11).clearContent();
  }

  var teamRows = [];
  for (var k = 0; k < masterTeam.length; k++) {
    var tm = masterTeam[k];
    teamRows.push([
      tm.memberCode || tm.id || ("EMP-" + (k + 1)),
      Number(tm.recordedYearBE || 2568),
      tm.name || "",
      tm.proposedRole || "",
      tm.education || "",
      Number(tm.experienceYears || 0),
      Number(tm.startWorkYearBE || 2560),
      tm.responsibilities || "",
      tm.highlightProjects || "",
      tm.certifications || "",
      nowStr
    ]);
  }
  if (teamRows.length > 0) {
    shTeam.getRange(2, 1, teamRows.length, 11).setValues(teamRows);
  }

  // 5. แท็บ [คลังกลาง] แคตตาล็อก BOM
  var TAB_M_BOM = "[คลังกลาง] แคตตาล็อก BOM";
  var shBom = getOrCreateSheet(ss, TAB_M_BOM, [
    "หมวดหมู่งาน", "รายการงาน/อุปกรณ์", "ตำแหน่งผู้รับผิดชอบ", "หน่วยนับ",
    "ราคาต่อหน่วยมาตรฐาน (บาท)", "จำนวนตั้งต้น", "รายละเอียด/ขอบเขตงาน",
    "เอกสารสิ่งส่งมอบ", "สถานะมาตรฐาน", "วันที่อัปเดตล่าสุด"
  ]);

  if (shBom.getLastRow() > 1) {
    shBom.getRange(2, 1, shBom.getLastRow() - 1, 10).clearContent();
  }

  var bomRows = [];
  for (var b = 0; b < masterBom.length; b++) {
    var mb = masterBom[b];
    bomRows.push([
      mb.category || "ทั่วไป",
      mb.title || "",
      mb.responsibleRole || "",
      mb.unit || "ชุด",
      Number(mb.defaultRate || 0),
      Number(mb.defaultQuantity || 1),
      mb.description || "",
      mb.deliverable || "",
      mb.isStandard ? "มาตรฐาน" : "กำหนดเอง",
      nowStr
    ]);
  }
  if (bomRows.length > 0) {
    shBom.getRange(2, 1, bomRows.length, 10).setValues(bomRows);
  }

  // 6. แท็บ [คลังกลาง] ข้อมูลบริษัท
  var TAB_M_COMPANY = "[คลังกลาง] ข้อมูลบริษัท";
  var shComp = getOrCreateSheet(ss, TAB_M_COMPANY, [
    "ชื่อบริษัท/นิติบุคคล", "ปีก่อตั้ง (พ.ศ.)", "ทุนจดทะเบียน", "ความเชี่ยวชาญหลัก",
    "มาตรฐานและการรับรอง", "วิสัยทัศน์และพันธกิจ", "ประวัติและภาพรวมบริษัท", "วันที่อัปเดตล่าสุด"
  ]);

  if (shComp.getLastRow() > 1) {
    shComp.getRange(2, 1, shComp.getLastRow() - 1, 8).clearContent();
  }

  var specs = Array.isArray(masterCompany.specializations) ? masterCompany.specializations.join(", ") : (masterCompany.specializations || "-");
  var certs = Array.isArray(masterCompany.certifications) ? masterCompany.certifications.join(", ") : (masterCompany.certifications || "-");

  var compRow = [
    masterCompany.companyName || "-",
    Number(masterCompany.establishedYearBE || 2558),
    masterCompany.registeredCapital || "-",
    specs,
    certs,
    masterCompany.visionMission || "-",
    masterCompany.companyProfile || "-",
    nowStr
  ];
  shComp.getRange(2, 1, 1, 8).setValues([compRow]);

  return {
    success: true,
    message: "ซิงค์คลังข้อมูลกลาง (ผลงาน " + masterProjects.length + " รายการ, บุคลากร " + masterTeam.length + " ท่าน, BOM " + masterBom.length + " รายการ) เข้าสู่ Google Sheet และ Drive สำเร็จเรียบร้อย!",
    sheetUrl: ss.getUrl(),
    driveFolderUrl: certsFolder.getUrl(),
    counts: {
      projects: masterProjects.length,
      team: masterTeam.length,
      bom: masterBom.length,
      company: 1
    }
  };
}


/**
 * อ่านข้อมูลคลังกลางทั้งหมดจาก Google Sheet กลับมาเป็น JSON สำหรับนำเข้าสู่ระบบ Prime Proposal
 */
function handleGetMasterLibrary(spreadsheetId) {
  var ss;
  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }

  var TAB_M_PROJECTS = "[คลังกลาง] ผลงานและสัญญา";
  var shProj = ss.getSheetByName(TAB_M_PROJECTS);
  var projects = [];

  if (shProj && shProj.getLastRow() > 1) {
    var pData = shProj.getRange(2, 1, shProj.getLastRow() - 1, 14).getValues();
    for (var i = 0; i < pData.length; i++) {
      var row = pData[i];
      var code = String(row[0] || '').trim();
      var cYear = Number(row[1]) || 2567;
      var name = String(row[2] || '').trim();
      if (!name && !code) continue;

      var certUrl = String(row[12] || '');
      if (certUrl.indexOf('http') === -1) certUrl = '';

      var id = 'lib-proj-' + (code ? code.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : ('row-' + (i + 1)));

      projects.push({
        id: id,
        originalMasterId: id,
        projectCode: code || (cYear + '-PRJ-' + String(i + 1).padStart(3, '0')),
        contractYearBE: cYear,
        projectName: name,
        clientName: String(row[3] || '').trim(),
        contractValue: Number(row[4]) || 0,
        completionYearBE: Number(row[5]) || cYear,
        periodDuration: String(row[6] || '').trim(),
        category: String(row[7] || '').trim(),
        projectType: String(row[8] || '').indexOf('ตรง TOR') !== -1 ? 'tor_reference' : 'supplementary',
        description: String(row[9] || '').trim(),
        relevanceNote: String(row[10] || '').trim(),
        certificateFileName: String(row[11] || '').trim(),
        certificateFileUrl: certUrl || undefined,
        isSelected: true,
        imageBlocks: []
      });
    }
  }

  var TAB_M_TEAM = "[คลังกลาง] บุคลากร";
  var shTeam = ss.getSheetByName(TAB_M_TEAM);
  var team = [];

  if (shTeam && shTeam.getLastRow() > 1) {
    var tData = shTeam.getRange(2, 1, shTeam.getLastRow() - 1, 11).getValues();
    for (var j = 0; j < tData.length; j++) {
      var tRow = tData[j];
      var mCode = String(tRow[0] || '').trim();
      var recYear = Number(tRow[1]) || 2568;
      var tName = String(tRow[2] || '').trim();
      if (!tName && !mCode) continue;

      var mId = 'lib-team-' + (mCode ? mCode.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : ('row-' + (j + 1)));

      team.push({
        id: mId,
        originalMasterId: mId,
        memberCode: mCode || (recYear + '-EMP-' + String(j + 1).padStart(3, '0')),
        recordedYearBE: recYear,
        name: tName,
        proposedRole: String(tRow[3] || '').trim(),
        education: String(tRow[4] || '').trim(),
        experienceYears: Number(tRow[5]) || 0,
        startWorkYearBE: Number(tRow[6]) || (recYear - 5),
        responsibilities: String(tRow[7] || '').trim(),
        highlightProjects: String(tRow[8] || '').trim(),
        certifications: String(tRow[9] || '').trim(),
      });
    }
  }

  return {
    success: true,
    projects: projects,
    team: team,
    message: "อ่านข้อมูลจาก Google Sheet สำเร็จ: พบผลงาน " + projects.length + " รายการ, บุคลากร " + team.length + " ท่าน"
  };
}
