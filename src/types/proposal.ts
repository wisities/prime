export interface CoverConfig {
  coverImage?: string; // base64
  backCoverImage?: string; // base64
  projectTitle: string;
  projectCode: string;
  clientAgency: string;
  clientDepartment: string;
  submitterCompany: string;
  submitterSubtext: string;
  submissionDate: string;
  budgetFormatted: string;
  includeBackCover: boolean;
  includeTOC: boolean;
}

export type TorImageLayout = 'none' | 'single_centered' | 'two_columns' | 'both';

export interface TorScopeImage {
  url: string; // base64 data URL
  caption: string;
}

export type ReportImageType = 'single' | 'pair';

export interface ReportImageBlock {
  id: string;
  type: ReportImageType; // 'single': ภาพเดี่ยวกว้าง 6 นิ้ว กึ่งกลาง | 'pair': ภาพคู่ 2 คอลัมน์ กว้างคอลัมน์ละ 3 นิ้ว
  // แบบภาพเดี่ยว 6 นิ้ว:
  url?: string;
  caption?: string;
  // แบบภาพคู่ 3 นิ้ว:
  leftUrl?: string;
  leftCaption?: string;
  rightUrl?: string;
  rightCaption?: string;
}

export interface TorScopeItem {
  id: string;
  clauseNumber: string; // e.g. "4.1" or "4.1.2.3.1"
  title: string; // e.g. "การศึกษาและวิเคราะห์ความต้องการระบบ"
  requirement: string; // ข้อความข้อกำหนดตามประกาศจัดจ้างของหน่วยงานรัฐ
  level: number; // 1 to 5 (Level 1: ข้อหลัก, Level 2-5: ข้อย่อยตามลำดับ)
  
  // แผนการดำเนินงานสำหรับ Gantt Chart (สอดคล้องกับส่วนที่ 2)
  startMonth: number; // เดือนที่เริ่ม (1, 2, 3...)
  startWeek: number; // วีคที่เริ่มของเดือน (1, 2, 3, หรือ 4)
  durationDays: number; // ทำงานกี่วัน (เช่น 15 วัน, 30 วัน, 60 วัน)
  durationWeeks?: number; // จำนวนสัปดาห์
  responsibleRole: string; // ผู้รับผิดชอบหลัก
  
  // วิธีการทำงานสำหรับตอบสนอง TOR (สอดคล้องกับส่วนที่ 3)
  proposedMethodology: string; // แนวคิดและวิธีการดำเนินงานที่บริษัทเสนอ
  toolsAndTechnology: string; // เครื่องมือและเทคโนโลยีที่ใช้
  deliverable: string; // ผลลัพธ์หรือสิ่งส่งมอบตามข้อนั้น

  // ภาพประกอบในหัวข้อนี้ (ไม่จำกัดจำนวน: รองรับทั้งภาพเดี่ยว 6 นิ้ว และภาพคู่ 3 นิ้ว)
  imageBlocks?: ReportImageBlock[];

  // ภาพประกอบเดิม (Backward compatibility)
  imageLayout?: TorImageLayout; // 'none' | 'single_centered' | 'two_columns' | 'both'
  singleImage?: TorScopeImage; // แบบที่ 1: ภาพกว้าง 6 นิ้ว วางกึ่งกลาง
  twoColumnImageLeft?: TorScopeImage; // แบบที่ 2: ภาพซ้าย กว้าง 3 นิ้ว
  twoColumnImageRight?: TorScopeImage; // แบบที่ 2: ภาพขวา กว้าง 3 นิ้ว

  // ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR (ส่วนที่ 4)
  complianceStatus?: TorComplianceStatus; // 'comply': 'ยอมรับและดำเนินการตาม TOR' | 'exceed': 'ยอมรับและเสนอแนวทางดีกว่า TOR'
  complianceNote?: string; // คำอธิบายสั้นๆ ในช่องหมายเหตุคอลัมน์ที่ 3
}

export type TorComplianceStatus = 'comply' | 'exceed';

export interface Section1Intro {
  background: string;
  objectives: string[];
  expectedBenefits: string[];
  targetAudience: string;
  projectScopeOverview: string;
  projectDurationDays: number;
  projectDurationMonths: number;
  budgetAmount: number;
  scopeItems: TorScopeItem[]; // ขอบเขตงานเต็มทุกข้อตามประกาศจัดจ้าง
  imageBlocks?: ReportImageBlock[]; // ภาพประกอบในส่วนที่ 1 ไม่จำกัดจำนวน (ทั้งภาพเดี่ยว 6 นิ้ว และภาพคู่ 3 นิ้ว)
}

export interface Milestone {
  id: string;
  installment: number;
  title: string;
  percentage: number;
  amount: number;
  timeframe: string;
  deliverables: string[];
}

export interface Section2WorkPlan {
  workPlanOverview: string;
  milestones: Milestone[];
  imageBlocks?: ReportImageBlock[]; // ภาพประกอบในส่วนที่ 2 ไม่จำกัดจำนวน
}

export interface Section3Methodology {
  frameworkOverview: string;
  conceptualDiagramImage?: string; // base64
  conceptualDiagramCaption: string;
  imageBlocks?: ReportImageBlock[]; // ภาพประกอบกรอบแนวคิดเพิ่มเติมในส่วนที่ 3.1 ไม่จำกัดจำนวน
}

export interface TeamMember {
  id: string;
  name: string;
  proposedRole: string;
  education: string;
  certifications: string;
  experienceYears: number;
  startWorkYearBE?: number; // ปี พ.ศ. ที่เริ่มทำงานสำหรับนับปีประสบการณ์
  responsibilities: string;
  highlightProjects: string;
  photoUrl?: string; // base64 รูปถ่ายหน้าตรงขนาด 1.5 นิ้ว
  personalBio?: string; // ประวัติส่วนตัว / ข้อมูลสรุปประวัติการทำงาน
}

export interface RiskItem {
  id: string;
  category: 'ด้านเทคนิค' | 'ด้านบุคลากร' | 'ด้านระยะเวลา' | 'ด้านขอบเขตงาน' | 'ด้านความปลอดภัย';
  riskTitle: string;
  likelihood: 'ต่ำ' | 'ปานกลาง' | 'สูง';
  impact: 'ต่ำ' | 'ปานกลาง' | 'สูง';
  mitigationPlan: string;
  contingencyPlan: string;
}

export interface Section4TeamAndRisk {
  teamOverview: string;
  teamMembers: TeamMember[];
  riskManagementOverview: string;
  riskItems: RiskItem[];
  complianceMatrixOverview?: string; // คำนำสำหรับตารางเปรียบเทียบข้อเสนอโครงการกับ TOR
  imageBlocks?: ReportImageBlock[]; // ภาพประกอบในส่วนที่ 4 (เช่น แผนผังองค์กร 6 นิ้ว หรือภาพคู่ 3 นิ้ว) ไม่จำกัดจำนวน
}

export type ProjectTrackType = 'tor_reference' | 'supplementary';

export interface PastProject {
  id: string;
  projectName: string;
  clientName: string;
  contractValue: number; // in Baht
  completionYearBE: number; // e.g. 2567
  periodDuration: string; // e.g. "12 เดือน"
  description: string;
  category: string;
  isSelected: boolean;
  projectType?: ProjectTrackType; // 'tor_reference' (ผลงานอ้างอิงหลักตาม TOR) หรือ 'supplementary' (ผลงานเสริมที่สอดคล้อง)
  relevanceNote?: string; // โน้ตกำกับกิจกรรมใดที่สอดคล้องกับงานจ้างโครงการนี้ (สำหรับผลงานเสริม)
  certificateFileUrl?: string; // ภาพสำเนาสัญญาจ้าง หรือใบรับรองผลงาน (สำหรับแทรกในภาคผนวก)
  certificateFileName?: string;
  projectImageUrl?: string; // ภาพประกอบผลงาน / หน้าจอระบบ
  projectImageCaption?: string;
}

export interface Section5Company {
  companyName: string;
  establishedYearBE: number;
  registeredCapital: string;
  companyProfile: string;
  visionMission: string;
  specializations: string[];
  certifications: string[];
  maxYearsFilter: number; // e.g. 3 or 5 years
  companyLogoUrl?: string; // ภาพโลโก้บริษัท
  companyOfficeImageUrl?: string; // ภาพสำนักงานหรืออาคารบริษัท
  companyOfficeImageCaption?: string;
  pastProjects: PastProject[];
  imageBlocks?: ReportImageBlock[]; // ภาพประกอบในส่วนที่ 5 ไม่จำกัดจำนวน
}

export interface HeadingItemConfig {
  id: string; // e.g. "s1_background"
  title: string; // e.g. "ความเป็นมาและความสำคัญ"
  originalCode: string; // e.g. "1.1"
  description?: string; // คำอธิบายขอบเขตเนื้อหา
  enabled: boolean; // true = แสดงในเล่ม, false = ยกเลิก/ซ่อน
  order: number; // ลำดับแสดงผล
}

export interface SectionItemConfig {
  id: string; // e.g. "section1", "section2", etc.
  sectionNumber: string; // e.g. "ส่วนที่ 1"
  title: string; // e.g. "บทนำ ภาพรวมโครงการ และขอบเขตงานตามประกาศจัดจ้าง"
  enabled: boolean; // true = แสดงทั้งส่วน, false = ยกเลิกทั้งส่วน
  order: number; // ลำดับของส่วน
  headings: HeadingItemConfig[];
}

export interface DocumentStructureConfig {
  autoRenumber: boolean; // default true (คำนวณเลข 1.1, 1.2... ตามลำดับและหัวข้อที่เปิดใช้งาน)
  sections: SectionItemConfig[];
}

export interface ProposalData {
  cover: CoverConfig;
  section1: Section1Intro;
  section2: Section2WorkPlan;
  section3: Section3Methodology;
  section4: Section4TeamAndRisk;
  section5: Section5Company;
  documentStructure?: DocumentStructureConfig;
}

export interface AuditIssue {
  id: string;
  category: 'spelling' | 'consistency' | 'completeness' | 'suggestion';
  severity: 'info' | 'warning' | 'error';
  section: string;
  message: string;
  detail: string;
}

export type ProposalStatus = 'draft' | 'submitted' | 'cancelled';

export interface ProjectAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  dataUrl?: string; // base64
  category: 'announcement' | 'tor' | 'other';
}

export interface BiddingProject {
  id: string;
  projectCode: string;
  projectTitle: string;
  clientAgency: string;
  budgetAmount: number;
  egpUrl?: string;
  announcementDate?: string; // วันที่ประกาศจัดจ้าง YYYY-MM-DD
  submissionDeadline?: string; // วันเวลาที่จะต้องยื่นข้อเสนอโครงการในระบบ YYYY-MM-DDTHH:mm
  status: ProposalStatus; // 'draft' | 'submitted' | 'cancelled'
  statusNote?: string;
  attachments: ProjectAttachment[];
  proposalData: ProposalData;
  createdAt: string;
  updatedAt: string;
}

