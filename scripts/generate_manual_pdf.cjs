const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Generating HTML manual template...');

const htmlContent = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>คู่มือการปฏิบัติงานสำหรับผู้ใช้งาน - ระบบ Prime Proposal Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

    @page {
      size: A4 portrait;
      margin: 14mm 14mm 14mm 14mm;
    }

    @page :first {
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Sarabun', 'TH Sarabun New', 'Angsana New', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1E293B;
      margin: 0;
      padding: 0;
      background-color: #FFFFFF;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: 'Prompt', 'Sarabun', sans-serif;
      color: #0F172A;
      margin-top: 1rem;
      margin-bottom: 0.4rem;
      line-height: 1.25;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      height: 100vh;
      min-height: 297mm;
      padding: 50mm 25mm 30mm 25mm;
      background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #1E40AF 100%);
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .cover-page::before {
      content: '';
      position: absolute;
      top: -100px;
      right: -100px;
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0) 70%);
      border-radius: 50%;
    }

    .cover-page::after {
      content: '';
      position: absolute;
      bottom: -150px;
      left: -150px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0) 70%);
      border-radius: 50%;
    }

    .cover-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 11pt;
      font-weight: 500;
      letter-spacing: 0.5px;
      margin-bottom: 25px;
      backdrop-filter: blur(5px);
    }

    .cover-title {
      font-size: 30pt;
      font-weight: 700;
      color: #FFFFFF;
      line-height: 1.25;
      margin: 0 0 15px 0;
    }

    .cover-subtitle {
      font-size: 14pt;
      color: #93C5FD;
      font-weight: 400;
      margin-bottom: 30px;
      line-height: 1.5;
    }

    .cover-features {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 30px;
      position: relative;
      z-index: 2;
    }

    .cover-feat-card {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.18);
      padding: 14px 18px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }

    .cover-feat-title {
      font-weight: 600;
      font-size: 11pt;
      color: #F8FAFC;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cover-feat-desc {
      font-size: 9pt;
      color: #CBD5E1;
      line-height: 1.4;
    }

    .cover-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 25px;
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 9.5pt;
      color: #94A3B8;
      position: relative;
      z-index: 2;
    }

    /* Page Setup */
    .page-break {
      page-break-after: always;
    }

    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Header & Footer on printed pages */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #E2E8F0;
      padding-bottom: 6px;
      margin-bottom: 20px;
      font-size: 8.5pt;
      color: #64748B;
    }

    .doc-header-title {
      font-weight: 600;
      color: #0F172A;
    }

    .chapter-badge {
      display: inline-block;
      background: #EFF6FF;
      color: #1D4ED8;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 9pt;
      font-weight: 600;
      margin-bottom: 8px;
      border: 1px solid #BFDBFE;
    }

    h1.chapter-title {
      font-size: 20pt;
      color: #0F172A;
      border-bottom: 2.5px solid #2563EB;
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 16px;
    }

    h2.section-title {
      font-size: 14pt;
      color: #1E3A8A;
      margin-top: 20px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    h3.sub-section-title {
      font-size: 11.5pt;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    /* Boxes & Callouts */
    .callout {
      border-radius: 6px;
      padding: 7px 12px;
      margin: 8px 0;
      font-size: 9pt;
      line-height: 1.45;
    }

    .callout-info {
      background-color: #F0FDF4;
      border-left: 3.5px solid #10B981;
      color: #065F46;
    }

    .callout-warn {
      background-color: #FFFBEB;
      border-left: 3.5px solid #F59E0B;
      color: #92400E;
    }

    .callout-primary {
      background-color: #EFF6FF;
      border-left: 3.5px solid #3B82F6;
      color: #1E40AF;
    }

    .callout-title {
      font-weight: 700;
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* Step Process Cards */
    .step-card {
      display: flex;
      gap: 10px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 7px 11px;
      margin-bottom: 6px;
    }

    .step-num {
      width: 26px;
      height: 26px;
      background: #2563EB;
      color: #FFFFFF;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 9.5pt;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .step-content {
      flex: 1;
    }

    .step-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0F172A;
      margin-bottom: 2px;
    }

    .step-desc {
      font-size: 8.8pt;
      color: #475569;
      line-height: 1.4;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 8.5pt;
    }

    table.data-table th {
      background-color: #0F172A;
      color: #FFFFFF;
      text-align: left;
      padding: 6px 8px;
      font-weight: 600;
    }

    table.data-table td {
      padding: 5px 8px;
      border-bottom: 1px solid #E2E8F0;
      vertical-align: top;
      line-height: 1.35;
    }

    table.data-table tr:nth-child(even) td {
      background-color: #F8FAFC;
    }

    /* Diagram Boxes */
    .diagram-container {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 10px 12px;
      margin: 10px 0;
    }

    .diagram-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }

    .diagram-box {
      flex: 1;
      background: #FFFFFF;
      border: 1px solid #94A3B8;
      border-radius: 6px;
      padding: 7px 10px;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    .diagram-box.cloud {
      border-color: #2563EB;
      background: #EFF6FF;
    }

    .diagram-box.local {
      border-color: #10B981;
      background: #ECFDF5;
    }

    .diagram-box-title {
      font-weight: 700;
      font-size: 9.5pt;
      color: #0F172A;
      margin-bottom: 2px;
    }

    .diagram-box-desc {
      font-size: 8pt;
      color: #64748B;
      line-height: 1.3;
    }

    .arrow-down {
      text-align: center;
      font-size: 11pt;
      color: #2563EB;
      margin: 2px 0;
      font-weight: bold;
    }

    /* Badges & Tags */
    .tag {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
    }

    .tag-blue { background: #DBEAFE; color: #1E40AF; }
    .tag-green { background: #D1FAE5; color: #065F46; }
    .tag-amber { background: #FEF3C7; color: #92400E; }
    .tag-purple { background: #F3E8FF; color: #6B21A8; }

    /* TOC */
    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 7px 0;
      border-bottom: 1px dotted #CBD5E1;
      font-size: 10pt;
    }

    .toc-title {
      font-weight: 600;
      color: #1E3A8A;
    }

    .toc-page {
      font-weight: 700;
      color: #64748B;
    }
  </style>
</head>
<body>

  <!-- ==================== หน้าปก (COVER PAGE) ==================== -->
  <div class="cover-page">
    <div>
      <div class="cover-badge">📖 USER OPERATIONS MANUAL • 2026 EDITION</div>
      <h1 class="cover-title">คู่มือการปฏิบัติงานสำหรับผู้ใช้งาน<br>ระบบจัดทำเล่มข้อเสนอโครงการ</h1>
      <div class="cover-subtitle">
        Prime Proposal Report & e-GP Tender Automation System<br>
        สถาปัตยกรรมคลาวด์รุ่นใหม่ (Cloud-First Architecture & Zero Local Residue)
      </div>

      <div class="cover-features">
        <div class="cover-feat-card">
          <div class="cover-feat-title">☁️ Single Source of Truth</div>
          <div class="cover-feat-desc">จัดเก็บข้อมูลโครงการและไฟล์แนบไว้บน Google Drive & Google Sheets กลางขององค์กร ปลอดภัย 100%</div>
        </div>
        <div class="cover-feat-card">
          <div class="cover-feat-title">⚡ Zero Local Residue</div>
          <div class="cover-feat-desc">ดึงข้อมูลมาทำงานบนเว็บเป็นกระดานชั่วคราว ปิดเบราว์เซอร์แล้วข้อมูลไม่ตกค้างในเครื่อง สามารถย้ายเครื่องทำงานได้ทันที</div>
        </div>
        <div class="cover-feat-card">
          <div class="cover-feat-title">📥 Selective Pull & Push</div>
          <div class="cover-feat-desc">เลือกดึงเฉพาะโครงการที่ต้องการทำ ไม่ต้องโหลดทั้งคลัง และบันทึกซิงค์ร่างกลับคืน Cloud อัตโนมัติ</div>
        </div>
        <div class="cover-feat-card">
          <div class="cover-feat-title">📄 Automated DOCX / PDF</div>
          <div class="cover-feat-desc">ส่งออกเป็นไฟล์ Word สวยงาม ครบ 5 ภาคส่วนตามระเบียบพัสดุและจัดซื้อจัดจ้างภาครัฐ</div>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <div>
        <strong>ระบบบริหารจัดการข้อเสนอโครงการภาครัฐ (Prime Proposal Report)</strong><br>
        ฝ่ายพัฒนาธุรกิจและงานประมูลโครงการ (Bidding & Business Development)
      </div>
      <div style="text-align: right;">
        เอกสารเวอร์ชัน 2.5 (Cloud-First)<br>
        เผยแพร่: ตุลาคม 2026
      </div>
    </div>
  </div>

  <!-- ==================== สารบัญ (TABLE OF CONTENTS) ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span class="doc-header-title">ระบบ Prime Proposal Report — คู่มือการใช้งานสำหรับผู้ใช้</span>
      <span>สารบัญและบทสรุปภาพรวม</span>
    </div>

    <span class="chapter-badge">ภาพรวมเอกสาร</span>
    <h1 class="chapter-title">สารบัญและบทสรุปผู้บริหาร</h1>

    <p style="margin-bottom: 20px;">
      คู่มือฉบับนี้จัดทำขึ้นเพื่อให้ผู้ใช้งานในทีมประมูล คณะทำงานจัดทำข้อเสนอโครงการ (Proposal Writing Team) 
      และผู้บริหาร สามารถใช้งานระบบ <strong>Prime Proposal Report</strong> ได้อย่างถูกต้อง เต็มประสิทธิภาพ และมั่นใจในความปลอดภัยของข้อมูล
    </p>

    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin-bottom: 24px;">
      <div class="toc-item">
        <span class="toc-title">บทที่ 1: ปรัชญาการออกแบบและสถาปัตยกรรมระบบ (Design Philosophy & Architecture)</span>
        <span class="toc-page">หน้า 3</span>
      </div>
      <div class="toc-item">
        <span class="toc-title">บทที่ 2: การเข้าใช้งานและหน้าแดชบอร์ดหลัก (Login & Project Dashboard)</span>
        <span class="toc-page">หน้า 4</span>
      </div>
      <div class="toc-item">
        <span class="toc-title">บทที่ 3: ระบบคลังข้อมูลกลางและการดึงข้อมูลทำงาน (Master Library & Selective Pull)</span>
        <span class="toc-page">หน้า 5</span>
      </div>
      <div class="toc-item">
        <span class="toc-title">บทที่ 4: ขั้นตอนการจัดทำเล่มข้อเสนอโครงการ 5 ภาคส่วน (Proposal Authoring Workflow)</span>
        <span class="toc-page">หน้า 6</span>
      </div>
      <div class="toc-item">
        <span class="toc-title">บทที่ 5: การบันทึกร่างและการซิงค์คืนคลังกลาง Cloud (Cloud-First Sync & Storage)</span>
        <span class="toc-page">หน้า 7</span>
      </div>
      <div class="toc-item">
        <span class="toc-title">บทที่ 6: การส่งออกเอกสารรายงานและการพิมพ์ (Document Export & Printing)</span>
        <span class="toc-page">หน้า 8</span>
      </div>
      <div class="toc-item">
        <span class="toc-title">บทที่ 7: เช็คลิสต์การทำงานประจำวัน (Day-to-Day Checklist)</span>
        <span class="toc-page">หน้า 9</span>
      </div>
      <div class="toc-item">
        <span class="toc-title">บทที่ 8: คำถามที่พบบ่อยและการแก้ปัญหา (FAQ & Troubleshooting)</span>
        <span class="toc-page">หน้า 10</span>
      </div>
    </div>

    <div class="callout callout-primary avoid-break">
      <div class="callout-title">💡 สิ่งที่ผู้ใช้งานควรทราบก่อนเริ่มใช้งานระบบ:</div>
      <ul style="margin: 6px 0 0 16px; padding: 0;">
        <li>ระบบถูกพัฒนาเป็น <strong>Cloud-First</strong> ดังนั้นข้อมูลทั้งหมดจะอยู่บน Google Cloud (Google Drive & Google Sheets) ไม่บันทึกค้างไว้ในคอมพิวเตอร์ของผู้ใช้</li>
        <li>สามารถใช้งานผ่านเว็บเบราว์เซอร์มาตรฐาน เช่น Google Chrome, Microsoft Edge ได้ทันทีโดยไม่ต้องลงโปรแกรมเสริม</li>
        <li>เมื่อแก้ไขงานเสร็จ ให้กดปุ่ม <strong>"บันทึกและซิงค์ขึ้น Google Drive / Sheets"</strong> เสมอ เพื่อให้เพื่อนร่วมงานหรือตัวท่านเองเมื่อไปใช้เครื่องอื่นสามารถดึงข้อมูลล่าสุดไปทำต่อได้ทันที</li>
      </ul>
    </div>
  </div>

  <!-- ==================== บทที่ 1 ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span class="doc-header-title">ระบบ Prime Proposal Report — คู่มือการใช้งานสำหรับผู้ใช้</span>
      <span>บทที่ 1: ปรัชญาการออกแบบและสถาปัตยกรรมระบบ</span>
    </div>

    <span class="chapter-badge">บทที่ 1</span>
    <h1 class="chapter-title">ปรัชญาการออกแบบและสถาปัตยกรรมระบบ</h1>

    <h2 class="section-title">1.1 แนวคิด Cloud-First & Zero Local Residue</h2>
    <p>
      เดิมทีกระบวนการจัดทำข้อเสนอโครงการมักประสบปัญหาไฟล์กระจัดกระจายอยู่ในเครื่องของแต่ละคน ส่งไฟล์ Word ทางอีเมลหรือแฟลชไดรฟ์ 
      ทำให้เกิดปัญหาเวอร์ชันตีกัน (Version Conflict) หรือข้อมูลลับของโครงการตกค้างอยู่ในเครื่องส่วนตัว
    </p>
    <p>
      ระบบ <strong>Prime Proposal Report</strong> จึงถูกออกแบบบนสถาปัตยกรรม <strong>Cloud-First & Zero Local Residue</strong>:
    </p>

    <div class="diagram-container avoid-break">
      <div class="diagram-row">
        <div class="diagram-box cloud">
          <div class="diagram-box-title">☁️ Google Cloud & Workspace (คลังกลางถาวร)</div>
          <div class="diagram-box-desc">
            • <strong>Google Sheets กลาง:</strong> ตารางคลังผลงาน 33 คอลัมน์, ข้อมูลทีมงาน, ข้อมูลสัญญา<br>
            • <strong>Google Drive:</strong> โฟลเดอร์ปี พ.ศ. แยกหมวด 6 โฟลเดอร์ย่อย และไฟล์ร่าง <code>proposal_data.json</code>
          </div>
        </div>
      </div>

      <div class="arrow-down">⬇️ 1. Selective Pull (ดึงเฉพาะเรื่องที่ทำ) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ⬆️ 2. Sync Back (บันทึกคืน Cloud)</div>

      <div class="diagram-row">
        <div class="diagram-box local">
          <div class="diagram-box-title">🖥️ กระดานทำงานบนเบราว์เซอร์ (Ephemeral Working Memory)</div>
          <div class="diagram-box-desc">
            • เก็บใน <code>sessionStorage</code> ของแท็บเบราว์เซอร์เท่านั้น<br>
            • ปิดเว็บหรือเปลี่ยนโครงการ ข้อมูลในเครื่องจะถูกล้างออก 100% (Zero Residue)<br>
            • มี <strong>Unsynced Drafts Vault</strong> คอยเซฟกันไฟดับ/เน็ตหลุดอัตโนมัติ
          </div>
        </div>
      </div>
    </div>

    <h2 class="section-title">1.2 แหล่งความจริงหนึ่งเดียว (Single Source of Truth)</h2>
    <p>
      ระบบกำหนดให้ Google Drive และ Google Sheets ที่ผูกกับ Service Account ของบริษัทเป็นแหล่งความจริงหนึ่งเดียว โดยมีโครงสร้างดังนี้:
    </p>
    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th style="width: 28%;">องค์ประกอบ</th>
          <th style="width: 32%;">ตำแหน่งจัดเก็บบน Cloud</th>
          <th>หน้าที่และการทำงาน</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>คลังผลงานโครงการ</strong></td>
          <td>Google Sheets: แถว A2:AG (33 คอลัมน์)</td>
          <td>เก็บข้อมูลสัญญา มูลค่า วันที่ ภาพถ่ายหน้าปก ภาพย่อ และลิงก์ภาพประกอบทั้งหมด</td>
        </tr>
        <tr>
          <td><strong>คลังบุคลากร</strong></td>
          <td>Google Sheets: ชีต Master Team</td>
          <td>เก็บประวัติการศึกษา ใบอนุญาตวิชาชีพ และผลงานเด่นของทีมงาน</td>
        </tr>
        <tr>
          <td><strong>ไฟล์แนบ & ภาพถ่าย</strong></td>
          <td>Google Drive: โฟลเดอร์โครงการตามปี</td>
          <td>เก็บไฟล์ TOR, สัญญา, รูปภาพ 6 นิ้ว และภาพคู่ 3 นิ้ว แยกตามหมวดหมู่ชัดเจน</td>
        </tr>
        <tr>
          <td><strong>ร่างเล่มข้อเสนอ</strong></td>
          <td>Google Drive: <code>proposal_data.json</code></td>
          <td>เก็บโครงสร้างเล่ม 5 ภาคส่วน ขอบเขต วิธีดำเนินงาน งวดงาน และตารางราคา</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ==================== บทที่ 2 ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span class="doc-header-title">ระบบ Prime Proposal Report — คู่มือการใช้งานสำหรับผู้ใช้</span>
      <span>บทที่ 2: การเข้าใช้งานและหน้าแดชบอร์ดหลัก</span>
    </div>

    <span class="chapter-badge">บทที่ 2</span>
    <h1 class="chapter-title">การเข้าใช้งานและหน้าแดชบอร์ดหลัก</h1>

    <h2 class="section-title">2.1 การเข้าสู่ระบบ (Login)</h2>
    <div class="step-card avoid-break">
      <div class="step-num">1</div>
      <div class="step-content">
        <div class="step-title">เข้าสู่ระบบด้วย Google Account (SSO)</div>
        <div class="step-desc">
          เปิดเว็บของระบบและกดปุ่ม <strong>"เข้าสู่ระบบด้วยบัญชี Google"</strong> โดยใช้อีเมลบริษัทที่ได้รับการเพิ่มสิทธิ์ (Whitelist) ระบบจะตรวจสอบตัวตนและนำท่านเข้าสู่แดชบอร์ดโดยอัตโนมัติ
        </div>
      </div>
    </div>

    <div class="step-card avoid-break">
      <div class="step-num">2</div>
      <div class="step-content">
        <div class="step-title">โหมดฉุกเฉิน / ทำงานออฟไลน์ (Bypass Mode)</div>
        <div class="step-desc">
          กรณีอินเทอร์เน็ตมีปัญหา หรือจำเป็นต้องร่างข้อเสนอบนเครื่องส่วนตัว ท่านสามารถกดปุ่ม <strong>"เข้าใช้งานระบบชั่วคราว (Bypass)"</strong> เพื่อร่างข้อเสนอลงในเครื่องได้โดยระบบจะเก็บข้อมูลใน IndexedDB อย่างปลอดภัย
        </div>
      </div>
    </div>

    <h2 class="section-title">2.2 แดชบอร์ดโครงการ (Project Dashboard)</h2>
    <p>
      เมื่อเข้าสู่ระบบ ท่านจะพบหน้าแดชบอร์ดรวมโครงการประกวดราคา ซึ่งประกอบด้วยองค์ประกอบสำคัญดังนี้:
    </p>

    <div class="callout callout-info avoid-break">
      <div class="callout-title">🟢 ป้ายสถานะ Google Cloud & Drive Ready:</div>
      สังเกตบริเวณมุมบนของหน้าจอ จะมีป้ายสีเขียวระบุ <strong>"Google Cloud & Drive Ready"</strong> แสดงว่าระบบพร้อมเชื่อมต่อกับ Google Drive และ Google Sheets กลางขององค์กรอย่างสมบูรณ์
    </div>

    <h3 class="sub-section-title">ปุ่มคำสั่งสำคัญบนแดชบอร์ด:</h3>
    <ul>
      <li><strong>+ สร้างโครงการใหม่:</strong> เปิดแบบฟอร์มกรอกข้อมูลโครงการและอัปโหลดเอกสาร TOR</li>
      <li><strong>📥 ดึงเล่มร่างจาก Cloud:</strong> เปิดหน้าต่างเลือกโครงการที่ทำค้างไว้บน Google Drive เพื่อดึงมาทำต่อ</li>
      <li><strong>นำเข้าโครงการ (.prime / .json):</strong> สำหรับเปิดไฟล์โครงการที่มีเพื่อนร่วมงานส่งมาให้</li>
      <li><strong>จัดการคลังข้อมูลกลาง:</strong> เปิดหน้าต่างบริหารคลังผลงานสัญญาและบุคลากรส่วนกลาง</li>
    </ul>

    <h2 class="section-title">2.3 การติดตามสถานะโครงการ (Project Statuses)</h2>
    <p>ระบบแบ่งสถานะของโครงการตามวงจรการประกวดราคาออกเป็น 5 สถานะ:</p>
    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th style="width: 25%;">ป้ายสถานะ</th>
          <th>ความหมายและขั้นตอนการทำงาน</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="tag tag-amber">📝 ร่างข้อเสนอ (Draft)</span></td>
          <td>อยู่ระหว่างวิเคราะห์ TOR กำหนดบุคลากร และเขียนเนื้อหาวิธีดำเนินงาน</td>
        </tr>
        <tr>
          <td><span class="tag tag-blue">🔍 ส่งตรวจ (Review)</span></td>
          <td>ยกร่างครบถ้วนแล้ว อยู่ระหว่างทีมตรวจสอบความถูกต้องตามเกณฑ์เงื่อนไข</td>
        </tr>
        <tr>
          <td><span class="tag tag-purple">✅ อนุมัติยื่นซอง (Approved)</span></td>
          <td>ผู้บริหารอนุมัติความสมบูรณ์ พร้อมพิมพ์เอกสารหรือส่งยื่นข้อเสนอทาง e-GP</td>
        </tr>
        <tr>
          <td><span class="tag tag-green">🏆 ชนะการเสนอราคา (Won)</span></td>
          <td>ได้รับคัดเลือกเป็นผู้ชนะการประกวดราคา พร้อมบันทึกสัญญาเข้าคลังผลงาน</td>
        </tr>
        <tr>
          <td><span class="tag" style="background:#FEE2E2; color:#991B1B;">❌ ยุติโครงการ (Lost/Cancel)</span></td>
          <td>ไม่ผ่านการคัดเลือก หรือหน่วยงานยกเลิกการจัดซื้อจัดจ้าง</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ==================== บทที่ 3 ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span class="doc-header-title">ระบบ Prime Proposal Report — คู่มือการใช้งานสำหรับผู้ใช้</span>
      <span>บทที่ 3: ระบบคลังข้อมูลกลางและการดึงข้อมูลทำงาน</span>
    </div>

    <span class="chapter-badge">บทที่ 3</span>
    <h1 class="chapter-title">ระบบคลังข้อมูลกลางและการดึงข้อมูลทำงาน</h1>

    <h2 class="section-title">3.1 หน้าต่างคลังข้อมูลกลาง (Master Library Management)</h2>
    <p>
      คลังกลางเป็นหัวใจสำคัญในการจัดทำข้อเสนอโครงการ เพราะช่วยให้ผู้เขียนข้อเสนอไม่ต้องค้นหาเอกสารเก่าหรือพิมพ์ประวัติสัญญาใหม่ซ้ำซ้อน:
    </p>

    <div class="step-card avoid-break">
      <div class="step-num">1</div>
      <div class="step-content">
        <div class="step-title">เปิดหน้าต่างคลังข้อมูลกลาง</div>
        <div class="step-desc">คลิกปุ่ม <strong>"จัดการคลังข้อมูลกลาง"</strong> ที่หน้าแดชบอร์ด จะพบแท็บ 3 แท็บ ได้แก่ <em>คลังผลงานและสัญญา, คลังบุคลากร, และคลังรายการวัสดุ (BOM)</em></div>
      </div>
    </div>

    <div class="step-card avoid-break">
      <div class="step-num">2</div>
      <div class="step-content">
        <div class="step-title">สถานะ Cloud-First (คลังสะอาด 100%)</div>
        <div class="step-desc">เมื่อเปิดเข้ามาครั้งแรก คลังบนหน้าจอจะว่างเปล่า เพื่อความสะอาดยืนยันว่าไม่ได้นำข้อมูลเก่าของเครื่องอื่นมาปะปน</div>
      </div>
    </div>

    <h2 class="section-title">3.2 การดึงข้อมูลเฉพาะโครงการที่ต้องการ (Selective Pull)</h2>
    <p>
      หากต้องการแก้ไขหรือนำผลงานโครงการใดมาอ้างอิง ไม่จำเป็นต้องโหลดฐานข้อมูลทั้งหมดลงมา ให้ใช้ฟังก์ชัน <strong>Selective Pull</strong>:
    </p>

    <div class="callout callout-info avoid-break">
      <div class="callout-title">📌 ขั้นตอนการดึงเฉพาะโครงการ (Selective Pull):</div>
      <ol style="margin: 6px 0 0 16px; padding: 0;">
        <li>กดปุ่ม <strong>"📥 เลือกดึงเฉพาะบางโครงการ (แนะนำ)"</strong> หรือปุ่ม <strong>"📥 ดึงจาก Google Sheet (Pull)"</strong></li>
        <li>ระบบจะเปิดหน้าต่างรายชื่อโครงการทั้งหมดที่มีใน Google Sheet พร้อมช่องค้นหา</li>
        <li>พิมพ์ชื่อโครงการหรือรหัส เช่น <code>2568-PRJ-020</code> หรือชื่อหน่วยงานผู้ว่าจ้าง</li>
        <li>ทำเครื่องหมายถูก <strong>[✓]</strong> หน้าโครงการที่ต้องการดึง</li>
        <li>เลือกโหมด: <strong>"แทนที่คลังบนเว็บ (Replace - แนะนำ)"</strong> เพื่อให้หน้าจอมีเฉพาะเรื่องที่ทำ</li>
        <li>กดปุ่ม <strong>"ดึง X โครงการที่เลือกลงมาทำงาน"</strong></li>
      </ol>
    </div>

    <h2 class="section-title">3.3 การแก้ไขข้อมูลและระบบนิรภัย (Unsynced Drafts Vault)</h2>
    <p>
      เมื่อท่านกด <strong>"✏️ แก้ไข"</strong> โครงการใด และปรับปรุงเนื้อหา เช่น มูลค่าสัญญา, วันที่, หรือรูปภาพ:
    </p>
    <ul>
      <li>เมื่อกด <strong>"บันทึกข้อมูล"</strong> ในฟอร์ม ข้อมูลจะถูกเก็บเข้าสู่เซสชันทำงานทันที</li>
      <li>จะมีป้ายสีเขียวระบุ <code>💾 บันทึกในเครื่องแล้ว (รอซิงค์)</code></li>
      <li>ด้านบนจะมี <strong>แถบเตือนสีส้ม (Unsynced Warning Banner)</strong> ระบุจำนวนรายการที่รอซิงค์</li>
      <li><strong>ระบบนิรภัย Drafts Vault:</strong> จะสำรองรายการที่แก้ไขไว้ หากเผลอปิดแท็บ เน็ตหลุด หรือเครื่องรีสตาร์ท เมื่อเปิดเว็บกลับมา งานจะไม่หายและสามารถกดซิงค์ต่อได้ทันที</li>
    </ul>

    <h2 class="section-title">3.4 การจัดการรูปภาพผลงานสัญญา (ภาพเดี่ยว 6 นิ้ว vs ภาพคู่ 3 นิ้ว)</h2>
    <p>
      เพื่อให้เอกสาร Word ออกมาสวยงามตามมาตรฐานงานพัสดุ ระบบรองรับโครงสร้างรูปภาพ 2 รูปแบบ:
    </p>
    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th style="width: 25%;">รูปแบบรูปภาพ</th>
          <th style="width: 35%;">การจัดวางในเล่มข้อเสนอ</th>
          <th>ความเหมาะสมในการใช้งาน</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>ภาพเดี่ยว (Single Block)</strong><br><span class="tag tag-blue">ขนาด 6 นิ้วเต็มหน้า</span></td>
          <td>จัดวางเต็มความกว้างของหน้ากระดาษ พร้อมคำบรรยายใต้ภาพ</td>
          <td>ภาพถ่ายทางอากาศ, แผนผังระบบ (Architecture Diagram), ภาพพิธีส่งมอบงานสำคัญ</td>
        </tr>
        <tr>
          <td><strong>ภาพคู่ (Pair Block - a/b)</strong><br><span class="tag tag-purple">ขนาด 3 นิ้ว ซ้าย-ขวา</span></td>
          <td>จัดวางคู่กัน 2 ภาพซ้าย-ขวา ชิดขอบกระดาษสวยงาม</td>
          <td>ภาพกิจกรรมที่มีความต่อเนื่อง เช่น ภาพก่อนเริ่มโครงการ คู่กับ ภาพหลังเสร็จสิ้นโครงการ, ภาพการอบรมคู่กับภาพลงปฏิบัติการ</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ==================== บทที่ 4 ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span class="doc-header-title">ระบบ Prime Proposal Report — คู่มือการใช้งานสำหรับผู้ใช้</span>
      <span>บทที่ 4: ขั้นตอนการจัดทำเล่มข้อเสนอโครงการ 5 ภาคส่วน</span>
    </div>

    <span class="chapter-badge">บทที่ 4</span>
    <h1 class="chapter-title">ขั้นตอนการจัดทำเล่มข้อเสนอโครงการ 5 ภาคส่วน</h1>

    <p>
      การคลิกเข้าไปที่โครงการจากแดชบอร์ด จะนำท่านเข้าสู่ <strong>Proposal Editor</strong> ซึ่งจัดระเบียบเนื้อหาออกเป็น 5 ภาคส่วนตามระเบียบงานพัสดุ:
    </p>

    <h2 class="section-title">ภาคส่วนที่ 1: ข้อมูลโครงการ ขอบเขตงาน และสารบัญ (Section 1)</h2>
    <div class="step-card avoid-break">
      <div class="step-num">1</div>
      <div class="step-content">
        <div class="step-title">ข้อมูลทั่วไปและวัตถุประสงค์โครงการ</div>
        <div class="step-desc">
          ระบุชื่อโครงการ รหัส e-GP งบประมาณกลาง กรอบระยะเวลา และชื่อหน่วยงานผู้ว่าจ้าง พร้อมระบุวัตถุประสงค์หลักของโครงการ 3-5 ข้อ
        </div>
      </div>
    </div>
    <div class="step-card avoid-break">
      <div class="step-num">2</div>
      <div class="step-content">
        <div class="step-title">การนำเข้าไฟล์ TOR สู่ระบบกระจายข้อย่อย</div>
        <div class="step-desc">
          สามารถลากไฟล์ TOR (.pdf หรือ .docx) มาวางในช่อง ระบบจะอ่านข้อความและสกัดหัวข้อขอบเขตงานออกมาให้อัตโนมัติ
        </div>
      </div>
    </div>

    <h2 class="section-title">ภาคส่วนที่ 2: แผนงานและงวดงานส่งมอบ (Section 2 - Work Plan & Milestones)</h2>
    <p>จัดทำแผนการดำเนินงานรายเดือน (Gantt Chart) และงวดการจ่ายเงิน:</p>
    <ul>
      <li><strong>การกำหนดงวดงาน:</strong> ระบุชื่องวดงาน, สัดส่วนร้อยละ (%), ระยะเวลาส่งมอบ (วัน), และรายการเอกสารส่งมอบ (Deliverables)</li>
      <li><strong>ระบบคำนวณอัตโนมัติ:</strong> ระบบจะคำนวณยอดเงินรวมและสัดส่วนเปอร์เซ็นต์ให้ต้องครบ 100% เสมอ ป้องกันการคำนวณงวดงานผิดพลาด</li>
    </ul>

    <h2 class="section-title">ภาคส่วนที่ 3: รายละเอียดวิธีการดำเนินงานตาม TOR (Section 3 - Methodology)</h2>
    <div class="callout callout-warn avoid-break">
      <div class="callout-title">⚠️ ส่วนที่ให้คะแนนทางเทคนิคสูงสุด:</div>
      ระบบจัดทำรายการตรวจสอบตามข้อย่อยของ TOR (ข้อ 3.1, 3.2, 3.3, ...) ผู้จัดทำต้องเขียนอธิบาย <em>วิธีการดำเนินงาน, สถาปัตยกรรมระบบ, เครื่องมือที่ใช้, และขั้นตอนการทดสอบ</em> ให้ครบทุกหัวข้อ ระบบจะมีเกจวัดความสมบูรณ์ (%) แสดงให้เห็นแบบเรียลไทม์
    </div>

    <h2 class="section-title">ภาคส่วนที่ 4: บุคลากรหลักและแผนบริหารความเสี่ยง (Section 4 - Team & Risk)</h2>
    <p>การจัดทีมงานที่มีคุณสมบัติตรงตามข้อกำหนด TOR:</p>
    <ul>
      <li><strong>ดึงประวัติจากคลังกลาง:</strong> คลิก <strong>"ดึงจากคลังบุคลากรกลาง"</strong> เพื่อเลือกผู้เชี่ยวชาญ ระบบจะดึงประวัติการศึกษา ใบประกอบวิชาชีพ และผลงานที่เกี่ยวข้องมาใส่ให้อัตโนมัติ</li>
      <li><strong>แผนบริหารความเสี่ยง (Risk Matrix):</strong> กำหนดความเสี่ยงที่อาจเกิดขึ้น ผลกระทบ (สูง/กลาง/ต่ำ) พร้อมแนวทางป้องกันและการแก้ไขปัญหาเฉพาะหน้า</li>
    </ul>

    <h2 class="section-title">ภาคส่วนที่ 5: ผลงานและประสบการณ์อ้างอิง (Section 5 - Past Projects)</h2>
    <p>การคัดเลือกผลงานที่ตรงเกณฑ์ TOR เพื่อสร้างความน่าเชื่อถือ:</p>
    <ul>
      <li>คลิกปุ่ม <strong>"ดึงจากคลังผลงานกลาง"</strong></li>
      <li>ค้นหาและติ๊กเลือกโครงการสัญญาเดิมที่มีวงเงินและลักษณะงานสอดคล้องกับ TOR</li>
      <li>ระบบจะดึงหนังสือรับรองผลงาน ภาพถ่ายผลงาน และตารางสรุปสัญญามาจัดเรียงในเล่มข้อเสนออย่างสมบูรณ์</li>
    </ul>
  </div>

  <!-- ==================== บทที่ 5 ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span class="doc-header-title">ระบบ Prime Proposal Report — คู่มือการใช้งานสำหรับผู้ใช้</span>
      <span>บทที่ 5: การบันทึกร่างและการซิงค์คืนคลังกลาง Cloud</span>
    </div>

    <span class="chapter-badge">บทที่ 5</span>
    <h1 class="chapter-title">การบันทึกร่างและการซิงค์คืนคลังกลาง Cloud</h1>

    <h2 class="section-title">5.1 วงจรชีวิตของไฟล์ร่างบน Google Drive</h2>
    <p>
      เพื่อให้ผู้ใช้สามารถทำงานต่อจากจุดเดิมได้แม้จะเปลี่ยนคอมพิวเตอร์หรือทำงานจากที่บ้าน ระบบได้นำสถาปัตยกรรม <strong>Cloud Proposal Workspace</strong> มาใช้:
    </p>

    <div class="diagram-container avoid-break">
      <div class="diagram-row">
        <div class="diagram-box">
          <div class="diagram-box-title">1. ดึงร่างจาก Drive</div>
          <div class="diagram-box-desc">กดปุ่ม "📥 ดึงเล่มร่างจาก Cloud"<br>เลือกโครงการตามปี พ.ศ.</div>
        </div>
        <div class="diagram-box local">
          <div class="diagram-box-title">2. แก้ไขบนกระดานทำงาน</div>
          <div class="diagram-box-desc">แก้ไขเนื้อหาทั้ง 5 ภาคส่วน<br>ในเบราว์เซอร์</div>
        </div>
        <div class="diagram-box cloud">
          <div class="diagram-box-title">3. ซิงค์กลับขึ้น Drive</div>
          <div class="diagram-box-desc">กด "☁️ ซิงค์เล่มข้อเสนอนี้ขึ้น Cloud"<br>อัปเดต proposal_data.json</div>
        </div>
      </div>
    </div>

    <h2 class="section-title">5.2 โครงสร้างโฟลเดอร์บน Google Drive อัตโนมัติ</h2>
    <p>
      เมื่อกดซิงค์โครงการขึ้น Google Drive ระบบ Backend จะตรวจสอบและสร้างโครงสร้างโฟลเดอร์ให้เป็นระเบียบตามมาตรฐานองค์กรโดยอัตโนมัติ:
    </p>

    <div style="background: #F1F5F9; border-left: 3.5px solid #475569; padding: 7px 12px; font-family: monospace; font-size: 8pt; line-height: 1.35; margin: 8px 0; border-radius: 4px;">
      📁 Google Drive กลางของระบบ<br>
      └── 📁 2568 (โฟลเดอร์ปี พ.ศ.)<br>
      &nbsp;&nbsp;&nbsp;&nbsp;└── 📁 [2568-PRJ-020] โครงการพัฒนาระบบบริหารจัดการข้อมูล...<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📄 <strong>proposal_data.json</strong> (ไฟล์ร่างเล่มข้อเสนอฉบับสมบูรณ์)<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 01_TOR_และเอกสารประกวดราคา<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 02_สัญญาและใบสั่งจ้าง<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 03_เอกสารส่งมอบงานและตรวจรับ<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 04_ภาพประกอบผลงาน<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📁 05_รูปถ่ายและเอกสารบุคลากร<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 06_เอกสารข้อเสนอโครงการ (Word / PDF)
    </div>

    <h2 class="section-title">5.3 ขั้นตอนการดึงร่างโครงการกลับมาทำต่อ (Cloud Proposal Picker)</h2>
    <div class="step-card avoid-break">
      <div class="step-num">1</div>
      <div class="step-content">
        <div class="step-title">คลิกปุ่ม "📥 ดึงเล่มร่างจาก Cloud"</div>
        <div class="step-desc">อยู่ที่หน้าแดชบอร์ดโครงการ ระบบจะเชื่อมต่อกับ Google Drive และแสดงโฟลเดอร์โครงการทั้งหมดที่เคยบันทึกไว้</div>
      </div>
    </div>
    <div class="step-card avoid-break">
      <div class="step-num">2</div>
      <div class="step-content">
        <div class="step-title">เลือกโฟลเดอร์โครงการที่ต้องการ</div>
        <div class="step-desc">คลิกเลือกโครงการที่ต้องการทำต่อ แล้วกดปุ่ม <strong>"ดึงเล่มข้อเสนอนี้มาทำงาน"</strong></div>
      </div>
    </div>
    <div class="step-card avoid-break">
      <div class="step-num">3</div>
      <div class="step-content">
        <div class="step-title">ระบบเคลียร์กระดานและโหลดข้อมูลล่าสุด</div>
        <div class="step-desc">ระบบจะล้างข้อมูลของโครงการเดิมในเซสชันออก แล้วดึงไฟล์ร่าง <code>proposal_data.json</code> ล่าสุดจาก Cloud เข้าสู่หน้าจอพร้อมให้แก้ไขทันที</div>
      </div>
    </div>

    <h2 class="section-title">5.4 การล้างข้อมูลในเครื่องออกเมื่อเสร็จงาน (Reset Workspace)</h2>
    <p>
      เมื่อท่านแก้ไขและกดซิงค์ข้อมูลขึ้น Google Drive หรือ Google Sheets สำเร็จแล้ว:
    </p>
    <ul>
      <li>สามารถกดปุ่ม <strong>"ล้างข้อมูลในเครื่อง"</strong> หรือปิดแท็บเบราว์เซอร์ได้ทันที</li>
      <li>ข้อมูลในเครื่องจะถูกล้างออก 100% <strong>โดยที่ข้อมูลบน Cloud ปลอดภัย ไม่ถูกลบแต่อย่างใด</strong></li>
      <li>ทำให้เครื่องของท่านสะอาด ปลอดภัย และพร้อมรับโครงการใหม่โดยไม่มีข้อมูลเก่าตกค้าง</li>
    </ul>
  </div>

  <!-- ==================== บทที่ 6 ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span class="doc-header-title">ระบบ Prime Proposal Report — คู่มือการใช้งานสำหรับผู้ใช้</span>
      <span>บทที่ 6: การส่งออกเอกสารรายงานและการพิมพ์</span>
    </div>

    <span class="chapter-badge">บทที่ 6</span>
    <h1 class="chapter-title">การส่งออกเอกสารรายงานและการพิมพ์</h1>

    <h2 class="section-title">6.1 การส่งออกเล่มข้อเสนอเป็น Microsoft Word (.docx)</h2>
    <p>
      จุดเด่นสำคัญของระบบคือความสามารถในการแปลงข้อมูลที่กรอกในเว็บให้กลายเป็นเล่มเอกสาร Word (.docx) 
      ที่มีการจัดหน้าตามมาตรฐานระเบียบพัสดุและฟอร์แมตเอกสารราชการ:
    </p>

    <div class="step-card avoid-break">
      <div class="step-num">1</div>
      <div class="step-content">
        <div class="step-title">คลิกปุ่ม "ส่งออกเป็น Word (.docx)"</div>
        <div class="step-desc">ระบบจะเปิดหน้าต่างตั้งค่าการส่งออก (Export Modal) ให้ท่านเลือกตัวเลือกที่ต้องการ</div>
      </div>
    </div>

    <div class="step-card avoid-break">
      <div class="step-num">2</div>
      <div class="step-content">
        <div class="step-title">เลือกองค์ประกอบที่ต้องการส่งออก</div>
        <div class="step-desc">
          ท่านสามารถเลือกส่งออกครบทั้ง 5 ภาคส่วน หรือเลือกส่งออกเฉพาะบางส่วน เช่น เฉพาะตารางงวดงาน, เฉพาะรายละเอียดวิธีดำเนินงาน, หรือเฉพาะประวัติบุคลากร
        </div>
      </div>
    </div>

    <div class="step-card avoid-break">
      <div class="step-num">3</div>
      <div class="step-content">
        <div class="step-title">ดาวน์โหลดและนำไปใช้งาน</div>
        <div class="step-desc">
          ระบบจะประมวลผลและสร้างไฟล์ <code>.docx</code> ดาวน์โหลดลงเครื่องทันที โดยรูปภาพจะถูกปรับขนาดเป็น 6 นิ้ว หรือ 3 นิ้วคู่กันอย่างสมบูรณ์โดยที่ฟอนต์และการตัดคำไม่เพี้ยน
        </div>
      </div>
    </div>

    <h2 class="section-title">6.2 การส่งออกบัญชีแสดงปริมาณวัสดุและราคา (Master BOM Export)</h2>
    <p>
      สำหรับโครงการที่ต้องมีการแจกแจงรายการพัสดุ ครุภัณฑ์ หรือค่าสิทธิการใช้งาน (License):
    </p>
    <ul>
      <li>ระบบสามารถส่งออกตารางสรุปงบประมาณและรายละเอียดราคาต่อหน่วย (Unit Cost) ออกมาเป็นไฟล์ Excel หรือตารางสรุปแนบท้ายเล่มข้อเสนอได้ทันที</li>
      <li>มีระบบคำนวณภาษีมูลค่าเพิ่ม (VAT 7%) และกำไรดำเนินงานให้อัตโนมัติ</li>
    </ul>

    <h2 class="section-title">6.3 การสำรองและแลกเปลี่ยนไฟล์แพ็กเกจโครงการ (.prime)</h2>
    <p>
      กรณีที่เพื่อนร่วมงานไม่ได้ต่ออินเทอร์เน็ต ท่านสามารถใช้ฟังก์ชัน <strong>"ส่งออกแพ็กเกจโครงการ (.prime)"</strong>:
    </p>
    <ul>
      <li>ไฟล์ <code>.prime</code> คือไฟล์แพ็กเกจพิเศษที่รวมทั้งร่างข้อเสนอ, ข้อมูลสัญญา, และไฟล์แนบทั้งหมดไว้ในไฟล์เดียว</li>
      <li>เพื่อนร่วมงานสามารถนำไฟล์นี้ไปกดปุ่ม <strong>"นำเข้าโครงการ (.prime)"</strong> เพื่อทำงานต่อได้ทันที</li>
    </ul>
  </div>

  <!-- ==================== บทที่ 7 ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span class="doc-header-title">ระบบ Prime Proposal Report — คู่มือการใช้งานสำหรับผู้ใช้</span>
      <span>บทที่ 7: เช็คลิสต์การทำงานประจำวัน</span>
    </div>

    <span class="chapter-badge">บทที่ 7</span>
    <h1 class="chapter-title">เช็คลิสต์การทำงานประจำวัน (Day-to-Day Checklist)</h1>

    <p>ตารางสรุปขั้นตอนการทำงานประจำวันตั้งแต่เริ่มรับเอกสารประกวดราคาจนถึงการยื่นซองข้อเสนอ:</p>

    <table class="data-table avoid-break">
      <thead>
        <tr>
          <th style="width: 15%;">ลำดับ</th>
          <th style="width: 25%;">ขั้นตอน</th>
          <th style="width: 35%;">การปฏิบัติในระบบ Prime</th>
          <th>ผลลัพธ์ที่ได้</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>ขั้นตอนที่ 1</strong></td>
          <td>เปิดรับโครงการใหม่</td>
          <td>กดปุ่ม <code>+ สร้างโครงการใหม่</code> บนแดชบอร์ด กรอกชื่อโครงการ งบประมาณ และอัปโหลดไฟล์ TOR</td>
          <td>ได้รหัสโครงการและรายการข้อย่อย TOR</td>
        </tr>
        <tr>
          <td><strong>ขั้นตอนที่ 2</strong></td>
          <td>คัดเลือกบุคลากร & ผลงาน</td>
          <td>เข้า Section 4 & 5 กด <code>ดึงจากคลังกลาง</code> ติ๊กเลือกบุคลากรและสัญญาผลงานที่ตรงเกณฑ์ TOR</td>
          <td>ประวัติทีมงานและผลงานสัญญาเดิมถูกบรรจุเข้าเล่ม</td>
        </tr>
        <tr>
          <td><strong>ขั้นตอนที่ 3</strong></td>
          <td>ยกร่างแผนงาน & งวดงาน</td>
          <td>เข้า Section 2 กำหนดระยะเวลาดำเนินงานและแบ่งงวดการส่งมอบงานให้ครบ 100%</td>
          <td>ตารางงวดงานและแผน Gantt Chart อัตโนมัติ</td>
        </tr>
        <tr>
          <td><strong>ขั้นตอนที่ 4</strong></td>
          <td>เขียนวิธีดำเนินงาน</td>
          <td>เข้า Section 3 อธิบายวิธีการดำเนินงาน สถาปัตยกรรม และขั้นตอนปฏิบัติการตามข้อย่อย TOR ให้ครบ</td>
          <td>เกจความสมบูรณ์เทคนิคขึ้น 100%</td>
        </tr>
        <tr>
          <td><strong>ขั้นตอนที่ 5</strong></td>
          <td>บันทึกและซิงค์ขึ้น Cloud</td>
          <td>กดปุ่ม <code>☁️ ซิงค์เล่มข้อเสนอนี้ขึ้น Google Drive</code></td>
          <td>ไฟล์ <code>proposal_data.json</code> และโฟลเดอร์ถูกอัปเดตบน Drive</td>
        </tr>
        <tr>
          <td><strong>ขั้นตอนที่ 6</strong></td>
          <td>ส่งออกเอกสารและตรวจทาน</td>
          <td>กดปุ่ม <code>ส่งออกเป็น Word (.docx)</code> เพื่อเปิดตรวจทานและจัดพิมพ์ยื่นซองประกวดราคา</td>
          <td>ไฟล์ Word เล่มข้อเสนอสมบูรณ์พร้อมยื่น</td>
        </tr>
      </tbody>
    </table>

    <div class="callout callout-info avoid-break" style="margin-top: 25px;">
      <div class="callout-title">💡 เคล็ดลับการทำงานอย่างมีประสิทธิภาพ:</div>
      หากท่านต้องสลับไปทำงานบนโน้ตบุ๊กหรือคอมพิวเตอร์ที่บ้าน เพียงทำตาม 2 ขั้นตอนนี้:<br>
      <strong>1. ก่อนเลิกงานที่ออฟฟิศ:</strong> กดปุ่ม <em>"☁️ ซิงค์เล่มข้อเสนอนี้ขึ้น Google Drive"</em> หนึ่งครั้ง<br>
      <strong>2. เมื่อถึงบ้าน:</strong> เปิดเว็บ Prime Proposal Report กดปุ่ม <em>"📥 ดึงเล่มร่างจาก Cloud"</em> แล้วเลือกโครงการเดิมมาทำต่อได้ทันทีอย่างไร้รอยต่อ
    </div>
  </div>

  <!-- ==================== บทที่ 8 ==================== -->
  <div class="page-break">
    <div class="doc-header">
      <span class="doc-header-title">ระบบ Prime Proposal Report — คู่มือการใช้งานสำหรับผู้ใช้</span>
      <span>บทที่ 8: คำถามที่พบบ่อยและการแก้ปัญหา</span>
    </div>

    <span class="chapter-badge">บทที่ 8</span>
    <h1 class="chapter-title">คำถามที่พบบ่อยและการแก้ปัญหา (FAQ)</h1>

    <div class="avoid-break" style="margin-bottom: 14px;">
      <h3 style="color: #1E3A8A; margin-bottom: 4px;">Q1: ทำไมเปิดเว็บมาในวันใหม่แล้วหน้าแดชบอร์ดหรือคลังไม่แสดงโครงการเก่า?</h3>
      <p style="font-size: 9.5pt; color: #334155; margin-top: 2px;">
        <strong>คำตอบ:</strong> เป็นคุณสมบัติตั้งใจของระบบ <strong>Cloud-First & Zero Residue</strong> เพื่อไม่ให้เกิดปัญหาข้อมูลเก่าตกค้างหรือสับสนกับเพื่อนร่วมงาน ให้ท่านกดปุ่ม <strong>[📥 ดึงเล่มร่างจาก Cloud]</strong> สำหรับเล่มข้อเสนอ หรือกดปุ่ม <strong>[📥 ดึงจาก Google Sheet (Pull)]</strong> สำหรับคลังผลงาน เพื่อดึงข้อมูลสดๆ ล่าสุดเสมอ
      </p>
    </div>

    <div class="avoid-break" style="margin-bottom: 14px;">
      <h3 style="color: #1E3A8A; margin-bottom: 4px;">Q2: ถ้ากำลังพิมพ์งานอยู่แล้วไฟดับ เน็ตหลุด หรือเผลอปิดแท็บ ข้อมูลที่แก้ไว้จะหายไหม?</h3>
      <p style="font-size: 9.5pt; color: #334155; margin-top: 2px;">
        <strong>คำตอบ:</strong> <strong>ไม่หายครับ</strong> ระบบมี <em>Unsynced Drafts Vault</em> คอยตรวจจับการแก้ไขและสำรองข้อมูลไว้ในหน่วยความจำฉุกเฉิน เมื่อท่านเปิดเบราว์เซอร์กลับมา จะมีแถบแจ้งเตือนสีส้มขึ้นเตือนว่ามีงานค้างซิงค์อยู่ ท่านสามารถกดซิงค์งานต่อได้ทันที
      </p>
    </div>

    <div class="avoid-break" style="margin-bottom: 14px;">
      <h3 style="color: #1E3A8A; margin-bottom: 4px;">Q3: ต้องการแก้ไขผลงานแค่โครงการเดียว ไม่อยากให้โครงการอื่นโหลดมาเกะกะ ทำอย่างไร?</h3>
      <p style="font-size: 9.5pt; color: #334155; margin-top: 2px;">
        <strong>คำตอบ:</strong> ให้ใช้ฟังก์ชัน <strong>Selective Pull</strong> ในหน้าคลังกลาง โดยกดปุ่ม <em>"📥 เลือกดึงเฉพาะบางโครงการ"</em> -> พิมพ์ค้นหารหัสหรือชื่อโครงการนั้น -> ติ๊กถูก [✓] เพียงรายการเดียว -> กดปุ่ม <em>"ดึง 1 โครงการที่เลือกลงมาทำงาน (Replace Mode)"</em> หน้าจอจะมีเฉพาะเรื่องที่ท่านต้องการแก้ไขอย่างสะอาดตา
      </p>
    </div>

    <div class="avoid-break" style="margin-bottom: 14px;">
      <h3 style="color: #1E3A8A; margin-bottom: 4px;">Q4: ในคลังผลงานทำไมบางโครงการมีป้ายสีแดงขึ้นว่า "⚠️ ซ้ำ"?</h3>
      <p style="font-size: 9.5pt; color: #334155; margin-top: 2px;">
        <strong>คำตอบ:</strong> เกิดจากมีโครงการในคลังที่มีรหัสเดียวกัน ให้ท่านคลิกปุ่ม <strong>"✏️ แก้ไข"</strong> เพื่อตรวจดูรหัส หรือคลิกปุ่ม <strong>"จัดระเบียบรหัสใหม่ (Auto Re-code)"</strong> เพื่อให้ระบบคำนวณและเรียงลำดับรหัสโครงการตามปีสัญญาใหม่อัตโนมัติโดยไม่ซ้ำกัน
      </p>
    </div>

    <div class="avoid-break" style="margin-bottom: 14px;">
      <h3 style="color: #1E3A8A; margin-bottom: 4px;">Q5: การกดปุ่ม "ล้างข้อมูลในเครื่อง" จะทำให้ไฟล์บน Google Drive ถูกลบไปด้วยหรือไม่?</h3>
      <p style="font-size: 9.5pt; color: #334155; margin-top: 2px;">
        <strong>คำตอบ:</strong> <strong>ไม่ถูกลบครับ</strong> การล้างข้อมูลในเครื่องมีผลเฉพาะหน่วยความจำชั่วคราว (Cache/Session) ในเครื่องของท่านเท่านั้น ข้อมูลจริงบน Google Drive และ Google Sheets ยังคงอยู่ครบถ้วน 100%
      </p>
    </div>

    <div class="avoid-break" style="margin-bottom: 14px;">
      <h3 style="color: #1E3A8A; margin-bottom: 4px;">Q6: ติดต่อฝ่ายสนับสนุนเทคนิคหรือแจ้งปัญหาการใช้งานได้อย่างไร?</h3>
      <p style="font-size: 9.5pt; color: #334155; margin-top: 2px;">
        <strong>คำตอบ:</strong> หากพบปัญหาในการเข้าใช้งาน หรือระบบไม่สามารถเชื่อมต่อ Google Drive ได้ ให้ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของท่านก่อน หรือติดต่อทีมผู้ดูแลระบบ (System Administrator) ขององค์กรเพื่อตรวจสอบสิทธิ์การเข้าถึง Service Account
      </p>
    </div>

    <div style="border-top: 1.5px solid #CBD5E1; margin-top: 30px; padding-top: 15px; text-align: center; font-size: 9pt; color: #64748B;">
      — สิ้นสุดเอกสารคู่มือการปฏิบัติงานสำหรับผู้ใช้งาน (Prime Proposal Report System) —
    </div>
  </div>

</body>
</html>
`;

const htmlFilePath = path.join(__dirname, 'manual_template.html');
fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');
console.log('HTML template written to:', htmlFilePath);

const edgePaths = [
  'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
  'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe'
];

let edgeExe = edgePaths.find(p => fs.existsSync(p));
if (!edgeExe) {
  console.error('Microsoft Edge executable not found!');
  process.exit(1);
}

console.log('Using Edge executable:', edgeExe);

const outputPdf1 = path.resolve(__dirname, '..', 'คู่มือการใช้งานระบบ_Prime_Proposal_Report.pdf');
const outputPdf2 = path.resolve(__dirname, '..', 'Prime_Proposal_Report_User_Manual.pdf');

const fileUrl = 'file:///' + htmlFilePath.replace(/\\\\/g, '/');

console.log('Rendering PDF to:', outputPdf1);
const cmd = `"${edgeExe}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${outputPdf1}" "${fileUrl}"`;
execSync(cmd, { stdio: 'inherit' });

if (fs.existsSync(outputPdf1)) {
  const stats = fs.statSync(outputPdf1);
  console.log(`Successfully generated: ${outputPdf1} (${(stats.size / 1024).toFixed(1)} KB)`);
  // Also copy to English filename for convenience
  fs.copyFileSync(outputPdf1, outputPdf2);
  console.log(`Copied to: ${outputPdf2}`);
} else {
  console.error('Failed to generate PDF file.');
  process.exit(1);
}
