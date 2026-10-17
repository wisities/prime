import React, { useState, useEffect, useRef } from 'react';
import { PastProject, TeamMember, MasterCompanyProfile, ReportImageBlock } from '../types/proposal';
import {
  getMasterProjectsLibrary,
  saveProjectToMasterLibrary,
  deleteMasterProject,
  clearAllMasterProjects,
  resetMasterProjectsLibrary,
  exportMasterProjectsToJson,
  importMasterProjectsFromJson,
  MASTER_PROJECTS_UPDATED_EVENT,
  getMasterTeamLibrary,
  saveMemberToMasterLibrary,
  deleteMasterTeamMember,
  clearAllMasterTeamMembers,
  resetMasterTeamLibrary,
  exportMasterTeamToJson,
  importMasterTeamFromJson,
  MASTER_TEAM_UPDATED_EVENT,
  getMasterCompanyProfile,
  saveMasterCompanyProfile,
  resetMasterCompanyProfile,
  MASTER_COMPANY_UPDATED_EVENT,
} from '../services/masterLibraryService';
import { sortPastProjects } from './Section5Editor';
import { ReportImageManager } from './ReportImageManager';
import {
  Building2,
  Users,
  FileText,
  Plus,
  Trash2,
  Edit3,
  Save,
  Upload,
  Download,
  RotateCcw,
  Search,
  Check,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Award,
  Briefcase,
  Camera,
  Image,
  ChevronRight,
  X,
  Filter,
  Paperclip,
  CheckCircle2,
} from 'lucide-react';

interface MasterLibraryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'projects' | 'team' | 'company';
}

export const MasterLibraryManagementModal: React.FC<MasterLibraryManagementModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'projects',
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'team' | 'company'>(initialTab);
  const [projects, setProjects] = useState<PastProject[]>(getMasterProjectsLibrary());
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(getMasterTeamLibrary());
  const [companyProfile, setCompanyProfile] = useState<MasterCompanyProfile>(getMasterCompanyProfile());

  // Search & Filter state
  const [projectSearch, setProjectSearch] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState<'all' | 'tor_reference' | 'supplementary'>('all');
  const [teamSearch, setTeamSearch] = useState('');

  // Editing state for Project
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectFormData, setProjectFormData] = useState<Partial<PastProject>>({});

  // Editing state for Team Member
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [memberFormData, setMemberFormData] = useState<Partial<TeamMember>>({});

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputProjectsRef = useRef<HTMLInputElement>(null);
  const fileInputTeamRef = useRef<HTMLInputElement>(null);
  const currentYearBE = 2568;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    const handleProjectsUpdate = (e: any) => {
      if (e.detail) setProjects(e.detail);
    };
    const handleTeamUpdate = (e: any) => {
      if (e.detail) setTeamMembers(e.detail);
    };
    const handleCompanyUpdate = (e: any) => {
      if (e.detail) setCompanyProfile(e.detail);
    };

    window.addEventListener(MASTER_PROJECTS_UPDATED_EVENT, handleProjectsUpdate);
    window.addEventListener(MASTER_TEAM_UPDATED_EVENT, handleTeamUpdate);
    window.addEventListener(MASTER_COMPANY_UPDATED_EVENT, handleCompanyUpdate);

    return () => {
      window.removeEventListener(MASTER_PROJECTS_UPDATED_EVENT, handleProjectsUpdate);
      window.removeEventListener(MASTER_TEAM_UPDATED_EVENT, handleTeamUpdate);
      window.removeEventListener(MASTER_COMPANY_UPDATED_EVENT, handleCompanyUpdate);
    };
  }, []);

  if (!isOpen) return null;

  // File Upload Helper
  const handleFileUpload = (file: File, callback: (base64: string, fileName: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      callback(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  // -------------------------------------------------------------------------
  // Project Tab Actions
  // -------------------------------------------------------------------------
  const handleOpenAddProject = () => {
    setProjectFormData({
      id: `lib-proj-${Date.now()}`,
      projectName: '',
      clientName: '',
      contractValue: 0,
      completionYearBE: currentYearBE,
      periodDuration: '6 เดือน',
      description: '',
      category: '',
      isSelected: true,
      projectType: 'tor_reference',
      relevanceNote: '',
      imageBlocks: [],
    });
    setIsEditingProject(true);
  };

  const handleOpenEditProject = (proj: PastProject) => {
    setProjectFormData({ ...proj });
    setIsEditingProject(true);
  };

  const handleSaveProjectForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormData.projectName || projectFormData.projectName.trim() === '') {
      alert('กรุณาระบุชื่อโครงการ');
      return;
    }

    const projToSave: PastProject = {
      id: projectFormData.id || `lib-proj-${Date.now()}`,
      projectName: projectFormData.projectName.trim(),
      clientName: projectFormData.clientName || '',
      clientLogoUrl: projectFormData.clientLogoUrl,
      contractValue: Number(projectFormData.contractValue) || 0,
      completionYearBE: Number(projectFormData.completionYearBE) || currentYearBE,
      periodDuration: projectFormData.periodDuration || '',
      description: projectFormData.description || '',
      category: projectFormData.category || '',
      isSelected: true,
      projectType: projectFormData.projectType || 'tor_reference',
      relevanceNote: projectFormData.relevanceNote || '',
      certificateFileUrl: projectFormData.certificateFileUrl,
      certificateFileName: projectFormData.certificateFileName,
      imageBlocks: projectFormData.imageBlocks || [],
    };

    const updated = saveProjectToMasterLibrary(projToSave);
    setProjects(updated);
    setIsEditingProject(false);
    showToast(`บันทึกโครงการ "${projToSave.projectName}" ลงในคลังกลางสำเร็จ`);
  };

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`ยืนยันการลบโครงการ "${name}" ออกจากคลังกลางถาวร?`)) {
      const updated = deleteMasterProject(id);
      setProjects(updated);
      showToast('ลบโครงการออกจากคลังกลางแล้ว');
    }
  };

  const handleImportProjectsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const res = importMasterProjectsFromJson(text);
      if (res.success) {
        setProjects(getMasterProjectsLibrary());
        alert(`นำเข้าและผสานผลงานโครงการสำเร็จ! ปัจจุบันมีทั้งหมด ${res.count} โครงการ`);
      } else {
        alert(`เกิดข้อผิดพลาดในการนำเข้า: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------------------
  // Team Tab Actions
  // -------------------------------------------------------------------------
  const handleOpenAddMember = () => {
    setMemberFormData({
      id: `lib-team-${Date.now()}`,
      name: '',
      proposedRole: '',
      education: '',
      certifications: '',
      experienceYears: 5,
      startWorkYearBE: currentYearBE - 5,
      responsibilities: '',
      highlightProjects: '',
      personalBio: '',
    });
    setIsEditingMember(true);
  };

  const handleOpenEditMember = (member: TeamMember) => {
    setMemberFormData({ ...member });
    setIsEditingMember(true);
  };

  const handleSaveMemberForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberFormData.name || memberFormData.name.trim() === '') {
      alert('กรุณาระบุชื่อ-นามสกุลของบุคลากร');
      return;
    }

    const memberToSave: TeamMember = {
      id: memberFormData.id || `lib-team-${Date.now()}`,
      name: memberFormData.name.trim(),
      proposedRole: memberFormData.proposedRole || '',
      education: memberFormData.education || '',
      certifications: memberFormData.certifications || '',
      experienceYears: Number(memberFormData.experienceYears) || 0,
      startWorkYearBE: memberFormData.startWorkYearBE ? Number(memberFormData.startWorkYearBE) : undefined,
      responsibilities: memberFormData.responsibilities || '',
      highlightProjects: memberFormData.highlightProjects || '',
      personalBio: memberFormData.personalBio || '',
      photoUrl: memberFormData.photoUrl,
    };

    const updated = saveMemberToMasterLibrary(memberToSave);
    setTeamMembers(updated);
    setIsEditingMember(false);
    showToast(`บันทึกบุคลากร "${memberToSave.name}" ลงในคลังกลางสำเร็จ`);
  };

  const handleDeleteMember = (id: string, name: string) => {
    if (confirm(`ยืนยันการลบ "${name}" ออกจากคลังบุคลากรกลางถาวร?`)) {
      const updated = deleteMasterTeamMember(id);
      setTeamMembers(updated);
      showToast('ลบข้อมูลบุคลากรออกจากคลังกลางแล้ว');
    }
  };

  const handleImportTeamFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const res = importMasterTeamFromJson(text);
      if (res.success) {
        setTeamMembers(getMasterTeamLibrary());
        alert(`นำเข้าและผสานรายชื่อบุคลากรสำเร็จ! ปัจจุบันมีทั้งหมด ${res.count} ท่าน`);
      } else {
        alert(`เกิดข้อผิดพลาดในการนำเข้า: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------------------
  // Company Profile Actions
  // -------------------------------------------------------------------------
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    saveMasterCompanyProfile(companyProfile);
    showToast('บันทึกข้อมูลบริษัทกลางเข้าสู่เครื่อง (IndexedDB) สำเร็จ');
  };

  // Filtered & Sorted Lists
  const filteredProjects = sortPastProjects(
    projects.filter((p) => {
      const matchSearch =
        (p.projectName || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
        (p.clientName || '').toLowerCase().includes(projectSearch.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(projectSearch.toLowerCase());
      const matchType =
        projectTypeFilter === 'all' ||
        (projectTypeFilter === 'tor_reference' && (p.projectType || 'tor_reference') === 'tor_reference') ||
        (projectTypeFilter === 'supplementary' && p.projectType === 'supplementary');
      return matchSearch && matchType;
    })
  );

  const filteredTeam = teamMembers.filter((m) => {
    return (
      (m.name || '').toLowerCase().includes(teamSearch.toLowerCase()) ||
      (m.proposedRole || '').toLowerCase().includes(teamSearch.toLowerCase()) ||
      (m.certifications || '').toLowerCase().includes(teamSearch.toLowerCase()) ||
      (m.education || '').toLowerCase().includes(teamSearch.toLowerCase())
    );
  });
  const handleClose = () => {
    if (isEditingMember || isEditingProject) {
      if (!window.confirm('คุณกำลังแก้ไขข้อมูลอยู่และยังไม่ได้บันทึก ยืนยันการปิดหน้าต่างหรือไม่?')) {
        return;
      }
    }
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={22} color="var(--primary-700)" />
                คลังข้อมูลและทรัพยากรกลาง (Master Libraries Management)
              </h2>
              <span style={{ fontSize: '0.72rem', backgroundColor: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '12px', border: '1px solid #A7F3D0', fontWeight: 600 }}>
                💾 บันทึกในเครื่องปลอดภัย (IndexedDB)
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--slate-500)', margin: '4px 0 0 0' }}>
              สร้างและจัดการข้อมูลหลักของผลงานโครงการ บุคลากร และข้อมูลนิติบุคคล ไว้ล่วงหน้าก่อนเลือกนำไปใช้ในแต่ละเล่มข้อเสนอ
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', padding: '4px', color: 'var(--slate-500)' }}
            title="ปิดหน้าต่าง"
          >
            ✕
          </button>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div
            style={{
              margin: '0 1.25rem 0.5rem 1.25rem',
              padding: '0.5rem 0.85rem',
              backgroundColor: '#ECFDF5',
              border: '1px solid #6EE7B7',
              borderRadius: '6px',
              color: '#065F46',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
            }}
          >
            <CheckCircle size={15} color="#059669" /> {toastMessage}
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--slate-200)', backgroundColor: '#F8FAFC' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('projects');
              setIsEditingProject(false);
            }}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontWeight: activeTab === 'projects' ? 700 : 500,
              color: activeTab === 'projects' ? 'var(--primary-800)' : 'var(--slate-600)',
              borderBottom: activeTab === 'projects' ? '2.5px solid var(--primary-700)' : 'none',
              backgroundColor: activeTab === 'projects' ? '#FFFFFF' : 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <FileText size={16} /> คลังผลงานโครงการ ({projects.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('team');
              setIsEditingMember(false);
            }}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontWeight: activeTab === 'team' ? 700 : 500,
              color: activeTab === 'team' ? 'var(--primary-800)' : 'var(--slate-600)',
              borderBottom: activeTab === 'team' ? '2.5px solid var(--primary-700)' : 'none',
              backgroundColor: activeTab === 'team' ? '#FFFFFF' : 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Users size={16} /> คลังบุคลากรและผู้เชี่ยวชาญ ({teamMembers.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('company');
              setIsEditingProject(false);
              setIsEditingMember(false);
            }}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              fontWeight: activeTab === 'company' ? 700 : 500,
              color: activeTab === 'company' ? 'var(--primary-800)' : 'var(--slate-600)',
              borderBottom: activeTab === 'company' ? '2.5px solid var(--primary-700)' : 'none',
              backgroundColor: activeTab === 'company' ? '#FFFFFF' : 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Building2 size={16} /> ข้อมูลบริษัทกลาง (Master Profile)
          </button>
        </div>

        {/* Tab Body Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {/* ================================================================= */}
          {/* TAB 1: MASTER PROJECTS */}
          {/* ================================================================= */}
          {activeTab === 'projects' && (
            <div>
              <input
                ref={fileInputProjectsRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportProjectsFile}
              />

              {isEditingProject ? (
                /* Project Form View */
                <form onSubmit={handleSaveProjectForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--primary-900)' }}>
                      {projectFormData.projectName ? `✏️ แก้ไขโครงการ: ${projectFormData.projectName}` : '➕ เพิ่มผลงานโครงการใหม่ลงในคลังกลาง'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingProject(false)}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
                    >
                      ยกเลิก
                    </button>
                  </div>

                  <div className="grid-2">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">
                        ชื่อโครงการ <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="เช่น โครงการพัฒนาระบบบริหารจัดการข้อมูลอัจฉริยะ..."
                        value={projectFormData.projectName || ''}
                        onChange={(e) => setProjectFormData({ ...projectFormData, projectName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">หน่วยงานผู้ว่าจ้าง</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น กรมส่งเสริมการปกครองท้องถิ่น"
                        value={projectFormData.clientName || ''}
                        onChange={(e) => setProjectFormData({ ...projectFormData, clientName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">ประเภทโครงการ</label>
                      <select
                        className="form-select"
                        value={projectFormData.projectType || 'tor_reference'}
                        onChange={(e) => setProjectFormData({ ...projectFormData, projectType: e.target.value as any })}
                      >
                        <option value="tor_reference">ผลงานอ้างอิงตามเกณฑ์ TOR (ผลงานหลัก)</option>
                        <option value="supplementary">โครงการอื่นๆ ที่เกี่ยวข้อง</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">ปีที่แล้วเสร็จ (พ.ศ.) <span className="required">*</span></label>
                      <input
                        type="number"
                        className="form-input"
                        value={projectFormData.completionYearBE || currentYearBE}
                        onChange={(e) => setProjectFormData({ ...projectFormData, completionYearBE: parseInt(e.target.value) || currentYearBE })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">มูลค่าสัญญา (บาท)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={projectFormData.contractValue || 0}
                        onChange={(e) => setProjectFormData({ ...projectFormData, contractValue: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">ระยะเวลาสัญญา</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น 12 เดือน (1 ม.ค. 2567 - 31 ธ.ค. 2567)"
                        value={projectFormData.periodDuration || ''}
                        onChange={(e) => setProjectFormData({ ...projectFormData, periodDuration: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">โลโก้หน่วยงานผู้ว่าจ้าง</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {projectFormData.clientLogoUrl && (
                          <img
                            src={projectFormData.clientLogoUrl}
                            alt="Logo"
                            style={{ height: '38px', width: '48px', objectFit: 'contain', border: '1px solid var(--slate-300)', borderRadius: '4px', padding: '2px', backgroundColor: '#FFFFFF' }}
                          />
                        )}
                        <label
                          style={{
                            padding: '0.4rem 0.75rem',
                            border: '1px dashed var(--slate-300)',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: 'var(--primary-700)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(f, (b64) => setProjectFormData({ ...projectFormData, clientLogoUrl: b64 }));
                              e.target.value = '';
                            }}
                          />
                          <Upload size={13} /> {projectFormData.clientLogoUrl ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้หน่วยงาน'}
                        </label>
                        {projectFormData.clientLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setProjectFormData({ ...projectFormData, clientLogoUrl: undefined })}
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem', color: '#DC2626' }}
                          >
                            ลบโลโก้
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">รายละเอียดโครงการและขอบเขตงาน</label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '85px' }}
                      placeholder="ระบุรายละเอียดโครงการ สถาปัตยกรรม และขอบเขตงานสำคัญ..."
                      value={projectFormData.description || ''}
                      onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">โน้ตกำกับกิจกรรมหรือประเด็นที่สอดคล้อง (สำหรับโครงการอื่นๆ)</label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '55px' }}
                      placeholder="ระบุว่าผลงานนี้มีกิจกรรม เทคโนโลยี หรือแนวปฏิบัติใดที่สอดคล้องต่องานจ้าง..."
                      value={projectFormData.relevanceNote || ''}
                      onChange={(e) => setProjectFormData({ ...projectFormData, relevanceNote: e.target.value })}
                    />
                  </div>

                  {/* Project Image Blocks */}
                  <ReportImageManager
                    title="ภาพประกอบผลงานสำหรับบันทึกในคลังกลาง"
                    subtitle="รองรับทั้งภาพเดี่ยว 6 นิ้ว กึ่งกลาง และภาพคู่ 2 คอลัมน์ 3 นิ้ว สามารถบันทึกไว้ในคลังเพื่อนำไปใช้ในทุกเล่มข้อเสนอ"
                    imageBlocks={projectFormData.imageBlocks || []}
                    defaultCaptionPrefix="ภาพผลงาน"
                    onChange={(newBlocks) => setProjectFormData({ ...projectFormData, imageBlocks: newBlocks })}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--slate-200)', paddingTop: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingProject(false)}
                      className="btn btn-outline"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Save size={15} /> 💾 บันทึกโครงการลงคลังกลาง
                    </button>
                  </div>
                </form>
              ) : (
                /* Projects List View */
                <div>
                  {/* Action Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                      backgroundColor: '#F8FAFC',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--slate-200)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '260px', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                        <input
                          type="text"
                          className="form-input"
                          style={{ paddingLeft: '32px', fontSize: '0.825rem' }}
                          placeholder="ค้นหาชื่อโครงการ หรือหน่วยงาน..."
                          value={projectSearch}
                          onChange={(e) => setProjectSearch(e.target.value)}
                        />
                      </div>
                      <select
                        className="form-select"
                        style={{ width: '180px', fontSize: '0.825rem' }}
                        value={projectTypeFilter}
                        onChange={(e) => setProjectTypeFilter(e.target.value as any)}
                      >
                        <option value="all">ทุกประเภท ({projects.length})</option>
                        <option value="tor_reference">ผลงานอ้างอิงตาม TOR</option>
                        <option value="supplementary">โครงการอื่นๆ</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleOpenAddProject}
                        className="btn btn-primary"
                        style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Plus size={15} /> + เพิ่มโครงการใหม่เข้าคลัง
                      </button>
                      <button
                        type="button"
                        onClick={exportMasterProjectsToJson}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#047857', borderColor: '#6EE7B7', backgroundColor: '#ECFDF5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="ส่งออกไฟล์ .json ของคลังผลงานทั้งหมด"
                      >
                        <Download size={13} /> ส่งออก (.json)
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputProjectsRef.current?.click()}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#1D4ED8', borderColor: '#93C5FD', backgroundColor: '#EFF6FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="นำเข้าไฟล์ .json เพื่อผสานโครงการใหม่"
                      >
                        <Upload size={13} /> นำเข้า (.json)
                      </button>
                      {projects.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('ยืนยันการล้างข้อมูลผลงานโครงการทั้งหมดในคลังกลาง?')) {
                              const updated = clearAllMasterProjects();
                              setProjects(updated);
                              showToast('ล้างคลังผลงานแล้ว');
                            }
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                          title="ล้างข้อมูลทั้งหมดในคลังกลาง"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = resetMasterProjectsLibrary();
                            setProjects(updated);
                            showToast('คืนค่าผลงานตัวอย่างเดิมสำเร็จ');
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#2563EB', borderColor: '#93C5FD' }}
                        >
                          <RotateCcw size={13} /> คืนค่าตัวอย่าง
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List View */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredProjects.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                        <FileText size={36} color="#94A3B8" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>
                          ไม่พบรายการผลงานโครงการในคลังกลาง
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
                          คุณสามารถคลิกปุ่ม "+ เพิ่มโครงการใหม่เข้าคลัง" ด้านบนเพื่อเริ่มบันทึกประวัติผลงาน
                        </div>
                      </div>
                    ) : (
                      filteredProjects.map((item) => {
                        const isTorRef = (item.projectType || 'tor_reference') === 'tor_reference';
                        return (
                          <div
                            key={item.id}
                            style={{
                              border: '1px solid var(--slate-200)',
                              borderRadius: '8px',
                              padding: '0.85rem 1rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: '#FFFFFF',
                              gap: '0.75rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                              {item.clientLogoUrl && (
                                <img
                                  src={item.clientLogoUrl}
                                  alt="Logo"
                                  style={{ height: '42px', width: '48px', objectFit: 'contain', backgroundColor: '#FFFFFF', border: '1px solid var(--slate-300)', borderRadius: '4px', padding: '2px', flexShrink: 0 }}
                                />
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                      backgroundColor: isTorRef ? '#EFF6FF' : '#F3F4F6',
                                      color: isTorRef ? '#1D4ED8' : '#374151',
                                      border: `1px solid ${isTorRef ? '#BFDBFE' : '#E5E7EB'}`,
                                    }}
                                  >
                                    {isTorRef ? 'ผลงานอ้างอิงตาม TOR' : 'โครงการอื่นๆ'}
                                  </span>
                                  <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{item.projectName}</span>
                                </div>
                                <div style={{ fontSize: '0.825rem', color: 'var(--primary-700)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <span>{item.clientName || 'ไม่ระบุหน่วยงาน'}</span>
                                  <span>|</span>
                                  <span>แล้วเสร็จปี พ.ศ. <strong>{item.completionYearBE}</strong></span>
                                  <span>|</span>
                                  <span>มูลค่า {(item.contractValue || 0).toLocaleString()} บาท</span>
                                  {item.imageBlocks && item.imageBlocks.length > 0 && (
                                    <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                                      📷 {item.imageBlocks.length} บล็อกภาพ
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditProject(item)}
                                className="btn btn-outline"
                                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Edit3 size={13} /> แก้ไข
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProject(item.id, item.projectName)}
                                className="btn btn-outline"
                                style={{ borderColor: '#FECACA', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '0.35rem 0.55rem' }}
                                title="ลบโครงการนี้ออกจากคลังกลาง"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: MASTER PERSONNEL / TEAM */}
          {/* ================================================================= */}
          {activeTab === 'team' && (
            <div>
              <input
                ref={fileInputTeamRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportTeamFile}
              />

              {isEditingMember ? (
                /* Team Member Form View */
                <form onSubmit={handleSaveMemberForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--slate-200)', paddingBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--primary-900)' }}>
                      {memberFormData.name ? `✏️ แก้ไขข้อมูลบุคลากร: ${memberFormData.name}` : '➕ เพิ่มบุคลากรใหม่ลงในคลังกลาง'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsEditingMember(false)}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
                    >
                      ยกเลิก
                    </button>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        ชื่อ-นามสกุล (พร้อมคำนำหน้า) <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder="เช่น ดร. นรินทร์ เกียรติวรชัย"
                        value={memberFormData.name || ''}
                        onChange={(e) => setMemberFormData({ ...memberFormData, name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">ตำแหน่งมาตรฐาน / บทบาทความเชี่ยวชาญ</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น ผู้จัดการโครงการ (Project Manager) หรือ ที่ปรึกษาอาวุโส"
                        value={memberFormData.proposedRole || ''}
                        onChange={(e) => setMemberFormData({ ...memberFormData, proposedRole: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">วุฒิการศึกษา</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น ปริญญาเอก วิศวกรรมคอมพิวเตอร์ (จุฬาลงกรณ์มหาวิทยาลัย)"
                        value={memberFormData.education || ''}
                        onChange={(e) => setMemberFormData({ ...memberFormData, education: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">ใบรับรองวิชาชีพ / วุฒิบัตร (Certifications)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น PMP®, PMI-ACP®, ITIL v4 Foundation, TOGAF 9.2"
                        value={memberFormData.certifications || ''}
                        onChange={(e) => setMemberFormData({ ...memberFormData, certifications: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">ประสบการณ์ทำงานรวม (ปี)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={memberFormData.experienceYears || 0}
                        onChange={(e) => setMemberFormData({ ...memberFormData, experienceYears: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">ปีที่เริ่มทำงาน (พ.ศ.)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={memberFormData.startWorkYearBE || (currentYearBE - 5)}
                        onChange={(e) => setMemberFormData({ ...memberFormData, startWorkYearBE: parseInt(e.target.value) || undefined })}
                      />
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">ภาพถ่ายบุคลากร</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {memberFormData.photoUrl ? (
                          <img
                            src={memberFormData.photoUrl}
                            alt="Photo"
                            style={{ height: '70px', width: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--slate-300)' }}
                          />
                        ) : (
                          <div style={{ height: '70px', width: '60px', borderRadius: '4px', border: '1px dashed var(--slate-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' }}>
                            <Users size={24} color="#94A3B8" />
                          </div>
                        )}
                        <div>
                          <label
                            style={{
                              padding: '0.4rem 0.75rem',
                              border: '1px dashed var(--slate-300)',
                              borderRadius: '6px',
                              backgroundColor: '#FFFFFF',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              color: 'var(--primary-700)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(f, (b64) => setMemberFormData({ ...memberFormData, photoUrl: b64 }));
                                e.target.value = '';
                              }}
                            />
                            <Camera size={13} /> {memberFormData.photoUrl ? 'เปลี่ยนภาพถ่าย' : 'อัปโหลดภาพถ่าย'}
                          </label>
                          {memberFormData.photoUrl && (
                            <button
                              type="button"
                              onClick={() => setMemberFormData({ ...memberFormData, photoUrl: undefined })}
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.5rem', color: '#DC2626', marginLeft: '8px' }}
                            >
                              ลบภาพ
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">ประวัติย่อ / ประสบการณ์และความเชี่ยวชาญสำคัญ</label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '75px' }}
                      placeholder="เขียนประวัติย่อและจุดเด่นของบุคลากรท่านนี้..."
                      value={memberFormData.personalBio || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, personalBio: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ผลงานโครงการสำคัญในอดีต (Highlight Projects)</label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '65px' }}
                      placeholder="ระบุโครงการเด่นที่เคยรับผิดชอบ..."
                      value={memberFormData.highlightProjects || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, highlightProjects: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid var(--slate-200)', paddingTop: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsEditingMember(false)}
                      className="btn btn-outline"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Save size={15} /> 💾 บันทึกบุคลากรลงคลังกลาง
                    </button>
                  </div>
                </form>
              ) : (
                /* Team Members List View */
                <div>
                  {/* Action Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      marginBottom: '1rem',
                      backgroundColor: '#F8FAFC',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--slate-200)',
                    }}
                  >
                    <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '32px', fontSize: '0.825rem' }}
                        placeholder="ค้นหาชื่อ, ตำแหน่ง, วุฒิ หรือใบรับรอง..."
                        value={teamSearch}
                        onChange={(e) => setTeamSearch(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleOpenAddMember}
                        className="btn btn-primary"
                        style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Plus size={15} /> + เพิ่มบุคลากรใหม่เข้าคลัง
                      </button>
                      <button
                        type="button"
                        onClick={exportMasterTeamToJson}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#047857', borderColor: '#6EE7B7', backgroundColor: '#ECFDF5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="ส่งออกไฟล์ .json ของคลังบุคลากรทั้งหมด"
                      >
                        <Download size={13} /> ส่งออก (.json)
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputTeamRef.current?.click()}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#1D4ED8', borderColor: '#93C5FD', backgroundColor: '#EFF6FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="นำเข้าไฟล์ .json เพื่อผสานรายชื่อใหม่"
                      >
                        <Upload size={13} /> นำเข้า (.json)
                      </button>
                      {teamMembers.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('ยืนยันการล้างข้อมูลบุคลากรทั้งหมดในคลังกลาง?')) {
                              const updated = clearAllMasterTeamMembers();
                              setTeamMembers(updated);
                              showToast('ล้างคลังบุคลากรแล้ว');
                            }
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                          title="ล้างข้อมูลทั้งหมดในคลังกลาง"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = resetMasterTeamLibrary();
                            setTeamMembers(updated);
                            showToast('คืนค่าบุคลากรตัวอย่างเดิมสำเร็จ');
                          }}
                          className="btn btn-outline"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#2563EB', borderColor: '#93C5FD' }}
                        >
                          <RotateCcw size={13} /> คืนค่าตัวอย่าง
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Team List View */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredTeam.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2.5rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                        <Users size={36} color="#94A3B8" style={{ margin: '0 auto 0.5rem' }} />
                        <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>
                          ไม่พบข้อมูลบุคลากรในคลังกลาง
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
                          คลิกปุ่ม "+ เพิ่มบุคลากรใหม่เข้าคลัง" เพื่อสร้างประวัติทีมงานกลาง
                        </div>
                      </div>
                    ) : (
                      filteredTeam.map((member) => (
                        <div
                          key={member.id}
                          style={{
                            border: '1px solid var(--slate-200)',
                            borderRadius: '8px',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#FFFFFF',
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                            {member.photoUrl ? (
                              <img
                                src={member.photoUrl}
                                alt={member.name}
                                style={{ height: '46px', width: '42px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--slate-300)', flexShrink: 0 }}
                              />
                            ) : (
                              <div style={{ height: '46px', width: '42px', borderRadius: '4px', backgroundColor: '#F1F5F9', border: '1px solid var(--slate-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Users size={18} color="#94A3B8" />
                              </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.95rem' }}>{member.name}</span>
                                {member.proposedRole && (
                                  <span style={{ fontSize: '0.75rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    {member.proposedRole}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {member.education && <span>🎓 {member.education}</span>}
                                {member.experienceYears !== undefined && <span>💼 ประสบการณ์ {member.experienceYears} ปี</span>}
                              </div>
                              {member.certifications && (
                                <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '2px', fontWeight: 500 }}>
                                  📜 {member.certifications}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditMember(member)}
                              className="btn btn-outline"
                              style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Edit3 size={13} /> แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(member.id, member.name)}
                              className="btn btn-outline"
                              style={{ borderColor: '#FECACA', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '0.35rem 0.55rem' }}
                              title="ลบบุคลากรนี้ออกจากคลังกลาง"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: MASTER COMPANY PROFILE */}
          {/* ================================================================= */}
          {activeTab === 'company' && (
            <form onSubmit={handleSaveCompany} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.9rem' }}>
                    🏢 ข้อมูลและประวัติบริษัทกลาง (Master Company Profile)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#15803D', marginTop: '2px' }}>
                    บันทึกในเครื่องปลอดภัย (IndexedDB) เพื่อให้ทุกโครงการดึงข้อมูลชุดเดียวกันไปใช้ได้ทันที
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={14} /> 💾 บันทึกข้อมูลบริษัทกลาง
                </button>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">ชื่อบริษัทกลาง <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={companyProfile.companyName || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ทุนจดทะเบียน</label>
                  <input
                    type="text"
                    className="form-input"
                    value={companyProfile.registeredCapital || ''}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, registeredCapital: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ปีที่จดทะเบียนจัดตั้ง (พ.ศ.)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={companyProfile.establishedYearBE || 2558}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, establishedYearBE: parseInt(e.target.value) || 2558 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">เกณฑ์จำกัดอายุผลงานเริ่มต้นของ TOR (ปี)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={companyProfile.maxYearsFilter || 3}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, maxYearsFilter: parseInt(e.target.value) || 3 })}
                  />
                </div>
              </div>

              {/* Company Logo & Office Photo */}
              <div className="grid-2" style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}>
                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Image size={15} color="var(--primary-700)" /> โลโก้บริษัท (Master Logo)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {companyProfile.companyLogoUrl ? (
                      <img
                        src={companyProfile.companyLogoUrl}
                        alt="Logo"
                        style={{ height: '55px', maxWidth: '140px', objectFit: 'contain', border: '1px solid var(--slate-300)', borderRadius: '4px', padding: '3px', backgroundColor: '#FFFFFF' }}
                      />
                    ) : (
                      <div style={{ height: '55px', width: '100px', border: '1px dashed var(--slate-300)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#94A3B8' }}>
                        ไม่มีโลโก้
                      </div>
                    )}
                    <label
                      style={{
                        padding: '0.4rem 0.75rem',
                        border: '1px dashed var(--slate-300)',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: 'var(--primary-700)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f, (b64) => setCompanyProfile({ ...companyProfile, companyLogoUrl: b64 }));
                          e.target.value = '';
                        }}
                      />
                      <Upload size={13} /> {companyProfile.companyLogoUrl ? 'เปลี่ยนโลโก้' : 'อัปโหลดโลโก้'}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={15} color="var(--primary-700)" /> ภาพถ่ายสำนักงาน/อาคาร (Office Photo)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {companyProfile.companyOfficeImageUrl ? (
                      <img
                        src={companyProfile.companyOfficeImageUrl}
                        alt="Office"
                        style={{ height: '55px', width: '90px', objectFit: 'cover', border: '1px solid var(--slate-300)', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ height: '55px', width: '90px', border: '1px dashed var(--slate-300)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#94A3B8' }}>
                        ไม่มีภาพ
                      </div>
                    )}
                    <label
                      style={{
                        padding: '0.4rem 0.75rem',
                        border: '1px dashed var(--slate-300)',
                        borderRadius: '6px',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        color: 'var(--primary-700)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f, (b64) => setCompanyProfile({ ...companyProfile, companyOfficeImageUrl: b64 }));
                          e.target.value = '';
                        }}
                      />
                      <Upload size={13} /> {companyProfile.companyOfficeImageUrl ? 'เปลี่ยนภาพ' : 'อัปโหลดภาพ'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ประวัติและข้อมูลทั่วไปของบริษัท (Profile Overview)</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                  value={companyProfile.companyProfile || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, companyProfile: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">วิสัยทัศน์และพันธกิจ (Vision & Mission)</label>
                <input
                  type="text"
                  className="form-input"
                  value={companyProfile.visionMission || ''}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, visionMission: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">ความเชี่ยวชาญหลัก (พิมพ์แยกทีละบรรทัด)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={(companyProfile.specializations || []).join('\n')}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, specializations: e.target.value.split('\n').filter(Boolean) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">ใบรับรองมาตรฐานและทะเบียนที่ปรึกษา (พิมพ์แยกทีละบรรทัด)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={(companyProfile.certifications || []).join('\n')}
                  onChange={(e) => setCompanyProfile({ ...companyProfile, certifications: e.target.value.split('\n').filter(Boolean) })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--slate-200)', paddingTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const reset = resetMasterCompanyProfile();
                    setCompanyProfile(reset);
                    showToast('คืนค่าข้อมูลบริษัทเริ่มต้นสำเร็จ');
                  }}
                  className="btn btn-outline"
                  style={{ color: '#DC2626', borderColor: '#FCA5A5' }}
                >
                  คืนค่าเริ่มต้น
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={15} /> 💾 บันทึกข้อมูลบริษัทกลาง
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
