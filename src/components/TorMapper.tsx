import React, { useState } from 'react';
import { TorScopeItem } from '../types/proposal';
import { ReportImageManager } from './ReportImageManager';
import { normalizeTorItemImageBlocks } from '../utils/imageBlockUtils';
import {
  CheckCircle,
  AlertTriangle,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Table,
  List,
} from 'lucide-react';

interface TorMapperProps {
  scopeItems: TorScopeItem[];
  onChange: (items: TorScopeItem[]) => void;
}

export const TorMapper: React.FC<TorMapperProps> = ({ scopeItems, onChange }) => {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    scopeItems.forEach((item) => (initial[item.id] = true));
    return initial;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleItemChange = (id: string, field: keyof TorScopeItem, value: any) => {
    onChange(
      scopeItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const levelBadges = [
    { label: 'ข้อหลัก (L1)', bg: '#0F2744', color: '#FFFFFF' },
    { label: 'ข้อย่อย (L2)', bg: '#1E40AF', color: '#FFFFFF' },
    { label: 'ข้อย่อย (L3)', bg: '#0D9488', color: '#FFFFFF' },
    { label: 'ข้อย่อย (L4)', bg: '#7C3AED', color: '#FFFFFF' },
    { label: 'ข้อย่อย (L5)', bg: '#D97706', color: '#FFFFFF' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--slate-50)',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          border: '1px solid var(--slate-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <BookOpen size={20} color="var(--primary-700)" />
          <div>
            <span style={{ fontWeight: 600, color: 'var(--primary-900)', fontSize: '0.95rem' }}>
              รายการข้อกำหนดขอบเขตงาน TOR ทั้งหมดที่ต้องเสนอวิธีดำเนินงาน ({scopeItems.length} ข้อ)
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
              ดึงรายการข้อกำหนดจากส่วนที่ 1 และกำหนดการจากส่วนที่ 2 มาแสดงครบทุกข้อ (รองรับการแทรกภาพอธิบาย 6 นิ้ว หรือ 2 คอลัมน์ 3 นิ้ว)
            </div>
          </div>
        </div>

        <span
          style={{
            backgroundColor: 'var(--primary-100)',
            color: 'var(--primary-800)',
            padding: '0.25rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          เชื่อมโยงกับ ส่วนที่ 1 & 2
        </span>
      </div>

      {/* TOR Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {scopeItems.map((item) => {
          const isExpanded = expandedIds[item.id] !== false;
          const isComplete =
            (item.requirement || '').trim().length > 5 &&
            (item.proposedMethodology || '').trim().length > 15 &&
            (item.deliverable || '').trim().length > 0;

          const badge = levelBadges[(item.level - 1) % levelBadges.length];
          const indentPixels = (item.level - 1) * 20;
          const imageLayout: TorImageLayout = item.imageLayout || 'none';

          return (
            <div
              key={item.id}
              className="tor-card"
              style={{
                marginLeft: `${indentPixels}px`,
                borderLeft: `4px solid ${badge.bg}`,
              }}
            >
              {/* Header */}
              <div
                className="tor-card-header"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleExpand(item.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1 }}>
                  <span
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '0.75rem',
                    }}
                  >
                    L{item.level}
                  </span>

                  <span className="tor-clause-badge">{item.clauseNumber}</span>

                  <span style={{ fontWeight: item.level === 1 ? 700 : 600, color: 'var(--slate-900)', fontSize: '0.925rem' }}>
                    {item.title}
                  </span>

                  {imageLayout !== 'none' && (
                    <span
                      style={{
                        backgroundColor: '#FEF3C7',
                        color: '#B45309',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <ImageIcon size={11} />
                      {imageLayout === 'single_centered'
                        ? 'ภาพ 6 นิ้ว'
                        : imageLayout === 'two_columns'
                        ? 'ภาพ 2 คอลัมน์'
                        : 'ภาพ 6 นิ้ว + 2 คอลัมน์'}
                    </span>
                  )}

                  {isComplete ? (
                    <span className="pill pill-success" style={{ marginLeft: 'auto' }}>
                      <CheckCircle size={12} /> ข้อมูลครบถ้วน
                    </span>
                  ) : (
                    <span className="pill pill-warning" style={{ marginLeft: 'auto' }}>
                      <AlertTriangle size={12} /> ยังไม่สมบูรณ์
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-500)', marginLeft: '0.5rem' }}
                >
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {/* Body */}
              {isExpanded && (
                <div className="tor-body">
                  {/* Government TOR Requirement */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--slate-200)',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.35rem' }}>
                      ข้อกำหนด TOR จากประกาศจัดจ้างของหน่วยงาน:
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--slate-700)', lineHeight: 1.6 }}>
                      {item.requirement || '(ยังไม่ได้ระบุข้อความตามประกาศจัดจ้าง - สามารถแก้ไขได้ที่ส่วนที่ 1 หรือกรอกด้านล่าง)'}
                    </div>
                  </div>

                  {/* Proposed Methodology by Company */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                      <label className="form-label" style={{ color: 'var(--gold-600)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: 0 }}>
                        <Sparkles size={14} color="var(--gold-500)" />
                        วิธีการดำเนินงานที่บริษัทฯ เสนอ (พรรณาวิธีการ, บูลเล็ตพ้อยต์ หรือแทรกตารางขั้นตอน) <span className="required">*</span>
                      </label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const bulletSnippet = '\n• [ระบุกิจกรรม/ขั้นตอนการดำเนินงาน]';
                            handleItemChange(item.id, 'proposedMethodology', (item.proposedMethodology || '') + bulletSnippet);
                          }}
                          title="แทรกบูลเล็ตพ้อยต์"
                        >
                          <List size={12} /> + บูลเล็ตพ้อยต์
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.725rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            const tableSnippet = '\n\n| ลำดับ | ขั้นตอนการดำเนินงาน | รายละเอียด / วิธีการ |\n| 1 | การเตรียมการและวางแผน | ประชุม Kick-off และจัดทำแผนปฏิบัติงานอย่างละเอียด |\n| 2 | การดำเนินงานเชิงเทคนิค | ปฏิบัติการตามมาตรฐานสากลและแนวทางที่เสนอ |\n| 3 | การตรวจสอบและส่งมอบ | ตรวจประเมินคุณภาพและจัดทำเอกสารส่งมอบครบถ้วน |';
                            handleItemChange(item.id, 'proposedMethodology', (item.proposedMethodology || '') + tableSnippet);
                          }}
                          title="แทรกตารางแสดงขั้นตอนการทำงาน"
                        >
                          <Table size={12} /> + ตารางขั้นตอนการทำงาน
                        </button>
                      </div>
                    </div>
                    <textarea
                      className="form-textarea"
                      style={{ borderColor: 'var(--gold-400)', minHeight: '110px' }}
                      placeholder="เขียนพรรณาวิธีการดำเนินงาน หรือใช้ปุ่มด้านบนเพื่อแทรกบูลเล็ตพ้อยต์ / ตารางขั้นตอนการทำงาน..."
                      value={item.proposedMethodology}
                      onChange={(e) => handleItemChange(item.id, 'proposedMethodology', e.target.value)}
                    />
                    <div className="form-hint">
                      สามารถเขียนบรรยายเชิงพรรณา, สร้างหัวข้อบูลเล็ตด้วยเครื่องหมาย • หรือ - และสามารถแทรกตารางขั้นตอนการทำงานได้ตามต้องการ
                    </div>
                  </div>

                  {/* ภาพประกอบในหัวข้อนี้ (ไม่จำกัดจำนวน: ภาพเดี่ยว 6 นิ้ว & ภาพคู่ 3 นิ้ว) */}
                  <ReportImageManager
                    title={`ภาพประกอบสำหรับข้อ ${item.clauseNumber}: ${item.title}`}
                    subtitle="สามารถอัปโหลดภาพเดี่ยว 6 นิ้ว กึ่งกลาง หรือภาพคู่ 3 นิ้ว 2 คอลัมน์ ได้ไม่จำกัดจำนวนสำหรับข้อนี้"
                    imageBlocks={normalizeTorItemImageBlocks(item)}
                    defaultCaptionPrefix={`ภาพที่ 3.2-${item.clauseNumber}`}
                    onChange={(newBlocks) => {
                      handleItemChange(item.id, 'imageBlocks', newBlocks);
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
