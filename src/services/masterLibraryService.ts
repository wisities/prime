import { TeamMember, PastProject } from '../types/proposal';
import { MasterBomItem } from '../types/bom';
import { MASTER_TEAM_LIBRARY, MASTER_PROJECTS_LIBRARY, MASTER_BOM_LIBRARY } from '../data/defaultData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const TEAM_LIBRARY_KEY = 'prime_master_team_library';
const PROJECTS_LIBRARY_KEY = 'prime_master_projects_library';
const BOM_LIBRARY_KEY = 'prime_master_bom_catalog';

export const MASTER_TEAM_UPDATED_EVENT = 'prime_master_team_updated';
export const MASTER_PROJECTS_UPDATED_EVENT = 'prime_master_projects_updated';
export const MASTER_BOM_UPDATED_EVENT = 'prime_master_bom_updated';

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
      contractValue: Number(row.contract_value) || Number(row.data.contractValue) || 0,
      completionYearBE: Number(row.completion_year_be) || Number(row.data.completionYearBE) || 2567,
      periodDuration: row.period_duration || row.data.periodDuration || '',
      description: row.description || row.data.description || '',
      category: row.category || row.data.category || '',
      isSelected: true,
      projectType: (row.project_type as any) || row.data.projectType || 'tor_reference',
      relevanceNote: row.relevance_note || row.data.relevanceNote || '',
      certificateFileUrl: row.certificate_file_url || row.data.certificateFileUrl || undefined,
      certificateFileName: row.certificate_file_name || row.data.certificateFileName || undefined,
      projectImageUrl: row.project_image_url || row.data.projectImageUrl || undefined,
      projectImageCaption: row.project_image_caption || row.data.projectImageCaption || undefined,
    };
  }
  return {
    id: row.id,
    projectName: row.project_name,
    clientName: row.client_name || '',
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

// ==============================================================================
// Asynchronous Cloud Sync Helpers
// ==============================================================================

async function syncTeamMembersToCloud(items: TeamMember[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || items.length === 0) return;
  try {
    const rows = items.map(teamMemberToCloudRow);
    const { error } = await supabase.from('master_team_library').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Failed to upsert team members to Supabase:', error);
    }
  } catch (err) {
    console.warn('Error in syncTeamMembersToCloud:', err);
  }
}

async function deleteTeamMemberFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const { error } = await supabase.from('master_team_library').delete().eq('id', id);
    if (error) {
      console.warn('Failed to delete team member from Supabase:', error);
    }
  } catch (err) {
    console.warn('Error in deleteTeamMemberFromCloud:', err);
  }
}

async function clearAllTeamMembersFromCloud(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const { error } = await supabase.from('master_team_library').delete().neq('id', '');
    if (error) {
      console.warn('Failed to clear team library in Supabase:', error);
    }
  } catch (err) {
    console.warn('Error in clearAllTeamMembersFromCloud:', err);
  }
}

async function syncProjectsToCloud(items: PastProject[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || items.length === 0) return;
  try {
    const rows = items.map(pastProjectToCloudRow);
    const { error } = await supabase.from('master_projects_library').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Failed to upsert projects to Supabase:', error);
    }
  } catch (err) {
    console.warn('Error in syncProjectsToCloud:', err);
  }
}

async function deleteProjectFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const { error } = await supabase.from('master_projects_library').delete().eq('id', id);
    if (error) {
      console.warn('Failed to delete project from Supabase:', error);
    }
  } catch (err) {
    console.warn('Error in deleteProjectFromCloud:', err);
  }
}

async function clearAllProjectsFromCloud(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const { error } = await supabase.from('master_projects_library').delete().neq('id', '');
    if (error) {
      console.warn('Failed to clear projects library in Supabase:', error);
    }
  } catch (err) {
    console.warn('Error in clearAllProjectsFromCloud:', err);
  }
}

async function syncBomItemsToCloud(items: MasterBomItem[]): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || items.length === 0) return;
  try {
    const rows = items.map(masterBomItemToCloudRow);
    const { error } = await supabase.from('master_bom_catalog').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('Failed to upsert BOM items to Supabase:', error);
    }
  } catch (err) {
    console.warn('Error in syncBomItemsToCloud:', err);
  }
}

async function deleteBomItemFromCloud(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const { error } = await supabase.from('master_bom_catalog').delete().eq('id', id);
    if (error) {
      console.warn('Failed to delete BOM item from Supabase:', error);
    }
  } catch (err) {
    console.warn('Error in deleteBomItemFromCloud:', err);
  }
}

async function clearAllBomItemsFromCloud(): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return;
  try {
    const { error } = await supabase.from('master_bom_catalog').delete().neq('id', '');
    if (error) {
      console.warn('Failed to clear BOM catalog in Supabase:', error);
    }
  } catch (err) {
    console.warn('Error in clearAllBomItemsFromCloud:', err);
  }
}

// ==============================================================================
// Synchronous Local Helpers
// ==============================================================================

function saveLocalTeamLibrary(items: TeamMember[]): void {
  try {
    localStorage.setItem(TEAM_LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save team library to localStorage:', e);
  }
}

function saveLocalProjectsLibrary(items: PastProject[]): void {
  try {
    localStorage.setItem(PROJECTS_LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save projects library to localStorage:', e);
  }
}

function saveLocalBomLibrary(items: MasterBomItem[]): void {
  try {
    localStorage.setItem(BOM_LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save BOM library to localStorage:', e);
  }
}

// ==============================================================================
// Public API: Team Library (Section 4)
// ==============================================================================

/**
 * Gets master team members from localStorage cache or falls back to default samples.
 * Always synchronous for instant zero-latency UI rendering.
 */
export function getMasterTeamLibrary(): TeamMember[] {
  try {
    const raw = localStorage.getItem(TEAM_LIBRARY_KEY);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load team library from localStorage:', e);
  }
  return [...MASTER_TEAM_LIBRARY];
}

/**
 * Fetches latest master team library from Supabase PostgreSQL database.
 * If cloud table is empty, auto-seeds with existing local/default data.
 * Updates local cache and notifies subscribers.
 */
export async function fetchMasterTeamLibraryFromCloud(): Promise<TeamMember[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return getMasterTeamLibrary();
  }

  try {
    const { data, error } = await supabase
      .from('master_team_library')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetchMasterTeamLibrary error, fallback to local:', error);
      return getMasterTeamLibrary();
    }

    if (data && data.length > 0) {
      const mapped = data.map(cloudRowToTeamMember);
      saveLocalTeamLibrary(mapped);
      dispatchTeamUpdatedEvent(mapped);
      return mapped;
    } else {
      // Cloud table is empty, seed with local or default
      const current = getMasterTeamLibrary();
      if (current.length > 0) {
        await syncTeamMembersToCloud(current);
      }
      return current;
    }
  } catch (err) {
    console.warn('Network error in fetchMasterTeamLibraryFromCloud, fallback to local:', err);
    return getMasterTeamLibrary();
  }
}

/**
 * Saves master team members list to localStorage and asynchronously syncs to Supabase Cloud.
 */
export function saveMasterTeamLibrary(items: TeamMember[]): void {
  saveLocalTeamLibrary(items);
  dispatchTeamUpdatedEvent(items);
  syncTeamMembersToCloud(items);
}

/**
 * Deletes a single team member from local cache and Supabase Cloud.
 */
export function deleteMasterTeamMember(id: string): TeamMember[] {
  const current = getMasterTeamLibrary();
  const updated = current.filter((m) => m.id !== id);
  saveLocalTeamLibrary(updated);
  dispatchTeamUpdatedEvent(updated);
  deleteTeamMemberFromCloud(id);
  return updated;
}

/**
 * Clears all team members from local cache and Supabase Cloud.
 */
export function clearAllMasterTeamMembers(): TeamMember[] {
  saveLocalTeamLibrary([]);
  dispatchTeamUpdatedEvent([]);
  clearAllTeamMembersFromCloud();
  return [];
}

/**
 * Resets master team members back to the initial default mock list in local cache and Cloud.
 */
export function resetMasterTeamLibrary(): TeamMember[] {
  try {
    localStorage.removeItem(TEAM_LIBRARY_KEY);
  } catch (e) {
    console.error('Failed to reset team library:', e);
  }
  const defaults = [...MASTER_TEAM_LIBRARY];
  saveLocalTeamLibrary(defaults);
  dispatchTeamUpdatedEvent(defaults);
  syncTeamMembersToCloud(defaults);
  return defaults;
}

/**
 * Saves or updates a single team member in the master library (both local and Cloud).
 */
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
  syncTeamMembersToCloud([updatedMember]);
  return updated;
}

/**
 * Saves multiple team members to the master library (upsert in both local and Cloud).
 */
export function saveMultipleMembersToMasterLibrary(members: TeamMember[]): TeamMember[] {
  const current = [...getMasterTeamLibrary()];
  const toSync: TeamMember[] = [];

  for (const m of members) {
    if (!m.name || m.name.trim() === '' || m.name.includes('(ระบุชื่อ-นามสกุล)')) continue;
    const existingIdx = current.findIndex((item) => item.id === m.id || item.name.trim() === m.name.trim());
    if (existingIdx >= 0) {
      const merged = { ...m, id: current[existingIdx].id };
      current[existingIdx] = merged;
      toSync.push(merged);
    } else {
      const newMember = { ...m, id: `lib-team-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` };
      current.push(newMember);
      toSync.push(newMember);
    }
  }

  saveLocalTeamLibrary(current);
  dispatchTeamUpdatedEvent(current);
  if (toSync.length > 0) {
    syncTeamMembersToCloud(toSync);
  }
  return current;
}

// ==============================================================================
// Public API: Past Projects Library (Section 5)
// ==============================================================================

/**
 * Gets master projects from localStorage cache or falls back to default samples.
 * Always synchronous for instant zero-latency UI rendering.
 */
export function getMasterProjectsLibrary(): PastProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_LIBRARY_KEY);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load projects library from localStorage:', e);
  }
  return [...MASTER_PROJECTS_LIBRARY];
}

/**
 * Fetches latest master projects library from Supabase PostgreSQL database.
 * If cloud table is empty, auto-seeds with existing local/default data.
 * Updates local cache and notifies subscribers.
 */
export async function fetchMasterProjectsLibraryFromCloud(): Promise<PastProject[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return getMasterProjectsLibrary();
  }

  try {
    const { data, error } = await supabase
      .from('master_projects_library')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetchMasterProjectsLibrary error, fallback to local:', error);
      return getMasterProjectsLibrary();
    }

    if (data && data.length > 0) {
      const mapped = data.map(cloudRowToPastProject);
      saveLocalProjectsLibrary(mapped);
      dispatchProjectsUpdatedEvent(mapped);
      return mapped;
    } else {
      // Cloud table is empty, seed with local or default
      const current = getMasterProjectsLibrary();
      if (current.length > 0) {
        await syncProjectsToCloud(current);
      }
      return current;
    }
  } catch (err) {
    console.warn('Network error in fetchMasterProjectsLibraryFromCloud, fallback to local:', err);
    return getMasterProjectsLibrary();
  }
}

/**
 * Saves master projects list to localStorage and asynchronously syncs to Supabase Cloud.
 */
export function saveMasterProjectsLibrary(items: PastProject[]): void {
  saveLocalProjectsLibrary(items);
  dispatchProjectsUpdatedEvent(items);
  syncProjectsToCloud(items);
}

/**
 * Deletes a single project from local cache and Supabase Cloud.
 */
export function deleteMasterProject(id: string): PastProject[] {
  const current = getMasterProjectsLibrary();
  const updated = current.filter((p) => p.id !== id);
  saveLocalProjectsLibrary(updated);
  dispatchProjectsUpdatedEvent(updated);
  deleteProjectFromCloud(id);
  return updated;
}

/**
 * Clears all projects from local cache and Supabase Cloud.
 */
export function clearAllMasterProjects(): PastProject[] {
  saveLocalProjectsLibrary([]);
  dispatchProjectsUpdatedEvent([]);
  clearAllProjectsFromCloud();
  return [];
}

/**
 * Resets master projects back to the initial default mock list in local cache and Cloud.
 */
export function resetMasterProjectsLibrary(): PastProject[] {
  try {
    localStorage.removeItem(PROJECTS_LIBRARY_KEY);
  } catch (e) {
    console.error('Failed to reset projects library:', e);
  }
  const defaults = [...MASTER_PROJECTS_LIBRARY];
  saveLocalProjectsLibrary(defaults);
  dispatchProjectsUpdatedEvent(defaults);
  syncProjectsToCloud(defaults);
  return defaults;
}

/**
 * Saves or updates a single project in the master library (both local and Cloud).
 */
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
  syncProjectsToCloud([updatedProject]);
  return updated;
}

/**
 * Saves multiple projects to the master library (upsert in both local and Cloud).
 */
export function saveMultipleProjectsToMasterLibrary(projects: PastProject[]): PastProject[] {
  const current = [...getMasterProjectsLibrary()];
  const toSync: PastProject[] = [];

  for (const p of projects) {
    if (!p.projectName || p.projectName.trim() === '') continue;
    const existingIdx = current.findIndex((item) => item.id === p.id || item.projectName.trim() === p.projectName.trim());
    if (existingIdx >= 0) {
      const merged = { ...p, id: current[existingIdx].id };
      current[existingIdx] = merged;
      toSync.push(merged);
    } else {
      const newProj = { ...p, id: `lib-proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` };
      current.push(newProj);
      toSync.push(newProj);
    }
  }

  saveLocalProjectsLibrary(current);
  dispatchProjectsUpdatedEvent(current);
  if (toSync.length > 0) {
    syncProjectsToCloud(toSync);
  }
  return current;
}

// ==============================================================================
// Public API: BOM & Cost Catalog Library
// ==============================================================================

/**
 * Gets master BOM items from localStorage cache or falls back to default samples.
 * Always synchronous for instant zero-latency UI rendering.
 */
export function getMasterBomLibrary(): MasterBomItem[] {
  try {
    const raw = localStorage.getItem(BOM_LIBRARY_KEY);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse BOM library from localStorage:', e);
  }
  return [...MASTER_BOM_LIBRARY];
}

/**
 * Fetches latest master BOM library from Supabase PostgreSQL database.
 * If Supabase is offline/unconfigured, falls back cleanly to local cached list.
 */
export async function fetchMasterBomLibraryFromCloud(): Promise<MasterBomItem[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return getMasterBomLibrary();
  }

  try {
    const { data, error } = await supabase
      .from('master_bom_catalog')
      .select('*')
      .order('category', { ascending: true })
      .order('title', { ascending: true });

    if (error) {
      console.warn('Supabase fetchMasterBomLibrary error, fallback to local:', error);
      return getMasterBomLibrary();
    }

    if (data && data.length > 0) {
      const items = data.map(cloudRowToMasterBomItem);
      saveLocalBomLibrary(items);
      dispatchBomUpdatedEvent(items);
      return items;
    } else {
      // Cloud is empty, seed defaults
      const current = getMasterBomLibrary();
      syncBomItemsToCloud(current);
      return current;
    }
  } catch (err) {
    console.warn('Network error in fetchMasterBomLibraryFromCloud, fallback to local:', err);
    return getMasterBomLibrary();
  }
}

/**
 * Saves master BOM items list to localStorage and asynchronously syncs to Supabase Cloud.
 */
export function saveMasterBomLibrary(items: MasterBomItem[]): void {
  saveLocalBomLibrary(items);
  dispatchBomUpdatedEvent(items);
  syncBomItemsToCloud(items);
}

export function deleteMasterBomItem(id: string): MasterBomItem[] {
  const current = getMasterBomLibrary();
  const updated = current.filter((m) => m.id !== id);
  saveLocalBomLibrary(updated);
  dispatchBomUpdatedEvent(updated);
  deleteBomItemFromCloud(id);
  return updated;
}

export function clearAllMasterBomItems(): MasterBomItem[] {
  const empty: MasterBomItem[] = [];
  saveLocalBomLibrary(empty);
  dispatchBomUpdatedEvent(empty);
  clearAllBomItemsFromCloud();
  return empty;
}

export function resetMasterBomLibrary(): MasterBomItem[] {
  localStorage.removeItem(BOM_LIBRARY_KEY);
  const defaults = [...MASTER_BOM_LIBRARY];
  saveLocalBomLibrary(defaults);
  dispatchBomUpdatedEvent(defaults);
  syncBomItemsToCloud(defaults);
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
  syncBomItemsToCloud([updatedItem]);
  return current;
}

export function saveMultipleItemsToMasterBomLibrary(items: MasterBomItem[]): MasterBomItem[] {
  const current = [...getMasterBomLibrary()];
  const toSync: MasterBomItem[] = [];

  for (const it of items) {
    if (!it.title || it.title.trim() === '') continue;
    const existingIdx = current.findIndex(
      (b) => b.id === it.id || (b.title.trim() === it.title.trim() && b.category === it.category)
    );
    if (existingIdx >= 0) {
      const merged = { ...current[existingIdx], ...it };
      current[existingIdx] = merged;
      toSync.push(merged);
    } else {
      const newItem = {
        ...it,
        id: it.id && !it.id.startsWith('bom-') ? it.id : `lib-bom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      current.push(newItem);
      toSync.push(newItem);
    }
  }

  saveLocalBomLibrary(current);
  dispatchBomUpdatedEvent(current);
  if (toSync.length > 0) {
    syncBomItemsToCloud(toSync);
  }
  return current;
}

// ==============================================================================
// Real-time Supabase Subscription
// ==============================================================================

/**
 * Subscribes to real-time changes in Supabase Cloud for Master Library tables.
 * Returns an cleanup unsubscribe function.
 */
export function initMasterLibraryRealtime(
  onTeamChange?: (items: TeamMember[]) => void,
  onProjectsChange?: (items: PastProject[]) => void,
  onBomChange?: (items: MasterBomItem[]) => void
): () => void {
  if (!isSupabaseConfigured() || !supabase) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel('master_library_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'master_team_library' },
        async () => {
          const fresh = await fetchMasterTeamLibraryFromCloud();
          if (onTeamChange) onTeamChange(fresh);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'master_projects_library' },
        async () => {
          const fresh = await fetchMasterProjectsLibraryFromCloud();
          if (onProjectsChange) onProjectsChange(fresh);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'master_bom_catalog' },
        async () => {
          const fresh = await fetchMasterBomLibraryFromCloud();
          if (onBomChange) onBomChange(fresh);
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error for master library:', err);
    return () => {};
  }
}
