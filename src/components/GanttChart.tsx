import React from 'react';
import { TorScopeItem } from '../types/proposal';
import { Calendar, Clock, User, Layers } from 'lucide-react';

interface GanttChartProps {
  scopeItems: TorScopeItem[];
  totalMonths: number;
  onScopeItemsChange: (items: TorScopeItem[]) => void;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  scopeItems,
  totalMonths,
  onScopeItemsChange,
}) => {
  const totalWeeks = totalMonths * 4;

  const handleFieldChange = (id: string, field: keyof TorScopeItem, value: any) => {
    onScopeItemsChange(
      scopeItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'durationDays') {
            const days = Number(value) || 1;
            updated.durationWeeks = Math.max(1, Math.round(days / 7));
          }
          return updated;
        }
        return item;
      })
    );
  };

  const levelColors = [
    { fill: '#0F2744', border: '#0A1B30' }, // Level 1 Main
    { fill: '#1E40AF', border: '#1E3A8A' }, // Level 2
    { fill: '#0D9488', border: '#0F766E' }, // Level 3
    { fill: '#7C3AED', border: '#6D28D9' }, // Level 4
    { fill: '#D97706', border: '#B45309' }, // Level 5
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Visual Gantt Timeline with Month + 4 Weeks per month */}
      <div
        style={{
          border: '1px solid var(--slate-300)',
          borderRadius: '10px',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Banner */}
        <div
          style={{
            backgroundColor: 'var(--primary-900)',
            color: '#FFFFFF',
            padding: '0.85rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Calendar size={18} color="#F59E0B" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
              แผนภูมิแกนต์รายสัปดาห์ตลอดโครงการ ({totalMonths} เดือน / {totalWeeks} สัปดาห์)
            </span>
            <span
              style={{
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.725rem',
                fontWeight: 600,
              }}
            >
              ตัดหน้าละประมาณ 20 บรรทัด ({Math.ceil(scopeItems.length / 20) || 1} หน้าใน Word)
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--slate-300)' }}>
            * 1 เดือน มี 4 วีค (W1-W4) | ตัดขึ้นหน้าใหม่พร้อมยกหัวตารางทุกๆ ~20 ข้อ
          </span>
        </div>

        {/* Timeline Header Row 1: Months */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `420px repeat(${totalMonths}, 1fr)`,
            backgroundColor: 'var(--primary-800)',
            color: '#FFFFFF',
            fontSize: '0.825rem',
            fontWeight: 600,
            borderBottom: '1px solid var(--primary-700)',
          }}
        >
          <div style={{ padding: '0.5rem 1rem' }}>
            ข้อกำหนดขอบเขตงานตาม TOR (Levels 1 - 5)
          </div>
          {Array.from({ length: totalMonths }, (_, m) => (
            <div
              key={m}
              style={{
                padding: '0.5rem 0.25rem',
                textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              เดือนที่ {m + 1}
            </div>
          ))}
        </div>

        {/* Timeline Header Row 2: Weeks (W1-W4 for each month) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `420px repeat(${totalWeeks}, 1fr)`,
            backgroundColor: 'var(--slate-100)',
            borderBottom: '2px solid var(--slate-300)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          <div style={{ padding: '0.4rem 1rem', color: 'var(--slate-600)' }}>
            กำหนดช่วงเวลา (เริ่มเดือน/วีค - จำนวนวันทำงาน)
          </div>
          {Array.from({ length: totalWeeks }, (_, w) => {
            const weekInMonth = ((w % 4) + 1);
            const isMonthBoundary = w % 4 === 0;
            return (
              <div
                key={w}
                style={{
                  padding: '0.4rem 0.15rem',
                  textAlign: 'center',
                  borderLeft: isMonthBoundary ? '2px solid var(--slate-400)' : '1px solid var(--slate-200)',
                  color: isMonthBoundary ? 'var(--primary-800)' : 'var(--slate-600)',
                  backgroundColor: isMonthBoundary ? 'var(--slate-200)' : 'transparent',
                }}
              >
                W{weekInMonth}
              </div>
            );
          })}
        </div>

        {/* Task Rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {scopeItems.map((item, index) => {
            const isPageBreak = index > 0 && index % 20 === 0;
            const pageNum = Math.floor(index / 20) + 1;
            const totalPages = Math.ceil(scopeItems.length / 20);

            const color = levelColors[(item.level - 1) % levelColors.length];
            const startWeekAbsolute = (item.startMonth - 1) * 4 + (item.startWeek - 1);
            const durationWeeks = Math.max(0.5, item.durationWeeks || Math.max(1, Math.round(item.durationDays / 7)));

            const leftPercent = (Math.max(0, Math.min(totalWeeks, startWeekAbsolute)) / totalWeeks) * 100;
            const widthPercent = (Math.min(totalWeeks - startWeekAbsolute, durationWeeks) / totalWeeks) * 100;

            const isLevel1 = item.level === 1;
            const indent = (item.level - 1) * 16;

            return (
              <React.Fragment key={item.id}>
                {isPageBreak && (
                  <div key={`page-divider-${index}`} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Page Break Banner */}
                    <div
                      style={{
                        backgroundColor: '#0F2744',
                        color: '#FFFFFF',
                        padding: '0.65rem 1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '3px dashed #F59E0B',
                        borderBottom: '1px solid #1E3E62',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span
                          style={{
                            backgroundColor: '#D97706',
                            color: '#FFFFFF',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                          }}
                        >
                          ✂️ ขึ้นหน้าใหม่ในรายงาน Word (แผ่นที่ {pageNum}/{totalPages})
                        </span>
                        <span style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                          ยกไปหน้าถัดไปพร้อมหัวตาราง (ข้อกำหนดลำดับที่ {index + 1} เป็นต้นไป)
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        * ตัดหน้าอัตโนมัติ ~20 บรรทัดต่อหน้า เพื่อความคมชัดในเอกสารแนวนอน
                      </span>
                    </div>

                    {/* Repeated Timeline Header Row 1: Months */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `420px repeat(${totalMonths}, 1fr)`,
                        backgroundColor: 'var(--primary-800)',
                        color: '#FFFFFF',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        borderBottom: '1px solid var(--primary-700)',
                      }}
                    >
                      <div style={{ padding: '0.45rem 1rem' }}>
                        ข้อกำหนดขอบเขตงานตาม TOR (Levels 1 - 5) - ต่อแผ่นที่ {pageNum}
                      </div>
                      {Array.from({ length: totalMonths }, (_, m) => (
                        <div
                          key={m}
                          style={{
                            padding: '0.45rem 0.25rem',
                            textAlign: 'center',
                            borderLeft: '1px solid rgba(255,255,255,0.2)',
                          }}
                        >
                          เดือนที่ {m + 1}
                        </div>
                      ))}
                    </div>

                    {/* Repeated Timeline Header Row 2: Weeks */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `420px repeat(${totalWeeks}, 1fr)`,
                        backgroundColor: 'var(--slate-100)',
                        borderBottom: '2px solid var(--slate-300)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      <div style={{ padding: '0.35rem 1rem', color: 'var(--slate-600)' }}>
                        กำหนดช่วงเวลา (เริ่มเดือน/วีค - จำนวนวันทำงาน)
                      </div>
                      {Array.from({ length: totalWeeks }, (_, w) => {
                        const weekInMonth = (w % 4) + 1;
                        const isMonthBoundary = w % 4 === 0;
                        return (
                          <div
                            key={w}
                            style={{
                              padding: '0.35rem 0.15rem',
                              textAlign: 'center',
                              borderLeft: isMonthBoundary ? '2px solid var(--slate-400)' : '1px solid var(--slate-200)',
                              color: isMonthBoundary ? 'var(--primary-800)' : 'var(--slate-600)',
                              backgroundColor: isMonthBoundary ? 'var(--slate-200)' : 'transparent',
                            }}
                          >
                            W{weekInMonth}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `420px repeat(${totalWeeks}, 1fr)`,
                    borderBottom: '1px solid var(--slate-200)',
                    backgroundColor: isLevel1 ? '#F1F5F9' : index % 2 === 0 ? 'var(--slate-50)' : '#FFFFFF',
                    minHeight: '52px',
                    position: 'relative',
                    alignItems: 'center',
                  }}
                >
                  {/* Task Label Cell */}
                  <div style={{ padding: '0.4rem 0.85rem', paddingLeft: `${14 + indent}px`, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: isLevel1 ? 700 : 500,
                        fontSize: isLevel1 ? '0.875rem' : '0.825rem',
                        color: isLevel1 ? 'var(--primary-900)' : 'var(--slate-900)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={`${item.clauseNumber} ${item.title}`}
                    >
                      <span
                        style={{
                          backgroundColor: color.fill,
                          color: 'white',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          marginRight: '6px',
                        }}
                      >
                        {item.clauseNumber}
                      </span>
                      {item.title}
                    </div>

                    <div
                      style={{
                        fontSize: '0.725rem',
                        color: 'var(--slate-500)',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center',
                        marginTop: '2px',
                      }}
                    >
                      <span>
                        <Clock size={11} style={{ display: 'inline', marginRight: '2px' }} />
                        {item.durationDays} วัน (เริ่ม ด.{item.startMonth} W{item.startWeek})
                      </span>
                      {item.responsibleRole && (
                        <span>
                          <User size={11} style={{ display: 'inline', marginRight: '2px' }} />
                          {item.responsibleRole}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timeline Grid Background Columns */}
                  {Array.from({ length: totalWeeks }, (_, w) => {
                    const isMonthBoundary = w % 4 === 0;
                    return (
                      <div
                        key={w}
                        style={{
                          height: '100%',
                          borderLeft: isMonthBoundary ? '2px solid var(--slate-300)' : '1px solid var(--slate-200)',
                          backgroundColor: isMonthBoundary ? 'rgba(0,0,0,0.015)' : 'transparent',
                        }}
                      />
                    );
                  })}

                  {/* The Gantt Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `calc(420px + (100% - 420px) * ${leftPercent / 100})`,
                      width: `calc(max(18px, (100% - 420px) * ${widthPercent / 100}))`,
                      top: '12px',
                      height: '26px',
                      backgroundColor: color.fill,
                      borderRadius: '5px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 6px',
                      fontSize: '0.725rem',
                      fontWeight: 600,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={`${item.clauseNumber}: เริ่มเดือน ${item.startMonth} สัปดาห์ W${item.startWeek} | ระยะเวลา ${item.durationDays} วัน`}
                  >
                    {item.durationDays} วัน
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Inline Quick Schedule Editor Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--slate-200)',
          borderRadius: '10px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary-900)' }}>
              ตารางกำหนดช่วงเวลาการทำงานตาม TOR แต่ละข้อ
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
              ปรับจำนวนวันทำงานและสัปดาห์เริ่มต้น (W1 - W4) ได้ที่ตารางนี้ ข้อมูลจะอัปเดตแผนภูมิแกนต์และเชื่อมโยงไปยังส่วนที่ 1 และ 3 ทันที
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--slate-100)', color: 'var(--slate-700)', borderBottom: '2px solid var(--slate-300)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '90px' }}>ระดับ</th>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>ข้อกำหนด TOR และหัวข้อ</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '130px' }}>เริ่มเดือนที่</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '140px' }}>เริ่มในวีคไหน (1-4)</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', width: '130px' }}>ทำงานกี่วัน (Days)</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', width: '180px' }}>ผู้รับผิดชอบ</th>
              </tr>
            </thead>
            <tbody>
              {scopeItems.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid var(--slate-200)',
                    backgroundColor: item.level === 1 ? 'var(--slate-50)' : '#FFFFFF',
                  }}
                >
                  <td style={{ padding: '8px 10px' }}>
                    <span
                      style={{
                        backgroundColor: levelColors[(item.level - 1) % levelColors.length].fill,
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      L{item.level}
                    </span>
                  </td>

                  <td style={{ padding: '8px 10px', paddingLeft: `${(item.level - 1) * 16 + 10}px` }}>
                    <div style={{ fontWeight: item.level === 1 ? 700 : 500, color: 'var(--slate-900)' }}>
                      <strong>{item.clauseNumber}</strong> {item.title}
                    </div>
                  </td>

                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <select
                      className="form-select"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.825rem' }}
                      value={item.startMonth}
                      onChange={(e) => handleFieldChange(item.id, 'startMonth', parseInt(e.target.value) || 1)}
                    >
                      {Array.from({ length: totalMonths }, (_, m) => (
                        <option key={m + 1} value={m + 1}>
                          เดือนที่ {m + 1}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <select
                      className="form-select"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--primary-800)' }}
                      value={item.startWeek}
                      onChange={(e) => handleFieldChange(item.id, 'startWeek', parseInt(e.target.value) || 1)}
                    >
                      <option value={1}>สัปดาห์ที่ 1 (W1)</option>
                      <option value={2}>สัปดาห์ที่ 2 (W2)</option>
                      <option value={3}>สัปดาห์ที่ 3 (W3)</option>
                      <option value={4}>สัปดาห์ที่ 4 (W4)</option>
                    </select>
                  </td>

                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      className="form-input"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.825rem', textAlign: 'center', fontWeight: 600 }}
                      value={item.durationDays}
                      onChange={(e) => handleFieldChange(item.id, 'durationDays', parseInt(e.target.value) || 1)}
                    />
                  </td>

                  <td style={{ padding: '8px 10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '0.3rem 0.5rem', fontSize: '0.825rem' }}
                      value={item.responsibleRole}
                      onChange={(e) => handleFieldChange(item.id, 'responsibleRole', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
