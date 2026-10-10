import React, { useState, useEffect, useRef } from 'react';
import { ProposalData, BiddingProject, ProposalStatus } from './types/proposal';
import { INITIAL_PROPOSAL_DATA, DEFAULT_BIDDING_PROJECTS } from './data/defaultData';
import { exportProposalToDocx } from './services/docxExport';
import { runRuleBasedAudit } from './services/proposalAuditor';

import { ProjectDashboard } from './components/ProjectDashboard';
import { CoverEditor } from './components/CoverEditor';
import { Section1Editor } from './components/Section1Editor';
import { Section2Editor } from './components/Section2Editor';
import { Section3Editor } from './components/Section3Editor';
import { Section4Editor } from './components/Section4Editor';
import { Section5Editor } from './components/Section5Editor';
import { AuditModal } from './components/AuditModal';
import { LiveDocxPreviewModal } from './components/LiveDocxPreviewModal';
import { TorImportModal } from './components/TorImportModal';
import { LoginPage } from './components/LoginPage';
import { AccessDeniedPage } from './components/AccessDeniedPage';
import { UserManagementModal } from './components/UserManagementModal';
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
} from 'lucide-react';

import { loadAllProjects, saveProject } from './services/projectStorageService';

const PROJECTS_STORAGE_KEY = 'prime_bidding_projects_v2';

function loadInitialProjects(): BiddingProject[] {
  try {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read projects from localStorage', e);
  }
  return DEFAULT_BIDDING_PROJECTS;
}

export const App: React.FC = () => {
  // Navigation View: Default to 'dashboard' as requested by the user
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');

  // Cloud sync status
  const [cloudStatus, setCloudStatus] = useState<'cloud' | 'local'>('local');

  // Multi-project State
  const [projects, setProjects] = useState<BiddingProject[]>(loadInitialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    return loadInitialProjects()[0]?.id || 'proj-001';
  });

  // Authentication & Access Control State
  const [authStatus, setAuthStatus] = useState<'loading' | 'unauthenticated' | 'unauthorized' | 'authorized'>('loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showUserMgmtModal, setShowUserMgmtModal] = useState<boolean>(false);

  // Check Supabase Auth Session and Allowed Users permission
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (!isSupabaseConfigured() || !supabase) {
        // หากยังไม่ได้ตั้งค่า Supabase ให้เปิดระบบเพื่อให้ผู้ใช้ทดสอบในเครื่องได้
        if (isMounted) setAuthStatus('authorized');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          if (isMounted) setCurrentUser(session.user);
          const hasPerm = await checkEmailPermission(session.user.email || '');
          if (isMounted) {
            setAuthStatus(hasPerm ? 'authorized' : 'unauthorized');
          }
        } else {
          if (isMounted) {
            setCurrentUser(null);
            setAuthStatus('unauthenticated');
          }
        }
      } catch (err) {
        console.warn('Auth session check failed:', err);
        if (isMounted) setAuthStatus('unauthenticated');
      }
    };

    verifySession();

    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          if (isMounted) setCurrentUser(session.user);
          const hasPerm = await checkEmailPermission(session.user.email || '');
          if (isMounted) {
            setAuthStatus(hasPerm ? 'authorized' : 'unauthorized');
          }
        } else {
          if (isMounted) {
            setCurrentUser(null);
            setAuthStatus('unauthenticated');
          }
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
    setCurrentUser(null);
    setAuthStatus('unauthenticated');
  };

  // Load from Supabase Cloud or LocalStorage on mount
  useEffect(() => {
    if (authStatus !== 'authorized') return;
    loadAllProjects().then(({ projects: loaded, source }) => {
      setProjects(loaded);
      setCloudStatus(source);
      if (loaded.length > 0) {
        setActiveProjectId((curr) => (loaded.some((p) => p.id === curr) ? curr : loaded[0].id));
      }
    });
  }, [authStatus]);

  // Current active project
  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0] || DEFAULT_BIDDING_PROJECTS[0];

  // Proposal Data State for the currently selected project
  const [proposal, setProposal] = useState<ProposalData>(currentProject.proposalData);

  // When switching projects, load that project's proposalData
  useEffect(() => {
    if (currentProject && currentProject.proposalData) {
      setProposal(currentProject.proposalData);
    }
  }, [activeProjectId]);

  // When proposal changes in editor, update the projects array and persist to cloud / local
  const updateProposalAndProject = (updater: (prev: ProposalData) => ProposalData) => {
    setProposal((prev) => {
      const nextProposal = updater(prev);
      setProjects((prevProjects) => {
        const updatedProjects = prevProjects.map((p) => {
          if (p.id === activeProjectId) {
            const updated = {
              ...p,
              proposalData: nextProposal,
              projectTitle: nextProposal.cover.projectTitle || p.projectTitle,
              projectCode: nextProposal.cover.projectCode || p.projectCode,
              clientAgency: nextProposal.cover.clientAgency || p.clientAgency,
              budgetAmount: nextProposal.section1.budgetAmount || p.budgetAmount,
              updatedAt: new Date().toISOString(),
            };
            // Async sync to cloud database
            saveProject(updated);
            return updated;
          }
          return p;
        });
        return updatedProjects;
      });
      return nextProposal;
    });
  };

  // Save projects to cloud & local
  const handleUpdateProjects = (updatedProjects: BiddingProject[]) => {
    setProjects(updatedProjects);
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updatedProjects));
    } catch (e) {
      console.error('LocalStorage save error', e);
    }
    updatedProjects.forEach((p) => saveProject(p));
  };

  // Editor Tabs
  const [activeTab, setActiveTab] = useState<
    'cover' | 'section1' | 'section2' | 'section3' | 'section4' | 'section5'
  >('cover');

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTorImportModal, setShowTorImportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportTorScopes = (items: any[]) => {
    updateProposalAndProject((prev) => ({
      ...prev,
      section1: {
        ...prev.section1,
        scopeItems: items,
      },
    }));
  };

  // Real-time error/warning count for badge
  const auditIssues = runRuleBasedAudit(proposal);
  const auditBadgeCount = auditIssues.length;

  const handleExportDocx = async () => {
    try {
      setIsExporting(true);
      await exportProposalToDocx(proposal);
    } catch (error) {
      console.error('Export docx error', error);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Word โปรดตรวจสอบความสมบูรณ์ของข้อมูล');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetProjectsToDefault = () => {
    if (confirm('คุณต้องการรีเซ็ตโครงการทั้งหมดกลับเป็นชุดข้อมูลเริ่มต้นของ Prime Digital ใช่หรือไม่? ข้อมูลที่แก้ไขจะถูกแทนที่')) {
      setProjects(DEFAULT_BIDDING_PROJECTS);
      setActiveProjectId(DEFAULT_BIDDING_PROJECTS[0].id);
      setProposal(DEFAULT_BIDDING_PROJECTS[0].proposalData);
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(DEFAULT_BIDDING_PROJECTS));
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

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.cover && parsed.section1 && parsed.section3) {
          updateProposalAndProject(() => parsed);
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

  const handleOpenTorImporterForProject = (projectId: string) => {
    setActiveProjectId(projectId);
    const target = projects.find((p) => p.id === projectId);
    if (target) {
      setProposal(target.proposalData);
    }
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
    return <LoginPage isSupabaseReady={isSupabaseConfigured()} />;
  }

  if (authStatus === 'unauthorized') {
    return <AccessDeniedPage userEmail={currentUser?.email || ''} onSignOut={handleSignOut} />;
  }

  return (
    <div>
      {/* Top Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-section">
            <div
              className="brand-logo-badge"
              onClick={() => setCurrentView('dashboard')}
              style={{ cursor: 'pointer' }}
              title="กลับสู่หน้าแรก Dashboard"
            >
              PDC
            </div>
            <div className="brand-title-group">
              <h1 onClick={() => setCurrentView('dashboard')} style={{ cursor: 'pointer' }}>
                ระบบจัดทำข้อเสนอโครงการภาครัฐ | บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด
              </h1>
              <p>Government Project Proposal Management System & Thai Sarabun Word Exporter</p>
            </div>

            {currentView === 'editor' ? (
              <button
                type="button"
                className="btn-back-dashboard"
                onClick={() => setCurrentView('dashboard')}
                title="กลับสู่หน้า Dashboard ภาพรวมโครงการ"
                style={{ marginLeft: '0.85rem' }}
              >
                <ArrowLeft size={15} />
                <span>กลับหน้า Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-back-dashboard"
                onClick={() => setCurrentView('editor')}
                title="เปิดเครื่องมือจัดทำข้อเสนอโครงการ"
                style={{ marginLeft: '0.85rem', background: 'rgba(217, 119, 6, 0.25)', borderColor: 'rgba(217, 119, 6, 0.4)' }}
              >
                <FileText size={15} />
                <span>เข้าสู่ตัวจัดทำข้อเสนอ</span>
              </button>
            )}
          </div>

          <div className="header-actions">

            {/* Hidden JSON file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportJson}
            />

            {currentView === 'editor' && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary"
                  title="เปิดไฟล์โครงการที่เคยบันทึกไว้"
                >
                  <Upload size={15} /> นำเข้า JSON
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
      </header>

      {/* DASHBOARD VIEW */}
      {currentView === 'dashboard' ? (
        <ProjectDashboard
          projects={projects}
          cloudStatus={cloudStatus}
          onSelectProject={handleSelectProjectFromDashboard}
          onUpdateProjects={handleUpdateProjects}
          onOpenTorImporterForProject={handleOpenTorImporterForProject}
          onResetProjectsToDefault={handleResetProjectsToDefault}
          onOpenUserManagement={() => setShowUserMgmtModal(true)}
        />
      ) : (
        /* PROPOSAL EDITOR VIEW */
        <div>
          {/* Tabs Navigation */}
          <nav className="tabs-nav-bar">
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setCurrentView('dashboard')}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.785rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ArrowLeft size={13} /> Dashboard
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
                  ผู้ว่าจ้าง: <strong>{proposal.cover.clientAgency}</strong>
                </div>
                <div>
                  งบประมาณ: <strong>{proposal.section1.budgetAmount.toLocaleString()} บาท</strong>
                </div>
                <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={14} /> บันทึกอัตโนมัติแล้ว
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
              />
            )}

            {activeTab === 'section2' && (
              <Section2Editor
                section2={proposal.section2}
                scopeItems={proposal.section1.scopeItems}
                totalDurationMonths={proposal.section1.projectDurationMonths}
                totalBudget={proposal.section1.budgetAmount}
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
      />

      <TorImportModal
        isOpen={showTorImportModal}
        onClose={() => setShowTorImportModal(false)}
        onImport={handleImportTorScopes}
      />

      <UserManagementModal
        isOpen={showUserMgmtModal}
        onClose={() => setShowUserMgmtModal(false)}
        currentUserEmail={currentUser?.email}
      />
    </div>
  );
};

export default App;
