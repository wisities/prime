import React, { useState } from 'react';
import { Section4TeamAndRisk, TeamMember, RiskItem, TorScopeItem } from '../types/proposal';
import {
  getMasterTeamLibrary,
  deleteMasterTeamMember,
  clearAllMasterTeamMembers,
  resetMasterTeamLibrary,
} from '../services/masterLibraryService';
import { Users, ShieldAlert, Plus, Trash2, Library, ChevronDown, ChevronUp, TableProperties, CheckCheck, Sparkles, RotateCcw } from 'lucide-react';

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

  const handleOpenLibrary = () => {
    setTeamLibrary(getMasterTeamLibrary());
    setShowLibraryModal(true);
  };

  const handleDeleteFromLibrary = (id: string, name: string) => {
    if (confirm(`ยืนยันการลบ "${name}" ออกจากคลังข้อมูลกลางถาวร?`)) {
      const updated = deleteMasterTeamMember(id);
      setTeamLibrary(updated);
    }
  };

  const handleClearAllLibrary = () => {
    if (confirm('ยืนยันการล้างข้อมูลบุคลากรทั้งหมดในคลังกลาง? (คุณสามารถกดปุ่มคืนค่าตัวอย่างเดิมได้ในภายหลัง)')) {
      const updated = clearAllMasterTeamMembers();
      setTeamLibrary(updated);
    }
  };

  const handleResetLibrary = () => {
    if (confirm('ต้องการคืนค่ารายการบุคลากรตัวอย่างเดิมกลับมาใช่หรือไม่?')) {
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

  const handleTeamMemberChange = (id: string, field: keyof TeamMember, value: any) => {
    const updated = section4.teamMembers.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    onChange({ ...section4, teamMembers: updated });
  };

  const handleAddMember = () => {
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: 'นาย/นางสาว (ระบุชื่อ-นามสกุล)',
      proposedRole: 'วิศวกรซอฟต์แวร์ / ผู้เชี่ยวชาญ',
      education: 'ปริญญาตรี วิทยาการคอมพิวเตอร์',
      certifications: 'ใบรับรองมาตรฐานวิชาชีพ',
      experienceYears: 5,
      responsibilities: 'รับผิดชอบงานตามที่ได้รับมอบหมาย',
      highlightProjects: 'มีประสบการณ์ในโครงการภาครัฐที่เกี่ยวข้อง',
    };
    onChange({ ...section4, teamMembers: [...section4.teamMembers, newMember] });
  };

  const handleDeleteMember = (id: string) => {
    onChange({ ...section4, teamMembers: section4.teamMembers.filter((m) => m.id !== id) });
  };

  const handleAddFromLibrary = (member: TeamMember) => {
    if (section4.teamMembers.some((m) => m.name === member.name)) {
      alert(`มีบุคลากร "${member.name}" ในโครงการนี้แล้ว`);
      return;
    }
    const cloned = { ...member, id: `member-${Date.now()}` };
    onChange({ ...section4, teamMembers: [...section4.teamMembers, cloned] });
    setShowLibraryModal(false);
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

        {/* Team Members List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          {section4.teamMembers.map((member, idx) => (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontWeight: 600, width: '280px' }}
                    value={member.name}
                    onChange={(e) => handleTeamMemberChange(member.id, 'name', e.target.value)}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                    (ประสบการณ์ {member.experienceYears} ปี)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteMember(member.id)}
                  className="btn btn-outline"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.35rem 0.55rem' }}
                >
                  <Trash2 size={14} /> ลบ
                </button>
              </div>

              <div className="grid-3" style={{ marginBottom: '0.85rem' }}>
                <div>
                  <label className="form-label">ตำแหน่งที่เสนอในโครงการ</label>
                  <input
                    type="text"
                    className="form-input"
                    value={member.proposedRole}
                    onChange={(e) => handleTeamMemberChange(member.id, 'proposedRole', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">วุฒิการศึกษา</label>
                  <input
                    type="text"
                    className="form-input"
                    value={member.education}
                    onChange={(e) => handleTeamMemberChange(member.id, 'education', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">ใบรับรองมาตรฐานวิชาชีพ (Certs)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={member.certifications}
                    onChange={(e) => handleTeamMemberChange(member.id, 'certifications', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
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
                  <label className="form-label">ผลงานหรือโครงการเด่นที่ผ่านมา</label>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: '60px' }}
                    value={member.highlightProjects}
                    onChange={(e) => handleTeamMemberChange(member.id, 'highlightProjects', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
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

      {/* 4.3 ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR (TOR Compliance & Value-Added Matrix) */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="card-title-group" style={{ margin: 0 }}>
            <h2 style={{ fontSize: '1.15rem' }}>
              <TableProperties size={20} color="var(--primary-700)" />
              4.3 ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR (Compliance & Value-Added Matrix)
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
        <div className="modal-overlay" onClick={() => setShowLibraryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary-900)', margin: 0 }}>
                  คลังข้อมูลบุคลากรกลาง (Prime Digital Talent Pool)
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  มีทั้งหมด {teamLibrary.length} รายการ (สามารถเลือกเข้าเล่ม หรือลบรายการที่ไม่ต้องการได้)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{item.name}</div>
                      <div style={{ fontSize: '0.825rem', color: 'var(--primary-700)' }}>
                        {item.proposedRole} • ประสบการณ์ {item.experienceYears} ปี
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                        {item.certifications}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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
          </div>
        </div>
      )}
    </div>
  );
};
