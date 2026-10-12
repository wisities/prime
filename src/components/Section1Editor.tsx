import React from 'react';
import { Section1Intro, TorScopeItem } from '../types/proposal';
import { ScopeHierarchyManager } from './ScopeHierarchyManager';
import { Plus, Trash2, BookMarked, Target, Award, Clock, ListTree, FileUp } from 'lucide-react';

interface Section1EditorProps {
  section1: Section1Intro;
  onChange: (section1: Section1Intro) => void;
  onOpenTorImport?: () => void;
}

export const Section1Editor: React.FC<Section1EditorProps> = ({ section1, onChange, onOpenTorImport }) => {
  const handleFieldChange = (field: keyof Section1Intro, value: any) => {
    onChange({ ...section1, [field]: value });
  };

  const handleScopeItemsChange = (items: TorScopeItem[]) => {
    onChange({ ...section1, scopeItems: items });
  };

  const handleAddObjective = () => {
    onChange({
      ...section1,
      objectives: [...section1.objectives, 'ระบุวัตถุประสงค์โครงการข้อใหม่'],
    });
  };

  const handleObjectiveChange = (index: number, text: string) => {
    const updated = [...section1.objectives];
    updated[index] = text;
    onChange({ ...section1, objectives: updated });
  };

  const handleDeleteObjective = (index: number) => {
    onChange({
      ...section1,
      objectives: section1.objectives.filter((_, idx) => idx !== index),
    });
  };

  const handleAddBenefit = () => {
    onChange({
      ...section1,
      expectedBenefits: [...section1.expectedBenefits, 'ระบุประโยชน์ที่คาดว่าจะได้รับข้อใหม่'],
    });
  };

  const handleBenefitChange = (index: number, text: string) => {
    const updated = [...section1.expectedBenefits];
    updated[index] = text;
    onChange({ ...section1, expectedBenefits: updated });
  };

  const handleDeleteBenefit = (index: number) => {
    onChange({
      ...section1,
      expectedBenefits: section1.expectedBenefits.filter((_, idx) => idx !== index),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. บทนำและข้อมูลโครงการทั่วไป */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2>
              <BookMarked size={20} color="var(--primary-700)" />
              ส่วนที่ 1: บทนำและภาพรวมโครงการ (Introduction & Scope)
            </h2>
            <p>ระบุความเป็นมา วัตถุประสงค์ ประโยชน์ ขอบเขตงาน และกรอบระยะเวลาของโครงการ</p>
          </div>
        </div>

        {/* 1.1 ความเป็นมา */}
        <div className="form-group">
          <label className="form-label">
            1.1 ความเป็นมาและความสำคัญ (Project Background) <span className="required">*</span>
          </label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '110px' }}
            placeholder="อธิบายที่มา นโยบาย ปัญหา หรือเหตุผลความจำเป็นของหน่วยงานผู้ว่าจ้างในการจัดทำโครงการนี้..."
            value={section1.background}
            onChange={(e) => handleFieldChange('background', e.target.value)}
          />
        </div>

        {/* 1.2 วัตถุประสงค์ */}
        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Target size={16} color="var(--primary-600)" />
              1.2 วัตถุประสงค์ของโครงการ (Objectives) <span className="required">*</span>
            </label>
            <button
              type="button"
              onClick={handleAddObjective}
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
            >
              <Plus size={14} /> เพิ่มข้อวัตถุประสงค์
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {section1.objectives.map((obj, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--slate-500)', minWidth: '45px', fontSize: '0.85rem' }}>
                  (1.{idx + 1})
                </span>
                <input
                  type="text"
                  className="form-input"
                  value={obj}
                  onChange={(e) => handleObjectiveChange(idx, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteObjective(idx)}
                  className="btn btn-outline"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.45rem' }}
                  title="ลบข้อนี้"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 1.3 ประโยชน์ที่คาดว่าจะได้รับ */}
        <div className="form-group" style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Award size={16} color="var(--gold-600)" />
              1.3 ประโยชน์ที่คาดว่าจะได้รับ (Expected Benefits) <span className="required">*</span>
            </label>
            <button
              type="button"
              onClick={handleAddBenefit}
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
            >
              <Plus size={14} /> เพิ่มประโยชน์ที่คาดว่าจะได้รับ
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {section1.expectedBenefits.map((benefit, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--slate-500)', minWidth: '45px', fontSize: '0.85rem' }}>
                  (2.{idx + 1})
                </span>
                <input
                  type="text"
                  className="form-input"
                  value={benefit}
                  onChange={(e) => handleBenefitChange(idx, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => handleDeleteBenefit(idx)}
                  className="btn btn-outline"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.45rem' }}
                  title="ลบข้อนี้"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* กลุ่มเป้าหมาย & วงเงิน & กรอบเวลา */}
        <div className="grid-2" style={{ marginTop: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">กลุ่มเป้าหมายผู้ใช้งาน (Target Audience)</label>
            <input
              type="text"
              className="form-input"
              value={section1.targetAudience}
              onChange={(e) => handleFieldChange('targetAudience', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              วงเงินงบประมาณรวม (บาท) <span className="required">*</span>
            </label>
            <input
              type="number"
              className="form-input"
              value={section1.budgetAmount}
              onChange={(e) => handleFieldChange('budgetAmount', parseFloat(e.target.value) || 0)}
            />
            <div className="form-hint">
              {(section1.budgetAmount || 0).toLocaleString()} บาท (สำหรับคำนวณและตรวจสอบยอดงวดงาน)
            </div>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <Clock size={14} style={{ display: 'inline', marginRight: '4px' }} />
              ระยะเวลาโครงการ (วัน) <span className="required">*</span>
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="เช่น 180, 120, 90, 240 หรือ 360"
              value={section1.projectDurationDays ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                const days = val === '' ? 0 : parseInt(val, 10) || 0;
                const months = Math.max(1, Math.round(days / 30));
                onChange({
                  ...section1,
                  projectDurationDays: days,
                  projectDurationMonths: months,
                });
              }}
            />
            <div className="form-hint">
              {(section1.projectDurationDays || 0).toLocaleString()} วัน (~{section1.projectDurationMonths || 1} เดือน)
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              ระยะเวลาโครงการ (เดือนสำหรับจัด Gantt Chart) <span className="required">*</span>
            </label>
            <input
              type="number"
              className="form-input"
              min={1}
              max={36}
              value={section1.projectDurationMonths ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                const months = val === '' ? 1 : parseInt(val, 10) || 1;
                onChange({
                  ...section1,
                  projectDurationMonths: months,
                  projectDurationDays: months * 30,
                });
              }}
            />
            <div className="form-hint">
              ครอบคลุม {section1.projectDurationMonths || 1} เดือน ({(section1.projectDurationMonths || 1) * 4} สัปดาห์)
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">1.4 ขอบเขตงานโดยรวม (Scope of Work Overview)</label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '80px' }}
            value={section1.projectScopeOverview}
            onChange={(e) => handleFieldChange('projectScopeOverview', e.target.value)}
          />
        </div>
      </div>

      {/* 2. รายการขอบเขตงานเต็มทุกข้อตามประกาศจัดจ้าง (Hierarchical Tree up to Level 5) */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="card-title-group" style={{ margin: 0 }}>
            <h2 style={{ fontSize: '1.15rem' }}>
              <ListTree size={20} color="var(--primary-700)" />
              1.5 ขอบเขตงานตามประกาศจัดจ้าง
            </h2>
            <p>
              ระบุข้อกำหนดขอบเขตงานของหน่วยงานรัฐให้ครบถ้วนทุกข้อ มีข้อหลักและข้อย่อยได้ถึง 5 ระดับ (Level 1 - 5) พร้อมระบุช่วงเวลาทำงาน (สัปดาห์ในเดือน และจำนวนวัน)
            </p>
          </div>
          {onOpenTorImport && (
            <button
              type="button"
              onClick={onOpenTorImport}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
              title="เปิดหน้าต่างนำเข้าไฟล์ Word / PDF หรือใช้ Gemini AI สกัดขอบเขตงาน"
            >
              <FileUp size={16} color="var(--primary-700)" />
              <span>นำเข้า TOR (Word / PDF / AI สกัด)</span>
            </button>
          )}
        </div>

        <ScopeHierarchyManager
          items={section1.scopeItems}
          totalMonths={section1.projectDurationMonths}
          onChange={handleScopeItemsChange}
        />
      </div>
    </div>
  );
};
