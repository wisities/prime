import React from 'react';
import { ProposalData, ReportImageBlock } from '../types/proposal';
import { FileDown, Eye, X, SlidersHorizontal } from 'lucide-react';
import { normalizeDocumentStructure } from '../data/defaultData';
import { normalizeTorItemImageBlocks } from '../utils/imageBlockUtils';

interface LiveDocxPreviewModalProps {
  data: ProposalData;
  isOpen: boolean;
  onClose: () => void;
  isExporting: boolean;
  onExport: () => void;
  onOpenStructureModal?: () => void;
}

const formatTorClauseNumber = (clause: string): string => {
  const trimmed = (clause || '').trim();
  if (!trimmed) return 'ข้อ ';
  if (trimmed.startsWith('ข้อ')) return trimmed;
  return `ข้อ ${trimmed}`;
};

const renderImageBlocksPreview = (blocks?: ReportImageBlock[], defaultPrefix: string = 'ภาพที่') => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'single' && block.url) {
          return (
            <div
              key={block.id || bIdx}
              style={{
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                padding: '0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--slate-200)',
              }}
            >
              <img
                src={block.url}
                alt="ภาพเดี่ยว 6 นิ้ว"
                style={{
                  maxWidth: '100%',
                  maxHeight: '260px',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  margin: '0 auto',
                  display: 'block',
                }}
              />
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--slate-600)',
                  fontStyle: 'italic',
                  marginTop: '0.35rem',
                }}
              >
                {block.caption || `${defaultPrefix}-${bIdx + 1} ภาพประกอบ (กว้าง 6 นิ้ว กึ่งกลาง)`}
              </div>
            </div>
          );
        }

        if (block.type === 'pair' && (block.leftUrl || block.rightUrl)) {
          return (
            <div
              key={block.id || bIdx}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                backgroundColor: '#F8FAFC',
                padding: '0.65rem',
                borderRadius: '6px',
                border: '1px solid var(--slate-200)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                {block.leftUrl ? (
                  <>
                    <img
                      src={block.leftUrl}
                      alt="ภาพซ้าย 3 นิ้ว"
                      style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '4px' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                      {block.leftCaption || 'ภาพประกอบ (กว้าง 3 นิ้ว)'}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem', padding: '1rem' }}>- คอลัมน์ซ้ายว่าง -</div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                {block.rightUrl ? (
                  <>
                    <img
                      src={block.rightUrl}
                      alt="ภาพขวา 3 นิ้ว"
                      style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '4px' }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                      {block.rightCaption || 'ภาพประกอบ (กว้าง 3 นิ้ว)'}
                    </div>
                  </>
                ) : (
                  <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem', padding: '1rem' }}>- คอลัมน์ขวาว่าง -</div>
                )}
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export const LiveDocxPreviewModal: React.FC<LiveDocxPreviewModalProps> = ({
  data,
  isOpen,
  onClose,
  isExporting,
  onExport,
  onOpenStructureModal,
}) => {
  if (!isOpen) return null;

  const { cover, section1, section2, section3, section4, section5 } = data;
  const docStructure = normalizeDocumentStructure(data.documentStructure);
  const autoRenumber = docStructure.autoRenumber ?? true;

  const activeSections = docStructure.sections
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '960px', maxHeight: '94vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Eye size={20} color="var(--primary-700)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--primary-900)' }}>
                ดูตัวอย่างเอกสารข้อเสนอ (Live Proposal Preview)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                แสดงโครงสร้างเนื้อหาตามลำดับและหัวข้อที่เปิดใช้งานที่จะถูก Export เป็นไฟล์ Microsoft Word (.docx)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {onOpenStructureModal && (
              <button
                type="button"
                onClick={onOpenStructureModal}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  borderColor: '#FDE68A',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  padding: '6px 12px',
                }}
                title="ปรับแต่งเปิด/ปิด หรือสลับจัดลำดับหัวข้อในเอกสาร Word"
              >
                <SlidersHorizontal size={15} />
                <span>จัดระเบียบหัวข้อ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onExport}
              disabled={isExporting}
              className="btn btn-primary"
            >
              <FileDown size={16} />
              {isExporting ? 'กำลังสร้างไฟล์ Word...' : 'ดาวน์โหลด Word (.docx)'}
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--slate-400)' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ backgroundColor: 'var(--slate-100)', padding: '2rem 1rem' }}>
          {/* Simulated A4 Document Container */}
          <div className="doc-preview-paper">
            {/* Background Notice if set */}
            {(cover.portraitBgImage || cover.landscapeBgImage) && (
              <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#166534' }}>
                <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🎨 กำหนดภาพพื้นหลัง A4:
                  {cover.portraitBgImage && <span>แนวตั้ง (มี Header/Footer) ✓</span>}
                  {cover.portraitBgImage && cover.landscapeBgImage && <span>|</span>}
                  {cover.landscapeBgImage && <span>แนวนอน (มี Header/Footer) ✓</span>}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#15803D' }}>
                  (ระบบจะวางเป็นลายน้ำพื้นหลังเต็มหน้ากระดาษ Word .docx)
                </span>
              </div>
            )}

            {/* Front Cover A4 (แทรกก่อนหน้าหัวข้อโครงการ) */}
            {cover.coverImage && (
              <div style={{ marginBottom: '2.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.85rem',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    color: '#1D4ED8',
                    fontWeight: 600,
                  }}
                >
                  <span>📄 หน้าปกเอกสารขนาด A4 เต็มหน้า (แสดงก่อนหน้าหัวข้อโครงการ)</span>
                  <span style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 'normal' }}>
                    (A4 Portrait: 210 × 297 มม.)
                  </span>
                </div>
                <div
                  style={{
                    textAlign: 'center',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    border: '1px solid var(--slate-300)',
                    padding: '0.5rem',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={cover.coverImage}
                    alt="A4 Front Cover"
                    style={{
                      width: '100%',
                      maxHeight: '640px',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                </div>

                {/* Page Break line */}
                <div
                  style={{
                    margin: '2rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--slate-400)',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ flex: 1, borderTop: '1px dashed var(--slate-300)' }} />
                  <span>ขึ้นหน้าถัดไป: หน้าหัวข้อโครงการและข้อมูลผู้ว่าจ้าง</span>
                  <div style={{ flex: 1, borderTop: '1px dashed var(--slate-300)' }} />
                </div>
              </div>
            )}

            {/* Document Header Code */}
            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--slate-400)', marginBottom: '1.5rem' }}>
              รหัสเอกสาร: {cover.projectCode}
            </div>

            {/* Front Cover Title Box (หน้าหัวข้อโครงการ) */}
            <div className="doc-cover-border" style={{ marginBottom: '3rem' }}>
              <h1 style={{ fontSize: '1.65rem', color: 'var(--primary-900)', fontWeight: 700, marginBottom: '0.75rem' }}>
                เอกสารข้อเสนอด้านเทคนิค
              </h1>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--gold-600)', fontWeight: 600, marginBottom: '2rem' }}>
                {cover.projectTitle}
              </h2>

              <div
                style={{
                  borderTop: '1px solid var(--slate-300)',
                  borderBottom: '1px solid var(--slate-300)',
                  padding: '1.25rem 0',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  fontSize: '0.95rem',
                }}
              >
                <div>
                  <strong>หน่วยงานผู้ว่าจ้าง:</strong> {cover.clientAgency} ({cover.clientDepartment})
                </div>
                <div>
                  <strong>เสนอโดย:</strong> {cover.submitterCompany}
                </div>
                <div>
                  <strong>วงเงินงบประมาณ:</strong> {cover.budgetFormatted || `${section1.budgetAmount.toLocaleString()} บาท`}
                </div>
                <div>
                  <strong>วันที่ยื่นข้อเสนอ:</strong> {cover.submissionDate}
                </div>
              </div>
            </div>

            {/* Simulated Table of Contents */}
            {cover.includeTOC && (
              <div style={{ marginBottom: '3rem', borderBottom: '1px dashed var(--slate-300)', paddingBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-800)', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.35rem', marginBottom: '1rem' }}>
                  สารบัญ (Table of Contents)
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                  {activeSections.map((sec, idx) => {
                    const secLabel = autoRenumber ? `ส่วนที่ ${idx + 1}` : sec.sectionNumber;
                    const label = sec.id === 'appendix' ? sec.title : `${secLabel}: ${sec.title}`;
                    return (
                      <div key={sec.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{label}</span>
                        <span>{idx * 2 + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Sections Iteration */}
            {activeSections.map((sec, secIdx) => {
              const secNum = autoRenumber ? (secIdx + 1) : (sec.sectionNumber.replace(/^ส่วนที่\s*/, '') || (secIdx + 1));
              const activeHeadings = sec.headings
                .filter((h) => h.enabled)
                .sort((a, b) => a.order - b.order);

              // =======================================================
              // SECTION 1
              // =======================================================
              if (sec.id === 'section1') {
                return (
                  <div key={sec.id} style={{ marginBottom: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem' }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                        ส่วนที่ {secNum}<br />
                        {sec.title}
                      </h2>
                    </div>

                    {activeHeadings.map((h, hIdx) => {
                      const numPrefix = autoRenumber ? `${secNum}.${hIdx + 1}` : h.originalCode;
                      if (h.id === 's1_background') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.75rem', marginBottom: '0.35rem' }}>
                              {numPrefix} ความเป็นมาและความสำคัญ
                            </h3>
                            <p style={{ textAlign: 'justify', textIndent: '2rem', marginBottom: '1rem' }}>
                              {section1.background}
                            </p>
                          </div>
                        );
                      }
                      if (h.id === 's1_objectives') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                              {numPrefix} วัตถุประสงค์ของโครงการ
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                              {section1.objectives.map((obj, i) => {
                                const clean = obj.replace(/^\(\d+\.\d+\)\s*/, '').replace(/^1\.\d+\.\d+\s*/, '');
                                return (
                                  <p key={i} style={{ margin: 0, textIndent: '1.5rem', textAlign: 'justify' }}>
                                    {numPrefix}.{i + 1} {clean}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      if (h.id === 's1_expected_benefits') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                              {numPrefix} ประโยชน์ที่คาดว่าจะได้รับ
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
                              {section1.expectedBenefits.map((b, i) => {
                                const clean = b.replace(/^\(\d+\.\d+\)\s*/, '').replace(/^2\.\d+\.\d+\s*/, '').replace(/^1\.\d+\.\d+\s*/, '');
                                return (
                                  <p key={i} style={{ margin: 0, textIndent: '1.5rem', textAlign: 'justify' }}>
                                    {numPrefix}.{i + 1} {clean}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      if (h.id === 's1_target_audience') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                              {numPrefix} กลุ่มเป้าหมายและกรอบระยะเวลาดำเนินงาน
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem', textIndent: '1.5rem', fontSize: '0.95rem' }}>
                              <p style={{ margin: 0 }}>กลุ่มเป้าหมายผู้ใช้งาน: {section1.targetAudience}</p>
                              <p style={{ margin: 0 }}>ระยะเวลาดำเนินการรวม: {section1.projectDurationDays} วัน ({section1.projectDurationMonths} เดือน / {section1.projectDurationMonths * 4} สัปดาห์)</p>
                              <p style={{ margin: 0 }}>วงเงินงบประมาณโครงการ: {section1.budgetAmount.toLocaleString()} บาท</p>
                            </div>
                          </div>
                        );
                      }
                      if (h.id === 's1_scope') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>
                              {numPrefix} ขอบเขตงานตามประกาศจัดจ้าง ({section1.scopeItems.length} ข้อ)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                              {section1.scopeItems.map((item) => (
                                <div
                                  key={item.id}
                                  style={{
                                    paddingLeft: `${(item.level - 1) * 20}px`,
                                    fontSize: '0.875rem',
                                    borderLeft: `2px solid ${item.level === 1 ? 'var(--primary-800)' : 'var(--slate-300)'}`,
                                    paddingTop: '3px',
                                    paddingBottom: '3px',
                                    lineHeight: 1.5,
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: item.level === 1 ? 'var(--primary-900)' : 'var(--primary-700)', marginRight: '6px' }}>
                                    {formatTorClauseNumber(item.clauseNumber)}
                                  </span>
                                  <span style={{ fontWeight: item.level === 1 ? 600 : 400, color: 'var(--slate-900)' }}>
                                    {item.requirement || item.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}

                    {renderImageBlocksPreview(section1.imageBlocks, 'ภาพที่ 1')}
                  </div>
                );
              }

              // =======================================================
              // SECTION 2
              // =======================================================
              if (sec.id === 'section2') {
                return (
                  <div key={sec.id} style={{ marginBottom: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', right: 0, top: 0, backgroundColor: '#D97706', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        หน้าเอกสาร Word แนวนอน (Landscape)
                      </span>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                        ส่วนที่ {secNum}<br />
                        {sec.title}
                      </h2>
                    </div>

                    {activeHeadings.map((h, hIdx) => {
                      const numPrefix = autoRenumber ? `${secNum}.${hIdx + 1}` : h.originalCode;
                      if (h.id === 's2_gantt') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                              {numPrefix} {h.title}
                            </h3>
                            <p style={{ marginBottom: '1rem', textAlign: 'justify', textIndent: '2rem', lineHeight: 1.5 }}>
                              {section2.workPlanOverview}
                            </p>
                            <div style={{ backgroundColor: 'var(--slate-50)', padding: '0.75rem', border: '1px solid var(--slate-300)', borderRadius: '6px', textAlign: 'center', marginBottom: '1.5rem' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--primary-800)', fontWeight: 600 }}>
                                [แผนภูมิ Gantt Chart รายสัปดาห์ (1 เดือน = 4 วีค) ตามขอบเขตงาน {section1.scopeItems.length} ข้อตลอด {section1.projectDurationMonths} เดือน จะถูกเรนเดอร์ในหน้าแนวนอน (Landscape) กว้างคมชัดเต็มหน้ากระดาษ Word]
                              </span>
                            </div>
                          </div>
                        );
                      }
                      if (h.id === 's2_timeline') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                              {numPrefix} {h.title}
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', marginBottom: '1.5rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--primary-800)', color: 'white' }}>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ข้อ TOR</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ขอบเขตงาน</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ช่วงเวลา</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ผู้รับผิดชอบหลัก</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section1.scopeItems.map((item) => (
                                  <tr key={item.id}>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'center', fontWeight: 600 }}>
                                      {formatTorClauseNumber(item.clauseNumber)}
                                    </td>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>
                                      {item.title}
                                    </td>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'center' }}>
                                      เดือนที่ {item.startMonth} (สัปดาห์ {item.startWeek}) รวม {item.durationWeeks} สัปดาห์
                                    </td>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>
                                      {item.responsibleRole}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      if (h.id === 's2_milestones') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                              {numPrefix} {h.title}
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--primary-800)', color: 'white' }}>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>งวด</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ชื่อผลงาน</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ระยะเวลา</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ร้อยละ / วงเงิน</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section2.milestones.map((m) => (
                                  <tr key={m.id}>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'center' }}>งวดที่ {m.installment}</td>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>{m.title}</td>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>{m.timeframe}</td>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'right' }}>
                                      {m.percentage}% ({m.amount.toLocaleString()} บาท)
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      return null;
                    })}

                    {renderImageBlocksPreview(section2.imageBlocks, 'ภาพที่ 2')}
                  </div>
                );
              }

              // =======================================================
              // SECTION 3
              // =======================================================
              if (sec.id === 'section3') {
                return (
                  <div key={sec.id} style={{ marginBottom: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem' }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                        ส่วนที่ {secNum}<br />
                        {sec.title}
                      </h2>
                    </div>

                    {activeHeadings.map((h, hIdx) => {
                      const numPrefix = autoRenumber ? `${secNum}.${hIdx + 1}` : h.originalCode;
                      if (h.id === 's3_framework') {
                        let hasRenderedFirstImage = false;
                        const firstImageFromProp = section3.conceptualDiagramImage;

                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                              {numPrefix} {h.title}
                            </h3>
                            <p style={{ marginBottom: '1rem', textAlign: 'justify', textIndent: '2rem', lineHeight: 1.5 }}>
                              {section3.frameworkOverview}
                            </p>

                            {/* ภาพแรกจาก conceptualDiagramImage (ถ้ามี) */}
                            {firstImageFromProp && (() => {
                              hasRenderedFirstImage = true;
                              return (
                                <div style={{ textAlign: 'center', marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '6px', border: '1px solid var(--slate-200)' }}>
                                  <img
                                    src={firstImageFromProp}
                                    alt="Conceptual Diagram"
                                    style={{
                                      maxWidth: '100%',
                                      width: '100%',
                                      maxHeight: '340px',
                                      objectFit: 'contain',
                                      borderRadius: '4px',
                                      margin: '0 auto',
                                      display: 'block',
                                    }}
                                  />
                                  <div style={{ fontSize: '0.82rem', color: 'var(--slate-700)', fontStyle: 'italic', marginTop: '0.45rem', fontWeight: 500 }}>
                                    {section3.conceptualDiagramCaption || `ภาพที่ ${numPrefix}-1 แผนภาพกรอบแนวคิดการดำเนินงาน`}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#16A34A', marginTop: '2px', fontWeight: 500 }}>
                                    [ภาพแรก: ขนาดกว้าง 6 นิ้ว ความสูงไม่เกิน 19 ซม.]
                                  </div>
                                </div>
                              );
                            })()}

                            {/* รายการภาพจาก imageBlocks ใน 3.1 (ภาพแรกถ้ายังไม่มีให้เป็น 19 ซม., ภาพถัดไปขึ้นหน้าใหม่เต็มหน้า 23 ซม.) */}
                            {section3.imageBlocks && section3.imageBlocks.map((block, bIdx) => {
                              const isFirst = !hasRenderedFirstImage && bIdx === 0;
                              const imgNumber = hasRenderedFirstImage ? bIdx + 2 : bIdx + 1;

                              if (block.type === 'single' && block.url) {
                                return (
                                  <React.Fragment key={block.id || bIdx}>
                                    {!isFirst && (
                                      <div
                                        style={{
                                          margin: '1.5rem 0 1rem',
                                          padding: '0.45rem 0.85rem',
                                          backgroundColor: '#EFF6FF',
                                          border: '1px dashed #3B82F6',
                                          borderRadius: '6px',
                                          color: '#1D4ED8',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          textAlign: 'center',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '0.4rem',
                                        }}
                                      >
                                        <span>📄 ขึ้นหน้าใหม่ (Page Break) — แสดงเต็มหน้ากระดาษ A4 กว้าง 6 นิ้ว สูงไม่เกิน 23 ซม.</span>
                                      </div>
                                    )}
                                    <div
                                      style={{
                                        textAlign: 'center',
                                        backgroundColor: '#F8FAFC',
                                        padding: '1rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--slate-200)',
                                        marginBottom: '1rem',
                                      }}
                                    >
                                      <img
                                        src={block.url}
                                        alt={isFirst ? 'ภาพแรก 6 นิ้ว' : 'แผนภาพแสดงเต็มหน้า'}
                                        style={{
                                          maxWidth: '100%',
                                          width: '100%',
                                          maxHeight: isFirst ? '340px' : '440px',
                                          objectFit: 'contain',
                                          borderRadius: '4px',
                                          margin: '0 auto',
                                          display: 'block',
                                        }}
                                      />
                                      <div style={{ fontSize: '0.82rem', color: 'var(--slate-700)', fontStyle: 'italic', marginTop: '0.45rem', fontWeight: 500 }}>
                                        {block.caption || `ภาพที่ ${numPrefix}-${imgNumber} ${isFirst ? 'แผนภาพกรอบแนวคิดการดำเนินงาน' : 'แผนภาพรายละเอียดการดำเนินงาน'}`}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: isFirst ? '#16A34A' : '#2563EB', marginTop: '2px', fontWeight: 500 }}>
                                        {isFirst
                                          ? '[ภาพแรก: ขนาดกว้าง 6 นิ้ว ความสูงไม่เกิน 19 ซม.]'
                                          : '[แสดงเต็มหน้า: ขนาดกว้าง 6 นิ้ว ความสูงไม่เกิน 23 ซม.]'}
                                      </div>
                                    </div>
                                  </React.Fragment>
                                );
                              }

                              if (block.type === 'pair' && (block.leftUrl || block.rightUrl)) {
                                return (
                                  <React.Fragment key={block.id || bIdx}>
                                    {!isFirst && (
                                      <div
                                        style={{
                                          margin: '1.5rem 0 1rem',
                                          padding: '0.45rem 0.85rem',
                                          backgroundColor: '#EFF6FF',
                                          border: '1px dashed #3B82F6',
                                          borderRadius: '6px',
                                          color: '#1D4ED8',
                                          fontSize: '0.78rem',
                                          fontWeight: 600,
                                          textAlign: 'center',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '0.4rem',
                                        }}
                                      >
                                        <span>📄 ขึ้นหน้าใหม่ (Page Break) — ภาพคู่แสดงเต็มหน้า</span>
                                      </div>
                                    )}
                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '0.5rem',
                                        backgroundColor: '#F8FAFC',
                                        padding: '0.65rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--slate-200)',
                                        marginBottom: '1rem',
                                      }}
                                    >
                                      <div style={{ textAlign: 'center' }}>
                                        {block.leftUrl ? (
                                          <>
                                            <img
                                              src={block.leftUrl}
                                              alt="ภาพซ้าย 3 นิ้ว"
                                              style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '4px' }}
                                            />
                                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                              {block.leftCaption || 'ภาพประกอบ (กว้าง 3 นิ้ว)'}
                                            </div>
                                          </>
                                        ) : (
                                          <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem', padding: '1rem' }}>- คอลัมน์ซ้ายว่าง -</div>
                                        )}
                                      </div>
                                      <div style={{ textAlign: 'center' }}>
                                        {block.rightUrl ? (
                                          <>
                                            <img
                                              src={block.rightUrl}
                                              alt="ภาพขวา 3 นิ้ว"
                                              style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '4px' }}
                                            />
                                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                              {block.rightCaption || 'ภาพประกอบ (กว้าง 3 นิ้ว)'}
                                            </div>
                                          </>
                                        ) : (
                                          <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem', padding: '1rem' }}>- คอลัมน์ขวาว่าง -</div>
                                        )}
                                      </div>
                                    </div>
                                  </React.Fragment>
                                );
                              }

                              return null;
                            })}
                          </div>
                        );
                      }
                      if (h.id === 's3_methodology') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary-900)' }}>
                              {numPrefix} {h.title}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                              {section1.scopeItems.map((item, idx) => {
                                const methLines = (item.proposedMethodology || 'บริษัทฯ มุ่งมั่นปฏิบัติงานตามมาตรฐานสากลและส่งมอบตามเกณฑ์ที่กำหนด')
                                  .split('\n')
                                  .map((l) => l.trim())
                                  .filter(Boolean);

                                const parsedElements: React.ReactNode[] = [];
                                let lineIdx = 0;
                                while (lineIdx < methLines.length) {
                                  const line = methLines[lineIdx];
                                  if (line.startsWith('|') && line.endsWith('|')) {
                                    const tableLines: string[] = [];
                                    while (lineIdx < methLines.length && methLines[lineIdx].startsWith('|') && methLines[lineIdx].endsWith('|')) {
                                      tableLines.push(methLines[lineIdx]);
                                      lineIdx++;
                                    }
                                    const contentRows = tableLines.filter((tl) => !/^\|[\s\-:|]+\|$/.test(tl));
                                    if (contentRows.length > 0) {
                                      const parsedRows = contentRows.map((r) =>
                                        r.split('|').slice(1, -1).map((c) => c.trim())
                                      );
                                      const headerRow = parsedRows[0];
                                      const dataRows = parsedRows.slice(1);
                                      const firstColTitle = (headerRow[0] || '').trim();
                                      const isSeqCol = /^(ลำดับ|ขั้นตอน|ที่|ข้อ|ลำดับที่|no\.?|#)$/i.test(firstColTitle) || (headerRow.length > 2 && dataRows.every((r) => !r[0] || r[0].length <= 4));

                                      parsedElements.push(
                                        <table
                                          key={`tbl-${lineIdx}`}
                                          style={{
                                            width: '100%',
                                            borderCollapse: 'collapse',
                                            fontSize: '0.825rem',
                                            margin: '0.5rem 0 0.75rem 0',
                                            border: '1px solid var(--slate-300)',
                                          }}
                                        >
                                          <thead>
                                            <tr style={{ backgroundColor: 'var(--primary-800)', color: 'white' }}>
                                              {headerRow.map((head, hColIdx) => {
                                                const isCol0Seq = isSeqCol && hColIdx === 0;
                                                return (
                                                  <th
                                                    key={hColIdx}
                                                    style={{
                                                      padding: '6px 8px',
                                                      border: '1px solid var(--slate-300)',
                                                      textAlign: isCol0Seq ? 'center' : 'left',
                                                      width: isCol0Seq ? '10%' : undefined,
                                                    }}
                                                  >
                                                    {head}
                                                  </th>
                                                );
                                              })}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {dataRows.map((row, rIdx) => (
                                              <tr key={rIdx} style={{ backgroundColor: rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                                                {row.map((cell, cIdx) => {
                                                  const isCol0Seq = isSeqCol && cIdx === 0;
                                                  return (
                                                    <td
                                                      key={cIdx}
                                                      style={{
                                                        padding: '6px 8px',
                                                        border: '1px solid var(--slate-300)',
                                                        textAlign: isCol0Seq ? 'center' : 'left',
                                                        fontWeight: isCol0Seq ? 600 : 400,
                                                      }}
                                                    >
                                                      {cell}
                                                    </td>
                                                  );
                                                })}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      );
                                    }
                                    continue;
                                  }

                                  const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*');
                                  if (isBullet) {
                                    const cleanLine = line.replace(/^[-•*]\s*/, '');
                                    parsedElements.push(
                                      <div
                                        key={`bullet-${lineIdx}`}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          gap: '6px',
                                          marginLeft: '1rem',
                                          marginBottom: '0.25rem',
                                        }}
                                      >
                                        <span style={{ color: 'var(--primary-700)', fontWeight: 700 }}>•</span>
                                        <span>{cleanLine}</span>
                                      </div>
                                    );
                                  } else {
                                    parsedElements.push(
                                      <p key={`p-${lineIdx}`} style={{ margin: '0 0 0.5rem 0', textAlign: 'left', textIndent: '2rem', lineHeight: 1.5 }}>
                                        {line}
                                      </p>
                                    );
                                  }
                                  lineIdx++;
                                }

                                return (
                                  <div key={item.id} style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '1rem' }}>
                                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.4rem' }}>
                                      {numPrefix}.{idx + 1} {formatTorClauseNumber(item.clauseNumber)}: {item.title}
                                    </h4>

                                    <div style={{ fontSize: '0.875rem', color: 'var(--slate-800)', marginBottom: '0.5rem' }}>
                                      {parsedElements}
                                    </div>

                                    {renderImageBlocksPreview(
                                      normalizeTorItemImageBlocks(item),
                                      `ภาพที่ ${numPrefix}.${idx + 1}`
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              }

              // =======================================================
              // SECTION 4
              // =======================================================
              if (sec.id === 'section4') {
                return (
                  <div key={sec.id} style={{ marginBottom: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem', position: 'relative' }}>
                      <span style={{ position: 'absolute', right: 0, top: 0, backgroundColor: '#D97706', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        หน้าเอกสาร Word แนวนอน (Landscape)
                      </span>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                        ส่วนที่ {secNum}<br />
                        {sec.title}
                      </h2>
                    </div>

                    <p style={{ marginBottom: '1rem' }}>{section4.teamOverview}</p>

                    {activeHeadings.map((h, hIdx) => {
                      const numPrefix = autoRenumber ? `${secNum}.${hIdx + 1}` : h.originalCode;
                      if (h.id === 's4_team_overview') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary-900)' }}>
                              {numPrefix} {h.title} ({section4.teamMembers.length} ท่าน)
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--primary-800)', color: 'white' }}>
                                  <th style={{ padding: '8px', border: '1px solid var(--slate-300)', width: '6%', textAlign: 'center' }}>ลำดับ</th>
                                  <th style={{ padding: '8px', border: '1px solid var(--slate-300)', width: '24%' }}>ชื่อ - นามสกุล</th>
                                  <th style={{ padding: '8px', border: '1px solid var(--slate-300)', width: '26%' }}>ตำแหน่งในโครงการ</th>
                                  <th style={{ padding: '8px', border: '1px solid var(--slate-300)', width: '16%', textAlign: 'center' }}>อายุงาน</th>
                                  <th style={{ padding: '8px', border: '1px solid var(--slate-300)', width: '28%' }}>วุฒิการศึกษา</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section4.teamMembers.map((m, idx) => (
                                  <tr key={m.id} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                                    <td style={{ padding: '8px', border: '1px solid var(--slate-300)', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                                    <td style={{ padding: '8px', border: '1px solid var(--slate-300)', fontWeight: 600, color: 'var(--primary-900)' }}>{m.name}</td>
                                    <td style={{ padding: '8px', border: '1px solid var(--slate-300)' }}>{m.proposedRole}</td>
                                    <td style={{ padding: '8px', border: '1px solid var(--slate-300)', textAlign: 'center' }}>
                                      <span style={{ fontWeight: 600 }}>{m.experienceYears} ปี</span>
                                      {m.startWorkYearBE ? (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>เริ่มงาน พ.ศ. {m.startWorkYearBE}</div>
                                      ) : null}
                                    </td>
                                    <td style={{ padding: '8px', border: '1px solid var(--slate-300)' }}>
                                      <div>{m.education}</div>
                                      {m.certifications && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)', marginTop: '2px' }}>
                                          • ใบรับรอง: {m.certifications}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {renderImageBlocksPreview(section4.imageBlocks, `ภาพที่ ${numPrefix}`)}
                          </div>
                        );
                      }
                      if (h.id === 's4_team_cv') {
                        return (
                          <div key={h.id} style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary-900)' }}>
                              {numPrefix} {h.title}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {section4.teamMembers.map((m, idx) => (
                                <div
                                  key={m.id}
                                  style={{
                                    border: '1px solid var(--slate-300)',
                                    borderRadius: '8px',
                                    padding: '1rem',
                                    backgroundColor: '#FFFFFF',
                                    display: 'flex',
                                    gap: '1.25rem',
                                    alignItems: 'flex-start',
                                  }}
                                >
                                  <div style={{ width: '110px', flexShrink: 0, textAlign: 'center' }}>
                                    <div
                                      style={{
                                        width: '110px',
                                        height: '146px',
                                        borderRadius: '6px',
                                        border: m.photoUrl ? '1px solid var(--slate-300)' : '2px dashed var(--slate-300)',
                                        backgroundColor: '#F8FAFC',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                                      }}
                                    >
                                      {m.photoUrl ? (
                                        <img src={m.photoUrl} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      ) : (
                                        <div style={{ padding: '6px', color: 'var(--slate-400)', fontSize: '0.7rem' }}>
                                          <div style={{ fontWeight: 600 }}>รูปถ่าย 1.5 นิ้ว</div>
                                          <div style={{ fontSize: '0.625rem' }}>(หน้าตรงทางการ)</div>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-700)', marginTop: '6px' }}>
                                      ลำดับที่ {idx + 1}
                                    </div>
                                  </div>

                                  <div style={{ flex: 1, minWidth: 0, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-900)' }}>{m.name}</div>
                                    <div>
                                      <strong>ตำแหน่งในโครงการ: </strong>
                                      <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{m.proposedRole}</span>
                                    </div>
                                    <div>
                                      <strong>อายุงานและประสบการณ์: </strong>
                                      <span>{m.experienceYears} ปี{m.startWorkYearBE ? ` (เริ่มงานปี พ.ศ. ${m.startWorkYearBE})` : ''}</span>
                                    </div>
                                    <div>
                                      <strong>วุฒิการศึกษา: </strong>
                                      <span>{m.education}</span>
                                    </div>
                                    <div>
                                      <strong>ใบรับรองมาตรฐานวิชาชีพ: </strong>
                                      <span>{m.certifications || '-'}</span>
                                    </div>
                                    <div style={{ backgroundColor: '#F8FAFC', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid var(--primary-600)', marginTop: '2px' }}>
                                      <strong>ประวัติส่วนตัว: </strong>
                                      <span>{m.personalBio || 'มีความรู้ความสามารถและประสบการณ์ตรงในการพัฒนาระบบเทคโนโลยีสารสนเทศภาครัฐ'}</span>
                                    </div>
                                    <div>
                                      <strong>หน้าที่ความรับผิดชอบในโครงการ: </strong>
                                      <span>{m.responsibilities}</span>
                                    </div>
                                    <div>
                                      <strong>ประสบการณ์และผลงานเด่น: </strong>
                                      <span>{m.highlightProjects}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      if (h.id === 's4_risk') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                              {numPrefix} {h.title} ({section4.riskItems.length} ประเด็น)
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--primary-800)', color: 'white' }}>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>หมวด</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ประเด็นความเสี่ยง</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>โอกาส/ผลกระทบ</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>มาตรการป้องกัน</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section4.riskItems.map((r) => (
                                  <tr key={r.id}>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)', fontWeight: 600 }}>{r.category}</td>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>{r.riskTitle}</td>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'center' }}>{r.likelihood}/{r.impact}</td>
                                    <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>{r.mitigationPlan}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      if (h.id === 's4_compliance') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>
                              {numPrefix} {h.title}
                            </h3>
                            <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: 'var(--slate-600)' }}>
                              {section4.complianceMatrixOverview || 'ตารางเปรียบเทียบการตอบสนองข้อกำหนด TOR ทุกข้อ โดยระบุว่ายอมรับและดำเนินการตาม TOR หรือเสนอแนวทางที่ดียิ่งกว่า'}
                            </p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', marginBottom: '1.5rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--primary-800)', color: 'white' }}>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'left', width: '38%' }}>
                                    ข้อกำหนดตามประกาศจัดจ้าง (TOR)
                                  </th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'center', width: '28%' }}>
                                    การดำเนินการ
                                  </th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'left', width: '34%' }}>
                                    หมายเหตุ / รายละเอียดที่เสนอดีกว่า TOR
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {section1.scopeItems.map((item) => {
                                  const isExceed = item.complianceStatus === 'exceed';
                                  return (
                                    <tr key={item.id} style={{ backgroundColor: isExceed ? '#FFFBEB' : '#FFFFFF' }}>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--primary-900)', marginRight: '4px' }}>
                                          {formatTorClauseNumber(item.clauseNumber)}
                                        </span>
                                        <span style={{ fontWeight: item.level === 1 ? 600 : 500, color: 'var(--slate-800)' }}>
                                          {item.title || item.requirement}
                                        </span>
                                        {item.requirement && item.requirement !== item.title && (
                                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                                            {item.requirement}
                                          </div>
                                        )}
                                      </td>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'center', fontWeight: 600, color: isExceed ? '#92400E' : '#1E40AF', backgroundColor: isExceed ? '#FEF3C7' : '#EFF6FF' }}>
                                        {isExceed ? '⭐ ยอมรับและเสนอแนวทางดีกว่า TOR' : '✓ ยอมรับและดำเนินการตาม TOR'}
                                      </td>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', color: isExceed ? '#92400E' : 'var(--slate-600)', fontWeight: isExceed ? 500 : 400 }}>
                                        {isExceed ? (item.complianceNote || 'เสนอแนวทางและระดับมาตรฐานสูงกว่าเกณฑ์ที่กำหนด') : (item.complianceNote || '-')}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              }

              // =======================================================
              // SECTION 5
              // =======================================================
              if (sec.id === 'section5') {
                return (
                  <div key={sec.id} style={{ marginBottom: '2.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem' }}>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                        ส่วนที่ {secNum}<br />
                        {sec.title}
                      </h2>
                    </div>

                    {activeHeadings.map((h, hIdx) => {
                      const numPrefix = autoRenumber ? `${secNum}.${hIdx + 1}` : h.originalCode;
                      if (h.id === 's5_profile') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                              {numPrefix} {h.title}
                            </h3>
                            {section5.companyLogoUrl && (
                              <div style={{ marginBottom: '0.75rem' }}>
                                <img
                                  src={section5.companyLogoUrl}
                                  alt="Company Logo"
                                  style={{ height: '55px', maxWidth: '140px', objectFit: 'contain' }}
                                />
                              </div>
                            )}
                            <p style={{ marginBottom: '0.5rem' }}>{section5.companyProfile}</p>
                            <div style={{ fontSize: '0.85rem', color: 'var(--slate-700)', marginBottom: '0.75rem' }}>
                              <strong>ทุนจดทะเบียน:</strong> {section5.registeredCapital} | <strong>วิสัยทัศน์:</strong> {section5.visionMission}
                            </div>
                            {section5.companyOfficeImageUrl && (
                              <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                                <img
                                  src={section5.companyOfficeImageUrl}
                                  alt="Company Office"
                                  style={{ maxWidth: '420px', maxHeight: '180px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--slate-200)' }}
                                />
                                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontStyle: 'italic', marginTop: '2px' }}>
                                  {section5.companyOfficeImageCaption || 'สำนักงาน บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด'}
                                </div>
                              </div>
                            )}
                            {renderImageBlocksPreview(section5.imageBlocks, `ภาพที่ ${numPrefix}`)}
                          </div>
                        );
                      }
                      if (h.id === 's5_certifications') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                              {numPrefix} {h.title}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                              {(section5.certifications || ['ISO 29110 Standard', 'ISO 27001 Security Management']).map((cert, cIdx) => (
                                <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: 'var(--primary-700)', fontWeight: 700 }}>✓</span>
                                  <span>{cert}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      if (h.id === 's5_tor_reference') {
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <div style={{ backgroundColor: 'var(--slate-50)', padding: '0.6rem 0.75rem', border: '1px solid var(--slate-300)', borderRadius: '6px', textAlign: 'center', marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--primary-800)', fontWeight: 600 }}>
                                [ส่วนที่ 5.3: ตารางผลงานและประสบการณ์ (5.3.1 และ 5.3.2) ถูกจัดวางในหน้าแนวนอน (Landscape) พร้อม Repeat Header Row ข้ามหน้า]
                              </span>
                            </div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>
                              {numPrefix} ผลงานอ้างอิงหลักตามเกณฑ์ TOR (ย้อนหลังไม่เกิน {section5.maxYearsFilter} ปี พ.ศ. {2568 - section5.maxYearsFilter} - 2568)
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', marginBottom: '1rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--primary-800)', color: 'white' }}>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ชื่อโครงการ</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>หน่วยงาน</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ปีที่แล้วเสร็จ</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>มูลค่าสัญญา</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>หลักฐานสัญญา/รับรอง</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section5.pastProjects
                                  .filter((p) => p.isSelected && (p.projectType || 'tor_reference') === 'tor_reference' && (2568 - p.completionYearBE <= section5.maxYearsFilter))
                                  .map((p) => (
                                    <tr key={p.id}>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', fontWeight: 600 }}>{p.projectName}</td>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>{p.clientName}</td>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'center' }}>พ.ศ. {p.completionYearBE}</td>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'right' }}>{p.contractValue.toLocaleString()} บาท</td>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'center', color: p.certificateFileUrl ? 'var(--primary-700)' : 'var(--slate-500)', fontWeight: p.certificateFileUrl ? 600 : 400 }}>
                                        {p.certificateFileUrl ? '✓ มีแนบในภาคผนวก ก' : 'หนังสือรับรองผลงาน'}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      if (h.id === 's5_supplementary') {
                        const hasSupplementary = section5.pastProjects.some((p) => p.isSelected && p.projectType === 'supplementary');
                        if (!hasSupplementary) return null;
                        return (
                          <div key={h.id} style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.75rem 0 1rem 0' }}>
                              <div style={{ flex: 1, borderTop: '1px dashed var(--slate-300)' }} />
                              <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontWeight: 500, letterSpacing: '0.05em' }}>
                                [-- ขึ้นหน้าใหม่ (Page Break) --]
                              </span>
                              <div style={{ flex: 1, borderTop: '1px dashed var(--slate-300)' }} />
                            </div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>
                              {numPrefix} ผลงานและประสบการณ์เสริมที่สอดคล้องกับงานจ้างโครงการนี้ (Supplementary Experience)
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', marginBottom: '1.5rem' }}>
                              <thead>
                                <tr style={{ backgroundColor: 'var(--slate-700)', color: 'white' }}>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ชื่อโครงการ & ผู้ว่าจ้าง</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>กิจกรรมและประเด็นที่สอดคล้องกับงานจ้างโครงการนี้</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ปี พ.ศ.</th>
                                  <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>มูลค่าสัญญา</th>
                                </tr>
                              </thead>
                              <tbody>
                                {section5.pastProjects
                                  .filter((p) => p.isSelected && p.projectType === 'supplementary')
                                  .map((p) => (
                                    <tr key={p.id}>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', fontWeight: 600 }}>
                                        {p.projectName}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 400 }}>{p.clientName}</div>
                                      </td>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', color: 'var(--primary-900)' }}>
                                        {p.relevanceNote || p.description}
                                      </td>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'center' }}>พ.ศ. {p.completionYearBE}</td>
                                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', textAlign: 'right' }}>{p.contractValue.toLocaleString()} บาท</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      if (h.id === 's5_appendix_certs') {
                        const certProjects = section5.pastProjects.filter((p) => p.isSelected && p.projectType === 'tor_reference' && !!p.certificateFileUrl);
                        if (certProjects.length === 0) return null;
                        return (
                          <div key={h.id} style={{ marginBottom: '2.5rem', borderTop: '2px solid var(--primary-800)', paddingTop: '1.25rem' }}>
                            <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-800)', marginBottom: '0.5rem' }}>
                              ภาคผนวก ก: สำเนาสัญญาจ้างและหนังสือรับรองผลงาน (ตามประกาศ TOR)
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
                              เอกสารหลักฐานสำเนาสัญญาจ้างและหนังสือรับรองผลงานโครงการที่แล้วเสร็จ เพื่อประกอบการพิจารณาคุณสมบัติตามเกณฑ์ TOR
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                              {certProjects.map((p, idx) => (
                                <div key={p.id} style={{ border: '1px solid var(--slate-300)', borderRadius: '6px', padding: '1rem', backgroundColor: '#F8FAFC' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--primary-900)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                                    เอกสารแนบ ก.{idx + 1}: สำเนาสัญญา / หนังสือรับรองผลงาน {p.projectName}
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginBottom: '0.75rem' }}>
                                    ผู้ว่าจ้าง: {p.clientName} | ปีที่แล้วเสร็จ: พ.ศ. {p.completionYearBE} | มูลค่า: {p.contractValue.toLocaleString()} บาท
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <img
                                      src={p.certificateFileUrl}
                                      alt="Certificate"
                                      style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--slate-300)', backgroundColor: '#FFFFFF' }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                );
              }

              return null;
            })}

            {/* Back Cover Preview (ปกหลัง A4 เต็มหน้า) */}
            {cover.includeBackCover && (
              <div style={{ marginTop: '3rem', borderTop: '2px solid var(--primary-800)', paddingTop: '2rem' }}>
                {cover.backCoverImage ? (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.85rem',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '6px',
                        marginBottom: '1rem',
                        fontSize: '0.8rem',
                        color: '#1D4ED8',
                        fontWeight: 600,
                      }}
                    >
                      <span>📄 ปกหลังเอกสารขนาด A4 เต็มหน้า (หน้าสุดท้ายของเล่ม)</span>
                      <span style={{ fontSize: '0.72rem', color: '#3B82F6', fontWeight: 'normal' }}>
                        (A4 Portrait: 210 × 297 มม.)
                      </span>
                    </div>
                    <div
                      style={{
                        textAlign: 'center',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        border: '1px solid var(--slate-300)',
                        padding: '0.5rem',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={cover.backCoverImage}
                        alt="A4 Back Cover"
                        style={{
                          width: '100%',
                          maxHeight: '640px',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '4rem 2rem',
                      backgroundColor: 'var(--slate-50)',
                      borderRadius: '8px',
                      border: '1px solid var(--slate-200)',
                    }}
                  >
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.5rem' }}>
                      บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--gold-600)', marginBottom: '1.5rem' }}>
                      Prime Digital Consultant Co., Ltd.
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)', fontStyle: 'italic', marginBottom: '2rem' }}>
                      มุ่งมั่นสร้างสรรค์นวัตกรรมดิจิทัลภาครัฐ เพื่อประโยชน์สูงสุดของประชาชน
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                      โทรศัพท์: 02-XXX-XXXX | อีเมล: contact@primedigital.co.th | เว็บไซต์: www.primedigital.co.th
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '1rem' }}>
                      [หน้าปกหลังเริ่มต้นปิดเล่มเอกสาร]
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {onOpenStructureModal && (
              <button
                type="button"
                onClick={onOpenStructureModal}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <SlidersHorizontal size={15} />
                <span>ปรับแต่งหัวข้อ / โครงสร้างเอกสาร</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              ปิดตัวอย่าง
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={isExporting}
              className="btn btn-primary"
            >
              <FileDown size={16} />
              {isExporting ? 'กำลังสร้างไฟล์ Word...' : 'ดาวน์โหลด Word (.docx)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
