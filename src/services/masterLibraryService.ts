import { TeamMember, PastProject } from '../types/proposal';
import { MASTER_TEAM_LIBRARY, MASTER_PROJECTS_LIBRARY } from '../data/defaultData';

const TEAM_LIBRARY_KEY = 'prime_master_team_library';
const PROJECTS_LIBRARY_KEY = 'prime_master_projects_library';

/**
 * Gets master team members from localStorage or falls back to default samples.
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
 * Saves master team members list to localStorage.
 */
export function saveMasterTeamLibrary(items: TeamMember[]): void {
  try {
    localStorage.setItem(TEAM_LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save team library to localStorage:', e);
  }
}

/**
 * Deletes a single team member from the master library.
 */
export function deleteMasterTeamMember(id: string): TeamMember[] {
  const current = getMasterTeamLibrary();
  const updated = current.filter((m) => m.id !== id);
  saveMasterTeamLibrary(updated);
  return updated;
}

/**
 * Clears all team members from the master library.
 */
export function clearAllMasterTeamMembers(): TeamMember[] {
  saveMasterTeamLibrary([]);
  return [];
}

/**
 * Resets master team members back to the initial default mock list.
 */
export function resetMasterTeamLibrary(): TeamMember[] {
  try {
    localStorage.removeItem(TEAM_LIBRARY_KEY);
  } catch (e) {
    console.error('Failed to reset team library:', e);
  }
  return [...MASTER_TEAM_LIBRARY];
}

/**
 * Gets master projects from localStorage or falls back to default samples.
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
 * Saves master projects list to localStorage.
 */
export function saveMasterProjectsLibrary(items: PastProject[]): void {
  try {
    localStorage.setItem(PROJECTS_LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save projects library to localStorage:', e);
  }
}

/**
 * Deletes a single project from the master library.
 */
export function deleteMasterProject(id: string): PastProject[] {
  const current = getMasterProjectsLibrary();
  const updated = current.filter((p) => p.id !== id);
  saveMasterProjectsLibrary(updated);
  return updated;
}

/**
 * Clears all projects from the master library.
 */
export function clearAllMasterProjects(): PastProject[] {
  saveMasterProjectsLibrary([]);
  return [];
}

/**
 * Saves or updates a single team member in the master library.
 */
export function saveMemberToMasterLibrary(member: TeamMember): TeamMember[] {
  const current = getMasterTeamLibrary();
  const existingIdx = current.findIndex((m) => m.id === member.id || m.name.trim() === member.name.trim());
  let updated: TeamMember[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...member, id: current[existingIdx].id };
  } else {
    updated = [...current, { ...member, id: `lib-team-${Date.now()}` }];
  }
  saveMasterTeamLibrary(updated);
  return updated;
}

/**
 * Saves multiple team members to the master library (upsert).
 */
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
  saveMasterTeamLibrary(current);
  return current;
}

/**
 * Resets master projects back to the initial default mock list.
 */
export function resetMasterProjectsLibrary(): PastProject[] {
  try {
    localStorage.removeItem(PROJECTS_LIBRARY_KEY);
  } catch (e) {
    console.error('Failed to reset projects library:', e);
  }
  return [...MASTER_PROJECTS_LIBRARY];
}

/**
 * Saves or updates a single project in the master library.
 */
export function saveProjectToMasterLibrary(project: PastProject): PastProject[] {
  const current = getMasterProjectsLibrary();
  const existingIdx = current.findIndex((p) => p.id === project.id || p.projectName.trim() === project.projectName.trim());
  let updated: PastProject[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...project, id: current[existingIdx].id };
  } else {
    updated = [...current, { ...project, id: `lib-proj-${Date.now()}` }];
  }
  saveMasterProjectsLibrary(updated);
  return updated;
}

/**
 * Saves multiple projects to the master library (upsert).
 */
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
  saveMasterProjectsLibrary(current);
  return current;
}
