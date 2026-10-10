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
