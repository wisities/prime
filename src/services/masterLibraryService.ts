import { TeamMember, PastProject } from '../types/proposal';
import { MASTER_TEAM_LIBRARY, MASTER_PROJECTS_LIBRARY } from '../data/defaultData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const TEAM_LIBRARY_KEY = 'prime_master_team_library';
const PROJECTS_LIBRARY_KEY = 'prime_master_projects_library';

export const MASTER_TEAM_UPDATED_EVENT = 'prime_master_team_updated';
export const MASTER_PROJECTS_UPDATED_EVENT = 'prime_master_projects_updated';

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
// Real-time Supabase Subscription
// ==============================================================================

/**
 * Subscribes to real-time changes in Supabase Cloud for Master Library tables.
 * Returns an cleanup unsubscribe function.
 */
export function initMasterLibraryRealtime(
  onTeamChange?: (items: TeamMember[]) => void,
  onProjectsChange?: (items: PastProject[]) => void
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
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error for master library:', err);
    return () => {};
  }
}
