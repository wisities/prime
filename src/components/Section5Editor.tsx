import React, { useState, useEffect } from 'react';
import { Section5Company, PastProject, MasterCompanyProfile } from '../types/proposal';
import { ReportImageManager } from './ReportImageManager';
import {
  getMasterProjectsLibrary,
  fetchMasterProjectsLibraryFromCloud,
  deleteMasterProject,
  clearAllMasterProjects,
  resetMasterProjectsLibrary,
  saveProjectToMasterLibrary,
  saveMultipleProjectsToMasterLibrary,
  MASTER_PROJECTS_UPDATED_EVENT,
  getMasterCompanyProfile,
  fetchMasterCompanyProfileFromCloud,
  saveMasterCompanyProfile,
  resetMasterCompanyProfile,
  MASTER_COMPANY_UPDATED_EVENT,
  initMasterLibraryRealtime,
  exportMasterProjectsToJson,
  importMasterProjectsFromJson,
} from '../services/masterLibraryService';
import { Building2, Plus, Trash2, Library, Filter, Calendar, AlertTriangle, CheckCircle, Upload, Image, FileText, Paperclip, FileCheck, BookmarkCheck, RotateCcw, ArrowUp, ArrowDown, ArrowUpDown, BookmarkPlus, Check, Database, Save, Download, List, Table as TableIcon, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

/**
 * ฟังก์ชันจัดเรียงรายการผลงานโครงการตามเงื่อนไข:
 * 1. แยกกลุ่มประเภทโครงการ: ผลงานอ้างอิงตาม TOR ('tor_reference') มาก่อน, ตามด้วยโครงการอื่นๆ ('supplementary')
 * 2. ภายในแต่ละกลุ่ม: เรียงตามปีที่แล้วเสร็จ (completionYearBE) โดยใหม่สุดขึ้นก่อน (Descending)
 * 3. หากปีเดียวกัน: ให้เอาโครงการที่มีมูลค่าสัญญา (contractValue) สูงกว่าขึ้นก่อน (Descending)
 */
export const sortPastProjects = (projects: PastProject[]): PastProject[] => {
  return [...projects].sort((a, b) => {
    // 1. แยกผลงานอ้างอิงตาม TOR ('tor_reference') และโครงการอื่นๆ ('supplementary')
    const aType = a.projectType || 'tor_reference';
    const bType = b.projectType || 'tor_reference';
    if (aType !== bType) {
      return aType === 'tor_reference' ? -1 : 1;
    }

    // 2. เรียงตามปี ใหม่สุดขึ้นก่อน (completionYearBE มากไปน้อย)
    const aYear = Number(a.completionYearBE) || 0;
    const bYear = Number(b.completionYearBE) || 0;
    if (bYear !== aYear) {
      return bYear - aYear;
    }

    // 3. หากปีเดียวกัน ให้เอาโครงการที่มูลค่าสูงกว่าขึ้นก่อน (contractValue มากไปน้อย)
    const aVal = Number(a.contractValue) || 0;
    const bVal = Number(b.contractValue) || 0;
    return bVal - aVal;
  });
};

interface Section5EditorProps {
  section5: Section5Company;
  onChange: (section5: Section5Company) => void;
}

export const Section5Editor: React.FC<Section5EditorProps> = ({ section5, onChange }) => {
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'projects' | 'company'>('projects');
  const [projectsLibrary, setProjectsLibrary] = useState<PastProject[]>(getMasterProjectsLibrary());
  const [masterCompany, setMasterCompany] = useState<MasterCompanyProfile>(getMasterCompanyProfile());
  const [companyToast, setCompanyToast] = useState<string | null>(null);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const fileInputProjectsRef = React.useRef<HTMLInputElement>(null);
  const currentYearBE = 2568;

  const toggleProjectCollapse = (id: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAllProjects = () => {
    const map: Record<string, boolean> = {};
    section5.pastProjects.forEach((p) => {
      map[p.id] = true;
    });
    setCollapsedProjects(map);
  };

  const expandAllProjects = () => {
    setCollapsedProjects({});
  };

  const handleImportProjectsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const res = importMasterProjectsFromJson(text);
      if (res.success) {
        const fresh = getMasterProjectsLibrary();
        setProjectsLibrary(fresh);
        alert(`นำเข้าและผสานผลงานโครงการสำเร็จ! ปัจจุบันคลังกลางมีทั้งหมด ${res.count} รายการ`);
      } else {
        alert(`เกิดข้อผิดพลาดในการนำเข้า: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    fetchMasterProjectsLibraryFromCloud().then((items) => {
      setProjectsLibrary(items);
    });
    fetchMasterCompanyProfileFromCloud().then((profile) => {
      setMasterCompany(profile);
    });

    const handleLocalUpdate = (e: any) => {
      if (e.detail) setProjectsLibrary(e.detail);
    };
    const handleCompanyUpdate = (e: any) => {
      if (e.detail) setMasterCompany(e.detail);
    };

    window.addEventListener(MASTER_PROJECTS_UPDATED_EVENT, handleLocalUpdate);
    window.addEventListener(MASTER_COMPANY_UPDATED_EVENT, handleCompanyUpdate);

    const unsubscribe = initMasterLibraryRealtime(
      undefined,
      (fresh) => setProjectsLibrary(fresh),
      undefined,
      (freshCompany) => setMasterCompany(freshCompany)
    );

    return () => {
      window.removeEventListener(MASTER_PROJECTS_UPDATED_EVENT, handleLocalUpdate);
      window.removeEventListener(MASTER_COMPANY_UPDATED_EVENT, handleCompanyUpdate);
      unsubscribe();
    };
  }, []);

  const handleOpenLibrary = () => {
    setProjectsLibrary(getMasterProjectsLibrary());
    setSelectedLibraryIds([]);
    setShowLibraryModal(true);
  };

  const handleDeleteFromLibrary = (id: string, name: string) => {
    if (confirm(`ยืนยันการลบโครงการ "${name}" ออกจากคลังข้อมูลกลางถาวร?`)) {
      const updated = deleteMasterProject(id);
      setProjectsLibrary(updated);
    }
  };

  const handleClearAllLibrary = () => {
    if (confirm('ยืนยันการล้างข้อมูลผลงานโครงการทั้งหมดในคลังกลาง? (คุณสามารถกดปุ่มคืนค่าตัวอย่างเดิมได้ในภายหลัง)')) {
      const updated = clearAllMasterProjects();
      setProjectsLibrary(updated);
    }
  };

  const handleResetLibrary = () => {
    if (confirm('ต้องการคืนค่าผลงานโครงการตัวอย่างเดิมกลับมาใช่หรือไม่?')) {
      const updated = resetMasterProjectsLibrary();
      setProjectsLibrary(updated);
    }
  };

  const handleFieldsChange = (partial: Partial<Section5Company>) => {
    onChange({ ...section5, ...partial });
  };

  const handleFieldChange = (field: keyof Section5Company, value: any) => {
    handleFieldsChange({ [field]: value });
  };

  const handleFileUpload = (file: File, callback: (base64: string, fileName: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      callback(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleProjectToggle = (id: string, isSelected: boolean) => {
    const updated = section5.pastProjects.map((p) =>
      p.id === id ? { ...p, isSelected } : p
    );
    onChange({ ...section5, pastProjects: updated });
  };

  const handleProjectFieldsChange = (id: string, partial: Partial<PastProject>) => {
    const updated = section5.pastProjects.map((p) =>
      p.id === id ? { ...p, ...partial } : p
    );
    onChange({ ...section5, pastProjects: updated });
  };

  const handleProjectChange = (id: string, field: keyof PastProject, value: any) => {
    handleProjectFieldsChange(id, { [field]: value });
  };

  const handleAddProject = () => {
    const newId = `proj-${Date.now()}`;
    const newProj: PastProject = {
      id: newId,
      projectName: '',
      clientName: '',
      contractValue: 0,
      completionYearBE: currentYearBE,
      periodDuration: '',
      description: '',
      category: '',
      isSelected: true,
      projectType: 'tor_reference',
      relevanceNote: '',
      imageBlocks: [],
    };
    onChange({ ...section5, pastProjects: [...section5.pastProjects, newProj] });
    setCollapsedProjects((prev) => ({ ...prev, [newId]: false }));
  };

  const handleDeleteProject = (id: string) => {
    onChange({
      ...section5,
      pastProjects: section5.pastProjects.filter((p) => p.id !== id),
    });
  };

  const handleToggleLibrarySelect = (id: string) => {
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllLibrary = () => {
    if (selectedLibraryIds.length === projectsLibrary.length) {
      setSelectedLibraryIds([]);
    } else {
      setSelectedLibraryIds(projectsLibrary.map((p) => p.id));
    }
  };

  const handleImportSelectedFromLibrary = () => {
    if (selectedLibraryIds.length === 0) {
      alert('กรุณาทำเครื่องหมายเลือกโครงการที่ต้องการนำเข้าอย่างน้อย 1 รายการ');
      return;
    }

    const selectedProjectsToImport = projectsLibrary.filter((p) =>
      selectedLibraryIds.includes(p.id)
    );

    const existingNames = new Set(section5.pastProjects.map((p) => p.projectName.trim()));
    const newItems: PastProject[] = [];
    let duplicateCount = 0;

    selectedProjectsToImport.forEach((proj, idx) => {
      if (existingNames.has(proj.projectName.trim())) {
        duplicateCount++;
      } else {
        const uniqueId = `proj-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;
        newItems.push({
          ...proj,
          id: uniqueId,
          isSelected: true,
        });
      }
    });

    if (newItems.length === 0) {
      alert(`โครงการที่เลือกทั้งหมด (${duplicateCount} โครงการ) มีอยู่ในเล่มข้อเสนอนี้แล้ว`);
      return;
    }

    const combined = [...section5.pastProjects, ...newItems];
    const sorted = sortPastProjects(combined);
    onChange({ ...section5, pastProjects: sorted });

    const newCollapsedMap = { ...collapsedProjects };
    newItems.forEach((item) => {
      newCollapsedMap[item.id] = false;
    });
    setCollapsedProjects(newCollapsedMap);

    setSelectedLibraryIds([]);
    setShowLibraryModal(false);

    let msg = `นำเข้าผลงานสำเร็จ ${newItems.length} โครงการ (จัดเรียงแยกตาม TOR / โครงการอื่นๆ, ปีใหม่สุด และมูลค่าสัญญาเรียบร้อยแล้ว)`;
    if (duplicateCount > 0) {
      msg += `\n* ข้าม ${duplicateCount} โครงการที่มีอยู่แล้วในเล่ม`;
    }
    alert(msg);
  };

  const handleAddFromLibrary = (project: PastProject) => {
    if (section5.pastProjects.some((p) => p.projectName === project.projectName)) {
      alert(`มีโครงการ "${project.projectName}" ในรายการแล้ว`);
      return;
    }
    const newId = `proj-${Date.now()}`;
    const cloned = { ...project, id: newId, isSelected: true };
    const combined = [...section5.pastProjects, cloned];
    const sorted = sortPastProjects(combined);
    onChange({ ...section5, pastProjects: sorted });
    setCollapsedProjects((prev) => ({ ...prev, [newId]: false }));
    setShowLibraryModal(false);
  };

  const handleSortCurrentProjects = () => {
    const sorted = sortPastProjects(section5.pastProjects);
    onChange({ ...section5, pastProjects: sorted });
    setSavedProjectToast('จัดเรียงโครงการสำเร็จ: แยกตาม TOR / โครงการอื่นๆ -> ปีล่าสุดขึ้นก่อน -> มูลค่าสูงสุดขึ้นก่อน');
    setTimeout(() => setSavedProjectToast(null), 3000);
  };

  const handleMoveProject = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= section5.pastProjects.length) return;
    const reordered = [...section5.pastProjects];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    onChange({ ...section5, pastProjects: reordered });
  };

  const [savedProjectToast, setSavedProjectToast] = useState<string | null>(null);

  const handleSaveProjectToLibrary = (project: PastProject) => {
    if (!project.projectName || project.projectName.trim() === '') {
      alert('กรุณาระบุชื่อโครงการก่อนบันทึกลงคลังข้อมูลกลาง');
      return;
    }
    const updated = saveProjectToMasterLibrary(project);
    setProjectsLibrary(updated);
    setSavedProjectToast(`บันทึกโครงการ "${project.projectName}" เข้าสู่คลังผลงานกลางเรียบร้อยแล้ว`);
    setTimeout(() => setSavedProjectToast(null), 3000);
  };

  const handleSaveAllProjectsToLibrary = () => {
    const validProjects = section5.pastProjects.filter(
      (p) => p.projectName && p.projectName.trim() !== ''
    );
    if (validProjects.length === 0) {
      alert('ไม่มีรายการโครงการที่มีชื่อถูกต้องให้บันทึก');
      return;
    }
    const updated = saveMultipleProjectsToMasterLibrary(validProjects);
    setProjectsLibrary(updated);
    alert(`บันทึกผลงานโครงการทั้งหมด ${validProjects.length} รายการ เข้าสู่คลังข้อมูลกลางเรียบร้อยแล้ว`);
  };

  const handleSaveCurrentToMasterCompany = () => {
    if (!section5.companyName || section5.companyName.trim() === '') {
      alert('กรุณาระบุชื่อบริษัทก่อนบันทึกลงคลังกลาง');
      return;
    }
    const profileToSave: MasterCompanyProfile = {
      companyName: section5.companyName,
      establishedYearBE: section5.establishedYearBE,
      registeredCapital: section5.registeredCapital,
      companyProfile: section5.companyProfile,
      visionMission: section5.visionMission,
      specializations: section5.specializations || [],
      certifications: section5.certifications || [],
      maxYearsFilter: section5.maxYearsFilter || 5,
      companyLogoUrl: section5.companyLogoUrl,
      companyOfficeImageUrl: section5.companyOfficeImageUrl,
      companyOfficeImageCaption: section5.companyOfficeImageCaption,
      imageBlocks: section5.imageBlocks || [],
    };
    saveMasterCompanyProfile(profileToSave);
    setMasterCompany(profileToSave);
    setCompanyToast('บันทึกข้อมูลบริษัทเข้าสู่คลังกลางในเครื่อง (IndexedDB) สำเร็จ! โครงการอื่นๆ สามารถดึงไปใช้ได้ทันที');
    setTimeout(() => setCompanyToast(null), 3500);
  };

  const handleLoadFromMasterCompany = async () => {
    if (confirm('ต้องการดึงข้อมูลบริษัทจากคลังกลางมาแทนที่ข้อมูลปัจจุบันของโครงการนี้หรือไม่? (ผลงานโครงการเดิมในเล่มจะไม่ได้รับผลกระทบ)')) {
      try {
        const fresh = await fetchMasterCompanyProfileFromCloud();
        setMasterCompany(fresh);
        onChange({
          ...section5,
          ...fresh,
          pastProjects: section5.pastProjects,
        });
        setCompanyToast('ดึงข้อมูลบริษัทจากคลังกลางและนำมาปรับใช้ในโครงการนี้เรียบร้อยแล้ว');
        setTimeout(() => setCompanyToast(null), 3500);
      } finally {
      }
    }
  };

  const handleSaveMasterCompanyInModal = () => {
    saveMasterCompanyProfile(masterCompany);
    setCompanyToast('บันทึกการเปลี่ยนแปลงข้อมูลบริษัทกลางในเครื่อง (IndexedDB) เรียบร้อยแล้ว');
    setTimeout(() => setCompanyToast(null), 3500);
  };

  const handleApplyMasterCompanyToCurrent = () => {
    onChange({
      ...section5,
      ...masterCompany,
      pastProjects: section5.pastProjects,
    });
    setCompanyToast('นำข้อมูลบริษัทกลางมาปรับใช้ในโครงการปัจจุบันสำเร็จ');
    setTimeout(() => setCompanyToast(null), 3500);
    setShowLibraryModal(false);
  };

  const handleResetMasterCompany = () => {
    if (confirm('ต้องการคืนค่าข้อมูลบริษัทกลางกลับเป็นค่าเริ่มต้นตามเทมเพลตมาตรฐานหรือไม่?')) {
      const reset = resetMasterCompanyProfile();
      setMasterCompany(reset);
      setCompanyToast('คืนค่าข้อมูลบริษัทกลางเป็นค่าเริ่มต้นเรียบร้อยแล้ว');
      setTimeout(() => setCompanyToast(null), 3500);
    }
  };

  // Filter calculation
  const minAllowedYear = currentYearBE - section5.maxYearsFilter;

  // Selected projects that pass the year filter
  const selectedProjects = section5.pastProjects.filter((p) => p.isSelected);
  const torReferenceProjects = selectedProjects.filter(
    (p) => (p.projectType || 'tor_reference') === 'tor_reference'
  );
  const supplementaryProjects = selectedProjects.filter(
    (p) => p.projectType === 'supplementary'
  );

  const eligibleTorProjects = torReferenceProjects.filter(
    (p) => p.completionYearBE >= minAllowedYear
  );

  const totalContractValue = selectedProjects.reduce(
    (sum, p) => sum + (p.contractValue || 0),
    0
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 5.1 Company Profile Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="card-title-group">
            <h2>
              <Building2 size={20} color="var(--primary-700)" />
              ส่วนที่ 5: ประวัติและประสบการณ์ของบริษัท (Company Profile & Credentials)
            </h2>
            <p>ข้อมูลนิติบุคคล รูปภาพสำนักงาน/โลโก้ ความเชี่ยวชาญ ใบรับรองมาตรฐาน และคลังผลงานย้อนหลังตามเงื่อนไขปีที่กำหนด</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSaveCurrentToMasterCompany}
              className="btn btn-outline"
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
                color: '#0284C7',
                borderColor: '#BAE6FD',
                backgroundColor: '#F0F9FF',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="บันทึกข้อมูลบริษัทของโครงการนี้ลงในคลังข้อมูลกลางและซิงก์ Cloud"
            >
              <BookmarkPlus size={14} /> บันทึกข้อมูลบริษัทนี้ลงคลังกลาง
            </button>
            <button
              type="button"
              onClick={handleLoadFromMasterCompany}
              className="btn btn-outline"
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
                color: '#047857',
                borderColor: '#A7F3D0',
                backgroundColor: '#ECFDF5',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
              title="ดึงข้อมูลบริษัทล่าสุดจากคลังกลางมาใส่ในโครงการนี้"
            >
              <RotateCcw size={14} /> ดึงข้อมูลบริษัทจากคลังกลาง
            </button>
            <button
              type="button"
              onClick={() => {
                setLibraryTab('company');
                handleOpenLibrary();
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
              title="เปิดดูและจัดการข้อมูลบริษัทและผลงานในคลังกลาง"
            >
              <Library size={14} /> คลังข้อมูลกลาง
            </button>
          </div>
        </div>

        {/* Company Toast Notification */}
        {companyToast && (
          <div style={{ margin: '0.5rem 1.25rem', padding: '0.5rem 0.85rem', backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: '6px', color: '#065F46', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <CheckCircle size={15} color="#059669" /> {companyToast}
          </div>
        )}

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              ชื่อบริษัท (ภาษาไทยและอังกฤษ) <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={section5.companyName}
              onChange={(e) => handleFieldChange('companyName', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">ทุนจดทะเบียน</label>
            <input
              type="text"
              className="form-input"
              value={section5.registeredCapital}
              onChange={(e) => handleFieldChange('registeredCapital', e.target.value)}
            />
          </div>
        </div>

        {/* Company Photo Upload Section (Logo & Office) */}
        <div className="grid-2" style={{ backgroundColor: 'var(--slate-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--slate-200)', marginBottom: '1rem' }}>
          {/* Logo Upload */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Image size={15} color="var(--primary-700)" />
              โลโก้บริษัท (Company Logo)
            </label>
            {section5.companyLogoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={section5.companyLogoUrl}
                  alt="Company Logo"
                  style={{ height: '70px', maxWidth: '160px', objectFit: 'contain', border: '1px solid var(--slate-200)', borderRadius: '6px', backgroundColor: '#FFFFFF', padding: '4px' }}
                />
                <button
                  type="button"
                  onClick={() => handleFieldChange('companyLogoUrl', undefined)}
                  className="btn btn-outline"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.35rem 0.65rem' }}
                >
                  <Trash2 size={14} /> ลบโลโก้
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  border: '1px dashed var(--slate-300)',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--primary-800)',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, (b64) => handleFieldChange('companyLogoUrl', b64));
                    e.target.value = '';
                  }}
                />
                <Upload size={16} /> อัปโหลดภาพโลโก้บริษัท
              </label>
            )}
          </div>

          {/* Office Photo Upload */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building2 size={15} color="var(--primary-700)" />
              ภาพถ่ายสำนักงาน / อาคารบริษัท
            </label>
            {section5.companyOfficeImageUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={section5.companyOfficeImageUrl}
                  alt="Office"
                  style={{ height: '70px', width: '120px', objectFit: 'cover', border: '1px solid var(--slate-200)', borderRadius: '6px' }}
                />
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', marginBottom: '4px' }}
                    placeholder="คำบรรยายภาพสำนักงาน"
                    value={section5.companyOfficeImageCaption || ''}
                    onChange={(e) => handleFieldChange('companyOfficeImageCaption', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      handleFieldsChange({
                        companyOfficeImageUrl: undefined,
                        companyOfficeImageCaption: undefined,
                      });
                    }}
                    className="btn btn-outline"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    <Trash2 size={12} /> ลบภาพ
                  </button>
                </div>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  border: '1px dashed var(--slate-300)',
                  borderRadius: '6px',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--primary-800)',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, (b64) => handleFieldChange('companyOfficeImageUrl', b64));
                    e.target.value = '';
                  }}
                />
                <Upload size={16} /> อัปโหลดภาพสำนักงาน/บริษัท
              </label>
            )}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">ประวัติและข้อมูลทั่วไปของบริษัท (Profile Overview)</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '80px' }}
            value={section5.companyProfile}
            onChange={(e) => handleFieldChange('companyProfile', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">วิสัยทัศน์และพันธกิจ (Vision & Mission)</label>
          <input
            type="text"
            className="form-input"
            value={section5.visionMission}
            onChange={(e) => handleFieldChange('visionMission', e.target.value)}
          />
        </div>

        {/* ภาพประกอบในส่วนที่ 5 (ไม่จำกัดจำนวน: ภาพสำนักงาน บรรยากาศการทำงาน ห้อง Data Center ฯลฯ) */}
        <ReportImageManager
          title="ภาพประกอบบริษัท สำนักงาน และสิ่งอำนวยความสะดวก (ไม่จำกัดจำนวน)"
          subtitle="รองรับทั้งภาพเดี่ยว 6 นิ้ว กึ่งกลาง และภาพคู่ 2 คอลัมน์ 3 นิ้ว เช่น ภาพอาคารสำนักงาน ห้องปฏิบัติการ/Data Center ภาพทีมงาน"
          imageBlocks={section5.imageBlocks || []}
          defaultCaptionPrefix="ภาพที่ 5.1-"
          onChange={(newBlocks) => onChange({ ...section5, imageBlocks: newBlocks })}
        />
      </div>

      {/* 5.2 Past Projects & Year Filter Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2 style={{ fontSize: '1.1rem' }}>
              ผลงานและประสบการณ์ที่เกี่ยวข้อง (Track Record with Year Limitation & Appendix)
            </h2>
            <p>
              จำแนกผลงานอ้างอิงหลักตามเกณฑ์ TOR (ย้อนหลังไม่เกินกี่ปี และแนบสำเนาสัญญาในภาคผนวก) และโครงการอื่นๆ ที่เกี่ยวข้อง
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleOpenLibrary}
              className="btn btn-outline"
              style={{ color: 'var(--primary-800)', borderColor: 'var(--primary-600)' }}
            >
              <Library size={16} /> เลือกจากคลังผลงาน
            </button>
            <button
              type="button"
              onClick={handleAddProject}
              className="btn btn-primary"
            >
              <Plus size={16} /> เพิ่มผลงานใหม่
            </button>
          </div>
        </div>

        {/* Filter Toolbar & Summary */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: 'var(--slate-50)',
            padding: '1rem 1.25rem',
            borderRadius: '8px',
            border: '1px solid var(--slate-200)',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Filter size={18} color="var(--primary-700)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-900)' }}>
              เกณฑ์จำกัดอายุผลงานของ TOR:
            </span>
            <select
              className="form-select"
              style={{ width: '230px', fontWeight: 600 }}
              value={section5.maxYearsFilter}
              onChange={(e) => handleFieldChange('maxYearsFilter', parseInt(e.target.value) || 3)}
            >
              <option value={3}>ย้อนหลังไม่เกิน 3 ปี (พ.ศ. {currentYearBE - 3} - {currentYearBE})</option>
              <option value={5}>ย้อนหลังไม่เกิน 5 ปี (พ.ศ. {currentYearBE - 5} - {currentYearBE})</option>
              <option value={10}>ย้อนหลังไม่เกิน 10 ปี (พ.ศ. {currentYearBE - 10} - {currentYearBE})</option>
              <option value={99}>ไม่จำกัดจำนวนปี (ทั้งหมด)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              ผลงานหลักตาม TOR: <strong>{eligibleTorProjects.length}</strong> โครงการ (แนบภาคผนวก)
            </span>
            <span
              style={{
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: '1px solid #E5E7EB',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              โครงการอื่นๆ: <strong>{supplementaryProjects.length}</strong> โครงการ
            </span>
            <span
              style={{
                backgroundColor: 'var(--gold-100)',
                color: 'var(--gold-600)',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              มูลค่าสัญญารวม: {totalContractValue.toLocaleString()} บาท
            </span>
          </div>
        </div>

        {/* Toast Notification */}
        {savedProjectToast && (
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#065F46',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Check size={16} color="#059669" />
            <span>{savedProjectToast}</span>
          </div>
        )}

        {/* Toolbar: Collapse / Expand All Buttons & Auto-Sort */}
        {section5.pastProjects.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.825rem', color: 'var(--slate-600)', fontWeight: 500 }}>
              รายการผลงานทั้งหมด ({section5.pastProjects.length} โครงการ) — สามารถคลิกหัวการ์ดหรือลูกศรเพื่อยุบ/ขยายแต่ละโครงการได้
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSortCurrentProjects}
                className="btn btn-outline"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', backgroundColor: '#FFFFFF', color: 'var(--primary-800)', borderColor: 'var(--primary-300)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                title="จัดเรียงโครงการ: แยกตาม TOR / โครงการอื่นๆ -> ปีล่าสุดขึ้นก่อน -> มูลค่าสัญญามากที่สุดขึ้นก่อน"
              >
                <ArrowUpDown size={13} /> จัดเรียงอัตโนมัติ (TOR/ปี/มูลค่า)
              </button>
              <button
                type="button"
                onClick={collapseAllProjects}
                className="btn btn-outline"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', backgroundColor: '#FFFFFF', color: 'var(--slate-700)', borderColor: 'var(--slate-300)', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="ยุบรายการผลงานทั้งหมดเหลือเฉพาะชื่อโครงการ"
              >
                <ChevronUp size={13} /> ยุบทุกโครงการ
              </button>
              <button
                type="button"
                onClick={expandAllProjects}
                className="btn btn-outline"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.65rem', backgroundColor: '#FFFFFF', color: 'var(--slate-700)', borderColor: 'var(--slate-300)', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="ขยายรายละเอียดผลงานทั้งหมด"
              >
                <ChevronDown size={13} /> ขยายทุกโครงการ
              </button>
            </div>
          </div>
        )}

        {/* Master Library Reassurance Banner */}
        <div
          style={{
            margin: '0.75rem 0 1rem',
            padding: '0.65rem 1rem',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            fontSize: '0.825rem',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '1rem' }}>💡</span>
          <span>
            <strong>ข้อมูลผลงานในโครงการนี้เป็นอิสระ:</strong> ท่านสามารถแก้ไขข้อความ เลือกเป็นผลงานอ้างอิงตาม TOR หรือโครงการอื่นๆ และปรับโน้ตความสอดคล้องเฉพาะโครงการนี้ได้อิสระ โดยไม่กระทบข้อมูลหลักในคลังผลงานกลาง
          </span>
        </div>

        {/* Projects List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {section5.pastProjects.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '2px dashed #CBD5E1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                }}
              >
                <Building2 size={28} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1E293B' }}>
                ยังไม่มีรายการผลงานในโครงการนี้
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748B', maxWidth: '520px', lineHeight: 1.5 }}>
                เริ่มต้นโดยการเลือกผลงานที่เคยบันทึกไว้ใน <strong>"คลังผลงานกลาง"</strong> มาปรับใช้ หรือกดเพิ่มผลงานใหม่เฉพาะโครงการนี้ได้ทันที
                (การปรับแต่งข้อความในโครงการนี้จะไม่ส่งผลกระทบต่อข้อมูลหลักในคลังกลาง)
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleOpenLibrary}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Library size={16} /> เลือกผลงานจากคลังกลาง
                </button>
                <button
                  type="button"
                  onClick={handleAddProject}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF' }}
                >
                  <Plus size={16} /> + เพิ่มผลงานเฉพาะโครงการนี้
                </button>
              </div>
            </div>
          ) : (
            section5.pastProjects.map((p, idx) => {
            const isTorRef = (p.projectType || 'tor_reference') === 'tor_reference';
            const isTooOld = isTorRef && p.completionYearBE < minAllowedYear;
            const isCollapsed = !!collapsedProjects[p.id];
            const blocks = p.imageBlocks !== undefined
              ? p.imageBlocks
              : p.projectImageUrl
              ? [{ id: `img-${p.id}`, type: 'single' as const, url: p.projectImageUrl, caption: (p.projectImageCaption || '').trim() }]
              : [];

            return (
              <div
                key={p.id}
                style={{
                  border: `1.5px solid ${
                    isTooOld
                      ? '#FCA5A5'
                      : isTorRef
                      ? 'var(--primary-600)'
                      : 'var(--slate-300)'
                  }`,
                  borderRadius: '8px',
                  padding: isCollapsed ? '0.75rem 1rem' : '1.25rem',
                  backgroundColor: isTooOld ? '#FEF2F2' : isTorRef ? '#FAFCFF' : '#FFFFFF',
                  opacity: p.isSelected ? 1 : 0.6,
                  boxShadow: isTorRef ? '0 1px 3px rgba(30, 58, 138, 0.06)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Project Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? 0 : '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '320px' }}>
                    <button
                      type="button"
                      onClick={() => toggleProjectCollapse(p.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        color: 'var(--primary-700)',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                      }}
                      title={isCollapsed ? 'ขยายรายละเอียดผลงาน' : 'ยุบย่อผลงาน'}
                    >
                      {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                    </button>

                    <input
                      type="checkbox"
                      checked={p.isSelected}
                      onChange={(e) => handleProjectToggle(p.id, e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      title="เลือกเพื่อนำไปใส่ในเล่มข้อเสนอ"
                    />

                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--slate-400)', minWidth: '22px' }}>
                      #{idx + 1}
                    </span>

                    <input
                      type="text"
                      className="form-input"
                      style={{ fontWeight: 600, flex: 1, minWidth: '220px' }}
                      placeholder="ระบุชื่อโครงการ..."
                      value={p.projectName}
                      onChange={(e) => handleProjectChange(p.id, 'projectName', e.target.value)}
                    />

                    {isCollapsed && (
                      <div
                        onClick={() => toggleProjectCollapse(p.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          color: 'var(--slate-600)',
                          cursor: 'pointer',
                          flexWrap: 'wrap',
                          marginLeft: '4px',
                        }}
                      >
                        {p.clientName && (
                          <span style={{ backgroundColor: 'var(--slate-100)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                            🏛️ {p.clientName}
                          </span>
                        )}
                        <span style={{ backgroundColor: '#F8FAFC', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                          พ.ศ. {p.completionYearBE}
                        </span>
                        {p.contractValue > 0 && (
                          <span style={{ backgroundColor: '#F0FDF4', color: '#166534', padding: '2px 6px', borderRadius: '4px', border: '1px solid #BBF7D0', fontWeight: 600 }}>
                            {p.contractValue.toLocaleString()} บ.
                          </span>
                        )}
                        {blocks.length > 0 && (
                          <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                            📷 {blocks.length} รูป
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Badges & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {/* Project Track Selector */}
                    <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid var(--slate-300)', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => handleProjectChange(p.id, 'projectType', 'tor_reference')}
                        style={{
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          backgroundColor: isTorRef ? 'var(--primary-700)' : 'var(--slate-100)',
                          color: isTorRef ? '#FFFFFF' : 'var(--slate-600)',
                        }}
                      >
                        ผลงานอ้างอิงตาม TOR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleProjectChange(p.id, 'projectType', 'supplementary')}
                        style={{
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          backgroundColor: !isTorRef ? 'var(--primary-700)' : 'var(--slate-100)',
                          color: !isTorRef ? '#FFFFFF' : 'var(--slate-600)',
                        }}
                      >
                        โครงการอื่นๆ
                      </button>
                    </div>

                    {isTorRef && (
                      isTooOld ? (
                        <span className="pill pill-danger" title={`ผลงานนี้แล้วเสร็จปี ${p.completionYearBE} ซึ่งเกินเกณฑ์ ${section5.maxYearsFilter} ปี`}>
                          <AlertTriangle size={12} /> เกินเกณฑ์ {section5.maxYearsFilter} ปี
                        </span>
                      ) : (
                        <span className="pill pill-success">
                          <CheckCircle size={12} /> ผ่านเกณฑ์ปี TOR
                        </span>
                      )
                    )}

                    {/* Reorder Up */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveProject(idx, 'up')}
                      className="btn btn-outline"
                      style={{
                        padding: '0.35rem 0.5rem',
                        opacity: idx === 0 ? 0.35 : 1,
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      }}
                      title="สลับลำดับขึ้น"
                    >
                      <ArrowUp size={14} />
                    </button>

                    {/* Reorder Down */}
                    <button
                      type="button"
                      disabled={idx === section5.pastProjects.length - 1}
                      onClick={() => handleMoveProject(idx, 'down')}
                      className="btn btn-outline"
                      style={{
                        padding: '0.35rem 0.5rem',
                        opacity: idx === section5.pastProjects.length - 1 ? 0.35 : 1,
                        cursor: idx === section5.pastProjects.length - 1 ? 'not-allowed' : 'pointer',
                      }}
                      title="สลับลำดับลง"
                    >
                      <ArrowDown size={14} />
                    </button>

                    {/* Save to Master Library */}
                    <button
                      type="button"
                      onClick={() => handleSaveProjectToLibrary(p)}
                      className="btn btn-outline"
                      style={{
                        color: 'var(--primary-700)',
                        borderColor: '#BAE6FD',
                        backgroundColor: '#F0F9FF',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="บันทึกผลงานโครงการนี้ลงคลังกลางสำหรับใช้ในโครงการอื่น"
                    >
                      <BookmarkPlus size={14} /> บันทึกลงคลังกลาง
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProject(p.id)}
                      className="btn btn-outline"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.35rem 0.55rem' }}
                      title="ลบโครงการนี้"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Toggle expand/collapse button */}
                    <button
                      type="button"
                      onClick={() => toggleProjectCollapse(p.id)}
                      className="btn btn-outline"
                      style={{
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.75rem',
                        color: 'var(--primary-700)',
                        borderColor: 'var(--primary-300)',
                        backgroundColor: isCollapsed ? '#EFF6FF' : '#FFFFFF',
                      }}
                      title={isCollapsed ? 'ขยายรายละเอียดโครงการ' : 'ยุบย่อโครงการ'}
                    >
                      {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <>

                {/* Project Details Grid */}
                <div className="grid-4" style={{ marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>หน่วยงานผู้ว่าจ้าง</label>
                      {p.clientLogoUrl && (
                        <span style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 600 }}>✓ มีโลโก้ลูกค้า</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {p.clientLogoUrl ? (
                        <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                          <img
                            src={p.clientLogoUrl}
                            alt="Client Logo"
                            style={{
                              height: '36px',
                              width: '44px',
                              objectFit: 'contain',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid var(--slate-300)',
                              borderRadius: '4px',
                              padding: '2px',
                              display: 'block',
                            }}
                            title="โลโก้หน่วยงานผู้ว่าจ้าง"
                          />
                          <button
                            type="button"
                            onClick={() => handleProjectFieldsChange(p.id, { clientLogoUrl: undefined })}
                            style={{
                              position: 'absolute',
                              top: '-5px',
                              right: '-5px',
                              background: '#EF4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '16px',
                              height: '16px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: 1,
                            }}
                            title="ลบโลโก้ลูกค้า"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <label
                          style={{
                            padding: '0.4rem 0.55rem',
                            border: '1px dashed var(--slate-300)',
                            borderRadius: '6px',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            color: 'var(--primary-700)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            height: '36px',
                            flexShrink: 0,
                          }}
                          title="อัปโหลดภาพโลโก้ของลูกค้า / หน่วยงานผู้ว่าจ้าง"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) {
                                handleFileUpload(f, (b64) => {
                                  handleProjectFieldsChange(p.id, { clientLogoUrl: b64 });
                                });
                                e.target.value = '';
                              }
                            }}
                          />
                          <Upload size={12} />
                          <span>โลโก้</span>
                        </label>
                      )}
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1 }}
                        placeholder="ระบุชื่อหน่วยงานผู้ว่าจ้าง..."
                        value={p.clientName}
                        onChange={(e) => handleProjectChange(p.id, 'clientName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">
                      <Calendar size={13} style={{ display: 'inline', marginRight: '3px' }} />
                      ปีที่แล้วเสร็จ (พ.ศ.) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.completionYearBE}
                      onChange={(e) => handleProjectChange(p.id, 'completionYearBE', parseInt(e.target.value) || currentYearBE)}
                    />
                  </div>

                  <div>
                    <label className="form-label">มูลค่าสัญญา (บาท)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.contractValue}
                      onChange={(e) => handleProjectChange(p.id, 'contractValue', parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <label className="form-label">ระยะเวลาสัญญา</label>
                    <input
                      type="text"
                      className="form-input"
                      value={p.periodDuration}
                      onChange={(e) => handleProjectChange(p.id, 'periodDuration', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 0, fontWeight: 600, color: 'var(--primary-900)' }}>
                      <FileText size={14} color="var(--primary-700)" />
                      รายละเอียดโครงการและขอบเขตงาน (สามารถแทรก bullet หรือตารางได้) <span className="required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.2rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => {
                          const bulletSnippet = (p.description && !p.description.endsWith('\n') ? '\n' : '') + '• [ระบุกิจกรรม/ขอบเขตงานสำคัญ]';
                          handleProjectChange(p.id, 'description', (p.description || '') + bulletSnippet);
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
                          const tableSnippet = (p.description && !p.description.endsWith('\n') ? '\n\n' : '') +
                            '| ลำดับ | รายละเอียดงาน / ขั้นตอนการดำเนินงาน | ผลผลิต / ระบบงานที่ส่งมอบ |\n' +
                            '| 1 | การวิเคราะห์และออกแบบระบบ | แผนผังสถาปัตยกรรมและข้อกำหนดความต้องการ |\n' +
                            '| 2 | การพัฒนาและติดตั้งระบบ | ซอฟต์แวร์ระบบงานพร้อมฐานข้อมูล |\n' +
                            '| 3 | การทดสอบและถ่ายทอดเทคโนโลยี | รายงานผลการทดสอบและหลักสูตรฝึกอบรม |';
                          handleProjectChange(p.id, 'description', (p.description || '') + tableSnippet);
                        }}
                        title="แทรกตารางแสดงขั้นตอนหรือรายละเอียดงาน"
                      >
                        <TableIcon size={12} /> + ตารางรายละเอียดโครงการ
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: '110px' }}
                    placeholder="เขียนพรรณารายละเอียดโครงการและขอบเขตงาน หรือใช้ปุ่มด้านบนเพื่อแทรกบูลเล็ตพ้อยต์ / ตารางขั้นตอน..."
                    value={p.description}
                    onChange={(e) => handleProjectChange(p.id, 'description', e.target.value)}
                  />
                  <div className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                    💡 <strong>สามารถแทรก bullet ตาราง และรูปภาพได้เหมือนข้อ 3.2:</strong> เขียนพรรณา, สร้างหัวข้อบูลเล็ตด้วยเครื่องหมาย • หรือ - หรือแทรกตารางด้วยรูปแบบ Markdown (| ลำดับ | รายละเอียด |) พร้อมอัปโหลดภาพประกอบ 6 นิ้ว หรือ 3 นิ้วคู่ด้านล่างได้ไม่จำกัดจำนวน
                  </div>
                </div>

                {/* Conditional Fields: TOR Reference vs Supplementary */}
                {isTorRef ? (
                  /* 1. สำหรับผลงานอ้างอิงหลักตาม TOR: ต้องแทรกไฟล์สำเนาสัญญา หรือใบรับรองผลงาน ไว้ในภาคผนวก */
                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      padding: '0.85rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileCheck size={16} color="var(--primary-800)" />
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--primary-900)' }}>
                          เอกสารสำเนาสัญญาจ้าง หรือหนังสือรับรองผลงาน (สำหรับแทรกในภาคผนวก ก)
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#1E40AF', fontStyle: 'italic' }}>
                        * เอกสารนี้จะถูกนำไปจัดวางใน ภาคผนวก ก: สำเนาสัญญาและหนังสือรับรองผลงาน ท้ายเล่ม Word อัตโนมัติ
                      </span>
                    </div>

                    {p.certificateFileUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#FFFFFF', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid #93C5FD' }}>
                        <img
                          src={p.certificateFileUrl}
                          alt="Certificate"
                          style={{ height: '55px', width: '45px', objectFit: 'cover', borderRadius: '3px', border: '1px solid #CBD5E1' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)' }}>
                            ✓ แนบไฟล์แล้ว: {p.certificateFileName || 'สำเนาสัญญา/หนังสือรับรองผลงาน'}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--slate-500)' }}>
                            พร้อมพิมพ์ลงในภาคผนวก ก ของเล่มข้อเสนอ
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleProjectFieldsChange(p.id, {
                              certificateFileUrl: undefined,
                              certificateFileName: undefined,
                            });
                          }}
                          className="btn btn-outline"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          <Trash2 size={12} /> ลบเอกสาร
                        </button>
                      </div>
                    ) : (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem',
                          border: '1.5px dashed #3B82F6',
                          borderRadius: '6px',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          color: '#1D4ED8',
                          fontWeight: 500,
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              handleFileUpload(f, (b64, name) => {
                                handleProjectFieldsChange(p.id, {
                                  certificateFileUrl: b64,
                                  certificateFileName: name,
                                });
                              });
                              e.target.value = '';
                            }
                          }}
                        />
                        <Paperclip size={16} /> แนบไฟล์สำเนาสัญญาจ้าง หรือหนังสือรับรองผลงาน (ภาพสแกน/เอกสาร)
                      </label>
                    )}
                  </div>
                ) : (
                  /* 2. สำหรับโครงการอื่นๆ: มีช่องให้เขียนโน้ตกำกับกิจกรรมใดที่สอดคล้อง ไม่จำเป็นต้องแนบสำเนาสัญญา */
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      padding: '0.85rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--slate-800)', fontWeight: 600 }}>
                      <BookmarkCheck size={16} color="var(--primary-700)" />
                      โน้ตกำกับกิจกรรมที่สอดคล้องกับงานจ้างโครงการนี้ (Relevance & Activity Alignment)
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 400, marginLeft: 'auto' }}>
                        (ไม่จำเป็นต้องแนบสำเนาสัญญาหรือหนังสือรับรองผลงาน)
                      </span>
                    </label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '55px', backgroundColor: '#FFFFFF' }}
                      placeholder="ระบุว่าผลงานนี้มีกิจกรรม เทคโนโลยี หรือแนวปฏิบัติใดที่สอดคล้องและเป็นประโยชน์ต่องานจ้างโครงการนี้ เช่น มีกิจกรรมพัฒนาระบบ Microservices และเชื่อมต่อ API คล้ายคลึงกับขอบเขตงานข้อ 4.3..."
                      value={p.relevanceNote || ''}
                      onChange={(e) => handleProjectChange(p.id, 'relevanceNote', e.target.value)}
                    />
                  </div>
                )}

                {/* Project Image Blocks (รองรับทั้งภาพคู่ 3 นิ้ว 2 คอลัมน์ และภาพเดี่ยว 6 นิ้ว ได้ไม่จำกัดจำนวน) */}
                <ReportImageManager
                  title={`ภาพประกอบสำหรับโครงการ: ${p.projectName || 'ผลงานนี้'}`}
                  subtitle="สามารถแทรกภาพเดี่ยว 6 นิ้ว กึ่งกลาง หรือภาพคู่ 3 นิ้ว 2 คอลัมน์ ได้ไม่จำกัดจำนวนเหมือนหัวข้อ 3.2"
                  imageBlocks={
                    p.imageBlocks !== undefined
                      ? p.imageBlocks
                      : p.projectImageUrl
                      ? [
                          {
                            id: `img-${p.id}`,
                            type: 'single',
                            url: p.projectImageUrl,
                            caption: (p.projectImageCaption || '').trim(),
                          },
                        ]
                      : []
                  }
                  onChange={(newBlocks) => {
                    handleProjectFieldsChange(p.id, {
                      imageBlocks: newBlocks,
                      projectImageUrl: undefined,
                      projectImageCaption: undefined,
                    });
                  }}
                  defaultCaptionPrefix={`ภาพผลงาน ${idx + 1}`}
                />

                    {/* Bottom collapse button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px dashed var(--slate-200)' }}>
                      <button
                        type="button"
                        onClick={() => toggleProjectCollapse(p.id)}
                        className="btn btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', color: 'var(--slate-600)', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <ChevronUp size={13} /> ยุบโครงการนี้ (เสร็จแล้ว)
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Action Bar for adding new projects */}
      {section5.pastProjects.length > 0 && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1.25rem',
            backgroundColor: '#F8FAFC',
            borderRadius: '8px',
            border: '2px dashed #CBD5E1',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleAddProject}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.5rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              boxShadow: '0 2px 4px rgba(30, 58, 138, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={18} /> + เพิ่มผลงานโครงการใหม่ (ว่าง)
          </button>
          <button
            type="button"
            onClick={handleOpenLibrary}
            className="btn btn-outline"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.9rem',
              color: 'var(--primary-800)',
              borderColor: 'var(--primary-600)',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Library size={16} /> ดึงจากคลังผลงานกลาง
          </button>
        </div>
      )}
    </div>

      {/* Master Library Selection Modal */}
      {showLibraryModal && (
        <div className="modal-overlay" onClick={() => setShowLibraryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-900)', margin: 0 }}>
                    {libraryTab === 'projects'
                      ? 'คลังข้อมูลผลงานโครงการกลาง (Prime Digital Past Track Records)'
                      : 'คลังข้อมูลและประวัติบริษัทกลาง (Master Company Profile)'}
                  </h3>
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '12px', border: '1px solid #A7F3D0', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    💾 บันทึกในเครื่องปลอดภัย (IndexedDB ไม่จำกัดขนาด)
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  {libraryTab === 'projects'
                    ? `มีทั้งหมด ${projectsLibrary.length} โครงการ (บันทึกในเครื่องปลอดภัย ไม่สูญหาย สามารถส่งออก/นำเข้าไฟล์ .json เพื่อแลกเปลี่ยนข้อมูลในทีม)`
                    : 'ข้อมูลนิติบุคคลและประวัติองค์กรระดับคลังกลาง (บันทึกในเครื่องปลอดภัย)'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  ref={fileInputProjectsRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImportProjectsFile}
                />
                {libraryTab === 'projects' && (
                  <>
                    <button
                      type="button"
                      onClick={exportMasterProjectsToJson}
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: '#047857', borderColor: '#6EE7B7', backgroundColor: '#ECFDF5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="ส่งออกไฟล์ .json ของคลังผลงานทั้งหมด เพื่อสำรองข้อมูลหรือแชร์ให้ทีม"
                    >
                      <Download size={13} /> ส่งออกคลัง (.json)
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputProjectsRef.current?.click()}
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: '#1D4ED8', borderColor: '#93C5FD', backgroundColor: '#EFF6FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="นำเข้าไฟล์ .json ที่ได้รับจากเพื่อนร่วมงาน (ผสานโครงการใหม่อัตโนมัติ ข้อมูลเดิมไม่สูญหาย)"
                    >
                      <Upload size={13} /> นำเข้าคลัง (.json)
                    </button>
                  </>
                )}
                {libraryTab === 'projects' ? (
                  projectsLibrary.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleClearAllLibrary}
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                      title="ล้างข้อมูลผลงานทั้งหมดในคลังกลาง"
                    >
                      <Trash2 size={13} /> ล้างคลังทั้งหมด
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResetLibrary}
                      className="btn btn-outline"
                      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: '#2563EB', borderColor: '#93C5FD' }}
                      title="คืนค่าผลงานตัวอย่างเดิม"
                    >
                      <RotateCcw size={13} /> คืนค่าตัวอย่างเดิม
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleResetMasterCompany}
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                    title="คืนค่าข้อมูลบริษัทกลางเป็นค่าเริ่มต้น"
                  >
                    <RotateCcw size={13} /> คืนค่าเริ่มต้น
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowLibraryModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Tab Switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--slate-200)', backgroundColor: '#F8FAFC' }}>
              <button
                type="button"
                onClick={() => setLibraryTab('projects')}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  fontWeight: libraryTab === 'projects' ? 600 : 400,
                  color: libraryTab === 'projects' ? 'var(--primary-700)' : 'var(--slate-600)',
                  borderBottom: libraryTab === 'projects' ? '2px solid var(--primary-600)' : 'none',
                  backgroundColor: libraryTab === 'projects' ? '#FFFFFF' : 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <FileText size={15} /> คลังผลงานโครงการย้อนหลัง ({projectsLibrary.length})
              </button>
              <button
                type="button"
                onClick={() => setLibraryTab('company')}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  fontWeight: libraryTab === 'company' ? 600 : 400,
                  color: libraryTab === 'company' ? 'var(--primary-700)' : 'var(--slate-600)',
                  borderBottom: libraryTab === 'company' ? '2px solid var(--primary-600)' : 'none',
                  backgroundColor: libraryTab === 'company' ? '#FFFFFF' : 'transparent',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Building2 size={15} /> ข้อมูลบริษัทกลาง (Master Company Profile)
              </button>
            </div>

            {libraryTab === 'projects' ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Quick Bulk Save Action */}
                {section5.pastProjects.length > 0 && (
                  <div
                    style={{
                      padding: '0.65rem 1rem',
                      backgroundColor: '#F0F9FF',
                      borderBottom: '1px solid #BAE6FD',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', color: '#0369A1' }}>
                      💡 มีผลงานโครงการในเล่มนี้ {section5.pastProjects.length} รายการ ต้องการบันทึก/อัปเดตเข้าคลังกลางทั้งหมดพร้อมกันหรือไม่?
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveAllProjectsToLibrary}
                      className="btn btn-outline"
                      style={{
                        fontSize: '0.78rem',
                        padding: '0.3rem 0.65rem',
                        backgroundColor: '#FFFFFF',
                        color: '#0284C7',
                        borderColor: '#7DD3FC',
                        fontWeight: 600,
                      }}
                    >
                      <BookmarkPlus size={13} /> + บันทึกทุกผลงานในเล่มนี้เข้าคลังกลาง
                    </button>
                  </div>
                )}

                {/* Multi-Selection Control Bar */}
                {projectsLibrary.length > 0 && (
                  <div
                    style={{
                      padding: '0.65rem 1rem',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '1px solid var(--slate-200)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: 'var(--slate-800)',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedLibraryIds.length > 0 && selectedLibraryIds.length === projectsLibrary.length}
                          onChange={handleSelectAllLibrary}
                          style={{ width: '17px', height: '17px', cursor: 'pointer' }}
                        />
                        <span>เลือกทั้งหมด ({projectsLibrary.length} โครงการ)</span>
                      </label>
                      {selectedLibraryIds.length > 0 && (
                        <span
                          style={{
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          เลือกแล้ว {selectedLibraryIds.length} โครงการ
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleImportSelectedFromLibrary}
                      disabled={selectedLibraryIds.length === 0}
                      className="btn btn-primary"
                      style={{
                        fontSize: '0.825rem',
                        padding: '0.4rem 0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: selectedLibraryIds.length > 0 ? '0 2px 4px rgba(30, 58, 138, 0.15)' : 'none',
                        opacity: selectedLibraryIds.length === 0 ? 0.5 : 1,
                        cursor: selectedLibraryIds.length === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <Plus size={15} /> นำเข้าโครงการที่เลือก ({selectedLibraryIds.length}) เข้าเล่มนี้
                    </button>
                  </div>
                )}

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '65vh', overflowY: 'auto' }}>
                  {projectsLibrary.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '2.5rem 1rem',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px dashed #CBD5E1',
                      }}
                    >
                      <Building2 size={36} color="#94A3B8" style={{ margin: '0 auto 0.5rem' }} />
                      <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>
                        ไม่มีข้อมูลผลงานโครงการในคลังกลางแล้ว
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
                        คุณได้ล้างข้อมูลโครงการจำลองออกเรียบร้อยแล้ว หรือสามารถกดปุ่มเพื่อคืนค่าตัวอย่างกลับมาได้
                      </div>
                      <button
                        type="button"
                        onClick={handleResetLibrary}
                        className="btn btn-primary"
                        style={{ marginTop: '0.85rem', fontSize: '0.825rem', padding: '0.45rem 1rem' }}
                      >
                        <RotateCcw size={14} /> คืนค่าตัวอย่างผลงานเดิม
                      </button>
                    </div>
                  ) : (
                    sortPastProjects(projectsLibrary).map((item) => {
                      const isItemChecked = selectedLibraryIds.includes(item.id);
                      const isTorRef = (item.projectType || 'tor_reference') === 'tor_reference';
                      return (
                        <div
                          key={item.id}
                          style={{
                            border: `1.5px solid ${isItemChecked ? 'var(--primary-600)' : 'var(--slate-200)'}`,
                            borderRadius: '8px',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: isItemChecked ? '#F0F9FF' : '#FFFFFF',
                            gap: '0.75rem',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                            <input
                              type="checkbox"
                              checked={isItemChecked}
                              onChange={() => handleToggleLibrarySelect(item.id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                              title="เลือกโครงการนี้เพื่อนำเข้าพร้อมกัน"
                            />
                            {item.clientLogoUrl && (
                              <img
                                src={item.clientLogoUrl}
                                alt="Client Logo"
                                style={{
                                  height: '42px',
                                  width: '48px',
                                  objectFit: 'contain',
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid var(--slate-300)',
                                  borderRadius: '4px',
                                  padding: '2px',
                                  flexShrink: 0,
                                }}
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
                                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleAddFromLibrary(item)}
                              className="btn btn-outline"
                              style={{ borderColor: 'var(--primary-600)', color: 'var(--primary-700)', whiteSpace: 'nowrap', fontSize: '0.825rem', padding: '0.4rem 0.8rem' }}
                            >
                              + เลือกเดี่ยว
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteFromLibrary(item.id, item.projectName)}
                              className="btn btn-outline"
                              style={{
                                borderColor: '#FECACA',
                                color: '#DC2626',
                                backgroundColor: '#FEF2F2',
                                padding: '0.4rem 0.55rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="ลบออกจากคลังข้อมูลกลาง"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Master Company Profile Tab */
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '68vh', overflowY: 'auto', padding: '1.25rem' }}>
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.9rem' }}>
                      🏢 ข้อมูลบริษัทกลาง (Master Company Profile)
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#15803D', marginTop: '2px' }}>
                      บันทึกในเครื่องปลอดภัย (IndexedDB) เพื่อให้ทุกโครงการดึงข้อมูลชุดเดียวกันไปใช้ได้ทันที
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleApplyMasterCompanyToCurrent}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Download size={13} /> นำข้อมูลนี้ใส่ในเล่มนี้
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveMasterCompanyInModal}
                      className="btn btn-outline"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: '#0369A1', borderColor: '#7DD3FC', backgroundColor: '#FFFFFF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Save size={13} /> บันทึกเข้าคลังกลาง
                    </button>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">ชื่อบริษัทกลาง <span className="required">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={masterCompany.companyName}
                      onChange={(e) => setMasterCompany({ ...masterCompany, companyName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">ทุนจดทะเบียน</label>
                    <input
                      type="text"
                      className="form-input"
                      value={masterCompany.registeredCapital}
                      onChange={(e) => setMasterCompany({ ...masterCompany, registeredCapital: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">ปีที่จดทะเบียนจัดตั้ง (พ.ศ.)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={masterCompany.establishedYearBE}
                      onChange={(e) => setMasterCompany({ ...masterCompany, establishedYearBE: parseInt(e.target.value) || 2558 })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">เงื่อนไขผลงานย้อนหลัง (ปี)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={masterCompany.maxYearsFilter}
                      onChange={(e) => setMasterCompany({ ...masterCompany, maxYearsFilter: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                </div>

                {/* Photos */}
                <div className="grid-2" style={{ backgroundColor: 'var(--slate-50)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--slate-200)' }}>
                  {/* Logo */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.825rem' }}>โลโก้บริษัทกลาง</label>
                    {masterCompany.companyLogoUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={masterCompany.companyLogoUrl}
                          alt="Master Logo"
                          style={{ height: '60px', maxWidth: '120px', objectFit: 'contain', border: '1px solid var(--slate-300)', borderRadius: '4px', backgroundColor: '#FFF', padding: '2px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setMasterCompany({ ...masterCompany, companyLogoUrl: undefined })}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                        >
                          <Trash2 size={12} /> ลบ
                        </button>
                      </div>
                    ) : (
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.45rem', border: '1px dashed var(--slate-300)', borderRadius: '6px', backgroundColor: '#FFF', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--slate-600)' }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, (b64) => setMasterCompany({ ...masterCompany, companyLogoUrl: b64 }));
                          }}
                        />
                        <Upload size={14} /> อัปโหลดโลโก้บริษัทกลาง
                      </label>
                    )}
                  </div>

                  {/* Office Photo */}
                  <div>
                    <label className="form-label" style={{ fontSize: '0.825rem' }}>ภาพสำนักงาน/อาคารบริษัทกลาง</label>
                    {masterCompany.companyOfficeImageUrl ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={masterCompany.companyOfficeImageUrl}
                          alt="Master Office"
                          style={{ height: '60px', width: '90px', objectFit: 'cover', border: '1px solid var(--slate-300)', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setMasterCompany({ ...masterCompany, companyOfficeImageUrl: undefined, companyOfficeImageCaption: undefined })}
                          className="btn btn-outline"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                        >
                          <Trash2 size={12} /> ลบ
                        </button>
                      </div>
                    ) : (
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.45rem', border: '1px dashed var(--slate-300)', borderRadius: '6px', backgroundColor: '#FFF', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--slate-600)' }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, (b64) => setMasterCompany({ ...masterCompany, companyOfficeImageUrl: b64 }));
                            e.target.value = '';
                          }}
                        />
                        <Upload size={14} /> อัปโหลดภาพสำนักงาน
                      </label>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ประวัติและข้อมูลองค์กร (Company Profile Overview)</label>
                  <textarea
                    className="form-textarea"
                    rows={4}
                    value={masterCompany.companyProfile}
                    onChange={(e) => setMasterCompany({ ...masterCompany, companyProfile: e.target.value })}
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">วิสัยทัศน์และพันธกิจ (Vision & Mission)</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={masterCompany.visionMission}
                      onChange={(e) => setMasterCompany({ ...masterCompany, visionMission: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">คำบรรยายภาพสำนักงาน</label>
                    <input
                      type="text"
                      className="form-input"
                      value={masterCompany.companyOfficeImageCaption || ''}
                      placeholder="เช่น อาคารสำนักงานใหญ่ บริษัท ไพร์มดิจิทัล..."
                      onChange={(e) => setMasterCompany({ ...masterCompany, companyOfficeImageCaption: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ความเชี่ยวชาญหลัก (พิมพ์แยกทีละบรรทัด)</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={(masterCompany.specializations || []).join('\n')}
                    onChange={(e) => setMasterCompany({ ...masterCompany, specializations: e.target.value.split('\n').filter(Boolean) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">ใบรับรองมาตรฐานและทะเบียนที่ปรึกษา (พิมพ์แยกทีละบรรทัด)</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={(masterCompany.certifications || []).join('\n')}
                    onChange={(e) => setMasterCompany({ ...masterCompany, certifications: e.target.value.split('\n').filter(Boolean) })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
