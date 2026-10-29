import { getRecoveredTeamPhoto, getRecoveredProjectAssets, RECOVERED_FRAMEWORK_IMAGE } from './defaultMediaAssets';
import { ProposalData, PastProject, TeamMember, TorScopeItem, BiddingProject, DocumentStructureConfig, MasterCompanyProfile } from '../types/proposal';
import { MasterBomItem } from '../types/bom';

export const DEFAULT_MASTER_COMPANY_PROFILE: MasterCompanyProfile = {
  companyName: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด (Prime Digital Consultant Co., Ltd.)',
  establishedYearBE: 2558,
  registeredCapital: '20,000,000 บาท (ชำระเต็มจำนวน)',
  companyProfile: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด ก่อตั้งขึ้นเมื่อปี พ.ศ. 2558 โดยกลุ่มผู้เชี่ยวชาญด้านวิศวกรรมคอมพิวเตอร์และการบริหารจัดการเทคโนโลยีสารสนเทศ ด้วยความมุ่งมั่นที่จะเป็นผู้นำด้านการให้คำปรึกษาและพัฒนานวัตกรรมดิจิทัลสำหรับภาครัฐและองค์กรชั้นนำของประเทศ บริษัทฯ ได้สั่งสมประสบการณ์และความเชี่ยวชาญในการส่งมอบโครงการพัฒนาระบบสารสนเทศขนาดใหญ่มากกว่า 50 โครงการ ด้วยมาตรฐานการทำงานระดับสากลและความน่าเชื่อถือสูงสุด',
  visionMission: 'มุ่งมั่นขับเคลื่อนการเปลี่ยนผ่านสู่ดิจิทัลของประเทศไทย ด้วยโซลูชันเทคโนโลยีที่ทันสมัย ปลอดภัย และสร้างคุณค่าที่ยั่งยืนให้แก่ประชาชนและองค์กรภาครัฐ',
  specializations: [
    'การให้คำปรึกษาและออกแบบสถาปัตยกรรมรัฐบาลดิจิทัล (Enterprise & Digital Government Architecture)',
    'การพัฒนาระบบบริการประชาชนดิจิทัล (Citizen-Centric e-Services & Portals)',
    'การบูรณาการข้อมูลขนาดใหญ่และการจัดทำคลังข้อมูลอัจฉริยะ (Big Data & Data Lakehouse Platform)',
    'การพัฒนาระบบบริหารจัดการองค์กรภาครัฐและระบบการเงินการพัสดุ (Government ERP & Workflow)',
    'การรักษาความมั่นคงปลอดภัยสารสนเทศและการปฏิบัติตามกฎหมายไซเบอร์และ PDPA',
  ],
  certifications: [
    'ISO/IEC 29110 (Software Engineering - Lifecycle Profiles for Very Small Entities)',
    'ISO/IEC 27001 (Information Security Management System)',
    'ขึ้นทะเบียนที่ปรึกษากระทรวงการคลัง (สำนักงานบริหารหนี้สาธารณะ) ประเภทที่ปรึกษาไทย สาขาเทคโนโลยีสารสนเทศและการสื่อสาร',
    'สมาชิกสภาอุตสาหกรรมแห่งประเทศไทย และสมาคมอุตสาหกรรมซอฟต์แวร์ไทย (ATSI)',
  ],
  maxYearsFilter: 3,
};

const RAW_MASTER_PROJECTS: PastProject[] = [
  {
    id: 'lib-proj-2568-001',
    originalMasterId: 'lib-proj-2568-001',
    projectCode: '2568-PRJ-001',
    contractYearBE: 2568,
    projectName: 'โครงการผู้พิทักษ์ไซเบอร์ : โครงการพัฒนานักทดสอบเจาะระบบเพื่อเสริมสร้างทักษะและการจ้างงานสำหรับนักศึกษาจบใหม่',
    clientName: 'สำนักงานส่งเสริมเศรษฐกิจดิจิทัล',
    contractValue: 1500000,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ โครงการผู้พิทักษ์ไซเบอร์ : โครงการพัฒนานักทดสอบเจาะระบบเพื่อเสริมสร้างทักษะและการจ้างงานสำหรับนักศึกษาจบใหม่ ดำเนินการให้กับ สำนักงานส่งเสริมเศรษฐกิจดิจิทัล ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2567-001',
    originalMasterId: 'lib-proj-2567-001',
    projectCode: '2567-PRJ-001',
    contractYearBE: 2567,
    projectName: 'กิจกรรมค่ายเยาวชนไซเบอร์ (Cyber Youth Camp) ของสำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ',
    clientName: 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ',
    contractValue: 1338000,
    completionYearBE: 2567,
    periodDuration: '6 เดือน',
    description: 'โครงการ กิจกรรมค่ายเยาวชนไซเบอร์ (Cyber Youth Camp) ของสำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ ดำเนินการให้กับ สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ ประจำปีงบประมาณ พ.ศ. 2567',
    category: 'พัฒนาระบบสารสนเทศและเทคโนโลยีดิจิทัล',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-002',
    originalMasterId: 'lib-proj-2568-002',
    projectCode: '2568-PRJ-002',
    contractYearBE: 2568,
    projectName: 'จ้างจัดทำสารสนเทศรายงานผลการเลือกตั้งองค์การบริหารส่วนจังหวัดสมุทรปราการ',
    clientName: 'องค์การบริหารส่วนจังหวัดสมุทรปราการ',
    contractValue: 1870000,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ จ้างจัดทำสารสนเทศรายงานผลการเลือกตั้งองค์การบริหารส่วนจังหวัดสมุทรปราการ ดำเนินการให้กับ องค์การบริหารส่วนจังหวัดสมุทรปราการ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-003',
    originalMasterId: 'lib-proj-2568-003',
    projectCode: '2568-PRJ-003',
    contractYearBE: 2568,
    projectName: 'จ้างบำรุงรักษาระบบ Microsoft Dynamic Ax',
    clientName: 'สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (องค์การมหาชน)',
    contractValue: 415000,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ จ้างบำรุงรักษาระบบ Microsoft Dynamic Ax ดำเนินการให้กับ สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (องค์การมหาชน) ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-004',
    originalMasterId: 'lib-proj-2568-004',
    projectCode: '2568-PRJ-004',
    contractYearBE: 2568,
    projectName: 'การจ้างเหมาจัดทำแดชบอร์ดแสดงข้อมูลในพื้นที่เขตควบคุมมลพิษ',
    clientName: 'กรมควบคุมมลพิษ',
    contractValue: 271028,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ การจ้างเหมาจัดทำแดชบอร์ดแสดงข้อมูลในพื้นที่เขตควบคุมมลพิษ ดำเนินการให้กับ กรมควบคุมมลพิษ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-005',
    originalMasterId: 'lib-proj-2568-005',
    projectCode: '2568-PRJ-005',
    contractYearBE: 2568,
    projectName: 'กิจกรรมการ��ัดทำบัญชีข้อมูลภาครัฐ โครงการจัดทำบัญชีข้อมูลภาครัฐ (Government Data Catalog)',
    clientName: 'สำนักงานสถิติแห่งชาติ',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ กิจกรรมการ��ัดทำบัญชีข้อมูลภาครัฐ โครงการจัดทำบัญชีข้อมูลภาครัฐ (Government Data Catalog) ดำเนินการให้กับ สำนักงานสถิติแห่งชาติ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-006',
    originalMasterId: 'lib-proj-2568-006',
    projectCode: '2568-PRJ-006',
    contractYearBE: 2568,
    projectName: 'ข้อมูลสถิติรายสาขา (TNSO Statistics Sharing Hub)',
    clientName: 'สำนักงานสถิติแห่งชาติ',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ ข้อมูลสถิติรายสาขา (TNSO Statistics Sharing Hub) ดำเนินการให้กับ สำนักงานสถิติแห่งชาติ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-007',
    originalMasterId: 'lib-proj-2568-007',
    projectCode: '2568-PRJ-007',
    contractYearBE: 2568,
    projectName: 'จำนวนทรัพยากรที่ให้บริการบนระบบบัญชีข้อมูลภาครัฐ (Government Data Catalog)',
    clientName: 'สำนักงานสถิติแห่งชาติ',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ จำนวนทรัพยากรที่ให้บริการบนระบบบัญชีข้อมูลภาครัฐ (Government Data Catalog) ดำเนินการให้กับ สำนักงานสถิติแห่งชาติ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-008',
    originalMasterId: 'lib-proj-2568-008',
    projectCode: '2568-PRJ-008',
    contractYearBE: 2568,
    projectName: 'ระบบบัญชีข้อมูลจังหวัด ทั้ง 76 จังหวัด',
    clientName: 'สำนักงานสถิติแห่งชาติ',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ ระบบบัญชีข้อมูลจังหวัด ทั้ง 76 จังหวัด ดำเนินการให้กับ สำนักงานสถิติแห่งชาติ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-009',
    originalMasterId: 'lib-proj-2568-009',
    projectCode: '2568-PRJ-009',
    contractYearBE: 2568,
    projectName: 'การจัดทำรายงานสนับสนุนการตัดสินใจเพื่อการบริหารจัดการทรัพยากรบุคลากรทางด้านสาธารณสุข',
    clientName: 'มูลนิธิเพื่อการพัฒนานโยบายสุขภาพระหว่างประเทศ',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ การจัดทำรายงานสนับสนุนการตัดสินใจเพื่อการบริหารจัดการทรัพยากรบุคลากรทางด้านสาธารณสุข ดำเนินการให้กับ มูลนิธิเพื่อการพัฒนานโยบายสุขภาพระหว่างประเทศ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-010',
    originalMasterId: 'lib-proj-2568-010',
    projectCode: '2568-PRJ-010',
    contractYearBE: 2568,
    projectName: 'รายงานผลการทดสอบสมรรถนะทางด้านดิจิทัลล (Digital Literacy baseline)',
    clientName: 'สำนักงานคณะกรรมการดิจิทัลเพื่อเศรษฐกิจและสังคมแห่งชาติ',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ รายงานผลการทดสอบสมรรถนะทางด้านดิจิทัลล (Digital Literacy baseline) ดำเนินการให้กับ สำนักงานคณะกรรมการดิจิทัลเพื่อเศรษฐกิจและสังคมแห่งชาติ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-011',
    originalMasterId: 'lib-proj-2568-011',
    projectCode: '2568-PRJ-011',
    contractYearBE: 2568,
    projectName: 'รายงานจำลองการวิเคราะห์ข้อมูลการขายตั๋วของสายการบินในประเทศไทย',
    clientName: 'หน่วยงานภาครัฐ / รัฐวิสาหกิจ',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ รายงานจำลองการวิเคราะห์ข้อมูลการขายตั๋วของสายการบินในประเทศไทย ดำเนินการให้กับ หน่วยงานภาครัฐ / รัฐวิสาหกิจ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-012',
    originalMasterId: 'lib-proj-2568-012',
    projectCode: '2568-PRJ-012',
    contractYearBE: 2568,
    projectName: 'โครงการจิตอาสาปลูก 10 ล้านกล้า ถวายรัชกาลที่ 10',
    clientName: 'โครงการจิตอาสาปลูก',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ โครงการจิตอาสาปลูก 10 ล้านกล้า ถวายรัชกาลที่ 10 ดำเนินการให้กับ โครงการจิตอาสาปลูก ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-013',
    originalMasterId: 'lib-proj-2568-013',
    projectCode: '2568-PRJ-013',
    contractYearBE: 2568,
    projectName: 'รายงานสถิติสำหรับการกำกับ/ติดตามผู้ร้องขอการตรวจสอบสถานะ ทางทะเบียน',
    clientName: 'สำนักงานหลักประกันสุขภาพแห่งชาติ',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ รายงานสถิติสำหรับการกำกับ/ติดตามผู้ร้องขอการตรวจสอบสถานะ ทางทะเบียน ดำเนินการให้กับ สำนักงานหลักประกันสุขภาพแห่งชาติ ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-014',
    originalMasterId: 'lib-proj-2568-014',
    projectCode: '2568-PRJ-014',
    contractYearBE: 2568,
    projectName: 'รายงานมูลค่าเศรษฐกิจสม���นไพรไทย',
    clientName: 'กรมการแพทย์แผนไทยและการแพทย์ทางเลือก',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ รายงานมูลค่าเศรษฐกิจสม���นไพรไทย ดำเนินการให้กับ กรมการแพทย์แผนไทยและการแพทย์ทางเลือก ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-015',
    originalMasterId: 'lib-proj-2568-015',
    projectCode: '2568-PRJ-015',
    contractYearBE: 2568,
    projectName: 'รายงานสถิติจำนวนผู้เข้าชมสวนสัตว์',
    clientName: 'องค์การสวนสัตว์แห่งประเทศไทย',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '6 เดือน',
    description: 'โครงการ รายงานสถิติจำนวนผู้เข้าชมสวนสัตว์ ดำเนินการให้กับ องค์การสวนสัตว์แห่งประเทศไทย ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2568-016',
    originalMasterId: 'lib-proj-2568-016',
    projectCode: '2568-PRJ-016',
    contractYearBE: 2568,
    projectName: 'รายงานสนับสนุนการตัดสินใจ (Business Intelligence)',
    clientName: 'กรมการขนส่งทางบก',
    contractValue: 0,
    completionYearBE: 2568,
    periodDuration: '8 เดือน',
    description: 'โครงการ รายงานสนับสนุนการตัดสินใจ (Business Intelligence) ดำเนินการให้กับ กรมการขนส่งทางบก ประจำปีงบประมาณ พ.ศ. 2568',
    category: 'บริการดิจิทัลและข้อมูลภาครัฐ',
    isSelected: true,
    projectType: 'tor_reference',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2567-002',
    originalMasterId: 'lib-proj-2567-002',
    projectCode: '2567-PRJ-002',
    contractYearBE: 2567,
    projectName: 'จ้างเหมาจัดทำนโยบายด้านการบริหารข้อมูล ภายใต้โครงการพัฒนาโครงสร้างพื้นฐานและระบบฐานข้อมูลสามมิติคู่เหมือนดิจิทัลลเชิงพื้นที่ เพื่อรองรับเมตาเวิร์ส (Thailand Geospatial Digital Twins for Metaverse)',
    clientName: 'สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (อ��ค์การมหาชน)',
    contractValue: 467289.72,
    completionYearBE: 2567,
    periodDuration: '6 เดือน',
    description: 'โครงการ จ้างเหมาจัดทำนโยบายด้านการบริหารข้อมูล ภายใต้โครงการพัฒนาโครงสร้างพื้นฐานและระบบฐานข้อมูลสามมิติคู่เหมือนดิจิทัลลเชิงพื้นที่ เพื่อรองรับเมตาเวิร์ส (Thailand Geospatial Digital Twins for Metaverse) ดำเนินการให้กับ สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (อ��ค์การมหาชน) ประจำปีงบประมาณ พ.ศ. 2567',
    category: 'พัฒนาระบบสารสนเทศและเทคโนโลยีดิจิทัล',
    isSelected: true,
    projectType: 'supplementary',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2567-003',
    originalMasterId: 'lib-proj-2567-003',
    projectCode: '2567-PRJ-003',
    contractYearBE: 2567,
    projectName: 'โครงการเช่าใช้ชุดโปรแกรมประจำปีงบประมาณ พ.ศ. 2567',
    clientName: 'ของสำนักงานสถิติแห่งชาติ',
    contractValue: 292398.9,
    completionYearBE: 2567,
    periodDuration: '6 เดือน',
    description: 'โครงการ โครงการเช่าใช้ชุดโปรแกรมประจำปีงบประมาณ พ.ศ. 2567 ดำเนินการให้กับ ของสำนักงานสถิติแห่งชาติ ประจำปีงบประมาณ พ.ศ. 2567',
    category: 'พัฒนาระบบสารสนเทศและเทคโนโลยีดิจิทัล',
    isSelected: true,
    projectType: 'supplementary',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
  {
    id: 'lib-proj-2566-001',
    originalMasterId: 'lib-proj-2566-001',
    projectCode: '2566-PRJ-001',
    contractYearBE: 2566,
    projectName: 'ข้อมูลระบบลงทะเบียนฉีดวัคซีน',
    clientName: 'องค์การบริหารส่วนจังหวัดสมุทรปราการ',
    contractValue: 0,
    completionYearBE: 2566,
    periodDuration: '6 เดือน',
    description: 'โครงการ ข้อมูลระบบลงทะเบียนฉีดวัคซีน ดำเนินการให้กับ องค์การบริหารส่วนจังหวัดสมุทรปราการ ประจำปีงบประมาณ พ.ศ. 2566',
    category: 'พัฒนาระบบสารสนเทศและเทคโนโลยีดิจิทัล',
    isSelected: true,
    projectType: 'supplementary',
    relevanceNote: 'ผลงานตรงตามประสบการณ์และความเชี่ยวชาญด้านระบบข้อมูลและดิจิทัลภาครัฐ สอดคล้องกับขอบเขตงาน',
    imageBlocks: [],
  },
];

export const MASTER_PROJECTS_LIBRARY: PastProject[] = RAW_MASTER_PROJECTS.map((p) => {
  const assets = getRecoveredProjectAssets(p.projectCode, p.clientName, p.projectName);
  return {
    ...p,
    clientLogoUrl: p.clientLogoUrl || assets.clientLogoUrl,
    projectImageUrl: p.projectImageUrl || assets.projectImageUrl,
    certificateFileUrl: p.certificateFileUrl || assets.certificateFileUrl,
    certificateFileName: p.certificateFileName || assets.certificateFileName,
  };
});

const RAW_MASTER_TEAM: TeamMember[] = [
  {
    "id": "lib-team-2568-001",
    "originalMasterId": "lib-team-2568-001",
    "memberCode": "2568-EMP-001",
    "recordedYearBE": 2568,
    "name": "นายยุทธพงศ์ อุณหทวีทรัพย์",
    "proposedRole": "ผู้จัดการโครงการ",
    "education": "ปริญญาโท เทคโนโลยีการจัดการระบบสารสนเทศ (มหาวิทยาลัยมหิดล)",
    "certifications": "Topcit, ITIL (IT Service Management), Microsoft Certifed Solutions Associate, Microsoft Professional, CompTIA (Healthcare IT Technician)",
    "experienceYears": 12,
    "startWorkYearBE": 2556,
    "personalBio": "ผู้เชี่ยวชาญด้านการบริหารโครงการเทคโนโลยีสารสนเทศ มีประสบการณ์ตรงในการบริหารโครงการภาครัฐกว่า 12 ปี มีความเชี่ยวชาญการบริหารโครงการดิจิทัล การควบคุมงบประมาณและกำหนดเวลา",
    "responsibilities": "ควบคุมกำกับดูแลภาพรวมการบริหารโครงการ การประสานงานกับผู้ว่าจ้าง และการบริหารจัดการทีมงานให้ส่งมอบงานตามแผน",
    "highlightProjects": "บริหารโครงการพัฒนาระบบข้อมูลและเทคโนโลยีดิจิทัลภาครัฐ"
  },
  {
    "id": "lib-team-2568-002",
    "originalMasterId": "lib-team-2568-002",
    "memberCode": "2568-EMP-002",
    "recordedYearBE": 2568,
    "name": "นางสาวปวีณา มั่นบัว",
    "proposedRole": "ทีมฝ่ายวางแผน จัดซื้อและการเงิน",
    "education": "ปริญญาโท เทคโนโลยีการจัดการระบบสารสนเทศ (มหาวิทยาลัยมหิดล) 2556",
    "certifications": "คุณวุฒิวิชาชีพ สาขาเทคโนโลยีสารสนเทศและการสื่อสารและดิจิทัลคอนเทนต์ สาขาวิทยาศาสตร์ข้อมูล",
    "experienceYears": 16,
    "startWorkYearBE": 2552,
    "personalBio": "ผู้เชี่ยวชาญด้านการวางแผนและการเงินโครงการ มีประสบการณ์การทำงานภาครัฐและเอกชนกว่า 16 ปี เชี่ยวชาญการควบคุมงบประมาณและการจัดซื้อจัดจ้างตามระเบียบราชการ",
    "responsibilities": "วางแผนงานโครงการ จัดซื้อจัดจ้าง บริหารงบประมาณและการเงินตลอดโครงการ",
    "highlightProjects": "วางแผนและบริหารการเงินโครงการภาครัฐขนาดใหญ่"
  },
  {
    "id": "lib-team-2568-003",
    "originalMasterId": "lib-team-2568-003",
    "memberCode": "2568-EMP-003",
    "recordedYearBE": 2568,
    "name": "นายวิเศษ สิทธิพงษ์",
    "proposedRole": "ทีมควบคุมงานกิจกรรม Boot Camp",
    "education": "ปริญญาตรี รัฐประศาสนศาสตร์ (มหาวิทยาลัยราชภัฏสวนดุสิต)",
    "certifications": "ใบรับรองมาตรฐานวิชาชีพด้านบริหารโครงการเทคโนโลยีสารสนเทศ",
    "experienceYears": 12,
    "startWorkYearBE": 2556,
    "personalBio": "ผู้เชี่ยวชาญด้านการควบคุมและจัดกิจกรรม Boot Camp มีประสบการณ์ดำเนินกิจกรรมพัฒนาทักษะมากกว่า 12 ปี มีความชำนาญการบริหารการจัดอบรมเชิงปฏิบัติการเข้มข้น",
    "responsibilities": "ควบคุม ดูแล และอำนวยความสะดวกการจัดกิจกรรม Boot Camp ให้เป็นไปตามวัตถุประสงค์โครงการ",
    "highlightProjects": "ควบคุมและดำเนินกิจกรรมค่ายอบรมและพัฒนาทักษะดิจิทัลภาครัฐ"
  },
  {
    "id": "lib-team-2568-004",
    "originalMasterId": "lib-team-2568-004",
    "memberCode": "2568-EMP-004",
    "recordedYearBE": 2568,
    "name": "นายธีระพงศ์ เนตรเจริญ",
    "proposedRole": "ฝ่ายจัดกิจกรรม Cyber Top Talent",
    "education": "ปริญญาตรี สาขาภูมิศาสตร์ (มหาวิทยาลัยเกษตรศาสตร์)",
    "certifications": "ใบรับรองมาตรฐานวิชาชีพด้านเทคโนโลยีสารสนเทศ",
    "experienceYears": 7,
    "startWorkYearBE": 2561,
    "personalBio": "ผู้เชี่ยวชาญการจัดกิจกรรมการแข่งขันและฝึกอบรมทักษะดิจิทัล มีประสบการณ์มากกว่า 7 ปี เชี่ยวชาญการจัดกิจกรรมคัดเลือกและแข่งขันระดับประเทศ",
    "responsibilities": "ประสานงานและจัดกิจกรรม Cyber Top Talent ตามขอบเขตงานโครงการ",
    "highlightProjects": "จัดกิจกรรมการแข่งขันและฝึกอบรมทักษะดิจิทัลและความมั่นคงปลอดภัยไซเบอร์"
  },
  {
    "id": "lib-team-2568-005",
    "originalMasterId": "lib-team-2568-005",
    "memberCode": "2568-EMP-005",
    "recordedYearBE": 2568,
    "name": "นางสาวสายพิณ มีเจตนา",
    "proposedRole": "ฝ่ายจัดกิจกรรม",
    "education": "ปริญญาตรี สาขาจิตวิทยา (มหาวิทยาลัยราชภัฏวไลยอลงกรณ์)",
    "certifications": "ใบรับรองด้านการประสานงานและการจัดฝึกอบรม",
    "experienceYears": 7,
    "startWorkYearBE": 2561,
    "personalBio": "ผู้เชี่ยวชาญด้านการประสานงานและจัดกิจกรรมฝึกอบรม มีประสบการณ์กว่า 7 ปี มีทักษะการดูแลและอำนวยความสะดวกแก่ผู้เข้าร่วมโครงการอย่างยอดเยี่ยม",
    "responsibilities": "ประสานงานจัดกิจกรรม สัมมนา และดูแลความเรียบร้อยของผู้เข้าร่วมโครงการ",
    "highlightProjects": "ดำเนินงานจัดกิจกรรมฝึกอบรมและสัมมนาทักษะดิจิทัลระดับพื้นที่"
  },
  {
    "id": "lib-team-2568-006",
    "originalMasterId": "lib-team-2568-006",
    "memberCode": "2568-EMP-006",
    "recordedYearBE": 2568,
    "name": "นายธีรวุฒิ ฤทธิปรีชา",
    "proposedRole": "ทีมจัดกิจกรรม CTF Boot Camp",
    "education": "ปริญญาตรี สาขาสถิติสารสนเทศ (2561) (มหาวิทยาลัยราชภัฏนครศรีธรรมราช)",
    "certifications": "ใบรับรองด้านสถิติสารสนเทศและความปลอดภัยทางไซเบอร์",
    "experienceYears": 5,
    "startWorkYearBE": 2563,
    "personalBio": "ผู้เชี่ยวชาญด้านสถิติสารสนเทศและการจัดกิจกรรม CTF Boot Camp มีประสบการณ์กว่า 5 ปี เชี่ยวชาญระบบการแข่งขันและการประเมินผลทักษะความปลอดภัยไซเบอร์",
    "responsibilities": "จัดเตรียมเนื้อหา กิจกรรม และระบบการแข่งขัน CTF Boot Camp",
    "highlightProjects": "จัดกิจกรรมการแข่งขันและฝึกอบรมด้าน Cybersecurity & CTF"
  },
  {
    "id": "lib-team-2568-007",
    "originalMasterId": "lib-team-2568-007",
    "memberCode": "2568-EMP-007",
    "recordedYearBE": 2568,
    "name": "นางจริยา เกตุมาลย์",
    "proposedRole": "เจ้าหน้าที่ทั่วไป",
    "education": "ปริญญาโท สาขาการจัดการทั่วไป (มหาวิทยาลัยรามคำแหง)",
    "certifications": "ใบรับรองด้านการบริหารงานทั่วไปและการจัดการงานเอกสาร",
    "experienceYears": 16,
    "startWorkYearBE": 2552,
    "personalBio": "ผู้เชี่ยวชาญด้านการบริหารงานทั่วไปและธุรการ มีประสบการณ์การทำงานภาครัฐกว่า 16 ปี เชี่ยวชาญการจัดทำเอกสารราชการ การเบิกจ่าย และงานธุรการโครงการ",
    "responsibilities": "ดูแลงานธุรการ งานเอกสาร และการสนับสนุนทั่วไปของโครงการ",
    "highlightProjects": "บริหารจัดการงานธุรการและสนับสนุนโครงการภาครัฐขนาดใหญ่"
  },
  {
    "id": "lib-team-2568-008",
    "originalMasterId": "lib-team-2568-008",
    "memberCode": "2568-EMP-008",
    "recordedYearBE": 2568,
    "name": "นายศุภกร อุ่นแจ่ม",
    "proposedRole": "เจ้าหน้าที่โครงการ",
    "education": "ปริญญาตรี สาขาคอมพิวเตอร์ธุรกิจ (มหาวิทยาลัยราชภัฏสวนสุนันทา)",
    "certifications": "ใบรับรองด้านเทคโนโลยีสารสนเทศและการวิเคราะห์ข้อมูล",
    "experienceYears": 6,
    "startWorkYearBE": 2562,
    "personalBio": "เจ้าหน้าที่โครงการที่มีความเชี่ยวชาญด้านคอมพิวเตอร์ธุรกิจและการประสานงานโครงการดิจิทัล มีประสบการณ์กว่า 6 ปี",
    "responsibilities": "สนับสนุนการดำเนินงานโครงการ การเก็บข้อมูล และประสานงานผู้มีส่วนได้ส่วนเสีย",
    "highlightProjects": "สนับสนุนโครงการพัฒนากำลังคนและระบบเทคโนโลยีดิจิทัลภาครัฐ"
  },
  {
    "id": "lib-team-2568-009",
    "originalMasterId": "lib-team-2568-009",
    "memberCode": "2568-EMP-009",
    "recordedYearBE": 2568,
    "name": "นายวุฒิชัย เข็มกลัด",
    "proposedRole": "เจ้าหน้าที่โครงการ",
    "education": "ปริญญาตรี สาขาเทคโนโลยีสารสนเทศ (มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี)",
    "certifications": "ใบรับรองด้านเทคโนโลยีสารสนเทศและระบบเครือข่าย",
    "experienceYears": 3,
    "startWorkYearBE": 2565,
    "personalBio": "เจ้าหน้าที่โครงการด้านเทคโนโลยีสารสนเทศ มีประสบการณ์สนับสนุนงานเทคนิคและการจัดกิจกรรมดิจิทัลกว่า 3 ปี",
    "responsibilities": "สนับสนุนด้านเทคนิค การเตรียมระบบสารสนเทศ และการประสานงานโครงการ",
    "highlightProjects": "สนับสนุนโครงการด้านเทคโนโลยีดิจิทัลและการอบรมเชิงปฏิบัติการ"
  },
  {
    "id": "lib-team-2568-010",
    "originalMasterId": "lib-team-2568-010",
    "memberCode": "2568-EMP-010",
    "recordedYearBE": 2568,
    "name": "นายพงศ์ชนก จั่วกี่",
    "proposedRole": "เจ้าหน้าที่โครงการ",
    "education": "ปริญญาตรี สาขาสถิติศาสตร์ (มหาวิทยาลัยเทคโนโลยีราชมงคลธัญบุรี) 2568",
    "certifications": "ใบรับรองด้านสถิติประยุกต์และการวิเคราะห์ข้อมูล",
    "experienceYears": 0,
    "startWorkYearBE": 2568,
    "personalBio": "นักสถิติและเจ้าหน้าที่โครงการ เชี่ยวชาญการประมวลผลข้อมูลและการจัดทำสถิติรายงานผลโครงการ",
    "responsibilities": "สนับสนุนงานสถิติ การเก็บรวบรวมข้อมูล และการจัดทำรายงานสรุปผล",
    "highlightProjects": "การวิเคราะห์ข้อมูลสถิติและการประมวลผลข้อมูลโครงการ"
  },
  {
    "id": "lib-team-2568-011",
    "originalMasterId": "lib-team-2568-011",
    "memberCode": "2568-EMP-011",
    "recordedYearBE": 2568,
    "name": "นายสุเมธ โอชา",
    "proposedRole": "เจ้าหน้าที่โครงการ",
    "education": "ปริญญาตรี สาขาบริหารธุรกิจ (สถาบันเทคโนโลยีจิตรลดา)",
    "certifications": "ใบรับรองด้านการบริหารธุรกิจและการจัดการข้อมูล",
    "experienceYears": 2,
    "startWorkYearBE": 2566,
    "personalBio": "เจ้าหน้าที่โครงการด้านบริหารธุรกิจ มีความคล่องตัวในการประสานงานและการจัดการกิจกรรมโครงการ",
    "responsibilities": "ประสานงานโครงการ สนับสนุนการดำเนินกิจกรรม และดูแลเอกสารประกอบโครงการ",
    "highlightProjects": "ประสานงานและสนับสนุนการจัดกิจกรรมโครงการพัฒนาทักษะดิจิทัล"
  },
  {
    "id": "lib-team-2568-012",
    "originalMasterId": "lib-team-2568-012",
    "memberCode": "2568-EMP-012",
    "recordedYearBE": 2568,
    "name": "นางสาวญาณิศรา อุณหทวีทรัพย์",
    "proposedRole": "เจ้าหน้าที่โครงการ",
    "education": "ปริญญาโท เทคโนโลยีการจัดการระบบสารสนเทศ (มหาวิทยาลัยมหิดล) 2561",
    "certifications": "ใบรับรองด้านการจัดการระบบสารสนเทศและการบริหารงานโครงการ",
    "experienceYears": 3,
    "startWorkYearBE": 2565,
    "personalBio": "ผู้เชี่ยวชาญด้านเทคโนโลยีการจัดการระบบสารสนเทศ มีประสบการณ์สนับสนุนและประเมินผลโครงการดิจิทัลกว่า 3 ปี",
    "responsibilities": "วิเคราะห์กระบวนการทำงาน การติดตามประเมินผลโครงการ และสนับสนุนการจัดทำรายงานผล",
    "highlightProjects": "สนับสนุนโครงการวิเคราะห์และบริหารจัดการระบบสารสนเทศภาครัฐ"
  }
];

export const MASTER_TEAM_LIBRARY: TeamMember[] = RAW_MASTER_TEAM.map((m) => ({
  ...m,
  photoUrl: m.photoUrl || getRecoveredTeamPhoto(m.name),
}));

export const MASTER_BOM_LIBRARY: MasterBomItem[] = [
  // --- 1. งานจัดกิจกรรม ประชุม สัมมนา และอีเวนต์ ---
  {
    id: 'mbom-evt-01',
    category: 'งานจัดกิจกรรม ประชุม สัมมนา และอีเวนต์',
    title: 'ค่าเช่าสถานที่จัดประชุม/สัมมนา พร้อมระบบโสตทัศนูปกรณ์ (โรงแรม 4-5 ดาว)',
    responsibleRole: 'Event Coordinator & Organizer',
    unit: 'ครั้ง / การจัดงาน (Session/Event)',
    defaultRate: 35000,
    defaultQuantity: 1,
    description: 'ค่าสถานที่จัดงาน ห้องประชุมสัมมนา จอโปรเจกเตอร์/LED ระบบเสียง และอินเทอร์เน็ตความเร็วสูง',
    deliverable: 'ใบเสร็จรับเงิน/หลักฐานการเช่าสถานที่และรายงานการจัดงาน',
    isStandard: true,
  },
  {
    id: 'mbom-evt-02',
    category: 'งานจัดกิจกรรม ประชุม สัมมนา และอีเวนต์',
    title: 'ค่าอาหารกลางวันและอาหารว่างสำหรับผู้เข้าร่วมงาน (Catering & Breaks)',
    responsibleRole: 'Event Coordinator',
    unit: 'คน / ผู้เข้าร่วม (Person)',
    defaultRate: 550,
    defaultQuantity: 50,
    description: 'อาหารกลางวันแบบบุฟเฟต์สากล และอาหารว่างเช้า-บ่าย พร้อมเครื่องดื่ม สำหรับผู้ร่วมงาน',
    deliverable: 'ใบลงทะเบียนผู้ร่วมงานและใบเสร็จรับเงินค่าอาหาร',
    isStandard: true,
  },
  {
    id: 'mbom-evt-03',
    category: 'งานจัดกิจกรรม ประชุม สัมมนา และอีเวนต์',
    title: 'ค่าออกแบบ ผลิต และติดตั้งฉากเวที นิทรรศการ และ Backdrop',
    responsibleRole: 'Creative & Production Team',
    unit: 'ชุด (Set)',
    defaultRate: 45000,
    defaultQuantity: 1,
    description: 'ออกแบบโครงสร้างเวที ฉากถ่ายภาพ Backdrop ป้ายชื่องาน และบอร์ดนิทรรศการแสดงผลงาน',
    deliverable: 'ภาพถ่ายฉากเวทีและรายงานการจัดนิทรรศการ',
    isStandard: true,
  },
  {
    id: 'mbom-evt-04',
    category: 'งานจัดกิจกรรม ประชุม สัมมนา และอีเวนต์',
    title: 'ค่าบันทึกภาพนิ่ง วิดีโอ และถ่ายทอดสดออนไลน์ (Live Streaming & Recording)',
    responsibleRole: 'Media Production Crew',
    unit: 'ครั้ง / การจัดงาน (Session/Event)',
    defaultRate: 25000,
    defaultQuantity: 1,
    description: 'ทีมงานช่างภาพ กล้องถ่ายทอดสด ระบบสตรีมมิ่งผ่าน Zoom/YouTube/Facebook พร้อมตัดต่อสรุปภาพรวมงาน',
    deliverable: 'ไฟล์วิดีโอบันทึกงานความละเอียด Full HD/4K และภาพถ่ายกิจกรรม',
    isStandard: true,
  },
  {
    id: 'mbom-evt-05',
    category: 'งานจัดกิจกรรม ประชุม สัมมนา และอีเวนต์',
    title: 'ค่าเจ้าหน้าที่รันคิว ประสานงาน อำนวยความสะดวก และต้อนรับลงทะเบียน',
    responsibleRole: 'Event Coordinator & Staff',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 2800,
    defaultQuantity: 4,
    description: 'ทีมงานปฏิบัติการภาคสนาม ประสานงานผู้เข้าร่วม ตรวจสอบระบบลงทะเบียน และดูแลความเรียบร้อย',
    deliverable: 'สรุปรายงานสถิติการลงทะเบียนผู้เข้าร่วมงาน',
    isStandard: true,
  },

  // --- 2. งานฝึกอบรม ถ่ายทอดความรู้ และจัดทำคู่มือ ---
  {
    id: 'mbom-trn-01',
    category: 'งานฝึกอบรม ถ่ายทอดความรู้ และจัดทำคู่มือ',
    title: 'ค่าตอบแทนวิทยากรผู้ทรงคุณวุฒิ/ผู้เชี่ยวชาญพิเศษ (Keynote Speaker / Trainer)',
    responsibleRole: 'Keynote Speaker / Senior Trainer',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 25000,
    defaultQuantity: 2,
    description: 'บรรยายถ่ายทอดองค์ความรู้ หลักสูตรฝึกอบรมเฉพาะทาง เทคนิคการใช้งานระบบ และตอบข้อซักถาม',
    deliverable: 'สไลด์ประกอบการบรรยายและรายงานการประเมินผลความรู้ (Pre/Post Test)',
    isStandard: true,
  },
  {
    id: 'mbom-trn-02',
    category: 'งานฝึกอบรม ถ่ายทอดความรู้ และจัดทำคู่มือ',
    title: 'ค่าตอบแทนผู้ช่วยวิทยากรฝึกปฏิบัติการ (Lab Assistant / Co-Trainer)',
    responsibleRole: 'Co-Trainer / Technical Assistant',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 4500,
    defaultQuantity: 2,
    description: 'ดูแลผู้เข้าอบรมระหว่างทำแบบฝึกปฏิบัติ (Hands-on Lab) และให้คำแนะนำแก้ไขปัญหาเฉพาะบุคคล',
    deliverable: 'ใบลงเวลาปฏิบัติงานและรายงานผลการฝึกปฏิบัติ',
    isStandard: true,
  },
  {
    id: 'mbom-trn-03',
    category: 'งานฝึกอบรม ถ่ายทอดความรู้ และจัดทำคู่มือ',
    title: 'ค่าจัดพิมพ์รูปเล่มเอกสารและคู่มือประกอบการฝึกอบรม (Printed Materials)',
    responsibleRole: 'Publishing / Documentation Staff',
    unit: 'เล่ม',
    defaultRate: 350,
    defaultQuantity: 30,
    description: 'จัดพิมพ์เอกสารประกอบการฝึกอบรม ปกสี เข้าเล่มสันกาว พร้อมจัดทำคู่มือผู้ดูแลระบบและผู้ใช้งานทั่วไป',
    deliverable: 'รูปเล่มคู่มือและไฟล์ดิจิทัล PDF',
    isStandard: true,
  },
  {
    id: 'mbom-trn-04',
    category: 'งานฝึกอบรม ถ่ายทอดความรู้ และจัดทำคู่มือ',
    title: 'ค่าพัฒนาสื่อฝึกอบรมมัลติมีเดีย / E-Learning Microlearning',
    responsibleRole: 'Instructional Designer & Multimedia',
    unit: 'ชุด (Set)',
    defaultRate: 85000,
    defaultQuantity: 1,
    description: 'จัดทำคลิปสอนการใช้งานระบบแบบแบ่งบทย่อย (Microlearning) พร้อมเสียงบรรยายและแบบทดสอบออนไลน์',
    deliverable: 'ไฟล์สื่อวิดีโอ E-Learning และแบบทดสอบประเมินผล',
    isStandard: true,
  },

  // --- 3. งานประชาสัมพันธ์ สื่อ และมัลติมีเดีย ---
  {
    id: 'mbom-pr-01',
    category: 'งานประชาสัมพันธ์ สื่อ และมัลติมีเดีย',
    title: 'ผลิตวีดิทัศน์ประชาสัมพันธ์สรุปโครงการ (Video Production & Motion Graphics)',
    responsibleRole: 'Creative Director & Video Editor',
    unit: 'ชิ้น / สื่อ (Piece/Deliverable)',
    defaultRate: 95000,
    defaultQuantity: 1,
    description: 'จัดทำวีดิทัศน์ประชาสัมพันธ์ความยาว 3-5 นาที คุณภาพระดับออกอากาศ พร้อมเสียงพากย์และ Motion Graphic',
    deliverable: 'ไฟล์วิดีโอประชาสัมพันธ์ 4K/Full HD พร้อม Teaser ฉบับย่อ 60 วินาที',
    isStandard: true,
  },
  {
    id: 'mbom-pr-02',
    category: 'งานประชาสัมพันธ์ สื่อ และมัลติมีเดีย',
    title: 'ออกแบบสื่ออินโฟกราฟิกและอาร์ตเวิร์กเผยแพร่ดิจิทัล (Infographics & Social Art)',
    responsibleRole: 'Graphic Designer & Content Creator',
    unit: 'ชิ้น / สื่อ (Piece/Deliverable)',
    defaultRate: 4500,
    defaultQuantity: 10,
    description: 'ออกแบบภาพอินโฟกราฟิกสรุปข้อมูล สาระสำคัญโครงการ และขั้นตอนการใช้งานระบบสำหรับเผยแพร่โซเชียลมีเดีย',
    deliverable: 'ไฟล์กราฟิกความละเอียดสูง (PNG, JPEG, AI, PSD)',
    isStandard: true,
  },
  {
    id: 'mbom-pr-03',
    category: 'งานประชาสัมพันธ์ สื่อ และมัลติมีเดีย',
    title: 'ค่าบริการสื่อสารประชาสัมพันธ์ เผยแพร่ข่าวสาร และดิจิทัลแคมเปญ',
    responsibleRole: 'PR & Media Campaign Manager',
    unit: 'งวดงาน (Milestone)',
    defaultRate: 50000,
    defaultQuantity: 1,
    description: 'เผยแพร่ข่าวประชาสัมพันธ์ผ่านช่องทางออนไลน์ เว็บไซต์ข่าว และบริหารจัดการแคมเปญสร้างการรับรู้',
    deliverable: 'รายงานผลการเผยแพร่ข่าว (Clipping Report) และสถิติการเข้าถึง',
    isStandard: true,
  },

  // --- 4. งานศึกษา สำรวจ วิจัย และรวบรวมข้อมูล ---
  {
    id: 'mbom-res-01',
    category: 'งานศึกษา สำรวจ วิจัย และรวบรวมข้อมูล',
    title: 'ออกแบบระเบียบวิธีวิจัย เครื่องมือสำรวจ และแบบสอบถาม (Research Design)',
    responsibleRole: 'Lead Researcher & Statistician',
    unit: 'ชุด (Set)',
    defaultRate: 40000,
    defaultQuantity: 1,
    description: 'กำหนดระเบียบวิธีวิจัย กำหนดขนาดกลุ่มตัวอย่าง ออกแบบแบบสอบถามออนไลน์และแบบประเมินตามหลักวิชาการ',
    deliverable: 'เอกสารระเบียบวิธีวิจัยและแบบสอบถามฉบับสมบูรณ์',
    isStandard: true,
  },
  {
    id: 'mbom-res-02',
    category: 'งานศึกษา สำรวจ วิจัย และรวบรวมข้อมูล',
    title: 'การสำรวจและเก็บรวบรวมข้อมูลภาคสนาม (Field Survey & Data Collection)',
    responsibleRole: 'Field Survey Team',
    unit: 'คน / ผู้เข้าร่วม (Person)',
    defaultRate: 250,
    defaultQuantity: 400,
    description: 'ลงพื้นที่สัมภาษณ์ เก็บรวบรวมข้อมูลแบบสอบถามจากกลุ่มเป้าหมาย และตรวจสอบความถูกต้องของชุดข้อมูล',
    deliverable: 'ฐานข้อมูลผลการสำรวจและแบบสอบถามที่ผ่านการตรวจทาน',
    isStandard: true,
  },
  {
    id: 'mbom-res-03',
    category: 'งานศึกษา สำรวจ วิจัย และรวบรวมข้อมูล',
    title: 'ประมวลผล วิเคราะห์ข้อมูลทางสถิติ และจัดทำรายงานผลการวิจัยฉบับสมบูรณ์',
    responsibleRole: 'Senior Data Analyst & Researcher',
    unit: 'งวดงาน (Milestone)',
    defaultRate: 65000,
    defaultQuantity: 1,
    description: 'วิเคราะห์ข้อมูลเชิงปริมาณและคุณภาพ ทดสอบสมมติฐาน และจัดทำรายงานสรุปข้อค้นพบพร้อมข้อเสนอแนะ',
    deliverable: 'รายงานผลการศึกษาและวิเคราะห์ข้อมูลฉบับสมบูรณ์',
    isStandard: true,
  },

  // --- 5. งานที่ปรึกษา วิเคราะห์ และกำหนดนโยบาย ---
  {
    id: 'mbom-cns-01',
    category: 'งานที่ปรึกษา วิเคราะห์ และกำหนดนโยบาย',
    title: 'ผู้เชี่ยวชาญให้คำปรึกษาเชิงยุทธศาสตร์และนโยบาย (Strategic & Policy Consultant)',
    responsibleRole: 'Lead Strategic Consultant',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 6000,
    defaultQuantity: 15,
    description: 'ให้คำปรึกษาเชิงยุทธศาสตร์ วิเคราะห์บริบทองค์กร และจัดทำแนวทางนโยบายตามมาตรฐานสากล',
    deliverable: 'รายงานข้อเสนอแนะเชิงยุทธศาสตร์และนโยบาย',
    isStandard: true,
  },
  {
    id: 'mbom-cns-02',
    category: 'งานที่ปรึกษา วิเคราะห์ และกำหนดนโยบาย',
    title: 'การศึกษา วิเคราะห์ และออกแบบกระบวนการทำงานใหม่ (Business Process Re-engineering: BPR)',
    responsibleRole: 'Business Process Analyst',
    unit: 'ระบบย่อย (Subsystem)',
    defaultRate: 120000,
    defaultQuantity: 1,
    description: 'วิเคราะห์กระบวนการทำงานปัจจุบัน (As-Is) และออกแบบกระบวนการทำงานดิจิทัลในอนาคต (To-Be Workflow)',
    deliverable: 'พิมพ์เขียวกระบวนการทำงานใหม่และแผนภาพขั้นตอนการปฏิบัติงาน (Workflows)',
    isStandard: true,
  },
  {
    id: 'mbom-cns-03',
    category: 'งานที่ปรึกษา วิเคราะห์ และกำหนดนโยบาย',
    title: 'การจัดทำแผนแม่บทและพิมพ์เขียวการเปลี่ยนผ่านสู่ดิจิทัล (Digital Blueprint & Master Plan)',
    responsibleRole: 'Enterprise Architecture Consultant',
    unit: 'ชุด (Set)',
    defaultRate: 180000,
    defaultQuantity: 1,
    description: 'จัดทำแผนแม่บทระยะ 3-5 ปี แผนพัฒนาบุคลากร แผนลงทุนเทคโนโลยี และตัวชี้วัดความสำเร็จ (KPIs)',
    deliverable: 'เอกสารแผนแม่บทและโร้ดแมปการดำเนินงานฉบับสมบูรณ์',
    isStandard: true,
  },

  // --- 6. งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ ---
  {
    id: 'mbom-sw-01',
    category: 'งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ',
    title: 'บริหารจัดการโครงการและควบคุมคุณภาพงาน (Project Manager)',
    responsibleRole: 'Project Manager (ผู้จัดการโครงการ)',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 5500,
    defaultQuantity: 20,
    description: 'วางแผน ควบคุมตารางเวลา ติดตามงบประมาณ ประสานงานคณะกรรมการ และบริหารความเสี่ยง',
    deliverable: 'แผนบริหารโครงการ (PMP) และรายงานความก้าวหน้าประจำงวด',
    isStandard: true,
  },
  {
    id: 'mbom-sw-02',
    category: 'งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ',
    title: 'ออกแบบสถาปัตยกรรมระบบ คลาวด์ และฐานข้อมูล (Solution Architect)',
    responsibleRole: 'Solution Architect (สถาปนิกโซลูชัน)',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 6500,
    defaultQuantity: 15,
    description: 'ออกแบบ System Architecture, Data Schema, Microservices และระบบความมั่นคงปลอดภัย',
    deliverable: 'เอกสารออกแบบสถาปัตยกรรมระบบ (System Architecture Design)',
    isStandard: true,
  },
  {
    id: 'mbom-sw-03',
    category: 'งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ',
    title: 'พัฒนาแกนระบบและ API เชื่อมโยงข้อมูล (Lead Software Engineer)',
    responsibleRole: 'Lead Software Engineer (วิศวกรซอฟต์แวร์อาวุโส)',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 5000,
    defaultQuantity: 30,
    description: 'พัฒนา Backend Core Engine, RESTful/GraphQL API และระบบควบคุมสิทธิ์ตามมาตรฐาน OWASP',
    deliverable: 'ซอร์สโค้ดระบบหลังบ้านและเอกสาร API Documentation',
    isStandard: true,
  },
  {
    id: 'mbom-sw-04',
    category: 'งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ',
    title: 'พัฒนาส่วนต่อประสานและหน้าต่างใช้งาน (Senior Full-Stack Developer)',
    responsibleRole: 'Senior Full-Stack Developer (นักพัฒนาระบบ)',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 4500,
    defaultQuantity: 35,
    description: 'พัฒนา Responsive Web Portal, ระบบ e-Service, แดชบอร์ดผู้บริหาร และการเชื่อมต่อฐานข้อมูล',
    deliverable: 'ระบบเว็บแอปพลิเคชันที่พร้อมใช้งานและคู่มือการติดตั้ง',
    isStandard: true,
  },
  {
    id: 'mbom-sw-05',
    category: 'งานพัฒนาซอฟต์แวร์และวิศวกรรมระบบ',
    title: 'ทดสอบระบบ การประกันคุณภาพ และการทดสอบรับมอบ (QA & Tester)',
    responsibleRole: 'QA & Security Specialist',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 4500,
    defaultQuantity: 15,
    description: 'จัดทำ Test Case, ดำเนินการ Functional Test, Regression Test และสนับสนุนการตรวจรับงาน (UAT)',
    deliverable: 'รายงานผลการทดสอบระบบและเอกสารผลการทดสอบรับมอบงาน UAT',
    isStandard: true,
  },

  // --- 7. งานโครงสร้างพื้นฐานและคลาวด์ ---
  {
    id: 'mbom-inf-01',
    category: 'งานโครงสร้างพื้นฐานและคลาวด์',
    title: 'ติดตั้งและตั้งค่า Cloud Infrastructure & DevOps CI/CD Pipeline',
    responsibleRole: 'DevOps & Cloud Engineer',
    unit: 'วัน-คน (Man-Day)',
    defaultRate: 5000,
    defaultQuantity: 10,
    description: 'จัดเตรียม Container/Kubernetes, ระบบอัตโนมัติ CI/CD, Load Balancer และระบบ Backup อัตโนมัติ',
    deliverable: 'เอกสารการตั้งค่าสภาพแวดล้อมคลาวด์และ CI/CD Pipeline',
    isStandard: true,
  },
  {
    id: 'mbom-inf-02',
    category: 'งานโครงสร้างพื้นฐานและคลาวด์',
    title: 'ค่าบริการทรัพยากรคลาวด์ Server, Database & Backup (Cloud Hosting Subscriptions)',
    responsibleRole: 'Cloud Hosting Provider',
    unit: 'เดือน-คน (Man-Month)',
    defaultRate: 25000,
    defaultQuantity: 6,
    description: 'ค่าบริการ Cloud Compute Instances, Managed Database, High-Availability Storage และระบบ Monitoring',
    deliverable: 'รายงานสถิติการใช้งานคลาวด์ (Cloud Usage & Uptime Report 99.9%)',
    isStandard: true,
  },
  {
    id: 'mbom-inf-03',
    category: 'งานโครงสร้างพื้นฐานและคลาวด์',
    title: 'ค่าใบรับรองความปลอดภัยดิจิทัล (SSL/TLS Wildcard Certificate)',
    responsibleRole: 'Security Administrator',
    unit: 'ชุด (Set)',
    defaultRate: 12000,
    defaultQuantity: 1,
    description: 'ติดตั้งใบรับรองความปลอดภัย SSL/TLS Certificate สำหรับโดเมนโครงการเพื่อการเข้ารหัสข้อมูล HTTPS',
    deliverable: 'ใบรับรองความปลอดภัยที่ติดตั้งบนเซิร์ฟเวอร์เรียบร้อย',
    isStandard: true,
  },

  // --- 8. งานทดสอบและประเมินความมั่นคงปลอดภัย ---
  {
    id: 'mbom-sec-01',
    category: 'งานทดสอบและประเมินความมั่นคงปลอดภัย',
    title: 'ตรวจประเมินช่องโหว่และทดสอบเจาะระบบ (Vulnerability Assessment & PenTest)',
    responsibleRole: 'Certified Cybersecurity Specialist',
    unit: 'ระบบย่อย (Subsystem)',
    defaultRate: 95000,
    defaultQuantity: 1,
    description: 'ทดสอบเจาะระบบตามมาตรฐาน OWASP Top 10 ทั้งระดับ Web Application, Network และ API พร้อมให้แนวทางแก้ไข',
    deliverable: 'รายงานผลการทดสอบเจาะระบบ (Penetration Testing Report)',
    isStandard: true,
  },

  // --- 9. งานสิทธิ์การใช้งานซอฟต์แวร์และเครื่องมือ ---
  {
    id: 'mbom-lic-01',
    category: 'งานสิทธิ์การใช้งานซอฟต์แวร์และเครื่องมือ',
    title: 'ค่าสิทธิ์การใช้งานซอฟต์แวร์ฐานข้อมูลหรือระบบปฏิบัติการเชิงพาณิชย์ (Software License)',
    responsibleRole: 'Software Vendor',
    unit: 'สิทธิ์ (License)',
    defaultRate: 120000,
    defaultQuantity: 1,
    description: 'ลิขสิทธิ์ซอฟต์แวร์หรือแพลตฟอร์มสำหรับดำเนินงานโครงการ พร้อมการรับประกันและอัปเดตเวอร์ชัน',
    deliverable: 'หนังสือรับรองสิทธิ์การใช้งาน (Software License Certificate)',
    isStandard: true,
  },

  // --- 10. ค่าใช้จ่ายดำเนินงานและค่าใช้จ่ายอื่นๆ ---
  {
    id: 'mbom-ops-01',
    category: 'ค่าใช้จ่ายดำเนินงานและค่าใช้จ่ายอื่นๆ',
    title: 'ค่าใช้จ่ายการบริหารโครงการ การประชุมคณะกรรมการ และการตรวจรับมอบงาน',
    responsibleRole: 'Project Management Office (PMO)',
    unit: 'งวดงาน (Milestone)',
    defaultRate: 35000,
    defaultQuantity: 4,
    description: 'ค่าเอกสารตรวจรับ ค่าเดินทาง ค่าจัดประชุมติดตามงานกับคณะกรรมการ และค่าเบ็ดเตล็ดดำเนินงาน',
    deliverable: 'รายงานการประชุมตรวจรับมอบงานและเอกสารส่งมอบโครงการ',
    isStandard: true,
  },
];

export const DEFAULT_SCOPE_ITEMS: TorScopeItem[] = [
  {
    id: 'scope-1',
    clauseNumber: 'ข้อ 4.1',
    title: 'ขอบเขตงานการพัฒนาระบบบริการประชาชนดิจิทัลและการบูรณาการข้อมูล: ผู้รับจ้างต้องดำเนินการศึกษา วิเคราะห์ ออกแบบ พัฒนา ทดสอบ และติดตั้งระบบบริการประชาชนดิจิทัลตามมาตรฐานรัฐบาลดิจิทัลของประเทศไทย',
    requirement: 'ขอบเขตงานการพัฒนาระบบบริการประชาชนดิจิทัลและการบูรณาการข้อมูล: ผู้รับจ้างต้องดำเนินการศึกษา วิเคราะห์ ออกแบบ พัฒนา ทดสอบ และติดตั้งระบบบริการประชาชนดิจิทัลตามมาตรฐานรัฐบาลดิจิทัลของประเทศไทย',
    level: 1,
    startMonth: 1,
    startWeek: 1,
    durationDays: 180,
    durationWeeks: 24,
    responsibleRole: 'ผู้จัดการโครงการและทีมงานที่ปรึกษา',
    proposedMethodology: `บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด กำหนดวิธีการดำเนินงานตามกรอบมาตรฐานสากล Open Group TOGAF และกระบวนการบริหารโครงการแบบ Agile with Waterfall Governance ดังนี้:

• การจัดตั้งคณะทำงานและจัดทำแผนปฏิบัติงานฉบับสมบูรณ์ (Project Management Plan)
• การประสานงานและประชุมติดตามความก้าวหน้าประจำสัปดาห์ (Weekly Sprint Review)
• การควบคุมคุณภาพงานส่งมอบตามมาตรฐานสากล ISO 29110 และ ISO 27001

| ลำดับ | ขั้นตอนการดำเนินงาน | รายละเอียดและวิธีการปฏิบัติงาน |
| 1 | การเตรียมการและวางแผน | ประชุม Kick-off จัดทำแผนปฏิบัติงาน และกำหนดเกณฑ์ตรวจรับ |
| 2 | การขับเคลื่อนและติดตาม | ประชุมติดตามงานรายสัปดาห์ และรายงานสถานะผ่าน Dashboard |
| 3 | การประเมินผลและการส่งมอบ | ตรวจสอบคุณภาพงานตามเกณฑ์มาตรฐาน และสรุปรายงานผลสมบูรณ์ |`,
    toolsAndTechnology: 'Project Management Plan, Jira Enterprise, Confluence',
    deliverable: 'แผนบริหารโครงการและรายงานความก้าวหน้าประจำเดือน',
    complianceStatus: 'comply',
    complianceNote: 'ยอมรับและดำเนินการตามข้อกำหนด TOR ครบถ้วนทุกข้อ',
  },
  {
    id: 'scope-2',
    clauseNumber: 'ข้อ 4.1.1',
    title: 'การศึกษา วิเคราะห์ และรวบรวมความต้องการของระบบ (Requirement Analysis): ผู้รับจ้างต้องศึกษา วิเคราะห์ และรวบรวมความต้องการจากผู้ใช้งานและผู้มีส่วนได้ส่วนเสียทุกกลุ่ม พร้อมจัดทำเอกสารความต้องการของระบบ (SRS)',
    requirement: 'การศึกษา วิเคราะห์ และรวบรวมความต้องการของระบบ (Requirement Analysis): ผู้รับจ้างต้องศึกษา วิเคราะห์ และรวบรวมความต้องการจากผู้ใช้งานและผู้มีส่วนได้ส่วนเสียทุกกลุ่ม พร้อมจัดทำเอกสารความต้องการของระบบ (SRS)',
    level: 2,
    startMonth: 1,
    startWeek: 1,
    durationDays: 35,
    durationWeeks: 5,
    responsibleRole: 'Senior System Analyst',
    proposedMethodology: `ดำเนินการเก็บรวบรวมและวิเคราะห์ความต้องการเชิงลึกจากผู้ใช้งานและผู้มีส่วนได้ส่วนเสียทุกฝ่ายอย่างครบถ้วน:

• จัดทำแบบสอบถามและดำเนินการสัมภาษณ์เชิงลึก (In-depth Interview) กับบุคลากรหลัก
• จัดการประชุมเชิงปฏิบัติการ (Focus Group Workshop) เพื่อสร้าง User Journey และ Service Blueprint
• วิเคราะห์และจัดทำเอกสารข้อกำหนดความต้องการระบบ (SRS) ตามมาตรฐาน IEEE 830

| ขั้นตอน | กิจกรรมหลัก | ผลลัพธ์ที่ได้ |
| 1 | Workshop เก็บความต้องการ | แผนผัง User Journey และบันทึกผลการสำรวจ |
| 2 | วิเคราะห์และจำลองฟังก์ชัน | ต้นแบบหน้าจอแบบตอบสนองได้ (Interactive Prototype) |
| 3 | สรุปเอกสารข้อกำหนด | เอกสารข้อกำหนดความต้องการระบบ (SRS) ฉบับสมบูรณ์ |`,
    toolsAndTechnology: 'Figma, Miro, Jira, IEEE 830 Template',
    deliverable: 'เอกสารข้อกำหนดความต้องการระบบ (SRS) และบันทึกผลการประชุมสำรวจ',
    complianceStatus: 'exceed',
    complianceNote: 'จัดทำ Interactive UI Prototype บน Figma ให้ทดลองใช้งานจริงก่อนเริ่มเขียนโค้ดเพื่อความถูกต้อง 100%',
  },
  {
    id: 'scope-3',
    clauseNumber: 'ข้อ 4.1.1.1',
    title: 'การวิเคราะห์กระบวนการทำงานและกฎหมายที่เกี่ยวข้อง (Business Process & Regulation Analysis): วิเคราะห์กฎระเบียบ ข้อบังคับ และขั้นตอนการให้บริการประชาชนของหน่วยงานเพื่อปรับกระบวนงานให้เป็นระบบดิจิทัล (Digital Workflow)',
    requirement: 'การวิเคราะห์กระบวนการทำงานและกฎหมายที่เกี่ยวข้อง (Business Process & Regulation Analysis): วิเคราะห์กฎระเบียบ ข้อบังคับ และขั้นตอนการให้บริการประชาชนของหน่วยงานเพื่อปรับกระบวนงานให้เป็นระบบดิจิทัล (Digital Workflow)',
    level: 3,
    startMonth: 1,
    startWeek: 2,
    durationDays: 20,
    durationWeeks: 3,
    responsibleRole: 'Business Analyst & ที่ปรึกษากฎหมายไอที',
    proposedMethodology: 'จัดทำแผนภาพกระบวนงานแบบ As-Is และ To-Be Process Map พร้อมตรวจสอบความสอดคล้องกับ พ.ร.บ. ปฏิบัติราชการทางอิเล็กทรอนิกส์ พ.ศ. 2565',
    toolsAndTechnology: 'BPMN 2.0, Camunda Modeler, Lucidchart',
    deliverable: 'แผนผังกระบวนงานดิจิทัล (As-Is / To-Be Workflow) และรายงานผลการวิเคราะห์กฎหมาย',
    complianceStatus: 'comply',
    complianceNote: 'ยอมรับและดำเนินการตามข้อกำหนด TOR ครบถ้วน',
  },
  {
    id: 'scope-4',
    clauseNumber: 'ข้อ 4.1.1.1.1',
    title: 'การวิเคราะห์การคุ้มครองข้อมูลส่วนบุคคล (PDPA Compliance Analysis): ประเมินความเสี่ยงและมาตรการคุ้มครองข้อมูลส่วนบุคคลของประชาชนผู้มาใช้บริการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562',
    requirement: 'การวิเคราะห์การคุ้มครองข้อมูลส่วนบุคคล (PDPA Compliance Analysis): ประเมินความเสี่ยงและมาตรการคุ้มครองข้อมูลส่วนบุคคลของประชาชนผู้มาใช้บริการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562',
    level: 4,
    startMonth: 1,
    startWeek: 3,
    durationDays: 14,
    durationWeeks: 2,
    responsibleRole: 'Data Protection Specialist (DPO Expert)',
    proposedMethodology: 'จัดทำรายงานการประเมินผลกระทบด้านการคุ้มครองข้อมูลส่วนบุคคล (Data Protection Impact Assessment: DPIA) และร่าง Privacy Policy / Consent Management',
    toolsAndTechnology: 'DPIA Framework, OWASP Privacy Standards',
    deliverable: 'รายงานผลการประเมิน DPIA และแบบร่างนโยบายคุ้มครองข้อมูลส่วนบุคคล',
    complianceStatus: 'exceed',
    complianceNote: 'เพิ่มการตรวจประเมิน Privacy Impact Assessment (PIA) เต็มรูปแบบ พร้อมระบบบันทึกความยินยอม Consent Management แบบอัตโนมัติ',
  },
  {
    id: 'scope-5',
    clauseNumber: 'ข้อ 4.1.1.1.1.1',
    title: 'การจัดทำบัญชีรายการข้อมูลส่วนบุคคล (Record of Processing Activities: ROPA): ระบุและจำแนกหมวดหมู่ของข้อมูลส่วนบุคคลทั้งหมดที่มีการเก็บรวบรวม ใช้ หรือเปิดเผยในระบบงานบริการดิจิทัล',
    requirement: 'การจัดทำบัญชีรายการข้อมูลส่วนบุคคล (Record of Processing Activities: ROPA): ระบุและจำแนกหมวดหมู่ของข้อมูลส่วนบุคคลทั้งหมดที่มีการเก็บรวบรวม ใช้ หรือเปิดเผยในระบบงานบริการดิจิทัล',
    level: 5,
    startMonth: 1,
    startWeek: 4,
    durationDays: 7,
    durationWeeks: 1,
    responsibleRole: 'System Analyst & Security Auditor',
    proposedMethodology: 'สแกน Data Lineage และสร้างทะเบียน ROPA Matrix กำหนดระยะเวลาการจัดเก็บ (Retention Period) และนโยบายทำลายข้อมูลอัตโนมัติ',
    toolsAndTechnology: 'ROPA Matrix Spreadsheet, OneTrust Template',
    deliverable: 'ตารางบัญชีรายการข้อมูลส่วนบุคคล (ROPA Document)',
    complianceStatus: 'comply',
    complianceNote: 'ยอมรับและดำเนินการตามข้อกำหนด TOR ครบถ้วน',
  },
  {
    id: 'scope-6',
    clauseNumber: 'ข้อ 4.2',
    title: 'การออกแบบสถาปัตยกรรมระบบ ฐานข้อมูล และความมั่นคงปลอดภัย (System Architecture Design): ออกแบบสถาปัตยกรรมระบบ Cloud-Native และฐานข้อมูลที่รองรับการขยายตัว (Scalability) ตามมาตรฐาน ISO 27001',
    requirement: 'การออกแบบสถาปัตยกรรมระบบ ฐานข้อมูล และความมั่นคงปลอดภัย (System Architecture Design): ออกแบบสถาปัตยกรรมระบบ Cloud-Native และฐานข้อมูลที่รองรับการขยายตัว (Scalability) ตามมาตรฐาน ISO 27001',
    level: 2,
    startMonth: 2,
    startWeek: 1,
    durationDays: 30,
    durationWeeks: 4,
    responsibleRole: 'Solution Architect',
    proposedMethodology: 'ออกแบบสถาปัตยกรรมแบบ Microservices บน Kubernetes และระบบ High Availability (HA) Multi-Zone พร้อมระบบสำรองข้อมูลอัตโนมัติ',
    toolsAndTechnology: 'Kubernetes, Docker, Kong API Gateway, PostgreSQL',
    deliverable: 'เอกสารการออกแบบสถาปัตยกรรมระบบ (System Architecture & Data Dictionary)',
    complianceStatus: 'exceed',
    complianceNote: 'ออกแบบสถาปัตยกรรมระบบ Microservices บน Kubernetes Multi-Zone HA รองรับ SLA สูงถึง 99.95% และ Auto-scaling',
  },
  {
    id: 'scope-7',
    clauseNumber: 'ข้อ 4.3',
    title: 'การพัฒนาระบบบริการประชาชนดิจิทัลและการเชื่อมโยงข้อมูล (Development & Integration): พัฒนา Web Portal ที่รองรับ Responsive Design พร้อมเชื่อมต่อ API ภายนอก และระบบยืนยันตัวตนดิจิทัล (Digital ID)',
    requirement: 'การพัฒนาระบบบริการประชาชนดิจิทัลและการเชื่อมโยงข้อมูล (Development & Integration): พัฒนา Web Portal ที่รองรับ Responsive Design พร้อมเชื่อมต่อ API ภายนอก และระบบยืนยันตัวตนดิจิทัล (Digital ID)',
    level: 2,
    startMonth: 3,
    startWeek: 1,
    durationDays: 70,
    durationWeeks: 10,
    responsibleRole: 'Lead Software Engineer',
    proposedMethodology: 'พัฒนาด้วย React.js / Node.js เชื่อมต่อ thaID API และจัดทำระบบคิวข้อความ Asynchronous สำหรับการประมวลผลคำขอจำนวนมาก',
    toolsAndTechnology: 'React.js, Node.js, Redis, RabbitMQ, Docker',
    deliverable: 'Source Code และระบบ Portal ที่ติดตั้งบน Staging Environment',
    complianceStatus: 'comply',
    complianceNote: 'ยอมรับและดำเนินการตามข้อกำหนด TOR ครบถ้วน',
  },
  {
    id: 'scope-8',
    clauseNumber: 'ข้อ 4.4',
    title: 'การทดสอบระบบ การทดสอบความปลอดภัย และการทดสอบรับมอบงาน (Testing & UAT): ดำเนินการทดสอบระบบทั้ง Functional Test, Performance Load Test และ Penetration Testing ตามมาตรฐาน OWASP Top 10',
    requirement: 'การทดสอบระบบ การทดสอบความปลอดภัย และการทดสอบรับมอบงาน (Testing & UAT): ดำเนินการทดสอบระบบทั้ง Functional Test, Performance Load Test และ Penetration Testing ตามมาตรฐาน OWASP Top 10',
    level: 2,
    startMonth: 5,
    startWeek: 1,
    durationDays: 28,
    durationWeeks: 4,
    responsibleRole: 'QA Lead & Security Specialist',
    proposedMethodology: 'ทดสอบ Automated Test Scripts, Stress Test รองรับ 10,000 Concurrent Users และจ้างผู้เชี่ยวชาญอิสระทำ PenTest',
    toolsAndTechnology: 'JMeter, Cypress, Burp Suite Professional, OWASP ZAP',
    deliverable: 'รายงานผลการทดสอบระบบ (Test Results) และใบรับรองผลการทดสอบเจาะระบบ (PenTest Report)',
    complianceStatus: 'exceed',
    complianceNote: 'เพิ่มการทดสอบความปลอดภัยโดยผู้เชี่ยวชาญอิสระที่ได้รับใบรับรองระดับสากล (OSCP/CISSP) และทดสอบ Stress Test รองรับ 15,000 Concurrent Users',
  },
  {
    id: 'scope-9',
    clauseNumber: 'ข้อ 4.5',
    title: 'การฝึกอบรมบุคลากร การขึ้นระบบใช้งานจริง และการรับประกันบำรุงรักษา (Training & Maintenance): จัดฝึกอบรมบุคลากรไม่น้อยกว่า 2 รุ่น จัดทำคู่มือ และรับประกันบำรุงรักษาระบบ (Warranty) ไม่น้อยกว่า 1 ปี',
    requirement: 'การฝึกอบรมบุคลากร การขึ้นระบบใช้งานจริง และการรับประกันบำรุงรักษา (Training & Maintenance): จัดฝึกอบรมบุคลากรไม่น้อยกว่า 2 รุ่น จัดทำคู่มือ และรับประกันบำรุงรักษาระบบ (Warranty) ไม่น้อยกว่า 1 ปี',
    level: 2,
    startMonth: 5,
    startWeek: 3,
    durationDays: 21,
    durationWeeks: 3,
    responsibleRole: 'Training Specialist & PM',
    proposedMethodology: 'จัดทำคู่มือรูปเล่มและวิดีโอ e-Learning พร้อมเปิดระบบ Helpdesk Support 24/7 และแก้ไขปัญหาฉุกเฉินภายใน 2 ชั่วโมง',
    toolsAndTechnology: 'Zoom Webinar, Helpdesk Ticketing System, LMS Portal',
    deliverable: 'คู่มือการใช้งานระบบ บันทึกการฝึกอบรม และหนังสือรับประกัน SLA 1 ปี',
    complianceStatus: 'comply',
    complianceNote: 'ยอมรับและดำเนินการตามข้อกำหนด TOR ครบถ้วน',
  },
];

export const DEFAULT_DOCUMENT_STRUCTURE: DocumentStructureConfig = {
  autoRenumber: true,
  sections: [
    {
      id: 'section1',
      sectionNumber: 'ส่วนที่ 1',
      title: 'บทนำ ภาพรวมโครงการ และขอบเขตงานตามประกาศจัดจ้าง',
      enabled: true,
      order: 1,
      headings: [
        {
          id: 's1_background',
          title: 'ความเป็นมาและความสำคัญ',
          originalCode: '1.1',
          description: 'ความเป็นมา วัตถุประสงค์เชิงยุทธศาสตร์ และความจำเป็นของโครงการ',
          enabled: true,
          order: 1,
        },
        {
          id: 's1_objectives',
          title: 'วัตถุประสงค์ของโครงการ',
          originalCode: '1.2',
          description: 'รายการวัตถุประสงค์เป้าหมายของโครงการ',
          enabled: true,
          order: 2,
        },
        {
          id: 's1_expected_benefits',
          title: 'ประโยชน์ที่คาดว่าจะได้รับ',
          originalCode: '1.3',
          description: 'ประโยชน์และความคุ้มค่าที่จะได้รับหลังโครงการแล้วเสร็จ',
          enabled: true,
          order: 3,
        },
        {
          id: 's1_target_audience',
          title: 'กลุ่มเป้าหมายและกรอบระยะเวลาดำเนินงาน',
          originalCode: '1.4',
          description: 'กลุ่มเป้าหมายผู้ใช้งาน ระยะเวลาโครงการ และวงเงินงบประมาณ',
          enabled: true,
          order: 4,
        },
        {
          id: 's1_scope',
          title: 'ขอบเขตงานตามประกาศจัดจ้าง (TOR)',
          originalCode: '1.5',
          description: 'ภาพรวมขอบเขตงานและรายการขอบเขตงานจำแนกตามโครงสร้างข้อกำหนด TOR',
          enabled: true,
          order: 5,
        },
      ],
    },
    {
      id: 'section2',
      sectionNumber: 'ส่วนที่ 2',
      title: 'แผนการดำเนินงานตลอดโครงการ (Work Plan & Gantt Chart)',
      enabled: true,
      order: 2,
      headings: [
        {
          id: 's2_gantt',
          title: 'แผนภูมิแกนต์ (Gantt Chart) แสดงการปฏิบัติงานรายสัปดาห์',
          originalCode: '2.1',
          description: 'ภาพแผนภูมิแกนต์แนวนอน (Landscape) แสดงไทม์ไลน์รายสัปดาห์ตลอดโครงการ',
          enabled: true,
          order: 1,
        },
        {
          id: 's2_timeline',
          title: 'ตารางกำหนดช่วงเวลาการทำงานตามขอบเขตงาน TOR',
          originalCode: '2.2',
          description: 'ตารางจำแนกเดือนที่เริ่ม สัปดาห์ ระยะเวลาวัน และผู้รับผิดชอบหลักของแต่ละข้อ',
          enabled: true,
          order: 2,
        },
        {
          id: 's2_milestones',
          title: 'แผนการส่งมอบงานและการเบิกจ่ายเงิน (Milestones & Deliverables)',
          originalCode: '2.3',
          description: 'ตารางแสดงงวดงาน ร้อยละเบิกจ่าย วงเงิน และเอกสารผลงานที่ส่งมอบในแต่ละงวด',
          enabled: true,
          order: 3,
        },
      ],
    },
    {
      id: 'section3',
      sectionNumber: 'ส่วนที่ 3',
      title: 'แนวคิดและวิธีการดำเนินงาน',
      enabled: true,
      order: 3,
      headings: [
        {
          id: 's3_framework',
          title: 'กรอบแนวคิดการดำเนินงาน (Conceptual Framework)',
          originalCode: '3.1',
          description: 'อัพโหลดภาพแนวคิดและพรรณาภาพรวมสถาปัตยกรรมระบบ',
          enabled: true,
          order: 1,
        },
        {
          id: 's3_approach',
          title: 'แนวคิดการดำเนินโครงการ (Project Approach & Principles)',
          originalCode: '3.2',
          description: 'ถอดกรอบ อธิบายหลักการทำงาน เนื้อหาหลักสูตร วิธีศึกษางานรวมๆ',
          enabled: true,
          order: 2,
        },
        {
          id: 's3_methodology',
          title: 'วิธีการดำเนินงาน (การทำงานตามขอบเขตงานแต่ละข้อ)',
          originalCode: '3.3',
          description: 'การทำงานตามขอบเขตงานแต่ละข้อ (TOR Scope Items) พร้อมเครื่องมือ สิ่งส่งมอบ และภาพประกอบรายข้อ',
          enabled: true,
          order: 3,
        },
      ],
    },
    {
      id: 'section4',
      sectionNumber: 'ส่วนที่ 4',
      title: 'คณะผู้ดำเนินงาน แนวทางบริหารความเสี่ยง และตารางเปรียบเทียบข้อเสนอ',
      enabled: true,
      order: 4,
      headings: [
        {
          id: 's4_team_overview',
          title: 'โครงสร้างบุคลากรและคณะผู้ดำเนินงาน (ตารางภาพรวม)',
          originalCode: '4.1',
          description: 'ตารางรายชื่อบุคลากร ตำแหน่งในโครงการ ประสบการณ์ และวุฒิการศึกษา',
          enabled: true,
          order: 1,
        },
        {
          id: 's4_team_cv',
          title: 'ประวัติส่วนตัวและประสบการณ์การทำงานรายบุคคล (CV พร้อมรูปถ่าย)',
          originalCode: '4.1.2',
          description: 'การ์ดประวัติส่วนตัว รูปถ่าย 1.5 นิ้ว บทบาทความรับผิดชอบ และผลงานเด่นรายบุคคล',
          enabled: true,
          order: 2,
        },
        {
          id: 's4_risk',
          title: 'แผนการบริหารจัดการความเสี่ยงโครงการ (Risk Management Plan)',
          originalCode: '4.2',
          description: 'ตารางวิเคราะห์ความเสี่ยง 5 มิติ โอกาส ผลกระทบ มาตรการป้องกัน และแผนสำรอง',
          enabled: true,
          order: 3,
        },
        {
          id: 's4_project_management',
          title: 'การบริหารจัดการโครงการ (Project Management)',
          originalCode: '4.3',
          description: 'รายละเอียดพรรณาแนวทางการบริหารจัดการโครงการ แผนผังขั้นตอนการทำงาน (Workflow) และภาพประกอบ',
          enabled: true,
          order: 4,
        },
        {
          id: 's4_compliance',
          title: 'ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR (Compliance Matrix)',
          originalCode: '4.4',
          description: 'ตารางยืนยันการปฏิบัติตาม TOR พร้อมระบุรายการที่บริษัทฯ เสนอแนวทางเหนือกว่าเกณฑ์',
          enabled: true,
          order: 5,
        },
      ],
    },
    {
      id: 'section5',
      sectionNumber: 'ส่วนที่ 5',
      title: 'ประวัติและประสบการณ์ของบริษัทที่เกี่ยวข้อง',
      enabled: true,
      order: 5,
      headings: [
        {
          id: 's5_profile',
          title: 'ข้อมูลทั่วไปของบริษัท (ประวัติ, โลโก้, รูปสำนักงาน, ทุนจดทะเบียน)',
          originalCode: '5.1',
          description: 'ประวัติความเป็นมา โลโก้ ภาพสำนักงาน ทุนจดทะเบียน และวิสัยทัศน์พันธกิจ',
          enabled: true,
          order: 1,
        },
        {
          id: 's5_certifications',
          title: 'มาตรฐานและการรับรองคุณภาพ',
          originalCode: '5.2',
          description: 'รายการมาตรฐานสากล เช่น ISO, CMMI และการรับรองคุณภาพองค์กร',
          enabled: true,
          order: 2,
        },
        {
          id: 's5_tor_reference',
          title: 'ผลงานอ้างอิงหลักตามเกณฑ์ TOR (ย้อนหลังไม่เกินเกณฑ์กำหนด)',
          originalCode: '5.3.1',
          description: 'ตารางสัญญาจ้างผลงานอ้างอิงหลักตรงตาม TOR พร้อมภาพประกอบผลงาน',
          enabled: true,
          order: 3,
        },
        {
          id: 's5_supplementary',
          title: 'ผลงานและประสบการณ์โครงการอื่นๆ ที่เกี่ยวข้อง',
          originalCode: '5.3.2',
          description: 'ตารางผลงานและประสบการณ์โครงการอื่นๆ ที่เกี่ยวข้องและเป็นประโยชน์ต่อโครงการจ้าง',
          enabled: true,
          order: 4,
        },
        {
          id: 's5_appendix_certs',
          title: 'ภาคผนวก ก: สำเนาสัญญาจ้างและหนังสือรับรองผลงาน',
          originalCode: 'ภาคผนวก ก',
          description: 'แนบสำเนาสัญญาจ้างและหนังสือรับรองผลงานตามประกาศจัดจ้าง',
          enabled: true,
          order: 5,
        },
      ],
    },
  ],
};

export function getDefaultDocumentStructure(): DocumentStructureConfig {
  return JSON.parse(JSON.stringify(DEFAULT_DOCUMENT_STRUCTURE));
}

export function normalizeDocumentStructure(
  existing?: DocumentStructureConfig
): DocumentStructureConfig {
  const defaultStruct = getDefaultDocumentStructure();
  if (!existing || !Array.isArray(existing.sections) || existing.sections.length === 0) {
    return defaultStruct;
  }

  const autoRenumber = existing.autoRenumber ?? true;
  const existingSectionMap = new Map(existing.sections.map((s) => [s.id, s]));

  const mergedSections = defaultStruct.sections.map((defSec) => {
    const userSec = existingSectionMap.get(defSec.id);
    if (!userSec) return defSec;

    const existingHeadingMap = new Map((userSec.headings || []).map((h) => [h.id, h]));
    const userHeadings = (userSec.headings || []).filter((h) =>
      defSec.headings.some((dh) => dh.id === h.id)
    );

    defSec.headings.forEach((dh) => {
      if (!existingHeadingMap.has(dh.id)) {
        userHeadings.push(dh);
      }
    });

    // Special migration for Section 3 restructure (3.1 กรอบแนวคิด, 3.2 แนวคิดดำเนินโครงการ, 3.3 วิธีการดำเนินงาน)
    if (defSec.id === 'section3') {
      if (!existingHeadingMap.has('s3_approach')) {
        const methH = userHeadings.find((h) => h.id === 's3_methodology');
        if (methH) {
          methH.order = 3;
          methH.originalCode = '3.3';
          if (methH.title === 'วิธีการดำเนินงานและส่งมอบตามข้อกำหนด TOR แต่ละข้อ') {
            methH.title = 'วิธีการดำเนินงาน (การทำงานตามขอบเขตงานแต่ละข้อ)';
          }
        }
      }
    }

    const secTitle =
      userSec.title === 'กรอบแนวคิดและวิธีการดำเนินงานตามข้อกำหนด (TOR Mapping)'
        ? defSec.title
        : userSec.title || defSec.title;

    const mappedHeadings = userHeadings.map((h, idx) => {
      const defH = defSec.headings.find((dh) => dh.id === h.id) || h;
      return {
        ...defH,
        title: h.title || defH.title,
        enabled: h.enabled ?? defH.enabled,
        order: h.order ?? idx + 1,
      };
    });

    mappedHeadings.sort((a, b) => a.order - b.order);

    return {
      ...defSec,
      title: secTitle,
      enabled: userSec.enabled ?? defSec.enabled,
      order: userSec.order ?? defSec.order,
      headings: mappedHeadings,
    };
  });

  mergedSections.sort((a, b) => a.order - b.order);

  return {
    autoRenumber,
    sections: mergedSections,
  };
}

export const INITIAL_PROPOSAL_DATA: ProposalData = {
  documentStructure: getDefaultDocumentStructure(),
  cover: {
    projectTitle: 'โครงการพัฒนากำลังคนด้านดิจิทัลระดับพื้นที่ให้พร้อมเข้าสู่ยุคเศรษฐกิจและสังคมดิจิทัล',
    projectCode: '69099626909',
    clientAgency: 'สำนักงานสถิติแห่งชาติ',
    clientDepartment: 'กองยุทธศาสตร์และพัฒนาดิจิทัลภาครัฐ',
    submitterCompany: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด',
    submitterSubtext: 'Prime Digital Consultant Co., Ltd. - Digital Transformation & Enterprise Solutions',
    submissionDate: '15 พฤษภาคม 2568',
    budgetFormatted: '7,500,000 บาท (เจ็ดล้านห้าแสนบาทถ้วน)',
    includeBackCover: true,
    includeTOC: true,
  },
  section1: {
    background: 'ตามที่หน่วยงานมีนโยบายในการขับเคลื่อนการเปลี่ยนผ่านสู่รัฐบาลดิจิทัล (Digital Government Transformation) เพื่อยกระดับการให้บริการประชาชนให้มีความสะดวกรวดเร็ว ปลอดภัย และโปร่งใส บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด ตระหนักถึงความสำคัญในการบูรณาการระบบงานและการเชื่อมโยงข้อมูล จึงขอเสนอแนวทางในการพัฒนาระบบบริการประชาชนดิจิทัลและการบูรณาการฐานข้อมูลอัจฉริยะ ซึ่งนำเทคโนโลยีคลาวด์และมาตรฐานความปลอดภัยสากลมาประยุกต์ใช้เพื่อความสำเร็จสูงสุดของโครงการ',
    objectives: [
      'เพื่อพัฒนาระบบบริการดิจิทัล (Digital Services) ที่ตอบสนองความต้องการของประชาชนได้อย่างสะดวกรวดเร็ว ตลอด 24 ชั่วโมง',
      'เพื่อบูรณาการเชื่อมโยงฐานข้อมูลระหว่างหน่วยงานในสังกัดอย่างไร้รอยต่อ และเป็นไปตามมาตรฐานการแลกเปลี่ยนข้อมูลภาครัฐ',
      'เพื่อยกระดับความมั่นคงปลอดภัยสารสนเทศตามมาตรฐาน พ.ร.บ. การรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2562 และ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)',
      'เพื่อเพิ่มประสิทธิภาพการบริหารจัดการภาครัฐด้วยแดชบอร์ดข้อมูลเชิงลึก (Data Analytics) สำหรับผู้บริหาร',
    ],
    expectedBenefits: [
      'ประชาชนได้รับความสะดวกสบายในการติดต่อราชการ ลดขั้นตอนและระยะเวลาในการยื่นคำร้องลงไม่น้อยกว่า 60%',
      'หน่วยงานมีฐานข้อมูลกลางที่ถูกต้อง ครบถ้วน และสามารถนำไปวิเคราะห์เพื่อกำหนดนโยบายได้อย่างแม่นยำ',
      'ลดการใช้กระดาษ (Paperless) และค่าใช้จ่ายในการดำเนินงานด้านเอกสารอย่างมีนัยสำคัญ',
      'เพิ่มความเชื่อมั่นในระบบสารสนเทศภาครัฐด้วยมาตรฐานความปลอดภัยระดับสูง',
    ],
    targetAudience: 'ประชาชนทั่วไป เจ้าหน้าที่ผู้ปฏิบัติงานของหน่วยงาน และผู้บริหารระดับสูง',
    projectScopeOverview: 'ขอบเขตงานครอบคลุมการศึกษา วิเคราะห์ ออกแบบ พัฒนา ทดสอบ ติดตั้งระบบ ฝึกอบรมบุคลากร และการรับประกันดูแลรักษาระบบตลอดระยะเวลา 1 ปี นับถัดจากวันตรวจรับมอบงาน โดยมีรายละเอียดข้อกำหนดเต็มทุกข้อตามประกาศจัดจ้างของหน่วยงานจำแนกตามโครงสร้างข้อหลักและข้อย่อยถึงระดับ 5 ดังต่อไปนี้',
    projectDurationDays: 180,
    projectDurationMonths: 6,
    budgetAmount: 7500000,
    scopeItems: [...DEFAULT_SCOPE_ITEMS],
  },
  section2: {
    workPlanOverview: 'บริษัทฯ ได้วางแผนการดำเนินงานตามระเบียบแบบแผนสากล โดยจำแนกกิจกรรมย่อยตามข้อกำหนดขอบเขตงาน (TOR) ทุกข้อลงในแผนภูมิแกนต์ (Gantt Chart) เพื่อให้เห็นภาพกำหนดเวลาทำงานเป็นรายสัปดาห์ (1 เดือนมี 4 วีค) และจำนวนวันที่ใช้ปฏิบัติงานจริงอย่างชัดเจนและรัดกุม',
    milestones: [
      {
        id: 'm-1',
        installment: 1,
        title: 'งวดที่ 1: แผนการดำเนินงานและข้อกำหนดความต้องการระบบ',
        percentage: 20,
        amount: 1500000,
        timeframe: 'ภายใน 30 วันนับถัดจากวันลงนามในสัญญา',
        deliverables: [
          'แผนการบริหารโครงการ (Project Management Plan)',
          'รายงานผลการศึกษาและข้อกำหนดความต้องการระบบ (SRS)',
          'โครงสร้างสถาปัตยกรรมระบบเบื้องต้น (Preliminary Architecture)',
        ],
      },
      {
        id: 'm-2',
        installment: 2,
        title: 'งวดที่ 2: การออกแบบระบบและพิมพ์เขียวฉบับสมบูรณ์',
        percentage: 25,
        amount: 1875000,
        timeframe: 'ภายใน 75 วันนับถัดจากวันลงนามในสัญญา',
        deliverables: [
          'เอกสารการออกแบบสถาปัตยกรรมระบบและฐานข้อมูล (SDD & Data Dictionary)',
          'ผลงานการออกแบบหน้าจอและประสบการณ์ผู้ใช้งาน (UX/UI Prototype)',
          'แผนผังความปลอดภัยและการเชื่อมต่อเครือข่าย',
        ],
      },
      {
        id: 'm-3',
        installment: 3,
        title: 'งวดที่ 3: การพัฒนาระบบส่วนหน้า ส่วนหลัง และการเชื่อมโยงข้อมูล',
        percentage: 30,
        amount: 2250000,
        timeframe: 'ภายใน 135 วันนับถัดจากวันลงนามในสัญญา',
        deliverables: [
          'ระบบสารสนเทศตามขอบเขตงานที่พัฒนาแล้วเสร็จบนสภาพแวดล้อมทดสอบ (Staging Environment)',
          'รายงานการเชื่อมต่อ API กับระบบภายนอก',
          'รายงานผลการทดสอบเบื้องต้น (Internal QA Report)',
        ],
      },
      {
        id: 'm-4',
        installment: 4,
        title: 'งวดที่ 4: การทดสอบ UAT การขึ้นระบบใช้งานจริง และการฝึกอบรม',
        percentage: 25,
        amount: 1875000,
        timeframe: 'ภายใน 180 วันนับถัดจากวันลงนามในสัญญา',
        deliverables: [
          'รายงานผลการทดสอบการยอมรับของผู้ใช้ (UAT Sign-off Report)',
          'รายงานผลการทดสอบความมั่นคงปลอดภัย (Security & PenTest Report)',
          'คู่มือการใช้งานสำหรับผู้ดูแลระบบและผู้ใช้งานทั่วไป',
          'หลักฐานการจัดฝึกอบรมบุคลากร และบันทึกส่งมอบซอร์สโค้ด (Source Code) ครบถ้วน',
        ],
      },
    ],
  },
  section3: {
    conceptualDiagramImage: RECOVERED_FRAMEWORK_IMAGE,
    frameworkOverview: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด กำหนดกรอบแนวคิดการดำเนินงานภายใต้หลักการ 4 มิติ คือ Modern Architecture, High Security & Compliance, User-Centric Design, และ Agile Collaboration เพื่อให้การพัฒนาระบบมีความทันสมัย รองรับปริมาณผู้ใช้งานจำนวนมาก และตอบสนองต่อขอบเขตงาน (TOR) ทุกข้ออย่างสมบูรณ์แบบ',
    conceptualDiagramCaption: 'ภาพที่ 3-1 กรอบแนวคิดสถาปัตยกรรมระบบบริการประชาชนดิจิทัลและการบูรณาการข้อมูล (Enterprise Conceptual Framework)',
    projectApproachOverview: `การถอดกรอบแนวคิดสู่การดำเนินโครงการจริง (Project Approach & Operational Principles)
บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด ได้ถอดกรอบแนวคิดสถาปัตยกรรมระบบ (Conceptual Framework) ในข้อ 3.1 มาสู่แนวทางการปฏิบัติงานและหลักการทำงานที่เป็นรูปธรรม โดยยึดหลักการทำงานสำคัญ 4 ประการ ดังนี้:

• การออกแบบระบบที่ยึดผู้ใช้งานเป็นศูนย์กลาง (User-Centric Architecture): ออกแบบกระบวนการทำงานและหน้าจอใช้งาน (UI/UX) ให้เรียบง่าย ลดขั้นตอนซ้ำซ้อน และรองรับการเข้าถึงของผู้ใช้งานทุกกลุ่ม (Accessibility ตามมาตรฐาน WCAG 2.1 AA)
• สถาปัตยกรรมแบบเปิดและยืดหยุ่น (Microservices & Open API Gateway): พัฒนาระบบด้วยเทคโนโลยี Cloud-Native และ Containerization เพื่อให้สามารถขยายขีดความสามารถ (Horizontal Scaling) รองรับปริมาณธุรกรรมสูง และเชื่อมโยงข้อมูลกับหน่วยงานภายนอกได้อย่างปลอดภัย
• มาตรฐานความมั่นคงปลอดภัยและการคุ้มครองข้อมูล (Zero Trust Security & PDPA Compliance): บังคับใช้การยืนยันตัวตนหลายชั้น (MFA), การเข้ารหัสข้อมูลทั้งขณะพัก (Data at Rest) และขณะส่งผ่านเครือข่าย (Data in Transit ด้วย TLS 1.3), ตลอดจนปฏิบัติตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
• การบริหารจัดการและส่งมอบงานแบบคล่องตัว (Agile Collaboration Methodology): แบ่งรอบการทำงานเป็น Sprint ย่อย รอบละ 2 สัปดาห์ เพื่อนำส่งชิ้นงานให้ผู้ว่าจ้างตรวจรับและทดสอบอย่างต่อเนื่อง ลดความเสี่ยงจากการคลาดเคลื่อนของขอบเขตงาน

| ลำดับ | เสาหลักการดำเนินงาน | เครื่องมือและกรอบมาตรฐานที่นำมาใช้ | ผลลัพธ์และคุณค่าที่ส่งมอบ |
| :---: | :--- | :--- | :--- |
| 1 | การศึกษาวิเคราะห์ความต้องการ (Requirement Gathering) | Design Thinking Workshop, User Journey Mapping, MoSCoW Prioritization | รายละเอียดข้อกำหนดความต้องการระบบ (SRS) ที่ตรงใจผู้ใช้ |
| 2 | การออกแบบสถาปัตยกรรมระบบ (System Architecture) | TOGAF 9.2, Microservices, Kubernetes, RESTful OpenAPI 3.0 | พิมพ์เขียวระบบสารสนเทศที่มีเสถียรภาพและขยายตัวได้ |
| 3 | การพัฒนาและประกอบระบบ (Agile Engineering) | Spring Boot, React, Node.js, GitLab CI/CD, SonarQube | ซอร์สโค้ดมาตรฐานระดับสากล ปลอดภัย ไร้ช่องโหว่ |
| 4 | การประกันคุณภาพและทดสอบ (QA & Security Testing) | JMeter, Cypress Automated Testing, OWASP Top 10, PenTest | ระบบผ่านเกณฑ์ UAT และได้รับการรับรองความปลอดภัย |
| 5 | หลักสูตรและการถ่ายทอดความรู้ (Training & Knowledge Transfer) | Role-Based Training Curriculum, LMS Portal, VDO On-Demand | บุคลากรผู้ว่าจ้างสามารถดูแลและใช้งานระบบได้อย่างยั่งยืน |

โครงสร้างเนื้อหาหลักสูตรการฝึกอบรม (Training Curriculum Framework)
เพื่อให้บุคลากรของหน่วยงานผู้ว่าจ้างสามารถปฏิบัติงานบนระบบใหม่ได้อย่างราบรื่น บริษัทฯ ได้ออกแบบหลักสูตรฝึกอบรมแบ่งตามกลุ่มเป้าหมาย 3 ระดับ:
• หลักสูตรสำหรับผู้บริหาร (Executive Overview): การใช้ประโยชน์จากข้อมูลสถิติ แดชบอร์ดสรุปผลเชิงบริหาร และการติดตามตัวชี้วัด (KPIs)
• หลักสูตรสำหรับผู้ดูแลระบบและทีมเทคนิค (System & Security Administrator): การบริหารจัดการบัญชีผู้ใช้ สิทธิ์การเข้าถึง การสำรองและกู้คืนข้อมูล (Backup & DR) และการเฝ้าระวังความมั่นคงปลอดภัย
• หลักสูตรสำหรับเจ้าหน้าที่ผู้ปฏิบัติงาน (End-User Operations): ขั้นตอนการบันทึกข้อมูล การตรวจสอบความถูกต้อง การประมวลผลคำขอ และการแก้ไขปัญหาการใช้งานเบื้องต้น

ระเบียบวิธีศึกษางานและรวบรวมข้อมูลในภาพรวม (Study & Discovery Methodology)
บริษัทฯ นำระเบียบวิธีศึกษางานแบบผสมผสาน (Hybrid Discovery Method) มาประยุกต์ใช้ ประกอบด้วย:
1. การสัมภาษณ์เชิงลึก (In-depth Interviews) กับผู้มีส่วนได้ส่วนเสียทุกระดับ เพื่อทำความเข้าใจ Pain Points และความคาดหวัง
2. การสำรวจกระบวนการทำงานปัจจุบัน (As-Is Process Mapping) ร่วมกับการสังเกตการณ์หน้างานจริง (Contextual Inquiry)
3. การศึกษาเปรียบเทียบมาตรฐานสากล (Benchmarking & Best Practices) กับระบบงานชั้นนำทั้งในและต่างประเทศ
4. การประชุมเชิงปฏิบัติการเพื่อกำหนดกระบวนการทำงานเป้าหมาย (To-Be Workflow Design Workshop)`,
    projectApproachImageBlocks: [],
  },
  section4: {
    teamOverview: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด ได้คัดสรรบุคลากรที่มีความรู้ ความเชี่ยวชาญ และประสบการณ์ตรงในโครงการพัฒนาระบบภาครัฐขนาดใหญ่ บุคลากรทุกคนมีคุณวุฒิตรงตามที่ขอบเขตงานกำหนดและมีใบรับรองมาตรฐานวิชาชีพระดับสากล พร้อมทุ่มเทเวลาให้กับการดำเนินงานตลอดทั้งโครงการ',
    teamMembers: [...MASTER_TEAM_LIBRARY],
    riskManagementOverview: 'เพื่อให้โครงการดำเนินไปด้วยความราบรื่นและสามารถส่งมอบงานได้ตามกำหนดเวลาและงบประมาณ บริษัทฯ ได้นำกรอบการบริหารความเสี่ยงตามมาตรฐาน ISO 31000 และ PMBOK มาประยุกต์ใช้เพื่อวิเคราะห์ ประเมิน และกำหนดมาตรการรับมือเชิงรุกตั้งแต่เริ่มต้นโครงการ',
    riskItems: [
      {
        id: 'r-1',
        category: 'ด้านขอบเขตงาน',
        riskTitle: 'ความต้องการของผู้ใช้งานมีการเปลี่ยนแปลงหรือเพิ่มขึ้นระหว่างโครงการ (Scope Creep)',
        likelihood: 'ปานกลาง',
        impact: 'สูง',
        mitigationPlan: 'กำหนดกระบวนการบริหารจัดการการเปลี่ยนแปลง (Change Control Procedure) ไว้อย่างชัดเจนในแผนโครงการ จัดทำแบบรับรองความต้องการ (Sign-off) ในแต่ละงวดงาน และจัดลำดับความสำคัญของฟีเจอร์ด้วยหลักการ MoSCoW',
        contingencyPlan: 'หากมีการเปลี่ยนแปลงที่ส่งผลกระทบต่อกำหนดการส่งมอบ จะนำเข้าหารือในที่ประชุมคณะกรรมการตรวจรับเพื่อพิจารณาปรับรอบ Sprint หรือปรับขอบเขตในงวดถัดไปตามความเหมาะสม',
      },
      {
        id: 'r-2',
        category: 'ด้านเทคนิค',
        riskTitle: 'ความล่าช้าในการเชื่อมต่อ API หรือการแลกเปลี่ยนข้อมูลกับระบบภายนอกของหน่วยงานอื่น',
        likelihood: 'สูง',
        impact: 'สูง',
        mitigationPlan: 'ริเริ่มการประสานงานและจัดทำข้อตกลง Data Contract ตั้งแต่สัปดาห์แรกของโครงการ พร้อมสร้างระบบจำลอง (Mock API Service) เพื่อให้ทีมพัฒนาสามารถพัฒนาส่วนงานคู่ขนานไปได้โดยไม่ต้องรอระบบภายนอกเสร็จสิ้น',
        contingencyPlan: 'จัดประชุมร่วมแบบ Fast-track ระหว่างทีมเทคนิคของทั้งสองหน่วยงาน และจัดทำ Fallback Mode ให้ระบบสามารถทำงานแบบ Asynchronous ได้ในกรณีที่บริการภายนอกขัดข้อง',
      },
      {
        id: 'r-3',
        category: 'ด้านบุคลากร',
        riskTitle: 'การลาออกหรือการโยกย้ายบุคลากรหลักในทีมงานพัฒนาระบบ',
        likelihood: 'ต่ำ',
        impact: 'ปานกลาง',
        mitigationPlan: 'บริษัทฯ มีระบบจัดการองค์ความรู้ (Knowledge Base) และเอกสารคู่มือการเขียนโค้ดที่เป็นมาตรฐานเดียวกัน มีการจัดบุคลากรสำรอง (Shadow Resource) ในทุกตำแหน่งหลักที่มีคุณวุฒิเทียบเท่า',
        contingencyPlan: 'สามารถส่งมอบงานและส่งบุคลากรทดแทนเข้าปฏิบัติหน้าที่ได้ทันทีภายใน 5 วันทำการ โดยไม่กระทบต่อความต่อเนื่องของโครงการ',
      },
      {
        id: 'r-4',
        category: 'ด้านความปลอดภัย',
        riskTitle: 'การตรวจพบช่องโหว่ความปลอดภัยหรือความเสี่ยงต่อการรั่วไหลของข้อมูลส่วนบุคคล (PDPA)',
        likelihood: 'ต่ำ',
        impact: 'สูง',
        mitigationPlan: 'นำหลักการ Security by Design และ DevSecOps มาใช้ในทุกขั้นตอนการเขียนโค้ด ทำ Static Code Analysis อัตโนมัติทุกครั้งที่มีการ Commit โค้ด และจัดทำ Privacy Impact Assessment (PIA)',
        contingencyPlan: 'จัดทีมแก้ไขช่องโหว่ความปลอดภัยเร่งด่วน (Emergency Patching Team) ดำเนินการแก้ไขและออก Patch ให้แล้วเสร็จภายใน 24 ชั่วโมง',
      },
    ],
    complianceMatrixOverview: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด ยืนยันการปฏิบัติตามข้อกำหนดในขอบเขตงาน (TOR) ทุกประการ โดยในบางรายการสำคัญ บริษัทฯ ได้นำเสนอแนวทาง เทคโนโลยี และมาตรฐานที่สูงกว่าเกณฑ์ขั้นต่ำที่ TOR กำหนด เพื่อสร้างมูลค่าเพิ่มและความมั่นคงปลอดภัยสูงสุดให้แก่หน่วยงาน',
    projectManagementOverview: `บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด ดำเนินการบริหารจัดการโครงการตามมาตรฐานสากล (PMBOK & Agile/Scrum Framework) เพื่อควบคุมและผลักดันงานให้บรรลุเป้าหมายตามขอบเขตงาน (TOR) ทั้งด้านคุณภาพ เวลา และงบประมาณอย่างมีประสิทธิภาพสูงสุด โดยมีแนวทางบริหาร 5 มิติหลักดังนี้:

1. การบริหารขอบเขตงานและคุณภาพ (Scope & Quality Management): ดำเนินการประชุมวิเคราะห์ความต้องการ (Requirements Gathering) ร่วมกับผู้ใช้งาน จัดทำเอกสารข้อกำหนดความต้องการของระบบ (SRS) ตรวจสอบความถูกต้องและจัดทำแบบรับรองผล (Sign-off) ในแต่ละงวดงานอย่างเคร่งครัด
2. การบริหารเวลาและงวดงาน (Time & Schedule Management): ควบคุมการดำเนินงานตามแผนผังการทำงานหลัก (WBS) ประชุมติดตามความคืบหน้า (Sprint Planning & Daily Standup) และรายงานความก้าวหน้าแก่คณะกรรมการตรวจรับพัสดุเป็นประจำทุกสัปดาห์และทุกเดือน
3. การบริหารการสื่อสารและการประสานงาน (Communication Management): กำหนดช่องทางการติดต่อประสานงานอย่างเป็นทางการและบันทึกรายงานการประชุม (Minutes of Meeting) อย่างเป็นระบบ พร้อมจัดประชุมทบทวนผลการทำงานร่วมกับผู้ประสานงานหลักของหน่วยงานอย่างต่อเนื่อง
4. การควบคุมและส่งมอบงาน (Deliverable & Change Management): ดำเนินกระบวนการทดสอบระบบร่วมกับผู้ใช้งาน (User Acceptance Test - UAT) การจัดเตรียมคู่มือระบบ การฝึกอบรมบุคลากร และกระบวนการขออนุมัติการเปลี่ยนแปลง (Change Request) ที่รัดกุม
5. การรับประกันและการสนับสนุนหลังส่งมอบ (Warranty & Maintenance Support): จัดตั้งทีมงาน Helpdesk & Technical Support ดูแลแก้ไขปัญหาตามข้อตกลงระดับการให้บริการ (SLA) ตลอดระยะเวลารับประกันของสัญญา`,
    projectManagementImageBlocks: [],
  },
  section5: {
    ...DEFAULT_MASTER_COMPANY_PROFILE,
    pastProjects: [...MASTER_PROJECTS_LIBRARY],
  },
};

// โครงการหลักของผู้ใช้: โครงการพัฒนากำลังคนด้านดิจิทัลระดับพื้นที่ พร้อมผลงานจริงครบ 20 รายการ
export const DEFAULT_BIDDING_PROJECTS: BiddingProject[] = [
  {
    id: 'proj-digital-workforce-69099626909',
    projectCode: '69099626909',
    projectTitle: 'โครงการพัฒนากำลังคนด้านดิจิทัลระดับพื้นที่ให้พร้อมเข้าสู่ยุคเศรษฐกิจและสังคมดิจิทัล',
    clientAgency: 'สำนักงานสถิติแห่งชาติ',
    budgetAmount: 7500000,
    status: 'draft',
    statusNote: 'กำลังจัดทำข้อเสนอโครงการและรวบรวมผลงานประสบการณ์',
    attachments: [],
    proposalData: JSON.parse(JSON.stringify(INITIAL_PROPOSAL_DATA)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * สร้างโครงการว่างเริ่มต้นใหม่ (สำหรับเริ่มโครงการใหม่ที่สะอาด 100% ไม่มีข้อมูลตัวอย่าง)
 */
export function createDefaultBlankProject(): BiddingProject {
  return {
    id: 'proj-digital-workforce-69099626909',
    projectCode: '69099626909',
    projectTitle: 'โครงการพัฒนากำลังคนด้านดิจิทัลระดับพื้นที่ให้พร้อมเข้าสู่ยุคเศรษฐกิจและสังคมดิจิทัล',
    clientAgency: 'สำนักงานสถิติแห่งชาติ',
    budgetAmount: 7500000,
    status: 'draft',
    statusNote: 'กำลังจัดทำข้อเสนอโครงการและรวบรวมผลงานประสบการณ์',
    attachments: [],
    proposalData: JSON.parse(JSON.stringify(INITIAL_PROPOSAL_DATA)),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * สร้างข้อมูลโครงสร้างข้อเสนอเปล่าสำหรับเริ่มต้นโครงการใหม่ โดยไม่มีข้อมูลเดิมติดมา
 */
export function createBlankProposalData(
  projectTitle: string = '',
  projectCode: string = '',
  clientAgency: string = '',
  budgetAmount: number = 0,
  durationDays: number = 180
): ProposalData {
  const durationMonths = Math.max(1, Math.round(durationDays / 30));
  return {
    documentStructure: getDefaultDocumentStructure(),
    cover: {
      projectTitle,
      projectCode,
      clientAgency,
      clientDepartment: '',
      submitterCompany: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด',
      submitterSubtext: 'Prime Digital Consultant Co., Ltd.',
      submissionDate: '',
      budgetFormatted: budgetAmount > 0 ? `${budgetAmount.toLocaleString()} บาท` : '0 บาท',
      includeBackCover: true,
      includeTOC: true,
    },
    section1: {
      background: '',
      objectives: [],
      expectedBenefits: [],
      targetAudience: '',
      projectScopeOverview: '',
      projectDurationDays: durationDays,
      projectDurationMonths: durationMonths,
      budgetAmount,
      scopeItems: [],
    },
    section2: {
      workPlanOverview: '',
      milestones: [],
    },
    section3: {
      frameworkOverview: '',
      conceptualDiagramCaption: '',
      projectApproachOverview: '',
      projectApproachImageBlocks: [],
    },
    section4: {
      teamOverview: '',
      teamMembers: [],
      projectManagementOverview: '',
      projectManagementImageBlocks: [],
      riskManagementOverview: '',
      riskItems: [],
      complianceMatrixOverview: '',
    },
    section5: {
      companyName: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด (Prime Digital Consultant Co., Ltd.)',
      establishedYearBE: 2558,
      registeredCapital: '20,000,000 บาท (ชำระเต็มจำนวน)',
      companyProfile: DEFAULT_MASTER_COMPANY_PROFILE.companyProfile,
      visionMission: DEFAULT_MASTER_COMPANY_PROFILE.visionMission,
      specializations: [...DEFAULT_MASTER_COMPANY_PROFILE.specializations],
      certifications: [...DEFAULT_MASTER_COMPANY_PROFILE.certifications],
      maxYearsFilter: 3,
      pastProjects: [...MASTER_PROJECTS_LIBRARY],
    },
  };
}


