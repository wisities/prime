import React, { useState, useEffect } from 'react';
import { Section4TeamAndRisk, TeamMember, RiskItem, TorScopeItem } from '../types/proposal';
import { ReportImageManager } from './ReportImageManager';
import { compressImageFile } from '../utils/imageCompressor';
import {
  getMasterTeamLibrary,
  fetchMasterTeamLibraryFromCloud,
  deleteMasterTeamMember,
  clearAllMasterTeamMembers,
  resetMasterTeamLibrary,
  saveMemberToMasterLibrary,
  saveMemberToMasterLibraryResult,
  saveMultipleMembersToMasterLibrary,
  saveMultipleMembersToMasterLibraryResult,
  MASTER_TEAM_UPDATED_EVENT,
  initMasterLibraryRealtime,
  exportMasterTeamToJson,
  importMasterTeamFromJson,
  generateMasterMemberId,
} from '../services/masterLibraryService';
import { syncMasterLibraryToGoogle } from '../services/googleSyncService';
import { Users, ShieldAlert, Plus, Trash2, Library, ChevronDown, ChevronUp, TableProperties, CheckCheck, Sparkles, RotateCcw, Clock, ArrowUp, ArrowDown, BookmarkPlus, BookmarkCheck, Check, Camera, Upload, User, Database, Download, Briefcase, List, Table as TableIcon, CloudUpload, Loader2 } from 'lucide-react';

interface Section4EditorProps {
  section4: Section4TeamAndRisk;
  scopeItems?: TorScopeItem[];
  onChange: (section4: Section4TeamAndRisk) => void;
  onChangeScopeItems?: (items: TorScopeItem[]) => void;
}

export const Section4Editor: React.FC<Section4EditorProps> = ({
  section4,
  scopeItems = [],
  onChange,
  onChangeScopeItems,
}) => {
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [teamLibrary, setTeamLibrary] = useState<TeamMember[]>(getMasterTeamLibrary());
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [savedMemberToast, setSavedMemberToast] = useState<string | null>(null);
  const [syncingMemberId, setSyncingMemberId] = useState<string | null>(null);
  const fileInputTeamRef = React.useRef<HTMLInputElement>(null);

  const handleImportTeamFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const res = importMasterTeamFromJson(text);
      if (res.success) {
        const fresh = getMasterTeamLibrary();
        setTeamLibrary(fresh);
        alert(`นำเข้าและผสานรายชื่อบุคลากรสำเร็จ! ปัจจุบันคลังกลางมีทั้งหมด ${res.count} ท่าน`);
      } else {
        alert(`เกิดข้อผิดพลาดในการนำเข้า: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    fetchMasterTeamLibraryFromCloud().then((items) => {
      setTeamLibrary(items);
    });

    const handleLocalUpdate = (e: any) => {
      if (e.detail) setTeamLibrary(e.detail);
    };
    window.addEventListener(MASTER_TEAM_UPDATED_EVENT, handleLocalUpdate);

    const unsubscribe = initMasterLibraryRealtime((fresh) => {
      setTeamLibrary(fresh);
    });

    return () => {
      window.removeEventListener(MASTER_TEAM_UPDATED_EVENT, handleLocalUpdate);
      unsubscribe();
    };
  }, []);

  const handleOpenLibrary = () => {
    setTeamLibrary(getMasterTeamLibrary());
    setSelectedLibraryIds([]);
    setShowLibraryModal(true);
  };

  const handleToggleTeamLibrarySelect = (id: string) => {
    setSelectedLibraryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllTeamLibrary = () => {
    if (selectedLibraryIds.length === teamLibrary.length) {
      setSelectedLibraryIds([]);
    } else {
      setSelectedLibraryIds(teamLibrary.map((m) => m.id));
    }
  };

  const handleImportSelectedTeamFromLibrary = () => {
    if (selectedLibraryIds.length === 0) {
      alert('กรุณาทำเครื่องหมายเลือกบุคลากรที่ต้องการนำเข้าอย่างน้อย 1 ท่าน');
      return;
    }

    const selectedMembersToImport = teamLibrary.filter((m) =>
      selectedLibraryIds.includes(m.id)
    );

    const existingNames = new Set(section4.teamMembers.map((m) => m.name.trim()));
    const newItems: TeamMember[] = [];
    let duplicateCount = 0;

    selectedMembersToImport.forEach((member, idx) => {
      if (existingNames.has(member.name.trim())) {
        duplicateCount++;
      } else {
        const uniqueId = `member-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;
        newItems.push({
          ...member,
          id: uniqueId,
          originalMasterId: member.id,
          memberCode: member.memberCode || member.id,
          recordedYearBE: member.recordedYearBE || currentYearBE,
        });
      }
    });

    if (newItems.length > 0) {
      onChange({
        ...section4,
        teamMembers: [...section4.teamMembers, ...newItems],
      });
    }

    setShowLibraryModal(false);
    setSelectedLibraryIds([]);

    if (duplicateCount > 0 && newItems.length > 0) {
      alert(`นำเข้าบุคลากรสำเร็จ ${newItems.length} ท่าน (ข้าม ${duplicateCount} ท่านที่มีชื่อซ้ำในโครงการนี้แล้ว)`);
    } else if (duplicateCount > 0 && newItems.length === 0) {
      alert(`บุคลากรทั้งหมดที่เลือก (${duplicateCount} ท่าน) มีอยู่ในโครงการนี้แล้ว`);
    } else {
      alert(`นำเข้าบุคลากร ${newItems.length} ท่าน เข้าสู่โครงการนี้เรียบร้อยแล้ว`);
    }
  };

  const handleDeleteFromLibrary = (id: string, name: string) => {
    if (confirm(`ยืนยันการลบ "${name}" ออกจากคลังข้อมูลกลางถาวร?`)) {
      const updated = deleteMasterTeamMember(id);
      setTeamLibrary(updated);
    }
  };

  const handleClearAllLibrary = () => {
    if (confirm('ยืนยันการล้างข้อมูลบุคลากรทั้งหมดในคลังกลาง? (คุณสามารถกดปุ่มคืนค่าบุคลากรหลัก 12 ท่านได้ในภายหลัง)')) {
      const updated = clearAllMasterTeamMembers();
      setTeamLibrary(updated);
    }
  };

  const handleResetLibrary = () => {
    if (confirm('ต้องการคืนค่ารายการบุคลากรหลักของบริษัท (12 ท่าน) กลับมาใช่หรือไม่?')) {
      const updated = resetMasterTeamLibrary();
      setTeamLibrary(updated);
    }
  };

  const handleScopeComplianceChange = (
    id: string,
    field: 'complianceStatus' | 'complianceNote',
    value: any
  ) => {
    if (!onChangeScopeItems) return;
    const updated = scopeItems.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChangeScopeItems(updated);
  };

  const handleSetAllComply = () => {
    if (!onChangeScopeItems) return;
    const updated = scopeItems.map((item) => ({
      ...item,
      complianceStatus: 'comply' as const,
      complianceNote: item.complianceNote || 'ยอมรับและดำเนินการตามข้อกำหนด TOR ครบถ้วน',
    }));
    onChangeScopeItems(updated);
  };

  const complyCount = scopeItems.filter((s) => (s.complianceStatus || 'comply') === 'comply').length;
  const exceedCount = scopeItems.filter((s) => s.complianceStatus === 'exceed').length;

  const currentYearBE = new Date().getFullYear() + 543;

  const handleTeamMemberChange = (id: string, field: keyof TeamMember, value: any) => {
    const updated = section4.teamMembers.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    onChange({ ...section4, teamMembers: updated });
  };

  const handleStartWorkYearChange = (id: string, yearValue: string) => {
    const yearNum = parseInt(yearValue, 10);
    const updated = section4.teamMembers.map((m) => {
      if (m.id !== id) return m;
      if (!isNaN(yearNum) && yearNum >= 2480 && yearNum <= currentYearBE + 1) {
        const calculatedYears = Math.max(0, currentYearBE - yearNum);
        return {
          ...m,
          startWorkYearBE: yearNum,
          experienceYears: calculatedYears,
        };
      }
      return {
        ...m,
        startWorkYearBE: isNaN(yearNum) ? undefined : yearNum,
      };
    });
    onChange({ ...section4, teamMembers: updated });
  };

  const handleAddMember = () => {
    const defaultStartYear = currentYearBE - 5;
    const newId = `member-${Date.now()}`;
    const allKnown = [...teamLibrary, ...section4.teamMembers];
    const autoMemberCode = generateMasterMemberId(currentYearBE, allKnown);
    const newMember: TeamMember = {
      id: newId,
      memberCode: autoMemberCode,
      recordedYearBE: currentYearBE,
      name: 'นาย/นางสาว (ระบุชื่อ-นามสกุล)',
      proposedRole: 'วิศวกรซอฟต์แวร์ / ผู้เชี่ยวชาญ',
      education: 'ปริญญาตรี วิทยาการคอมพิวเตอร์',
      certifications: 'ใบรับรองมาตรฐานวิชาชีพ',
      startWorkYearBE: defaultStartYear,
      experienceYears: 5,
      personalBio: 'มีประสบการณ์และความเชี่ยวชาญในการพัฒนาระบบเทคโนโลยีสารสนเทศภาครัฐอย่างต่อเนื่อง',
      responsibilities: 'รับผิดชอบงานตามที่ได้รับมอบหมาย',
      highlightProjects: 'มีประสบการณ์ในโครงการภาครัฐที่เกี่ยวข้อง',
    };
    onChange({ ...section4, teamMembers: [...section4.teamMembers, newMember] });
  };

  const handlePhotoUpload = async (id: string, file: File) => {
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|jfif)$/i.test(file.name);
    if (!isImage) {
      alert('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPG, PNG, WebP)');
      return;
    }
    try {
      const compressed = await compressImageFile(file, 800, 800, 0.85);
      if (compressed) {
        handleTeamMemberChange(id, 'photoUrl', compressed);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        handleTeamMemberChange(id, 'photoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteMember = (id: string) => {
    onChange({ ...section4, teamMembers: section4.teamMembers.filter((m) => m.id !== id) });
  };

  const handleAddFromLibrary = (member: TeamMember) => {
    if (section4.teamMembers.some((m) => m.name === member.name)) {
      alert(`มีบุคลากร "${member.name}" ในโครงการนี้แล้ว`);
      return;
    }
    const cloned: TeamMember = {
      ...member,
      id: `member-${Date.now()}`,
      originalMasterId: member.id,
      memberCode: member.memberCode || member.id,
      recordedYearBE: member.recordedYearBE || currentYearBE,
    };
    onChange({ ...section4, teamMembers: [...section4.teamMembers, cloned] });
    setShowLibraryModal(false);
  };

  const handleMoveMember = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= section4.teamMembers.length) return;
    const reordered = [...section4.teamMembers];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    onChange({ ...section4, teamMembers: reordered });
  };

  

  const handleSaveMemberToLibrary = (member: TeamMember) => {
    if (!member.name || member.name.trim() === '' || member.name.includes('(ระบุชื่อ-นามสกุล)')) {
      alert('กรุณาระบุชื่อ-นามสกุลของบุคลากรก่อนบันทึกลงคลังข้อมูลกลาง');
      return;
    }
    const { updatedLibrary, savedMember, isNew } = saveMemberToMasterLibraryResult(member);
    setTeamLibrary(updatedLibrary);

    // CRITICAL FIX: อัปเดต originalMasterId และ memberCode กลับเข้าเล่มข้อเสนอโครงการทันที
    const updatedMembers = section4.teamMembers.map((m) => {
      if (m.id === member.id || (member.originalMasterId && m.originalMasterId === member.originalMasterId)) {
        return {
          ...m,
          originalMasterId: savedMember.id,
          memberCode: savedMember.memberCode,
          recordedYearBE: savedMember.recordedYearBE,
          photoUrl: savedMember.photoUrl || m.photoUrl,
        };
      }
      return m;
    });

    onChange({
      ...section4,
      teamMembers: updatedMembers,
    });

    const actionText = isNew ? 'บันทึกบุคลากรใหม่' : 'อัปเดตข้อมูลบุคลากรเดิม';
    setSavedMemberToast(
      `✓ ${actionText} "${savedMember.name}" (รหัส: ${savedMember.memberCode || savedMember.id}) ในคลังบุคลากรกลางเรียบร้อยแล้ว`
    );
    setTimeout(() => setSavedMemberToast(null), 3000);
  };

  const handleSyncSingleMemberToSheet = async (member: TeamMember) => {
    if (!member.name || member.name.trim() === '' || member.name.includes('(ระบุชื่อ-นามสกุล)')) {
      alert('กรุณาระบุชื่อ-นามสกุลของบุคลากรก่อนซิงค์ขึ้น Google Sheet');
      return;
    }
    try {
      setSyncingMemberId(member.id);
      const { updatedLibrary, savedMember } = saveMemberToMasterLibraryResult(member);
      setTeamLibrary(updatedLibrary);

      const updatedMembers = section4.teamMembers.map((m) => {
        if (m.id === member.id || (member.originalMasterId && m.originalMasterId === member.originalMasterId)) {
          return {
            ...m,
            originalMasterId: savedMember.id,
            memberCode: savedMember.memberCode,
            recordedYearBE: savedMember.recordedYearBE,
            photoUrl: savedMember.photoUrl || m.photoUrl,
          };
        }
        return m;
      });
      onChange({
        ...section4,
        teamMembers: updatedMembers,
      });

      const res = await syncMasterLibraryToGoogle({
        incremental: true,
        projectsToSync: [],
        teamToSync: [savedMember],
      });

      if (res.success) {
        const syncedMember = res.updatedTeam?.[0] || savedMember;
        setTeamLibrary(getMasterTeamLibrary());
        const afterSyncMembers = updatedMembers.map((m) =>
          m.id === member.id || (m.originalMasterId && m.originalMasterId === savedMember.id)
            ? {
                ...m,
                originalMasterId: savedMember.id,
                memberCode: syncedMember.memberCode || savedMember.memberCode,
                photoUrl: syncedMember.photoUrl || m.photoUrl,
                bioImageBlocks: (syncedMember as any).bioImageBlocks || m.bioImageBlocks,
              }
            : m
        );
        onChange({
          ...section4,
          teamMembers: afterSyncMembers,
        });
        setSavedMemberToast(
          `☁️ ซิงค์ข้อมูลบุคลากร "${savedMember.name}" (${savedMember.memberCode || savedMember.id}) ขึ้น Google Sheet & Drive สำเร็จแล้ว!`
        );
        setTimeout(() => setSavedMemberToast(null), 4000);
      } else {
        alert(res.error || res.message || 'ซิงค์ข้อมูลบุคลากรไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(err?.message || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูลบุคลากร');
    } finally {
      setSyncingMemberId(null);
    }
  };

  const handleSaveAllMembersToLibrary = () => {
    const validMembers = section4.teamMembers.filter(
      (m) => m.name && m.name.trim() !== '' && !m.name.includes('(ระบุชื่อ-นามสกุล)')
    );
    if (validMembers.length === 0) {
      alert('ไม่มีรายการบุคลากรที่มีชื่อถูกต้องให้บันทึก');
      return;
    }
    const { updatedLibrary, savedMembers } = saveMultipleMembersToMasterLibraryResult(validMembers);
    setTeamLibrary(updatedLibrary);

    // อัปเดต originalMasterId และ memberCode ให้กับบุคลากรทุกท่านในเล่ม
    const updatedMembers = section4.teamMembers.map((m) => {
      const match = savedMembers.find(
        (sm) =>
          (m.originalMasterId && sm.id === m.originalMasterId) ||
          (m.originalMasterId && sm.originalMasterId === m.originalMasterId) ||
          sm.id === m.id ||
          (sm.memberCode && m.memberCode && sm.memberCode.trim().toLowerCase() === m.memberCode.trim().toLowerCase()) ||
          (sm.name && m.name && sm.name.trim().toLowerCase() === m.name.trim().toLowerCase())
      );
      if (match) {
        return {
          ...m,
          originalMasterId: match.id,
          memberCode: match.memberCode,
          recordedYearBE: match.recordedYearBE,
          photoUrl: match.photoUrl || m.photoUrl,
        };
      }
      return m;
    });

    onChange({
      ...section4,
      teamMembers: updatedMembers,
    });

    alert(`บันทึกและอัปเดตข้อมูลบุคลากรทั้งหมด ${validMembers.length} ท่าน เข้าสู่คลังข้อมูลกลางเรียบร้อยแล้ว`);
  };

  // Risk Items
  const handleRiskChange = (id: string, field: keyof RiskItem, value: any) => {
    const updated = section4.riskItems.map((r) =>
      r.id === id ? { ...r, [field]: value } : r
    );
    onChange({ ...section4, riskItems: updated });
  };

  const handleAddRisk = () => {
    const newRisk: RiskItem = {
      id: `risk-${Date.now()}`,
      category: 'ด้านเทคนิค',
      riskTitle: 'ประเด็นความเสี่ยงใหม่ที่อาจเกิดขึ้นในโครงการ',
      likelihood: 'ปานกลาง',
      impact: 'ปานกลาง',
      mitigationPlan: 'มาตรการป้องกันเชิงรุกเพื่อลดโอกาสการเกิดปัญหา',
      contingencyPlan: 'แผนรองรับเร่งด่วนหากเกิดปัญหาขึ้นจริง',
    };
    onChange({ ...section4, riskItems: [...section4.riskItems, newRisk] });
  };

  const handleDeleteRisk = (id: string) => {
    onChange({ ...section4, riskItems: section4.riskItems.filter((r) => r.id !== id) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 4.1 Team Members Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2>
              <Users size={20} color="var(--primary-700)" />
              ส่วนที่ 4: คณะผู้ดำเนินงานและแผนบริหารความเสี่ยง (Team & Risk)
            </h2>
            <p>รายชื่อคุณวุฒิบุคลากรหลักที่เสนอในโครงการ และแผนบริหารความเสี่ยงเชิงรุก</p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleOpenLibrary}
              className="btn btn-outline"
              style={{ color: 'var(--primary-800)', borderColor: 'var(--primary-600)' }}
            >
              <Library size={16} /> เลือกจากคลังบุคลากร
            </button>
            <button
              type="button"
              onClick={handleAddMember}
              className="btn btn-primary"
            >
              <Plus size={16} /> เพิ่มบุคลากร
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">คำอธิบายภาพรวมคณะผู้ดำเนินงาน</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '75px' }}
            value={section4.teamOverview}
            onChange={(e) => onChange({ ...section4, teamOverview: e.target.value })}
          />
        </div>

        {/* ภาพประกอบในส่วนที่ 4 (ไม่จำกัดจำนวน: เช่น แผนผังองค์กร 6 นิ้ว หรือภาพคู่ 3 นิ้ว) */}
        <ReportImageManager
          title="ภาพผังโครงสร้างองค์กรและคณะผู้ดำเนินงาน (ไม่จำกัดจำนวน)"
          subtitle="รองรับทั้งภาพผังองค์กรเดี่ยว 6 นิ้ว กึ่งกลาง และภาพคู่ 2 คอลัมน์ 3 นิ้ว เช่น ผังโครงสร้างโครงการ สายการบังคับบัญชา แผนภาพการประสานงาน"
          imageBlocks={section4.imageBlocks || []}
          defaultCaptionPrefix="ภาพที่ 4.1-"
          onChange={(newBlocks) => onChange({ ...section4, imageBlocks: newBlocks })}
        />

        {/* Toast Notification */}
        {savedMemberToast && (
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
              marginTop: '0.75rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Check size={16} color="#059669" />
            <span>{savedMemberToast}</span>
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
            <strong>ข้อมูลบุคลากรในโครงการนี้เป็นอิสระ:</strong> ท่านสามารถแก้ไขตำแหน่ง หน้าที่ความรับผิดชอบ และผลงานเด่นเฉพาะโครงการนี้ได้ตามต้องการ โดยไม่กระทบกับข้อมูลหลักในคลังบุคลากรกลาง
          </span>
        </div>

        {/* Team Members List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {section4.teamMembers.length === 0 ? (
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
                <Users size={28} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1E293B' }}>
                ยังไม่มีรายชื่อบุคลากรในโครงการนี้
              </div>
              <div style={{ fontSize: '0.875rem', color: '#64748B', maxWidth: '520px', lineHeight: 1.5 }}>
                ท่านสามารถเลือกบุคลากรจาก <strong>"คลังบุคลากรกลาง"</strong> มาปรับบทบาท/หน้าที่ให้ตรงกับโครงการนี้ หรือเพิ่มบุคลากรใหม่เฉพาะโครงการนี้ได้
                (การปรับแต่งบทบาทจะไม่ส่งผลต่อข้อมูลต้นฉบับในคลังกลาง)
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleOpenLibrary}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Library size={16} /> เลือกบุคลากรจากคลังกลาง
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="btn btn-outline"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF' }}
                >
                  <Plus size={16} /> + เพิ่มบุคลากรเฉพาะโครงการนี้
                </button>
              </div>
            </div>
          ) : (
            section4.teamMembers.map((member, idx) => (
              <div
              key={member.id}
              style={{
                border: '1px solid var(--slate-200)',
                borderRadius: '8px',
                padding: '1.15rem',
                backgroundColor: '#FFFFFF',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      backgroundColor: 'var(--primary-100)',
                      color: 'var(--primary-800)',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                    }}
                  >
                    ลำดับที่ {idx + 1}
                  </span>
                  {(member.memberCode || member.id) && (
                    <span
                      style={{
                        backgroundColor: '#E0F2FE',
                        color: '#0369A1',
                        border: '1px solid #BAE6FD',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        letterSpacing: '0.02em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title={`รหัส ID บุคลากร: ${member.memberCode || member.id}${member.originalMasterId ? ' (เชื่อมโยงคลังกลาง: ' + member.originalMasterId + ')' : ''}`}
                    >
                      ID: {member.memberCode || member.id}
                      {member.originalMasterId && <span style={{ fontSize: '0.7rem' }}>🔗</span>}
                    </span>
                  )}
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontWeight: 600, width: '280px' }}
                    value={member.name}
                    placeholder="นาย/นางสาว (ระบุชื่อ-นามสกุล)"
                    onChange={(e) => handleTeamMemberChange(member.id, 'name', e.target.value)}
                  />
                  <span
                    style={{
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--primary-700)',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Clock size={13} />
                    ประสบการณ์ {member.experienceYears} ปี
                    {member.startWorkYearBE ? ` (เริ่มงานปี พ.ศ. ${member.startWorkYearBE})` : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Reorder Up */}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveMember(idx, 'up')}
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
                    disabled={idx === section4.teamMembers.length - 1}
                    onClick={() => handleMoveMember(idx, 'down')}
                    className="btn btn-outline"
                    style={{
                      padding: '0.35rem 0.5rem',
                      opacity: idx === section4.teamMembers.length - 1 ? 0.35 : 1,
                      cursor: idx === section4.teamMembers.length - 1 ? 'not-allowed' : 'pointer',
                    }}
                    title="สลับลำดับลง"
                  >
                    <ArrowDown size={14} />
                  </button>

                  {/* Save to Master Library */}
                  <button
                    type="button"
                    onClick={() => handleSaveMemberToLibrary(member)}
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
                    title="บันทึกข้อมูลบุคลากรท่านนี้ลงคลังกลางสำหรับใช้ในโครงการอื่น"
                  >
                    <BookmarkPlus size={14} /> บันทึกลงคลังกลาง
                  </button>

                  {/* Sync Single Member to Google Sheet & Drive */}
                  <button
                    type="button"
                    disabled={syncingMemberId === member.id}
                    onClick={() => handleSyncSingleMemberToSheet(member)}
                    className="btn btn-outline"
                    style={{
                      color: '#15803D',
                      borderColor: '#86EFAC',
                      backgroundColor: '#F0FDF4',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="ซิงค์เฉพาะบุคลากรท่านนี้ขึ้น Google Sheet & Drive ทันทีโดยไม่ต้องซิงค์ทั้งหมด"
                  >
                    {syncingMemberId === member.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> กำลังซิงค์...
                      </>
                    ) : (
                      <>
                        <CloudUpload size={14} /> ซิงค์เฉพาะคนนี้
                      </>
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(member.id)}
                    className="btn btn-outline"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.35rem 0.55rem' }}
                    title="ลบออกจากโครงการนี้"
                  >
                    <Trash2 size={14} /> ลบ
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.65rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Photo 1.5 Inch Box */}
                <div
                  style={{
                    width: '125px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '110px',
                      height: '146px',
                      borderRadius: '6px',
                      border: member.photoUrl ? '2px solid var(--primary-600)' : '2px dashed var(--slate-300)',
                      backgroundColor: '#F8FAFC',
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    {member.photoUrl ? (
                      <>
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleTeamMemberChange(member.id, 'photoUrl', undefined)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            backgroundColor: 'rgba(220, 38, 38, 0.85)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="ลบรูปถ่าย"
                        >
                          <Trash2 size={12} />
                        </button>
                      </> 
                    ) : (
                      <div style={{ textAlign: 'center', padding: '6px' }}>
                        <Camera size={26} color="#94A3B8" style={{ margin: '0 auto 4px' }} />
                        <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 600 }}>
                          รูปถ่าย 1.5 นิ้ว
                        </div>
                        <div style={{ fontSize: '0.625rem', color: '#94A3B8' }}>
                          (หน้าตรงทางการ)
                        </div>
                      </div>
                    )}
                  </div>

                  <label
                    className="btn btn-outline"
                    style={{
                      width: '110px',
                      marginTop: '6px',
                      fontSize: '0.725rem',
                      padding: '0.3rem 0.4rem',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      gap: '4px',
                      color: 'var(--primary-700)',
                      borderColor: '#BFDBFE',
                      backgroundColor: '#F0F9FF',
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(member.id, file);
                      }}
                    />
                    <Upload size={12} /> {member.photoUrl ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
                  </label>
                </div>

                {/* Form Inputs Details */}
                <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>รหัสประจำตัว (Member ID)</span>
                        {member.originalMasterId && (
                          <span style={{ fontSize: '0.68rem', color: '#0284C7', fontWeight: 600 }}>🔗 คลังกลาง</span>
                        )}
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder={`เช่น ${currentYearBE}-EMP-001`}
                        value={member.memberCode || ''}
                        onChange={(e) => handleTeamMemberChange(member.id, 'memberCode', e.target.value)}
                        title="รหัสประจำตัวบุคลากรตามปีที่บันทึก"
                      />
                    </div>
                    <div>
                      <label className="form-label">ปีที่บันทึกข้อมูล (พ.ศ.)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={member.recordedYearBE || currentYearBE}
                        onChange={(e) => {
                          const yr = parseInt(e.target.value) || currentYearBE;
                          const updatedCode = member.memberCode && /^\d{4}-/.test(member.memberCode)
                            ? member.memberCode.replace(/^\d{4}/, String(yr))
                            : (member.memberCode || `${yr}-EMP-001`);
                          const updated = section4.teamMembers.map((m) =>
                            m.id === member.id ? { ...m, recordedYearBE: yr, memberCode: updatedCode } : m
                          );
                          onChange({ ...section4, teamMembers: updated });
                        }}
                        title="ปี พ.ศ. ที่บันทึกประวัติบุคลากรเข้าระบบ"
                      />
                    </div>
                    <div>
                      <label className="form-label">ตำแหน่งที่เสนอในโครงการ</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น ผู้จัดการโครงการ"
                        value={member.proposedRole}
                        onChange={(e) => handleTeamMemberChange(member.id, 'proposedRole', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>ปีที่เริ่มทำงาน (พ.ศ.)</span>
                        <span style={{ fontSize: '0.725rem', color: '#2563EB', fontWeight: 600 }}>
                          = {member.experienceYears} ปี
                        </span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          className="form-input"
                          placeholder={'เช่น ' + (currentYearBE - member.experienceYears)}
                          value={member.startWorkYearBE || ''}
                          onChange={(e) => handleStartWorkYearChange(member.id, e.target.value)}
                          title="ระบุปี พ.ศ. ที่เริ่มทำงาน ระบบจะคำนวณปีประสบการณ์ให้อัตโนมัติ"
                        />
                        <div
                          style={{
                            padding: '0.45rem 0.65rem',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#1D4ED8',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                          title={'คำนวณถึงปัจจุบัน (ปี พ.ศ. ' + currentYearBE + ')'}
                        >
                          {member.experienceYears} ปี
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="form-label">วุฒิการศึกษา</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น ปริญญาตรี วิศวกรรมศาสตร์"
                        value={member.education}
                        onChange={(e) => handleTeamMemberChange(member.id, 'education', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">ใบรับรองมาตรฐานวิชาชีพ (Certs)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="เช่น PMP, ITIL, AWS"
                        value={member.certifications}
                        onChange={(e) => handleTeamMemberChange(member.id, 'certifications', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Personal Bio */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, color: 'var(--primary-900)' }}>
                        ประวัติส่วนตัวและประสบการณ์ทำงานโดยสรุป
                      </label>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const bulletSnippet = (member.personalBio && !member.personalBio.endsWith('\n') ? '\n' : '') + '• [ระบุความเชี่ยวชาญ/ทักษะสำคัญ]';
                            handleTeamMemberChange(member.id, 'personalBio', (member.personalBio || '') + bulletSnippet);
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
                            const tableSnippet = (member.personalBio && !member.personalBio.endsWith('\n') ? '\n\n' : '') +
                              '| ลำดับ | รายละเอียดความเชี่ยวชาญ / ทักษะ | ผลงาน / การรับรอง |\n' +
                              '| 1 | การออกแบบระบบ Cloud Architecture | AWS Solutions Architect Pro |\n' +
                              '| 2 | การพัฒนาระบบ Enterprise API | ระบบบริการประชาชนภาครัฐ |';
                            handleTeamMemberChange(member.id, 'personalBio', (member.personalBio || '') + tableSnippet);
                          }}
                          title="แทรกตารางแสดงความเชี่ยวชาญ"
                        >
                          <TableIcon size={12} /> + แทรกช่องตาราง
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '80px', lineHeight: 1.5 }}
                      placeholder="สรุปประวัติส่วนตัว ความเชี่ยวชาญ และความพร้อมในการปฏิบัติงานตามตำแหน่ง (รองรับเว้นวรรค เว้นบรรทัด บูลเล็ต • และตาราง |...|)..."
                      value={member.personalBio || ''}
                      onChange={(e) => handleTeamMemberChange(member.id, 'personalBio', e.target.value)}
                    />
                    <div className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                      💡 สามารถเว้นวรรคและเว้นบรรทัดได้อย่างอิสระ ระบบจะรักษาระยะเว้นวรรค เว้นบรรทัด บูลเล็ต และตารางใน Word (.docx) ให้ตรงตามที่วางไว้
                    </div>
                    {/* ภาพประกอบประวัติย่อและความเชี่ยวชาญ (เดี่ยว 6 นิ้ว / คู่ 3 นิ้ว) */}
                    <div style={{ marginTop: '0.75rem' }}>
                      <ReportImageManager
                        title={`ภาพประกอบประวัติและความเชี่ยวชาญ: ${member.name} (ขนาด 6 นิ้ว หรือ 3 นิ้วคู่)`}
                        subtitle="รองรับทั้งภาพเดี่ยว 6 นิ้ว กึ่งกลาง และภาพคู่ 2 คอลัมน์ ขนาดละ 3 นิ้ว เช่น ภาพวุฒิบัตร ใบประกาศนียบัตร หรือภาพการปฏิบัติงาน"
                        imageBlocks={member.bioImageBlocks || []}
                        onChange={(newBlocks) => handleTeamMemberChange(member.id, 'bioImageBlocks', newBlocks)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">บทบาทหน้าที่ในโครงการ</label>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '60px' }}
                      value={member.responsibilities}
                      onChange={(e) => handleTeamMemberChange(member.id, 'responsibilities', e.target.value)}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, color: 'var(--primary-900)' }}>
                        ผลงานหรือโครงการเด่นที่ผ่านมา (Highlight Projects)
                      </label>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.55rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const bulletSnippet = (member.highlightProjects && !member.highlightProjects.endsWith('\n') ? '\n' : '') + '• [ระบุชื่อโครงการ บทบาทหน้าที่ และมูลค่า/เทคโนโลยีที่ใช้]';
                            handleTeamMemberChange(member.id, 'highlightProjects', (member.highlightProjects || '') + bulletSnippet);
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
                            const tableSnippet = (member.highlightProjects && !member.highlightProjects.endsWith('\n') ? '\n\n' : '') +
                              '| ลำดับ | ชื่อโครงการสำคัญที่ผ่านมา | บทบาทหน้าที่ | หน่วยงาน / ผู้ว่าจ้าง |\n' +
                              '| 1 | โครงการพัฒนาระบบบริการดิจิทัล | ผู้จัดการโครงการ | สำนักงานปลัดกระทรวงฯ |\n' +
                              '| 2 | โครงการบูรณาการฐานข้อมูลภาครัฐ | สถาปนิกผู้ออกแบบระบบ | กรมสารสนเทศฯ |';
                            handleTeamMemberChange(member.id, 'highlightProjects', (member.highlightProjects || '') + tableSnippet);
                          }}
                          title="แทรกตารางผลงานโครงการสำคัญ"
                        >
                          <TableIcon size={12} /> + แทรกช่องตาราง
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="form-textarea"
                      style={{ minHeight: '80px', lineHeight: 1.5 }}
                      placeholder="ระบุโครงการเด่นที่เคยรับผิดชอบ (รองรับเว้นวรรค เว้นบรรทัด บูลเล็ต • และตาราง |...|)..."
                      value={member.highlightProjects}
                      onChange={(e) => handleTeamMemberChange(member.id, 'highlightProjects', e.target.value)}
                    />
                    <div className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                      💡 สามารถเว้นวรรคและเว้นบรรทัดได้อย่างอิสระ ระบบจะรักษาระยะเว้นวรรค เว้นบรรทัด บูลเล็ต และตารางใน Word (.docx) ให้ตรงตามที่วางไว้
                    </div>
                    {/* ภาพประกอบผลงานโครงการเด่น (Highlight Projects - เดี่ยว 6 นิ้ว / คู่ 3 นิ้ว) */}
                    <div style={{ marginTop: '0.75rem' }}>
                      <ReportImageManager
                        title={`ภาพประกอบผลงานโครงการเด่น: ${member.name} (ขนาด 6 นิ้ว หรือ 3 นิ้วคู่)`}
                        subtitle="รองรับทั้งภาพเดี่ยว 6 นิ้ว กึ่งกลาง และภาพคู่ 2 คอลัมน์ ขนาดละ 3 นิ้ว เช่น ภาพหน้าจอระบบ แผนผังสถาปัตยกรรม หรือหนังสือชมเชย/รับรองผลงาน"
                        imageBlocks={member.highlightImageBlocks || member.imageBlocks || []}
                        onChange={(newBlocks) => {
                          handleTeamMemberChange(member.id, 'highlightImageBlocks', newBlocks);
                          handleTeamMemberChange(member.id, 'imageBlocks', newBlocks);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

          {section4.teamMembers.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={handleOpenLibrary}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF' }}
              >
                <Library size={15} /> + เลือกบุคลากรจากคลังกลางเพิ่ม
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} /> + เพิ่มบุคลากรใหม่เฉพาะโครงการนี้
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4.2 Risk Management Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2 style={{ fontSize: '1.1rem' }}>
              <ShieldAlert size={20} color="var(--gold-600)" />
              4.2 แผนการบริหารจัดการความเสี่ยง (Risk Management Matrix)
            </h2>
            <p>วิเคราะห์ความเสี่ยงด้านเทคนิค บุคลากร ระยะเวลา พร้อมมาตรการลดความเสี่ยงเชิงรุก</p>
          </div>

          <button
            type="button"
            onClick={handleAddRisk}
            className="btn btn-outline"
            style={{ borderColor: 'var(--gold-600)', color: 'var(--gold-600)' }}
          >
            <Plus size={16} /> เพิ่มประเด็นความเสี่ยง
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">คำอธิบายภาพรวมแนวทางการบริหารความเสี่ยง</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '75px' }}
            value={section4.riskManagementOverview}
            onChange={(e) => onChange({ ...section4, riskManagementOverview: e.target.value })}
          />
        </div>

        {/* Risk Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {section4.riskItems.map((risk) => (
            <div
              key={risk.id}
              style={{
                border: '1px solid var(--slate-200)',
                borderRadius: '8px',
                padding: '1.15rem',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                  <select
                    className="form-select"
                    style={{ width: '160px', fontWeight: 600 }}
                    value={risk.category}
                    onChange={(e) => handleRiskChange(risk.id, 'category', e.target.value)}
                  >
                    <option value="ด้านเทคนิค">ด้านเทคนิค</option>
                    <option value="ด้านบุคลากร">ด้านบุคลากร</option>
                    <option value="ด้านระยะเวลา">ด้านระยะเวลา</option>
                    <option value="ด้านขอบเขตงาน">ด้านขอบเขตงาน</option>
                    <option value="ด้านความปลอดภัย">ด้านความปลอดภัย</option>
                  </select>

                  <input
                    type="text"
                    className="form-input"
                    style={{ fontWeight: 600, flex: 1 }}
                    value={risk.riskTitle}
                    onChange={(e) => handleRiskChange(risk.id, 'riskTitle', e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.8rem' }}>
                    <span>โอกาส:</span>
                    <select
                      className="form-select"
                      style={{ padding: '0.3rem 0.5rem', width: '90px' }}
                      value={risk.likelihood}
                      onChange={(e) => handleRiskChange(risk.id, 'likelihood', e.target.value)}
                    >
                      <option value="ต่ำ">ต่ำ</option>
                      <option value="ปานกลาง">ปานกลาง</option>
                      <option value="สูง">สูง</option>
                    </select>

                    <span>ผลกระทบ:</span>
                    <select
                      className="form-select"
                      style={{ padding: '0.3rem 0.5rem', width: '90px' }}
                      value={risk.impact}
                      onChange={(e) => handleRiskChange(risk.id, 'impact', e.target.value)}
                    >
                      <option value="ต่ำ">ต่ำ</option>
                      <option value="ปานกลาง">ปานกลาง</option>
                      <option value="สูง">สูง</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteRisk(risk.id)}
                    className="btn btn-outline"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.35rem 0.55rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label className="form-label" style={{ color: 'var(--primary-800)' }}>
                    มาตรการป้องกันและลดความเสี่ยง (Mitigation Plan)
                  </label>
                  <textarea
                    className="form-textarea"
                    value={risk.mitigationPlan}
                    onChange={(e) => handleRiskChange(risk.id, 'mitigationPlan', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ color: 'var(--gold-600)' }}>
                    แผนรองรับกรณีเกิดปัญหาขึ้นจริง (Contingency Plan)
                  </label>
                  <textarea
                    className="form-textarea"
                    value={risk.contingencyPlan}
                    onChange={(e) => handleRiskChange(risk.id, 'contingencyPlan', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4.3 การบริหารจัดการโครงการ (Project Management) */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="card-title-group" style={{ margin: 0 }}>
            <h2 style={{ fontSize: '1.15rem' }}>
              <Briefcase size={20} color="var(--primary-700)" />
              4.3 การบริหารจัดการโครงการ (Project Management)
            </h2>
            <p>
              รายละเอียดพรรณาแนวทางการบริหารจัดการโครงการ แผนผังขั้นตอนการทำงาน (Workflow) และภาพประกอบการดำเนินงาน
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                if (
                  !section4.projectManagementOverview ||
                  window.confirm('คุณต้องการนำข้อความร่างมาตรฐานการบริหารจัดการโครงการ (PMBOK & Agile) มาใส่แทนที่ข้อความเดิมใช่หรือไม่?')
                ) {
                  const defaultTemplate = `บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด ดำเนินการบริหารจัดการโครงการตามมาตรฐานสากล (PMBOK & Agile/Scrum Framework) เพื่อควบคุมและผลักดันงานให้บรรลุเป้าหมายตามขอบเขตงาน (TOR) ทั้งด้านคุณภาพ เวลา และงบประมาณอย่างมีประสิทธิภาพสูงสุด โดยมีแนวทางบริหาร 5 มิติหลักดังนี้:

1. การบริหารขอบเขตงานและคุณภาพ (Scope & Quality Management): ดำเนินการประชุมวิเคราะห์ความต้องการ (Requirements Gathering) ร่วมกับผู้ใช้งาน จัดทำเอกสารข้อกำหนดความต้องการของระบบ (SRS) ตรวจสอบความถูกต้องและจัดทำแบบรับรองผล (Sign-off) ในแต่ละงวดงานอย่างเคร่งครัด
2. การบริหารเวลาและงวดงาน (Time & Schedule Management): ควบคุมการดำเนินงานตามแผนผังการทำงานหลัก (WBS) ประชุมติดตามความคืบหน้า (Sprint Planning & Daily Standup) และรายงานความก้าวหน้าแก่คณะกรรมการตรวจรับพัสดุเป็นประจำทุกสัปดาห์และทุกเดือน
3. การบริหารการสื่อสารและการประสานงาน (Communication Management): กำหนดช่องทางการติดต่อประสานงานอย่างเป็นทางการและบันทึกรายงานการประชุม (Minutes of Meeting) อย่างเป็นระบบ พร้อมจัดประชุมทบทวนผลการทำงานร่วมกับผู้ประสานงานหลักของหน่วยงานอย่างต่อเนื่อง
4. การควบคุมและส่งมอบงาน (Deliverable & Change Management): ดำเนินกระบวนการทดสอบระบบร่วมกับผู้ใช้งาน (User Acceptance Test - UAT) การจัดเตรียมคู่มือระบบ การฝึกอบรมบุคลากร และกระบวนการขออนุมัติการเปลี่ยนแปลง (Change Request) ที่รัดกุม
5. การรับประกันและการสนับสนุนหลังส่งมอบ (Warranty & Maintenance Support): จัดตั้งทีมงาน Helpdesk & Technical Support ดูแลแก้ไขปัญหาตามข้อตกลงระดับการให้บริการ (SLA) ตลอดระยะเวลารับประกันของสัญญา`;
                  onChange({ ...section4, projectManagementOverview: defaultTemplate });
                }
              }}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderColor: 'var(--slate-300)', color: 'var(--slate-700)' }}
              title="ดึงข้อความตัวอย่างโครงสร้างการบริหารโครงการตามมาตรฐาน"
            >
              <RotateCcw size={14} /> ใส่ข้อความร่างมาตรฐาน PMBOK / Agile
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label" style={{ fontWeight: 600 }}>
            รายละเอียดพรรณาการทำงานและการบริหารโครงการ (Narrative Project Management Description)
          </label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '160px', lineHeight: 1.6 }}
            value={section4.projectManagementOverview || ''}
            onChange={(e) => onChange({ ...section4, projectManagementOverview: e.target.value })}
            placeholder="พรรณนารายละเอียดกระบวนการทำงาน การควบคุมคุณภาพ การบริหารจัดการเวลา การสื่อสาร และการส่งมอบงานในโครงการ..."
          />
          <p style={{ fontSize: '0.785rem', color: '#64748B', marginTop: '4px' }}>
            * ข้อความนี้จะถูกจัดพิมพ์ขึ้นเป็นหัวข้อ 4.3 ในเอกสาร Word (.docx) ตามรูปแบบฟอนต์สารบรรณเก้า (TH Sarabun PSK 16pt)
          </p>
        </div>

        {/* ช่องอัพโหลดภาพประกอบการบริหารโครงการ */}
        <ReportImageManager
          title="ภาพประกอบการบริหารจัดการโครงการ (Project Management Diagrams)"
          subtitle="อัปโหลดผังขั้นตอนการทำงาน (Workflow), แผนผังสายการประสานงาน (Communication Flow), แผนภาพ Agile/Scrum Sprint หรือภาพกระบวนการทำงานอื่นๆ (รองรับภาพเดี่ยว 6 นิ้ว และภาพคู่ 3 นิ้ว)"
          imageBlocks={section4.projectManagementImageBlocks || []}
          defaultCaptionPrefix="ภาพที่ 4.3-"
          onChange={(newBlocks) => onChange({ ...section4, projectManagementImageBlocks: newBlocks })}
        />
      </div>

      {/* 4.4 ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR (TOR Compliance & Value-Added Matrix) */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="card-title-group" style={{ margin: 0 }}>
            <h2 style={{ fontSize: '1.15rem' }}>
              <TableProperties size={20} color="var(--primary-700)" />
              4.4 ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR (Compliance & Value-Added Matrix)
            </h2>
            <p>
              ตารางเปรียบเทียบข้อกำหนด TOR ทุกข้อ โดยระบุว่า "ยอมรับและดำเนินการตาม TOR" หรือ "ยอมรับและเสนอแนวทางดีกว่า TOR" พร้อมคำอธิบายในช่องหมายเหตุ
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleSetAllComply}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderColor: 'var(--slate-300)', color: 'var(--slate-700)' }}
              title="ตั้งค่าทุกข้อเป็น 'ยอมรับและดำเนินการตาม TOR'"
            >
              <CheckCheck size={14} /> ตั้งค่าทุกข้อเป็น "ยอมรับตาม TOR"
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">คำนำตารางเปรียบเทียบข้อเสนอโครงการ</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '60px' }}
            value={section4.complianceMatrixOverview || ''}
            onChange={(e) => onChange({ ...section4, complianceMatrixOverview: e.target.value })}
            placeholder="ระบุข้อความนำ เช่น บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด ยืนยันการปฏิบัติตามข้อกำหนดในขอบเขตงานทุกประการ..."
          />
        </div>

        {/* Status Counter Bar */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            backgroundColor: 'var(--slate-50)',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            border: '1px solid var(--slate-200)',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--slate-700)' }}>
            ขอบเขตงานทั้งหมด: <strong>{scopeItems.length}</strong> ข้อ
          </span>
          <span style={{ fontSize: '0.85rem', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
            ✓ ยอมรับและดำเนินการตาม TOR: {complyCount} ข้อ
          </span>
          <span style={{ fontSize: '0.85rem', color: '#92400E', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
            ⭐ ยอมรับและเสนอแนวทางดีกว่า TOR: {exceedCount} ข้อ
          </span>
        </div>

        {/* Table of Scope Items */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--primary-800)', color: 'white' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '38%', border: '1px solid var(--slate-300)' }}>
                  คอลัมน์ 1: ข้อกำหนดตามประกาศจัดจ้าง (TOR)
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '28%', border: '1px solid var(--slate-300)' }}>
                  คอลัมน์ 2: การดำเนินการ
                </th>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '34%', border: '1px solid var(--slate-300)' }}>
                  คอลัมน์ 3: หมายเหตุ / รายละเอียดที่เสนอดีกว่า TOR
                </th>
              </tr>
            </thead>
            <tbody>
              {scopeItems.map((item) => {
                const isExceed = item.complianceStatus === 'exceed';
                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: isExceed ? '#FFFBEB' : '#FFFFFF',
                      borderBottom: '1px solid var(--slate-200)',
                    }}
                  >
                    <td style={{ padding: '10px', border: '1px solid var(--slate-200)', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary-900)' }}>
                          {item.clauseNumber}
                        </span>
                        <span style={{ fontWeight: item.level === 1 ? 600 : 500, color: 'var(--slate-800)' }}>
                          {item.title || item.requirement}
                        </span>
                      </div>
                      {item.requirement && item.requirement !== item.title && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', lineHeight: 1.4 }}>
                          {item.requirement}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '10px', border: '1px solid var(--slate-200)', verticalAlign: 'top', textAlign: 'center' }}>
                      <select
                        className="form-select"
                        style={{
                          width: '100%',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          backgroundColor: isExceed ? '#FEF3C7' : '#EFF6FF',
                          color: isExceed ? '#92400E' : '#1E40AF',
                          borderColor: isExceed ? '#FCD34D' : '#93C5FD',
                        }}
                        value={item.complianceStatus || 'comply'}
                        onChange={(e) => handleScopeComplianceChange(item.id, 'complianceStatus', e.target.value)}
                      >
                        <option value="comply">ยอมรับและดำเนินการตาม TOR</option>
                        <option value="exceed">ยอมรับและเสนอแนวทางดีกว่า TOR</option>
                      </select>
                      <div style={{ fontSize: '0.725rem', marginTop: '4px', color: isExceed ? '#B45309' : '#3B82F6', fontWeight: 500 }}>
                        {isExceed ? '⭐ เสนอคุณภาพ/มาตรฐานสูงกว่าเกณฑ์' : '✓ เป็นไปตามข้อเสนอขั้นต่ำของ TOR'}
                      </div>
                    </td>

                    <td style={{ padding: '10px', border: '1px solid var(--slate-200)', verticalAlign: 'top' }}>
                      <textarea
                        className="form-textarea"
                        style={{
                          minHeight: '60px',
                          fontSize: '0.825rem',
                          padding: '6px 8px',
                          backgroundColor: isExceed ? '#FFFFFF' : '#FAFAFA',
                          borderColor: isExceed ? '#F59E0B' : 'var(--slate-300)',
                        }}
                        placeholder={isExceed ? 'ระบุคำอธิบายสั้นๆ ว่าข้อเสนอนี้ดียิ่งกว่า TOR อย่างไร (เช่น เพิ่ม SLA, เสริม AI, ยกระดับมาตรฐาน...)' : 'ระบุหมายเหตุเพิ่มเติม (ถ้ามี)'}
                        value={item.complianceNote || ''}
                        onChange={(e) => handleScopeComplianceChange(item.id, 'complianceNote', e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Library Selection Modal */}
      {showLibraryModal && (
        <div className="modal-overlay">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-900)', margin: 0 }}>
                    คลังข้อมูลบุคลากรกลาง (Prime Digital Talent Pool)
                  </h3>
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#ECFDF5', color: '#047857', padding: '2px 8px', borderRadius: '12px', border: '1px solid #A7F3D0', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    💾 บันทึกในเครื่องปลอดภัย (IndexedDB)
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  มีทั้งหมด {teamLibrary.length} รายการ (บันทึกในเครื่องปลอดภัย ไม่สูญหาย สามารถส่งออก/นำเข้าไฟล์ .json เพื่อแลกเปลี่ยนข้อมูลในทีม)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  ref={fileInputTeamRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImportTeamFile}
                />
                <button
                  type="button"
                  onClick={exportMasterTeamToJson}
                  className="btn btn-outline"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: '#047857', borderColor: '#6EE7B7', backgroundColor: '#ECFDF5', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="ส่งออกไฟล์ .json ของคลังบุคลากรทั้งหมด เพื่อสำรองข้อมูลหรือแชร์ให้ทีม"
                >
                  <Download size={13} /> ส่งออกคลัง (.json)
                </button>
                <button
                  type="button"
                  onClick={() => fileInputTeamRef.current?.click()}
                  className="btn btn-outline"
                  style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: '#1D4ED8', borderColor: '#93C5FD', backgroundColor: '#EFF6FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="นำเข้าไฟล์ .json ที่ได้รับจากเพื่อนร่วมงาน (ผสานรายชื่อใหม่อัตโนมัติ ข้อมูลเดิมไม่สูญหาย)"
                >
                  <Upload size={13} /> นำเข้าคลัง (.json)
                </button>
                {teamLibrary.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearAllLibrary}
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: '#DC2626', borderColor: '#FCA5A5' }}
                    title="ล้างข้อมูลบุคลากรทั้งหมดในคลังกลาง"
                  >
                    <Trash2 size={13} /> ล้างคลังทั้งหมด
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResetLibrary}
                    className="btn btn-outline"
                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem', color: '#2563EB', borderColor: '#93C5FD' }}
                    title="คืนค่ารายชื่อตัวอย่างเดิม"
                  >
                    <RotateCcw size={13} /> คืนค่าตัวอย่างเดิม
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

            {/* Quick Bulk Save Action */}
            {section4.teamMembers.length > 0 && (
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
                  💡 มีบุคลากรในโครงการนี้ {section4.teamMembers.length} ท่าน ต้องการบันทึก/อัปเดตเข้าคลังกลางทั้งหมดพร้อมกันหรือไม่?
                </div>
                <button
                  type="button"
                  onClick={handleSaveAllMembersToLibrary}
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
                  <BookmarkPlus size={13} /> + บันทึกทุกคนในโครงการนี้เข้าคลังกลาง
                </button>
              </div>
            )}

            {/* Multi-Selection Control Bar */}
            {teamLibrary.length > 0 && (
              <div
                style={{
                  padding: '0.65rem 1rem',
                  backgroundColor: '#F8FAFC',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                  <input
                    type="checkbox"
                    checked={teamLibrary.length > 0 && selectedLibraryIds.length === teamLibrary.length}
                    onChange={handleSelectAllTeamLibrary}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>เลือกทั้งหมด ({selectedLibraryIds.length}/{teamLibrary.length} ท่าน)</span>
                </label>

                {selectedLibraryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleImportSelectedTeamFromLibrary}
                    className="btn btn-primary"
                    style={{ fontSize: '0.825rem', padding: '0.35rem 0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    <Check size={14} /> + นำเข้าบุคลากรที่เลือก ({selectedLibraryIds.length} ท่าน) เข้าโครงการนี้
                  </button>
                )}
              </div>
            )}

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '65vh', overflowY: 'auto' }}>
              {teamLibrary.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px dashed #CBD5E1',
                  }}
                >
                  <Users size={36} color="#94A3B8" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>
                    ไม่มีข้อมูลบุคลากรในคลังกลางแล้ว
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>
                    คุณได้ล้างข้อมูลจำลองออกเรียบร้อยแล้ว หรือสามารถกดปุ่มเพื่อคืนค่าตัวอย่างกลับมาได้
                  </div>
                  <button
                    type="button"
                    onClick={handleResetLibrary}
                    className="btn btn-primary"
                    style={{ marginTop: '0.85rem', fontSize: '0.825rem', padding: '0.45rem 1rem' }}
                  >
                    <RotateCcw size={14} /> คืนค่าตัวอย่างบุคลากรเดิม
                  </button>
                </div>
              ) : (
                teamLibrary.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleTeamLibrarySelect(item.id)}
                    style={{
                      border: selectedLibraryIds.includes(item.id) ? '1.5px solid var(--primary-600)' : '1px solid var(--slate-200)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: selectedLibraryIds.includes(item.id) ? '#F0F9FF' : '#FFFFFF',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={selectedLibraryIds.includes(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleTeamLibrarySelect(item.id);
                        }}
                        style={{ width: '17px', height: '17px', cursor: 'pointer', flexShrink: 0 }}
                      />
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.name}
                          style={{ width: '38px', height: '46px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #CBD5E1', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{ width: '38px', height: '46px', backgroundColor: '#F1F5F9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', flexShrink: 0 }}>
                          <User size={18} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{item.name}</div>
                        <div style={{ fontSize: '0.825rem', color: 'var(--primary-700)' }}>
                          {item.proposedRole} • ประสบการณ์ {item.experienceYears} ปี
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.certifications || item.education}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={syncingMemberId === item.id}
                        onClick={() => handleSyncSingleMemberToSheet(item)}
                        className="btn btn-outline"
                        style={{
                          color: '#15803D',
                          borderColor: '#86EFAC',
                          backgroundColor: '#F0FDF4',
                          fontSize: '0.78rem',
                          padding: '0.4rem 0.65rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          whiteSpace: 'nowrap',
                        }}
                        title="ซิงค์เฉพาะบุคลากรท่านนี้ขึ้น Google Sheet & Drive ทันที"
                      >
                        {syncingMemberId === item.id ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> กำลังซิงค์...
                          </>
                        ) : (
                          <>
                            <CloudUpload size={13} /> ซิงค์คนนี้
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddFromLibrary(item)}
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--primary-600)', color: 'var(--primary-700)', fontSize: '0.825rem', padding: '0.4rem 0.8rem' }}
                      >
                        + เลือกเข้าโครงการ
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteFromLibrary(item.id, item.name)}
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
                ))
              )}
            </div>

            {selectedLibraryIds.length > 0 && (
              <div
                className="modal-footer"
                style={{
                  padding: '0.85rem 1.25rem',
                  backgroundColor: '#FFFFFF',
                  borderTop: '1px solid #E2E8F0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: '0.85rem', color: '#0369A1', fontWeight: 600 }}>
                  เลือกแล้ว {selectedLibraryIds.length} จาก {teamLibrary.length} ท่าน
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedLibraryIds([])}
                    className="btn btn-outline"
                    style={{ fontSize: '0.825rem', padding: '0.4rem 0.85rem' }}
                  >
                    ล้างการเลือก
                  </button>
                  <button
                    type="button"
                    onClick={handleImportSelectedTeamFromLibrary}
                    className="btn btn-primary"
                    style={{ fontSize: '0.825rem', padding: '0.4rem 1rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Check size={15} /> นำเข้าบุคลากรที่เลือก ({selectedLibraryIds.length} ท่าน)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
