import React, { useState, useRef } from 'react';
import { BiddingProject, ProposalStatus, ProjectAttachment } from '../types/proposal';
import { exportProposalToDocx } from '../services/docxExport';
import {
  uploadAttachmentFile,
  testSupabaseConnection,
  SupabaseTestResult,
  saveProject,
  storeAttachmentInIDB,
  getAttachmentFromIDB,
} from '../services/projectStorageService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { extractProjectMetadataFromFile } from '../services/torDocReader';
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
} from 'lucide-react';

interface ProjectDashboardProps {
  projects: BiddingProject[];
  cloudStatus?: 'cloud' | 'local';
  onSelectProject: (projectId: string) => void;
  onUpdateProjects: (updated: BiddingProject[]) => void;
  onOpenTorImporterForProject: (projectId: string) => void;
  onResetProjectsToDefault: () => void;
  onOpenUserManagement?: () => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projects,
  cloudStatus = 'local',
  onSelectProject,
  onUpdateProjects,
  onOpenTorImporterForProject,
  onResetProjectsToDefault,
  onOpenUserManagement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProposalStatus>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'announcement' | 'budget'>('deadline');
  
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

  // Cloud Diagnostic Modal State
  const [showCloudDiagnostic, setShowCloudDiagnostic] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<SupabaseTestResult | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const handleCheckConnection = async () => {
    setShowCloudDiagnostic(true);
    setDiagLoading(true);
    try {
      const res = await testSupabaseConnection();
      setDiagResult(res);
    } finally {
      setDiagLoading(false);
    }
  };

  const handleSyncAllToCloud = async () => {
    setSyncingAll(true);
    try {
      for (const p of projects) {
        await saveProject(p);
      }
      alert('ซิงค์ข้อมูลโครงการทั้งหมดขึ้น Supabase Cloud เรียบร้อยแล้ว!');
      const res = await testSupabaseConnection();
      setDiagResult(res);
    } catch {
      alert('เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
    } finally {
      setSyncingAll(false);
    }
  };

  // Stats calculation
  const totalProjects = projects.length;
  const draftCount = projects.filter((p) => p.status === 'draft').length;
  const submittedCount = projects.filter((p) => p.status === 'submitted').length;
  const cancelledCount = projects.filter((p) => p.status === 'cancelled').length;
  const totalBudget = projects.reduce((sum, p) => sum + (p.budgetAmount || 0), 0);

  // Filtered & Sorted Projects
  const filteredProjects = projects
    .filter((p) => {
      const matchSearch =
        p.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientAgency.toLowerCase().includes(searchTerm.toLowerCase());
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
      // Synchronize project cover data
      newProj.proposalData.cover.projectCode = newProj.projectCode;
      newProj.proposalData.cover.projectTitle = newProj.projectTitle;
      newProj.proposalData.cover.clientAgency = newProj.clientAgency;
      newProj.proposalData.cover.budgetFormatted = `${newProj.budgetAmount.toLocaleString()} บาท`;

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
          return synced;
        }
        return p;
      });
      onUpdateProjects(updated);
    }

    setEditingProject(null);
    setIsCreatingNew(false);
  };

  // Create new project template
  const handleOpenCreateModal = () => {
    const defaultData = projects.length > 0 ? JSON.parse(JSON.stringify(projects[0].proposalData)) : null;
    const newProj: BiddingProject = {
      id: '',
      projectCode: `EGP-${new Date().getFullYear() + 543 - 2500}-${Math.floor(10000 + Math.random() * 90000)}`,
      projectTitle: '',
      clientAgency: '',
      budgetAmount: 5000000,
      egpUrl: '',
      announcementDate: new Date().toISOString().split('T')[0],
      submissionDeadline: '',
      status: 'draft',
      statusNote: 'เริ่มต้นจัดทำร่างข้อเสนอโครงการ',
      attachments: [],
      proposalData: defaultData || {
        cover: {
          projectTitle: '',
          projectCode: '',
          clientAgency: '',
          clientDepartment: '',
          submitterCompany: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด',
          submitterSubtext: 'Prime Digital Consultant Co., Ltd.',
          submissionDate: '',
          budgetFormatted: '',
          includeBackCover: true,
          includeTOC: true,
        },
        section1: { background: '', objectives: [], expectedBenefits: [], targetAudience: '', projectScopeOverview: '', scopeItems: [] },
        section2: { methodologyStrategy: '', milestones: [] },
        section3: { frameworkOverview: '', conceptualDiagramCaption: '' },
        section4: { teamOverview: '', teamMembers: [], riskManagementOverview: '', riskItems: [], complianceMatrixOverview: '' },
        section5: { companyName: '', establishedYearBE: 2558, registeredCapital: '', companyProfile: '', visionMission: '', specializations: [], certifications: [], maxYearsFilter: 3, pastProjects: [] },
      },
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
        proposalData: projects.length > 0 ? JSON.parse(JSON.stringify(projects[0].proposalData)) : {
          cover: {
            projectTitle: '',
            projectCode: '',
            clientAgency: '',
            clientDepartment: '',
            submitterCompany: 'บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด',
            submitterSubtext: 'Prime Digital Consultant Co., Ltd.',
            submissionDate: '',
            budgetFormatted: '5,000,000 บาท',
            includeBackCover: true,
            includeTOC: true,
          },
          section1: { background: '', objectives: [], expectedBenefits: [], targetAudience: '', projectScopeOverview: '', scopeItems: [] },
          section2: { methodologyStrategy: '', milestones: [] },
          section3: { frameworkOverview: '', conceptualDiagramCaption: '' },
          section4: { teamOverview: '', teamMembers: [], riskManagementOverview: '', riskItems: [], complianceMatrixOverview: '' },
          section5: { companyName: '', establishedYearBE: 2558, registeredCapital: '', companyProfile: '', visionMission: '', specializations: [], certifications: [], maxYearsFilter: 3, pastProjects: [] },
        },
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
            const { metadata } = await extractProjectMetadataFromFile(file);
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
          dataUrl,
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
            attachments: p.attachments.filter((a) => a.id !== attachmentId),
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
    try {
      await exportProposalToDocx(project.proposalData);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์ Word');
    }
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

  // Import JSON backup
  const handleImportAllJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].projectTitle) {
          onUpdateProjects(parsed);
          alert(`นำเข้าข้อมูลโครงการทั้งหมด ${parsed.length} รายการ เรียบร้อยแล้ว`);
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
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportAllJson}
      />

      {/* Hero / Header Section */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
            <div className="hero-tag" style={{ marginBottom: 0 }}>
              <span className="hero-tag-dot"></span>
              ระบบบริหารจัดการโครงการประกวดราคาภาครัฐ | e-GP Tracking & Proposal System
            </div>
            {cloudStatus === 'cloud' ? (
              <span
                onClick={handleCheckConnection}
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
                  cursor: 'pointer',
                }}
                title="คลิกเพื่อตรวจสอบสถานะการเชื่อมต่อ Supabase Cloud"
              >
                <Cloud size={13} /> Supabase Cloud Connected
              </span>
            ) : (
              <span
                onClick={handleCheckConnection}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#FDE68A',
                  padding: '0.3rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
                title="คลิกเพื่อตรวจสอบสถานะการเชื่อมต่อ Supabase Cloud"
              >
                <HardDrive size={13} /> Local Database (คลิกเพื่อเช็ค Cloud)
              </span>
            )}
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
            onClick={handleCheckConnection}
            title="ทดสอบการเชื่อมต่อกับ Supabase Cloud Database"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.25)', borderColor: 'rgba(59, 130, 246, 0.4)' }}
          >
            <Cloud size={16} /> เช็คการเชื่อมต่อ Cloud
          </button>
          <button
            type="button"
            className="btn btn-secondary hero-btn"
            onClick={() => jsonImportInputRef.current?.click()}
            title="นำเข้าไฟล์สำรอง JSON ของทุกโครงการ"
          >
            <Upload size={16} /> นำเข้าฐานข้อมูล
          </button>
          <button
            type="button"
            className="btn btn-secondary hero-btn"
            onClick={handleExportAllJson}
            title="สำรองข้อมูลทุกโครงการเป็นไฟล์ JSON"
          >
            <Save size={16} /> สำรองข้อมูล (JSON)
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
            const announcementDocs = project.attachments.filter((a) => a.category === 'announcement');
            const torDocs = project.attachments.filter((a) => a.category === 'tor');
            const otherDocs = project.attachments.filter((a) => a.category === 'other');

            return (
              <div
                key={project.id}
                className={`project-card status-card-${project.status}`}
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
                    <button
                      type="button"
                      className="icon-action-btn"
                      onClick={() => {
                        setEditingProject(JSON.parse(JSON.stringify(project)));
                        setIsCreatingNew(false);
                      }}
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

                  {/* Budget & e-GP Link Bar */}
                  <div className="project-budget-egp-row">
                    <div className="project-budget-chip">
                      <span className="budget-label">งบประมาณ:</span>
                      <span className="budget-amount">{(project.budgetAmount || 0).toLocaleString()} บาท</span>
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
                        onClick={() => {
                          setEditingProject(JSON.parse(JSON.stringify(project)));
                          setIsCreatingNew(false);
                        }}
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

                  {/* Status Note if available */}
                  {project.statusNote && (
                    <div className="project-status-note">
                      <span className="note-label">หมายเหตุ:</span> {project.statusNote}
                    </div>
                  )}

                  {/* Attachments Section (ประกาศจัดจ้าง & TOR) */}
                  <div className="attachments-section">
                    <div className="attachments-header">
                      <div className="attachments-title">
                        <Paperclip size={14} />
                        <span>เอกสารแนบ ({project.attachments.length})</span>
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
                    {project.attachments.length > 0 ? (
                      <div className="attachments-list">
                        {project.attachments.map((att) => (
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

                            {att.dataUrl && (
                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="att-icon-btn"
                                title="ดาวน์โหลดไฟล์"
                              >
                                <Download size={12} />
                              </a>
                            )}

                            {/* If TOR, show import button */}
                            {att.category === 'tor' && (
                              <button
                                type="button"
                                className="att-icon-btn att-import-btn"
                                onClick={() => {
                                  onSelectProject(project.id);
                                  onOpenTorImporterForProject(project.id);
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
                <div className="project-card-footer">
                  <button
                    type="button"
                    className="btn btn-outline footer-btn-export"
                    onClick={() => handleExportDocx(project)}
                    title="สร้างและดาวน์โหลดไฟล์ข้อเสนอโครงการเป็น Microsoft Word (.docx)"
                  >
                    <FileDown size={14} /> ดาวน์โหลด Word
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary footer-btn-edit-proposal"
                    onClick={() => onSelectProject(project.id)}
                  >
                    <span>จัดทำข้อเสนอโครงการ</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
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
            style={{ maxWidth: '840px' }}
          >
            {/* Modal Header */}
            <div className="modal-header">
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

            <form onSubmit={handleSaveProjectModal}>
              <div className="modal-body">
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
                            {att.dataUrl && (
                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="btn-modal-cancel"
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.75rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  textDecoration: 'none',
                                }}
                                title="ดาวน์โหลดหรือเปิดดูไฟล์นี้"
                              >
                                <Download size={13} /> ดาวน์โหลด
                              </a>
                            )}
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
                      <span>หน่วยงานผู้ว่าจ้าง / เจ้าของโครงการ</span>
                      <span className="req-star">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="เช่น กรมพัฒนาธุรกิจการค้า กระทรวงพาณิชย์"
                      value={editingProject.clientAgency}
                      onChange={(e) =>
                        setEditingProject({ ...editingProject, clientAgency: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Section 2: Budget & Timeline */}
                <div className="modal-section-card">
                  <div className="modal-section-header">
                    <div className="modal-section-header-title">
                      <Calendar size={16} /> วงเงินงบประมาณและกำหนดการ e-GP
                    </div>
                    <span className="modal-section-subtitle">วงเงินและเวลาที่ต้องยื่นเสนอราคา</span>
                  </div>

                  <div className="form-grid-3">
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
              <div className="modal-footer">
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

      {/* Cloud Connection Diagnostic Modal */}
      {showCloudDiagnostic && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div className="modal-title-group">
                <Cloud size={20} style={{ color: '#3B82F6' }} />
                <h2>ตรวจสอบการเชื่อมต่อ Supabase Cloud</h2>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowCloudDiagnostic(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {diagLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
                  <div style={{ fontWeight: 600, color: 'var(--slate-800)' }}>กำลังทดสอบการเชื่อมต่อกับ Supabase...</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                    ตรวจสอบฐานข้อมูล PostgreSQL, ตาราง bidding_projects และ Storage Bucket
                  </div>
                </div>
              ) : diagResult ? (
                <>
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '10px',
                      backgroundColor: diagResult.connected ? '#ECFDF5' : '#FEF2F2',
                      border: `1px solid ${diagResult.connected ? '#A7F3D0' : '#FECACA'}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    {diagResult.connected ? (
                      <CheckCircle2 size={24} style={{ color: '#10B981', flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <AlertCircle size={24} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: diagResult.connected ? '#065F46' : '#991B1B',
                          marginBottom: '0.25rem',
                        }}
                      >
                        {diagResult.connected ? 'เชื่อมต่อ Supabase สำเร็จเรียบร้อย' : 'ไม่สามารถเชื่อมต่อ Supabase ได้'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: diagResult.connected ? '#047857' : '#B91C1C', lineHeight: 1.5 }}>
                        {diagResult.message}
                      </div>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--slate-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--slate-500)', marginBottom: '0.65rem' }}>
                      รายละเอียดผลการตรวจสอบระบบ:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Environment Variables:</span>
                        <span style={{ fontWeight: 600, color: diagResult.isConfigured ? '#10B981' : '#EF4444' }}>
                          {diagResult.isConfigured ? '✅ มีการตั้งค่าแล้ว' : '❌ ยังไม่ได้ตั้งค่า'}
                        </span>
                      </div>

                      {diagResult.url && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--slate-600)' }}>Supabase Project URL:</span>
                          <span className="font-mono" style={{ fontSize: '0.785rem', color: 'var(--primary-700)' }}>
                            {diagResult.url}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--slate-600)' }}>ตาราง bidding_projects:</span>
                        <span style={{ fontWeight: 600, color: diagResult.tableExists ? '#10B981' : '#EF4444' }}>
                          {diagResult.tableExists ? '✅ พร้อมใช้งาน' : '❌ ไม่พบตาราง (ต้องรัน SQL)'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--slate-600)' }}>Storage project-attachments:</span>
                        <span style={{ fontWeight: 600, color: diagResult.storageExists ? '#10B981' : '#F59E0B' }}>
                          {diagResult.storageExists ? '✅ พร้อมใช้งาน' : '⚠️ ยังไม่พบ Bucket (สร้างอัตโนมัติจาก SQL)'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--slate-600)' }}>จำนวนโครงการบน Cloud:</span>
                        <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                          {diagResult.projectCount} โครงการ
                        </span>
                      </div>
                    </div>
                  </div>

                  {!diagResult.connected && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', lineHeight: 1.5, background: '#FFFBEB', padding: '0.85rem', borderRadius: '6px', border: '1px solid #FDE68A' }}>
                      💡 <strong>คำแนะนำในการแก้ไข:</strong>
                      <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <li>ตรวจสอบว่าได้คัดลอกไฟล์ <code>supabase_schema.sql</code> ไปกด Run ใน SQL Editor ของ Supabase แล้วหรือยัง</li>
                        <li>ตรวจสอบค่า <code>VITE_SUPABASE_URL</code> และ <code>VITE_SUPABASE_ANON_KEY</code> ใน Vercel Settings &gt; Environment Variables</li>
                        <li>หากเพิ่งแก้ไขค่าใน Vercel กรุณากด <strong>Redeploy</strong> เพื่อให้การตั้งค่ามีผล</li>
                      </ul>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {diagResult?.connected && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={syncingAll}
                    onClick={handleSyncAllToCloud}
                    title="อัปโหลดโครงการทั้งหมดในหน้านี้ขึ้นไปบันทึกลง Supabase ทันที"
                    style={{ fontSize: '0.8rem', color: '#1E40AF', borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }}
                  >
                    <Upload size={14} />
                    <span>{syncingAll ? 'กำลังซิงค์...' : '🔄 ซิงค์ทุกโครงการขึ้น Supabase'}</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCheckConnection}
                  disabled={diagLoading}
                >
                  <RotateCcw size={14} /> ทดสอบอีกครั้ง
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowCloudDiagnostic(false)}
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
