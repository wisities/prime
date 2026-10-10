import React from 'react';
import { ProposalData } from '../types/proposal';
import { FileDown, Eye, X } from 'lucide-react';

interface LiveDocxPreviewModalProps {
  data: ProposalData;
  isOpen: boolean;
  onClose: () => void;
  isExporting: boolean;
  onExport: () => void;
}

const formatTorClauseNumber = (clause: string): string => {
  const trimmed = (clause || '').trim();
  if (!trimmed) return 'ข้อ ';
  if (trimmed.startsWith('ข้อ')) return trimmed;
  return `ข้อ ${trimmed}`;
};

export const LiveDocxPreviewModal: React.FC<LiveDocxPreviewModalProps> = ({
  data,
  isOpen,
  onClose,
  isExporting,
  onExport,
}) => {
  if (!isOpen) return null;

  const { cover, section1, section2, section3, section4, section5 } = data;

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
                แสดงโครงสร้างเนื้อหาที่จะถูก Export เป็นไฟล์ Microsoft Word (.docx)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
            {/* Document Header Code */}
            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--slate-400)', marginBottom: '1.5rem' }}>
              รหัสเอกสาร: {cover.projectCode}
            </div>

            {/* Front Cover Box */}
            <div className="doc-cover-border" style={{ marginBottom: '3rem' }}>
              {cover.coverImage && (
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <img
                    src={cover.coverImage}
                    alt="Cover"
                    style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ส่วนที่ 1: บทนำและภาพรวมโครงการ</span>
                    <span>1</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ส่วนที่ 2: แผนการดำเนินงานตลอดโครงการ (Work Plan & Gantt Chart)</span>
                    <span>3</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ส่วนที่ 3: กรอบแนวคิดและวิธีการดำเนินงานตามข้อกำหนด (TOR Mapping)</span>
                    <span>5</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ส่วนที่ 4: คณะผู้ดำเนินงานและแนวทางการบริหารจัดการความเสี่ยง</span>
                    <span>8</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>ส่วนที่ 5: ประวัติและประสบการณ์ของบริษัทที่เกี่ยวข้อง</span>
                    <span>10</span>
                  </div>
                </div>
              </div>
            )}

            {/* Section 1 Preview */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                  ส่วนที่ 1<br />
                  บทนำ ภาพรวมโครงการ และขอบเขตงานตามประกาศจัดจ้าง
                </h2>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '0.75rem', marginBottom: '0.35rem' }}>
                1.1 ความเป็นมาและความสำคัญ
              </h3>
              <p style={{ textAlign: 'justify', textIndent: '2rem', marginBottom: '1rem' }}>
                {section1.background}
              </p>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                1.2 วัตถุประสงค์ของโครงการ
              </h3>
              <ul style={{ paddingLeft: '2rem', marginBottom: '1rem' }}>
                {section1.objectives.map((obj, i) => (
                  <li key={i}>(1.{i + 1}) {obj}</li>
                ))}
              </ul>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                1.3 ประโยชน์ที่คาดว่าจะได้รับ
              </h3>
              <ul style={{ paddingLeft: '2rem', marginBottom: '1rem' }}>
                {section1.expectedBenefits.map((b, i) => (
                  <li key={i}>(2.{i + 1}) {b}</li>
                ))}
              </ul>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>
                1.5 ขอบเขตงานตามประกาศจัดจ้าง ({section1.scopeItems.length} ข้อ)
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

            {/* Section 2 Preview */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem', position: 'relative' }}>
                <span style={{ position: 'absolute', right: 0, top: 0, backgroundColor: '#D97706', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  หน้าเอกสาร Word แนวนอน (Landscape)
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                  ส่วนที่ 2<br />
                  แผนการดำเนินงานตลอดโครงการ (Work Plan & Weekly Gantt Chart)
                </h2>
              </div>
              <p style={{ marginBottom: '1rem' }}>{section2.workPlanOverview}</p>
              
              <div style={{ backgroundColor: 'var(--slate-50)', padding: '0.75rem', border: '1px solid var(--slate-300)', borderRadius: '6px', textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary-800)', fontWeight: 600 }}>
                  [แผนภูมิ Gantt Chart รายสัปดาห์ (1 เดือน = 4 วีค) ตามขอบเขตงาน {section1.scopeItems.length} ข้อตลอด {section1.projectDurationMonths} เดือน จะถูกเรนเดอร์ในหน้าแนวนอน (Landscape) กว้างคมชัดเต็มหน้ากระดาษ Word]
                </span>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                ตารางงวดงานและแผนการส่งมอบ (Milestones)
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

            {/* Section 3 Preview (TOR Mapping) */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                  ส่วนที่ 3<br />
                  กรอบแนวคิดและวิธีการดำเนินงานตามข้อกำหนด (TOR Mapping)
                </h2>
              </div>
              <p style={{ marginBottom: '1rem' }}>{section3.frameworkOverview}</p>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--primary-900)' }}>
                3.2 วิธีการดำเนินงาน
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {section1.scopeItems.map((item, idx) => {
                  const showSingle =
                    (item.imageLayout === 'single_centered' || item.imageLayout === 'both') &&
                    Boolean(item.singleImage?.url);
                  const showTwoCols =
                    (item.imageLayout === 'two_columns' || item.imageLayout === 'both') &&
                    Boolean(item.twoColumnImageLeft?.url || item.twoColumnImageRight?.url);

                  // Parsing methodology into paragraphs, bullets, and markdown tables
                  const methLines = (item.proposedMethodology || 'บริษัทฯ มุ่งมั่นปฏิบัติงานตามมาตรฐานสากลและส่งมอบตามเกณฑ์ที่กำหนด')
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean);

                  const parsedElements: React.ReactNode[] = [];
                  let lineIdx = 0;
                  while (lineIdx < methLines.length) {
                    const line = methLines[lineIdx];

                    // ตารางแบบ Markdown (| col1 | col2 |)
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
                                {headerRow.map((h, hIdx) => (
                                  <th key={hIdx} style={{ padding: '6px 8px', border: '1px solid var(--slate-300)', textAlign: 'left' }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {dataRows.map((row, rIdx) => (
                                <tr key={rIdx} style={{ backgroundColor: rIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} style={{ padding: '6px 8px', border: '1px solid var(--slate-300)' }}>
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      }
                      continue;
                    }

                    // บูลเล็ตพ้อยต์
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
                      // พรรณาวิธีการ (Paragraph)
                      parsedElements.push(
                        <p key={`p-${lineIdx}`} style={{ margin: '0 0 0.35rem 0', lineHeight: 1.6 }}>
                          {line}
                        </p>
                      );
                    }
                    lineIdx++;
                  }

                  return (
                    <div key={item.id} style={{ borderBottom: '1px solid var(--slate-200)', paddingBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.4rem' }}>
                        3.2.{idx + 1} {formatTorClauseNumber(item.clauseNumber)}: {item.title}
                      </h4>

                      {/* Methodology narrative, bullets, or table */}
                      <div style={{ fontSize: '0.875rem', color: 'var(--slate-800)', marginBottom: '0.5rem' }}>
                        {parsedElements}
                      </div>

                      {/* แบบที่ 1: ภาพอธิบายการทำงาน 1 รูป กว้าง 6 นิ้ว กึ่งกลาง */}
                      {showSingle && item.singleImage?.url && (
                        <div style={{ marginTop: '0.5rem', textAlign: 'center', backgroundColor: '#F8FAFC', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                          <img
                            src={item.singleImage.url}
                            alt="ภาพอธิบายการทำงาน"
                            style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain', borderRadius: '4px', margin: '0 auto', display: 'block' }}
                          />
                          <div style={{ fontSize: '0.8rem', color: 'var(--slate-600)', fontStyle: 'italic', marginTop: '0.35rem' }}>
                            {item.singleImage.caption || `ภาพที่ 3.2.${idx + 1}-1 ภาพอธิบายขั้นตอนและวิธีการดำเนินงาน`}
                          </div>
                        </div>
                      )}

                      {/* แบบที่ 2: ภาพประกอบในตาราง 2 คอลัมน์ ภาพละ 3 นิ้ว */}
                      {showTwoCols && (
                        <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: '#F8FAFC', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--slate-200)' }}>
                          <div style={{ textAlign: 'center' }}>
                            {item.twoColumnImageLeft?.url ? (
                              <>
                                <img
                                  src={item.twoColumnImageLeft.url}
                                  alt="ภาพซ้าย"
                                  style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '4px' }}
                                />
                                <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                  {item.twoColumnImageLeft.caption || 'ภาพประกอบ (กว้าง 3 นิ้ว)'}
                                </div>
                              </>
                            ) : (
                              <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem', padding: '1rem' }}>- คอลัมน์ซ้ายว่าง -</div>
                            )}
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            {item.twoColumnImageRight?.url ? (
                              <>
                                <img
                                  src={item.twoColumnImageRight.url}
                                  alt="ภาพขวา"
                                  style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain', borderRadius: '4px' }}
                                />
                                <div style={{ fontSize: '0.75rem', color: 'var(--slate-600)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                                  {item.twoColumnImageRight.caption || 'ภาพประกอบ (กว้าง 3 นิ้ว)'}
                                </div>
                              </>
                            ) : (
                              <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem', padding: '1rem' }}>- คอลัมน์ขวาว่าง -</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 4 Preview */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                  ส่วนที่ 4<br />
                  คณะผู้ดำเนินงาน แนวทางบริหารความเสี่ยง และตารางเปรียบเทียบข้อเสนอ
                </h2>
              </div>
              <p style={{ marginBottom: '1rem' }}>{section4.teamOverview}</p>
              
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>คณะทำงาน ({section4.teamMembers.length} ท่าน)</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--primary-800)', color: 'white' }}>
                    <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ชื่อ - นามสกุล</th>
                    <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>ตำแหน่งที่เสนอ</th>
                    <th style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>วุฒิการศึกษาและใบรับรอง</th>
                  </tr>
                </thead>
                <tbody>
                  {section4.teamMembers.map((m) => (
                    <tr key={m.id}>
                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)', fontWeight: 600 }}>{m.name}</td>
                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>{m.proposedRole}</td>
                      <td style={{ padding: '6px', border: '1px solid var(--slate-300)' }}>{m.education} ({m.certifications})</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>แผนบริหารความเสี่ยง ({section4.riskItems.length} ประเด็น)</h3>
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

              {/* 4.3 ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR */}
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>
                4.3 ตารางเปรียบเทียบข้อเสนอโครงการกับข้อกำหนด TOR (Compliance Matrix)
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

            {/* Section 5 Preview */}
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--primary-800)', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, lineHeight: 1.4 }}>
                  ส่วนที่ 5<br />
                  ประวัติและประสบการณ์ของบริษัทที่เกี่ยวข้อง
                </h2>
              </div>

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

              {/* 5.3.1 ผลงานอ้างอิงหลักตามเกณฑ์ TOR */}
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>
                5.3.1 ผลงานอ้างอิงหลักตามเกณฑ์ TOR (ย้อนหลังไม่เกิน {section5.maxYearsFilter} ปี พ.ศ. {2568 - section5.maxYearsFilter} - 2568)
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

              {/* 5.3.2 ผลงานเสริมที่สอดคล้อง */}
              {section5.pastProjects.some((p) => p.isSelected && p.projectType === 'supplementary') && (
                <>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginTop: '1.25rem', marginBottom: '0.5rem', color: 'var(--primary-900)' }}>
                    5.3.2 ผลงานและประสบการณ์เสริมที่สอดคล้องกับงานจ้างโครงการนี้
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
                </>
              )}
            </div>

            {/* ภาคผนวก ก: สำเนาสัญญาและหนังสือรับรองผลงาน (Appendix Preview) */}
            {section5.pastProjects.some((p) => p.isSelected && p.projectType === 'tor_reference' && !!p.certificateFileUrl) && (
              <div style={{ marginBottom: '2.5rem', borderTop: '2px solid var(--primary-800)', paddingTop: '1.25rem' }}>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-800)', marginBottom: '0.5rem' }}>
                  ภาคผนวก ก: สำเนาสัญญาจ้างและหนังสือรับรองผลงาน (ตามประกาศ TOR)
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginBottom: '1rem' }}>
                  เอกสารหลักฐานสำเนาสัญญาจ้างและหนังสือรับรองผลงานโครงการที่แล้วเสร็จ เพื่อประกอบการพิจารณาคุณสมบัติตามเกณฑ์ TOR
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {section5.pastProjects
                    .filter((p) => p.isSelected && p.projectType === 'tor_reference' && !!p.certificateFileUrl)
                    .map((p, idx) => (
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
            )}
          </div>
        </div>

        <div className="modal-footer">
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
  );
};
