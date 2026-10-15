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
    };
  }
  return {
    id: row.id,
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
// Public API: Team Library (Section 4)
// ==============================================================================

export function getMasterTeamLibrary(): TeamMember[] {
  if (cachedTeam && cachedTeam.length > 0) return cachedTeam;
  try {
    const raw = localStorage.getItem(TEAM_LIBRARY_KEY);
    if (raw !== null) {
      cachedTeam = JSON.parse(raw);
      return cachedTeam!;
    }
  } catch (e) {}
  cachedTeam = [...MASTER_TEAM_LIBRARY];
  return cachedTeam;
}

export async function fetchMasterTeamLibraryFromCloud(): Promise<TeamMember[]> {
  const fromIDB = await idbGet<TeamMember[]>(IDB_STORES.MASTER_TEAM, 'current');
  if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
    cachedTeam = fromIDB;
    return fromIDB;
  }
  return getMasterTeamLibrary();
}

export function saveMasterTeamLibrary(items: TeamMember[]): void {
  saveLocalTeamLibrary(items);
  dispatchTeamUpdatedEvent(items);
}

export function deleteMasterTeamMember(id: string): TeamMember[] {
  const current = getMasterTeamLibrary();
  const updated = current.filter((m) => m.id !== id);
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
  const defaults = [...MASTER_TEAM_LIBRARY];
  saveLocalTeamLibrary(defaults);
  dispatchTeamUpdatedEvent(defaults);
  return defaults;
}

export function saveMemberToMasterLibrary(member: TeamMember): TeamMember[] {
  const current = getMasterTeamLibrary();
  const existingIdx = current.findIndex((m) => m.id === member.id || m.name.trim() === member.name.trim());
  let updatedMember: TeamMember;
  let updated: TeamMember[];

  if (existingIdx >= 0) {
    updatedMember = { ...member, id: current[existingIdx].id };
    updated = [...current];
    updated[existingIdx] = updatedMember;
  } else {
    updatedMember = { ...member, id: member.id && !member.id.startsWith('member-') ? member.id : `lib-team-${Date.now()}` };
    updated = [...current, updatedMember];
  }

  saveLocalTeamLibrary(updated);
  dispatchTeamUpdatedEvent(updated);
  return updated;
}

export function saveMultipleMembersToMasterLibrary(members: TeamMember[]): TeamMember[] {
  const current = [...getMasterTeamLibrary()];

  for (const m of members) {
    if (!m.name || m.name.trim() === '' || m.name.includes('(ระบุชื่อ-นามสกุล)')) continue;
    const existingIdx = current.findIndex((item) => item.id === m.id || item.name.trim() === m.name.trim());
    if (existingIdx >= 0) {
      current[existingIdx] = { ...m, id: current[existingIdx].id };
    } else {
      current.push({ ...m, id: `lib-team-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` });
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
  if (cachedProjects && cachedProjects.length > 0) return cachedProjects;
  try {
    const raw = localStorage.getItem(PROJECTS_LIBRARY_KEY);
    if (raw !== null) {
      cachedProjects = JSON.parse(raw);
      return cachedProjects!;
    }
  } catch (e) {}
  cachedProjects = [...MASTER_PROJECTS_LIBRARY];
  return cachedProjects;
}

export async function fetchMasterProjectsLibraryFromCloud(): Promise<PastProject[]> {
  const fromIDB = await idbGet<PastProject[]>(IDB_STORES.MASTER_PROJECTS, 'current');
  if (fromIDB && Array.isArray(fromIDB) && fromIDB.length > 0) {
    cachedProjects = fromIDB;
    return fromIDB;
  }
  return getMasterProjectsLibrary();
}

export function saveMasterProjectsLibrary(items: PastProject[]): void {
  saveLocalProjectsLibrary(items);
  dispatchProjectsUpdatedEvent(items);
}

export function deleteMasterProject(id: string): PastProject[] {
  const current = getMasterProjectsLibrary();
  const updated = current.filter((p) => p.id !== id);
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
  const defaults = [...MASTER_PROJECTS_LIBRARY];
  saveLocalProjectsLibrary(defaults);
  dispatchProjectsUpdatedEvent(defaults);
  return defaults;
}

export function saveProjectToMasterLibrary(project: PastProject): PastProject[] {
  const current = getMasterProjectsLibrary();
  const existingIdx = current.findIndex((p) => p.id === project.id || p.projectName.trim() === project.projectName.trim());
  let updatedProject: PastProject;
  let updated: PastProject[];

  if (existingIdx >= 0) {
    updatedProject = { ...project, id: current[existingIdx].id };
    updated = [...current];
    updated[existingIdx] = updatedProject;
  } else {
    updatedProject = { ...project, id: project.id && !project.id.startsWith('proj-') ? project.id : `lib-proj-${Date.now()}` };
    updated = [...current, updatedProject];
  }

  saveLocalProjectsLibrary(updated);
  dispatchProjectsUpdatedEvent(updated);
  return updated;
}

export function saveMultipleProjectsToMasterLibrary(projects: PastProject[]): PastProject[] {
  const current = [...getMasterProjectsLibrary()];

  for (const p of projects) {
    if (!p.projectName || p.projectName.trim() === '') continue;
    const existingIdx = current.findIndex((item) => item.id === p.id || item.projectName.trim() === p.projectName.trim());
    if (existingIdx >= 0) {
      current[existingIdx] = { ...p, id: current[existingIdx].id };
    } else {
      current.push({ ...p, id: `lib-proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` });
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
