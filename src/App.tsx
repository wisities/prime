import React, { useState, useEffect, useRef } from 'react';
import { ProposalData, BiddingProject, ProposalStatus } from './types/proposal';
import { INITIAL_PROPOSAL_DATA, createDefaultBlankProject } from './data/defaultData';
import { exportProposalToDocx } from './services/docxExport';
import { exportProjectPackage, importProjectPackage } from './services/projectPackageService';
import { runRuleBasedAudit } from './services/proposalAuditor';

import { ProjectDashboard, computeProjectCompletion } from './components/ProjectDashboard';
import { CoverEditor } from './components/CoverEditor';
import { Section1Editor } from './components/Section1Editor';
import { Section2Editor } from './components/Section2Editor';
import { Section3Editor } from './components/Section3Editor';
import { Section4Editor } from './components/Section4Editor';
import { Section5Editor } from './components/Section5Editor';
import { AuditModal } from './components/AuditModal';
import { LiveDocxPreviewModal } from './components/LiveDocxPreviewModal';
import { DocumentStructureModal } from './components/DocumentStructureModal';
import { BomExportModal } from './components/BomExportModal';
import { TorImportModal } from './components/TorImportModal';
import { ExportDocxModal } from './components/ExportDocxModal';
import { LoginPage } from './components/LoginPage';
import { AccessDeniedPage } from './components/AccessDeniedPage';
import { UserManagementModal } from './components/UserManagementModal';
import { GeminiSettingsModal } from './components/GeminiSettingsModal';
import { MasterLibraryManagementModal } from './components/MasterLibraryManagementModal';
import { DraftHistoryModal } from './components/DraftHistoryModal';
import { GoogleSyncModal } from './components/GoogleSyncModal';
import { isGeminiAvailable } from './services/geminiService';
import { checkEmailPermission, signOut } from './services/authService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { User } from '@supabase/supabase-js';

import {
  FileText,
  BookMarked,
  CalendarRange,
  Layers,
  Users,
  Building2,
  FileDown,
  ShieldCheck,
  Eye,
  Save,
  Upload,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle,
  FileUp,
  LayoutDashboard,
  ArrowLeft,
  ExternalLink,
  Calendar,
  Clock,
  LogOut,
  SlidersHorizontal,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Library,
  History,
  CloudUpload,
} from 'lucide-react';

import { loadAllProjects, saveProject, normalizeProjectBudget } from './services/projectStorageService';
import { saveDraftSnapshot, purgeBloatedHistoricalSnapshots } from './services/localDatabase';

const PROJECTS_STORAGE_KEY = 'prime_bidding_projects_v2';

function loadInitialProjects(): BiddingProject[] {
  try {
    let list: BiddingProject[] = [];
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed.map(normalizeProjectBudget);
      }
    }

    // สแกนหาร่างเฉพาะโครงการ prime_active_draft_* ทุกคีย์ใน LocalStorage เพื่อกู้คืนโครงการทั้งหมด
    const projectMap = new Map<string, BiddingProject>(list.map((p) => [p.id, p]));
    for (let k = 0; k < localStorage.length; k++) {
      const key = localStorage.key(k);
      if (key && key.startsWith('prime_active_draft_')) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsedProj = JSON.parse(raw);
            if (parsedProj && parsedProj.id && parsedProj.proposalData) {
              const existing = projectMap.get(parsedProj.id);
              if (existing) {
                const singleTime = new Date(parsedProj.updatedAt || 0).getTime();
                const existTime = new Date(existing.updatedAt || 0).getTime();
                if (singleTime >= existTime) {
                  projectMap.set(parsedProj.id, normalizeProjectBudget({ ...existing, ...parsedProj }));
                }
              } else {
                projectMap.set(parsedProj.id, normalizeProjectBudget(parsedProj));
              }
            }
          }
        } catch {}
      }
    }

    const sampleIds = ['proj-001', 'proj-002', 'proj-003'];
    sampleIds.forEach((id) => projectMap.delete(id));
    const merged = Array.from(projectMap.values()).filter((p) => !sampleIds.includes(p.id));
    if (merged.length > 0) return merged;
  } catch (e) {
    console.warn('Could not read projects from localStorage', e);
  }
  return [];
}

export const App: React.FC = () => {
  // Navigation View: Default to 'dashboard' as requested by the user
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');

  // Cloud sync status
  const [cloudStatus, setCloudStatus] = useState<'cloud' | 'local'>('local');

  // Multi-project State
  const [projects, setProjects] = useState<BiddingProject[]>(loadInitialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      return localStorage.getItem('prime_last_active_project_id') || '';
    } catch {
      return '';
    }
  });

  // Authentication & Access Control State (Option 2: โหมดเข้าสู่ระบบโดยตรง Auto-Authorized สำหรับทุกคนในทีม)
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'unauthorized' | 'authorized'>('authorized');
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'prime-team-user',
    email: 'team@primeconsultant.com',
    app_metadata: {},
    user_metadata: { name: 'ทีมงานไพร์มดิจิทัล' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as any);
  const [showUserMgmtModal, setShowUserMgmtModal] = useState<boolean>(false);
  const [showMasterLibraryModal, setShowMasterLibraryModal] = useState<boolean>(false);
  const [showDraftHistoryModal, setShowDraftHistoryModal] = useState<boolean>(false);

  // ล้างข้อความ Error หรือพารามิเตอร์แปลกปลอมจาก URL อัตโนมัติ (เช่น ค้างมาจาก Google OAuth Callback)
  useEffect(() => {
    try {
      if (
        window.location.search.includes('error') ||
        window.location.hash.includes('error') ||
        window.location.search.includes('sb=')
      ) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {}
  }, []);

  // กวาดล้าง Snapshots ข้อมูลเก่าที่สะสมใน IndexedDB อัตโนมัติ ป้องกันปัญหา Out of Memory
  useEffect(() => {
    purgeBloatedHistoricalSnapshots();
  }, []);

  // ดึงเซสชันเสริม (หากมีผู้ใช้ที่เคยล็อกอิน Google สำเร็จ ก็จะนำชื่อ/อีเมลมาแสดงผล แต่หากไม่มีก็จะเข้าใช้งานระบบได้ทันที)
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (!isSupabaseConfigured() || !supabase) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setCurrentUser(session.user);
        }
      } catch (err) {
        console.warn('Optional auth check warning:', err);
      }
    };

    verifySession();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user && isMounted) {
          setCurrentUser(session.user);
        }
      });

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser({
      id: 'prime-team-user',
      email: 'team@primeconsultant.com',
      app_metadata: {},
      user_metadata: { name: 'ทีมงานไพร์มดิจิทัล' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as any);
  };

  // Load from Supabase Cloud or LocalStorage on mount
  useEffect(() => {
    if (authStatus !== 'authorized') return;
    loadAllProjects().then(({ projects: loaded, source }) => {
      setProjects(loaded);
      setCloudStatus(source);
      if (loaded.length > 0) {
        let lastId = '';
        try {
          lastId = localStorage.getItem('prime_last_active_project_id') || '';
        } catch {}

        const nextId = (lastId && loaded.some((p) => p.id === lastId))
          ? lastId
          : ((activeProjectId && loaded.some((p) => p.id === activeProjectId))
            ? activeProjectId
            : loaded[0].id);

        setActiveProjectId(nextId);
        const target = loaded.find((p) => p.id === nextId) || loaded[0];
        if (target && target.proposalData) {
          const normalized = normalizeProjectBudget(target);
          setProposal(normalized.proposalData);
        }
      }
    });
  }, [authStatus]);

  // Current active project (guaranteed to be fully sanitized and hydrated)
  const currentProject = normalizeProjectBudget(
    projects.find((p) => p.id === activeProjectId) || projects[0] || createDefaultBlankProject()
  );

  // Proposal Data State for the currently selected project
  const [proposal, setProposal] = useState<ProposalData>(() => {
    return normalizeProjectBudget(currentProject).proposalData;
  });

  // Ref for debounced auto-save to cloud & indexedDB
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // When switching projects, load that project's proposalData with budget normalization and remember active project
  useEffect(() => {
    if (activeProjectId) {
      try {
        localStorage.setItem('prime_last_active_project_id', activeProjectId);
      } catch {}
    }

    const target = projects.find((p) => p.id === activeProjectId);
    if (target && target.proposalData) {
      const normalized = normalizeProjectBudget(target);
      setProposal(normalized.proposalData);
    }
  }, [activeProjectId]);

  // ซิงค์ฉบับร่างล่าสุดที่ค้างอยู่ลง LocalStorage เมื่อผู้ใช้ปิดหรือรีเฟรชหน้าต่าง
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (autoSaveTimeoutRef.current && currentProject) {
        clearTimeout(autoSaveTimeoutRef.current);
        try {
          const draftToFlush = { ...currentProject, proposalData: proposal, updatedAt: new Date().toISOString() };
          localStorage.setItem(`prime_active_draft_${draftToFlush.id}`, JSON.stringify(draftToFlush));
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentProject, proposal]);

  // ฟังก์ชันบันทึกและประมวลผลความคืบหน้า (ทำงานแบบ Debounce นอก State Setter เพื่อไม่ให้หน่วยความจำบวม)
  const syncActiveProposalToStorage = (proposalToSync: ProposalData) => {
    if (!activeProjectId) return;
    const target = projects.find((p) => p.id === activeProjectId);
    if (!target) return;

    const effectiveBudget = proposalToSync.section1?.budgetAmount || target.budgetAmount || 0;
    const comp = computeProjectCompletion({ ...target, proposalData: proposalToSync });
    const stage = comp.overallPercent === 100
      ? 'เนื้อหาครบถ้วน 100%'
      : comp.totalTorClauses > 0
      ? `TOR (${comp.completedTorClauses}/${comp.totalTorClauses}), บุคลากร (${comp.teamComplete}/${comp.teamTotal})`
      : 'เริ่มต้นร่างโครงการ';

    const updated = normalizeProjectBudget({
      ...target,
      proposalData: proposalToSync,
      projectTitle: proposalToSync.cover?.projectTitle || target.projectTitle,
      projectCode: proposalToSync.cover?.projectCode || target.projectCode,
      clientAgency: proposalToSync.cover?.clientAgency || target.clientAgency,
      budgetAmount: proposalToSync.section1?.budgetAmount || target.budgetAmount || effectiveBudget,
      lastModifiedBy: currentUser?.email || target.lastModifiedBy || 'ผู้จัดทำในระบบ',
      progressPercent: comp.overallPercent,
      currentStage: stage,
      updatedAt: new Date().toISOString(),
    });

    setProjects((prevProjects) => prevProjects.map((p) => (p.id === activeProjectId ? updated : p)));

    try {
      localStorage.setItem(`prime_active_draft_${updated.id}`, JSON.stringify(updated));
    } catch {}

    saveProject(updated);
  };

  // เมื่อแก้ไขข้อความใน Editor: อัปเดต State หน้าจอทันที 0ms เพื่อความลื่นไหลสูงสุด และหน่วงเวลาเซฟลงดิสก์ 1,200ms
  const updateProposalAndProject = (updater: (prev: ProposalData) => ProposalData) => {
    setProposal((prev) => {
      const nextProposal = updater(prev);
      const effectiveBudget = nextProposal.section1?.budgetAmount || currentProject?.budgetAmount || 0;
      if (nextProposal.section1 && (!nextProposal.section1.budgetAmount || nextProposal.section1.budgetAmount === 0) && effectiveBudget > 0) {
        nextProposal.section1.budgetAmount = effectiveBudget;
      }
      if (nextProposal.cover && (!nextProposal.cover.budgetFormatted || nextProposal.cover.budgetFormatted.trim() === '' || nextProposal.cover.budgetFormatted === '0 บาท') && effectiveBudget > 0) {
        nextProposal.cover.budgetFormatted = `${effectiveBudget.toLocaleString()} บาท`;
      }

      // หน่วงเวลาการประมวลผลหนัก (คำนวณความคืบหน้า, JSON.stringify, เซฟ LocalStorage & IndexedDB) 1,200ms
      // เพื่อให้แป้นพิมพ์ตอบสนองได้ทันที 0ms ปราศจากอาการหน่วง/กระตุก
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        syncActiveProposalToStorage(nextProposal);
      }, 1200);

      return nextProposal;
    });
  };

  // Save projects to cloud & local
  const handleUpdateProjects = (updatedProjects: BiddingProject[]) => {
    const normalizedList = updatedProjects.map(normalizeProjectBudget);
    setProjects(normalizedList);
    const active = normalizedList.find((p) => p.id === activeProjectId);
    if (active && active.proposalData) {
      setProposal(active.proposalData);
    } else if (normalizedList.length > 0) {
      setActiveProjectId(normalizedList[0].id);
      if (normalizedList[0].proposalData) {
        setProposal(normalizedList[0].proposalData);
      }
    }
    try {
      const sanitized = normalizedList.map((p) => ({
        ...p,
        attachments: (p.attachments || []).map((a) => ({
          ...a,
          dataUrl: a.dataUrl && a.dataUrl.length < 30000 ? a.dataUrl : undefined,
        })),
      }));
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
    const prevMap = new Map(projects.map((p) => [p.id, p]));
    const changed = normalizedList.filter((p) => {
      const prev = prevMap.get(p.id);
      return !prev || prev.updatedAt !== p.updatedAt;
    });
    changed.forEach((p) => saveProject(p));
  };

  // Save Draft state & Feedback
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [draftToast, setDraftToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleManualSaveDraft = async (showToast: boolean = true): Promise<boolean> => {
    if (!currentProject) return false;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    setIsSavingDraft(true);
    try {
      const effectiveBudget = proposal.section1?.budgetAmount || currentProject.budgetAmount || 0;
      const comp = computeProjectCompletion({ ...currentProject, proposalData: proposal });
      const stage = comp.overallPercent === 100
        ? 'เนื้อหาครบถ้วน 100%'
        : comp.totalTorClauses > 0
        ? `TOR (${comp.completedTorClauses}/${comp.totalTorClauses}), บุคลากร (${comp.teamComplete}/${comp.teamTotal})`
        : 'เริ่มต้นร่างโครงการ';

      const updatedProject = normalizeProjectBudget({
        ...currentProject,
        proposalData: proposal,
        projectTitle: proposal.cover.projectTitle || currentProject.projectTitle,
        projectCode: proposal.cover.projectCode || currentProject.projectCode,
        clientAgency: proposal.cover.clientAgency || currentProject.clientAgency,
        budgetAmount: proposal.section1?.budgetAmount || currentProject.budgetAmount || effectiveBudget,
        lastModifiedBy: currentUser?.email || currentProject.lastModifiedBy || 'ผู้จัดทำในระบบ',
        progressPercent: comp.overallPercent,
        currentStage: stage,
        updatedAt: new Date().toISOString(),
      });

      // Update local projects list
      setProjects((prev) => prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)));

      // Persist to LocalStorage, IndexedDB and Supabase Cloud
      const ok = await saveProject(updatedProject);

      // บันทึก Snapshot สำรองประวัติร่างลงใน IndexedDB เพื่อการันตีกู้คืนได้เสมอ
      await saveDraftSnapshot(
        updatedProject.id,
        updatedProject.projectTitle,
        updatedProject.projectCode,
        updatedProject.proposalData,
        'manual'
      );

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLastSavedTime(timeStr);

      if (showToast) {
        setDraftToast({
          message: `✓ บันทึกร่างโครงการ "${updatedProject.projectTitle || updatedProject.projectCode}" ลงฐานข้อมูล (IndexedDB & Cloud) สำเร็จ (${timeStr} น.)`,
          type: 'success',
        });
        setTimeout(() => setDraftToast(null), 3800);
      }
      return ok;
    } catch (err: any) {
      console.error('Failed to save draft:', err);
      if (showToast) {
        setDraftToast({
          message: `เกิดข้อผิดพลาดในการบันทึกร่าง: ${err?.message || 'Network error'}`,
          type: 'error',
        });
        setTimeout(() => setDraftToast(null), 4000);
      }
      return false;
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleRestoreDraft = (restoredProposalData: ProposalData, snapshotTime: string) => {
    updateProposalAndProject(() => restoredProposalData);
    setDraftToast({
      message: `✓ กู้คืนเนื้อหาร่างจากประวัติ "${snapshotTime}" สำเร็จเรียบร้อย`,
      type: 'success',
    });
    setTimeout(() => setDraftToast(null), 3500);
  };

  const handleBackToDashboard = async () => {
    setIsSavingDraft(true);
    try {
      await handleManualSaveDraft(false);
      setDraftToast({
        message: '✓ บันทึกร่างโครงการล่าสุดเรียบร้อยแล้ว ข้อมูลปลอดภัย 100%',
        type: 'success',
      });
      setTimeout(() => setDraftToast(null), 3500);
    } catch (err) {
      console.warn('Auto-save before exit error:', err);
    } finally {
      setIsSavingDraft(false);
      setCurrentView('dashboard');
    }
  };

  // Editor Tabs
  const [activeTab, setActiveTab] = useState<
    'cover' | 'section1' | 'section2' | 'section3' | 'section4' | 'section5'
  >('cover');

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTorImportModal, setShowTorImportModal] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [showBomModal, setShowBomModal] = useState(false);
  const [showGeminiModal, setShowGeminiModal] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(isGeminiAvailable());
  const [activeTorAttachmentId, setActiveTorAttachmentId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDocxModal, setShowExportDocxModal] = useState(false);
  const [showGoogleSyncModal, setShowGoogleSyncModal] = useState(false);
  const [isExportingPrimePackage, setIsExportingPrimePackage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportTorScopes = (items: any[]) => {
    updateProposalAndProject((prev) => ({
      ...prev,
      section1: {
        ...prev.section1,
        scopeItems: items,
      },
    }));
    setActiveTorAttachmentId(null);
  };

  // Real-time error/warning count for badge
  const auditIssues = runRuleBasedAudit(proposal);
  const auditBadgeCount = auditIssues.length;

  const handleExportDocx = async () => {
    const hasCerts = (proposal.section5?.pastProjects || []).some(
      (p) => p.isSelected && !!p.certificateFileUrl
    );
    if (hasCerts) {
      setShowExportDocxModal(true);
    } else {
      try {
        setIsExporting(true);
        await exportProposalToDocx(proposal);
      } catch (error) {
        console.error('Export docx error', error);
        alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Word โปรดตรวจสอบความสมบูรณ์ของข้อมูล');
      } finally {
        setIsExporting(false);
      }
    }
  };

  const handleExportPrimePackage = async () => {
    try {
      setIsExportingPrimePackage(true);
      const targetProj: BiddingProject = currentProject
        ? { ...currentProject, proposalData: proposal }
        : {
            ...createDefaultBlankProject(),
            proposalData: proposal,
            projectTitle: proposal.cover.projectTitle || 'ข้อเสนอโครงการ',
            projectCode: proposal.cover.projectCode || 'Draft',
          };
      await exportProjectPackage(targetProj);
    } catch (err: any) {
      console.error('Prime export error:', err);
      alert('เกิดข้อผิดพลาดในการส่งออกแพ็กเกจโครงการ: ' + (err?.message || ''));
    } finally {
      setIsExportingPrimePackage(false);
    }
  };

  const handleResetProjectsToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตโครงการทั้งหมดใช่หรือไม่? โครงการตัวอย่างจะถูกล้างออกและเริ่มต้นใหม่แบบว่างเปล่า')) {
      const blank = createDefaultBlankProject();
      setProjects([blank]);
      setActiveProjectId(blank.id);
      setProposal(blank.proposalData);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([blank]));
    }
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(proposal, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prime_Proposal_${proposal.cover.projectCode || 'Draft'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.prime')) {
      try {
        const importedProj = await importProjectPackage(file);
        if (importedProj.proposalData) {
          updateProposalAndProject(() => importedProj.proposalData);
          alert(`✓ นำเข้าแพ็กเกจโครงการ "${importedProj.projectTitle}" พร้อมไฟล์แนบและสัญญาเรียบร้อยแล้ว!`);
        }
      } catch (err: any) {
        console.error('Import .prime error:', err);
        alert('เกิดข้อผิดพลาดในการนำเข้าไฟล์ .prime: ' + (err?.message || 'ไฟล์ชำรุด'));
      }
      if (e.target) e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.cover && parsed.section1 && parsed.section3) {
          updateProposalAndProject(() => parsed);
          alert('นำเข้าข้อมูลโครงการเรียบร้อยแล้ว');
        } else if (parsed.proposalData) {
          updateProposalAndProject(() => parsed.proposalData);
          alert('นำเข้าข้อมูลโครงการเรียบร้อยแล้ว');
        } else {
          alert('ไฟล์ JSON ไม่ตรงกับรูปแบบข้อมูลข้อเสนอโครงการ');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleSelectProjectFromDashboard = (projectId: string) => {
    setActiveProjectId(projectId);
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      setProposal(target.proposalData);
    }
    setCurrentView('editor');
  };

  const handleOpenTorImporterForProject = (projectId: string, attachmentId?: string) => {
    setActiveProjectId(projectId);
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      setProposal(target.proposalData);
    }
    setActiveTorAttachmentId(attachmentId || null);
    setCurrentView('editor');
    setShowTorImportModal(true);
  };

  // Render Auth Gates
  if (authStatus === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F2744',
          color: '#FFFFFF',
          fontFamily: "'Prompt', 'Sarabun', sans-serif",
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            border: '3px solid rgba(255, 255, 255, 0.2)',
            borderTopColor: '#F1B844',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ marginTop: '1.25rem', fontSize: '0.95rem', color: '#CBD5E1' }}>
          กำลังตรวจสอบสิทธิ์เข้าใช้งานระบบ...
        </p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return (
      <LoginPage
        isSupabaseReady={isSupabaseConfigured()}
        onBypassOffline={() => {
          try {
            localStorage.setItem('prime_offline_bypass', 'true');
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch {}
          setCurrentUser({
            id: 'offline-admin',
            email: 'admin@primeconsultant.com',
            app_metadata: {},
            user_metadata: { name: 'ผู้ใช้งานระบบ (โหมดฉุกเฉิน)' },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as any);
          setAuthStatus('authorized');
        }}
      />
    );
  }

  if (authStatus === 'unauthorized') {
    return <AccessDeniedPage userEmail={currentUser?.email || ''} onSignOut={handleSignOut} />;
  }

  return (
    <div>
      {/* Draft Save Toast Notification */}
      {draftToast && (
        <div
          style={{
            position: 'fixed',
            top: '1.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            backgroundColor: draftToast.type === 'success' ? '#065F46' : '#991B1B',
            color: '#FFFFFF',
            padding: '0.65rem 1.25rem',
            borderRadius: '30px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            fontSize: '0.875rem',
            fontWeight: 600,
            pointerEvents: 'none',
          }}
        >
          {draftToast.type === 'success' ? <CheckCircle2 size={18} color="#34D399" /> : <AlertCircle size={18} color="#F87171" />}
          <span>{draftToast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-section">
            <div
              className="brand-logo-badge"
              onClick={currentView === 'editor' ? handleBackToDashboard : () => setCurrentView('dashboard')}
              style={{ cursor: 'pointer' }}
              title="กลับสู่หน้าแรก Dashboard"
            >
              PDC
            </div>
            <div className="brand-title-group">
              <h1
                onClick={currentView === 'editor' ? handleBackToDashboard : () => setCurrentView('dashboard')}
                style={{ cursor: 'pointer' }}
              >
                ระบบจัดทำข้อเสนอโครงการภาครัฐ | บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด
              </h1>
              <p>Government Project Proposal Management System & Thai Sarabun Word Exporter</p>
            </div>

            {currentView === 'editor' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginLeft: '0.85rem' }}>
                <button
                  type="button"
                  className="btn-back-dashboard"
                  onClick={handleBackToDashboard}
                  disabled={isSavingDraft}
                  title="บันทึกร่างและกลับสู่หน้า Dashboard ภาพรวมโครงการ"
                >
                  <ArrowLeft size={15} />
                  <span>{isSavingDraft ? 'กำลังบันทึกร่าง...' : 'กลับหน้า Dashboard'}</span>
                </button>

                <button
                  type="button"
                  className="btn-save-draft"
                  onClick={() => handleManualSaveDraft(true)}
                  disabled={isSavingDraft}
                  title="บันทึกร่างโครงการลงฐานข้อมูลทันที เพื่อป้องกันข้อมูลสูญหาย"
                >
                  {isSavingDraft ? (
                    <>
                      <Loader2 size={15} className="spinner-icon" />
                      <span>กำลังบันทึกร่าง...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>บันทึกร่าง</span>
                      {lastSavedTime && (
                        <span style={{ fontSize: '0.72rem', opacity: 0.9, marginLeft: '2px', fontWeight: 400 }}>
                          ({lastSavedTime} น.)
                        </span>
                      )}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDraftHistoryModal(true)}
                  style={{
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.785rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: 'rgba(245, 158, 11, 0.25)',
                    borderColor: 'rgba(245, 158, 11, 0.45)',
                    color: '#FEF3C7',
                    fontWeight: 600,
                  }}
                  title="ดูประวัติการบันทึกร่างย้อนหลัง และกู้คืนข้อมูลได้ตลอดเวลา (ปลอดภัย 100%)"
                >
                  <History size={14} color="#FBBF24" />
                  <span>ประวัติร่าง (กู้คืน)</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-back-dashboard"
                onClick={() => {
                  const target = projects.find((p) => p.id === activeProjectId) || projects[0];
                  if (target && target.proposalData) {
                    setProposal(normalizeProjectBudget(target).proposalData);
                  }
                  setCurrentView('editor');
                }}
                title="เปิดเครื่องมือจัดทำข้อเสนอโครงการ"
                style={{ marginLeft: '0.85rem', background: 'rgba(217, 119, 6, 0.25)', borderColor: 'rgba(217, 119, 6, 0.4)' }}
              >
                <FileText size={15} />
                <span>เข้าสู่ตัวจัดทำข้อเสนอ</span>
              </button>
            )}
          </div>

          <div className="header-actions">

            {/* Hidden JSON / Prime package file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".prime,.json"
              style={{ display: 'none' }}
              onChange={handleImportProjectFile}
            />

            {currentView === 'editor' && (
              <>
                <button
                  type="button"
                  onClick={handleExportPrimePackage}
                  disabled={isExportingPrimePackage}
                  className="btn btn-secondary"
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    borderColor: '#BFDBFE',
                    fontWeight: 600,
                  }}
                  title="ส่งออกแพ็กเกจโครงการฉบับสมบูรณ์ (.prime) รวมสัญญา ไฟล์แนบ และรูปภาพ สำหรับส่งต่อให้เพื่อนร่วมงานทำงานต่อได้ทันที"
                >
                  <Download size={15} />
                  <span>{isExportingPrimePackage ? 'กำลังส่งออก...' : '📦 ส่งต่อโครงการ (.prime)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  title="เปิดไฟล์แพ็กเกจโครงการ (.prime) หรือไฟล์ร่าง (.json) ที่เคยบันทึกไว้"
                >
                  <Upload size={15} /> นำเข้า (.prime / .json)
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="btn btn-secondary"
                  title="บันทึกข้อมูลโครงการนี้เป็นไฟล์ JSON เพื่อนำกลับมาใช้ใหม่"
                >
                  <Save size={15} /> สำรอง JSON
                </button>

                {/* TOR Document Importer */}
                <button
                  type="button"
                  onClick={() => setShowTorImportModal(true)}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    borderColor: '#FDE68A',
                    fontWeight: 600,
                  }}
                  title="นำเข้าเอกสาร TOR (.docx / .pdf) เพื่อแยกขอบเขตงานและเติมลงระบบอัตโนมัติ"
                >
                  <FileUp size={15} /> นำเข้า TOR (Word/PDF)
                </button>

                {/* Document Structure Button */}
                <button
                  type="button"
                  onClick={() => setShowStructureModal(true)}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#F0FDF4',
                    color: '#166534',
                    borderColor: '#BBF7D0',
                    fontWeight: 600,
                  }}
                  title="เปิด/ปิดหัวข้อที่ไม่ได้ใช้ หรือจัดลำดับหัวข้อในเอกสาร Word (Document Structure)"
                >
                  <SlidersHorizontal size={15} /> โครงสร้างหัวข้อ
                </button>

                {/* BOM Export Button */}
                <button
                  type="button"
                  onClick={() => setShowBomModal(true)}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    borderColor: '#86EFAC',
                    fontWeight: 600,
                  }}
                  title="ถอดแบบปริมาณงานและราคาค่าใช้จ่าย (BOM) และส่งออกเป็นไฟล์ Excel (.xlsx)"
                >
                  <FileSpreadsheet size={15} /> ถอดแบบ BOM (Excel)
                </button>

                {/* Audit Button */}
                <button
                  type="button"
                  onClick={() => setShowAuditModal(true)}
                  className="btn btn-audit"
                  title="ตรวจสอบความสอดคล้องของระยะเวลา ตัวเลขงวดงาน และตรวจคำผิดภาษาไทย"
                >
                  <ShieldCheck size={16} />
                  <span>ตรวจความสอดคล้อง & คำผิด</span>
                  {auditBadgeCount > 0 && <span className="badge-count">{auditBadgeCount}</span>}
                </button>

                {/* Live Preview Button */}
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="btn btn-outline"
                  style={{ backgroundColor: 'white', color: 'var(--primary-800)', borderColor: 'white' }}
                >
                  <Eye size={16} /> ดูตัวอย่าง
                </button>

                {/* Save Draft Button (Local-First 0s) */}
                <button
                  type="button"
                  onClick={() => handleManualSaveDraft(true)}
                  disabled={isSavingDraft}
                  className="btn btn-outline"
                  style={{ backgroundColor: 'white', color: '#1E293B', borderColor: '#E2E8F0', fontWeight: 600 }}
                  title="บันทึกข้อมูลฉบับร่างลงในฐานข้อมูลเครื่อง (IndexedDB) ทันที รวดเร็ว ปลอดภัย"
                >
                  <Save size={16} />
                  <span>{isSavingDraft ? 'กำลังบันทึก...' : 'บันทึกร่าง'}</span>
                </button>

                {/* Save & Sync to Google Drive/Sheets CTA */}
                <button
                  type="button"
                  onClick={async () => {
                    await handleManualSaveDraft(false);
                    setShowGoogleSyncModal(true);
                  }}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                  }}
                  title="บันทึกข้อมูลลงฐานข้อมูลและซิงค์ทั้งเล่มพร้อมไฟล์แนบขึ้น Google Drive & Sheets ในคลิกเดียว"
                >
                  <CloudUpload size={16} color="#FFFFFF" />
                  <span>บันทึก & ซิงค์ Google</span>
                </button>

                {/* Word Export Primary CTA */}
                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={isExporting}
                  className="btn btn-primary"
                >
                  <FileDown size={17} />
                  <span>{isExporting ? 'กำลังสร้างเอกสาร...' : 'ดาวน์โหลด Word (.docx)'}</span>
                </button>
              </>
            )}

            {/* Google Drive & Sheets Sync CTA - Visible on Dashboard */}
            {currentView !== 'editor' && (
              <button
                type="button"
                onClick={() => setShowGoogleSyncModal(true)}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8',
                  borderColor: '#BFDBFE',
                  fontWeight: 700,
                }}
                title="บันทึกข้อมูลลง Google Sheet และอัปโหลดไฟล์สัญญา/TOR ทั้งหมดขึ้น Google Drive"
              >
                <CloudUpload size={16} color="#2563EB" />
                <span>ซิงค์ Google Drive & Sheets</span>
              </button>
            )}

            {/* Gemini AI Settings Button */}
            <button
              type="button"
              onClick={() => setShowGeminiModal(true)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: hasGeminiKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                borderColor: hasGeminiKey ? 'rgba(52, 211, 153, 0.5)' : 'rgba(255, 255, 255, 0.3)',
              }}
              title={hasGeminiKey ? 'Gemini AI: เชื่อมต่อแล้ว (คลิกเพื่อดูหรือเปลี่ยนคีย์)' : 'ตั้งค่า Google Gemini API Key'}
            >
              <Sparkles size={15} color={hasGeminiKey ? '#34D399' : '#FFFFFF'} />
              <span>AI Gemini</span>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: hasGeminiKey ? '#10B981' : '#9CA3AF',
                }}
              />
            </button>

            {/* Master Libraries Modal Button */}
            <button
              type="button"
              onClick={() => setShowMasterLibraryModal(true)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(99, 102, 241, 0.25)',
                color: '#EEF2FF',
                borderColor: 'rgba(129, 140, 248, 0.5)',
                fontWeight: 600,
              }}
              title="เปิดคลังข้อมูลกลาง: จัดการผลงานโครงการ บุคลากร และข้อมูลบริษัท"
            >
              <Library size={15} color="#A5B4FC" />
              <span>คลังข้อมูลกลาง</span>
            </button>

            {/* User Access Control / Whitelist Button */}
            <button
              type="button"
              onClick={() => setShowUserMgmtModal(true)}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
              title="จัดการรายชื่อ Gmail ที่ได้รับสิทธิ์เข้าใช้งานระบบ"
            >
              <Users size={15} />
              <span>จัดการสิทธิ์</span>
            </button>

            {/* Current User Pill & Logout */}
            {currentUser && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  paddingLeft: '0.65rem',
                  borderLeft: '1px solid rgba(255, 255, 255, 0.25)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.785rem',
                    color: 'rgba(255, 255, 255, 0.95)',
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '20px',
                  }}
                  title={`เข้าสู่ระบบด้วย: ${currentUser.email}`}
                >
                  <div
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                    }}
                  />
                  <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser.email}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  title="ออกจากระบบ"
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#FECACA',
                    borderRadius: '6px',
                    padding: '0.35rem 0.6rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  <LogOut size={13} />
                  <span>ออก</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Embedded Sticky Tabs Navigation for Proposal Editor */}
        {currentView === 'editor' && (
          <nav className="tabs-nav-bar" aria-label="แถบหัวข้อข้อเสนอโครงการ">
            <div className="tabs-container">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'cover' ? 'active' : ''}`}
                onClick={() => setActiveTab('cover')}
              >
                <FileText size={17} />
                <span>หน้าปก & สารบัญ</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === 'section1' ? 'active' : ''}`}
                onClick={() => setActiveTab('section1')}
              >
                <BookMarked size={17} />
                <span>ส่วนที่ 1: บทนำและภาพรวม</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === 'section2' ? 'active' : ''}`}
                onClick={() => setActiveTab('section2')}
              >
                <CalendarRange size={17} />
                <span>ส่วนที่ 2: แผนงาน (Gantt Chart)</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === 'section3' ? 'active' : ''}`}
                onClick={() => setActiveTab('section3')}
              >
                <Layers size={17} />
                <span>ส่วนที่ 3: วิธีการดำเนินงาน & ตอบ TOR</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === 'section4' ? 'active' : ''}`}
                onClick={() => setActiveTab('section4')}
              >
                <Users size={17} />
                <span>ส่วนที่ 4: คณะทำงาน & ความเสี่ยง</span>
              </button>

              <button
                type="button"
                className={`tab-btn ${activeTab === 'section5' ? 'active' : ''}`}
                onClick={() => setActiveTab('section5')}
              >
                <Building2 size={17} />
                <span>ส่วนที่ 5: ผลงาน & ประสบการณ์</span>
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* DASHBOARD VIEW */}
      {currentView === 'dashboard' ? (
        <ProjectDashboard
          projects={projects}
          cloudStatus={cloudStatus}
          currentUserEmail={currentUser?.email}
          onSelectProject={handleSelectProjectFromDashboard}
          onUpdateProjects={handleUpdateProjects}
          onOpenTorImporterForProject={handleOpenTorImporterForProject}
          onResetProjectsToDefault={handleResetProjectsToDefault}
          onOpenUserManagement={() => setShowUserMgmtModal(true)}
          onOpenMasterLibraries={() => setShowMasterLibraryModal(true)}
        />
      ) : (
        /* PROPOSAL EDITOR VIEW */
        <div>
          {/* Main Content Area */}
          <main className="main-wrapper">
            {/* Project Mini Summary Banner with Status and e-GP Link */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--slate-200)',
                borderRadius: '10px',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: 'var(--shadow-sm)',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  disabled={isSavingDraft}
                  className="btn btn-secondary"
                  style={{ padding: '0.28rem 0.65rem', fontSize: '0.785rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="บันทึกร่างและกลับสู่ Dashboard"
                >
                  <ArrowLeft size={13} /> {isSavingDraft ? 'กำลังบันทึก...' : 'Dashboard'}
                </button>

                <button
                  type="button"
                  onClick={() => handleManualSaveDraft(true)}
                  disabled={isSavingDraft}
                  className="btn btn-primary"
                  style={{
                    padding: '0.28rem 0.75rem',
                    fontSize: '0.785rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontWeight: 600,
                  }}
                  title="บันทึกร่างโครงการลงฐานข้อมูลทันที"
                >
                  {isSavingDraft ? (
                    <>
                      <Loader2 size={13} className="spinner-icon" />
                      <span>กำลังบันทึกร่าง...</span>
                    </>
                  ) : (
                    <>
                      <Save size={13} />
                      <span>บันทึกร่าง</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDraftHistoryModal(true)}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.28rem 0.65rem',
                    fontSize: '0.785rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#92400E',
                    backgroundColor: '#FEF3C7',
                    borderColor: '#FDE68A',
                    fontWeight: 600,
                  }}
                  title="ดูประวัติการบันทึกร่างย้อนหลัง และกู้คืนข้อมูลได้ตลอดเวลา (ปลอดภัย 100%)"
                >
                  <History size={13} /> ประวัติร่าง
                </button>

                <span
                  style={{
                    backgroundColor: 'var(--primary-100)',
                    color: 'var(--primary-800)',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {currentProject.projectCode || proposal.cover.projectCode || 'ร่างข้อเสนอ'}
                </span>

                <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.975rem' }}>
                  {proposal.cover.projectTitle}
                </div>

                {/* Status Badge */}
                <span
                  className={`status-select-badge status-${currentProject.status}`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                >
                  {currentProject.status === 'draft' && '🟡 ร่าง (Draft)'}
                  {currentProject.status === 'submitted' && '🟢 ยื่นแล้ว (Submitted)'}
                  {currentProject.status === 'cancelled' && '🔴 ยกเลิก (Cancelled)'}
                </span>

                {/* e-GP link if present */}
                {currentProject.egpUrl && (
                  <a
                    href={currentProject.egpUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="egp-link-button"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                  >
                    <ExternalLink size={12} /> ประกาศ e-GP
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.825rem', color: 'var(--slate-500)', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  ผู้ว่าจ้าง: <strong>{proposal.cover?.clientAgency || currentProject?.clientAgency || '-'}</strong>
                </div>
                <div>
                  งบประมาณ: <strong>{(proposal.section1?.budgetAmount || currentProject?.budgetAmount || 0).toLocaleString()} บาท</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {isSavingDraft ? (
                    <span style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                      <Loader2 size={14} className="spinner-icon" /> กำลังบันทึกร่าง...
                    </span>
                  ) : (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                      <CheckCircle2 size={14} /> {lastSavedTime ? `บันทึกร่างแล้ว (${lastSavedTime} น.)` : 'บันทึกร่างอัตโนมัติแล้ว'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Panels */}
            {activeTab === 'cover' && (
              <CoverEditor
                cover={proposal.cover}
                onChange={(newCover) =>
                  updateProposalAndProject((prev) => ({ ...prev, cover: newCover }))
                }
              />
            )}

            {activeTab === 'section1' && (
              <Section1Editor
                section1={proposal.section1}
                onChange={(newSection1) =>
                  updateProposalAndProject((prev) => ({ ...prev, section1: newSection1 }))
                }
                onOpenTorImport={() => setShowTorImportModal(true)}
                onOpenBomModal={() => setShowBomModal(true)}
              />
            )}

            {activeTab === 'section2' && (
              <Section2Editor
                section2={proposal.section2}
                scopeItems={proposal.section1.scopeItems}
                totalDurationMonths={proposal.section1.projectDurationMonths}
                totalBudget={proposal.section1?.budgetAmount || currentProject?.budgetAmount || 0}
                onChangeSection2={(newSection2) =>
                  updateProposalAndProject((prev) => ({ ...prev, section2: newSection2 }))
                }
                onChangeScopeItems={(newItems) =>
                  updateProposalAndProject((prev) => ({
                    ...prev,
                    section1: { ...prev.section1, scopeItems: newItems },
                  }))
                }
              />
            )}

            {activeTab === 'section3' && (
              <Section3Editor
                section3={proposal.section3}
                scopeItems={proposal.section1.scopeItems}
                onChangeSection3={(newSection3) =>
                  updateProposalAndProject((prev) => ({ ...prev, section3: newSection3 }))
                }
                onChangeScopeItems={(newItems) =>
                  updateProposalAndProject((prev) => ({
                    ...prev,
                    section1: { ...prev.section1, scopeItems: newItems },
                  }))
                }
              />
            )}

            {activeTab === 'section4' && (
              <Section4Editor
                section4={proposal.section4}
                scopeItems={proposal.section1.scopeItems}
                onChange={(newSection4) =>
                  updateProposalAndProject((prev) => ({ ...prev, section4: newSection4 }))
                }
                onChangeScopeItems={(newItems) =>
                  updateProposalAndProject((prev) => ({
                    ...prev,
                    section1: { ...prev.section1, scopeItems: newItems },
                  }))
                }
              />
            )}

            {activeTab === 'section5' && (
              <Section5Editor
                section5={proposal.section5}
                onChange={(newSection5) =>
                  updateProposalAndProject((prev) => ({ ...prev, section5: newSection5 }))
                }
              />
            )}
          </main>
        </div>
      )}

      {/* Global Modals (Accessible in both Dashboard and Editor views) */}
      <AuditModal
        data={proposal}
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />

      <LiveDocxPreviewModal
        data={proposal}
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        isExporting={isExporting}
        onExport={handleExportDocx}
        onOpenStructureModal={() => {
          setShowPreviewModal(false);
          setShowStructureModal(true);
        }}
      />

      <DocumentStructureModal
        isOpen={showStructureModal}
        onClose={() => setShowStructureModal(false)}
        documentStructure={proposal.documentStructure}
        onChange={(newStructure) => {
          updateProposalAndProject((prev) => ({
            ...prev,
            documentStructure: newStructure,
          }));
        }}
        onOpenPreview={() => {
          setShowStructureModal(false);
          setShowPreviewModal(true);
        }}
      />

      <BomExportModal
        isOpen={showBomModal}
        onClose={() => setShowBomModal(false)}
        proposal={proposal}
      />

      <TorImportModal
        isOpen={showTorImportModal}
        onClose={() => {
          setShowTorImportModal(false);
          setActiveTorAttachmentId(null);
        }}
        onImport={handleImportTorScopes}
        attachments={currentProject?.attachments}
        selectedAttachmentId={activeTorAttachmentId}
        projectId={currentProject?.id}
      />

      <UserManagementModal
        isOpen={showUserMgmtModal}
        onClose={() => setShowUserMgmtModal(false)}
        currentUserEmail={currentUser?.email}
      />

      <GeminiSettingsModal
        isOpen={showGeminiModal}
        onClose={() => setShowGeminiModal(false)}
        onKeyUpdated={(has) => setHasGeminiKey(has)}
      />

      <MasterLibraryManagementModal
        isOpen={showMasterLibraryModal}
        onClose={() => setShowMasterLibraryModal(false)}
      />

      <DraftHistoryModal
        isOpen={showDraftHistoryModal}
        onClose={() => setShowDraftHistoryModal(false)}
        projectId={currentProject?.id || activeProjectId}
        projectTitle={currentProject?.projectTitle || proposal?.cover?.projectTitle || ''}
        onRestoreDraft={handleRestoreDraft}
      />

      <ExportDocxModal
        isOpen={showExportDocxModal}
        proposalData={proposal}
        onClose={() => setShowExportDocxModal(false)}
      />

      <GoogleSyncModal
        isOpen={showGoogleSyncModal}
        project={{ ...currentProject, proposalData: proposal }}
        onClose={() => setShowGoogleSyncModal(false)}
      />
    </div>
  );
};

export default App;
