import React, { useState, useEffect, useRef } from 'react';
import { PastProject, TeamMember, MasterCompanyProfile, ReportImageBlock } from '../types/proposal';
import {
  getMasterProjectsLibrary,
  saveProjectToMasterLibrary,
  saveProjectToMasterLibraryResult,
  deduplicateMasterProjectsLibrary,
  deleteMasterProject,
  clearAllMasterProjects,
  resetMasterProjectsLibrary,
  exportMasterProjectsToJson,
  importMasterProjectsFromJson,
  MASTER_PROJECTS_UPDATED_EVENT,
  getMasterTeamLibrary,
  saveMemberToMasterLibrary,
  saveMemberToMasterLibraryResult,
  deduplicateMasterTeamLibrary,
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
  generateMasterProjectCode,
  generateMasterMemberId,
  findDuplicateProjectCodes,
  resequenceAllMasterProjectsCodes,
  resequenceAllMasterTeamCodes,
  importMasterProjectsFromCsv,
  importMasterTeamFromCsv,
  saveMasterProjectsLibrary,
  saveMasterTeamLibrary,
} from '../services/masterLibraryService';
import { fetchMasterLibraryFromGoogleSheet } from '../services/googleSyncService';
import { sortPastProjects } from './Section5Editor';
import { ReportImageManager } from './ReportImageManager';
import { compressImageFile } from '../utils/imageCompressor';
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
  List,
  Table as TableIcon,
  ExternalLink,
  FileCheck,
  CloudUpload,
  Loader2,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { syncMasterLibraryToGoogle, MasterLibrarySyncResult } from '../services/googleSyncService';

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

  // Google Sync state
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [syncGoogleProgress, setSyncGoogleProgress] = useState('');
  const [googleSyncResult, setGoogleSyncResult] = useState<MasterLibrarySyncResult | null>(null);

  const fileInputProjectsRef = useRef<HTMLInputElement>(null);
  const fileInputProjectsCsvRef = useRef<HTMLInputElement>(null);
  const fileInputTeamRef = useRef<HTMLInputElement>(null);
  const fileInputTeamCsvRef = useRef<HTMLInputElement>(null);
  const [isPullingFromSheet, setIsPullingFromSheet] = useState(false);
  const currentYearBE = 2568;

  // Local Staging & Code Generation on Sync
  const [modifiedProjectIds, setModifiedProjectIds] = useState<Set<string>>(new Set());
  const [autoGenCodeOnSync, setAutoGenCodeOnSync] = useState(true);
  const [showSyncCodeConfirmModal, setShowSyncCodeConfirmModal] = useState(false);
  const [syncCodeConfirmations, setSyncCodeConfirmations] = useState<Array<{
    id: string;
    projectName: string;
    yearBE: number;
    generatedCode: string;
    clientName: string;
  }>>([]);

  
  // -------------------------------------------------------------------------
  // Code Duplicate Analysis & Re-sequencing (Hooks must always run unconditionally)
  // -------------------------------------------------------------------------
  const duplicateProjectCodesInfo = React.useMemo(() => {
    return findDuplicateProjectCodes(projects || []);
  }, [projects]);

  const duplicateProjectsCount = React.useMemo(() => {
    return (projects || []).filter((p) => {
      if (!p) return false;
      const c = String(p.projectCode || '').trim().toUpperCase();
      return c && (duplicateProjectCodesInfo?.countMap?.[c] || 0) > 1;
    }).length;
  }, [projects, duplicateProjectCodesInfo]);

  const isFormProjectCodeDuplicated = React.useMemo(() => {
    const code = String(projectFormData?.projectCode || '').trim().toUpperCase();
    if (!code) return false;
    return (projects || []).some((p) => {
      if (!p) return false;
      if (p.id === projectFormData.id || (p.originalMasterId && p.originalMasterId === projectFormData.originalMasterId)) return false;
      return String(p.projectCode || '').trim().toUpperCase() === code;
    });
  }, [projectFormData?.projectCode, projectFormData?.id, projectFormData?.originalMasterId, projects]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const executeFinalSyncToGoogle = async (projectsToSync?: PastProject[]) => {
    try {
      setIsSyncingGoogle(true);
      setGoogleSyncResult(null);
      setSyncGoogleProgress('กำลังเริ่มต้นการซิงค์ข้อมูลลง Google Sheets & Drive...');
      const res = await syncMasterLibraryToGoogle({
        onProgress: (msg) => setSyncGoogleProgress(msg),
      });
      setGoogleSyncResult(res);
      if (res.success) {
        setModifiedProjectIds(new Set());
        showToast(res.message);
      } else {
        alert(res.message || res.error || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูลกลาง');
      }
    } catch (err: any) {
      alert(err?.message || 'การเชื่อมต่อขัดข้อง');
    } finally {
      setIsSyncingGoogle(false);
    }
  };

  const handleInitiateSyncToGoogle = async () => {
    // ตรวจสอบว่ามีโครงการใหม่ที่ต้องออกรหัสตามปีสัญญาหรือไม่
    const projectsNeedingCode = projects.filter(
      (p) => !p.projectCode || p.projectCode.trim() === '' || p.projectCode.includes('รอออกรหัส') || p.projectCode === 'AUTO'
    );

    if (projectsNeedingCode.length > 0) {
      setIsSyncingGoogle(true);
      setSyncGoogleProgress('กำลังตรวจสอบรหัสล่าสุดของแต่ละปีจาก Google Sheet...');

      let sheetProjects: PastProject[] = [];
      try {
        const pullRes = await fetchMasterLibraryFromGoogleSheet();
        if (pullRes.success && pullRes.projects) {
          sheetProjects = pullRes.projects;
        }
      } catch (err) {
        console.warn('Could not fetch latest sheet before code generation, using local library pool:', err);
      } finally {
        setIsSyncingGoogle(false);
      }

      // รวมโครงการที่มีรหัสที่แน่นอนแล้ว เพื่อคำนวณ max sequence ของแต่ละปี
      const confirmedProjectsPool = [
        ...sheetProjects,
        ...projects.filter((p) => p.projectCode && !p.projectCode.includes('รอออกรหัส')),
      ];

      const allocatedSoFar: PastProject[] = [];
      const newConfirmations = projectsNeedingCode.map((proj) => {
        const yr = Number(proj.contractYearBE) || Number(proj.completionYearBE) || currentYearBE;
        const nextCode = generateMasterProjectCode(yr, [...confirmedProjectsPool, ...allocatedSoFar]);
        allocatedSoFar.push({ ...proj, projectCode: nextCode });
        return {
          id: proj.id,
          projectName: proj.projectName || 'ไม่ระบุชื่อโครงการ',
          yearBE: yr,
          generatedCode: nextCode,
          clientName: proj.clientName || 'ไม่ระบุหน่วยงาน',
        };
      });

      setSyncCodeConfirmations(newConfirmations);
      setShowSyncCodeConfirmModal(true);
      return;
    }

    // หากไม่มีโครงการใหม่ที่ต้องออกรหัส (เป็นการอัปเดตข้อมูลโครงการเดิม) บันทึกและซิงค์ได้ทันที
    executeFinalSyncToGoogle(projects);
  };

  const handleConfirmAndProceedSync = () => {
    // อัปเดตรหัสใหม่ที่ผู้ใช้ยืนยันแล้วลงในรายการโครงการ
    const updatedProjects = projects.map((p) => {
      const foundConf = syncCodeConfirmations.find((c) => c.id === p.id);
      if (foundConf) {
        return {
          ...p,
          projectCode: foundConf.generatedCode,
          contractYearBE: foundConf.yearBE,
        };
      }
      return p;
    });

    saveMasterProjectsLibrary(updatedProjects);
    setProjects(updatedProjects);
    setShowSyncCodeConfirmModal(false);
    setModifiedProjectIds(new Set());

    // ซิงค์ทั้งหมดลง Google Sheet ทันที
    executeFinalSyncToGoogle(updatedProjects);
  };

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    if (isOpen) {
      setProjects(getMasterProjectsLibrary());
      setTeamMembers(getMasterTeamLibrary());
      setCompanyProfile(getMasterCompanyProfile());
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
  // File Upload Helper
  const handleFileUpload = (file: File, callback: (base64: string, fileName: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      callback(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleCertificateFileUpload = async (
    file: File,
    callback: (base64: string, fileName: string) => void
  ) => {
    try {
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|jfif)$/i.test(file.name);

      if (!isPdf && !isImage) {
        alert('กรุณาเลือกไฟล์เอกสาร PDF หรือรูปภาพ (JPG, PNG, WebP) เท่านั้น');
        return;
      }

      if (file.size > 25 * 1024 * 1024) {
        alert('ไฟล์มีขนาดใหญ่เกิน 25MB กรุณาเลือกไฟล์ที่มีขนาดเหมาะสม');
        return;
      }

      if (isPdf) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            callback(reader.result, file.name);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const compressed = await compressImageFile(file, 1600, 1600, 0.85);
        if (compressed) {
          callback(compressed, file.name);
        }
      }
    } catch (err) {
      console.warn('Certificate file processing error:', err);
      alert('เกิดข้อผิดพลาดในการประมวลผลไฟล์เอกสาร');
    }
  };

  

  const handleResequenceProjects = () => {
    if (!confirm(`ต้องการจัดระเบียบรหัสผลงานโครงการทั้งหมด (${projects.length} รายการ) ใหม่ตามปีสัญญา (${currentYearBE}-PRJ-001, 002, ...) หรือไม่?\n\nระบบจะเรียงลำดับตามปีสัญญาและกำหนดรหัสใหม่ที่ไม่ซ้ำกันอย่างแน่นอน 100%`)) {
      return;
    }
    const updated = resequenceAllMasterProjectsCodes();
    setProjects(updated);
    showToast(`จัดระเบียบรหัสผลงานโครงการ ${updated.length} รายการเรียบร้อยแล้ว`);
  };

  const handleResequenceTeam = () => {
    if (!confirm(`ต้องการจัดระเบียบรหัสบุคลากรทั้งหมด (${teamMembers.length} ท่าน) ใหม่ (${currentYearBE}-EMP-001, 002, ...) หรือไม่?`)) {
      return;
    }
    const updated = resequenceAllMasterTeamCodes();
    setTeamMembers(updated);
    showToast(`จัดระเบียบรหัสบุคลากร ${updated.length} ท่านเรียบร้อยแล้ว`);
  };

  // -------------------------------------------------------------------------
  // Pull from Google Sheet & CSV Import Actions
  // -------------------------------------------------------------------------
  const handlePullFromGoogleSheet = async () => {
    setIsPullingFromSheet(true);
    try {
      const res = await fetchMasterLibraryFromGoogleSheet();
      if (res.success && res.projects) {
        if (res.projects.length > 0) {
          saveMasterProjectsLibrary(res.projects);
          setProjects(res.projects);
        }
        if (res.team && res.team.length > 0) {
          saveMasterTeamLibrary(res.team);
          setTeamMembers(res.team);
        }
        showToast(res.message || `ดึงข้อมูลจาก Google Sheet สำเร็จ (${res.projects.length} โครงการ)`);
        alert(`✅ ดึงข้อมูลจาก Google Sheet สำเร็จ!\n\n• ผลงานโครงการ: ${res.projects.length} รายการ\n• บุคลากร: ${(res.team || []).length} ท่าน\n\nข้อมูลในระบบได้รับการอัปเดตตรงกับ Google Sheet เรียบร้อยแล้ว`);
      } else {
        alert(`⚠️ ไม่สามารถดึงข้อมูลได้: ${res.error}\n\nคำแนะนำ:\n1. ตรวจสอบว่า Google Apps Script Web App URL ได้รับการตั้งค่าแล้ว\n2. หรือสามารถเปิด Google Sheet แล้วกด "ไฟล์ > ดาวน์โหลด > ค่าที่คั่นด้วยจุลภาค (.csv)" แล้วกดปุ่ม "นำเข้า (.csv)" ได้ทันที`);
      }
    } catch (e: any) {
      alert(`เกิดข้อผิดพลาด: ${e.message}`);
    } finally {
      setIsPullingFromSheet(false);
    }
  };

  const handleImportProjectsCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const res = importMasterProjectsFromCsv(text);
      if (res.success) {
        setProjects(getMasterProjectsLibrary());
        alert(`นำเข้าผลงานโครงการจาก CSV สำเร็จ! ปัจจุบันมีทั้งหมด ${res.count} โครงการ`);
        showToast(`นำเข้าผลงานโครงการสำเร็จ (${res.count} รายการ)`);
      } else {
        alert(`เกิดข้อผิดพลาดในการนำเข้า CSV: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportTeamCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const res = importMasterTeamFromCsv(text);
      if (res.success) {
        setTeamMembers(getMasterTeamLibrary());
        alert(`นำเข้าบุคลากรจาก CSV สำเร็จ! ปัจจุบันมีทั้งหมด ${res.count} ท่าน`);
        showToast(`นำเข้าบุคลากรสำเร็จ (${res.count} ท่าน)`);
      } else {
        alert(`เกิดข้อผิดพลาดในการนำเข้า CSV: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // -------------------------------------------------------------------------
  // Project Tab Actions
  // -------------------------------------------------------------------------
  const handleOpenAddProject = () => {
    const contractYr = currentYearBE;
    setProjectFormData({
      id: `lib-proj-${Date.now()}`,
      projectCode: '[รอออกรหัสอัตโนมัติ]',
      contractYearBE: contractYr,
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
    setAutoGenCodeOnSync(true);
    setIsEditingProject(true);
  };

  const handleOpenEditProject = (proj: PastProject) => {
    const contractYr = proj.contractYearBE || proj.completionYearBE || currentYearBE;
    const isPendingCode = !proj.projectCode || proj.projectCode.includes('รอออกรหัส');
    setProjectFormData({
      ...proj,
      contractYearBE: contractYr,
      projectCode: proj.projectCode || '[รอออกรหัสอัตโนมัติ]',
    });
    setAutoGenCodeOnSync(isPendingCode);
    setIsEditingProject(true);
  };

  const handleSaveProjectForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormData.projectName || projectFormData.projectName.trim() === '') {
      alert('กรุณาระบุชื่อโครงการ');
      return;
    }

    const contractYr = Number(projectFormData.contractYearBE) || Number(projectFormData.completionYearBE) || currentYearBE;
    const code = autoGenCodeOnSync
      ? (projectFormData.projectCode && !projectFormData.projectCode.includes('รอออกรหัส') ? projectFormData.projectCode : '[รอออกรหัสอัตโนมัติ]')
      : (projectFormData.projectCode?.trim() || generateMasterProjectCode(contractYr, projects, projectFormData.id));

    const projToSave: PastProject = {
      id: projectFormData.id || `lib-proj-${Date.now()}`,
      originalMasterId: projectFormData.originalMasterId || projectFormData.id,
      projectCode: code,
      contractYearBE: contractYr,
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

    const { updatedLibrary, savedProject, isNew } = saveProjectToMasterLibraryResult(projToSave);
    setProjects(updatedLibrary);
    setModifiedProjectIds((prev) => new Set(prev).add(savedProject.id));
    setIsEditingProject(false);
    showToast(`💾 บันทึก${isNew ? 'โครงการใหม่' : 'การแก้ไข'} "${savedProject.projectName}" ลงในเครื่องแล้ว (รอซิงค์ลง Google Sheet)`);
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
    const defaultStart = currentYearBE - 5;
    const recYr = currentYearBE;
    const autoCode = generateMasterMemberId(recYr, teamMembers);
    setMemberFormData({
      id: `lib-team-${Date.now()}`,
      memberCode: autoCode,
      recordedYearBE: recYr,
      name: '',
      proposedRole: '',
      education: '',
      certifications: '',
      startWorkYearBE: defaultStart,
      experienceYears: Math.max(0, currentYearBE - defaultStart),
      responsibilities: '',
      highlightProjects: '',
      personalBio: '',
      bioImageBlocks: [],
      highlightImageBlocks: [],
      imageBlocks: [],
    });
    setIsEditingMember(true);
  };

  const handleOpenEditMember = (member: TeamMember) => {
    const startYear = member.startWorkYearBE;
    const computedExp = (startYear && !isNaN(Number(startYear)))
      ? Math.max(0, currentYearBE - Number(startYear))
      : (member.experienceYears || 0);
    const recYr = member.recordedYearBE || currentYearBE;
    const code = member.memberCode || generateMasterMemberId(recYr, teamMembers);
    setMemberFormData({
      ...member,
      memberCode: code,
      recordedYearBE: recYr,
      experienceYears: computedExp,
      bioImageBlocks: member.bioImageBlocks || [],
      highlightImageBlocks: member.highlightImageBlocks || member.imageBlocks || [],
      imageBlocks: member.imageBlocks || member.highlightImageBlocks || [],
    });
    setIsEditingMember(true);
  };

  const handleStartWorkYearChange = (yearVal: string) => {
    const yearNum = parseInt(yearVal, 10);
    if (!isNaN(yearNum) && yearNum >= 2400 && yearNum <= currentYearBE + 1) {
      const calculated = Math.max(0, currentYearBE - yearNum);
      setMemberFormData((prev) => ({
        ...prev,
        startWorkYearBE: yearNum,
        experienceYears: calculated,
      }));
    } else {
      setMemberFormData((prev) => ({
        ...prev,
        startWorkYearBE: isNaN(yearNum) ? undefined : yearNum,
        experienceYears: isNaN(yearNum) ? 0 : prev.experienceYears,
      }));
    }
  };

  const handleSaveMemberForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberFormData.name || memberFormData.name.trim() === '') {
      alert('กรุณาระบุชื่อ-นามสกุลของบุคลากร');
      return;
    }

    const calculatedExp = memberFormData.startWorkYearBE
      ? Math.max(0, currentYearBE - Number(memberFormData.startWorkYearBE))
      : (Number(memberFormData.experienceYears) || 0);

    const recYr = Number(memberFormData.recordedYearBE) || currentYearBE;
    const code = memberFormData.memberCode?.trim() || generateMasterMemberId(recYr, teamMembers);

    const memberToSave: TeamMember = {
      id: memberFormData.id || `lib-team-${Date.now()}`,
      originalMasterId: memberFormData.originalMasterId || memberFormData.id,
      memberCode: code,
      recordedYearBE: recYr,
      name: memberFormData.name.trim(),
      proposedRole: memberFormData.proposedRole || '',
      education: memberFormData.education || '',
      certifications: memberFormData.certifications || '',
      startWorkYearBE: memberFormData.startWorkYearBE ? Number(memberFormData.startWorkYearBE) : undefined,
      experienceYears: calculatedExp,
      responsibilities: memberFormData.responsibilities || '',
      highlightProjects: memberFormData.highlightProjects || '',
      personalBio: memberFormData.personalBio || '',
      photoUrl: memberFormData.photoUrl,
      bioImageBlocks: memberFormData.bioImageBlocks || [],
      highlightImageBlocks: memberFormData.highlightImageBlocks || memberFormData.imageBlocks || [],
      imageBlocks: memberFormData.highlightImageBlocks || memberFormData.imageBlocks || [],
    };

    const { updatedLibrary, savedMember, isNew } = saveMemberToMasterLibraryResult(memberToSave);
    setTeamMembers(updatedLibrary);
    setIsEditingMember(false);
    showToast(`${isNew ? 'บันทึกบุคลากรใหม่' : 'อัปเดตข้อมูลบุคลากรเดิม'} "${savedMember.name}" (รหัส: ${savedMember.memberCode}) ลงในคลังกลางสำเร็จ`);
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

  // Filtered & Sorted Lists: แสดงทั้งหมดเรียงจากปีใหม่ไปเก่า (Newest to Oldest)
  const filteredProjects = (projects || [])
    .filter((p) => {
      if (!p) return false;
      const pName = String(p.projectName || '');
      const pCode = String(p.projectCode || '');
      const pClient = String(p.clientName || '');
      const pDesc = String(p.description || '');
      const s = (projectSearch || '').toLowerCase();
      const matchSearch =
        pName.toLowerCase().includes(s) ||
        pCode.toLowerCase().includes(s) ||
        pClient.toLowerCase().includes(s) ||
        pDesc.toLowerCase().includes(s);
      const matchType =
        projectTypeFilter === 'all' ||
        (projectTypeFilter === 'tor_reference' && (p.projectType || 'tor_reference') === 'tor_reference') ||
        (projectTypeFilter === 'supplementary' && p.projectType === 'supplementary');
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      if (!a || !b) return 0;
      // 1. เรียงตามปีที่ได้สัญญา (หรือปีแล้วเสร็จ) จากใหม่ไปเก่า
      const yrA = Number(a.contractYearBE || a.completionYearBE || 0);
      const yrB = Number(b.contractYearBE || b.completionYearBE || 0);
      if (yrA !== yrB) return yrB - yrA;

      // 2. หากปีเดียวกัน เรียงตามรหัสโครงการ
      const codeA = String(a.projectCode || '').trim();
      const codeB = String(b.projectCode || '').trim();
      if (codeA && codeB) return codeB.localeCompare(codeA);

      // 3. เรียงตามชื่อโครงการ
      return String(a.projectName || '').localeCompare(String(b.projectName || ''));
    });

  const filteredTeam = (teamMembers || []).filter((m) => {
    if (!m) return false;
    const s = (teamSearch || '').toLowerCase();
    return (
      String(m.name || '').toLowerCase().includes(s) ||
      String(m.proposedRole || '').toLowerCase().includes(s) ||
      String(m.certifications || '').toLowerCase().includes(s) ||
      String(m.education || '').toLowerCase().includes(s)
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
  if (!isOpen) return null;

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleInitiateSyncToGoogle}
              disabled={isSyncingGoogle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: isSyncingGoogle ? '#93C5FD' : '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem 0.9rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: isSyncingGoogle ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(37,99,235,0.2)',
                transition: 'all 0.2s',
              }}
              title="ซิงค์ผลงาน บุคลากร BOM และข้อมูลบริษัททั้งหมดขึ้น Google Sheets และ Google Drive"
            >
              {isSyncingGoogle ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>{syncGoogleProgress || 'กำลังซิงค์...'}</span>
                </>
              ) : (
                <>
                  <CloudUpload size={15} />
                  <span>ซิงค์ข้อมูลกลางขึ้น Google Sheets & Drive</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', padding: '4px', color: 'var(--slate-500)' }}
              title="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Google Sync Result Banner */}
        {googleSyncResult && (
          <div
            style={{
              margin: '0 1.25rem 0.5rem 1.25rem',
              padding: '0.75rem 1rem',
              backgroundColor: googleSyncResult.success ? '#EFF6FF' : '#FEF2F2',
              border: `1px solid ${googleSyncResult.success ? '#BFDBFE' : '#FECACA'}`,
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: googleSyncResult.success ? '#1E40AF' : '#991B1B' }}>
              {googleSyncResult.success ? <CheckCircle size={18} color="#2563EB" /> : <AlertTriangle size={18} color="#DC2626" />}
              <span>{googleSyncResult.message}</span>
            </div>
            {googleSyncResult.success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {googleSyncResult.sheetUrl && (
                  <a
                    href={googleSyncResult.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={12} /> เปิดดูใน Google Sheet
                  </a>
                )}
                {googleSyncResult.driveFolderUrl && (
                  <a
                    href={googleSyncResult.driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <FolderOpen size={12} /> เปิดดูไดรฟ์สัญญา
                  </a>
                )}
              </div>
            )}
          </div>
        )}

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
              <input
                ref={fileInputProjectsCsvRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={handleImportProjectsCsvFile}
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
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>
                          รหัสโครงการ (Project Code) <span className="required">*</span>
                        </label>
                        <label style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#047857', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={autoGenCodeOnSync}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAutoGenCodeOnSync(checked);
                              if (checked) {
                                setProjectFormData({ ...projectFormData, projectCode: '[รอออกรหัสอัตโนมัติ]' });
                              } else {
                                const yr = Number(projectFormData.contractYearBE) || currentYearBE;
                                setProjectFormData({ ...projectFormData, projectCode: generateMasterProjectCode(yr, projects, projectFormData.id) });
                              }
                            }}
                          />
                          ให้ระบบตรวจและออกรหัสตามปีสัญญาตอนกดซิงค์
                        </label>
                      </div>

                      {autoGenCodeOnSync ? (
                        <div
                          style={{
                            marginTop: '0.25rem',
                            padding: '0.5rem 0.75rem',
                            backgroundColor: '#F0FDF4',
                            border: '1.5px dashed #86EFAC',
                            borderRadius: '6px',
                            color: '#166534',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Sparkles size={14} color="#16A34A" />
                          <span>ระบบจะตรวจรหัสล่าสุดของปี พ.ศ. {projectFormData.contractYearBE || currentYearBE} ใน Google Sheet และออกรหัสให้ตอนกดซิงค์</span>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '0.25rem' }}>
                            <input
                              type="text"
                              className="form-input"
                              required
                              placeholder="เช่น 2568-PRJ-001"
                              style={{
                                fontWeight: 600,
                                color: isFormProjectCodeDuplicated ? '#DC2626' : undefined,
                                borderColor: isFormProjectCodeDuplicated ? '#F87171' : undefined,
                                backgroundColor: isFormProjectCodeDuplicated ? '#FEF2F2' : undefined,
                                flex: 1,
                              }}
                              value={projectFormData.projectCode || ''}
                              onChange={(e) => setProjectFormData({ ...projectFormData, projectCode: e.target.value })}
                              title="รหัสโครงการขึ้นต้นด้วยปี พ.ศ. ที่ได้สัญญา"
                            />
                            {isFormProjectCodeDuplicated && (
                              <button
                                type="button"
                                onClick={() => {
                                  const yr = Number(projectFormData.contractYearBE) || Number(projectFormData.completionYearBE) || currentYearBE;
                                  const nextCode = generateMasterProjectCode(yr, projects, projectFormData.id);
                                  setProjectFormData({ ...projectFormData, projectCode: nextCode });
                                }}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0 8px',
                                  background: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                }}
                                title="เปลี่ยนเป็นรหัสถัดไปที่ไม่ซ้ำอัตโนมัติ"
                              >
                                ⚡ รหัสถัดไป
                              </button>
                            )}
                          </div>
                          {isFormProjectCodeDuplicated && (
                            <div style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '3px' }}>
                              รหัส "{projectFormData.projectCode}" มีโครงการอื่นในคลังกลางใช้อยู่แล้ว คลิก "⚡ รหัสถัดไป" หรือเลือกให้ระบบออกรหัสให้อัตโนมัติ
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        ปีที่ได้สัญญา (พ.ศ.)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={projectFormData.contractYearBE || projectFormData.completionYearBE || currentYearBE}
                        onChange={(e) => {
                          const yr = parseInt(e.target.value) || currentYearBE;
                          const nextCode = generateMasterProjectCode(yr, projects, projectFormData.id);
                          setProjectFormData({
                            ...projectFormData,
                            contractYearBE: yr,
                            projectCode: nextCode,
                          });
                        }}
                        title="ปี พ.ศ. ที่ลงนามหรือได้สัญญาโครงการ (เปลี่ยนปีจะคำนวณรหัสถัดไปที่ไม่ซ้ำให้อัตโนมัติ)"
                      />
                    </div>

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

                  {/* Certificate / Contract Copy Attachment */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1.5px dashed #CBD5E1',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0, fontWeight: 700, color: 'var(--primary-900)' }}>
                        <Paperclip size={14} color="#D97706" />
                        <span>สำเนาสัญญา หรือหนังสือรับรองผลงาน (Certificate / Contract Copy)</span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--slate-500)', fontWeight: 'normal' }}>
                          (รองรับทั้ง PDF และไฟล์รูปภาพ JPG, PNG บันทึกเก็บในคลังกลาง)
                        </span>
                      </label>
                    </div>

                    {projectFormData.certificateFileUrl ? (
                      (() => {
                        const isPdf =
                          projectFormData.certificateFileUrl.startsWith('data:application/pdf') ||
                          (projectFormData.certificateFileName || '').toLowerCase().endsWith('.pdf');

                        const handleOpenDoc = () => {
                          try {
                            const pureBase64 = projectFormData.certificateFileUrl!.includes(',')
                              ? projectFormData.certificateFileUrl!.split(',')[1]
                              : projectFormData.certificateFileUrl!;
                            const binary = atob(pureBase64);
                            const bytes = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) {
                              bytes[i] = binary.charCodeAt(i);
                            }
                            const blob = new Blob([bytes], { type: isPdf ? 'application/pdf' : 'image/png' });
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank');
                          } catch {
                            window.open(projectFormData.certificateFileUrl, '_blank');
                          }
                        };

                        return (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem',
                              backgroundColor: '#FFFFFF',
                              padding: '0.65rem 0.85rem',
                              borderRadius: '6px',
                              border: isPdf ? '1.5px solid #FCA5A5' : '1px solid #93C5FD',
                            }}
                          >
                            {isPdf ? (
                              <div
                                style={{
                                  height: '48px',
                                  width: '42px',
                                  backgroundColor: '#FEE2E2',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '1px solid #FECACA',
                                  color: '#DC2626',
                                  flexShrink: 0,
                                }}
                              >
                                <FileText size={20} />
                                <span style={{ fontSize: '0.6rem', fontWeight: 800, marginTop: '2px' }}>PDF</span>
                              </div>
                            ) : (
                              <img
                                src={projectFormData.certificateFileUrl}
                                alt="Certificate"
                                style={{
                                  height: '48px',
                                  width: '42px',
                                  objectFit: 'cover',
                                  borderRadius: '3px',
                                  border: '1px solid #CBD5E1',
                                  flexShrink: 0,
                                }}
                              />
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  color: 'var(--primary-900)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                ✓ บันทึกไฟล์ในคลังกลางแล้ว: {projectFormData.certificateFileName || (isPdf ? 'สำเนาสัญญา/หนังสือรับรอง (PDF)' : 'สำเนาสัญญา (ภาพ)')}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: isPdf ? '#DC2626' : 'var(--slate-500)',
                                  marginTop: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.65rem',
                                  flexWrap: 'wrap',
                                }}
                              >
                                <span>{isPdf ? 'ไฟล์ PDF พร้อมนำไปใช้ในภาคผนวก ก' : 'ภาพสแกนพร้อมนำไปใช้ในภาคผนวก ก'}</span>
                                <button
                                  type="button"
                                  onClick={handleOpenDoc}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#2563EB',
                                    cursor: 'pointer',
                                    padding: 0,
                                    textDecoration: 'underline',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '2px',
                                  }}
                                >
                                  <ExternalLink size={11} /> เปิดดูเอกสาร
                                </button>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                              <label
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  border: '1px solid var(--slate-300)',
                                  borderRadius: '4px',
                                  backgroundColor: '#FFFFFF',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  color: 'var(--primary-700)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <input
                                  type="file"
                                  accept=".pdf,image/*,application/pdf"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleCertificateFileUpload(file, (base64, fileName) => {
                                        setProjectFormData({
                                          ...projectFormData,
                                          certificateFileUrl: base64,
                                          certificateFileName: fileName,
                                        });
                                      });
                                    }
                                    e.target.value = '';
                                  }}
                                />
                                <Upload size={12} /> เปลี่ยนไฟล์
                              </label>

                              <button
                                type="button"
                                onClick={() => {
                                  setProjectFormData({
                                    ...projectFormData,
                                    certificateFileUrl: undefined,
                                    certificateFileName: undefined,
                                  });
                                }}
                                className="btn btn-outline"
                                style={{
                                  padding: '0.35rem 0.55rem',
                                  fontSize: '0.75rem',
                                  color: '#DC2626',
                                  borderColor: '#FCA5A5',
                                }}
                              >
                                ลบไฟล์
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <label
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1rem',
                          border: '1px dashed #CBD5E1',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <input
                          type="file"
                          accept=".pdf,image/*,application/pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleCertificateFileUpload(file, (base64, fileName) => {
                                setProjectFormData({
                                  ...projectFormData,
                                  certificateFileUrl: base64,
                                  certificateFileName: fileName,
                                });
                              });
                            }
                            e.target.value = '';
                          }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-700)', fontWeight: 600, fontSize: '0.85rem' }}>
                          <Upload size={15} /> คลิกเลือกไฟล์สำเนาสัญญา หรือหนังสือรับรองผลงาน (PDF / JPG / PNG)
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                          สามารถบันทึกเก็บไว้ในคลังกลาง เพื่อให้เล่มข้อเสนอโครงการดึงไปใช้ได้ทันที
                        </span>
                      </label>
                    )}
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
                      <Save size={15} /> 💾 บันทึกในเครื่อง (รอซิงค์ลง Google Sheet)
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
                        onClick={() => {
                          const deduped = deduplicateMasterProjectsLibrary();
                          const diff = projects.length - deduped.length;
                          setProjects(deduped);
                          if (diff > 0) {
                            showToast(`รวมรายการโครงการที่ซ้ำกัน ${diff} รายการเรียบร้อยแล้ว`);
                          } else {
                            showToast('ไม่มีรายการโครงการซ้ำในคลังกลาง');
                          }
                        }}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#7C3AED', borderColor: '#C4B5FD', backgroundColor: '#F5F3FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="รวมและตัดรายการผลงานโครงการที่ซ้ำซ้อนในคลังกลาง"
                      >
                        <Sparkles size={13} /> รวมรายการซ้ำ
                      </button>
                      <button
                        type="button"
                        onClick={handleResequenceProjects}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#B45309', borderColor: '#FDE68A', backgroundColor: '#FEF3C7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="จัดระเบียบและเรียงรหัสผลงานโครงการทั้งหมดใหม่ตามปีสัญญาโดยไม่ซ้ำกัน"
                      >
                        <RotateCcw size={13} /> จัดระเบียบรหัสใหม่ (Auto Re-code)
                      </button>
                      <button
                        type="button"
                        onClick={handlePullFromGoogleSheet}
                        disabled={isPullingFromSheet}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#047857', borderColor: '#6EE7B7', backgroundColor: '#ECFDF5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="ดึงข้อมูลที่แก้ไขล่าสุดจากแท็บ [คลังกลาง] ใน Google Sheet กลับมาอัปเดตลงระบบ"
                      >
                        <Download size={13} /> {isPullingFromSheet ? 'กำลังดึง...' : '📥 ดึงจาก Google Sheet (Pull)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputProjectsCsvRef.current?.click()}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#0284C7', borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="นำเข้าไฟล์ .csv ที่ดาวน์โหลดจาก Google Sheet"
                      >
                        <Upload size={13} /> นำเข้า (.csv)
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

                  {/* Duplicate Alert Banner */}
                  {duplicateProjectsCount > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        backgroundColor: '#FEF2F2',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        border: '1.5px solid #FCA5A5',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontSize: '0.825rem' }}>
                        <AlertTriangle size={16} color="#DC2626" />
                        <span>ตรวจพบรหัสโครงการซ้ำกันในคลังกลาง <strong>{duplicateProjectsCount}</strong> รายการ</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleResequenceProjects}
                        style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          backgroundColor: '#DC2626',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        🔄 จัดระเบียบรหัสทั้งหมดใหม่
                      </button>
                    </div>
                  )}

                  {/* Local Staging / Pending Sync Banner */}
                  {(modifiedProjectIds.size > 0 || projects.some(p => !p.projectCode || p.projectCode.includes('รอออกรหัส'))) && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        backgroundColor: '#F0FDF4',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        border: '1.5px solid #86EFAC',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '0.825rem' }}>
                        <CheckCircle size={16} color="#16A34A" />
                        <span>
                          มีการบันทึกการแก้ไขในเครื่องแล้ว <strong>{modifiedProjectIds.size + projects.filter(p => !p.projectCode || p.projectCode.includes('รอออกรหัส')).length}</strong> รายการ (เมื่อตรวจสอบเสร็จแล้ว ให้กดปุ่ม "ซิงค์ข้อมูลกลางขึ้น Google Sheets & Drive" เพื่อออกรหัสและบันทึกลง Sheet)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleInitiateSyncToGoogle}
                        disabled={isSyncingGoogle}
                        style={{
                          fontSize: '0.78rem',
                          padding: '4px 10px',
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CloudUpload size={13} /> ซิงค์ลง Google Sheet
                      </button>
                    </div>
                  )}

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
                                  {/* Year Badge */}
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      fontWeight: 700,
                                      backgroundColor: '#FEF3C7',
                                      color: '#B45309',
                                      border: '1px solid #FDE68A',
                                      letterSpacing: '0.02em',
                                    }}
                                    title="ปีที่ได้สัญญา / ปีแล้วเสร็จ (เรียงจากใหม่ไปเก่า)"
                                  >
                                    พ.ศ. {item.contractYearBE || item.completionYearBE}
                                  </span>

                                  {/* Code Badge */}
                                  {(() => {
                                    const code = (item.projectCode || '').trim();
                                    const isPendingCode = !code || code.includes('รอออกรหัส');
                                    if (isPendingCode) {
                                      return (
                                        <span
                                          style={{
                                            fontSize: '0.72rem',
                                            padding: '2px 7px',
                                            borderRadius: '4px',
                                            fontWeight: 700,
                                            backgroundColor: '#FDF4FF',
                                            color: '#9333EA',
                                            border: '1px solid #F0ABFC',
                                            letterSpacing: '0.02em',
                                          }}
                                          title="ระบบจะตรวจและออกรหัสให้ตอนกดปุ่มซิงค์ข้อมูลลง Google Sheet"
                                        >
                                          ⏳ รอออกรหัสเมื่อซิงค์
                                        </span>
                                      );
                                    }
                                    const codeUpper = code.toUpperCase();
                                    const isItemCodeDup = codeUpper && (duplicateProjectCodesInfo.countMap[codeUpper] || 0) > 1;
                                    return (
                                      <span
                                        style={{
                                          fontSize: '0.72rem',
                                          padding: '2px 7px',
                                          borderRadius: '4px',
                                          fontWeight: 700,
                                          backgroundColor: isItemCodeDup ? '#FEE2E2' : '#E0F2FE',
                                          color: isItemCodeDup ? '#DC2626' : '#0369A1',
                                          border: `1px solid ${isItemCodeDup ? '#FCA5A5' : '#BAE6FD'}`,
                                          letterSpacing: '0.02em',
                                        }}
                                        title={isItemCodeDup ? '⚠️ รหัสโครงการนี้ซ้ำกับโครงการอื่นในคลังกลาง' : 'รหัสโครงการขึ้นต้นด้วยปี พ.ศ. ที่ได้สัญญา'}
                                      >
                                        {code} {isItemCodeDup && '⚠️ ซ้ำ'}
                                      </span>
                                    );
                                  })()}

                                  {/* Modified in Local Staging Badge */}
                                  {modifiedProjectIds.has(item.id) && (
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                        backgroundColor: '#ECFDF5',
                                        color: '#065F46',
                                        border: '1px solid #A7F3D0',
                                      }}
                                      title="บันทึกในเครื่องแล้ว รอกดปุ่มซิงค์เพื่อบันทึกลง Google Sheet"
                                    >
                                      💾 บันทึกในเครื่องแล้ว (รอซิงค์)
                                    </span>
                                  )}
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
              <input
                ref={fileInputTeamCsvRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={handleImportTeamCsvFile}
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
                        รหัสประจำตัวบุคลากร (Member ID) <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        placeholder={`เช่น ${currentYearBE}-EMP-001`}
                        value={memberFormData.memberCode || ''}
                        onChange={(e) => setMemberFormData({ ...memberFormData, memberCode: e.target.value })}
                        title="รหัสประจำตัวบุคลากรตามปีที่บันทึก"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        ปีที่บันทึกข้อมูล (พ.ศ.)
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        value={memberFormData.recordedYearBE || currentYearBE}
                        onChange={(e) => {
                          const yr = parseInt(e.target.value) || currentYearBE;
                          const currentCode = memberFormData.memberCode || '';
                          const newCode = currentCode && /^\d{4}-/.test(currentCode)
                            ? currentCode.replace(/^\d{4}/, String(yr))
                            : `${yr}-EMP-001`;
                          setMemberFormData({
                            ...memberFormData,
                            recordedYearBE: yr,
                            memberCode: newCode,
                          });
                        }}
                        title="ปี พ.ศ. ที่บันทึกประวัติบุคลากรเข้าระบบ"
                      />
                    </div>

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
                      <label className="form-label">ปีที่เริ่มทำงาน (พ.ศ.)</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder={`เช่น ${currentYearBE - 10}`}
                        value={memberFormData.startWorkYearBE || ''}
                        onChange={(e) => handleStartWorkYearChange(e.target.value)}
                        title="ระบุปี พ.ศ. ที่เริ่มทำงาน ระบบจะคำนวณปีประสบการณ์ให้อัตโนมัติ"
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>ประสบการณ์ทำงานรวม (ปี)</span>
                        <span style={{ fontSize: '0.725rem', color: '#2563EB', fontWeight: 600 }}>
                          = {memberFormData.experienceYears || 0} ปี (คำนวณอัตโนมัติ)
                        </span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="number"
                          className="form-input"
                          disabled
                          readOnly
                          value={memberFormData.experienceYears || 0}
                          style={{ backgroundColor: '#F1F5F9', color: '#1E293B', cursor: 'not-allowed', fontWeight: 600 }}
                          title="ระบบคำนวณให้อัตโนมัติจากปีที่เริ่มทำงาน ไม่ต้องกรอก"
                        />
                        <div
                          style={{
                            padding: '0.45rem 0.75rem',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '6px',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            color: '#1D4ED8',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                          title={`คำนวณจากปี พ.ศ. ปัจจุบัน (${currentYearBE}) - ${memberFormData.startWorkYearBE || currentYearBE}`}
                        >
                          {memberFormData.experienceYears || 0} ปี
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">ภาพถ่ายบุคลากร (รูปถ่ายติดบัตร/หน้าตรง 1.5 นิ้ว)</label>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, color: 'var(--primary-900)' }}>
                        ประวัติย่อ / ประสบการณ์และความเชี่ยวชาญสำคัญ (รองรับเว้นวรรค เว้นบรรทัด บูลเล็ต และช่องตาราง)
                      </label>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const bulletSnippet = (memberFormData.personalBio && !memberFormData.personalBio.endsWith('\n') ? '\n' : '') + '• [ระบุความเชี่ยวชาญ/ทักษะสำคัญ]';
                            setMemberFormData({ ...memberFormData, personalBio: (memberFormData.personalBio || '') + bulletSnippet });
                          }}
                          title="แทรกบูลเล็ตพ้อยต์"
                        >
                          <List size={12} /> + บูลเล็ตพ้อยต์
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const tableSnippet = (memberFormData.personalBio && !memberFormData.personalBio.endsWith('\n') ? '\n\n' : '') +
                              '| ลำดับ | รายละเอียดความเชี่ยวชาญ / ทักษะ | ผลงาน / การรับรอง |\n' +
                              '| 1 | การออกแบบระบบ Cloud Architecture | AWS Solutions Architect Pro |\n' +
                              '| 2 | การพัฒนาระบบ Enterprise API | ระบบบริการประชาชนภาครัฐ |';
                            setMemberFormData({ ...memberFormData, personalBio: (memberFormData.personalBio || '') + tableSnippet });
                          }}
                          title="แทรกตารางแสดงความเชี่ยวชาญหรือรายละเอียด"
                        >
                          <TableIcon size={12} /> + แทรกช่องตาราง
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '85px', lineHeight: 1.5 }}
                      placeholder="เขียนประวัติย่อและความเชี่ยวชาญสำคัญ สามารถเว้นวรรค เว้นบรรทัด แทรกบูลเล็ต (• หรือ -) หรือตาราง (|...|) ได้ตามต้องการ..."
                      value={memberFormData.personalBio || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, personalBio: e.target.value })}
                    />
                    <div className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                      💡 <strong>รูปแบบข้อความ:</strong> สามารถเว้นวรรคและเว้นบรรทัดได้อย่างอิสระ ระบบจะรักษาระยะเว้นวรรค เว้นบรรทัด บูลเล็ต และช่องตารางในเอกสาร Word (.docx) ให้ตรงตามที่วางไว้
                    </div>
                    {/* ภาพประกอบประวัติย่อ / ความเชี่ยวชาญ (เดี่ยว 6 นิ้ว / คู่ 3 นิ้ว) */}
                    <div style={{ marginTop: '0.75rem' }}>
                      <ReportImageManager
                        title="ภาพประกอบประวัติย่อและความเชี่ยวชาญ (ขนาด 6 นิ้ว หรือ 3 นิ้วคู่)"
                        subtitle="รองรับทั้งภาพเดี่ยว 6 นิ้ว กึ่งกลาง และภาพคู่ 2 คอลัมน์ ขนาดละ 3 นิ้ว เช่น ภาพวุฒิบัตร ใบประกาศนียบัตร หรือภาพการปฏิบัติงาน"
                        imageBlocks={memberFormData.bioImageBlocks || []}
                        onChange={(newBlocks) => setMemberFormData({ ...memberFormData, bioImageBlocks: newBlocks })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, color: 'var(--primary-900)' }}>
                        ผลงานโครงการสำคัญในอดีต (Highlight Projects) (รองรับเว้นวรรค เว้นบรรทัด บูลเล็ต และช่องตาราง)
                      </label>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const bulletSnippet = (memberFormData.highlightProjects && !memberFormData.highlightProjects.endsWith('\n') ? '\n' : '') + '• [ระบุชื่อโครงการ บทบาทหน้าที่ และมูลค่า/เทคโนโลยีที่ใช้]';
                            setMemberFormData({ ...memberFormData, highlightProjects: (memberFormData.highlightProjects || '') + bulletSnippet });
                          }}
                          title="แทรกบูลเล็ตพ้อยต์"
                        >
                          <List size={12} /> + บูลเล็ตพ้อยต์
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const tableSnippet = (memberFormData.highlightProjects && !memberFormData.highlightProjects.endsWith('\n') ? '\n\n' : '') +
                              '| ลำดับ | ชื่อโครงการสำคัญที่ผ่านมา | บทบาทหน้าที่ | หน่วยงาน / ผู้ว่าจ้าง |\n' +
                              '| 1 | โครงการพัฒนาระบบบริการดิจิทัล | ผู้จัดการโครงการ | สำนักงานปลัดกระทรวงฯ |\n' +
                              '| 2 | โครงการบูรณาการฐานข้อมูลภาครัฐ | สถาปนิกผู้ออกแบบระบบ | กรมสารสนเทศฯ |';
                            setMemberFormData({ ...memberFormData, highlightProjects: (memberFormData.highlightProjects || '') + tableSnippet });
                          }}
                          title="แทรกตารางแสดงผลงานโครงการสำคัญ"
                        >
                          <TableIcon size={12} /> + แทรกช่องตาราง
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '85px', lineHeight: 1.5 }}
                      placeholder="ระบุโครงการเด่นที่เคยรับผิดชอบ สามารถเว้นวรรค เว้นบรรทัด แทรกบูลเล็ต (• หรือ -) หรือตาราง (|...|) ได้ตามต้องการ..."
                      value={memberFormData.highlightProjects || ''}
                      onChange={(e) => setMemberFormData({ ...memberFormData, highlightProjects: e.target.value })}
                    />
                    <div className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                      💡 <strong>รูปแบบข้อความ:</strong> สามารถเว้นวรรคและเว้นบรรทัดได้อย่างอิสระ ระบบจะรักษาระยะเว้นวรรค เว้นบรรทัด บูลเล็ต และช่องตารางในเอกสาร Word (.docx) ให้ตรงตามที่วางไว้
                    </div>
                    {/* ภาพประกอบผลงานโครงการเด่น (Highlight Projects - เดี่ยว 6 นิ้ว / คู่ 3 นิ้ว) */}
                    <div style={{ marginTop: '0.75rem' }}>
                      <ReportImageManager
                        title="ภาพประกอบผลงานโครงการสำคัญ (Highlight Projects - ขนาด 6 นิ้ว หรือ 3 นิ้วคู่)"
                        subtitle="รองรับทั้งภาพเดี่ยว 6 นิ้ว กึ่งกลาง และภาพคู่ 2 คอลัมน์ ขนาดละ 3 นิ้ว เช่น ภาพหน้าจอระบบ แผนผังสถาปัตยกรรม หรือหนังสือชมเชย/รับรองผลงาน"
                        imageBlocks={memberFormData.highlightImageBlocks || memberFormData.imageBlocks || []}
                        onChange={(newBlocks) => setMemberFormData({ ...memberFormData, highlightImageBlocks: newBlocks, imageBlocks: newBlocks })}
                      />
                    </div>
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
                        onClick={() => {
                          const deduped = deduplicateMasterTeamLibrary();
                          const diff = teamMembers.length - deduped.length;
                          setTeamMembers(deduped);
                          if (diff > 0) {
                            showToast(`รวมข้อมูลบุคลากรที่ซ้ำกัน ${diff} ท่านเรียบร้อยแล้ว`);
                          } else {
                            showToast('ไม่มีข้อมูลบุคลากรซ้ำในคลังกลาง');
                          }
                        }}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#7C3AED', borderColor: '#C4B5FD', backgroundColor: '#F5F3FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="รวมและตัดรายการบุคลากรที่ซ้ำซ้อนในคลังกลาง"
                      >
                        <Sparkles size={13} /> รวมรายการซ้ำ
                      </button>
                      <button
                        type="button"
                        onClick={handleResequenceTeam}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#B45309', borderColor: '#FDE68A', backgroundColor: '#FEF3C7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="จัดระเบียบและเรียงรหัสบุคลากรทั้งหมดใหม่"
                      >
                        <RotateCcw size={13} /> จัดระเบียบรหัสใหม่ (Auto Re-code)
                      </button>
                      <button
                        type="button"
                        onClick={handlePullFromGoogleSheet}
                        disabled={isPullingFromSheet}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#047857', borderColor: '#6EE7B7', backgroundColor: '#ECFDF5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="ดึงข้อมูลที่แก้ไขล่าสุดจากแท็บ [คลังกลาง] ใน Google Sheet กลับมาอัปเดตลงระบบ"
                      >
                        <Download size={13} /> {isPullingFromSheet ? 'กำลังดึง...' : '📥 ดึงจาก Google Sheet (Pull)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputTeamCsvRef.current?.click()}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: '#0284C7', borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="นำเข้าไฟล์ .csv ที่ดาวน์โหลดจาก Google Sheet"
                      >
                        <Upload size={13} /> นำเข้า (.csv)
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
                                <span
                                  style={{
                                    fontSize: '0.72rem',
                                    padding: '2px 7px',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                    backgroundColor: '#E0F2FE',
                                    color: '#0369A1',
                                    border: '1px solid #BAE6FD',
                                    letterSpacing: '0.02em',
                                  }}
                                  title="รหัสประจำตัวบุคลากรตามปีที่บันทึก"
                                >
                                  ID: {member.memberCode || member.id}
                                </span>
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
      {/* Confirmation Modal for Generated Project Codes on Sync */}
      {showSyncCodeConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.04)',
              overflow: 'hidden',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                padding: '1.25rem 1.5rem',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ backgroundColor: '#FEF3C7', padding: '8px', borderRadius: '8px', color: '#D97706' }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--primary-900)' }}>
                  ยืนยันการออกรหัสโครงการใหม่และบันทึกลง Google Sheet
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                  ระบบได้ตรวจลำดับรหัสใน Google Sheet ตามปีสัญญา และกำหนดรหัสใหม่ให้ดังนี้
                </p>
              </div>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.825rem', color: '#334155', marginBottom: '0.75rem', fontWeight: 500 }}>
                พบโครงการใหม่ที่ต้องออกรหัส <strong>{syncCodeConfirmations.length}</strong> รายการ:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {syncCodeConfirmations.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {idx + 1}. {item.projectName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                        🏛️ {item.clientName} | สัญญาปี พ.ศ. <strong>{item.yearBE}</strong>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>รหัสที่เจนให้ใหม่</div>
                      <div
                        style={{
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          border: '1.5px solid #6EE7B7',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          letterSpacing: '0.5px',
                          fontFamily: 'monospace',
                          marginTop: '2px',
                        }}
                      >
                        ⚡ {item.generatedCode}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#EFF6FF',
                  borderRadius: '6px',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.78rem',
                  color: '#1E40AF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <CheckCircle size={15} color="#2563EB" />
                <span>เมื่อกดยืนยัน ระบบจะบันทึกรหัสใหม่ลงในเครื่องและซิงค์แถวข้อมูลทั้งหมดลง Google Sheet ให้ทันที</span>
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setShowSyncCodeConfirmModal(false)}
                className="btn btn-outline"
                style={{ fontSize: '0.825rem', padding: '0.45rem 1rem' }}
              >
                ย้อนกลับไปแก้ไข
              </button>
              <button
                type="button"
                onClick={handleConfirmAndProceedSync}
                className="btn btn-primary"
                style={{
                  fontSize: '0.825rem',
                  padding: '0.45rem 1.25rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                }}
              >
                <Check size={16} /> ยืนยันรหัสและบันทึกลง Google Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
