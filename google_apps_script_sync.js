/**
 * ==============================================================================
 * สคริปต์ Google Apps Script สำหรับระบบจัดทำข้อเสนอโครงการ (Prime Proposal Report)
 * รองรับการซิงค์ข้อมูลโครงการ, ผลงาน, บุคลากร, BOM, และ "ภาพผลงานโครงการ/รูปถ่ายบุคลากร" ครบถ้วน 100%
 * ==============================================================================
 * วิธีใช้งาน:
 * 1. เปิด Google Sheet ของคุณ (https://docs.google.com/spreadsheets/d/1fT8DsROkO0xJ9XL0NtkFlgct6G_NzdU8WBtCRlv3NYI/edit)
 * 2. ไปที่เมนู ส่วนขยาย (Extensions) > Apps Script
 * 3. ลบโค้ดเดิมทั้งหมดออก แล้วนำโค้ดในไฟล์นี้ไปวางแทนที่
 * 4. กดปุ่ม "บันทึก" (รูปแผ่นดิสก์)
 * 5. กดปุ่ม "ทำให้ใช้งานได้" (Deploy) มุมขวาบน > เลือก "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. เลือกประเภทเป็น "เว็บแอป" (Web app)
 *    - คำอธิบาย: Prime Proposal Sync (รองรับภาพผลงาน & รูปถ่ายบุคลากร)
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
    message: "Prime Proposal Sync Service with Full Image Support is online and ready!"
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
    var yearBE = 2568;
    if (project.proposalData && project.proposalData.section5 && project.proposalData.section5.pastProjects && project.proposalData.section5.pastProjects[0]) {
      yearBE = project.proposalData.section5.pastProjects[0].contractYearBE || 2568;
    }
    var yearFolder = getOrCreateSubFolder(rootFolder, "ปี " + yearBE);

    // 3. โฟลเดอร์เฉพาะโครงการนี้
    var pCode = project.projectCode || (project.proposalData && project.proposalData.cover ? project.proposalData.cover.projectCode : 'NO-CODE');
    var pTitle = project.projectTitle || (project.proposalData && project.proposalData.cover ? project.proposalData.cover.projectTitle : 'โครงการใหม่');
    var cleanTitle = pTitle.replace(/[\/\\?%*:|"<>]/g, '_').trim().substring(0, 60);
    var projectFolder = getOrCreateSubFolder(yearFolder, "[" + pCode + "] " + cleanTitle);

    // 4. สร้างโฟลเดอร์ย่อย 6 หมวด
    var torFolder = getOrCreateSubFolder(projectFolder, "01_TOR_และประกาศจัดจ้าง");
    var contractsFolder = getOrCreateSubFolder(projectFolder, "02_สำเนาสัญญาและหนังสือรับรองผลงาน");
    var outputsFolder = getOrCreateSubFolder(projectFolder, "03_เล่มข้อเสนอโครงการ");
    var otherFolder = getOrCreateSubFolder(projectFolder, "04_เอกสารอื่นๆ");
    var projImagesFolder = getOrCreateSubFolder(projectFolder, "05_ภาพผลงานและกิจกรรมโครงการ");
    var teamPhotosFolder = getOrCreateSubFolder(projectFolder, "06_รูปถ่ายบุคลากร");

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

    // 6. อัปโหลดสำเนาสัญญา / ภาพผลงาน / ภาพประกอบ (Section 5 Past Projects)
    var pastProjects = (project.proposalData && project.proposalData.section5 && project.proposalData.section5.pastProjects) ? project.proposalData.section5.pastProjects : [];
    for (var j = 0; j < pastProjects.length; j++) {
      var p = pastProjects[j];
      if (!p) continue;
      var pRef = p.id || p.projectCode || p.projectName;
      var pCodeClean = (p.projectCode || p.projectName || ('project_' + (j + 1))).replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30);

      // 6.1 สำเนาสัญญา
      if (p.certificateFileUrl && p.certificateFileUrl.indexOf('data:') === 0) {
        var isPdf = p.certificateFileUrl.indexOf('data:application/pdf') === 0 || (p.certificateFileName || '').toLowerCase().indexOf('.pdf') !== -1;
        var ext = isPdf ? '.pdf' : '.png';
        var cName = p.certificateFileName || ('สัญญา_' + pCodeClean + ext);
        var upCert = uploadBase64File(contractsFolder, cName, p.certificateFileUrl, 'contract_cert', pRef);
        if (upCert) uploadedFiles.push(upCert);
      }

      // 6.2 ภาพหลักของผลงานโครงการ
      if (p.projectImageUrl && p.projectImageUrl.indexOf('data:') === 0) {
        var imgName = 'ภาพผลงาน_' + pCodeClean + '_หลัก.png';
        var upImg = uploadBase64File(projImagesFolder, imgName, p.projectImageUrl, 'project_image', pRef);
        if (upImg) uploadedFiles.push(upImg);
      }

      // 6.3 ภาพประกอบใน imageBlocks
      if (p.imageBlocks && Array.isArray(p.imageBlocks)) {
        for (var b = 0; b < p.imageBlocks.length; b++) {
          var block = p.imageBlocks[b];
          if (!block) continue;
          if (block.type === 'single' && block.url && block.url.indexOf('data:') === 0) {
            var bName = 'ภาพผลงาน_' + pCodeClean + '_ภาพที่' + (b + 1) + '.png';
            var upB = uploadBase64File(projImagesFolder, bName, block.url, 'project_image_block', pRef);
            if (upB) uploadedFiles.push(upB);
          } else if (block.type === 'double') {
            if (block.urlLeft && block.urlLeft.indexOf('data:') === 0) {
              var bNameL = 'ภาพผลงาน_' + pCodeClean + '_ภาพที่' + (b + 1) + 'a.png';
              var upBL = uploadBase64File(projImagesFolder, bNameL, block.urlLeft, 'project_image_block', pRef);
              if (upBL) uploadedFiles.push(upBL);
            }
            if (block.urlRight && block.urlRight.indexOf('data:') === 0) {
              var bNameR = 'ภาพผลงาน_' + pCodeClean + '_ภาพที่' + (b + 1) + 'b.png';
              var upBR = uploadBase64File(projImagesFolder, bNameR, block.urlRight, 'project_image_block', pRef);
              if (upBR) uploadedFiles.push(upBR);
            }
          }
        }
      }
    }

    // 7. อัปโหลดรูปถ่ายบุคลากร (Section 4 Team)
    var teamMembers = (project.proposalData && project.proposalData.section4 && project.proposalData.section4.teamMembers) ? project.proposalData.section4.teamMembers : [];
    for (var tmIdx = 0; tmIdx < teamMembers.length; tmIdx++) {
      var tm = teamMembers[tmIdx];
      if (tm && tm.photoUrl && tm.photoUrl.indexOf('data:') === 0) {
        var mRef = tm.id || tm.memberCode || tm.name;
        var phName = 'รูปถ่าย_' + (tm.name || ('บุคลากร_' + (tmIdx + 1))).replace(/[\/\\?%*:|"<>]/g, '_') + '.png';
        var upPhoto = uploadBase64File(teamPhotosFolder, phName, tm.photoUrl, 'team_photo', mRef);
        if (upPhoto) uploadedFiles.push(upPhoto);
      }
    }

    // 8. อัปโหลด Custom Files อื่นๆ
    for (var k = 0; k < customFiles.length; k++) {
      var cf = customFiles[k];
      if (cf && cf.base64) {
        var fTarget = (cf.category === 'contract_cert') ? contractsFolder : (cf.category === 'tor' ? torFolder : otherFolder);
        var upCf = uploadBase64File(fTarget, cf.name, cf.base64, cf.category || 'other');
        if (upCf) uploadedFiles.push(upCf);
      }
    }

    // 9. อัปโหลดไฟล์เล่มข้อเสนอโครงการ Word (.docx)
    if (docxBase64) {
      var dName = docxFileName || ('ข้อเสนอโครงการ_' + cleanTitle.substring(0, 40) + '_' + pCode + '.docx');
      var upDocx = uploadBase64File(outputsFolder, dName, docxBase64, 'docx_output');
      if (upDocx) uploadedFiles.push(upDocx);
    }

    // 10. บันทึกข้อมูลลงใน Google Sheet พร้อมลิงก์และสูตรแสดงภาพ
    var sheetUrl = syncToSheets(spreadsheetId, project, projectFolder, uploadedFiles);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "ซิงค์ข้อมูลข้อเสนอโครงการและอัปโหลดภาพผลงาน/รูปถ่ายขึ้น Google Drive & Sheets สำเร็จเรียบร้อย 100%",
      driveFolderUrl: projectFolder.getUrl(),
      sheetUrl: sheetUrl,
      folderStructure: {
        rootUrl: projectFolder.getUrl(),
        torFolderUrl: torFolder.getUrl(),
        contractsFolderUrl: contractsFolder.getUrl(),
        outputsFolderUrl: outputsFolder.getUrl(),
        projImagesFolderUrl: projImagesFolder.getUrl(),
        teamPhotosFolderUrl: teamPhotosFolder.getUrl()
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
function uploadBase64File(folder, fileName, base64Data, category, refId) {
  try {
    if (!base64Data || typeof base64Data !== 'string') return null;

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
      fileId: file.getId(),
      name: fileName,
      category: category,
      refId: refId || '',
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
    // ลบรายการเดิมของโครงการนี้เพื่อป้องกันแถวซ้ำ
    deleteExistingProjectRows(shMilestones, projectCode);
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
    deleteExistingProjectRows(shBom, projectCode);
    for (var b = 0; b < bomItems.length; b++) {
      var bom = bomItems[b];
      shBom.appendRow([
        projectCode, projectTitle, bom.category || "ทั่วไป", bom.title || "",
        bom.responsibleRole || "", Number(bom.quantity || 1), bom.unit || "ชุด",
        Number(bom.unitPrice || 0), Number(bom.totalPrice || 0)
      ]);
    }
  }

  // 4. TAB CONTRACTS (ผลงานอ้างอิงและสัญญา พร้อมลิงก์ภาพผลงาน & สูตรแสดงภาพ)
  var pastProjects = (pData.section5 && pData.section5.pastProjects) ? pData.section5.pastProjects : [];
  if (pastProjects.length > 0) {
    var shContracts = getOrCreateSheet(ss, TAB_CONTRACTS, [
      "รหัสโครงการที่เสนอ", "ชื่อโครงการที่เสนอ", "รหัสผลงานอ้างอิง", "ชื่อผลงาน/โครงการเดิม",
      "หน่วยงานคู่สัญญา", "ปีที่ได้สัญญา (พ.ศ.)", "มูลค่าสัญญา (บาท)", "ระยะเวลาดำเนินการ",
      "ชื่อไฟล์สำเนาสัญญา/ใบรับรอง", "ลิงก์เปิดดูสัญญา (Google Drive)",
      "ภาพผลงานโครงการ (Google Drive)", "จำนวนภาพประกอบ", "ตัวอย่างภาพผลงาน"
    ]);
    deleteExistingProjectRows(shContracts, projectCode);

    for (var c = 0; c < pastProjects.length; c++) {
      var cp = pastProjects[c];
      var pRef = cp.id || cp.projectCode || cp.projectName;

      // 4.1 ไฟล์สัญญา
      var uploadedCert = null;
      for (var u = 0; u < uploadedFiles.length; u++) {
        var uf = uploadedFiles[u];
        if (uf.category === 'contract_cert' && (uf.refId === pRef || uf.name.indexOf(cp.projectCode || cp.projectName.substring(0, 15)) !== -1)) {
          uploadedCert = uf;
          break;
        }
      }
      var certFormula = uploadedCert ? '=HYPERLINK("' + uploadedCert.webViewLink + '", "เปิดดูสำเนาสัญญา (Drive)")' : "-";

      // 4.2 ภาพผลงานโครงการ
      var mainImg = null;
      var blockImages = [];
      for (var u2 = 0; u2 < uploadedFiles.length; u2++) {
        var uf2 = uploadedFiles[u2];
        if (uf2.refId === pRef || (cp.projectCode && uf2.name.indexOf(cp.projectCode) !== -1)) {
          if (uf2.category === 'project_image') {
            mainImg = uf2;
          } else if (uf2.category === 'project_image_block') {
            blockImages.push(uf2);
          }
        }
      }
      if (!mainImg && blockImages.length > 0) {
        mainImg = blockImages[0];
      }

      var imgDriveFormula = mainImg ? '=HYPERLINK("' + mainImg.webViewLink + '", "เปิดดูภาพผลงาน (Drive)")' : "-";
      var totalImgCount = (mainImg ? 1 : 0) + (mainImg === blockImages[0] ? blockImages.length - 1 : blockImages.length);
      var countStr = totalImgCount > 0 ? ("มีภาพประกอบ " + totalImgCount + " ภาพ") : "-";
      var thumbnailFormula = (mainImg && mainImg.fileId) ? ('=IMAGE("https://drive.google.com/thumbnail?id=' + mainImg.fileId + '&sz=w400")') : "-";

      shContracts.appendRow([
        projectCode, projectTitle, cp.projectCode || "-", cp.projectName || "",
        cp.clientName || "", cp.contractYearBE || cp.completionYearBE || "",
        Number(cp.contractValue || 0), cp.periodDuration || "",
        cp.certificateFileName || (uploadedCert ? uploadedCert.name : "ไม่มีไฟล์แนบ"),
        certFormula,
        imgDriveFormula,
        countStr,
        thumbnailFormula
      ]);
    }
  }

  // 5. TAB TEAM (บุคลากรหลัก พร้อมลิงก์รูปถ่าย & สูตรแสดงภาพ 1.5 นิ้ว)
  var teamMembersList = (pData.section4 && pData.section4.teamMembers) ? pData.section4.teamMembers : [];
  if (teamMembersList.length > 0) {
    var shTeam = getOrCreateSheet(ss, TAB_TEAM, [
      "รหัสโครงการ", "ชื่อโครงการ", "ชื่อ-นามสกุล บุคลากร", "ตำแหน่งที่เสนอในโครงการ",
      "วุฒิการศึกษา", "ประสบการณ์ทำงาน (ปี)", "ภาระหน้าที่รับผิดชอบ", "ใบรับรอง/Certifications",
      "ลิงก์รูปถ่าย (Google Drive)", "ตัวอย่างรูปถ่าย 1.5 นิ้ว"
    ]);
    deleteExistingProjectRows(shTeam, projectCode);

    for (var t = 0; t < teamMembersList.length; t++) {
      var tm = teamMembersList[t];
      var mRef = tm.id || tm.memberCode || tm.name;
      var uploadedPhoto = null;
      for (var u3 = 0; u3 < uploadedFiles.length; u3++) {
        var uf3 = uploadedFiles[u3];
        if (uf3.category === 'team_photo' && (uf3.refId === mRef || (tm.name && uf3.name.indexOf(tm.name) !== -1))) {
          uploadedPhoto = uf3;
          break;
        }
      }
      var photoDriveFormula = uploadedPhoto ? '=HYPERLINK("' + uploadedPhoto.webViewLink + '", "เปิดดูรูปถ่าย (Drive)")' : "-";
      var photoThumbnailFormula = (uploadedPhoto && uploadedPhoto.fileId) ? ('=IMAGE("https://drive.google.com/thumbnail?id=' + uploadedPhoto.fileId + '&sz=w400")') : "-";

      shTeam.appendRow([
        projectCode, projectTitle, tm.name || "", tm.proposedRole || "",
        tm.education || "", Number(tm.experienceYears || 0), tm.responsibilities || "", tm.certifications || "",
        photoDriveFormula, photoThumbnailFormula
      ]);
    }
  }

  return ss.getUrl();
}

function deleteExistingProjectRows(sheet, projectCode) {
  try {
    var values = sheet.getDataRange().getValues();
    for (var r = values.length - 1; r >= 1; r--) {
      if (values[r][0] == projectCode) {
        sheet.deleteRow(r + 1);
      }
    }
  } catch (e) {}
}

function getOrCreateSheet(ss, tabName, headers) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    sheet.setFrozenRows(1);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#F1F5F9");
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#F1F5F9");
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
  var projImagesFolder = getOrCreateSubFolder(masterFolder, "02_ภาพผลงานโครงการกลาง");
  var teamPhotosFolder = getOrCreateSubFolder(masterFolder, "03_รูปถ่ายบุคลากรกลาง");

  // 2. อัปโหลดสำเนาสัญญา และภาพผลงานโครงการของ Master Projects
  var uploadedCerts = {};
  var uploadedProjImages = {}; // key: projectRef -> { mainUrl, mainFileId, blockCount }

  for (var i = 0; i < masterProjects.length; i++) {
    var p = masterProjects[i];
    if (!p) continue;
    var pRef = p.id || p.projectCode || ('prj_' + i);
    var pCode = (p.projectCode || p.projectName || ('PRJ-' + (i + 1))).replace(/[\/\\?%*:|"<>]/g, '_').substring(0, 30);

    // 2.1 สัญญา/ใบรับรอง
    if (p.certificateFileUrl && p.certificateFileUrl.indexOf('data:') === 0) {
      var isPdf = p.certificateFileUrl.indexOf('data:application/pdf') === 0 || (p.certificateFileName || '').toLowerCase().indexOf('.pdf') !== -1;
      var ext = isPdf ? '.pdf' : '.png';
      var cName = p.certificateFileName || ('สัญญา_' + pCode + ext);
      var up = uploadBase64File(certsFolder, cName, p.certificateFileUrl, 'master_contract_cert', pRef);
      if (up) {
        uploadedCerts[pRef] = up.webViewLink;
      }
    }

    // 2.2 ภาพผลงานหลัก
    var mainImgUrl = null;
    var mainFileId = null;
    var blockCount = 0;

    if (p.projectImageUrl && p.projectImageUrl.indexOf('data:') === 0) {
      var imgName = 'ภาพผลงาน_' + pCode + '_หลัก.png';
      var upImg = uploadBase64File(projImagesFolder, imgName, p.projectImageUrl, 'master_project_image', pRef);
      if (upImg) {
        mainImgUrl = upImg.webViewLink;
        mainFileId = upImg.fileId;
        blockCount++;
      }
    }

    // 2.3 ภาพประกอบใน imageBlocks
    if (p.imageBlocks && Array.isArray(p.imageBlocks)) {
      for (var b = 0; b < p.imageBlocks.length; b++) {
        var block = p.imageBlocks[b];
        if (!block) continue;
        if (block.type === 'single' && block.url && block.url.indexOf('data:') === 0) {
          var bName = 'ภาพผลงาน_' + pCode + '_ภาพที่' + (b + 1) + '.png';
          var upB = uploadBase64File(projImagesFolder, bName, block.url, 'master_project_image_block', pRef);
          if (upB) {
            if (!mainImgUrl) {
              mainImgUrl = upB.webViewLink;
              mainFileId = upB.fileId;
            }
            blockCount++;
          }
        } else if (block.type === 'double') {
          if (block.urlLeft && block.urlLeft.indexOf('data:') === 0) {
            var bNameL = 'ภาพผลงาน_' + pCode + '_ภาพที่' + (b + 1) + 'a.png';
            var upBL = uploadBase64File(projImagesFolder, bNameL, block.urlLeft, 'master_project_image_block', pRef);
            if (upBL) {
              if (!mainImgUrl) {
                mainImgUrl = upBL.webViewLink;
                mainFileId = upBL.fileId;
              }
              blockCount++;
            }
          }
          if (block.urlRight && block.urlRight.indexOf('data:') === 0) {
            var bNameR = 'ภาพผลงาน_' + pCode + '_ภาพที่' + (b + 1) + 'b.png';
            var upBR = uploadBase64File(projImagesFolder, bNameR, block.urlRight, 'master_project_image_block', pRef);
            if (upBR) blockCount++;
          }
        }
      }
    }

    if (mainImgUrl || blockCount > 0) {
      uploadedProjImages[pRef] = {
        mainUrl: mainImgUrl,
        mainFileId: mainFileId,
        blockCount: blockCount
      };
    }
  }

  // 3. อัปโหลดรูปถ่ายบุคลากรในคลังกลาง
  var uploadedTeamPhotos = {};
  for (var k = 0; k < masterTeam.length; k++) {
    var tm = masterTeam[k];
    if (tm && tm.photoUrl && tm.photoUrl.indexOf('data:') === 0) {
      var tRef = tm.id || tm.memberCode || tm.name;
      var phName = 'รูปถ่าย_' + (tm.name || ('บุคลากร_' + (k + 1))).replace(/[\/\\?%*:|"<>]/g, '_') + '.png';
      var upPhoto = uploadBase64File(teamPhotosFolder, phName, tm.photoUrl, 'master_team_photo', tRef);
      if (upPhoto) {
        uploadedTeamPhotos[tRef] = {
          photoUrl: upPhoto.webViewLink,
          fileId: upPhoto.fileId
        };
      }
    }
  }

  var nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");

  // 3. แท็บ [คลังกลาง] ผลงานและสัญญา (17 คอลัมน์)
  var TAB_M_PROJECTS = "[คลังกลาง] ผลงานและสัญญา";
  var projHeaders = [
    "รหัสผลงาน", "ปีที่ได้สัญญา (พ.ศ.)", "ชื่อผลงาน/โครงการ", "หน่วยงานผู้ว่าจ้าง",
    "มูลค่าสัญญา (บาท)", "ปีแล้วเสร็จ (พ.ศ.)", "ระยะเวลาสัญญา", "หมวดหมู่งาน",
    "ประเภทงาน", "รายละเอียด/ขอบเขตงาน", "หมายเหตุความสอดคล้อง TOR",
    "ชื่อไฟล์สำเนาสัญญา", "ลิงก์เปิดดูสัญญา (Google Drive)",
    "ภาพผลงานโครงการ (Google Drive)", "จำนวนภาพประกอบ", "ตัวอย่างภาพผลงาน",
    "วันที่อัปเดตล่าสุด"
  ];
  var shProj = getOrCreateSheet(ss, TAB_M_PROJECTS, projHeaders);

  if (shProj.getLastRow() > 1) {
    shProj.getRange(2, 1, shProj.getLastRow() - 1, projHeaders.length).clearContent();
  }

  var projRows = [];
  for (var j = 0; j < masterProjects.length; j++) {
    var mp = masterProjects[j];
    var pRef = mp.id || mp.projectCode || ('prj_' + j);

    var certLink = uploadedCerts[pRef] || (mp.certificateFileUrl && mp.certificateFileUrl.indexOf('http') === 0 ? mp.certificateFileUrl : null);
    var certFormula = certLink ? '=HYPERLINK("' + certLink + '", "เปิดดูสำเนาสัญญา (Drive)")' : "-";

    var imgInfo = uploadedProjImages[pRef];
    var imgLink = imgInfo && imgInfo.mainUrl ? imgInfo.mainUrl : (mp.projectImageUrl && mp.projectImageUrl.indexOf('http') === 0 ? mp.projectImageUrl : null);
    var imgFormula = imgLink ? '=HYPERLINK("' + imgLink + '", "เปิดดูภาพผลงาน (Drive)")' : "-";
    var imgCountStr = (imgInfo && imgInfo.blockCount > 0) ? ("มีภาพประกอบ " + imgInfo.blockCount + " ภาพ") : "-";
    var imgThumbFormula = (imgInfo && imgInfo.mainFileId) ? ('=IMAGE("https://drive.google.com/thumbnail?id=' + imgInfo.mainFileId + '&sz=w400")') : "-";

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
      imgFormula,
      imgCountStr,
      imgThumbFormula,
      nowStr
    ]);
  }
  if (projRows.length > 0) {
    shProj.getRange(2, 1, projRows.length, projHeaders.length).setValues(projRows);
  }

  // 4. แท็บ [คลังกลาง] บุคลากร (13 คอลัมน์)
  var TAB_M_TEAM = "[คลังกลาง] บุคลากร";
  var teamHeaders = [
    "รหัสบุคลากร", "ปีที่บันทึก (พ.ศ.)", "ชื่อ-นามสกุล", "ตำแหน่งหลักที่เสนอ",
    "วุฒิการศึกษา", "ประสบการณ์ (ปี)", "ปีเริ่มทำงาน (พ.ศ.)", "หน้าที่ความรับผิดชอบหลัก",
    "ผลงานเด่นที่ผ่านมา", "ใบรับรอง/Certifications",
    "ลิงก์รูปถ่าย (Google Drive)", "ตัวอย่างรูปถ่าย 1.5 นิ้ว", "วันที่อัปเดตล่าสุด"
  ];
  var shTeam = getOrCreateSheet(ss, TAB_M_TEAM, teamHeaders);

  if (shTeam.getLastRow() > 1) {
    shTeam.getRange(2, 1, shTeam.getLastRow() - 1, teamHeaders.length).clearContent();
  }

  var teamRows = [];
  for (var k = 0; k < masterTeam.length; k++) {
    var tm = masterTeam[k];
    var tRef = tm.id || tm.memberCode || tm.name;
    var photoInfo = uploadedTeamPhotos[tRef];
    var photoLink = photoInfo && photoInfo.photoUrl ? photoInfo.photoUrl : (tm.photoUrl && tm.photoUrl.indexOf('http') === 0 ? tm.photoUrl : null);
    var photoFormula = photoLink ? '=HYPERLINK("' + photoLink + '", "เปิดดูรูปถ่าย (Drive)")' : "-";
    var photoThumbFormula = (photoInfo && photoInfo.fileId) ? ('=IMAGE("https://drive.google.com/thumbnail?id=' + photoInfo.fileId + '&sz=w400")') : "-";

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
      photoFormula,
      photoThumbFormula,
      nowStr
    ]);
  }
  if (teamRows.length > 0) {
    shTeam.getRange(2, 1, teamRows.length, teamHeaders.length).setValues(teamRows);
  }

  // 5. แท็บ [คลังกลาง] แคตตาล็อก BOM
  var TAB_M_BOM = "[คลังกลาง] แคตตาล็อก BOM";
  var bomHeaders = [
    "หมวดหมู่งาน", "รายการงาน/อุปกรณ์", "ตำแหน่งผู้รับผิดชอบ", "หน่วยนับ",
    "ราคาต่อหน่วยมาตรฐาน (บาท)", "จำนวนตั้งต้น", "รายละเอียด/ขอบเขตงาน",
    "เอกสารสิ่งส่งมอบ", "สถานะมาตรฐาน", "วันที่อัปเดตล่าสุด"
  ];
  var shBom = getOrCreateSheet(ss, TAB_M_BOM, bomHeaders);

  if (shBom.getLastRow() > 1) {
    shBom.getRange(2, 1, shBom.getLastRow() - 1, bomHeaders.length).clearContent();
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
    shBom.getRange(2, 1, bomRows.length, bomHeaders.length).setValues(bomRows);
  }

  // 6. แท็บ [คลังกลาง] ข้อมูลบริษัท
  var TAB_M_COMPANY = "[คลังกลาง] ข้อมูลบริษัท";
  var compHeaders = [
    "ชื่อบริษัท/นิติบุคคล", "ปีก่อตั้ง (พ.ศ.)", "ทุนจดทะเบียน", "ความเชี่ยวชาญหลัก",
    "มาตรฐานและการรับรอง", "วิสัยทัศน์และพันธกิจ", "ประวัติและภาพรวมบริษัท", "วันที่อัปเดตล่าสุด"
  ];
  var shComp = getOrCreateSheet(ss, TAB_M_COMPANY, compHeaders);

  if (shComp.getLastRow() > 1) {
    shComp.getRange(2, 1, shComp.getLastRow() - 1, compHeaders.length).clearContent();
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
  shComp.getRange(2, 1, 1, compHeaders.length).setValues([compRow]);

  return {
    success: true,
    message: "ซิงค์คลังข้อมูลกลางพร้อมภาพผลงานและรูปถ่ายบุคลากร (ผลงาน " + masterProjects.length + " รายการ, บุคลากร " + masterTeam.length + " ท่าน, BOM " + masterBom.length + " รายการ) เข้าสู่ Google Sheet และ Drive สำเร็จเรียบร้อย!",
    sheetUrl: ss.getUrl(),
    driveFolderUrl: masterFolder.getUrl(),
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
    var pCols = Math.max(shProj.getLastColumn(), 17);
    var pData = shProj.getRange(2, 1, shProj.getLastRow() - 1, pCols).getValues();
    for (var i = 0; i < pData.length; i++) {
      var row = pData[i];
      var code = String(row[0] || '').trim();
      var cYear = Number(row[1]) || 2567;
      var name = String(row[2] || '').trim();
      if (!name && !code) continue;

      var certUrl = String(row[12] || '');
      if (certUrl.indexOf('http') === -1) certUrl = '';

      var imgUrl = String(row[13] || '');
      if (imgUrl.indexOf('http') === -1) imgUrl = '';

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
        projectImageUrl: imgUrl || undefined,
        isSelected: true,
        imageBlocks: []
      });
    }
  }

  var TAB_M_TEAM = "[คลังกลาง] บุคลากร";
  var shTeam = ss.getSheetByName(TAB_M_TEAM);
  var team = [];

  if (shTeam && shTeam.getLastRow() > 1) {
    var tCols = Math.max(shTeam.getLastColumn(), 13);
    var tData = shTeam.getRange(2, 1, shTeam.getLastRow() - 1, tCols).getValues();
    for (var j = 0; j < tData.length; j++) {
      var tRow = tData[j];
      var mCode = String(tRow[0] || '').trim();
      var recYear = Number(tRow[1]) || 2568;
      var tName = String(tRow[2] || '').trim();
      if (!tName && !mCode) continue;

      var photoUrl = String(tRow[10] || '');
      if (photoUrl.indexOf('http') === -1) photoUrl = '';

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
        photoUrl: photoUrl || undefined
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
