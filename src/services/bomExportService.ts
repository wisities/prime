import * as XLSX from 'xlsx';
import saveAs from 'file-saver';
import { ProposalData, TorScopeItem } from '../types/proposal';
import { BomItem, BomRateCardItem, BomCategorySummary } from '../types/bom';

export const BOM_CATEGORIES = [
  'งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ',
  'งานวิเคราะห์และออกแบบสถาปัตยกรรม',
  'งานโครงสร้างพื้นฐานและคลาวด์',
  'งานทดสอบและประเมินความมั่นคงปลอดภัย',
  'งานจัดกิจกรรม ประชุม สัมมนา และอีเวนต์',
  'งานฝึกอบรม ถ่ายทอดความรู้ และจัดทำคู่มือ',
  'งานประชาสัมพันธ์ สื่อ และมัลติมีเดีย',
  'งานศึกษา สำรวจ วิจัย และรวบรวมข้อมูล',
  'งานที่ปรึกษา วิเคราะห์ และกำหนดนโยบาย',
  'งานบริหารโครงการ ติดตาม และตรวจรับงาน',
  'งานสิทธิ์การใช้งานซอฟต์แวร์และเครื่องมือ',
  'ค่าใช้จ่ายดำเนินงานและค่าใช้จ่ายอื่นๆ',
] as const;

export const BOM_UNITS = [
  'วัน-คน (Man-Day)',
  'เดือน-คน (Man-Month)',
  'ครั้ง / การจัดงาน (Session/Event)',
  'รุ่น (Batch/Cohort)',
  'คน / ผู้เข้าร่วม (Person)',
  'ชุด (Set)',
  'ระบบย่อย (Subsystem)',
  'ชิ้น / สื่อ (Piece/Deliverable)',
  'สิทธิ์ (License)',
  'งวดงาน (Milestone)',
  'เหมาจ่าย (Lump Sum)',
] as const;

export const STANDARD_RATE_CARD: BomRateCardItem[] = [
  {
    role: 'Project Manager (ผู้จัดการโครงการ)',
    level: 'ผู้เชี่ยวชาญระดับสูง (Senior Specialist)',
    standardRatePerDay: 5500,
    standardRatePerMonth: 110000,
    description: 'บริหารจัดการโครงการ ติดตามแผนงาน ควบคุมงบประมาณ และประสานงานคณะกรรมการตรวจรับ',
  },
  {
    role: 'Solution Architect (สถาปนิกโซลูชัน)',
    level: 'ผู้เชี่ยวชาญระดับสูง (Principal Architect)',
    standardRatePerDay: 6500,
    standardRatePerMonth: 130000,
    description: 'ออกแบบสถาปัตยกรรมระบบ คลาวด์ และโครงสร้างฐานข้อมูลตามมาตรฐานความมั่นคงปลอดภัย',
  },
  {
    role: 'Strategic & Policy Consultant (ที่ปรึกษานโยบาย/ยุทธศาสตร์)',
    level: 'ผู้เชี่ยวชาญระดับสูง (Lead Consultant)',
    standardRatePerDay: 6000,
    standardRatePerMonth: 120000,
    description: 'ให้คำปรึกษาเชิงยุทธศาสตร์ ออกแบบกระบวนการทำงาน (BPR) และจัดทำข้อเสนอเชิงนโยบาย',
  },
  {
    role: 'Lead Software Engineer (วิศวกรซอฟต์แวร์อาวุโส)',
    level: 'วิศวกรระดับอาวุโส (Lead Developer)',
    standardRatePerDay: 5000,
    standardRatePerMonth: 100000,
    description: 'พัฒนาแกนระบบ ออกแบบ API และควบคุมมาตรฐานซอร์สโค้ด (Clean Code & Security)',
  },
  {
    role: 'Senior Full-Stack Developer (นักพัฒนาระบบ)',
    level: 'วิศวกรระดับกลาง-สูง (Senior Developer)',
    standardRatePerDay: 4500,
    standardRatePerMonth: 90000,
    description: 'พัฒนาฟังก์ชัน Web Portal, หน้าบ้าน-หลังบ้าน และเชื่อมโยงฐานข้อมูล',
  },
  {
    role: 'DevOps & Cloud Engineer (วิศวกรคลาวด์)',
    level: 'วิศวกรระบบเฉพาะทาง (Specialist)',
    standardRatePerDay: 5000,
    standardRatePerMonth: 100000,
    description: 'จัดทำ CI/CD Pipeline, Kubernetes Cluster, ระบบ Monitoring และสำรองข้อมูล',
  },
  {
    role: 'QA & Security Specialist (ผู้เชี่ยวชาญทดสอบและความปลอดภัย)',
    level: 'วิศวกรทดสอบระบบ (Security Tester)',
    standardRatePerDay: 4500,
    standardRatePerMonth: 90000,
    description: 'ทดสอบ Functional Test, Performance Stress Test และทดสอบเจาะระบบ (PenTest)',
  },
  {
    role: 'Keynote Speaker / Trainer (วิทยากรผู้เชี่ยวชาญพิเศษ)',
    level: 'วิทยากรชำนาญการ (Professional Trainer)',
    standardRatePerDay: 4500,
    standardRatePerMonth: 90000,
    description: 'บรรยายถ่ายทอดองค์ความรู้ จัดการฝึกอบรมเชิงปฏิบัติการ และถ่ายทอดเทคโนโลยี',
  },
  {
    role: 'Researcher & Data Analyst (นักวิจัย/วิเคราะห์ข้อมูลสำรวจ)',
    level: 'นักวิจัยระดับอาวุโส (Senior Analyst)',
    standardRatePerDay: 3800,
    standardRatePerMonth: 76000,
    description: 'ออกแบบเครื่องมือสำรวจ ดำเนินการวิจัย เก็บข้อมูลภาคสนาม และวิเคราะห์ผลทางสถิติ',
  },
  {
    role: 'UI/UX & Creative Designer (นักออกแบบสื่อและประสบการณ์ผู้ใช้)',
    level: 'นักออกแบบระดับอาวุโส (Senior Designer)',
    standardRatePerDay: 3800,
    standardRatePerMonth: 76000,
    description: 'ออกแบบ Wireframe, สื่ออินโฟกราฟิก, ภาพกราฟิกประชาสัมพันธ์ และสื่อนำเสนอโครงการ',
  },
  {
    role: 'Event Organizer & Coordinator (เจ้าหน้าที่จัดกิจกรรมและประสานงาน)',
    level: 'เจ้าหน้าที่ผู้ประสานงาน (Event Coordinator)',
    standardRatePerDay: 2800,
    standardRatePerMonth: 56000,
    description: 'ประสานงานสถานที่ เตรียมการประชุม/สัมมนา ดูแลการลงทะเบียน และอำนวยความสะดวกในงาน',
  },
  {
    role: 'Training & Support Specialist (วิทยากรผู้ช่วยและสนับสนุนงาน)',
    level: 'เจ้าหน้าที่ผู้เชี่ยวชาญ (Specialist)',
    standardRatePerDay: 3200,
    standardRatePerMonth: 64000,
    description: 'จัดทำคู่มือการใช้งานระบบ ฝึกอบรมบุคลากร และเปิดระบบ Helpdesk Support',
  },
];

// Helper to determine category from scope item text
export function detectCategoryFromScope(item: TorScopeItem): string {
  const text = `${item.title} ${item.requirement} ${item.proposedMethodology || ''} ${item.toolsAndTechnology || ''}`.toLowerCase();

  // 1. จัดกิจกรรม / สัมมนา / ประชุม / อีเวนต์
  if (
    text.includes('จัดกิจกรรม') ||
    text.includes('จัดงาน') ||
    text.includes('สัมมนา') ||
    text.includes('ประชุม') ||
    text.includes('อีเวนต์') ||
    text.includes('event') ||
    text.includes('workshop') ||
    text.includes('นิทรรศการ') ||
    text.includes('แถลงข่าว')
  ) {
    return 'งานจัดกิจกรรม ประชุม สัมมนา และอีเวนต์';
  }

  // 2. ฝึกอบรม / ถ่ายทอดความรู้ / คู่มือ
  if (
    text.includes('อบรม') ||
    text.includes('training') ||
    text.includes('ถ่ายทอดความรู้') ||
    text.includes('คู่มือ') ||
    text.includes('วิทยากร') ||
    text.includes('e-learning') ||
    text.includes('หลักสูตร')
  ) {
    return 'งานฝึกอบรม ถ่ายทอดความรู้ และจัดทำคู่มือ';
  }

  // 3. ประชาสัมพันธ์ / สื่อ / วิดีโอ / PR
  if (
    text.includes('ประชาสัมพันธ์') ||
    text.includes('สื่อ') ||
    text.includes('วิดีโอ') ||
    text.includes('video') ||
    text.includes('infographic') ||
    text.includes('pr') ||
    text.includes('campaign') ||
    text.includes('เผยแพร่') ||
    text.includes('แคมเปญ')
  ) {
    return 'งานประชาสัมพันธ์ สื่อ และมัลติมีเดีย';
  }

  // 4. สำรวจ / วิจัย / แบบสอบถาม / รวบรวมข้อมูล
  if (
    text.includes('สำรวจ') ||
    text.includes('แบบสอบถาม') ||
    text.includes('วิจัย') ||
    text.includes('survey') ||
    text.includes('focus group') ||
    text.includes('รวบรวมข้อมูล') ||
    text.includes('เก็บข้อมูล') ||
    text.includes('ประเมินผล')
  ) {
    return 'งานศึกษา สำรวจ วิจัย และรวบรวมข้อมูล';
  }

  // 5. ที่ปรึกษา / นโยบาย / แผนแม่บท
  if (
    text.includes('ที่ปรึกษา') ||
    text.includes('แผนแม่บท') ||
    text.includes('master plan') ||
    text.includes('policy') ||
    text.includes('นโยบาย') ||
    text.includes('ยุทธศาสตร์') ||
    text.includes('consult') ||
    text.includes('bpr')
  ) {
    return 'งานที่ปรึกษา วิเคราะห์ และกำหนดนโยบาย';
  }

  // 6. โครงสร้างพื้นฐาน / คลาวด์ / เซิร์ฟเวอร์
  if (
    text.includes('คลาวด์') ||
    text.includes('cloud') ||
    text.includes('hosting') ||
    text.includes('server') ||
    text.includes('infra') ||
    text.includes('kubernetes') ||
    text.includes('docker') ||
    text.includes('ฮาร์ดแวร์')
  ) {
    return 'งานโครงสร้างพื้นฐานและคลาวด์';
  }

  // 7. สถาปัตยกรรม / ออกแบบ UX/UI
  if (
    text.includes('สถาปัตยกรรม') ||
    text.includes('architecture') ||
    text.includes('ออกแบบ') ||
    text.includes('ux') ||
    text.includes('ui') ||
    text.includes('design')
  ) {
    return 'งานวิเคราะห์และออกแบบสถาปัตยกรรม';
  }

  // 8. ทดสอบ / ความมั่นคงปลอดภัย
  if (
    text.includes('ทดสอบ') ||
    text.includes('test') ||
    text.includes('qa') ||
    text.includes('security') ||
    text.includes('pentest') ||
    text.includes('ปลอดภัย') ||
    text.includes('ช่องโหว่')
  ) {
    return 'งานทดสอบและประเมินความมั่นคงปลอดภัย';
  }

  // 9. สิทธิ์การใช้งานซอฟต์แวร์
  if (
    text.includes('สิทธิ์') ||
    text.includes('license') ||
    text.includes('saas') ||
    text.includes('subscription')
  ) {
    return 'งานสิทธิ์การใช้งานซอฟต์แวร์และเครื่องมือ';
  }

  // 10. บริหารโครงการ / ติดตาม / รับประกัน
  if (
    text.includes('บริหารโครงการ') ||
    text.includes('pm') ||
    text.includes('บำรุงรักษา') ||
    text.includes('warranty') ||
    text.includes('helpdesk')
  ) {
    return 'งานบริหารโครงการ ติดตาม และตรวจรับงาน';
  }

  // Default
  return 'งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ';
}

// Helper to get standard rate for a role
export function getStandardRateForRole(roleName: string): number {
  const trimmed = (roleName || '').toLowerCase();
  if (trimmed.includes('consult') || trimmed.includes('ที่ปรึกษา')) return 6000;
  if (trimmed.includes('architect') || trimmed.includes('สถาปนิก')) return 6500;
  if (trimmed.includes('project manager') || trimmed.includes('pm') || trimmed.includes('ผู้จัดการ')) return 5500;
  if (trimmed.includes('lead') || trimmed.includes('devops') || trimmed.includes('cloud')) return 5000;
  if (trimmed.includes('security') || trimmed.includes('qa') || trimmed.includes('developer') || trimmed.includes('วิศวกร')) return 4500;
  if (trimmed.includes('speaker') || trimmed.includes('วิทยากร')) return 4500;
  if (trimmed.includes('research') || trimmed.includes('วิจัย') || trimmed.includes('สำรวจ')) return 3800;
  if (trimmed.includes('design') || trimmed.includes('ui') || trimmed.includes('ux') || trimmed.includes('creative') || trimmed.includes('สื่อ')) return 3800;
  if (trimmed.includes('train') || trimmed.includes('อบรม')) return 3200;
  if (trimmed.includes('organizer') || trimmed.includes('จัดงาน') || trimmed.includes('ประสานงาน') || trimmed.includes('กิจกรรม')) return 2800;
  return 4500; // Default Standard Rate
}

// Generate Initial BOM Items from Scope Items
export function generateInitialBomItems(proposal: ProposalData): BomItem[] {
  const scopeItems = proposal.section1?.scopeItems || [];
  if (scopeItems.length === 0) {
    return [
      {
        id: 'bom-1',
        clauseNumber: 'ข้อ 1',
        title: 'งานวิเคราะห์และพัฒนาระบบตามขอบเขตงาน',
        category: 'งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ',
        responsibleRole: 'Lead Software Engineer',
        quantity: 20,
        unit: 'วัน-คน (Man-Day)',
        unitRate: 5000,
        totalPrice: 100000,
        deliverable: 'Source Code และระบบงาน',
      },
    ];
  }

  return scopeItems.map((item, idx) => {
    const category = detectCategoryFromScope(item);
    const role = item.responsibleRole || 'Senior Software Engineer';
    const unitRate = getStandardRateForRole(role);
    
    // Default quantity derived from durationDays or durationWeeks (defaulting to reasonable man-days)
    let quantity = Math.max(5, item.durationDays || (item.durationWeeks ? item.durationWeeks * 5 : 10));
    if (item.level === 1) {
      quantity = Math.max(3, Math.round(quantity * 0.4)); // level 1 high-level tasks have fewer direct dev days
    }

    const totalPrice = quantity * unitRate;

    return {
      id: `bom-${item.id || idx + 1}`,
      scopeId: item.id,
      clauseNumber: item.clauseNumber || `ข้อ ${idx + 1}`,
      title: item.title || item.requirement || `ขอบเขตงานข้อที่ ${idx + 1}`,
      category,
      responsibleRole: role,
      quantity,
      unit: 'วัน-คน (Man-Day)',
      unitRate,
      totalPrice,
      deliverable: item.deliverable || 'เอกสารผลงานและระบบที่พัฒนาแล้วเสร็จ',
      notes: item.complianceNote || '',
    };
  });
}

// Auto-allocate budget to match project budget exactly
export function autoAllocateBomBudget(
  items: BomItem[],
  targetBudget: number,
  overheadProfitPct: number = 15,
  vatPct: number = 7
): BomItem[] {
  if (items.length === 0 || targetBudget <= 0) return items;

  // targetBudget = (DirectCost * (1 + overheadProfitPct/100)) * (1 + vatPct/100)
  // Therefore: Target Direct Cost = targetBudget / ((1 + overheadProfitPct/100) * (1 + vatPct/100))
  const multiplier = (1 + overheadProfitPct / 100) * (1 + vatPct / 100);
  const targetDirectCost = Math.round(targetBudget / multiplier);

  const currentTotal = items.reduce((acc, cur) => acc + cur.totalPrice, 0);
  if (currentTotal <= 0) return items;

  const ratio = targetDirectCost / currentTotal;

  return items.map((item) => {
    // Pro-rate the quantity (keeping unitRate standard)
    const newQuantity = Math.max(1, Math.round(item.quantity * ratio));
    const newTotalPrice = newQuantity * item.unitRate;
    return {
      ...item,
      quantity: newQuantity,
      totalPrice: newTotalPrice,
    };
  });
}

// Calculate summaries by category
export function calculateCategorySummaries(items: BomItem[]): BomCategorySummary[] {
  const total = items.reduce((sum, item) => sum + item.totalPrice, 0) || 1;
  const groups: Record<string, { total: number; count: number }> = {};

  items.forEach((item) => {
    const cat = item.category || 'งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ';
    if (!groups[cat]) {
      groups[cat] = { total: 0, count: 0 };
    }
    groups[cat].total += item.totalPrice;
    groups[cat].count += 1;
  });

  return Object.entries(groups).map(([category, data]) => ({
    category,
    totalCost: data.total,
    itemCount: data.count,
    percentage: Math.round((data.total / total) * 100),
  }));
}

// Export workbook with 3 Sheets using XLSX
export async function exportBomToExcel(
  proposal: ProposalData,
  items: BomItem[],
  overheadProfitPct: number = 15,
  vatPct: number = 7
): Promise<void> {
  const wb = XLSX.utils.book_new();

  const directCost = items.reduce((sum, it) => sum + it.totalPrice, 0);
  const overheadProfit = Math.round(directCost * (overheadProfitPct / 100));
  const preVatTotal = directCost + overheadProfit;
  const vatAmount = Math.round(preVatTotal * (vatPct / 100));
  const grandTotal = preVatTotal + vatAmount;
  const budgetAmount = proposal.section1?.budgetAmount || grandTotal;
  const variance = budgetAmount - grandTotal;

  const categorySummaries = calculateCategorySummaries(items);

  // =========================================================================
  // SHEET 1: สรุปงบประมาณโครงการ (BOM Summary)
  // =========================================================================
  const sheet1Data: any[][] = [
    ['ตารางสรุปงบประมาณและถอดแบบต้นทุนโครงการ (BOM & Project Cost Summary)'],
    ['บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด (Prime Digital Consultant Co., Ltd.)'],
    [],
    ['ข้อมูลโครงการ'],
    ['ชื่อโครงการ:', proposal.cover?.projectTitle || '-'],
    ['รหัสเอกสาร / ประกาศ:', proposal.cover?.projectCode || '-'],
    ['หน่วยงานผู้ว่าจ้าง:', `${proposal.cover?.clientAgency || '-'} (${proposal.cover?.clientDepartment || '-'})`],
    ['ผู้เสนอราคา:', proposal.cover?.submitterCompany || 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด'],
    ['วันที่จัดทำข้อเสนอ:', proposal.cover?.submissionDate || new Date().toLocaleDateString('th-TH')],
    ['วงเงินงบประมาณโครงการ (TOR Budget):', budgetAmount, 'บาท'],
    [],
    ['1. สรุปสัดส่วนต้นทุนแยกตามหมวดงาน (Cost Breakdown by Category)'],
    ['ลำดับ', 'หมวดงาน / ขอบเขตงาน', 'จำนวนรายการ', 'มูลค่ารวม (บาท)', 'สัดส่วน (%)'],
  ];

  categorySummaries.forEach((cat, idx) => {
    sheet1Data.push([idx + 1, cat.category, cat.itemCount, cat.totalCost, `${cat.percentage}%`]);
  });

  sheet1Data.push(
    ['', 'รวมต้นทุนตรงตามขอบเขตงาน (Direct Cost)', items.length, directCost, '100%'],
    [],
    ['2. สรุปยอดรวมประมาณการราคาและการเสนอราคา (Price Summary)'],
    ['รายการ', 'สูตรการคำนวณ', 'มูลค่า (บาท)', 'หมายเหตุ'],
    ['1. รวมต้นทุนดำเนินงานตรง (Direct Cost)', 'SUM(ขอบเขตงานทุกข้อ)', directCost, 'ต้นทุนค่าแรงบุคลากรและเครื่องมือ'],
    [`2. ค่าบริหารจัดการและกำไรดำเนินงาน (Overhead & Profit ${overheadProfitPct}%)`, `Direct Cost * ${overheadProfitPct}%`, overheadProfit, 'ค่าบริหารจัดการโครงการ ประกัน และกำไร'],
    ['รวมราคาค่าจ้างก่อนภาษีมูลค่าเพิ่ม (Subtotal)', 'Direct Cost + Overhead', preVatTotal, 'ราคาสุทธิก่อนภาษี'],
    [`3. ภาษีมูลค่าเพิ่ม (VAT ${vatPct}%)`, `Subtotal * ${vatPct}%`, vatAmount, 'ภาษีมูลค่าเพิ่มตามกฎหมาย'],
    ['รวมราคาสุทธิที่เสนอ (Grand Total)', 'Subtotal + VAT', grandTotal, 'ราคาเสนอตามข้อเสนอโครงการ'],
    [],
    ['3. การเปรียบเทียบกับวงเงินงบประมาณที่ตั้งไว้'],
    ['วงเงินงบประมาณจัดจ้าง (TOR Budget):', '', budgetAmount, 'บาท'],
    ['ราคาเสนอรวมทั้งสิ้น (Grand Total):', '', grandTotal, 'บาท'],
    ['ส่วนต่างงบประมาณคงเหลือ (Variance):', '', variance, variance >= 0 ? 'อยู่ในกรอบวงเงินงบประมาณ' : 'เกินวงเงินงบประมาณ']
  );

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Set Column Widths for Sheet 1
  ws1['!cols'] = [
    { wch: 8 },  // ลำดับ / หัวข้อ
    { wch: 45 }, // ชื่อหมวด / รายการ
    { wch: 20 }, // จำนวนรายการ / สูตร
    { wch: 22 }, // มูลค่ารวม
    { wch: 35 }, // หมายเหตุ / สัดส่วน
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'สรุปงบประมาณ (Summary)');

  // =========================================================================
  // SHEET 2: รายละเอียดถอดแบบงาน BOM (BOM Breakdown)
  // =========================================================================
  const sheet2Data: any[][] = [
    ['ตารางรายละเอียดถอดแบบปริมาณงานและราคา (Bill of Materials - BOM Breakdown)'],
    [`โครงการ: ${proposal.cover?.projectTitle || ''} | รหัส: ${proposal.cover?.projectCode || ''}`],
    [],
    [
      'ลำดับ',
      'ข้อกำหนด TOR',
      'รายการขอบเขตงาน / กิจกรรม',
      'หมวดงาน',
      'ตำแหน่งผู้รับผิดชอบ',
      'ปริมาณงาน',
      'หน่วยนับ',
      'ราคาต่อหน่วย (บาท)',
      'ราคารวม (บาท)',
      'สิ่งส่งมอบตาม TOR (Deliverables)',
      'หมายเหตุ',
    ],
  ];

  items.forEach((item, idx) => {
    sheet2Data.push([
      idx + 1,
      item.clauseNumber,
      item.title,
      item.category,
      item.responsibleRole,
      item.quantity,
      item.unit,
      item.unitRate,
      item.totalPrice,
      item.deliverable || '-',
      item.notes || '-',
    ]);
  });

  sheet2Data.push(
    [],
    ['', '', '', '', 'รวมต้นทุนตรงทั้งสิ้น (Direct Cost Total):', '', '', '', directCost, '', ''],
    ['', '', '', '', `ค่าบริหารจัดการและกำไร (${overheadProfitPct}%):`, '', '', '', overheadProfit, '', ''],
    ['', '', '', '', `ภาษีมูลค่าเพิ่ม (${vatPct}%):`, '', '', '', vatAmount, '', ''],
    ['', '', '', '', 'ยอดรวมสุทธิ (Grand Total THB):', '', '', '', grandTotal, '', '']
  );

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

  // Set Column Widths for Sheet 2
  ws2['!cols'] = [
    { wch: 6 },  // ลำดับ
    { wch: 14 }, // ข้อกำหนด TOR
    { wch: 45 }, // ชื่องาน
    { wch: 28 }, // หมวดงาน
    { wch: 26 }, // ตำแหน่ง
    { wch: 12 }, // ปริมาณ
    { wch: 18 }, // หน่วยนับ
    { wch: 18 }, // ราคาต่อหน่วย
    { wch: 20 }, // ราคารวม
    { wch: 35 }, // สิ่งส่งมอบ
    { wch: 30 }, // หมายเหตุ
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'ถอดแบบงาน (BOM Detail)');

  // =========================================================================
  // SHEET 3: อัตรากำลังคนมาตรฐาน Rate Card (ICT Rate Card)
  // =========================================================================
  const sheet3Data: any[][] = [
    ['บัญชีอัตราค่าบริการบุคลากรเทคโนโลยีสารสนเทศมาตรฐาน (ICT Standard Rate Card)'],
    ['อ้างอิงเกณฑ์มาตรฐานอัตราค่าบริการวิชาชีพและราคากลางงานพัฒนาระบบเทคโนโลยีสารสนเทศภาครัฐ'],
    [],
    ['ลำดับ', 'ตำแหน่งหน้าที่ (Professional Role)', 'ระดับความเชี่ยวชาญ', 'อัตราต่อวัน (บาท/วัน)', 'อัตราต่อเดือน (บาท/เดือน)', 'ขอบเขตหน้าที่ความรับผิดชอบหลัก'],
  ];

  STANDARD_RATE_CARD.forEach((rc, idx) => {
    sheet3Data.push([
      idx + 1,
      rc.role,
      rc.level,
      rc.standardRatePerDay,
      rc.standardRatePerMonth,
      rc.description,
    ]);
  });

  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);

  ws3['!cols'] = [
    { wch: 6 },  // ลำดับ
    { wch: 36 }, // ตำแหน่ง
    { wch: 28 }, // ระดับ
    { wch: 20 }, // อัตราต่อวัน
    { wch: 22 }, // อัตราต่อเดือน
    { wch: 60 }, // หน้าที่
  ];

  XLSX.utils.book_append_sheet(wb, ws3, 'บัญชีราคา (Rate Card)');

  // Generate and download Excel file
  const safeCode = (proposal.cover?.projectCode || 'PDC').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_');
  const safeTitle = (proposal.cover?.projectTitle || 'Project').replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_').substring(0, 30);
  const fileName = `BOM_${safeCode}_${safeTitle}.xlsx`;

  try {
    XLSX.writeFile(wb, fileName);
  } catch (err) {
    console.warn('XLSX.writeFile failed, falling back to Blob saveAs', err);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(dataBlob, fileName);
  }
}
