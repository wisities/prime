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

// Hydrate from IndexedDB on startup
if (typeof window !== 'undefined') {
  idbGet<PastProject[]>(IDB_STORES.MASTER_PROJECTS, 'current').then((fromIDB) => {
    if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
      cachedProjects = fromIDB;
      dispatchProjectsUpdatedEvent(fromIDB);
    }
  });
  idbGet<TeamMember[]>(IDB_STORES.MASTER_TEAM, 'current').then((fromIDB) => {
    if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
      cachedTeam = fromIDB;
      dispatchTeamUpdatedEvent(fromIDB);
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
 */
export function generateMasterProjectCode(yearBE: number, existingProjects: PastProject[]): string {
  const y = Number(yearBE) || (new Date().getFullYear() + 543);
  const prefix = `${y}-PRJ-`;
  let maxNum = 0;
  for (const p of existingProjects) {
    const code = p.projectCode || '';
    if (code.startsWith(prefix)) {
      const numPart = parseInt(code.substring(prefix.length), 10);
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
export function generateMasterMemberId(yearBE: number, existingMembers: TeamMember[]): string {
  const y = Number(yearBE) || (new Date().getFullYear() + 543);
  const prefix = `${y}-EMP-`;
  let maxNum = 0;
  for (const m of existingMembers) {
    const code = m.memberCode || (m.id && m.id.startsWith(prefix) ? m.id : '');
    if (code.startsWith(prefix)) {
      const numPart = parseInt(code.substring(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * ปรับปรุงข้อมูลโครงการในคลังกลางให้มีรหัสโครงการขึ้นต้นด้วยปี พ.ศ. เสมอ
 */
export function normalizeMasterProjects(projects: PastProject[]): PastProject[] {
  return projects.map((p, idx) => {
    const contractYear = p.contractYearBE || p.completionYearBE || 2568;
    let code = p.projectCode?.trim();
    if (!code) {
      code = generateMasterProjectCode(contractYear, projects.slice(0, idx));
    }
    return {
      ...p,
      contractYearBE: contractYear,
      projectCode: code,
    };
  });
}

/**
 * ปรับปรุงข้อมูลบุคลากรในคลังกลางให้มีรหัส ID บุคลากรขึ้นต้นด้วยปี พ.ศ. ที่บันทึกเสมอ
 */
export function normalizeMasterTeam(members: TeamMember[]): TeamMember[] {
  const currentYearBE = new Date().getFullYear() + 543;
  return members.map((m, idx) => {
    const recordedYear = m.recordedYearBE || currentYearBE;
    let code = m.memberCode?.trim();
    if (!code) {
      code = generateMasterMemberId(recordedYear, members.slice(0, idx));
    }
    return {
      ...m,
      recordedYearBE: recordedYear,
      memberCode: code,
      id: m.id || code,
    };
  });
}

// ==============================================================================
// Public API: Team Library (Section 4)
// ==============================================================================

export function getMasterTeamLibrary(): TeamMember[] {
  if (cachedTeam && cachedTeam.length > 0) return normalizeMasterTeam(cachedTeam);
  try {
    const raw = localStorage.getItem(TEAM_LIBRARY_KEY);
    if (raw !== null) {
      cachedTeam = normalizeMasterTeam(JSON.parse(raw));
      return cachedTeam!;
    }
  } catch (e) {}
  cachedTeam = normalizeMasterTeam([...MASTER_TEAM_LIBRARY]);
  return cachedTeam;
}

export async function fetchMasterTeamLibraryFromCloud(): Promise<TeamMember[]> {
  const fromIDB = await idbGet<TeamMember[]>(IDB_STORES.MASTER_TEAM, 'current');
  if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
    cachedTeam = normalizeMasterTeam(fromIDB);
    return cachedTeam;
  }
  return getMasterTeamLibrary();
}

export function saveMasterTeamLibrary(items: TeamMember[]): void {
  const normalized = normalizeMasterTeam(items);
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

export function saveMemberToMasterLibrary(member: TeamMember): TeamMember[] {
  const current = getMasterTeamLibrary();
  const currentYearBE = new Date().getFullYear() + 543;
  const recordedYear = member.recordedYearBE || currentYearBE;

  // ตรวจจับบุคลากรซ้ำ:
  // 1. ตรวจจาก originalMasterId ที่ดึงมาจากคลังกลาง
  // 2. ตรวจจาก id เดิม
  // 3. ตรวจจาก memberCode เดียวกัน
  // 4. ตรวจจาก name เดียวกัน
  const existingIdx = current.findIndex((m) => {
    if (member.originalMasterId && (m.id === member.originalMasterId || m.memberCode === member.originalMasterId)) return true;
    if (m.id === member.id) return true;
    if (member.memberCode && m.memberCode && member.memberCode.trim() === m.memberCode.trim()) return true;
    if (member.name && m.name && member.name.trim().toLowerCase() === member.name.trim().toLowerCase()) return true;
    return false;
  });

  let updatedMember: TeamMember;
  let updated: TeamMember[];

  if (existingIdx >= 0) {
    // ซ้ำกัน: ให้อัปเดตข้อมูลแทนการบันทึกเป็นคนใหม่
    const target = current[existingIdx];
    const finalCode = member.memberCode?.trim() || target.memberCode || generateMasterMemberId(recordedYear, current);
    updatedMember = {
      ...target,
      ...member,
      id: target.id,
      memberCode: finalCode,
      recordedYearBE: recordedYear,
      originalMasterId: target.id,
    };
    updated = [...current];
    updated[existingIdx] = updatedMember;
  } else {
    // บุคลากรใหม่: สร้าง ID / Member Code ขึ้นต้นด้วยปีที่มีการบันทึก
    const finalCode = member.memberCode?.trim() || generateMasterMemberId(recordedYear, current);
    const newId = member.id && !member.id.startsWith('member-') ? member.id : finalCode;
    updatedMember = {
      ...member,
      id: newId,
      memberCode: finalCode,
      recordedYearBE: recordedYear,
      originalMasterId: newId,
    };
    updated = [...current, updatedMember];
  }

  saveLocalTeamLibrary(updated);
  dispatchTeamUpdatedEvent(updated);
  return updated;
}

export function saveMultipleMembersToMasterLibrary(members: TeamMember[]): TeamMember[] {
  let current = [...getMasterTeamLibrary()];
  const currentYearBE = new Date().getFullYear() + 543;

  for (const m of members) {
    if (!m.name || m.name.trim() === '' || m.name.includes('(ระบุชื่อ-นามสกุล)')) continue;
    const recordedYear = m.recordedYearBE || currentYearBE;

    const existingIdx = current.findIndex((item) => {
      if (m.originalMasterId && (item.id === m.originalMasterId || item.memberCode === m.originalMasterId)) return true;
      if (item.id === m.id) return true;
      if (m.memberCode && item.memberCode && m.memberCode.trim() === item.memberCode.trim()) return true;
      if (item.name.trim().toLowerCase() === m.name.trim().toLowerCase()) return true;
      return false;
    });

    if (existingIdx >= 0) {
      const target = current[existingIdx];
      const finalCode = m.memberCode?.trim() || target.memberCode || generateMasterMemberId(recordedYear, current);
      current[existingIdx] = {
        ...target,
        ...m,
        id: target.id,
        memberCode: finalCode,
        recordedYearBE: recordedYear,
        originalMasterId: target.id,
      };
    } else {
      const finalCode = m.memberCode?.trim() || generateMasterMemberId(recordedYear, current);
      current.push({
        ...m,
        id: m.id && !m.id.startsWith('member-') ? m.id : finalCode,
        memberCode: finalCode,
        recordedYearBE: recordedYear,
        originalMasterId: finalCode,
      });
    }
  }

  saveLocalTeamLibrary(current);
  dispatchTeamUpdatedEvent(current);
  return current;
}

// ==============================================================================
// Public API: Past Projects Library (Section 5)
// ==============================================================================

export function getMasterProjectsLibrary(): PastProject[] {
  if (cachedProjects && cachedProjects.length > 0) return normalizeMasterProjects(cachedProjects);
  try {
    const raw = localStorage.getItem(PROJECTS_LIBRARY_KEY);
    if (raw !== null) {
      cachedProjects = normalizeMasterProjects(JSON.parse(raw));
      return cachedProjects!;
    }
  } catch (e) {}
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

export function saveProjectToMasterLibrary(project: PastProject): PastProject[] {
  const current = getMasterProjectsLibrary();
  const contractYear = project.contractYearBE || project.completionYearBE || 2568;

  // ตรวจจับโครงการซ้ำ:
  // 1. ตรวจจาก originalMasterId ที่ดึงมาจากคลังกลาง
  // 2. ตรวจจาก id เดิม
  // 3. ตรวจจาก projectCode เดียวกัน
  // 4. ตรวจจาก projectName เดียวกัน
  const existingIdx = current.findIndex((p) => {
    if (project.originalMasterId && (p.id === project.originalMasterId || p.projectCode === project.originalMasterId)) return true;
    if (p.id === project.id) return true;
    if (project.projectCode && p.projectCode && project.projectCode.trim() === p.projectCode.trim()) return true;
    if (project.projectName && p.projectName && project.projectName.trim().toLowerCase() === p.projectName.trim().toLowerCase()) return true;
    return false;
  });

  let updatedProject: PastProject;
  let updated: PastProject[];

  if (existingIdx >= 0) {
    // ซ้ำกัน: ให้อัปเดตข้อมูลเดิมในคลังกลาง แทนการบันทึกเป็นโครงการใหม่
    const target = current[existingIdx];
    const finalCode = project.projectCode?.trim() || target.projectCode || generateMasterProjectCode(contractYear, current);
    updatedProject = {
      ...target,
      ...project,
      id: target.id, // คง ID เดิมของคลังกลางไว้
      projectCode: finalCode,
      contractYearBE: contractYear,
      originalMasterId: target.id,
    };
    updated = [...current];
    updated[existingIdx] = updatedProject;
  } else {
    // โครงการใหม่: สร้างรหัสโครงการขึ้นต้นด้วยปี พ.ศ. ที่ได้สัญญา
    const finalCode = project.projectCode?.trim() || generateMasterProjectCode(contractYear, current);
    const newId = project.id && !project.id.startsWith('proj-') ? project.id : `lib-proj-${Date.now()}`;
    updatedProject = {
      ...project,
      id: newId,
      projectCode: finalCode,
      contractYearBE: contractYear,
      originalMasterId: newId,
    };
    updated = [updatedProject, ...current];
  }

  saveLocalProjectsLibrary(updated);
  dispatchProjectsUpdatedEvent(updated);
  return updated;
}

export function saveMultipleProjectsToMasterLibrary(projects: PastProject[]): PastProject[] {
  let current = [...getMasterProjectsLibrary()];

  for (const p of projects) {
    if (!p.projectName || p.projectName.trim() === '') continue;
    const contractYear = p.contractYearBE || p.completionYearBE || 2568;

    const existingIdx = current.findIndex((item) => {
      if (p.originalMasterId && (item.id === p.originalMasterId || item.projectCode === p.originalMasterId)) return true;
      if (item.id === p.id) return true;
      if (p.projectCode && item.projectCode && p.projectCode.trim() === item.projectCode.trim()) return true;
      if (item.projectName.trim().toLowerCase() === p.projectName.trim().toLowerCase()) return true;
      return false;
    });

    if (existingIdx >= 0) {
      const target = current[existingIdx];
      const finalCode = p.projectCode?.trim() || target.projectCode || generateMasterProjectCode(contractYear, current);
      current[existingIdx] = {
        ...target,
        ...p,
        id: target.id,
        projectCode: finalCode,
        contractYearBE: contractYear,
        originalMasterId: target.id,
      };
    } else {
      const finalCode = p.projectCode?.trim() || generateMasterProjectCode(contractYear, current);
      const newId = p.id && !p.id.startsWith('proj-') ? p.id : `lib-proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      current.push({
        ...p,
        id: newId,
        projectCode: finalCode,
        contractYearBE: contractYear,
        originalMasterId: newId,
      });
    }
  }

  saveLocalProjectsLibrary(current);
  dispatchProjectsUpdatedEvent(current);
  return current;
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
  if (cachedCompany && (cachedCompany as MasterCompanyProfile).companyName) {
    return cachedCompany as MasterCompanyProfile;
  }
  try {
    const raw = localStorage.getItem(COMPANY_PROFILE_KEY);
    if (raw !== null) {
      cachedCompany = JSON.parse(raw);
      return cachedCompany as MasterCompanyProfile;
    }
  } catch (e) {}
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
