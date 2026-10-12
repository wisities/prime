import React, { useState, useEffect } from 'react';
import { DocumentStructureConfig, SectionItemConfig, HeadingItemConfig } from '../types/proposal';
import { getDefaultDocumentStructure, normalizeDocumentStructure } from '../data/defaultData';
import {
  ListOrdered,
  X,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  EyeOff,
  RotateCcw,
  Sparkles,
  Eye,
  Layers,
  BookOpen,
  Calendar,
  FileCheck,
  Building,
  Check,
} from 'lucide-react';

interface DocumentStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentStructure?: DocumentStructureConfig;
  onChange: (updated: DocumentStructureConfig) => void;
  onOpenPreview?: () => void;
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  section1: <BookOpen size={16} />,
  section2: <Calendar size={16} />,
  section3: <Layers size={16} />,
  section4: <FileCheck size={16} />,
  section5: <Building size={16} />,
};

export const DocumentStructureModal: React.FC<DocumentStructureModalProps> = ({
  isOpen,
  onClose,
  documentStructure,
  onChange,
  onOpenPreview,
}) => {
  const [config, setConfig] = useState<DocumentStructureConfig>(() =>
    normalizeDocumentStructure(documentStructure)
  );
  const [activeSectionId, setActiveSectionId] = useState<string>('section1');

  useEffect(() => {
    if (isOpen) {
      setConfig(normalizeDocumentStructure(documentStructure));
    }
  }, [isOpen, documentStructure]);

  if (!isOpen) return null;

  const handleUpdate = (newConfig: DocumentStructureConfig) => {
    setConfig(newConfig);
    onChange(newConfig);
  };

  const handleToggleAutoRenumber = () => {
    const updated: DocumentStructureConfig = {
      ...config,
      autoRenumber: !config.autoRenumber,
    };
    handleUpdate(updated);
  };

  const handleResetDefault = () => {
    if (window.confirm('คุณต้องการคืนค่าโครงสร้างหัวข้อเอกสารทั้งหมดกลับเป็นค่ามาตรฐานเริ่มต้นใช่หรือไม่?')) {
      const def = getDefaultDocumentStructure();
      handleUpdate(def);
    }
  };

  const handleEnableAll = () => {
    const updated: DocumentStructureConfig = {
      ...config,
      sections: config.sections.map((sec) => ({
        ...sec,
        enabled: true,
        headings: sec.headings.map((h) => ({ ...h, enabled: true })),
      })),
    };
    handleUpdate(updated);
  };

  const handleToggleSection = (sectionId: string) => {
    const updated: DocumentStructureConfig = {
      ...config,
      sections: config.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, enabled: !sec.enabled } : sec
      ),
    };
    handleUpdate(updated);
  };

  const handleMoveSection = (fromIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (targetIndex < 0 || targetIndex >= config.sections.length) return;

    const newSections = [...config.sections];
    const [moved] = newSections.splice(fromIndex, 1);
    newSections.splice(targetIndex, 0, moved);

    const reordered = newSections.map((s, idx) => ({ ...s, order: idx + 1 }));
    handleUpdate({ ...config, sections: reordered });
  };

  const handleToggleHeading = (sectionId: string, headingId: string) => {
    const updated: DocumentStructureConfig = {
      ...config,
      sections: config.sections.map((sec) => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          headings: sec.headings.map((h) =>
            h.id === headingId ? { ...h, enabled: !h.enabled } : h
          ),
        };
      }),
    };
    handleUpdate(updated);
  };

  const handleMoveHeading = (sectionId: string, fromIndex: number, direction: 'up' | 'down') => {
    const section = config.sections.find((s) => s.id === sectionId);
    if (!section) return;

    const targetIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (targetIndex < 0 || targetIndex >= section.headings.length) return;

    const newHeadings = [...section.headings];
    const [moved] = newHeadings.splice(fromIndex, 1);
    newHeadings.splice(targetIndex, 0, moved);

    const reorderedHeadings = newHeadings.map((h, idx) => ({ ...h, order: idx + 1 }));

    const updated: DocumentStructureConfig = {
      ...config,
      sections: config.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, headings: reorderedHeadings } : sec
      ),
    };
    handleUpdate(updated);
  };

  const currentSection = config.sections.find((s) => s.id === activeSectionId) || config.sections[0];
  const currentSectionIdx = config.sections.findIndex((s) => s.id === activeSectionId);

  // Compute stats
  const totalHeadings = config.sections.reduce((acc, s) => acc + s.headings.length, 0);
  const activeHeadingsCount = config.sections.reduce(
    (acc, s) => (s.enabled ? acc + s.headings.filter((h) => h.enabled).length : acc),
    0
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '920px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--slate-200)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'rgba(15, 39, 68, 0.08)',
                color: '#0F2744',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ListOrdered size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F2744', margin: 0 }}>
                จัดโครงสร้างและลำดับหัวข้อเอกสาร (Document Structure)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                เลือกเปิด/ปิด (ยกเลิก) หัวข้อที่ไม่ใช้งาน และเลื่อนลำดับหัวข้อขึ้น-ลง สำหรับเล่มข้อเสนอและไฟล์ Word
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleResetDefault}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              title="คืนค่าเป็นโครงสร้างมาตรฐานเริ่มต้น"
            >
              <RotateCcw size={14} />
              <span>รีเซ็ตมาตรฐาน</span>
            </button>
            <button
              type="button"
              onClick={handleEnableAll}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              title="เปิดใช้งานทุกหัวข้อ"
            >
              <Sparkles size={14} />
              <span>เปิดทั้งหมด</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Global Toolbar Bar */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            padding: '0.65rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                userSelect: 'none',
                fontWeight: 600,
                color: '#334155',
              }}
            >
              <input
                type="checkbox"
                checked={config.autoRenumber}
                onChange={handleToggleAutoRenumber}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>รันเลขหัวข้อย่อยอัตโนมัติตามลำดับจริง (1.1, 1.2, 1.3...)</span>
            </label>
            <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>
              (หากเปิด: เมื่อยกเลิกหรือสลับลำดับ เลขจะเรียงใหม่อัตโนมัติไม่มีช่องว่าง)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                backgroundColor: activeHeadingsCount === totalHeadings ? '#DCFCE7' : '#FEF3C7',
                color: activeHeadingsCount === totalHeadings ? '#166534' : '#92400E',
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
              }}
            >
              เปิดใช้งาน {activeHeadingsCount} / {totalHeadings} หัวข้อ
            </span>
          </div>
        </div>

        {/* Modal Body: Left Section Tabs + Right Headings List */}
        <div style={{ display: 'flex', flex: 1, minHeight: '380px', overflow: 'hidden' }}>
          {/* Left: Section Navigator */}
          <div
            style={{
              width: '260px',
              backgroundColor: '#F8FAFC',
              borderRight: '1px solid #E2E8F0',
              padding: '0.85rem 0.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              overflowY: 'auto',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', padding: '0 0.5rem 0.4rem 0.5rem', textTransform: 'uppercase' }}>
              ส่วนของเอกสาร (Sections)
            </div>

            {config.sections.map((sec, idx) => {
              const isActive = sec.id === activeSectionId;
              const activeCount = sec.headings.filter((h) => h.enabled).length;
              const totalCount = sec.headings.length;

              return (
                <div
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isActive ? '#0F2744' : 'transparent',
                    color: isActive ? '#FFFFFF' : sec.enabled ? '#1E293B' : '#94A3B8',
                    border: isActive ? '1px solid #0F2744' : '1px solid transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
                      <span style={{ color: isActive ? '#F1B844' : '#0F2744' }}>
                        {SECTION_ICONS[sec.id] || <Layers size={14} />}
                      </span>
                      <span>{sec.sectionNumber}</span>
                    </div>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: isActive
                          ? 'rgba(255, 255, 255, 0.2)'
                          : sec.enabled
                          ? '#E2E8F0'
                          : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#475569',
                        fontWeight: 600,
                      }}
                    >
                      {sec.enabled ? `${activeCount}/${totalCount}` : 'ปิดส่วนนี้'}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.75rem',
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      opacity: isActive ? 0.9 : 0.8,
                    }}
                    title={sec.title}
                  >
                    {sec.title}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Headings Manager for Current Section */}
          <div
            style={{
              flex: 1,
              padding: '1.25rem 1.5rem',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {/* Current Section Banner */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                backgroundColor: currentSection.enabled ? '#F8FAFC' : '#FFF1F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: currentSection.enabled ? '#0F2744' : '#BE123C',
                    }}
                  >
                    {currentSection.sectionNumber}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '8px',
                      backgroundColor: currentSection.enabled ? '#DCFCE7' : '#FEE2E2',
                      color: currentSection.enabled ? '#15803D' : '#991B1B',
                      fontWeight: 600,
                    }}
                  >
                    {currentSection.enabled ? 'เปิดใช้งานทั้งส่วน' : 'ยกเลิก / ปิดทั้งส่วน'}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1E293B', margin: 0 }}>
                  {currentSection.title}
                </h4>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Move Section Buttons */}
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleMoveSection(currentSectionIdx, 'up')}
                    disabled={currentSectionIdx === 0}
                    className="btn btn-secondary"
                    style={{ padding: '4px 6px', minWidth: 'auto', fontSize: '0.75rem' }}
                    title="เลื่อนส่วนนี้ขึ้น"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveSection(currentSectionIdx, 'down')}
                    disabled={currentSectionIdx === config.sections.length - 1}
                    className="btn btn-secondary"
                    style={{ padding: '4px 6px', minWidth: 'auto', fontSize: '0.75rem' }}
                    title="เลื่อนส่วนนี้ลง"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Toggle Section Active */}
                <button
                  type="button"
                  onClick={() => handleToggleSection(currentSection.id)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: currentSection.enabled ? '#EFF6FF' : '#FEE2E2',
                    color: currentSection.enabled ? '#1D4ED8' : '#B91C1C',
                    borderColor: currentSection.enabled ? '#BFDBFE' : '#FECACA',
                  }}
                >
                  {currentSection.enabled ? <Check size={14} /> : <EyeOff size={14} />}
                  <span>{currentSection.enabled ? 'เปิดแสดง' : 'ปิดส่วนนี้'}</span>
                </button>
              </div>
            </div>

            {/* Sub-headings List */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                  รายการหัวข้อย่อย ({currentSection.headings.length} หัวข้อ)
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  ใช้ปุ่มลูกศรขึ้น/ลง เพื่อปรับลำดับการจัดเรียงในเอกสาร
                </span>
              </div>

              {!currentSection.enabled && (
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#FFF1F2',
                    border: '1px dashed #FECDD3',
                    borderRadius: '6px',
                    color: '#9F1239',
                    fontSize: '0.8rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  คำเตือน: คุณปิดใช้งานส่วนนี้ไว้ ทั้งหัวข้อและเนื้อหาในส่วนนี้จะไม่ถูกนำไปสร้างในไฟล์ Word หรือเอกสารข้อเสนอ
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {currentSection.headings.map((heading, hIdx) => {
                  const isEnabled = heading.enabled && currentSection.enabled;
                  const activeIndexInVisible = currentSection.headings
                    .filter((h) => h.enabled)
                    .findIndex((h) => h.id === heading.id);

                  // Calculate display number badge
                  let displayNumber = heading.originalCode;
                  if (config.autoRenumber && isEnabled && activeIndexInVisible >= 0) {
                    if (heading.originalCode.includes('ภาคผนวก')) {
                      displayNumber = heading.originalCode;
                    } else {
                      const secNum = currentSection.sectionNumber.replace(/\D/g, '') || String(currentSectionIdx + 1);
                      displayNumber = `${secNum}.${activeIndexInVisible + 1}`;
                    }
                  }

                  return (
                    <div
                      key={heading.id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: isEnabled ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
                        backgroundColor: isEnabled ? '#FFFFFF' : '#F8FAFC',
                        boxShadow: isEnabled ? '0 1px 3px rgba(0, 0, 0, 0.05)' : 'none',
                        opacity: isEnabled ? 1 : 0.65,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Left: Reorder Arrows */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          type="button"
                          onClick={() => handleMoveHeading(currentSection.id, hIdx, 'up')}
                          disabled={hIdx === 0}
                          style={{
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            cursor: hIdx === 0 ? 'not-allowed' : 'pointer',
                            color: hIdx === 0 ? '#CBD5E1' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="เลื่อนหัวข้อนี้ขึ้น"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveHeading(currentSection.id, hIdx, 'down')}
                          disabled={hIdx === currentSection.headings.length - 1}
                          style={{
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            cursor: hIdx === currentSection.headings.length - 1 ? 'not-allowed' : 'pointer',
                            color: hIdx === currentSection.headings.length - 1 ? '#CBD5E1' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="เลื่อนหัวข้อนี้ลง"
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>

                      {/* Number Badge */}
                      <div
                        style={{
                          minWidth: '54px',
                          textAlign: 'center',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          backgroundColor: isEnabled ? '#0F2744' : '#E2E8F0',
                          color: isEnabled ? '#FFFFFF' : '#64748B',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        {isEnabled ? displayNumber : 'ซ่อน'}
                      </div>

                      {/* Middle: Title & Description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              color: isEnabled ? '#0F2744' : '#64748B',
                            }}
                          >
                            {heading.title}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: '#94A3B8',
                              backgroundColor: '#F1F5F9',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            TOR: {heading.originalCode}
                          </span>
                        </div>
                        {heading.description && (
                          <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0, lineHeight: 1.35 }}>
                            {heading.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Toggle Switch */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleHeading(currentSection.id, heading.id)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '20px',
                            border: '1px solid',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            backgroundColor: heading.enabled ? '#DCFCE7' : '#F1F5F9',
                            color: heading.enabled ? '#15803D' : '#64748B',
                            borderColor: heading.enabled ? '#86EFAC' : '#CBD5E1',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {heading.enabled ? <CheckCircle2 size={14} /> : <EyeOff size={14} />}
                          <span>{heading.enabled ? 'เปิดใช้งาน' : 'ยกเลิก / ซ่อน'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--slate-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            การปรับเปลี่ยนจะถูกบันทึกและมีผลทันทีต่อการแสดงผลและการดาวน์โหลด Word (.docx)
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {onOpenPreview && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPreview();
                }}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Eye size={15} />
                <span>ดูตัวอย่างเอกสารทันที</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary"
              style={{ minWidth: '110px' }}
            >
              บันทึกและปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
