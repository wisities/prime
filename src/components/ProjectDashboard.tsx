import React, { useState, useRef } from 'react';
import { BiddingProject, ProposalStatus, ProjectAttachment } from '../types/proposal';
import { createBlankProposalData } from '../data/defaultData';
import { exportProposalToDocx } from '../services/docxExport';
import { exportProjectPackage, importProjectPackage } from '../services/projectPackageService';
import {
  uploadAttachmentFile,
  saveProject,
  deleteProject,
  storeAttachmentInIDB,
  getAttachmentFromIDB,
} from '../services/projectStorageService';
import { extractProjectMetadataFromFile, parseTorTextRules } from '../services/torDocReader';
import { MasterLibraryManagementModal } from './MasterLibraryManagementModal';
import { ExportDocxModal } from './ExportDocxModal';
import { GoogleSyncModal } from './GoogleSyncModal';
import { ClientAgencySelect } from './ClientAgencySelect';
import { CloudProposalPickerModal } from './CloudProposalPickerModal';
import {
  FileText,
  ExternalLink,
  Upload,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  FileDown,
  Sparkles,
  Paperclip,
  Building,
  Layers,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Save,
  FileCode,
  FileSpreadsheet,
  Download,
  Cloud,
  HardDrive,
  Users,
  X,
  Building2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Library,
  CloudUpload,
  CloudDownload,
} from 'lucide-react';

export interface ClauseCompletionInfo {
  id: string;
  clauseNumber: string;
  title: string;
  level: number;
  isComplete: boolean;
  missingItems: string[];
}

export interface ProjectCompletionSummary {
  totalTorClauses: number;
  completedTorClauses: number;
  torPercent: number;
  clausesList: ClauseCompletionInfo[];
  milestonesTotal: number;
  milestonesComplete: number;
  teamTotal: number;
  teamComplete: number;
  riskTotal: number;
  riskComplete: number;
  pastProjectsSelected: number;
  totalAllTopics: number;
  completedAllTopics: number;
  overallPercent: number;
  isAllComplete: boolean;
}

export const computeProjectCompletion = (project?: BiddingProject | null): ProjectCompletionSummary => {
  if (!project) {
    return {
      totalTorClauses: 0,
      completedTorClauses: 0,
      torPercent: 0,
      clausesList: [],
      milestonesTotal: 0,
      milestonesComplete: 0,
      teamTotal: 0,
      teamComplete: 0,
      riskTotal: 0,
      riskComplete: 0,
      pastProjectsSelected: 0,
      totalAllTopics: 0,
      completedAllTopics: 0,
      overallPercent: 0,
      isAllComplete: false,
    };
  }

  const pData = project.proposalData;
  const scopeItems = Array.isArray(pData?.section1?.scopeItems) ? pData.section1.scopeItems : [];

  const clausesList: ClauseCompletionInfo[] = scopeItems.map((item) => {
    // เกณฑ์ความสมบูรณ์ของข้อ 3.3: ต้องมีอย่างน้อยเป็นข้อความในช่องรายละเอียดวิธีการดำเนินงาน (ส่วนรูปภาพจะมีหรือไม่ก็ได้)
    const hasMeth = Boolean(item && (item.proposedMethodology || '').trim().length > 0);

    const missing: string[] = [];
    if (!hasMeth) missing.push('รายละเอียดวิธีดำเนินงาน (ข้อ 3.3)');

    return {
      id: item?.id || '',
      clauseNumber: item?.clauseNumber || '',
      title: item?.title || '',
      level: item?.level || 1,
      isComplete: hasMeth,
      missingItems: missing,
    };
  });

  const totalTorClauses = clausesList.length;
  const completedTorClauses = clausesList.filter((c) => c.isComplete).length;
  const torPercent = totalTorClauses > 0 ? Math.round((completedTorClauses / totalTorClauses) * 100) : 0;

  const milestones = Array.isArray(pData?.section2?.milestones) ? pData.section2.milestones : [];
  const milestonesTotal = milestones.length;
  const milestonesComplete = milestones.filter(
    (m) => m && (m.title || '').trim().length > 0 && Number(m.percentage) > 0 && Array.isArray(m.deliverables) && m.deliverables.length > 0
  ).length;

  const teamMembers = Array.isArray(pData?.section4?.teamMembers) ? pData.section4.teamMembers : [];
  const teamTotal = teamMembers.length;
  const teamComplete = teamMembers.filter(
    (m) => m && (m.name || '').trim().length > 0 && (m.proposedRole || '').trim().length > 0
  ).length;

  const riskItems = Array.isArray(pData?.section4?.riskItems) ? pData.section4.riskItems : [];
  const riskTotal = riskItems.length;
  const riskComplete = riskItems.filter(
    (r) => r && (r.riskTitle || '').trim().length > 0 && (r.mitigationPlan || '').trim().length > 0
  ).length;

  const pastProjects = Array.isArray(pData?.section5?.pastProjects) ? pData.section5.pastProjects : [];
  const pastProjectsSelected = pastProjects.filter((p) => Boolean(p && p.isSelected)).length;

  const totalAllTopics = totalTorClauses + milestonesTotal + teamTotal + riskTotal;
  const completedAllTopics = completedTorClauses + milestonesComplete + teamComplete + riskComplete;
  const overallPercent = totalAllTopics > 0 ? Math.round((completedAllTopics / totalAllTopics) * 100) : 0;
  const isAllComplete = totalAllTopics > 0 && completedAllTopics === totalAllTopics;

  return {
    totalTorClauses,
    completedTorClauses,
    torPercent,
    clausesList,
    milestonesTotal,
    milestonesComplete,
    teamTotal,
    teamComplete,
    riskTotal,
    riskComplete,
    pastProjectsSelected,
    totalAllTopics,
    completedAllTopics,
    overallPercent,
    isAllComplete,
  };
};

interface ProjectDashboardProps {
  projects: BiddingProject[];
  cloudStatus?: 'cloud' | 'local';
  currentUserEmail?: string;
  onSelectProject: (projectId: string) => void;
  onUpdateProjects: (updated: BiddingProject[]) => void;
  onOpenTorImporterForProject: (projectId: string, attachmentId?: string) => void;
  onResetProjectsToDefault: () => void;
  onOpenUserManagement?: () => void;
  onOpenMasterLibraries?: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  cloudStatus = 'local',
  currentUserEmail,
  onSelectProject,
  onUpdateProjects,
  onOpenTorImporterForProject,
  onResetProjectsToDefault,
  onOpenUserManagement,
  onOpenMasterLibraries,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProposalStatus>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'announcement' | 'budget'>('deadline');
  
  // Master Library & Cloud Proposal Picker State
  const [showMasterLibrariesModal, setShowMasterLibrariesModal] = useState(false);
  const [showCloudPickerModal, setShowCloudPickerModal] = useState(false);
  const [exportDocxModalProject, setExportDocxModalProject] = useState<BiddingProject | null>(null);
  const [syncGoogleModalProject, setSyncGoogleModalProject] = useState<BiddingProject | null>(null);
  const [isExportingPrimePackage, setIsExportingPrimePackage] = useState<string | null>(null);

  // Project Edit/Create Modal State
  const [editingProject, setEditingProject] = useState<BiddingProject | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Upload Attachment Modal State
  const [uploadTargetProjectId, setUploadTargetProjectId] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<'announcement' | 'tor' | 'other'>('announcement');
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const jsonImportInputRef = useRef<HTMLInputElement>(null);
  const smartFileInputRef = useRef<HTMLInputElement>(null);
  const announcementFileInputRef = useRef<HTMLInputElement>(null);
  const torFileInputRef = useRef<HTMLInputElement>(null);
  const generalFileInputRef = useRef<HTMLInputElement>(null);

  // Smart File Extraction State
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [docAnalysisMsg, setDocAnalysisMsg] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
    details?: string[];
  } | null>(null);
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);


  const handleDownloadAttachment = async (att: ProjectAttachment) => {
    try {
      let url = att.dataUrl;
      if (!url || url.startsWith('idb://')) {
        url = (await getAttachmentFromIDB(att.id)) || undefined;
      }
      if (!url) {
        alert('ไม่พบเนื้อหาไฟล์ในระบบ');
        return;
      }
      const link = document.createElement('a');
      link.href = url;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading attachment:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์');
    }
  };

  // Expandable Checklist state for each project
  const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});

  const toggleChecklist = (projectId: string) => {
    setExpandedChecklists((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  // Collapsed Project Card state for each project
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('prime_dashboard_collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleProjectExpand = (projectId: string) => {
    setCollapsedProjects((prev) => {
      const next = {
        ...prev,
        [projectId]: !prev[projectId],
      };
      try {
        localStorage.setItem('prime_dashboard_collapsed', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleToggleAllProjects = (collapse: boolean) => {
    const next: Record<string, boolean> = {};
    projects.forEach((p) => {
      next[p.id] = collapse;
    });
    setCollapsedProjects(next);
    try {
      localStorage.setItem('prime_dashboard_collapsed', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Stats calculation
  const totalProjects = projects.length;
  const draftCount = projects.filter((p) => p.status === 'draft').length;
  const submittedCount = projects.filter((p) => p.status === 'submitted').length;
  const cancelledCount = projects.filter((p) => p.status === 'cancelled').length;
  const totalBudget = projects.reduce((sum, p) => sum + (p.budgetAmount || 0), 0);

  // Global Report Completion metrics
  const allProjectsMetrics = projects.map(computeProjectCompletion);
  const globalTotalClauses = allProjectsMetrics.reduce((sum, m) => sum + m.totalTorClauses, 0);
  const globalCompletedClauses = allProjectsMetrics.reduce((sum, m) => sum + m.completedTorClauses, 0);
  const globalClausesPercent = globalTotalClauses > 0 ? Math.round((globalCompletedClauses / globalTotalClauses) * 100) : 0;
  const fullyCompleteProjectsCount = allProjectsMetrics.filter((m) => m.isAllComplete).length;

  // Filtered & Sorted Projects
  const filteredProjects = projects
    .filter((p) => {
      const title = (p.projectTitle || '').toLowerCase();
      const code = (p.projectCode || '').toLowerCase();
      const agency = (p.clientAgency || '').toLowerCase();
      const q = (searchTerm || '').toLowerCase();
      const matchSearch = title.includes(q) || code.includes(q) || agency.includes(q);
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        const dA = a.submissionDeadline ? new Date(a.submissionDeadline).getTime() : Infinity;
        const dB = b.submissionDeadline ? new Date(b.submissionDeadline).getTime() : Infinity;
        return dA - dB;
      }
      if (sortBy === 'announcement') {
        const dA = a.announcementDate ? new Date(a.announcementDate).getTime() : 0;
        const dB = b.announcementDate ? new Date(b.announcementDate).getTime() : 0;
        return dB - dA;
      }
      if (sortBy === 'budget') {
        return (b.budgetAmount || 0) - (a.budgetAmount || 0);
      }
      return 0;
    });

  // Calculate remaining days for deadline
  const getDeadlineBadge = (deadlineStr?: string, status?: ProposalStatus) => {
    if (status === 'submitted') {
      return (
        <span className="deadline-badge badge-submitted">
          <CheckCircle2 size={13} /> ยื่นข้อเสนอแล้ว
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="deadline-badge badge-cancelled">
          <XCircle size={13} /> โครงการถูกยกเลิก
        </span>
      );
    }
    if (!deadlineStr) {
      return (
        <span className="deadline-badge badge-neutral">
          <Clock size={13} /> ไม่ได้ระบุเวลาส่ง
        </span>
      );
    }

    const now = new Date();
    const deadline = new Date(deadlineStr);
    const diffMs = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffMs < 0) {
      return (
        <span className="deadline-badge badge-overdue">
          <AlertCircle size={13} /> เลยกำหนดส่งแล้ว
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="deadline-badge badge-urgent">
          <AlertTriangle size={13} /> ด่วน! เหลืออีก {diffHours <= 24 ? `${diffHours} ชม.` : `${diffDays} วัน`}
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="deadline-badge badge-warning">
          <Clock size={13} /> เหลืออีก {diffDays} วัน
        </span>
      );
    }
    return (
      <span className="deadline-badge badge-info">
        <Clock size={13} /> เหลืออีก {diffDays} วัน
      </span>
    );
  };

  // Format Thai dates
  const formatThaiDate = (dateStr?: string, includeTime: boolean = false) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const thMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      const day = date.getDate();
      const month = thMonths[date.getMonth()];
      const year = date.getFullYear() + 543;
      if (includeTime) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
      }
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Change status quickly from card
  const handleQuickStatusChange = (projectId: string, newStatus: ProposalStatus) => {
    const updated = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    onUpdateProjects(updated);
  };

  // Delete project
  const handleDeleteProject = (projectId: string, title: string) => {
    if (confirm(`คุณต้องการลบโครงการ "${title}" ออกจากระบบใช่หรือไม่?`)) {
      const updated = projects.filter((p) => p.id !== projectId);
      onUpdateProjects(updated);
      deleteProject(projectId);
    }
  };

  // Save Project from modal
  const handleSaveProjectModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    if (isCreatingNew) {
      const newProj: BiddingProject = {
        ...editingProject,
        id: `proj-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Synchronize project cover and section1 data
      newProj.proposalData.cover.projectCode = newProj.projectCode;
      newProj.proposalData.cover.projectTitle = newProj.projectTitle;
      newProj.proposalData.cover.clientAgency = newProj.clientAgency;
      newProj.proposalData.cover.budgetFormatted = `${newProj.budgetAmount.toLocaleString()} บาท`;
      if (newProj.proposalData.section1) {
        newProj.proposalData.section1.budgetAmount = newProj.budgetAmount;
        if (editingProject.proposalData?.section1?.projectDurationDays) {
          newProj.proposalData.section1.projectDurationDays = editingProject.proposalData.section1.projectDurationDays;
          newProj.proposalData.section1.projectDurationMonths = Math.max(1, Math.round(editingProject.proposalData.section1.projectDurationDays / 30));
        }
      }

      onUpdateProjects([newProj, ...projects]);
    } else {
      const updated = projects.map((p) => {
        if (p.id === editingProject.id) {
          const synced = {
            ...editingProject,
            updatedAt: new Date().toISOString(),
          };
          synced.proposalData.cover.projectCode = synced.projectCode;
          synced.proposalData.cover.projectTitle = synced.projectTitle;
          synced.proposalData.cover.clientAgency = synced.clientAgency;
          synced.proposalData.cover.budgetFormatted = `${synced.budgetAmount.toLocaleString()} บาท`;
          if (synced.proposalData.section1) {
            synced.proposalData.section1.budgetAmount = synced.budgetAmount;
            if (editingProject.proposalData?.section1?.projectDurationDays) {
              synced.proposalData.section1.projectDurationDays = editingProject.proposalData.section1.projectDurationDays;
              synced.proposalData.section1.projectDurationMonths = Math.max(1, Math.round(editingProject.proposalData.section1.projectDurationDays / 30));
            }
          }
          return synced;
        }
        return p;
      });
      onUpdateProjects(updated);
    }

    setEditingProject(null);
    setIsCreatingNew(false);
  };

  // Open edit modal with synchronized budget & duration
  const handleOpenEditModal = (project: BiddingProject) => {
    const projToEdit: BiddingProject = JSON.parse(JSON.stringify(project));
    const eff = projToEdit.budgetAmount || projToEdit.proposalData?.section1?.budgetAmount || 0;
    projToEdit.budgetAmount = eff;
    if (projToEdit.proposalData?.section1) {
      projToEdit.proposalData.section1.budgetAmount = eff;
      if (!projToEdit.proposalData.section1.projectDurationDays) {
        projToEdit.proposalData.section1.projectDurationDays = 180;
        projToEdit.proposalData.section1.projectDurationMonths = 6;
      }
    }
    if (projToEdit.proposalData?.cover && (!projToEdit.proposalData.cover.budgetFormatted || projToEdit.proposalData.cover.budgetFormatted.trim() === '')) {
      projToEdit.proposalData.cover.budgetFormatted = `${eff.toLocaleString()} บาท`;
    }
    setEditingProject(projToEdit);
    setIsCreatingNew(false);
  };

  // Create new project template - always starts completely blank without copying previous projects
  const handleOpenCreateModal = () => {
    const code = `EGP-${new Date().getFullYear() + 543 - 2500}-${Math.floor(10000 + Math.random() * 90000)}`;
    const blankProposal = createBlankProposalData('', code, '', 5000000, 180);
    const newProj: BiddingProject = {
      id: '',
      projectCode: code,
      projectTitle: '',
      clientAgency: '',
      budgetAmount: 5000000,
      egpUrl: '',
      announcementDate: new Date().toISOString().split('T')[0],
      submissionDeadline: '',
      status: 'draft',
      statusNote: 'เริ่มต้นจัดทำร่างข้อเสนอโครงการ',
      attachments: [],
      proposalData: blankProposal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingProject(newProj);
    setIsCreatingNew(true);
  };

  // Close Project Modal Safely (Prevents Accidental Loss)
  const handleCloseProjectModal = () => {
    const isDirty = Boolean(
      (editingProject?.projectTitle && editingProject.projectTitle.trim() !== '') ||
      (editingProject?.clientAgency && editingProject.clientAgency.trim() !== '') ||
      (editingProject?.attachments && editingProject.attachments.length > 0)
    );
    if (isDirty) {
      if (!window.confirm('คุณต้องการปิดหน้าต่างนี้ใช่หรือไม่? ข้อมูลหรือเอกสารที่ยังไม่ได้กดบันทึกจะหายไป')) {
        return;
      }
    }
    setEditingProject(null);
    setIsCreatingNew(false);
    setDocAnalysisMsg(null);
  };

  // Toggle attachment category inside modal: announcement -> tor -> other -> announcement
  const handleToggleAttachmentCategory = (attId: string) => {
    if (!editingProject) return;
    const updatedAtts = editingProject.attachments.map((att) => {
      if (att.id === attId) {
        let nextCat: 'announcement' | 'tor' | 'other' = 'announcement';
        if (att.category === 'announcement') nextCat = 'tor';
        else if (att.category === 'tor') nextCat = 'other';
        else nextCat = 'announcement';
        return {
          ...att,
          category: nextCat,
        };
      }
      return att;
    });
    setEditingProject({ ...editingProject, attachments: updatedAtts });
  };

  // Remove attachment inside modal
  const handleRemoveModalAttachment = (attId: string) => {
    if (!editingProject) return;
    const updatedAtts = editingProject.attachments.filter((att) => att.id !== attId);
    setEditingProject({ ...editingProject, attachments: updatedAtts });
  };

  // Process Smart Files - Supports unlimited files without overwriting or dropping older files!
  const handleProcessSmartFiles = async (
    filesInput: FileList | File[],
    forcedCategory?: 'announcement' | 'tor' | 'other'
  ) => {
    const fileList = Array.from(filesInput);
    if (fileList.length === 0) return;

    setIsAnalyzingDoc(true);
    setDocAnalysisMsg({
      type: 'info',
      text: `กำลังประมวลผลและแนบ ${fileList.length} ไฟล์...`,
    });

    try {
      const baseProj: BiddingProject = editingProject || {
        id: `proj-${Date.now()}`,
        projectCode: `EGP-${new Date().getFullYear() + 543 - 2500}-${Math.floor(10000 + Math.random() * 90000)}`,
        projectTitle: '',
        clientAgency: '',
        budgetAmount: 5000000,
        egpUrl: '',
        announcementDate: new Date().toISOString().split('T')[0],
        submissionDeadline: '',
        status: 'draft',
        statusNote: 'สร้างโครงการอัตโนมัติจากไฟล์เอกสาร e-GP',
        attachments: [],
        proposalData: createBlankProposalData('', '', '', 5000000, 180),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const currentProj: BiddingProject = { ...baseProj };
      const currentAttachments: ProjectAttachment[] = [...(currentProj.attachments || [])];
      const extractedSummary: string[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const isPdf = file.name.toLowerCase().endsWith('.pdf');
        const isDocx = file.name.toLowerCase().endsWith('.docx');

        // Auto determine category: announcement, tor, or other
        let category: 'announcement' | 'tor' | 'other' = forcedCategory || 'other';
        if (!forcedCategory) {
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes('tor') || lowerName.includes('ขอบเขต') || lowerName.includes('scope')) {
            category = 'tor';
          } else if (lowerName.includes('ประกาศ') || lowerName.includes('announcement') || lowerName.includes('bidding')) {
            category = 'announcement';
          } else {
            category = isPdf || isDocx ? 'announcement' : 'other';
          }
        }

        // 1. Read base64 for persistent storage & viewing
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as string) || '');
          reader.readAsDataURL(file);
        });

        // Store into IndexedDB immediately for instant offline safety
        const attId = `att-${Date.now()}-${i}-${Math.floor(Math.random() * 100000)}`;
        await storeAttachmentInIDB(attId, dataUrl);

        // 2. Extract metadata if PDF or Word
        if (isPdf || isDocx) {
          try {
            const { metadata, rawText } = await extractProjectMetadataFromFile(file);
            if (metadata.projectCode && (!currentProj.projectCode || currentProj.projectCode.startsWith('EGP-'))) {
              currentProj.projectCode = metadata.projectCode;
            }
            if (metadata.projectTitle && (!currentProj.projectTitle || currentProj.projectTitle.trim() === '')) {
              currentProj.projectTitle = metadata.projectTitle;
            }
            if (metadata.clientAgency && (!currentProj.clientAgency || currentProj.clientAgency.trim() === '')) {
              currentProj.clientAgency = metadata.clientAgency;
            }
            if (metadata.budgetAmount && metadata.budgetAmount > 0) {
              currentProj.budgetAmount = metadata.budgetAmount;
            }
            if (metadata.announcementDate) {
              currentProj.announcementDate = metadata.announcementDate;
            }
            if (metadata.submissionDeadline) {
              currentProj.submissionDeadline = metadata.submissionDeadline;
            }
            if (metadata.egpUrl) {
              currentProj.egpUrl = metadata.egpUrl;
            }

            // Auto-extract TOR scope items into section 1 if file is TOR and scopeItems is empty
            if (category === 'tor' && rawText) {
              const currentScopes = currentProj.proposalData?.section1?.scopeItems || [];
              if (currentScopes.length === 0) {
                const extractedScopes = parseTorTextRules(rawText);
                if (extractedScopes.length > 0) {
                  currentProj.proposalData.section1.scopeItems = extractedScopes;
                  extractedSummary.push(`🎯 สกัดข้อกำหนด TOR (${extractedScopes.length} ข้อ) เข้าสู่ส่วนที่ 1 อัตโนมัติ`);
                }
              }
            }
          } catch (metaErr) {
            console.warn('Metadata extraction skipped for file:', file.name, metaErr);
          }
        }

        // 3. Add to attachments (only update if exact name and size match, otherwise add unique)
        const existingIdx = currentAttachments.findIndex((a) => a.name === file.name && a.size === file.size);
        const attachmentObj: ProjectAttachment = {
          id: existingIdx >= 0 ? currentAttachments[existingIdx].id : attId,
          name: file.name,
          size: file.size,
          category,
          type: file.type || (isPdf ? 'application/pdf' : isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream'),
          uploadedAt: new Date().toISOString(),
          dataUrl: `idb://${existingIdx >= 0 ? currentAttachments[existingIdx].id : attId}`,
        };

        if (existingIdx >= 0) {
          currentAttachments[existingIdx] = attachmentObj;
        } else {
          currentAttachments.push(attachmentObj);
        }

        const catLabel = category === 'announcement' ? 'ประกาศจัดจ้าง' : category === 'tor' ? 'TOR' : 'เอกสารแนบ';
        extractedSummary.push(`แนบ [${catLabel}] ${file.name}`);
      }

      currentProj.attachments = currentAttachments;

      // Sync proposal cover
      if (currentProj.projectTitle) {
        currentProj.proposalData.cover.projectTitle = currentProj.projectTitle;
      }
      if (currentProj.projectCode) {
        currentProj.proposalData.cover.projectCode = currentProj.projectCode;
      }
      if (currentProj.clientAgency) {
        currentProj.proposalData.cover.clientAgency = currentProj.clientAgency;
      }
      if (currentProj.budgetAmount) {
        currentProj.proposalData.cover.budgetFormatted = `${currentProj.budgetAmount.toLocaleString()} บาท`;
        if (currentProj.proposalData.section1) {
          currentProj.proposalData.section1.budgetAmount = currentProj.budgetAmount;
        }
      }

      // Merge into state safely via functional update
      setEditingProject((prev) => {
        const base = prev || currentProj;
        const mergedAttachments = [...(base.attachments || [])];
        for (const att of currentAttachments) {
          const idx = mergedAttachments.findIndex((m) => m.name === att.name && m.size === att.size);
          if (idx >= 0) {
            mergedAttachments[idx] = att;
          } else {
            mergedAttachments.push(att);
          }
        }
        return {
          ...base,
          ...currentProj,
          attachments: mergedAttachments,
        };
      });

      if (!editingProject) {
        setIsCreatingNew(true);
      }

      const detailsList: string[] = [...extractedSummary];
      if (currentProj.projectCode) detailsList.push(`รหัสโครงการ: ${currentProj.projectCode}`);
      if (currentProj.budgetAmount) detailsList.push(`งบประมาณ: ฿${currentProj.budgetAmount.toLocaleString()} บาท`);
      if (currentProj.submissionDeadline) detailsList.push(`กำหนดยื่นข้อเสนอ: ${currentProj.submissionDeadline}`);

      setDocAnalysisMsg({
        type: 'success',
        text: `สกัดข้อมูลและแนบเอกสารสำเร็จ (${fileList.length} ไฟล์) - เอกสารทั้งหมดถูกบันทึกเพื่อเรียกดูทีหลังเรียบร้อยแล้ว`,
        details: detailsList,
      });
    } catch (err: any) {
      console.error('Error processing smart files:', err);
      setDocAnalysisMsg({
        type: 'error',
        text: `เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message || 'ไม่สามารถประมวลผลเอกสารได้'}`,
      });
    } finally {
      setIsAnalyzingDoc(false);
    }
  };

  // Handle file attachment upload (supports multiple files simultaneously)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0 || !uploadTargetProjectId) return;

    try {
      const newAttachments: ProjectAttachment[] = [];
      for (const file of files) {
        const newAtt = await uploadAttachmentFile(uploadTargetProjectId, file, uploadCategory);
        newAttachments.push(newAtt);
      }

      const updated = projects.map((p) => {
        if (p.id === uploadTargetProjectId) {
          return {
            ...p,
            attachments: [...(p.attachments || []), ...newAttachments],
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });

      onUpdateProjects(updated);
      setUploadTargetProjectId(null);
      alert(`อัปโหลดเอกสารสำเร็จทั้งหมด ${files.length} ไฟล์`);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
    }
    if (e.target) e.target.value = '';
  };

  // Delete attachment
  const handleDeleteAttachment = (projectId: string, attachmentId: string) => {
    if (confirm('คุณต้องการลบไฟล์แนบนี้ใช่หรือไม่?')) {
      const updated = projects.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            attachments: (p.attachments || []).filter((a) => a.id !== attachmentId),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      onUpdateProjects(updated);
    }
  };

  // Download DOCX directly from dashboard
  const handleExportDocx = async (project: BiddingProject) => {
    const hasCerts = (project.proposalData?.section5?.pastProjects || []).some(
      (p) => p.isSelected && !!p.certificateFileUrl
    );
    if (hasCerts) {
      setExportDocxModalProject(project);
    } else {
      try {
        await exportProposalToDocx(project.proposalData);
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Word');
      }
    }
  };

  // Export full project package (.prime) with all files & attachments
  const handleExportPrimePackage = async (project: BiddingProject) => {
    try {
      setIsExportingPrimePackage(project.id);
      await exportProjectPackage(project);
    } catch (err: any) {
      console.error('Prime package export error:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์แพ็กเกจ .prime');
    } finally {
      setIsExportingPrimePackage(null);
    }
  };

  // Export single project draft JSON for transferring to a teammate
  const handleExportSingleProject = (project: BiddingProject) => {
    const jsonStr = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanCode = (project.projectCode || 'PROJECT').replace(/[/\\?%*:|"<>]/g, '_');
    const cleanTitle = (project.projectTitle || 'Proposal').substring(0, 30).replace(/[/\\?%*:|"<>]/g, '_');
    a.download = `ร่างโครงการ_${cleanCode}_${cleanTitle}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export JSON backup of all projects
  const handleExportAllJson = () => {
    const jsonStr = JSON.stringify(projects, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prime_Bidding_Projects_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import project (.prime archive or JSON file)
  const handleImportProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.prime')) {
      try {
        const importedProj = await importProjectPackage(file);
        const existingIdx = projects.findIndex(
          (p) => p.id === importedProj.id || (p.projectCode && p.projectCode === importedProj.projectCode)
        );
        let updatedList: BiddingProject[];
        if (existingIdx >= 0) {
          if (window.confirm(`พบโครงการ "${importedProj.projectTitle}" (${importedProj.projectCode}) อยู่ในระบบแล้ว ต้องการแทนที่เนื้อหาด้วยแพ็กเกจที่นำเข้ามาหรือไม่?`)) {
            updatedList = projects.map((p, idx) => (idx === existingIdx ? { ...p, ...importedProj, id: p.id } : p));
          } else {
            return;
          }
        } else {
          updatedList = [importedProj, ...projects];
        }
        onUpdateProjects(updatedList);
        alert(`✓ นำเข้าแพ็กเกจโครงการ "${importedProj.projectTitle}" พร้อมไฟล์แนบและสัญญาครบถ้วน 100%!`);
      } catch (err: any) {
        console.error('Import .prime error:', err);
        alert(`เกิดข้อผิดพลาดในการนำเข้าไฟล์ .prime: ${err?.message || 'ไฟล์ชำรุด'}`);
      } finally {
        if (e.target) e.target.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].projectTitle) {
          onUpdateProjects(parsed);
          alert(`นำเข้าข้อมูลโครงการทั้งหมด ${parsed.length} รายการ เรียบร้อยแล้ว`);
        } else if (parsed && parsed.projectTitle && (parsed.id || parsed.projectCode)) {
          // นำเข้าไฟล์โครงการเดี่ยวที่ได้รับจากเพื่อนร่วมงาน
          const existingIdx = projects.findIndex(
            (p) => p.id === parsed.id || (p.projectCode && p.projectCode === parsed.projectCode)
          );
          let updatedList: BiddingProject[];
          if (existingIdx >= 0) {
            if (window.confirm(`พบโครงการ "${parsed.projectTitle}" (${parsed.projectCode}) อยู่ในเครื่องแล้ว ต้องการแทนที่เนื้อหาร่างด้วยไฟล์ที่นำเข้ามาหรือไม่?`)) {
              updatedList = projects.map((p, idx) => (idx === existingIdx ? { ...p, ...parsed, id: p.id } : p));
            } else {
              return;
            }
          } else {
            updatedList = [parsed, ...projects];
          }
          onUpdateProjects(updatedList);
          alert(`นำเข้าไฟล์ร่างโครงการ "${parsed.projectTitle}" เข้าสู่เครื่องของคุณเรียบร้อยแล้ว!`);
        } else {
          alert('รูปแบบไฟล์ JSON ไม่ถูกต้องสำหรับรายการโครงการ');
        }
      } catch {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="dashboard-wrapper">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileUploadInputRef}
        multiple
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,*/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
      <input
        type="file"
        ref={jsonImportInputRef}
        accept=".prime,.json"
        style={{ display: 'none' }}
        onChange={handleImportProjectFile}
      />

      {/* Hero / Header Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            <div className="hero-tag" style={{ marginBottom: 0 }}>
              <span className="hero-tag-dot"></span>
              ระบบบริหารจัดการโครงการประกวดราคาภาครัฐ | e-GP Tracking & Proposal System
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#6EE7B7',
                padding: '0.3rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
              title="ระบบเชื่อมต่อ Google Drive & Google Sheets อัตโนมัติ"
            >
              <Cloud size={13} /> Google Cloud & Drive Ready
            </span>
          </div>
          <h1 className="hero-title">แดชบอร์ดโครงการประกวดราคา & จัดทำข้อเสนอ</h1>
          <p className="hero-subtitle">
            ติดตามสถานะประกาศจัดจ้าง e-GP กรมบัญชีกลาง บันทึกกำหนดเวลายื่นข้อเสนอ และบริหารจัดการเอกสาร TOR สู่ระบบจัดทำข้อเสนอโครงการอัตโนมัติ
          </p>
        </div>

        <div className="dashboard-hero-actions">
          <button
            type="button"
            className="btn btn-secondary hero-btn"
            onClick={() => jsonImportInputRef.current?.click()}
            title="นำเข้าไฟล์แพ็กเกจโครงการ (.prime) พร้อมสัญญา/ไฟล์แนบ หรือไฟล์ร่าง (.json) ที่เพื่อนร่วมงานส่งให้"
          >
            <Upload size={16} /> นำเข้าโครงการ (.prime / .json)
          </button>
          <button
            type="button"
            className="btn btn-secondary hero-btn"
            onClick={handleExportAllJson}
            title="สำรองข้อมูลทุกโครงการเป็นไฟล์ JSON"
          >
            <Save size={16} /> สำรองข้อมูล (JSON)
          </button>
          <button
            type="button"
            className="btn btn-secondary hero-btn"
            onClick={() => {
              if (onOpenMasterLibraries) {
                onOpenMasterLibraries();
              } else {
                setShowMasterLibrariesModal(true);
              }
            }}
            title="จัดการคลังผลงานโครงการ คลังบุคลากร และข้อมูลบริษัทกลาง"
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.22)',
              borderColor: 'rgba(129, 140, 248, 0.45)',
              color: '#EEF2FF',
              fontWeight: 600,
            }}
          >
            <Library size={16} color="#A5B4FC" /> จัดการคลังข้อมูลกลาง
          </button>
          {onOpenUserManagement && (
            <button
              type="button"
              className="btn btn-secondary hero-btn"
              onClick={onOpenUserManagement}
              title="จัดการรายชื่อ Gmail ที่ได้รับสิทธิ์เข้าใช้งานระบบ"
              style={{ backgroundColor: 'rgba(241, 184, 68, 0.2)', borderColor: 'rgba(241, 184, 68, 0.4)', color: '#FEF08A' }}
            >
              <Users size={16} /> จัดการสิทธิ์เข้าใช้งาน
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary hero-btn"
            onClick={onResetProjectsToDefault}
            title="โหลดตัวอย่างโครงการเริ่มต้นของ Prime Digital"
          >
            <RotateCcw size={16} /> โหลดตัวอย่าง
          </button>
          {/* Hidden Smart File Input (Accepts Multiple Files) */}
          <input
            type="file"
            ref={smartFileInputRef}
            style={{ display: 'none' }}
            multiple
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleProcessSmartFiles(e.target.files);
              }
              e.target.value = '';
            }}
          />
          <button
            type="button"
            className="btn btn-primary hero-btn-cta"
            onClick={() => smartFileInputRef.current?.click()}
            title="ลากหรือเลือกไฟล์ประกาศ e-GP / TOR เพื่อสกัดข้อมูลและสร้างโครงการอัตโนมัติ"
            style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)',
            }}
          >
            <Sparkles size={18} /> สกัดข้อมูลไฟล์ e-GP
          </button>
          <button
            type="button"
            className="btn btn-secondary hero-btn"
            onClick={() => {
              const target = projects.find((p) => p.id === (editingProject?.id)) || projects[0];
              if (target) {
                setSyncGoogleModalProject(target);
              } else {
                alert('กรุณาสร้างหรือเลือกโครงการอย่างน้อย 1 โครงการก่อนซิงค์');
              }
            }}
            title="ซิงค์ข้อมูลโครงการทั้งเล่มและเอกสารสัญญาขึ้น Google Drive & Sheets"
            style={{
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              borderColor: '#BFDBFE',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CloudUpload size={16} color="#2563EB" />
            <span>ซิงค์ Google Drive & Sheets</span>
          </button>

          <button
            type="button"
            className="btn btn-primary hero-btn-cta"
            onClick={() => setShowCloudPickerModal(true)}
            title="เลือกดึงร่างข้อเสนอโครงการจาก Google Cloud ลงมาทำงานในเซสชันนี้ทีละเรื่อง"
            style={{
              backgroundColor: '#16A34A',
              borderColor: '#15803D',
              color: '#FFFFFF',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CloudDownload size={18} /> 📥 ดึงเล่มข้อเสนอจาก Google Cloud
          </button>

          <button
            type="button"
            className="btn btn-primary hero-btn-cta"
            onClick={handleOpenCreateModal}
          >
            <Plus size={18} /> เพิ่มโครงการใหม่
          </button>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="dashboard-stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon-wrapper total-icon">
            <Layers size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">โครงการทั้งหมด</span>
            <div className="stat-value-group">
              <span className="stat-number">{totalProjects}</span>
              <span className="stat-unit">โครงการ</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-draft">
          <div className="stat-icon-wrapper draft-icon">
            <Edit3 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ร่างข้อเสนอ</span>
            <div className="stat-value-group">
              <span className="stat-number">{draftCount}</span>
              <span className="stat-unit">กำลังจัดทำ</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-submitted">
          <div className="stat-icon-wrapper submitted-icon">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ยื่นแล้วใน e-GP</span>
            <div className="stat-value-group">
              <span className="stat-number">{submittedCount}</span>
              <span className="stat-unit">ยื่นสำเร็จ</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-cancelled">
          <div className="stat-icon-wrapper cancelled-icon">
            <XCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ยกเลิก</span>
            <div className="stat-value-group">
              <span className="stat-number">{cancelledCount}</span>
              <span className="stat-unit">ยกเลิกประกวด</span>
            </div>
          </div>
        </div>

        <div className="stat-card stat-budget">
          <div className="stat-icon-wrapper budget-icon">
            <Building size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">มูลค่างบประมาณรวม</span>
            <div className="stat-value-group">
              <span className="stat-number font-mono">{totalBudget.toLocaleString()}</span>
              <span className="stat-unit">บาท</span>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderColor: '#BBF7D0', background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)' }}>
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
            <FileText size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">ความสมบูรณ์ข้อกำหนดรวม</span>
            <div className="stat-value-group">
              <span className="stat-number font-mono" style={{ color: '#15803D' }}>
                {globalCompletedClauses} / {globalTotalClauses}
              </span>
              <span className="stat-unit" style={{ color: '#16A34A', fontWeight: 600 }}>
                ข้อ ({globalClausesPercent}%)
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#15803D', marginTop: '2px' }}>
              สมบูรณ์ 100% แล้ว {fullyCompleteProjectsCount} โครงการ
            </div>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="dashboard-filter-bar">
        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="ค้นหาด้วยชื่อโครงการ, รหัส e-GP, หรือหน่วยงานผู้ว่าจ้าง..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              ×
            </button>
          )}
        </div>

        <div className="filter-tabs-wrapper">
          <button
            type="button"
            className={`filter-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            ทั้งหมด ({totalProjects})
          </button>
          <button
            type="button"
            className={`filter-tab-btn filter-draft ${statusFilter === 'draft' ? 'active' : ''}`}
            onClick={() => setStatusFilter('draft')}
          >
            ร่าง ({draftCount})
          </button>
          <button
            type="button"
            className={`filter-tab-btn filter-submitted ${statusFilter === 'submitted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('submitted')}
          >
            ยื่นแล้ว ({submittedCount})
          </button>
          <button
            type="button"
            className={`filter-tab-btn filter-cancelled ${statusFilter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            ยกเลิก ({cancelledCount})
          </button>
        </div>

        <div className="sort-select-wrapper">
          <Filter size={15} />
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
          >
            <option value="deadline">เรียงตาม: กำหนดยื่นข้อเสนอ</option>
            <option value="announcement">เรียงตาม: วันที่ประกาศ</option>
            <option value="budget">เรียงตาม: วงเงินงบประมาณ</option>
          </select>
        </div>

        {/* Global Collapse / Expand All Button */}
        {filteredProjects.length > 0 && (
          <button
            type="button"
            className="btn-toggle-all"
            onClick={() => {
              const allCollapsed = filteredProjects.every((p) => !!collapsedProjects[p.id]);
              handleToggleAllProjects(!allCollapsed);
            }}
            title={filteredProjects.every((p) => !!collapsedProjects[p.id]) ? 'คลิกเพื่อขยายรายละเอียดทุกโครงการ' : 'คลิกเพื่อย่อทุกโครงการ แสดงเฉพาะข้อมูลสำคัญ'}
          >
            {filteredProjects.every((p) => !!collapsedProjects[p.id]) ? (
              <>
                <Maximize2 size={14} />
                <span>ขยายทั้งหมด</span>
              </>
            ) : (
              <>
                <Minimize2 size={14} />
                <span>ย่อทั้งหมด</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Project Cards List */}
      <div className="projects-grid">
        {filteredProjects.length === 0 ? (
          <div className="empty-projects-state">
            <div className="empty-icon-box">
              <Search size={40} />
            </div>
            <h3>ไม่พบโครงการที่ค้นหา</h3>
            <p>ลองปรับคำค้นหา หรือสร้างโครงการประกวดราคาใหม่</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
              style={{ marginTop: '1rem' }}
            >
              <Plus size={16} /> สร้างโครงการใหม่
            </button>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const summary = computeProjectCompletion(project);
            const announcementDocs = (project.attachments || []).filter((a) => a.category === 'announcement');
            const torDocs = (project.attachments || []).filter((a) => a.category === 'tor');
            const otherDocs = (project.attachments || []).filter((a) => a.category === 'other');
            const isCollapsed = !!collapsedProjects[project.id];

            return (
              <div
                key={project.id}
                className={`project-card status-card-${project.status} ${isCollapsed ? 'project-card-collapsed' : ''}`}
              >
                {/* Card Top: Code, Quick Status Selector, Actions */}
                <div className="project-card-header">
                  <div className="card-header-left">
                    <span className="project-code-tag">{project.projectCode || 'ไม่มีรหัส'}</span>
                    
                    {/* Status Select Badge */}
                    <div className="status-dropdown-wrapper">
                      <select
                        className={`status-select-badge status-${project.status}`}
                        value={project.status}
                        onChange={(e) => handleQuickStatusChange(project.id, e.target.value as ProposalStatus)}
                        title="คลิกเพื่อเปลี่ยนสถานะโครงการ"
                      >
                        <option value="draft">🟡 ร่าง (Draft)</option>
                        <option value="submitted">🟢 ยื่นแล้ว (Submitted)</option>
                        <option value="cancelled">🔴 ยกเลิก (Cancelled)</option>
                      </select>
                    </div>
                  </div>

                  <div className="card-header-actions">
                    {/* Toggle Collapse/Expand Button */}
                    <button
                      type="button"
                      className={`btn-toggle-card ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}
                      onClick={() => toggleProjectExpand(project.id)}
                      title={isCollapsed ? 'คลิกเพื่อขยายรายละเอียดโครงการ' : 'คลิกเพื่อย่อการแสดงผลโครงการนี้'}
                    >
                      <span>{isCollapsed ? 'ขยาย' : 'ย่อ'}</span>
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>

                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={() => handleOpenEditModal(project)}
                      title="แก้ไขข้อมูลโครงการ"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-action-btn delete-btn"
                      onClick={() => handleDeleteProject(project.id, project.projectTitle)}
                      title="ลบโครงการนี้"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {isCollapsed ? (
                  /* Collapsed View: แสดงแค่ชื่อโครงการสั้นๆ / กำหนดเวลายื่น / งบประมาณ / สถานะการทำข้อเสนอโครงการ */
                  <div className="project-card-collapsed-body">
                    {/* 1. ชื่อโครงการสั้นๆ */}
                    <div className="collapsed-title-row">
                      <h3
                        className="project-title-link collapsed-title"
                        onClick={() => onSelectProject(project.id)}
                        title={`คลิกเพื่อจัดทำข้อเสนอ: ${project.projectTitle}`}
                      >
                        {project.projectTitle}
                      </h3>
                    </div>

                    {/* 2. กำหนดเวลายื่น / 3. งบประมาณ / 4. สถานะการทำข้อเสนอโครงการ */}
                    <div className="collapsed-meta-grid">
                      {/* งบประมาณ */}
                      <div className="collapsed-meta-chip">
                        <span className="chip-label">งบประมาณ:</span>
                        <span className="chip-value-budget">
                          {(project.budgetAmount || 0).toLocaleString()} บาท
                        </span>
                      </div>

                      {/* กำหนดเวลายื่น */}
                      <div className="collapsed-meta-chip">
                        <Clock size={12} className="meta-icon" />
                        <span className="chip-label">กำหนดเวลายื่น:</span>
                        <span className="chip-value-date">
                          {formatThaiDate(project.submissionDeadline, true)}
                        </span>
                        <div className="collapsed-deadline-badge">
                          {getDeadlineBadge(project.submissionDeadline, project.status)}
                        </div>
                      </div>

                      {/* สถานะการทำข้อเสนอโครงการ */}
                      <div className="collapsed-meta-chip completion-chip">
                        <FileText size={12} className="meta-icon" />
                        <span className="chip-label">สถานะข้อเสนอ:</span>
                        <span
                          className="chip-completion-status"
                          style={{
                            fontWeight: 700,
                            color: summary.torPercent === 100 ? '#15803D' : summary.torPercent >= 50 ? '#B45309' : '#334155',
                          }}
                        >
                          {summary.completedTorClauses}/{summary.totalTorClauses} ข้อ ({summary.torPercent}%)
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '9999px',
                            backgroundColor: summary.torPercent === 100 ? '#DCFCE7' : summary.torPercent >= 50 ? '#FEF3C7' : '#F1F5F9',
                            color: summary.torPercent === 100 ? '#166534' : summary.torPercent >= 50 ? '#92400E' : '#475569',
                          }}
                        >
                          {summary.torPercent === 100 ? '✓ ข้อมูลครบถ้วน' : 'กำลังจัดทำ'}
                        </span>
                      </div>
                    </div>

                    {/* Collapsed Footer Actions */}
                    <div className="collapsed-card-footer">
                      <button
                        type="button"
                        className="btn-link-expand"
                        onClick={() => toggleProjectExpand(project.id)}
                        title="ขยายดูรายละเอียดทั้งหมด (TOR, ประกาศจัดจ้าง, งวดงาน)"
                      >
                        <ChevronDown size={14} />
                        <span>ขยายรายละเอียด</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm footer-btn-edit-proposal collapsed-action-btn"
                        onClick={() => onSelectProject(project.id)}
                        title="เข้าสู่ระบบจัดทำข้อเสนอโครงการ"
                      >
                        <span>จัดทำข้อเสนอโครงการ</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Card Title & Agency */}
                    <div className="project-card-body">
                  <h3
                    className="project-title-link"
                    onClick={() => onSelectProject(project.id)}
                    title="คลิกเพื่อเข้าสู่ระบบจัดทำข้อเสนอโครงการ"
                  >
                    {project.projectTitle}
                  </h3>

                  <div className="project-meta-agency">
                    <Building size={14} className="meta-icon" />
                    <span>{project.clientAgency || 'ไม่ได้ระบุหน่วยงานผู้ว่าจ้าง'}</span>
                  </div>

                  {/* Budget & Duration & e-GP Link Bar */}
                  <div className="project-budget-egp-row">
                    <div className="project-budget-chip">
                      <span className="budget-label">งบประมาณ:</span>
                      <span className="budget-amount">{(project.budgetAmount || 0).toLocaleString()} บาท</span>
                    </div>

                    <div className="project-budget-chip" style={{ backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                      <Clock size={12} style={{ color: 'var(--primary-700)' }} />
                      <span className="budget-label">ระยะเวลา:</span>
                      <span className="budget-amount" style={{ color: 'var(--slate-800)' }}>
                        {(project.proposalData?.section1?.projectDurationDays || 180).toLocaleString()} วัน
                      </span>
                    </div>

                    {/* e-GP Link button */}
                    {project.egpUrl ? (
                      <a
                        href={project.egpUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="egp-link-button"
                        title="เปิดหน้าประกาศจัดจ้าง e-GP กรมบัญชีกลางในแท็บใหม่"
                      >
                        <ExternalLink size={13} />
                        <span>ประกาศ e-GP</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="egp-link-empty-btn"
                        onClick={() => handleOpenEditModal(project)}
                      >
                        <Plus size={12} /> เพิ่มลิงก์ e-GP
                      </button>
                    )}
                  </div>

                  {/* Dates & Countdown Section */}
                  <div className="dates-timeline-box">
                    <div className="date-item">
                      <div className="date-header">
                        <Calendar size={13} />
                        <span>วันที่ประกาศจัดจ้าง:</span>
                      </div>
                      <div className="date-value">
                        {formatThaiDate(project.announcementDate)}
                      </div>
                    </div>

                    <div className="date-item">
                      <div className="date-header">
                        <Clock size={13} />
                        <span>กำหนดเวลายื่นข้อเสนอ:</span>
                      </div>
                      <div className="date-value highlight">
                        {formatThaiDate(project.submissionDeadline, true)}
                      </div>
                    </div>

                    {/* Countdown / Status Alert Badge */}
                    <div className="deadline-badge-container">
                      {getDeadlineBadge(project.submissionDeadline, project.status)}
                    </div>
                  </div>

                  {/* Cloud Collaboration Status: Who is doing & How far */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      padding: '0.45rem 0.75rem',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} style={{ color: '#2563EB' }} />
                      <span style={{ color: 'var(--slate-500)' }}>ผู้จัดทำล่าสุด:</span>
                      <strong style={{ color: 'var(--slate-800)' }}>
                        {project.lastModifiedBy || 'ไม่ระบุผู้จัดทำ'}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--slate-500)' }}>สถานะ:</span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: summary.torPercent === 100 ? '#15803D' : '#0369A1',
                          backgroundColor: summary.torPercent === 100 ? '#DCFCE7' : '#E0F2FE',
                          padding: '1px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {project.currentStage || (summary.torPercent === 100 ? 'เสร็จสมบูรณ์' : `ทำถึง: TOR ${summary.completedTorClauses}/${summary.totalTorClauses} ข้อ`)}
                      </span>
                    </div>
                  </div>

                  {/* Status Note if available */}
                  {project.statusNote && (
                    <div className="project-status-note">
                      <span className="note-label">หมายเหตุ:</span> {project.statusNote}
                    </div>
                  )}

                  {/* Proposal Report Clauses & Topics Completion Summary */}
                  <div
                    style={{
                      backgroundColor: summary.torPercent === 100 ? '#F0FDF4' : summary.torPercent >= 50 ? '#FFFBEB' : '#F8FAFC',
                      border: `1px solid ${summary.torPercent === 100 ? '#BBF7D0' : summary.torPercent >= 50 ? '#FDE68A' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.55rem',
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} style={{ color: summary.torPercent === 100 ? '#16A34A' : '#D97706' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--slate-800)' }}>
                          ความสมบูรณ์รายงาน:
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: summary.torPercent === 100 ? '#15803D' : summary.torPercent >= 50 ? '#B45309' : '#334155' }}>
                          {summary.completedTorClauses} / {summary.totalTorClauses} ข้อ
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            backgroundColor: summary.torPercent === 100 ? '#DCFCE7' : summary.torPercent >= 50 ? '#FEF3C7' : '#E2E8F0',
                            color: summary.torPercent === 100 ? '#166534' : summary.torPercent >= 50 ? '#92400E' : '#475569',
                          }}
                        >
                          {summary.torPercent}% {summary.torPercent === 100 ? '✓ ข้อมูลครบถ้วน' : 'กำลังจัดทำ'}
                        </span>

                        {summary.totalTorClauses > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleChecklist(project.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '0.75rem',
                              color: 'var(--primary-700)',
                              fontWeight: 600,
                              padding: '2px 4px',
                            }}
                            title="คลิกเพื่อเปิด/ปิดดูรายละเอียดสถานะของแต่ละข้อ"
                          >
                            <span>{expandedChecklists[project.id] ? 'ซ่อนรายข้อ' : 'ดูรายข้อ'}</span>
                            {expandedChecklists[project.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        width: '100%',
                        height: '7px',
                        backgroundColor: '#E2E8F0',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${summary.torPercent}%`,
                          background: summary.torPercent === 100
                            ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                            : summary.torPercent >= 50
                            ? 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)'
                            : 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)',
                          borderRadius: '9999px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>

                    {/* Breakdown by Report Section */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem' }}>
                      <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '4px', color: '#334155' }}>
                        📋 ข้อกำหนด TOR: <strong>{summary.completedTorClauses}/{summary.totalTorClauses} ข้อ</strong>
                      </span>
                      <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '4px', color: '#334155' }}>
                        📅 งวดงาน: <strong>{summary.milestonesComplete}/{summary.milestonesTotal} งวด</strong>
                      </span>
                      <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '4px', color: '#334155' }}>
                        👥 บุคลากร: <strong>{summary.teamComplete}/{summary.teamTotal} ท่าน</strong>
                      </span>
                      <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '4px', color: '#334155' }}>
                        🛡️ ความเสี่ยง: <strong>{summary.riskComplete}/{summary.riskTotal} ประเด็น</strong>
                      </span>
                      <span style={{ backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '4px', color: '#334155' }}>
                        🏆 ผลงาน: <strong>{summary.pastProjectsSelected} โครงการ</strong>
                      </span>
                    </div>

                    {/* Expandable Checklist Details */}
                    {expandedChecklists[project.id] && summary.clausesList.length > 0 && (
                      <div
                        style={{
                          marginTop: '0.4rem',
                          paddingTop: '0.65rem',
                          borderTop: '1px dashed #CBD5E1',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          maxHeight: '260px',
                          overflowY: 'auto',
                        }}
                      >
                        <div style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '2px' }}>
                          สถานะความสมบูรณ์รายข้อ ({summary.clausesList.length} ข้อ):
                        </div>
                        {summary.clausesList.map((clause, cIdx) => (
                          <div
                            key={clause.id || cIdx}
                            style={{
                              backgroundColor: '#FFFFFF',
                              border: `1px solid ${clause.isComplete ? '#BBF7D0' : '#FED7AA'}`,
                              borderRadius: '6px',
                              padding: '6px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                              <span
                                style={{
                                  backgroundColor: clause.isComplete ? '#DCFCE7' : '#FEF3C7',
                                  color: clause.isComplete ? '#166534' : '#B45309',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  flexShrink: 0,
                                }}
                              >
                                {clause.clauseNumber ? `ข้อ ${clause.clauseNumber}` : `ลำดับ ${cIdx + 1}`}
                              </span>
                              <span
                                style={{
                                  color: 'var(--slate-800)',
                                  fontWeight: 500,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={clause.title}
                              >
                                {clause.title}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              {clause.isComplete ? (
                                <span style={{ color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.75rem' }}>
                                  <CheckCircle2 size={13} /> ครบถ้วน
                                </span>
                              ) : (
                                <span style={{ color: '#C2410C', fontSize: '0.725rem', backgroundColor: '#FFF7ED', padding: '1px 6px', borderRadius: '4px', border: '1px solid #FFEDD5', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <AlertCircle size={12} /> ยังขาด: {clause.missingItems.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attachments Section (ประกาศจัดจ้าง & TOR) */}
                  <div className="attachments-section">
                    <div className="attachments-header">
                      <div className="attachments-title">
                        <Paperclip size={14} />
                        <span>เอกสารแนบ ({(project.attachments || []).length})</span>
                      </div>
                      
                      <div className="attachment-add-buttons">
                        <button
                          type="button"
                          className="btn-add-file"
                          onClick={() => {
                            setUploadTargetProjectId(project.id);
                            setUploadCategory('announcement');
                            fileUploadInputRef.current?.click();
                          }}
                          title="อัปโหลดประกาศจัดจ้าง (เลือกได้หลายไฟล์พร้อมกัน)"
                        >
                          <Upload size={12} /> ประกาศจัดจ้าง
                        </button>
                        <button
                          type="button"
                          className="btn-add-file btn-add-tor"
                          onClick={() => {
                            setUploadTargetProjectId(project.id);
                            setUploadCategory('tor');
                            fileUploadInputRef.current?.click();
                          }}
                          title="อัปโหลดไฟล์ TOR (เลือกได้หลายไฟล์พร้อมกัน)"
                        >
                          <Upload size={12} /> ไฟล์ TOR
                        </button>
                        <button
                          type="button"
                          className="btn-add-file"
                          style={{ borderColor: '#DDD6FE', color: '#7C3AED', backgroundColor: '#F5F3FF' }}
                          onClick={() => {
                            setUploadTargetProjectId(project.id);
                            setUploadCategory('other');
                            fileUploadInputRef.current?.click();
                          }}
                          title="อัปโหลดเอกสารอื่นๆ เพิ่มเติม (BOQ / ตารางราคา / เอกสารแนบ)"
                        >
                          <Paperclip size={12} /> เอกสารอื่นๆ
                        </button>
                      </div>
                    </div>

                    {/* Attachments List */}
                    {(project.attachments || []).length > 0 ? (
                      <div className="attachments-list">
                        {(project.attachments || []).map((att) => (
                          <div key={att.id} className={`attachment-item-pill att-${att.category}`}>
                            <span className="att-tag">
                              {att.category === 'announcement' ? 'ประกาศ' : att.category === 'tor' ? 'TOR' : 'แนบ'}
                            </span>
                            <span className="att-name" title={att.name}>
                              {att.name}
                            </span>
                            <span className="att-size">
                              ({(att.size / (1024 * 1024)).toFixed(1)} MB)
                            </span>

                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(att)}
                              className="att-icon-btn"
                              title="ดาวน์โหลดไฟล์"
                            >
                              <Download size={12} />
                            </button>

                            {/* If TOR, show import button */}
                            {att.category === 'tor' && (
                              <button
                                type="button"
                                className="att-icon-btn att-import-btn"
                                onClick={() => {
                                  onSelectProject(project.id);
                                  onOpenTorImporterForProject(project.id, att.id);
                                }}
                                title="นำเข้าขอบเขตงานจาก TOR นี้เข้าสู่ข้อเสนอโครงการ"
                              >
                                <Sparkles size={12} /> นำเข้าข้อกำหนด
                              </button>
                            )}

                            <button
                              type="button"
                              className="att-icon-btn att-delete-btn"
                              onClick={() => handleDeleteAttachment(project.id, att.id)}
                              title="ลบไฟล์แนบนี้"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="attachments-empty-hint">
                        ยังไม่มีการอัปโหลดประกาศจัดจ้างหรือไฟล์ TOR (คลิกปุ่มด้านบนเพื่อแนบไฟล์)
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="project-card-footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.4rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: '#EFF6FF',
                        borderColor: '#BFDBFE',
                        color: '#1D4ED8',
                        fontWeight: 600,
                      }}
                      onClick={() => handleExportPrimePackage(project)}
                      disabled={isExportingPrimePackage === project.id}
                      title="ส่งออกแพ็กเกจโครงการฉบับสมบูรณ์ (.prime) รวมสัญญา ไฟล์แนบ และรูปภาพครบ 100% สำหรับส่งต่อให้เพื่อนร่วมงานทำงานต่อได้ทันที"
                    >
                      <Download size={14} />
                      <span>{isExportingPrimePackage === project.id ? 'กำลังรวมแพ็กเกจ...' : '📦 ส่งต่อโครงการ (.prime)'}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                      onClick={() => handleExportSingleProject(project)}
                      title="ส่งออกไฟล์ร่างข้อเสนอโครงการนี้ (.json) เพื่อแชร์หรือส่งต่อให้เพื่อนร่วมงานนำไปทำต่อในเครื่องตนเอง"
                    >
                      <Download size={14} />
                      <span>ร่าง (.json)</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline footer-btn-export"
                      onClick={() => handleExportDocx(project)}
                      title="สร้างและดาวน์โหลดไฟล์ข้อเสนอโครงการเป็น Microsoft Word (.docx) พร้อมตัวเลือกแนบเอกสารสัญญา PDF"
                    >
                      <FileDown size={14} /> ดาวน์โหลด Word
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{
                        fontSize: '0.8rem',
                        padding: '0.4rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: '#EFF6FF',
                        borderColor: '#BFDBFE',
                        color: '#1D4ED8',
                        fontWeight: 600,
                      }}
                      onClick={() => setSyncGoogleModalProject(project)}
                      title="ซิงค์ข้อมูลทั้งโครงการขึ้น Google Sheet และอัปโหลดไฟล์สัญญา/TOR ขึ้น Google Drive"
                    >
                      <CloudUpload size={14} color="#2563EB" />
                      <span>ซิงค์ Google</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary footer-btn-edit-proposal"
                    onClick={() => onSelectProject(project.id)}
                  >
                    <span>จัดทำข้อเสนอโครงการ</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </>
            )}
          </div>
            );
          })
        )}
      </div>

      {/* Edit / Create Project Modal */}
      {editingProject && (
        <div className="modal-overlay">
          <div
            className="modal-container dashboard-project-modal"
            style={{
              maxWidth: '880px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div className="modal-title-group">
                <div className="modal-header-badge">
                  <Building2 size={22} color="#F1B844" />
                </div>
                <div className="modal-header-text">
                  <h2>{isCreatingNew ? 'สร้างโครงการประกวดราคาใหม่' : 'แก้ไขข้อมูลโครงการประกวดราคา'}</h2>
                  <p>ระบุข้อมูลประกาศจัดซื้อจัดจ้างภาครัฐ e-GP แนบเอกสาร TOR และรายละเอียดงบประมาณ</p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseProjectModal}
                title="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSaveProjectModal}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 auto',
                minHeight: 0,
                overflow: 'hidden',
              }}
            >
              <div
                className="modal-body"
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                }}
              >
                {/* Hidden File Inputs for Announcement, TOR, and General attachments */}
                <input
                  type="file"
                  ref={announcementFileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleProcessSmartFiles(e.target.files, 'announcement');
                    }
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  ref={torFileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleProcessSmartFiles(e.target.files, 'tor');
                    }
                    e.target.value = '';
                  }}
                />
                <input
                  type="file"
                  ref={generalFileInputRef}
                  style={{ display: 'none' }}
                  multiple
                  accept="*/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleProcessSmartFiles(e.target.files, 'other');
                    }
                    e.target.value = '';
                  }}
                />

                {/* Smart Dropzone for e-GP Announcement / TOR / All attachments */}
                <div
                  className={`smart-dropzone ${isDraggingDoc ? 'dragging' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingDoc(true);
                  }}
                  onDragLeave={() => setIsDraggingDoc(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingDoc(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleProcessSmartFiles(e.dataTransfer.files);
                    }
                  }}
                  onClick={() => smartFileInputRef.current?.click()}
                  title="คลิกเพื่อเลือกไฟล์ หรือลากไฟล์ประกาศจัดจ้าง/TOR/เอกสารแนบมาวาง (รองรับหลายไฟล์พร้อมกัน)"
                >
                  <div className="smart-dropzone-icon">
                    {isAnalyzingDoc ? (
                      <Clock size={22} className="animate-spin" />
                    ) : (
                      <Sparkles size={22} />
                    )}
                  </div>
                  <div className="smart-dropzone-title">
                    {isAnalyzingDoc
                      ? '🔍 กำลังประมวลผลและสกัดข้อมูลจากเอกสารทางการ...'
                      : '⚡ ลากไฟล์ประกาศจัดจ้าง, ไฟล์ TOR และเอกสารแนบทั้งหมดมาวางที่นี่'}
                  </div>
                  <div className="smart-dropzone-desc">
                    {isAnalyzingDoc
                      ? 'ระบบกำลังวิเคราะห์รหัสโครงการ, ชื่อโครงการ, หน่วยงาน, งบประมาณ และบันทึกไฟล์ถาวร...'
                      : 'สามารถแนบได้กี่ไฟล์ก็ได้ ไม่จำกัดจำนวน (ประกาศจัดจ้าง, TOR, BOQ, ตารางราคา ฯลฯ) ระบบจะบันทึกทุกไฟล์ให้เรียกดูและดาวน์โหลดได้ตลอดเวลา'}
                  </div>

                  {/* Quick Action Buttons for Specific File Categories */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.65rem',
                      marginTop: '0.5rem',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#F0FDF4',
                        borderColor: '#86EFAC',
                        color: '#15803D',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        announcementFileInputRef.current?.click();
                      }}
                      title="เลือกไฟล์ประกาศจัดจ้าง (เลือกได้หลายไฟล์)"
                    >
                      <Upload size={14} /> 📄 แนบประกาศจัดจ้าง (PDF)
                    </button>
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#EFF6FF',
                        borderColor: '#93C5FD',
                        color: '#1D4ED8',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        torFileInputRef.current?.click();
                      }}
                      title="เลือกไฟล์ TOR (เลือกได้หลายไฟล์)"
                    >
                      <Upload size={14} /> 📘 แนบไฟล์ TOR (PDF / Word)
                    </button>
                    <button
                      type="button"
                      className="btn-modal-cancel"
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: '#F5F3FF',
                        borderColor: '#DDD6FE',
                        color: '#7C3AED',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        generalFileInputRef.current?.click();
                      }}
                      title="เลือกไฟล์เอกสารอื่นๆ (BOQ / ตารางราคา / เอกสารแนบ)"
                    >
                      <Paperclip size={14} /> 📎 แนบเอกสารอื่นๆ (BOQ / เอกสารแนบ)
                    </button>
                  </div>

                  <div className="smart-dropzone-badges">
                    <span className="smart-dropzone-badge">📄 ประกาศจัดจ้าง (.PDF)</span>
                    <span className="smart-dropzone-badge">📘 เอกสาร TOR (.PDF / .DOCX)</span>
                    <span className="smart-dropzone-badge">📎 แนบกี่ไฟล์ก็ได้ไม่จำกัด</span>
                    <span className="smart-dropzone-badge">💾 บันทึกทุกไฟล์ถาวร</span>
                  </div>
                </div>

                {/* Analysis Result Alert */}
                {docAnalysisMsg && (
                  <div className={`analysis-alert ${docAnalysisMsg.type}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600 }}>
                      {docAnalysisMsg.type === 'success' && <CheckCircle2 size={16} />}
                      {docAnalysisMsg.type === 'error' && <AlertCircle size={16} />}
                      {docAnalysisMsg.type === 'info' && <Clock size={16} />}
                      <span>{docAnalysisMsg.text}</span>
                    </div>
                    {docAnalysisMsg.details && docAnalysisMsg.details.length > 0 && (
                      <div className="analysis-alert-details">
                        {docAnalysisMsg.details.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ color: '#059669' }}>✔</span> {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Section: Attached Documents for this Project */}
                {editingProject.attachments && editingProject.attachments.length > 0 && (
                  <div className="modal-section-card" style={{ borderColor: '#CBD5E1' }}>
                    <div className="modal-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div className="modal-section-header-title">
                          <Paperclip size={16} /> เอกสารแนบประจำโครงการ ({editingProject.attachments.length} ไฟล์ที่แนบแล้ว)
                        </div>
                        <span className="modal-section-subtitle">
                          ประกาศ: {editingProject.attachments.filter(a => a.category === 'announcement').length} | TOR: {editingProject.attachments.filter(a => a.category === 'tor').length} | อื่นๆ: {editingProject.attachments.filter(a => a.category === 'other').length} (บันทึกถาวร เรียกดูและดาวน์โหลดได้ตลอดเวลา)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn-modal-cancel"
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          padding: '0.35rem 0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          color: '#059669',
                          borderColor: '#86EFAC',
                          backgroundColor: '#F0FDF4',
                        }}
                        onClick={() => generalFileInputRef.current?.click()}
                        title="แนบไฟล์เอกสารเพิ่มเติมเข้าโครงการนี้ (เลือกได้หลายไฟล์)"
                      >
                        <Plus size={14} /> แนบไฟล์เพิ่ม
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {editingProject.attachments.map((att) => (
                        <div
                          key={att.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '8px',
                            backgroundColor: att.category === 'tor' ? '#EFF6FF' : att.category === 'announcement' ? '#F0FDF4' : '#F5F3FF',
                            border: `1px solid ${att.category === 'tor' ? '#BFDBFE' : att.category === 'announcement' ? '#BBF7D0' : '#DDD6FE'}`,
                            gap: '0.75rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleToggleAttachmentCategory(att.id)}
                              title="คลิกเพื่อสลับหมวดหมู่ระหว่าง ประกาศจัดจ้าง, TOR และ เอกสารแนบ"
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '9999px',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: att.category === 'tor' ? '#2563EB' : att.category === 'announcement' ? '#059669' : '#7C3AED',
                                color: '#FFFFFF',
                                flexShrink: 0,
                              }}
                            >
                              {att.category === 'tor' ? '📘 TOR' : att.category === 'announcement' ? '📄 ประกาศ' : '📎 แนบ'} (สลับหมวด)
                            </button>
                            <span
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                color: 'var(--slate-800)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={att.name}
                            >
                              {att.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', flexShrink: 0 }}>
                              ({(att.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(att)}
                              className="btn-modal-cancel"
                              style={{
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                cursor: 'pointer',
                              }}
                              title="ดาวน์โหลดหรือเปิดดูไฟล์นี้"
                            >
                              <Download size={13} /> ดาวน์โหลด
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveModalAttachment(att.id)}
                              className="btn-modal-cancel"
                              style={{
                                padding: '0.3rem 0.55rem',
                                color: '#EF4444',
                                borderColor: '#FECACA',
                                backgroundColor: '#FEF2F2',
                              }}
                              title="ลบไฟล์แนบนี้ออก"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 1: Core Project Info */}
                <div className="modal-section-card">
                  <div className="modal-section-header">
                    <div className="modal-section-header-title">
                      <Building size={16} /> ข้อมูลหลักของโครงการและหน่วยงานจัดจ้าง
                    </div>
                    <span className="modal-section-subtitle">ข้อมูลอ้างอิงจากระบบ e-GP</span>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        <span>รหัสโครงการ / รหัสประกาศ e-GP</span>
                        <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input font-mono"
                        placeholder="เช่น EGP-67-10492 หรือ รหัสโครงการ 11 หลัก"
                        value={editingProject.projectCode}
                        onChange={(e) =>
                          setEditingProject({ ...editingProject, projectCode: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span>สถานะการจัดทำข้อเสนอ</span>
                        <span className="req-star">*</span>
                      </label>
                      <select
                        className="form-input"
                        value={editingProject.status}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            status: e.target.value as ProposalStatus,
                          })
                        }
                      >
                        <option value="draft">📝 ร่าง (Draft) - อยู่ระหว่างจัดทำ</option>
                        <option value="submitted">✅ ยื่นแล้ว (Submitted) - ยื่นข้อเสนอในระบบแล้ว</option>
                        <option value="cancelled">❌ ยกเลิก (Cancelled) - ยกเลิกการประกวดราคา</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.85rem' }}>
                    <label className="form-label">
                      <span>ชื่อโครงการ (ตามประกาศจัดจ้างทางการ)</span>
                      <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="เช่น โครงการพัฒนาระบบบริการประชาชนดิจิทัลและการบูรณาการข้อมูลอัจฉริยะ"
                      value={editingProject.projectTitle}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, projectTitle: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
                    <label className="form-label">
                      <span>หน่วยงานผู้ว่าจ้าง / เจ้าของโครงการ (เลือกจากรายการพร้อมโลโก้ หรือพิมพ์ใหม่)</span>
                      <span className="req-star">*</span>
                    </label>
                    <ClientAgencySelect
                      value={editingProject.clientAgency || ''}
                      placeholder="เช่น กรมพัฒนาธุรกิจการค้า กระทรวงพาณิชย์"
                      required
                      onChange={(newClientAgency) =>
                        setEditingProject({ ...editingProject, clientAgency: newClientAgency })
                      }
                    />
                  </div>
                </div>

                {/* Section 2: Budget & Timeline */}
                <div className="modal-section-card">
                  <div className="modal-section-header">
                    <div className="modal-section-header-title">
                      <Calendar size={16} /> วงเงินงบประมาณและกำหนดการ e-GP
                    </div>
                    <span className="modal-section-subtitle">วงเงิน ระยะเวลาดำเนินงาน และเวลาที่ต้องยื่นเสนอราคา</span>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        <span>วงเงินงบประมาณ (บาท)</span>
                        <span className="req-star">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-input font-mono"
                        placeholder="เช่น 7500000"
                        value={editingProject.budgetAmount}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            budgetAmount: parseFloat(e.target.value) || 0,
                          })
                        }
                        required
                      />
                      {editingProject.budgetAmount > 0 && (
                        <span className="field-highlight-hint">
                          ฿ {editingProject.budgetAmount.toLocaleString('th-TH')} บาท
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        <span>ระยะเวลาดำเนินโครงการ (วัน)</span>
                        <span className="req-star">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-input font-mono"
                        placeholder="เช่น 180, 120, 90, 240 หรือ 360"
                        value={editingProject.proposalData?.section1?.projectDurationDays ?? 180}
                        onChange={(e) => {
                          const val = e.target.value;
                          const days = val === '' ? 0 : parseInt(val, 10) || 0;
                          const months = Math.max(1, Math.round(days / 30));
                          const curSection1 = editingProject.proposalData?.section1 || {
                            background: '',
                            objectives: [],
                            expectedBenefits: [],
                            targetAudience: '',
                            projectScopeOverview: '',
                            scopeItems: [],
                            budgetAmount: editingProject.budgetAmount,
                          };
                          setEditingProject({
                            ...editingProject,
                            proposalData: {
                              ...editingProject.proposalData,
                              section1: {
                                ...curSection1,
                                projectDurationDays: days,
                                projectDurationMonths: months,
                              },
                            },
                          });
                        }}
                        required
                      />
                      <span className="field-hint">
                        {(editingProject.proposalData?.section1?.projectDurationDays ?? 180).toLocaleString()} วัน (~{Math.max(1, Math.round((editingProject.proposalData?.section1?.projectDurationDays ?? 180) / 30))} เดือน)
                      </span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">วันที่ประกาศจัดจ้าง</label>
                      <input
                        type="date"
                        className="form-input"
                        value={editingProject.announcementDate || ''}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            announcementDate: e.target.value,
                          })
                        }
                      />
                      <span className="field-hint">วันที่เผยแพร่ TOR/ประกาศ</span>
                    </div>

                    <div className="form-group">
                      <label className="form-label">วันเวลายื่นข้อเสนอในระบบ</label>
                      <input
                        type="datetime-local"
                        className="form-input font-mono"
                        value={editingProject.submissionDeadline || ''}
                        onChange={(e) =>
                          setEditingProject({
                            ...editingProject,
                            submissionDeadline: e.target.value,
                          })
                        }
                      />
                      <span className="field-hint">ระบบจะคำนวณเวลานับถอยหลัง</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        <span>ลิงก์หน้าประกาศจัดจ้าง e-GP กรมบัญชีกลาง (URL)</span>
                      </label>
                      {editingProject.egpUrl && editingProject.egpUrl.startsWith('http') && (
                        <a
                          href={editingProject.egpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--primary-600)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            textDecoration: 'none',
                            fontWeight: 600,
                          }}
                        >
                          <ExternalLink size={12} /> ทดสอบเปิดลิงก์
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      className="form-input font-mono"
                      placeholder="https://process3.gprocurement.go.th/egp2procmain/..."
                      value={editingProject.egpUrl || ''}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, egpUrl: e.target.value })
                      }
                      style={{ marginTop: '0.35rem' }}
                    />
                    <span className="field-hint">
                      ใส่ลิงก์ระบบจัดซื้อจัดจ้างภาครัฐ เพื่อให้ทีมงานสามารถคลิกเปิดดูประกาศทางการได้ทันที
                    </span>
                  </div>
                </div>

                {/* Section 3: Notes */}
                <div className="modal-section-card">
                  <div className="modal-section-header">
                    <div className="modal-section-header-title">
                      <FileText size={16} /> หมายเหตุและบันทึกความคืบหน้า
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="เช่น กำลังตรวจความสอดคล้องของ TOR ส่วนที่ 3, ยื่นเอกสารและหลักประกันสัญญาแล้ว..."
                      value={editingProject.statusNote || ''}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, statusNote: e.target.value })
                      }
                    />
                    <span className="field-hint">บันทึกข้อความสรุปสถานะหรือสิ่งที่ต้องเตรียมสำหรับทีมงาน</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <div className="modal-footer-hint">
                  <Sparkles size={14} style={{ color: 'var(--gold-600)' }} />
                  <span>สามารถแนบไฟล์ประกาศจัดจ้างและ TOR เพิ่มเติมได้ที่หน้ารายการโครงการ</span>
                </div>
                <div className="modal-footer-actions">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={handleCloseProjectModal}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="btn-modal-submit">
                    <Save size={16} /> {isCreatingNew ? 'สร้างและบันทึกโครงการ' : 'บันทึกข้อมูลโครงการ'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Master Libraries Modal */}
      <MasterLibraryManagementModal
        isOpen={showMasterLibrariesModal}
        onClose={() => setShowMasterLibrariesModal(false)}
      />

      {/* Cloud Proposal Picker Modal (เลือกดึงเล่มข้อเสนอจาก Cloud ลงมาทำทีละเรื่อง) */}
      <CloudProposalPickerModal
        isOpen={showCloudPickerModal}
        onClose={() => setShowCloudPickerModal(false)}
        onSelectProject={(pulledProj) => {
          // เพิ่มโครงการลงในลิสต์ หรืออัปเดตโครงการเดิมถ้ามีอยู่แล้ว
          const exists = projects.some((p) => p.id === pulledProj.id || (p.projectCode && p.projectCode === pulledProj.projectCode));
          const updated = exists
            ? projects.map((p) => (p.id === pulledProj.id || (p.projectCode && p.projectCode === pulledProj.projectCode) ? pulledProj : p))
            : [pulledProj, ...projects];
          onUpdateProjects(updated);
          onSelectProject(pulledProj.id);
        }}
        onCreateNewProject={handleOpenCreateModal}
      />

      {/* Export DOCX Confirmation / Annex Modal */}
      {exportDocxModalProject && (
        <ExportDocxModal
          isOpen={!!exportDocxModalProject}
          proposalData={exportDocxModalProject.proposalData}
          onClose={() => setExportDocxModalProject(null)}
        />
      )}

      {/* Google Drive & Sheets Sync Modal */}
      {syncGoogleModalProject && (
        <GoogleSyncModal
          isOpen={!!syncGoogleModalProject}
          project={syncGoogleModalProject}
          onClose={() => setSyncGoogleModalProject(null)}
        />
      )}
    </div>
  );
};
