import { getRecoveredTeamPhoto, getRecoveredProjectAssets, RECOVERED_FRAMEWORK_IMAGE } from '../data/defaultMediaAssets';
import { TeamMember, PastProject, MasterCompanyProfile } from '../types/proposal';
import { MasterBomItem } from '../types/bom';
import { MASTER_TEAM_LIBRARY, MASTER_PROJECTS_LIBRARY, MASTER_BOM_LIBRARY, DEFAULT_MASTER_COMPANY_PROFILE } from '../data/defaultData';
import { idbGet, idbSet, IDB_STORES } from './localDatabase';

const TEAM_LIBRARY_KEY = 'prime_master_team_library';
const PROJECTS_LIBRARY_KEY = 'prime_master_projects_library';
const BOM_LIBRARY_KEY = 'prime_master_bom_catalog';
const COMPANY_PROFILE_KEY = 'prime_master_company_profile';

// In-memory runtime caches (always synchronous, hydrated from IndexedDB)
let cachedProjects: PastProject[] | null = null;
let cachedTeam: TeamMember[] | null = null;
let cachedBom: MasterBomItem[] | null = null;
let cachedCompany: MasterCompanyProfile[] | MasterCompanyProfile | null = null;

export const MASTER_TEAM_UPDATED_EVENT = 'prime_master_team_updated';
export const MASTER_PROJECTS_UPDATED_EVENT = 'prime_master_projects_updated';
export const MASTER_BOM_UPDATED_EVENT = 'prime_master_bom_updated';
export const MASTER_COMPANY_UPDATED_EVENT = 'prime_master_company_updated';

export const SAMPLE_TEAM_IDS = new Set([
  'team-1', 'team-2', 'team-3', 'team-4', 'team-5',
  'sample-team-1', 'sample-team-2', 'sample-team-3', 'sample-team-4', 'sample-team-5',
]);

export const SAMPLE_TEAM_NAMES = [
  'นรินทร์ เกียรติวรชัย',
  'รัตนเดชาภิรมย์',
  'พิมพาภรณ์ วงศ์ศิริ',
  'กิตติธัช วราศิริกุล',
  'กุลธิดา โชคประสิทธิ์',
  'กฤษดา ศิริวัฒนาภรณ์',
  'นภาพร เมธาประเสริฐ',
  'ปกรณ์ สุขสวัสดิ์',
  'วรวิทย์ เกียรติกำเนิด',
  'สุพรรษา วงศ์ทองคำ',
];

export function isSampleTeamMember(member?: Partial<TeamMember> | null): boolean {
  if (!member || typeof member !== 'object') return false;
  const id = String(member.id || '').trim();
  const origId = String(member.originalMasterId || '').trim();
  const code = String(member.memberCode || '').trim();
  const name = String(member.name || '').trim();

  if (id && SAMPLE_TEAM_IDS.has(id)) return true;
  if (origId && SAMPLE_TEAM_IDS.has(origId)) return true;
  if (code && SAMPLE_TEAM_IDS.has(code)) return true;

  if (name) {
    if (name.includes('ตัวอย่าง') || name.includes('Mock') || name.includes('Sample')) return true;
    for (const sampleName of SAMPLE_TEAM_NAMES) {
      if (name.includes(sampleName)) return true;
    }
  }

  return false;
}

// Hydrate from IndexedDB on startup
if (typeof window !== 'undefined') {
  idbGet<PastProject[]>(IDB_STORES.MASTER_PROJECTS, 'current').then((fromIDB) => {
    if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
      cachedProjects = fromIDB;
      dispatchProjectsUpdatedEvent(fromIDB);
    }
  });
  idbGet<TeamMember[]>(IDB_STORES.MASTER_TEAM, 'current').then((fromIDB) => {
    if (fromIDB && Array.isArray(fromIDB)) {
      const clean = fromIDB.filter((m) => !isSampleTeamMember(m));
      if (clean.length > 0) {
        cachedTeam = clean;
        dispatchTeamUpdatedEvent(clean);
      } else {
        cachedTeam = [...MASTER_TEAM_LIBRARY];
        saveLocalTeamLibrary(cachedTeam);
        dispatchTeamUpdatedEvent(cachedTeam);
      }
    }
  });
  idbGet<MasterBomItem[]>(IDB_STORES.MASTER_BOM, 'current').then((fromIDB) => {
    if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
      cachedBom = fromIDB;
      dispatchBomUpdatedEvent(fromIDB);
    }
  });
  idbGet<MasterCompanyProfile>(IDB_STORES.MASTER_COMPANY, 'current').then((fromIDB) => {
    if (fromIDB && fromIDB.companyName) {
      cachedCompany = fromIDB;
      dispatchCompanyUpdatedEvent(fromIDB);
    }
  });
}

// Helper to broadcast custom events to window
function dispatchTeamUpdatedEvent(items: TeamMember[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MASTER_TEAM_UPDATED_EVENT, { detail: items }));
  }
}

function dispatchProjectsUpdatedEvent(items: PastProject[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MASTER_PROJECTS_UPDATED_EVENT, { detail: items }));
  }
}

function dispatchBomUpdatedEvent(items: MasterBomItem[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MASTER_BOM_UPDATED_EVENT, { detail: items }));
  }
}

function dispatchCompanyUpdatedEvent(profile: MasterCompanyProfile) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MASTER_COMPANY_UPDATED_EVENT, { detail: profile }));
  }
}

// ==============================================================================
// Data Mapping Helpers (Local Model <-> Supabase PostgreSQL Rows)
// ==============================================================================

function teamMemberToCloudRow(m: TeamMember) {
  return {
    id: m.id,
    name: m.name,
    member_code: m.memberCode || m.id,
    recorded_year_be: m.recordedYearBE || null,
    proposed_role: m.proposedRole || null,
    education: m.education || null,
    certifications: m.certifications || null,
    experience_years: m.experienceYears || 0,
    start_work_year_be: m.startWorkYearBE || null,
    responsibilities: m.responsibilities || null,
    highlight_projects: m.highlightProjects || null,
    personal_bio: m.personalBio || null,
    photo_url: m.photoUrl || null,
    data: m,
    updated_at: new Date().toISOString(),
  };
}

function cloudRowToTeamMember(row: any): TeamMember {
  if (row.data && typeof row.data === 'object' && row.data.name) {
    return {
      ...row.data,
      id: row.id,
      memberCode: row.member_code || row.data.memberCode || row.id,
      recordedYearBE: row.recorded_year_be ? Number(row.recorded_year_be) : row.data.recordedYearBE,
      name: row.name || row.data.name,
      proposedRole: row.proposed_role || row.data.proposedRole || '',
      education: row.education || row.data.education || '',
      certifications: row.certifications || row.data.certifications || '',
      experienceYears: Number(row.experience_years) || Number(row.data.experienceYears) || 0,
      startWorkYearBE: row.start_work_year_be ? Number(row.start_work_year_be) : row.data.startWorkYearBE,
      responsibilities: row.responsibilities || row.data.responsibilities || '',
      highlightProjects: row.highlight_projects || row.data.highlightProjects || '',
      personalBio: row.personal_bio || row.data.personalBio || '',
      photoUrl: row.photo_url || row.data.photoUrl || undefined,
      bioImageBlocks: row.data.bioImageBlocks || undefined,
      highlightImageBlocks: row.data.highlightImageBlocks || row.data.imageBlocks || undefined,
      imageBlocks: row.data.imageBlocks || row.data.highlightImageBlocks || undefined,
    };
  }
  return {
    id: row.id,
    memberCode: row.member_code || row.id,
    recordedYearBE: row.recorded_year_be ? Number(row.recorded_year_be) : undefined,
    name: row.name,
    proposedRole: row.proposed_role || '',
    education: row.education || '',
    certifications: row.certifications || '',
    experienceYears: Number(row.experience_years) || 0,
    startWorkYearBE: row.start_work_year_be ? Number(row.start_work_year_be) : undefined,
    responsibilities: row.responsibilities || '',
    highlightProjects: row.highlight_projects || '',
    personalBio: row.personal_bio || '',
    photoUrl: row.photo_url || undefined,
  };
}

function pastProjectToCloudRow(p: PastProject) {
  return {
    id: p.id,
    project_code: p.projectCode || null,
    contract_year_be: Number(p.contractYearBE || p.completionYearBE) || null,
    project_name: p.projectName,
    client_name: p.clientName || null,
    contract_value: Number(p.contractValue) || 0,
    completion_year_be: Number(p.completionYearBE) || null,
    period_duration: p.periodDuration || null,
    category: p.category || null,
    project_type: p.projectType || 'tor_reference',
    description: p.description || null,
    relevance_note: p.relevanceNote || null,
    certificate_file_url: p.certificateFileUrl || null,
    certificate_file_name: p.certificateFileName || null,
    project_image_url: p.projectImageUrl || null,
    project_image_caption: p.projectImageCaption || null,
    client_logo_url: p.clientLogoUrl || null,
    image_blocks: p.imageBlocks || null,
    data: p,
    updated_at: new Date().toISOString(),
  };
}

function cloudRowToPastProject(row: any): PastProject {
  if (row.data && typeof row.data === 'object' && row.data.projectName) {
    return {
      ...row.data,
      id: row.id,
      projectCode: row.project_code || row.data.projectCode,
      contractYearBE: row.contract_year_be ? Number(row.contract_year_be) : (row.data.contractYearBE || Number(row.completion_year_be) || 2567),
      projectName: row.project_name || row.data.projectName,
      clientName: row.client_name || row.data.clientName || '',
      clientLogoUrl: row.client_logo_url !== undefined ? (row.client_logo_url || undefined) : (row.data?.clientLogoUrl || undefined),
      contractValue: Number(row.contract_value) || Number(row.data.contractValue) || 0,
      completionYearBE: Number(row.completion_year_be) || Number(row.data.completionYearBE) || 2567,
      periodDuration: row.period_duration || row.data.periodDuration || '',
      description: row.description || row.data.description || '',
      category: row.category || row.data.category || '',
      isSelected: true,
      projectType: (row.project_type as any) || row.data.projectType || 'tor_reference',
      relevanceNote: row.relevance_note || row.data.relevanceNote || '',
      certificateFileUrl: row.certificate_file_url !== undefined ? (row.certificate_file_url || undefined) : (row.data?.certificateFileUrl || undefined),
      certificateFileName: row.certificate_file_name !== undefined ? (row.certificate_file_name || undefined) : (row.data?.certificateFileName || undefined),
      projectImageUrl: row.project_image_url !== undefined ? (row.project_image_url || undefined) : (row.data?.projectImageUrl || undefined),
      projectImageCaption: row.project_image_caption !== undefined ? (row.project_image_caption || undefined) : (row.data?.projectImageCaption || undefined),
      imageBlocks: row.image_blocks !== undefined ? (row.image_blocks || undefined) : (row.data?.imageBlocks || undefined),
    };
  }
  return {
    id: row.id,
    projectCode: row.project_code || undefined,
    contractYearBE: row.contract_year_be ? Number(row.contract_year_be) : (Number(row.completion_year_be) || 2567),
    projectName: row.project_name,
    clientName: row.client_name || '',
    clientLogoUrl: row.client_logo_url || undefined,
    contractValue: Number(row.contract_value) || 0,
    completionYearBE: Number(row.completion_year_be) || 2567,
    periodDuration: row.period_duration || '',
    description: row.description || '',
    category: row.category || '',
    isSelected: true,
    projectType: (row.project_type as any) || 'tor_reference',
    relevanceNote: row.relevance_note || '',
    certificateFileUrl: row.certificate_file_url || undefined,
    certificateFileName: row.certificate_file_name || undefined,
    projectImageUrl: row.project_image_url || undefined,
    projectImageCaption: row.project_image_caption || undefined,
    imageBlocks: row.image_blocks || undefined,
  };
}

function masterBomItemToCloudRow(item: MasterBomItem) {
  return {
    id: item.id,
    category: item.category,
    title: item.title,
    responsible_role: item.responsibleRole || null,
    unit: item.unit || 'ชุด',
    default_rate: Number(item.defaultRate) || 0,
    default_quantity: Number(item.defaultQuantity) || 1,
    description: item.description || null,
    deliverable: item.deliverable || null,
    is_standard: Boolean(item.isStandard),
    data: item,
    updated_at: new Date().toISOString(),
  };
}

function cloudRowToMasterBomItem(row: any): MasterBomItem {
  if (row.data && typeof row.data === 'object' && row.data.title) {
    return {
      ...row.data,
      id: row.id,
      category: row.category || row.data.category || '',
      title: row.title || row.data.title,
      responsibleRole: row.responsible_role || row.data.responsibleRole || '',
      unit: row.unit || row.data.unit || 'ชุด',
      defaultRate: Number(row.default_rate) || Number(row.data.defaultRate) || 0,
      defaultQuantity: Number(row.default_quantity) || Number(row.data.defaultQuantity) || 1,
      description: row.description || row.data.description || '',
      deliverable: row.deliverable || row.data.deliverable || '',
      isStandard: row.is_standard !== undefined ? Boolean(row.is_standard) : Boolean(row.data.isStandard),
    };
  }
  return {
    id: row.id,
    category: row.category || '',
    title: row.title || '',
    responsibleRole: row.responsible_role || '',
    unit: row.unit || 'ชุด',
    defaultRate: Number(row.default_rate) || 0,
    defaultQuantity: Number(row.default_quantity) || 1,
    description: row.description || '',
    deliverable: row.deliverable || '',
    isStandard: Boolean(row.is_standard),
  };
}

function companyProfileToCloudRow(c: MasterCompanyProfile) {
  return {
    id: 'default_company',
    company_name: c.companyName || '',
    established_year_be: Number(c.establishedYearBE) || 2558,
    registered_capital: c.registeredCapital || '',
    company_profile: c.companyProfile || '',
    vision_mission: c.visionMission || '',
    specializations: c.specializations || [],
    certifications: c.certifications || [],
    max_years_filter: Number(c.maxYearsFilter) || 5,
    company_logo_url: c.companyLogoUrl || null,
    company_office_image_url: c.companyOfficeImageUrl || null,
    company_office_image_caption: c.companyOfficeImageCaption || null,
    image_blocks: c.imageBlocks || [],
    data: c,
    updated_at: new Date().toISOString(),
  };
}

function cloudRowToCompanyProfile(row: any): MasterCompanyProfile {
  if (row.data && typeof row.data === 'object' && row.data.companyName) {
    return {
      ...row.data,
      companyName: row.company_name || row.data.companyName,
      establishedYearBE: Number(row.established_year_be) || row.data.establishedYearBE || 2558,
      registeredCapital: row.registered_capital || row.data.registeredCapital || '',
      companyProfile: row.company_profile || row.data.companyProfile || '',
      visionMission: row.vision_mission || row.data.visionMission || '',
      specializations: Array.isArray(row.specializations) ? row.specializations : (row.data.specializations || []),
      certifications: Array.isArray(row.certifications) ? row.certifications : (row.data.certifications || []),
      maxYearsFilter: Number(row.max_years_filter) || row.data.maxYearsFilter || 5,
      companyLogoUrl: row.company_logo_url !== undefined ? (row.company_logo_url || undefined) : (row.data?.companyLogoUrl || undefined),
      companyOfficeImageUrl: row.company_office_image_url !== undefined ? (row.company_office_image_url || undefined) : (row.data?.companyOfficeImageUrl || undefined),
      companyOfficeImageCaption: row.company_office_image_caption !== undefined ? (row.company_office_image_caption || undefined) : (row.data?.companyOfficeImageCaption || undefined),
      imageBlocks: row.image_blocks !== undefined ? (row.image_blocks || undefined) : (row.data?.imageBlocks || undefined),
    };
  }
  return {
    companyName: row.company_name || DEFAULT_MASTER_COMPANY_PROFILE.companyName,
    establishedYearBE: Number(row.established_year_be) || DEFAULT_MASTER_COMPANY_PROFILE.establishedYearBE,
    registeredCapital: row.registered_capital || DEFAULT_MASTER_COMPANY_PROFILE.registeredCapital,
    companyProfile: row.company_profile || DEFAULT_MASTER_COMPANY_PROFILE.companyProfile,
    visionMission: row.vision_mission || DEFAULT_MASTER_COMPANY_PROFILE.visionMission,
    specializations: Array.isArray(row.specializations) ? row.specializations : DEFAULT_MASTER_COMPANY_PROFILE.specializations,
    certifications: Array.isArray(row.certifications) ? row.certifications : DEFAULT_MASTER_COMPANY_PROFILE.certifications,
    maxYearsFilter: Number(row.max_years_filter) || DEFAULT_MASTER_COMPANY_PROFILE.maxYearsFilter,
    companyLogoUrl: row.company_logo_url || undefined,
    companyOfficeImageUrl: row.company_office_image_url || undefined,
    companyOfficeImageCaption: row.company_office_image_caption || undefined,
    imageBlocks: row.image_blocks || undefined,
  };
}

// ==============================================================================
// Asynchronous Cloud Sync Helpers
// ==============================================================================

// ==============================================================================
// Local-First Persistence Helpers (IndexedDB Unlimited + Safe LocalStorage)
// ==============================================================================

function saveLocalTeamLibrary(items: TeamMember[]): void {
  cachedTeam = items;
  idbSet(IDB_STORES.MASTER_TEAM, 'current', items).catch(() => {});
  try {
    localStorage.setItem(TEAM_LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    // Quota safe: IndexedDB stores the full data
  }
}

function saveLocalProjectsLibrary(items: PastProject[]): void {
  cachedProjects = items;
  idbSet(IDB_STORES.MASTER_PROJECTS, 'current', items).catch(() => {});
  try {
    localStorage.setItem(PROJECTS_LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    // Quota safe: IndexedDB stores the full data including high-res image blocks
  }
}

function saveLocalBomLibrary(items: MasterBomItem[]): void {
  cachedBom = items;
  idbSet(IDB_STORES.MASTER_BOM, 'current', items).catch(() => {});
  try {
    localStorage.setItem(BOM_LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    // Quota safe
  }
}

function saveLocalCompanyProfile(profile: MasterCompanyProfile): void {
  cachedCompany = profile;
  idbSet(IDB_STORES.MASTER_COMPANY, 'current', profile).catch(() => {});
  try {
    localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    // Quota safe
  }
}

// ==============================================================================
// Code & ID Auto-Generation Helpers
// ==============================================================================

/**
 * ฟังก์ชันสร้างรหัสโครงการอัตโนมัติ ขึ้นต้นด้วยปี พ.ศ. ที่ได้สัญญา เช่น 2567-PRJ-001
 * รองรับการส่ง existingProjects และ excludeId (เพื่อไม่ให้นำตัวเองมานับ)
 */
export function generateMasterProjectCode(
  yearBE: number,
  existingProjects: (PastProject | Partial<PastProject>)[],
  excludeId?: string
): string {
  const y = Number(yearBE) || (new Date().getFullYear() + 543);
  const prefix = `${y}-PRJ-`;
  let maxNum = 0;
  for (const p of (existingProjects || [])) {
    if (!p) continue;
    if (excludeId && (p.id === excludeId || p.originalMasterId === excludeId)) continue;
    const code = String(p.projectCode || '').trim();
    if (code.toUpperCase().startsWith(prefix.toUpperCase())) {
      const remainder = code.substring(prefix.length).trim();
      const numPart = parseInt(remainder, 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * ฟังก์ชันสร้างรหัส ID บุคลากรอัตโนมัติ ขึ้นต้นด้วยปี พ.ศ. ที่มีการบันทึก เช่น 2568-EMP-001
 */
export function generateMasterMemberId(
  yearBE: number,
  existingMembers: (TeamMember | Partial<TeamMember>)[],
  excludeId?: string
): string {
  const y = Number(yearBE) || (new Date().getFullYear() + 543);
  const prefix = `${y}-EMP-`;
  let maxNum = 0;
  for (const m of (existingMembers || [])) {
    if (!m) continue;
    if (excludeId && (m.id === excludeId || m.originalMasterId === excludeId)) continue;
    const memberCodeStr = m.memberCode !== undefined && m.memberCode !== null ? String(m.memberCode) : '';
    const idStr = m.id !== undefined && m.id !== null ? String(m.id) : '';
    const code = (memberCodeStr || (idStr.startsWith(prefix) ? idStr : '')).trim();
    if (code.toUpperCase().startsWith(prefix.toUpperCase())) {
      const remainder = code.substring(prefix.length).trim();
      const numPart = parseInt(remainder, 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * ตรวจสอบหารหัสโครงการที่ซ้ำกัน
 */
export function findDuplicateProjectCodes(projects: (PastProject | Partial<PastProject>)[]): {
  duplicateCodes: Set<string>;
  countMap: { [code: string]: number };
} {
  const countMap: { [code: string]: number } = {};
  for (const p of (projects || [])) {
    if (!p) continue;
    const c = String(p.projectCode || '').trim().toUpperCase();
    if (c) {
      countMap[c] = (countMap[c] || 0) + 1;
    }
  }
  const duplicateCodes = new Set<string>();
  for (const [code, count] of Object.entries(countMap)) {
    if (count > 1) {
      duplicateCodes.add(code);
    }
  }
  return { duplicateCodes, countMap };
}

/**
 * จัดระเบียบรหัสโครงการทั้งหมดในคลังกลางใหม่ตามลำดับปีสัญญา (พ.ศ.)
 * เรียงตาม contractYearBE (หรือ completionYearBE) และกำหนดรหัส ${year}-PRJ-001, 002... โดยไม่ซ้ำกันแน่นอน
 */
export function resequenceAllMasterProjectsCodes(): PastProject[] {
  const current = getMasterProjectsLibrary();
  const sorted = [...current].sort((a, b) => {
    const yrA = a.contractYearBE || a.completionYearBE || 0;
    const yrB = b.contractYearBE || b.completionYearBE || 0;
    if (yrA !== yrB) return yrA - yrB;
    const compA = a.completionYearBE || 0;
    const compB = b.completionYearBE || 0;
    if (compA !== compB) return compA - compB;
    return (a.projectName || '').localeCompare(b.projectName || '');
  });

  const yearCounters: { [year: number]: number } = {};
  const updated = sorted.map((p) => {
    const yr = p.contractYearBE || p.completionYearBE || (new Date().getFullYear() + 543);
    yearCounters[yr] = (yearCounters[yr] || 0) + 1;
    const newCode = `${yr}-PRJ-${String(yearCounters[yr]).padStart(3, '0')}`;
    return {
      ...p,
      contractYearBE: yr,
      projectCode: newCode,
    };
  });

  saveLocalProjectsLibrary(updated);
  dispatchProjectsUpdatedEvent(updated);
  return updated;
}

/**
 * จัดระเบียบรหัสบุคลากรทั้งหมดในคลังกลางใหม่ตามลำดับปีที่บันทึก (พ.ศ.)
 * เรียงตาม recordedYearBE และกำหนดรหัส ${year}-EMP-001, 002... โดยไม่ซ้ำกันแน่นอน
 */
export function resequenceAllMasterTeamCodes(): TeamMember[] {
  const current = getMasterTeamLibrary();
  const sorted = [...current].sort((a, b) => {
    const yrA = b.experienceYears || 0;
    const yrB = a.experienceYears || 0;
    if (yrA !== yrB) return yrB - yrA;
    return (a.name || '').localeCompare(b.name || '');
  });

  const yearCounters: { [year: number]: number } = {};
  const updated = sorted.map((m) => {
    const yr = m.recordedYearBE || (new Date().getFullYear() + 543);
    yearCounters[yr] = (yearCounters[yr] || 0) + 1;
    const newCode = `${yr}-EMP-${String(yearCounters[yr]).padStart(3, '0')}`;
    return {
      ...m,
      memberCode: newCode,
    };
  });

  saveLocalTeamLibrary(updated);
  dispatchTeamUpdatedEvent(updated);
  return updated;
}

/**
 * ฟังก์ชันช่วยค้นหาโครงการเดิมในคลังกลาง (ตรวจจับการอัปเดตแบบแม่นยำ ไม่ให้เพิ่มเป็นโครงการใหม่ซ้ำซ้อน)
 */
export function findMatchingMasterProjectIndex(target: Partial<PastProject>, library: PastProject[]): number {
  const norm = (s?: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  // 1. ตรวจจาก originalMasterId ที่เชื่อมโยงไว้ (สำคัญที่สุด: ถ้ามี master id เดิม ต้องอัปเดตโครงการเดิม 100%)
  if (target.originalMasterId && target.originalMasterId.trim()) {
    const origId = target.originalMasterId.trim();
    const idx = library.findIndex((p) =>
      p.id === origId ||
      (p.originalMasterId && p.originalMasterId === origId) ||
      (p.projectCode && p.projectCode.trim().toLowerCase() === origId.toLowerCase())
    );
    if (idx >= 0) return idx;
  }

  // 2. ตรวจจาก id โดยตรง (ถ้า id ตรงกับรายการที่มีอยู่ในคลังกลาง)
  if (target.id && target.id.trim()) {
    const targetId = target.id.trim();
    const idx = library.findIndex((p) =>
      p.id === targetId ||
      (p.originalMasterId && p.originalMasterId === targetId)
    );
    if (idx >= 0) return idx;
  }

  // 3. ตรวจจาก projectName เดียวกัน (normalized whitespace & case-insensitive)
  if (target.projectName && target.projectName.trim()) {
    const targetName = norm(target.projectName);
    const idx = library.findIndex((p) => norm(p.projectName) === targetName);
    if (idx >= 0) return idx;
  }

  // 4. ตรวจจาก projectCode เดียวกัน (เฉพาะเมื่อชื่อโครงการมีความสอดคล้องกัน หรือ target ไม่มีชื่อ เพื่อป้องกันการทับโครงการอื่น)
  if (target.projectCode && target.projectCode.trim()) {
    const targetCode = target.projectCode.trim().toLowerCase();
    const idx = library.findIndex((p) => {
      if (!p.projectCode || p.projectCode.trim().toLowerCase() !== targetCode) return false;
      if (!target.projectName || !p.projectName) return true;
      const tName = norm(target.projectName);
      const pName = norm(p.projectName);
      if (tName === pName || pName.includes(tName) || tName.includes(pName)) return true;
      if (target.clientName && p.clientName && norm(target.clientName) === norm(p.clientName)) return true;
      return false;
    });
    if (idx >= 0) return idx;
  }

  // 5. ตรวจจากความคล้ายของชื่อโครงการร่วมกับหน่วยงานผู้ว่าจ้าง (clientName)
  if (target.projectName && target.clientName) {
    const targetName = norm(target.projectName);
    const targetClient = norm(target.clientName);
    const idx = library.findIndex((p) => {
      if (!p.clientName || norm(p.clientName) !== targetClient) return false;
      const pName = norm(p.projectName);
      if (pName.includes(targetName) || targetName.includes(pName)) return true;
      return false;
    });
    if (idx >= 0) return idx;
  }

  return -1;
}

/**
 * ฟังก์ชันช่วยค้นหาบุคลากรเดิมในคลังกลาง (ตรวจจับการอัปเดตแบบแม่นยำ)
 */
export function findMatchingMasterMemberIndex(target: Partial<TeamMember>, library: TeamMember[]): number {
  const norm = (s?: string) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  // 1. ตรวจจาก originalMasterId
  if (target.originalMasterId && target.originalMasterId.trim()) {
    const origId = target.originalMasterId.trim();
    const idx = library.findIndex((m) =>
      m.id === origId ||
      (m.originalMasterId && m.originalMasterId === origId) ||
      (m.memberCode && m.memberCode.trim().toLowerCase() === origId.toLowerCase())
    );
    if (idx >= 0) return idx;
  }

  // 2. ตรวจจาก id
  if (target.id && target.id.trim()) {
    const targetId = target.id.trim();
    const idx = library.findIndex((m) =>
      m.id === targetId ||
      (m.originalMasterId && m.originalMasterId === targetId)
    );
    if (idx >= 0) return idx;
  }

  // 3. ตรวจจาก name เดียวกัน
  if (target.name && target.name.trim()) {
    const targetName = norm(target.name);
    const idx = library.findIndex((m) => norm(m.name) === targetName);
    if (idx >= 0) return idx;
  }

  // 4. ตรวจจาก memberCode
  if (target.memberCode && target.memberCode.trim()) {
    const targetCode = target.memberCode.trim().toLowerCase();
    const idx = library.findIndex((m) => m.memberCode && m.memberCode.trim().toLowerCase() === targetCode);
    if (idx >= 0) return idx;
  }

  return -1;
}

/**
 * รวมและตัดโครงการที่ซ้ำซ้อนในคลังกลาง โดยเลือกข้อมูลที่สมบูรณ์ที่สุด
 */
export function deduplicateMasterProjects(projects: PastProject[]): PastProject[] {
  if (!Array.isArray(projects)) return [];
  const result: PastProject[] = [];
  const norm = (s?: any) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  for (const p of projects) {
    if (!p || typeof p !== 'object' || !p.projectName || String(p.projectName).trim() === '') continue;

    const pCodeStr = String(p.projectCode || '').trim().toLowerCase();
    const existingIdx = result.findIndex((item) => {
      if (!item) return false;
      if (p.originalMasterId && item.originalMasterId && p.originalMasterId === item.originalMasterId) return true;
      if (p.originalMasterId && (item.id === p.originalMasterId || String(item.projectCode || '').trim().toLowerCase() === String(p.originalMasterId).trim().toLowerCase())) return true;
      if (item.originalMasterId && (p.id === item.originalMasterId || pCodeStr === String(item.originalMasterId).trim().toLowerCase())) return true;
      if (p.id && item.id && p.id === item.id) return true;
      if (pCodeStr && item.projectCode && pCodeStr === String(item.projectCode).trim().toLowerCase()) return true;
      if (norm(p.projectName) === norm(item.projectName)) return true;
      return false;
    });

    if (existingIdx >= 0) {
      const existing = result[existingIdx];
      result[existingIdx] = {
        ...existing,
        ...p,
        id: existing.id,
        originalMasterId: existing.originalMasterId || existing.id,
        projectCode: existing.projectCode || p.projectCode,
        contractYearBE: Number(p.contractYearBE || existing.contractYearBE) || undefined,
        completionYearBE: Number(p.completionYearBE || existing.completionYearBE) || 2567,
        contractValue: (Number(p.contractValue) || 0) > 0 ? Number(p.contractValue) : (Number(existing.contractValue) || 0),
        description: (p.description && p.description.length > (existing.description || '').length) ? p.description : (existing.description || p.description),
        certificateFileUrl: p.certificateFileUrl || existing.certificateFileUrl,
        certificateFileName: p.certificateFileName || existing.certificateFileName,
        imageBlocks: (p.imageBlocks && p.imageBlocks.length > 0) ? p.imageBlocks : (existing.imageBlocks || []),
      };
    } else {
      result.push({
        ...p,
        originalMasterId: p.originalMasterId || p.id,
      });
    }
  }

  return result;
}

/**
 * รวมและตัดบุคลากรที่ซ้ำซ้อนในคลังกลาง
 */
export function deduplicateMasterTeam(members: TeamMember[]): TeamMember[] {
  if (!Array.isArray(members)) return [];
  const result: TeamMember[] = [];
  const norm = (s?: any) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  for (const m of members) {
    if (!m || typeof m !== 'object' || !m.name || String(m.name).trim() === '' || String(m.name).includes('(ระบุชื่อ-นามสกุล)')) continue;
    if (isSampleTeamMember(m)) continue;

    const mCodeStr = String(m.memberCode || '').trim().toLowerCase();
    const existingIdx = result.findIndex((item) => {
      if (!item) return false;
      if (m.originalMasterId && item.originalMasterId && m.originalMasterId === item.originalMasterId) return true;
      if (m.originalMasterId && (item.id === m.originalMasterId || String(item.memberCode || '').trim().toLowerCase() === String(m.originalMasterId).trim().toLowerCase())) return true;
      if (item.originalMasterId && (m.id === item.originalMasterId || mCodeStr === String(item.originalMasterId).trim().toLowerCase())) return true;
      if (m.id && item.id && m.id === item.id) return true;
      if (mCodeStr && item.memberCode && mCodeStr === String(item.memberCode).trim().toLowerCase()) return true;
      if (norm(m.name) === norm(item.name)) return true;
      return false;
    });

    if (existingIdx >= 0) {
      const existing = result[existingIdx];
      result[existingIdx] = {
        ...existing,
        ...m,
        id: existing.id,
        originalMasterId: existing.originalMasterId || existing.id,
        memberCode: existing.memberCode || m.memberCode,
        recordedYearBE: Number(m.recordedYearBE || existing.recordedYearBE) || undefined,
        personalBio: (m.personalBio && m.personalBio.length > (existing.personalBio || '').length) ? m.personalBio : (existing.personalBio || m.personalBio),
        responsibilities: (m.responsibilities && m.responsibilities.length > (existing.responsibilities || '').length) ? m.responsibilities : (existing.responsibilities || m.responsibilities),
        highlightProjects: (m.highlightProjects && m.highlightProjects.length > (existing.highlightProjects || '').length) ? m.highlightProjects : (existing.highlightProjects || m.highlightProjects),
        photoUrl: m.photoUrl || existing.photoUrl,
        imageBlocks: (m.imageBlocks && m.imageBlocks.length > 0) ? m.imageBlocks : (existing.imageBlocks || []),
      };
    } else {
      result.push({
        ...m,
        originalMasterId: m.originalMasterId || m.id,
      });
    }
  }

  return result;
}
export function normalizeMasterProjects(projects: PastProject[]): PastProject[] {
  if (!Array.isArray(projects)) return [];
  const safeList = projects.filter((p): p is PastProject => !!p && typeof p === 'object');
  const existingLocal = (cachedProjects && cachedProjects.length > 0) ? cachedProjects : [];

  return deduplicateMasterProjects(
    safeList.map((p, idx) => {
      const contractYear = Number(p.contractYearBE || p.completionYearBE) || 2568;
      let code = p.projectCode !== undefined && p.projectCode !== null ? String(p.projectCode).trim() : '';
      if (!code) {
        code = generateMasterProjectCode(contractYear, safeList.slice(0, idx));
      }
      const finalId = p.id ? String(p.id) : `lib-proj-${idx + 1}`;
      const assets = getRecoveredProjectAssets(code || p.projectCode, p.clientName, p.projectName);

      const matchLocal = existingLocal.find((e) =>
        (e.id && e.id === finalId) ||
        (e.originalMasterId && e.originalMasterId === (p.originalMasterId || finalId)) ||
        (code && e.projectCode && e.projectCode.trim().toLowerCase() === code.toLowerCase()) ||
        (p.projectName && e.projectName && e.projectName.trim().toLowerCase() === p.projectName.trim().toLowerCase())
      );

      return {
        ...p,
        id: finalId,
        contractYearBE: contractYear,
        projectCode: code,
        originalMasterId: p.originalMasterId ? String(p.originalMasterId) : finalId,
        clientLogoUrl: p.clientLogoUrl || matchLocal?.clientLogoUrl || assets.clientLogoUrl,
        projectImageUrl: p.projectImageUrl || matchLocal?.projectImageUrl || assets.projectImageUrl,
        certificateFileUrl: p.certificateFileUrl || matchLocal?.certificateFileUrl || assets.certificateFileUrl,
        certificateFileName: p.certificateFileName || matchLocal?.certificateFileName || assets.certificateFileName,
        imageBlocks: (Array.isArray(p.imageBlocks) && p.imageBlocks.length > 0)
          ? p.imageBlocks
          : (matchLocal?.imageBlocks && matchLocal.imageBlocks.length > 0 ? matchLocal.imageBlocks : []),
      };
    })
  );
}

/**
 * ปรับปรุงข้อมูลบุคลากรในคลังกลางให้มีรหัส ID บุคลากรขึ้นต้นด้วยปี พ.ศ. ที่บันทึกเสมอ พร้อมกำหนด originalMasterId
 * กรองบุคลากรตัวอย่างเดิมทิ้งทั้งหมด 100%
 */
export function normalizeMasterTeam(members: TeamMember[]): TeamMember[] {
  if (!Array.isArray(members)) return [];
  const safeList = members
    .filter((m): m is TeamMember => !!m && typeof m === 'object')
    .filter((m) => !isSampleTeamMember(m));
  const currentYearBE = new Date().getFullYear() + 543;
  const existingLocal = (cachedTeam && cachedTeam.length > 0) ? cachedTeam : [];

  return deduplicateMasterTeam(
    safeList.map((m, idx) => {
      const recordedYear = Number(m.recordedYearBE) || currentYearBE;
      let code = m.memberCode !== undefined && m.memberCode !== null ? String(m.memberCode).trim() : '';
      if (!code) {
        code = generateMasterMemberId(recordedYear, safeList.slice(0, idx));
      }
      const finalId = m.id ? String(m.id) : code || `lib-team-${idx + 1}`;

      const matchLocal = existingLocal.find((e) =>
        (e.id && e.id === finalId) ||
        (e.originalMasterId && e.originalMasterId === (m.originalMasterId || finalId)) ||
        (code && e.memberCode && e.memberCode.trim().toLowerCase() === code.toLowerCase()) ||
        (m.name && e.name && e.name.trim().toLowerCase() === m.name.trim().toLowerCase())
      );

      return {
        ...m,
        id: finalId,
        recordedYearBE: recordedYear,
        memberCode: code,
        originalMasterId: m.originalMasterId ? String(m.originalMasterId) : finalId,
        photoUrl: m.photoUrl || matchLocal?.photoUrl || getRecoveredTeamPhoto(m.name),
        bioImageBlocks: (Array.isArray(m.bioImageBlocks) && m.bioImageBlocks.length > 0)
          ? m.bioImageBlocks
          : (matchLocal?.bioImageBlocks && matchLocal.bioImageBlocks.length > 0 ? matchLocal.bioImageBlocks : []),
        highlightImageBlocks: (Array.isArray(m.highlightImageBlocks) && m.highlightImageBlocks.length > 0)
          ? m.highlightImageBlocks
          : (matchLocal?.highlightImageBlocks && matchLocal.highlightImageBlocks.length > 0 ? matchLocal.highlightImageBlocks : []),
      };
    })
  );
}

// ==============================================================================
// Public API: Team Library (Section 4)
// ==============================================================================

export function getMasterTeamLibrary(): TeamMember[] {
  try {
    if (cachedTeam && Array.isArray(cachedTeam) && cachedTeam.length > 0) {
      const clean = cachedTeam.filter((m) => !isSampleTeamMember(m));
      if (clean.length > 0) {
        return normalizeMasterTeam(clean);
      }
    }
    const raw = localStorage.getItem(TEAM_LIBRARY_KEY);
    if (raw !== null && raw !== 'undefined' && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const clean = parsed.filter((m) => !isSampleTeamMember(m));
        if (clean.length > 0) {
          cachedTeam = normalizeMasterTeam(clean);
          saveLocalTeamLibrary(cachedTeam);
          return cachedTeam;
        }
      }
    }
  } catch (e) {
    console.warn('Could not read master team library from localStorage:', e);
  }
  cachedTeam = normalizeMasterTeam([...MASTER_TEAM_LIBRARY]);
  saveLocalTeamLibrary(cachedTeam);
  return cachedTeam;
}

export async function fetchMasterTeamLibraryFromCloud(): Promise<TeamMember[]> {
  const fromIDB = await idbGet<TeamMember[]>(IDB_STORES.MASTER_TEAM, 'current');
  if (fromIDB && Array.isArray(fromIDB)) {
    const clean = fromIDB.filter((m) => !isSampleTeamMember(m));
    if (clean.length > 0) {
      cachedTeam = normalizeMasterTeam(clean);
      saveLocalTeamLibrary(cachedTeam);
      return cachedTeam;
    }
  }
  return getMasterTeamLibrary();
}

export function saveMasterTeamLibrary(items: TeamMember[]): void {
  const clean = (items || []).filter((m) => !isSampleTeamMember(m));
  const normalized = normalizeMasterTeam(clean.length > 0 ? clean : [...MASTER_TEAM_LIBRARY]);
  saveLocalTeamLibrary(normalized);
  dispatchTeamUpdatedEvent(normalized);
}

export function deleteMasterTeamMember(id: string): TeamMember[] {
  const current = getMasterTeamLibrary();
  const updated = current.filter((m) => m.id !== id && m.memberCode !== id);
  saveLocalTeamLibrary(updated);
  dispatchTeamUpdatedEvent(updated);
  return updated;
}

export function clearAllMasterTeamMembers(): TeamMember[] {
  saveLocalTeamLibrary([]);
  dispatchTeamUpdatedEvent([]);
  return [];
}

export function resetMasterTeamLibrary(): TeamMember[] {
  try {
    localStorage.removeItem(TEAM_LIBRARY_KEY);
  } catch (e) {}
  const defaults = normalizeMasterTeam([...MASTER_TEAM_LIBRARY]);
  saveLocalTeamLibrary(defaults);
  dispatchTeamUpdatedEvent(defaults);
  return defaults;
}

export function saveMemberToMasterLibraryResult(member: TeamMember): {
  updatedLibrary: TeamMember[];
  savedMember: TeamMember;
  isNew: boolean;
} {
  const current = getMasterTeamLibrary();
  const currentYearBE = new Date().getFullYear() + 543;
  const recordedYear = member.recordedYearBE || currentYearBE;

  const existingIdx = findMatchingMasterMemberIndex(member, current);

  let updatedMember: TeamMember;
  let updated: TeamMember[];
  let isNew = false;

  if (existingIdx >= 0) {
    // ซ้ำกัน: ให้อัปเดตข้อมูลเดิมในคลังกลาง แทนการบันทึกเป็นคนใหม่
    const target = current[existingIdx];
    const finalCode = member.memberCode?.trim() || target.memberCode || generateMasterMemberId(recordedYear, current);
    updatedMember = {
      ...target,
      ...member,
      id: target.id,
      originalMasterId: target.id,
      memberCode: finalCode,
      recordedYearBE: recordedYear,
      photoUrl: member.photoUrl || target.photoUrl,
      imageBlocks: (member.imageBlocks && member.imageBlocks.length > 0) ? member.imageBlocks : (target.imageBlocks || []),
      bioImageBlocks: (member.bioImageBlocks && member.bioImageBlocks.length > 0) ? member.bioImageBlocks : (target.bioImageBlocks || []),
      highlightImageBlocks: (member.highlightImageBlocks && member.highlightImageBlocks.length > 0) ? member.highlightImageBlocks : (target.highlightImageBlocks || []),
    };
    updated = [...current];
    updated[existingIdx] = updatedMember;
  } else {
    // บุคลากรใหม่: สร้าง ID / Member Code
    isNew = true;
    const finalCode = member.memberCode?.trim() || generateMasterMemberId(recordedYear, current);
    const newId = (member.originalMasterId && member.originalMasterId.startsWith('lib-team-'))
      ? member.originalMasterId
      : (member.id && member.id.startsWith('lib-team-'))
        ? member.id
        : `lib-team-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    updatedMember = {
      ...member,
      id: newId,
      originalMasterId: newId,
      memberCode: finalCode,
      recordedYearBE: recordedYear,
    };
    updated = [...current, updatedMember];
  }

  const deduped = deduplicateMasterTeam(updated);
  saveLocalTeamLibrary(deduped);
  dispatchTeamUpdatedEvent(deduped);
  return { updatedLibrary: deduped, savedMember: updatedMember, isNew };
}

export function saveMemberToMasterLibrary(member: TeamMember): TeamMember[] {
  return saveMemberToMasterLibraryResult(member).updatedLibrary;
}

export function saveMultipleMembersToMasterLibraryResult(members: TeamMember[]): {
  updatedLibrary: TeamMember[];
  savedMembers: TeamMember[];
} {
  let current = [...getMasterTeamLibrary()];
  const currentYearBE = new Date().getFullYear() + 543;
  const savedMembers: TeamMember[] = [];

  for (const m of members) {
    if (!m.name || m.name.trim() === '' || m.name.includes('(ระบุชื่อ-นามสกุล)')) continue;
    const recordedYear = m.recordedYearBE || currentYearBE;

    const existingIdx = findMatchingMasterMemberIndex(m, current);
    let updatedMember: TeamMember;

    if (existingIdx >= 0) {
      const target = current[existingIdx];
      const finalCode = m.memberCode?.trim() || target.memberCode || generateMasterMemberId(recordedYear, current);
      updatedMember = {
        ...target,
        ...m,
        id: target.id,
        originalMasterId: target.id,
        memberCode: finalCode,
        recordedYearBE: recordedYear,
        photoUrl: m.photoUrl || target.photoUrl,
        imageBlocks: (m.imageBlocks && m.imageBlocks.length > 0) ? m.imageBlocks : (target.imageBlocks || []),
      };
      current[existingIdx] = updatedMember;
    } else {
      const finalCode = m.memberCode?.trim() || generateMasterMemberId(recordedYear, current);
      const newId = (m.originalMasterId && m.originalMasterId.startsWith('lib-team-'))
        ? m.originalMasterId
        : (m.id && m.id.startsWith('lib-team-'))
          ? m.id
          : `lib-team-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      updatedMember = {
        ...m,
        id: newId,
        originalMasterId: newId,
        memberCode: finalCode,
        recordedYearBE: recordedYear,
      };
      current.push(updatedMember);
    }
    savedMembers.push(updatedMember);
  }

  const deduped = deduplicateMasterTeam(current);
  saveLocalTeamLibrary(deduped);
  dispatchTeamUpdatedEvent(deduped);
  return { updatedLibrary: deduped, savedMembers };
}

export function saveMultipleMembersToMasterLibrary(members: TeamMember[]): TeamMember[] {
  return saveMultipleMembersToMasterLibraryResult(members).updatedLibrary;
}

export function deduplicateMasterTeamLibrary(): TeamMember[] {
  const current = getMasterTeamLibrary();
  const deduped = deduplicateMasterTeam(current);
  saveLocalTeamLibrary(deduped);
  dispatchTeamUpdatedEvent(deduped);
  return deduped;
}

// ==============================================================================
// Public API: Past Projects Library (Section 5)
// ==============================================================================

export function getMasterProjectsLibrary(): PastProject[] {
  try {
    if (cachedProjects && Array.isArray(cachedProjects) && cachedProjects.length > 0) {
      return normalizeMasterProjects(cachedProjects);
    }
    const raw = localStorage.getItem(PROJECTS_LIBRARY_KEY);
    if (raw !== null && raw !== 'undefined' && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedProjects = normalizeMasterProjects(parsed);
        return cachedProjects;
      }
    }
  } catch (e) {
    console.warn('Could not read master projects library from localStorage:', e);
  }
  cachedProjects = normalizeMasterProjects([...MASTER_PROJECTS_LIBRARY]);
  return cachedProjects;
}

export async function fetchMasterProjectsLibraryFromCloud(): Promise<PastProject[]> {
  const fromIDB = await idbGet<PastProject[]>(IDB_STORES.MASTER_PROJECTS, 'current');
  if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
    cachedProjects = normalizeMasterProjects(fromIDB);
    return cachedProjects;
  }
  return getMasterProjectsLibrary();
}

export function saveMasterProjectsLibrary(items: PastProject[]): void {
  const normalized = normalizeMasterProjects(items);
  saveLocalProjectsLibrary(normalized);
  dispatchProjectsUpdatedEvent(normalized);
}

export function deleteMasterProject(id: string): PastProject[] {
  const current = getMasterProjectsLibrary();
  const updated = current.filter((p) => p.id !== id && p.projectCode !== id);
  saveLocalProjectsLibrary(updated);
  dispatchProjectsUpdatedEvent(updated);
  return updated;
}

export function clearAllMasterProjects(): PastProject[] {
  saveLocalProjectsLibrary([]);
  dispatchProjectsUpdatedEvent([]);
  return [];
}

export function resetMasterProjectsLibrary(): PastProject[] {
  try {
    localStorage.removeItem(PROJECTS_LIBRARY_KEY);
  } catch (e) {}
  const defaults = normalizeMasterProjects([...MASTER_PROJECTS_LIBRARY]);
  saveLocalProjectsLibrary(defaults);
  dispatchProjectsUpdatedEvent(defaults);
  return defaults;
}

export function saveProjectToMasterLibraryResult(project: PastProject): {
  updatedLibrary: PastProject[];
  savedProject: PastProject;
  isNew: boolean;
} {
  const current = getMasterProjectsLibrary();
  const contractYear = project.contractYearBE || project.completionYearBE || 2568;

  const existingIdx = findMatchingMasterProjectIndex(project, current);

  let updatedProject: PastProject;
  let updated: PastProject[];
  let isNew = false;

  if (existingIdx >= 0) {
    // ซ้ำกัน: ให้อัปเดตข้อมูลเดิมในคลังกลาง แทนการบันทึกเป็นโครงการใหม่
    const target = current[existingIdx];
    const finalCode = project.projectCode?.trim() || target.projectCode || generateMasterProjectCode(contractYear, current);
    updatedProject = {
      ...target,
      ...project,
      id: target.id, // คง ID เดิมของคลังกลางไว้เสมอ
      originalMasterId: target.id,
      projectCode: finalCode,
      contractYearBE: contractYear,
      certificateFileUrl: project.certificateFileUrl || target.certificateFileUrl,
      certificateFileName: project.certificateFileName || target.certificateFileName,
      imageBlocks: (project.imageBlocks && project.imageBlocks.length > 0) ? project.imageBlocks : (target.imageBlocks || []),
    };
    updated = [...current];
    updated[existingIdx] = updatedProject;
  } else {
    // โครงการใหม่ในคลังกลาง:
    isNew = true;
    const finalCode = project.projectCode?.trim() || generateMasterProjectCode(contractYear, current);
    const newId = (project.originalMasterId && project.originalMasterId.startsWith('lib-proj-'))
      ? project.originalMasterId
      : (project.id && project.id.startsWith('lib-proj-'))
        ? project.id
        : `lib-proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    updatedProject = {
      ...project,
      id: newId,
      originalMasterId: newId,
      projectCode: finalCode,
      contractYearBE: contractYear,
    };
    updated = [updatedProject, ...current];
  }

  const deduped = deduplicateMasterProjects(updated);
  saveLocalProjectsLibrary(deduped);
  dispatchProjectsUpdatedEvent(deduped);
  return { updatedLibrary: deduped, savedProject: updatedProject, isNew };
}

export function saveProjectToMasterLibrary(project: PastProject): PastProject[] {
  return saveProjectToMasterLibraryResult(project).updatedLibrary;
}

export function saveMultipleProjectsToMasterLibraryResult(projects: PastProject[]): {
  updatedLibrary: PastProject[];
  savedProjects: PastProject[];
} {
  let current = [...getMasterProjectsLibrary()];
  const savedProjects: PastProject[] = [];

  for (const p of projects) {
    if (!p.projectName || p.projectName.trim() === '') continue;
    const contractYear = p.contractYearBE || p.completionYearBE || 2568;

    const existingIdx = findMatchingMasterProjectIndex(p, current);
    let updatedProject: PastProject;

    if (existingIdx >= 0) {
      const target = current[existingIdx];
      const finalCode = p.projectCode?.trim() || target.projectCode || generateMasterProjectCode(contractYear, current);
      updatedProject = {
        ...target,
        ...p,
        id: target.id,
        originalMasterId: target.id,
        projectCode: finalCode,
        contractYearBE: contractYear,
        certificateFileUrl: p.certificateFileUrl || target.certificateFileUrl,
        certificateFileName: p.certificateFileName || target.certificateFileName,
        imageBlocks: (p.imageBlocks && p.imageBlocks.length > 0) ? p.imageBlocks : (target.imageBlocks || []),
      };
      current[existingIdx] = updatedProject;
    } else {
      const finalCode = p.projectCode?.trim() || generateMasterProjectCode(contractYear, current);
      const newId = (p.originalMasterId && p.originalMasterId.startsWith('lib-proj-'))
        ? p.originalMasterId
        : (p.id && p.id.startsWith('lib-proj-'))
          ? p.id
          : `lib-proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      updatedProject = {
        ...p,
        id: newId,
        originalMasterId: newId,
        projectCode: finalCode,
        contractYearBE: contractYear,
      };
      current.push(updatedProject);
    }
    savedProjects.push(updatedProject);
  }

  const deduped = deduplicateMasterProjects(current);
  saveLocalProjectsLibrary(deduped);
  dispatchProjectsUpdatedEvent(deduped);
  return { updatedLibrary: deduped, savedProjects };
}

export function saveMultipleProjectsToMasterLibrary(projects: PastProject[]): PastProject[] {
  return saveMultipleProjectsToMasterLibraryResult(projects).updatedLibrary;
}

export function deduplicateMasterProjectsLibrary(): PastProject[] {
  const current = getMasterProjectsLibrary();
  const deduped = deduplicateMasterProjects(current);
  saveLocalProjectsLibrary(deduped);
  dispatchProjectsUpdatedEvent(deduped);
  return deduped;
}

// ==============================================================================
// Public API: BOM & Cost Catalog Library
// ==============================================================================

export function getMasterBomLibrary(): MasterBomItem[] {
  if (cachedBom && cachedBom.length > 0) return cachedBom;
  try {
    const raw = localStorage.getItem(BOM_LIBRARY_KEY);
    if (raw !== null) {
      cachedBom = JSON.parse(raw);
      return cachedBom!;
    }
  } catch (e) {}
  cachedBom = [...MASTER_BOM_LIBRARY];
  return cachedBom;
}

export async function fetchMasterBomLibraryFromCloud(): Promise<MasterBomItem[]> {
  const fromIDB = await idbGet<MasterBomItem[]>(IDB_STORES.MASTER_BOM, 'current');
  if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
    cachedBom = fromIDB;
    return fromIDB;
  }
  return getMasterBomLibrary();
}

export function saveMasterBomLibrary(items: MasterBomItem[]): void {
  saveLocalBomLibrary(items);
  dispatchBomUpdatedEvent(items);
}

export function deleteMasterBomItem(id: string): MasterBomItem[] {
  const current = getMasterBomLibrary();
  const updated = current.filter((m) => m.id !== id);
  saveLocalBomLibrary(updated);
  dispatchBomUpdatedEvent(updated);
  return updated;
}

export function clearAllMasterBomItems(): MasterBomItem[] {
  saveLocalBomLibrary([]);
  dispatchBomUpdatedEvent([]);
  return [];
}

export function resetMasterBomLibrary(): MasterBomItem[] {
  try {
    localStorage.removeItem(BOM_LIBRARY_KEY);
  } catch (e) {}
  const defaults = [...MASTER_BOM_LIBRARY];
  saveLocalBomLibrary(defaults);
  dispatchBomUpdatedEvent(defaults);
  return defaults;
}

export function saveItemToMasterBomLibrary(item: MasterBomItem): MasterBomItem[] {
  const current = getMasterBomLibrary();
  const existingIdx = current.findIndex((b) => b.id === item.id || (b.title.trim() === item.title.trim() && b.category === item.category));

  let updatedItem: MasterBomItem;
  if (existingIdx >= 0) {
    updatedItem = { ...current[existingIdx], ...item };
    current[existingIdx] = updatedItem;
  } else {
    updatedItem = {
      ...item,
      id: item.id && !item.id.startsWith('bom-') ? item.id : `lib-bom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    current.push(updatedItem);
  }

  saveLocalBomLibrary(current);
  dispatchBomUpdatedEvent(current);
  return current;
}

export function saveMultipleItemsToMasterBomLibrary(items: MasterBomItem[]): MasterBomItem[] {
  const current = [...getMasterBomLibrary()];

  for (const it of items) {
    if (!it.title || it.title.trim() === '') continue;
    const existingIdx = current.findIndex(
      (b) => b.id === it.id || (b.title.trim() === it.title.trim() && b.category === it.category)
    );
    if (existingIdx >= 0) {
      current[existingIdx] = { ...current[existingIdx], ...it };
    } else {
      current.push({
        ...it,
        id: it.id && !it.id.startsWith('bom-') ? it.id : `lib-bom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      });
    }
  }

  saveLocalBomLibrary(current);
  dispatchBomUpdatedEvent(current);
  return current;
}

// ==============================================================================
// Public API: Company Profile Library (Section 5)
// ==============================================================================

export function getMasterCompanyProfile(): MasterCompanyProfile {
  try {
    if (cachedCompany && (cachedCompany as MasterCompanyProfile).companyName) {
      return cachedCompany as MasterCompanyProfile;
    }
    const raw = localStorage.getItem(COMPANY_PROFILE_KEY);
    if (raw !== null && raw !== 'undefined' && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.companyName) {
        cachedCompany = parsed;
        return cachedCompany as MasterCompanyProfile;
      }
    }
  } catch (e) {
    console.warn('Could not read master company profile from localStorage:', e);
  }
  cachedCompany = { ...DEFAULT_MASTER_COMPANY_PROFILE };
  return cachedCompany as MasterCompanyProfile;
}


export async function fetchMasterCompanyProfileFromCloud(): Promise<MasterCompanyProfile> {
  const fromIDB = await idbGet<MasterCompanyProfile>(IDB_STORES.MASTER_COMPANY, 'current');
  if (fromIDB && fromIDB.companyName) {
    cachedCompany = fromIDB;
    return fromIDB;
  }
  return getMasterCompanyProfile();
}

export function saveMasterCompanyProfile(profile: MasterCompanyProfile): void {
  saveLocalCompanyProfile(profile);
  dispatchCompanyUpdatedEvent(profile);
}

export function resetMasterCompanyProfile(): MasterCompanyProfile {
  try {
    localStorage.removeItem(COMPANY_PROFILE_KEY);
  } catch (e) {}
  const defaults = { ...DEFAULT_MASTER_COMPANY_PROFILE };
  saveLocalCompanyProfile(defaults);
  dispatchCompanyUpdatedEvent(defaults);
  return defaults;
}

// ==============================================================================
// Local-First JSON Export & Import (100% Offline & File Sharing)
// ==============================================================================

export function exportMasterProjectsToJson(): void {
  const projects = getMasterProjectsLibrary();
  const jsonStr = JSON.stringify(projects, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Prime_Master_Projects_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importMasterProjectsFromJson(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].projectName || parsed[0].id)) {
      const updated = saveMultipleProjectsToMasterLibrary(parsed);
      return { success: true, count: updated.length };
    }
    return { success: false, count: 0, error: 'รูปแบบไฟล์ไม่ตรงกับรายการผลงานโครงการ' };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ JSON' };
  }
}

export function exportMasterTeamToJson(): void {
  const team = getMasterTeamLibrary();
  const jsonStr = JSON.stringify(team, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Prime_Master_Team_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importMasterTeamFromJson(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
      const updated = saveMultipleMembersToMasterLibrary(parsed);
      return { success: true, count: updated.length };
    }
    return { success: false, count: 0, error: 'รูปแบบไฟล์ไม่ตรงกับรายการบุคลากร' };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ JSON' };
  }
}

export function exportAllMasterDataToJson(): void {
  const allData = {
    exportDate: new Date().toISOString(),
    version: '2.0',
    masterProjects: getMasterProjectsLibrary(),
    masterTeam: getMasterTeamLibrary(),
    masterBom: getMasterBomLibrary(),
    masterCompany: getMasterCompanyProfile(),
  };
  const jsonStr = JSON.stringify(allData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Prime_Master_All_Catalog_Backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllMasterDataFromJson(jsonString: string): { success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.masterProjects && Array.isArray(parsed.masterProjects)) {
      saveMultipleProjectsToMasterLibrary(parsed.masterProjects);
    }
    if (parsed.masterTeam && Array.isArray(parsed.masterTeam)) {
      saveMultipleMembersToMasterLibrary(parsed.masterTeam);
    }
    if (parsed.masterBom && Array.isArray(parsed.masterBom)) {
      saveMultipleItemsToMasterBomLibrary(parsed.masterBom);
    }
    if (parsed.masterCompany && typeof parsed.masterCompany === 'object') {
      saveMasterCompanyProfile(parsed.masterCompany);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์' };
  }
}

// Realtime sync disabled (100% Local Storage)
export function initMasterLibraryRealtime(
  _onTeamChange?: (items: TeamMember[]) => void,
  _onProjectsChange?: (items: PastProject[]) => void,
  _onBomChange?: (items: MasterBomItem[]) => void,
  _onCompanyChange?: (profile: MasterCompanyProfile) => void
): () => void {
  return () => {};
}

/**
 * ฟังก์ชันช่วยแยกแถว CSV รองรับเครื่องหมายคำพูด (quotes) และ comma ในเซลล์
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

/**
 * นำเข้าผลงานโครงการจากไฟล์ CSV (ที่ดาวน์โหลดจากแท็บ [คลังกลาง] ผลงานและสัญญา ของ Google Sheet)
 */
export function importMasterProjectsFromCsv(csvText: string): { success: boolean; count: number; error?: string } {
  try {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return { success: false, count: 0, error: 'ไฟล์ CSV ไม่มีข้อมูลแถวผลงาน' };
    }

    const projects: PastProject[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length === 0 || !cols.some(c => c.length > 0)) continue;

      const code = cols[0] || '';
      const contractYr = parseInt(cols[1]) || 2567;
      const name = cols[2] || '';
      if (!name && !code) continue;

      const client = cols[3] || '';
      const value = parseFloat((cols[4] || '0').replace(/,/g, '')) || 0;
      const compYr = parseInt(cols[5]) || contractYr;
      const duration = cols[6] || '';
      const category = cols[7] || '';
      const typeStr = cols[8] || '';
      const projectType = (typeStr.includes('ตรง TOR') || typeStr.includes('tor_reference')) ? 'tor_reference' : 'supplementary';
      const desc = cols[9] || '';
      const relevanceNote = cols[10] || '';
      const certFileName = cols[11] || '';
      const certFileUrl = cols[12] && cols[12].startsWith('http') ? cols[12] : undefined;

      const id = code ? `lib-proj-${code.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}` : `lib-proj-${Date.now()}-${i}`;

      projects.push({
        id,
        originalMasterId: id,
        projectCode: code || `${contractYr}-PRJ-${String(i).padStart(3, '0')}`,
        contractYearBE: contractYr,
        projectName: name,
        clientName: client,
        contractValue: value,
        completionYearBE: compYr,
        periodDuration: duration,
        category,
        projectType,
        description: desc,
        relevanceNote,
        certificateFileName: certFileName || undefined,
        certificateFileUrl: certFileUrl,
        isSelected: true,
        imageBlocks: [],
      });
    }

    if (projects.length === 0) {
      return { success: false, count: 0, error: 'ไม่พบแถวข้อมูลผลงานที่ถูกต้องในไฟล์ CSV' };
    }

    const saved = saveMultipleProjectsToMasterLibraryResult(projects);
    return { success: true, count: saved.updatedLibrary.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'รูปแบบ CSV ไม่ถูกต้อง' };
  }
}

/**
 * นำเข้าบุคลากรจากไฟล์ CSV (ที่ดาวน์โหลดจากแท็บ [คลังกลาง] บุคลากร ของ Google Sheet)
 */
export function importMasterTeamFromCsv(csvText: string): { success: boolean; count: number; error?: string } {
  try {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return { success: false, count: 0, error: 'ไฟล์ CSV ไม่มีข้อมูลแถวบุคลากร' };
    }

    const headerCols = parseCsvLine(lines[0]);
    let bioIdx = headerCols.findIndex(c => c.includes('ประวัติย่อ'));
    let certIdx = headerCols.findIndex(c => c.includes('ใบรับรอง') || c.includes('Certification'));
    if (bioIdx === -1 && headerCols.length >= 14) { bioIdx = 9; certIdx = 10; }
    else if (bioIdx === -1 && headerCols.length < 14) { bioIdx = -1; certIdx = 9; }

    const members: TeamMember[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length === 0 || !cols.some(c => c.length > 0)) continue;

      const code = cols[0] || '';
      const recYr = parseInt(cols[1]) || 2568;
      const name = cols[2] || '';
      if (!name && !code) continue;

      const proposedRole = cols[3] || '';
      const education = cols[4] || '';
      const expYears = parseFloat((cols[5] || '0').replace(/,/g, '')) || 0;
      const startWorkYr = parseInt(cols[6]) || (recYr - Math.round(expYears));
      const responsibilities = cols[7] || '';
      const highlightProjects = cols[8] || '';
      const personalBio = bioIdx >= 0 ? (cols[bioIdx] || '') : '';
      const certifications = certIdx >= 0 ? (cols[certIdx] || '') : (cols[9] || '');

      const id = code ? `lib-team-${code.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}` : `lib-team-${Date.now()}-${i}`;

      members.push({
        id,
        originalMasterId: id,
        memberCode: code || `${recYr}-EMP-${String(i).padStart(3, '0')}`,
        recordedYearBE: recYr,
        name,
        proposedRole,
        education,
        experienceYears: expYears,
        startWorkYearBE: startWorkYr,
        responsibilities,
        highlightProjects,
        personalBio: personalBio || undefined,
        certifications,
      });
    }

    if (members.length === 0) {
      return { success: false, count: 0, error: 'ไม่พบแถวข้อมูลบุคลากรที่ถูกต้องในไฟล์ CSV' };
    }

    const saved = saveMultipleMembersToMasterLibraryResult(members);
    return { success: true, count: saved.updatedLibrary.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'รูปแบบ CSV ไม่ถูกต้อง' };
  }
}
