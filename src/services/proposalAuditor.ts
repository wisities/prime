import { ProposalData, AuditIssue } from '../types/proposal';

const COMMON_THAI_SPELLING_RULES = [
  { wrong: 'ลายเซ็นต์', right: 'ลายเซ็น หรือ ลายมือชื่อ', reason: 'คำที่ถูกต้องคือ "ลายเซ็น" ไม่ต้องมีทัณฑฆาตบน ต์' },
  { wrong: 'เซ็นต์สัญญา', right: 'ลงนามในสัญญา หรือ เซ็นสัญญา', reason: 'ภาษาทางการราชการควรใช้ "ลงนามในสัญญา"' },
  { wrong: 'เวปไซต์', right: 'เว็บไซต์', reason: 'คำทับศัพท์ Website เขียนว่า "เว็บไซต์" (บ.ใบไม้ และ ต.เต่า)' },
  { wrong: 'เวบไซต์', right: 'เว็บไซต์', reason: 'คำทับศัพท์ Website เขียนว่า "เว็บไซต์"' },
  { wrong: 'อีเมลล์', right: 'อีเมล', reason: 'คำทับศัพท์ Email เขียนว่า "อีเมล" (ล.ลิง ตัวเดียว ไม่มีการันต์)' },
  { wrong: 'สัมนา', right: 'สัมมนา', reason: 'เขียนด้วย ม.ม้า สองตัว "สัมมนา"' },
  { wrong: 'โควต้า', right: 'โควตา', reason: 'เขียนว่า "โควตา" ไม่มีไม้โท' },
  { wrong: 'ผูกพันธ์', right: 'ผูกพัน', reason: 'นิติสัมพันธ์หรือข้อผูกพันตามสัญญา เขียนว่า "ผูกพัน" (ไม่มี ธ์)' },
  { wrong: 'กฏหมาย', right: 'กฎหมาย', reason: 'ใช้ ฎ.ชฎา เขียนว่า "กฎหมาย"' },
  { wrong: 'กบฎ', right: 'กบฏ', reason: 'ใช้ ฏ.ปฏัก' },
  { wrong: 'มงกุฏ', right: 'มงกุฎ', reason: 'ใช้ ฎ.ชฎา' },
  { wrong: 'อัฟเดท', right: 'อัปเดต', reason: 'คำทับศัพท์ Update เขียนว่า "อัปเดต"' },
  { wrong: 'แพลตฟอร์มมิ่ง', right: 'แพลตฟอร์ม', reason: 'คำทับศัพท์ Platform เขียนว่า "แพลตฟอร์ม"' },
];

export function runRuleBasedAudit(data: ProposalData): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const currentYearBE = 2568;

  const scopeItems = data.section1?.scopeItems || [];
  const milestones = data.section2?.milestones || [];

  // 1. ตรวจสอบความสอดคล้องของระยะเวลาโครงการ (Section 1 Scope Items vs Duration Months)
  const maxItemMonth = Math.max(
    ...scopeItems.map((item) => {
      const durationWeeks = Math.max(1, Math.round((item.durationDays || 7) / 7));
      const endWeek = ((item.startMonth || 1) - 1) * 4 + (item.startWeek || 1) + durationWeeks - 1;
      return Math.ceil(endWeek / 4);
    }),
    0
  );

  if (maxItemMonth > (data.section1?.projectDurationMonths || 6)) {
    issues.push({
      id: 'cons-1',
      category: 'consistency',
      severity: 'error',
      section: 'ส่วนที่ 1 & 2: กำหนดการและ Gantt Chart',
      message: 'ระยะเวลาในกำหนดการ TOR เกินระยะเวลาโครงการที่ระบุไว้ในบทนำ',
      detail: `ในส่วนที่ 1 กำหนดไว้ ${data.section1?.projectDurationMonths} เดือน แต่มีงานตาม TOR สิ้นสุดถึงเดือนที่ ${maxItemMonth} โปรดปรับลดจำนวนวันทำงานหรือขยายระยะเวลาโครงการในบทนำ`,
    });
  }

  // 2. ตรวจสอบยอดเงินงวดงาน (Milestones) vs วงเงินงบประมาณ
  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
  const totalPercentage = milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);

  if (totalPercentage !== 100) {
    issues.push({
      id: 'cons-2',
      category: 'consistency',
      severity: 'warning',
      section: 'ส่วนที่ 2: งวดงานและการจ่ายเงิน',
      message: `ร้อยละของงวดงานรวมกันได้ ${totalPercentage}% (ควรครบ 100%)`,
      detail: 'งวดงานทั้งหมดควรรวมกันได้ 100% พอดีเพื่อให้สอดคล้องกับงวดเบิกจ่ายสัญญาจ้างภาครัฐ',
    });
  }

  if (Math.abs(totalMilestoneAmount - (data.section1?.budgetAmount || 0)) > 100) {
    issues.push({
      id: 'cons-3',
      category: 'consistency',
      severity: 'warning',
      section: 'ส่วนที่ 2: งวดงานและการจ่ายเงิน',
      message: 'ยอดเงินรวมทุกงวดงานไม่ตรงกับวงเงินงบประมาณโครงการ',
      detail: `วงเงินในบทนำคือ ${data.section1.budgetAmount.toLocaleString()} บาท แต่ยอดรวมของงวดงานคือ ${totalMilestoneAmount.toLocaleString()} บาท`,
    });
  }

  // 3. ตรวจสอบความครบถ้วนของ Scope Items (Section 1 & 3)
  if (scopeItems.length === 0) {
    issues.push({
      id: 'comp-1',
      category: 'completeness',
      severity: 'error',
      section: 'ส่วนที่ 1: ขอบเขตงาน TOR',
      message: 'ยังไม่มีการป้อนรายการขอบเขตงานตามประกาศจัดจ้างของหน่วยงาน',
      detail: 'จำเป็นต้องเพิ่มข้อกำหนดขอบเขตงานอย่างน้อย 1 ข้อ พร้อมระบุช่วงเวลาและวิธีการดำเนินงาน',
    });
  } else {
    scopeItems.forEach((item) => {
      const hasMethodology = (item.proposedMethodology || '').trim().length > 0;
      if (!hasMethodology) {
        issues.push({
          id: `comp-method-${item.id}`,
          category: 'completeness',
          severity: 'error',
          section: 'ส่วนที่ 3.2: วิธีการดำเนินงาน',
          message: `${item.clauseNumber} (${item.title}) ยังไม่ได้กรอกรายละเอียดวิธีการดำเนินงาน`,
          detail: 'หัวข้อ 3.2 ต้องมีอย่างน้อยเป็นข้อความในช่องรายละเอียดวิธีการดำเนินงาน (ส่วนรูปภาพจะมีหรือไม่ก็ได้)',
        });
      }
    });
  }

  // 4. ตรวจสอบเงื่อนไขปีผลงานบริษัท (Section 5)
  const maxYears = data.section5.maxYearsFilter;
  const minAllowedYearBE = currentYearBE - maxYears;
  const invalidYearProjects = data.section5.pastProjects.filter(
    (p) => p.isSelected && p.completionYearBE < minAllowedYearBE
  );

  if (invalidYearProjects.length > 0) {
    issues.push({
      id: 'cons-year',
      category: 'consistency',
      severity: 'warning',
      section: 'ส่วนที่ 5: ประสบการณ์ของบริษัท',
      message: `มีผลงานที่เลือกไว้เก่ากว่าเกณฑ์ย้อนหลัง ${maxYears} ปี (ต่ำกว่าปี พ.ศ. ${minAllowedYearBE})`,
      detail: `พบ ${invalidYearProjects.length} โครงการ เช่น "${invalidYearProjects[0].projectName}" (แล้วเสร็จปี ${invalidYearProjects[0].completionYearBE}) หาก TOR จำกัดผลงานไม่เกิน ${maxYears} ปี อาจถูกตัดสิทธิ์`,
    });
  }

  // ตรวจสอบการแนบไฟล์สำเนาสัญญา/หนังสือรับรองผลงานสำหรับผลงานอ้างอิงหลัก
  const missingCertProjects = data.section5.pastProjects.filter(
    (p) => p.isSelected && (p.projectType || 'tor_reference') === 'tor_reference' && !p.certificateFileUrl
  );
  if (missingCertProjects.length > 0) {
    issues.push({
      id: 'comp-cert',
      category: 'completeness',
      severity: 'info',
      section: 'ส่วนที่ 5: ประสบการณ์ของบริษัท',
      message: `ผลงานอ้างอิงหลัก ${missingCertProjects.length} โครงการ ยังไม่ได้แนบไฟล์สำเนาสัญญาหรือหนังสือรับรองผลงาน`,
      detail: `โครงการ เช่น "${missingCertProjects[0].projectName}" ควรแนบไฟล์สำเนาสัญญา/หนังสือรับรองผลงานเพื่อให้นำไปจัดพิมพ์ในภาคผนวก ก ของเล่มข้อเสนอตามเกณฑ์ TOR`,
    });
  }

  // 5. ตรวจสอบบุคลากรและทีมงาน (Section 4)
  if (data.section4.teamMembers.length < 3) {
    issues.push({
      id: 'comp-team',
      category: 'completeness',
      severity: 'warning',
      section: 'ส่วนที่ 4: คณะผู้ดำเนินงาน',
      message: 'จำนวนคณะผู้ดำเนินงานมีน้อยกว่า 3 ท่าน',
      detail: 'โครงการภาครัฐมักต้องการบุคลากรหลักครบถ้วน เช่น ผู้จัดการโครงการ, นักวิเคราะห์ระบบ, สถาปนิก หรือผู้เชี่ยวชาญด้านความปลอดภัย',
    });
  }

  // 6. ตรวจคำผิดภาษาไทยอัตโนมัติ (Spelling Scan)
  const allTexts: { section: string; text: string }[] = [
    { section: 'ส่วนที่ 1: บทนำ', text: `${data.section1.background} ${data.section1.projectScopeOverview}` },
    { section: 'ส่วนที่ 1 & 3: ขอบเขตงานและวิธีการ', text: data.section1.scopeItems.map((s) => `${s.requirement} ${s.proposedMethodology} ${s.title}`).join(' ') },
    { section: 'ส่วนที่ 2: แผนงาน', text: data.section2.workPlanOverview },
    { section: 'ส่วนที่ 4: ความเสี่ยง', text: data.section4.riskItems.map((r) => `${r.riskTitle} ${r.mitigationPlan}`).join(' ') },
  ];

  COMMON_THAI_SPELLING_RULES.forEach((rule) => {
    allTexts.forEach((item) => {
      if (item.text.includes(rule.wrong)) {
        issues.push({
          id: `spell-${rule.wrong}-${item.section}`,
          category: 'spelling',
          severity: 'info',
          section: item.section,
          message: `พบคำที่อาจสะกดผิดหรือควรปรับเป็นภาษาทางการ: "${rule.wrong}"`,
          detail: `ควรพิจารณาเปลี่ยนเป็น "${rule.right}" (${rule.reason})`,
        });
      }
    });
  });

  return issues;
}

export async function runGeminiDeepAudit(
  data: ProposalData,
  apiKey: string
): Promise<AuditIssue[]> {
  if (!apiKey) {
    throw new Error('กรุณาระบุ Gemini API Key สำหรับการวิเคราะห์เชิงลึก');
  }

  const prompt = `
คุณคือผู้เชี่ยวชาญการตรวจประเมินข้อเสนอโครงการจัดจ้างภาครัฐ (Government Proposal Specialist & Senior Auditor) ของประเทศไทย
โปรดตรวจทานเนื้อหาข้อเสนอโครงการต่อไปนี้ โดยเน้นเฉพาะ:
1. การสะกดคำผิด (Spelling & Typo errors) ทั้งภาษาไทยและภาษาอังกฤษ
2. ความสอดคล้องระหว่างข้อกำหนด TOR กับแนวคิดและวิธีการดำเนินงานที่บริษัทเสนอ (Consistency & Compliance Check)
3. ความสมบูรณ์และภาษาทางการที่เหมาะสมกับงานราชการ

ข้อมูลโครงการ:
- ชื่อโครงการ: ${data.cover.projectTitle}
- หน่วยงานผู้ว่าจ้าง: ${data.cover.clientAgency}
- วงเงินงบประมาณ: ${data.cover.budgetFormatted}
- ระยะเวลา: ${data.section1.projectDurationMonths} เดือน (${data.section1.projectDurationDays} วัน)

รายการขอบเขตงาน TOR และวิธีการที่เสนอ (ทั้งหมด ${data.section1.scopeItems.length} ข้อ มีโครงสร้างระดับ 1-5):
${data.section1.scopeItems
  .map(
    (item) => `[ระดับ ${item.level}] ${item.clauseNumber}: ${item.title}
- ข้อกำหนด TOR: ${item.requirement}
- กำหนดการ: เริ่มเดือนที่ ${item.startMonth} สัปดาห์ W${item.startWeek} (${item.durationDays} วัน)
- วิธีการที่เสนอ: ${item.proposedMethodology}
- เครื่องมือ: ${item.toolsAndTechnology}
- ผลส่งมอบ: ${item.deliverable}`
  )
  .join('\n\n')}

ผลงานและประสบการณ์บริษัทที่เลือกอ้างอิง:
${data.section5.pastProjects
  .filter((p) => p.isSelected)
  .map((p) => `- ${p.projectName} (${p.clientName}) เสร็จปี พ.ศ. ${p.completionYearBE} มูลค่า ${p.contractValue.toLocaleString()} บาท`)
  .join('\n')}

โปรดตอบกลับในรูปแบบ JSON Array เท่านั้น ตามโครงสร้างนี้:
[
  {
    "category": "spelling" | "consistency" | "completeness" | "suggestion",
    "severity": "info" | "warning" | "error",
    "section": "ชื่อส่วนที่พบ",
    "message": "สรุปสั้นๆ 1 บรรทัด",
    "detail": "คำอธิบายและแนวทางแก้ไขที่ชัดเจน"
  }
]
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `API error ${response.status}`);
  }

  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return parsed.map((item: any, idx: number) => ({
      ...item,
      id: `gemini-${idx}`,
    }));
  } catch (e) {
    console.error('Failed to parse Gemini audit response', e);
    return [];
  }
}
