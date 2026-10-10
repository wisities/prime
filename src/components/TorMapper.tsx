import React, { useState } from 'react';
import { TorScopeItem, TorImageLayout } from '../types/proposal';
import {
  CheckCircle,
  AlertTriangle,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Upload,
  Trash2,
  Columns,
  Maximize2,
  Layers,
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

  const handleImageUpload = (
    id: string,
    field: 'singleImage' | 'twoColumnImageLeft' | 'twoColumnImageRight',
    file: File
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const item = scopeItems.find((s) => s.id === id);
        const existing = (item as any)?.[field] || {};
        handleItemChange(id, field, {
          url: reader.result,
          caption: existing.caption || 'คำบรรยายภาพประกอบการดำเนินงาน',
        });
      }
    };
    reader.readAsDataURL(file);
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

                  {/* Image Layout Controls */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      border: '1px solid var(--slate-300)',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ImageIcon size={16} color="var(--primary-700)" />
                        แทรกรูปภาพประกอบการดำเนินงานตาม TOR ข้อนี้
                      </label>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleItemChange(item.id, 'imageLayout', 'none')}
                          className={`btn ${imageLayout === 'none' ? 'btn-primary' : 'btn-outline'}`}
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        >
                          ไม่แทรกรูป
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemChange(item.id, 'imageLayout', 'single_centered')}
                          className={`btn ${imageLayout === 'single_centered' ? 'btn-primary' : 'btn-outline'}`}
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        >
                          <Maximize2 size={12} /> แบบที่ 1: รูปเดี่ยว 6 นิ้ว
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemChange(item.id, 'imageLayout', 'two_columns')}
                          className={`btn ${imageLayout === 'two_columns' ? 'btn-primary' : 'btn-outline'}`}
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        >
                          <Columns size={12} /> แบบที่ 2: 2 คอลัมน์ 3 นิ้ว
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemChange(item.id, 'imageLayout', 'both')}
                          className={`btn ${imageLayout === 'both' ? 'btn-primary' : 'btn-outline'}`}
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                        >
                          <Layers size={12} /> แทรกทั้งสองแบบ (6 นิ้ว + 2 คอลัมน์)
                        </button>
                      </div>
                    </div>

                    {/* แบบที่ 1: ภาพเดี่ยว กว้าง 6 นิ้ว กึ่งกลาง */}
                    {(imageLayout === 'single_centered' || imageLayout === 'both') && (
                      <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '6px', border: '1px solid var(--slate-200)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.5rem' }}>
                          ภาพอธิบายการทำงานแบบเดี่ยว (กว้าง 6 นิ้ว จัดวางกึ่งกลางหน้ากระดาษ Word)
                        </div>

                        {item.singleImage?.url ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <img
                              src={item.singleImage.url}
                              alt="Single"
                              style={{ maxWidth: '480px', maxHeight: '240px', objectFit: 'contain', border: '1px solid var(--slate-200)', borderRadius: '4px' }}
                            />
                            <div style={{ width: '100%', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="คำบรรยายใต้ภาพ (เช่น ภาพที่ 3.X แผนผังสถาปัตยกรรม...)"
                                value={item.singleImage.caption}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'singleImage', {
                                    ...item.singleImage,
                                    caption: e.target.value,
                                  })
                                }
                              />
                              <button
                                type="button"
                                onClick={() => handleItemChange(item.id, 'singleImage', undefined)}
                                className="btn btn-outline"
                                style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label
                            style={{
                              display: 'block',
                              border: '2px dashed var(--slate-300)',
                              borderRadius: '6px',
                              padding: '1.5rem',
                              textAlign: 'center',
                              cursor: 'pointer',
                              backgroundColor: 'var(--slate-50)',
                            }}
                          >
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleImageUpload(item.id, 'singleImage', f);
                              }}
                            />
                            <Upload size={24} color="var(--primary-600)" style={{ margin: '0 auto 0.25rem' }} />
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-800)' }}>
                              คลิกเพื่ออัปโหลดภาพ (ความกว้างใน Word: 6 นิ้ว กึ่งกลาง)
                            </div>
                          </label>
                        )}
                      </div>
                    )}

                    {/* แบบที่ 2: ภาพประกอบในตาราง 2 คอลัมน์ ภาพละ 3 นิ้ว */}
                    {(imageLayout === 'two_columns' || imageLayout === 'both') && (
                      <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '6px', border: '1px solid var(--slate-200)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.5rem' }}>
                          แบบที่ 2: ภาพประกอบการทำงาน แทรกในตาราง 2 คอลัมน์ (ขนาดภาพละ กว้าง 3 นิ้ว วางคู่กัน)
                        </div>

                        <div className="grid-2">
                          {/* Left Column Image (3 inches) */}
                          <div style={{ border: '1px solid var(--slate-200)', borderRadius: '6px', padding: '0.75rem', backgroundColor: '#F8FAFC' }}>
                            <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
                              คอลัมน์ซ้าย (กว้าง 3 นิ้ว)
                            </div>
                            {item.twoColumnImageLeft?.url ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <img
                                  src={item.twoColumnImageLeft.url}
                                  alt="Col Left"
                                  style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '4px' }}
                                />
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  placeholder="คำบรรยายภาพซ้าย"
                                  value={item.twoColumnImageLeft.caption}
                                  onChange={(e) =>
                                    handleItemChange(item.id, 'twoColumnImageLeft', {
                                      ...item.twoColumnImageLeft,
                                      caption: e.target.value,
                                    })
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(item.id, 'twoColumnImageLeft', undefined)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.2rem', color: 'var(--danger)' }}
                                >
                                  <Trash2 size={12} /> ลบภาพซ้าย
                                </button>
                              </div>
                            ) : (
                              <label style={{ display: 'block', padding: '1rem', border: '1px dashed var(--slate-300)', textAlign: 'center', cursor: 'pointer' }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleImageUpload(item.id, 'twoColumnImageLeft', f);
                                  }}
                                />
                                <Upload size={18} color="var(--slate-500)" style={{ margin: '0 auto 2px' }} />
                                <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)' }}>อัปโหลดภาพซ้าย (3 นิ้ว)</div>
                              </label>
                            )}
                          </div>

                          {/* Right Column Image (3 inches) */}
                          <div style={{ border: '1px solid var(--slate-200)', borderRadius: '6px', padding: '0.75rem', backgroundColor: '#F8FAFC' }}>
                            <div style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.35rem' }}>
                              คอลัมน์ขวา (กว้าง 3 นิ้ว)
                            </div>
                            {item.twoColumnImageRight?.url ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <img
                                  src={item.twoColumnImageRight.url}
                                  alt="Col Right"
                                  style={{ width: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '4px' }}
                                />
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  placeholder="คำบรรยายภาพขวา"
                                  value={item.twoColumnImageRight.caption}
                                  onChange={(e) =>
                                    handleItemChange(item.id, 'twoColumnImageRight', {
                                      ...item.twoColumnImageRight,
                                      caption: e.target.value,
                                    })
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => handleItemChange(item.id, 'twoColumnImageRight', undefined)}
                                  className="btn btn-outline"
                                  style={{ padding: '0.2rem', color: 'var(--danger)' }}
                                >
                                  <Trash2 size={12} /> ลบภาพขวา
                                </button>
                              </div>
                            ) : (
                              <label style={{ display: 'block', padding: '1rem', border: '1px dashed var(--slate-300)', textAlign: 'center', cursor: 'pointer' }}>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleImageUpload(item.id, 'twoColumnImageRight', f);
                                  }}
                                />
                                <Upload size={18} color="var(--slate-500)" style={{ margin: '0 auto 2px' }} />
                                <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)' }}>อัปโหลดภาพขวา (3 นิ้ว)</div>
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
