import React from 'react';
import { Section2WorkPlan, Milestone, TorScopeItem } from '../types/proposal';
import { GanttChart } from './GanttChart';
import { Plus, Trash2, CalendarRange, CheckCircle2, AlertCircle } from 'lucide-react';

interface Section2EditorProps {
  section2: Section2WorkPlan;
  scopeItems: TorScopeItem[];
  totalDurationMonths: number;
  totalBudget: number;
  onChangeSection2: (section2: Section2WorkPlan) => void;
  onChangeScopeItems: (items: TorScopeItem[]) => void;
}

export const Section2Editor: React.FC<Section2EditorProps> = ({
  section2,
  scopeItems,
  totalDurationMonths,
  totalBudget,
  onChangeSection2,
  onChangeScopeItems,
}) => {
  const handleOverviewChange = (text: string) => {
    onChangeSection2({ ...section2, workPlanOverview: text });
  };

  const handleMilestoneChange = (id: string, field: keyof Milestone, value: any) => {
    const updated = section2.milestones.map((m) => {
      if (m.id === id) {
        const item = { ...m, [field]: value };
        if (field === 'percentage') {
          item.amount = (totalBudget * (Number(value) || 0)) / 100;
        }
        return item;
      }
      return m;
    });
    onChangeSection2({ ...section2, milestones: updated });
  };

  const handleAddMilestone = () => {
    const nextInstallment = section2.milestones.length + 1;
    const newMilestone: Milestone = {
      id: `milestone-${Date.now()}`,
      installment: nextInstallment,
      title: `งวดที่ ${nextInstallment}: ส่งมอบงานส่วนที่ ${nextInstallment}`,
      percentage: 20,
      amount: (totalBudget * 20) / 100,
      timeframe: 'ภายในกำหนดตามสัญญา',
      deliverables: ['รายงานความก้าวหน้าและผลการดำเนินงาน'],
    };
    onChangeSection2({ ...section2, milestones: [...section2.milestones, newMilestone] });
  };

  const handleDeleteMilestone = (id: string) => {
    onChangeSection2({ ...section2, milestones: section2.milestones.filter((m) => m.id !== id) });
  };

  const handleDeliverableItemChange = (milestoneId: string, itemIdx: number, val: string) => {
    const updated = section2.milestones.map((m) => {
      if (m.id === milestoneId) {
        const delivs = [...m.deliverables];
        delivs[itemIdx] = val;
        return { ...m, deliverables: delivs };
      }
      return m;
    });
    onChangeSection2({ ...section2, milestones: updated });
  };

  const handleAddDeliverableItem = (milestoneId: string) => {
    const updated = section2.milestones.map((m) => {
      if (m.id === milestoneId) {
        return { ...m, deliverables: [...m.deliverables, 'เอกสารหรือผลงานที่ส่งมอบข้อใหม่'] };
      }
      return m;
    });
    onChangeSection2({ ...section2, milestones: updated });
  };

  const handleDeleteDeliverableItem = (milestoneId: string, itemIdx: number) => {
    const updated = section2.milestones.map((m) => {
      if (m.id === milestoneId) {
        return { ...m, deliverables: m.deliverables.filter((_, idx) => idx !== itemIdx) };
      }
      return m;
    });
    onChangeSection2({ ...section2, milestones: updated });
  };

  const totalPercentage = section2.milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
  const totalMilestoneAmount = section2.milestones.reduce((sum, m) => sum + (m.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Work Plan Overview & Gantt Chart */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2>
              <CalendarRange size={20} color="var(--primary-700)" />
              ส่วนที่ 2: แผนการดำเนินงานตลอดโครงการ (Gantt Chart ตามขอบเขตงาน TOR)
            </h2>
            <p>
              แสดงแผนภูมิแกนต์ตามข้อกำหนด TOR ทุกข้อที่ระบุไว้ในส่วนที่ 1 พร้อมกำหนดเริ่มในวีคไหน (1-4) และระยะเวลาทำงานกี่วัน
            </p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            คำอธิบายแผนการดำเนินงานและระเบียบวิธีบริหารโครงการ (Overview)
          </label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '80px' }}
            value={section2.workPlanOverview}
            onChange={(e) => handleOverviewChange(e.target.value)}
          />
        </div>

        {/* Gantt Chart Component */}
        <div style={{ marginTop: '1.25rem' }}>
          <GanttChart
            scopeItems={scopeItems}
            totalMonths={totalDurationMonths}
            onScopeItemsChange={onChangeScopeItems}
          />
        </div>
      </div>

      {/* Milestones / Installments Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2 style={{ fontSize: '1.1rem' }}>
              แผนการส่งมอบงานและการเบิกจ่ายเงิน (Milestones & Deliverables)
            </h2>
            <p>แจกแจงงวดงาน อัตราส่วนร้อยละ จำนวนเงิน และเอกสารผลส่งมอบแต่ละงวด</p>
          </div>

          <button
            type="button"
            onClick={handleAddMilestone}
            className="btn btn-outline"
            style={{ borderColor: 'var(--primary-600)', color: 'var(--primary-700)' }}
          >
            <Plus size={16} /> เพิ่มงวดงาน
          </button>
        </div>

        {/* Milestone Summary Status Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: totalPercentage === 100 ? 'var(--success-bg)' : 'var(--warning-bg)',
            border: `1px solid ${totalPercentage === 100 ? '#86EFAC' : '#FDE68A'}`,
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {totalPercentage === 100 ? (
              <CheckCircle2 size={20} color="var(--success)" />
            ) : (
              <AlertCircle size={20} color="var(--warning)" />
            )}
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              ยอดรวมร้อยละงวดงาน: {totalPercentage}% (งบประมาณรวม {totalMilestoneAmount.toLocaleString()} บาท)
            </span>
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--slate-600)' }}>
            {totalPercentage === 100 ? 'ยอดรวมครบ 100% ถูกต้อง' : 'ควรปรับอัตราส่วนให้รวมได้ 100%'}
          </span>
        </div>

        {/* Milestones List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {section2.milestones.map((m) => (
            <div
              key={m.id}
              style={{
                border: '1px solid var(--slate-200)',
                borderRadius: '8px',
                padding: '1.15rem',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      backgroundColor: 'var(--primary-800)',
                      color: 'white',
                      fontWeight: 600,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  >
                    งวดที่ {m.installment}
                  </span>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontWeight: 600, width: '380px' }}
                    value={m.title}
                    onChange={(e) => handleMilestoneChange(m.id, 'title', e.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteMilestone(m.id)}
                  className="btn btn-outline"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.35rem 0.55rem' }}
                >
                  <Trash2 size={14} /> ลบงวด
                </button>
              </div>

              <div className="grid-3" style={{ marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">ระยะเวลาส่งมอบ</label>
                  <input
                    type="text"
                    className="form-input"
                    value={m.timeframe}
                    onChange={(e) => handleMilestoneChange(m.id, 'timeframe', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">อัตราส่วนร้อยละ (%)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={m.percentage}
                    onChange={(e) => handleMilestoneChange(m.id, 'percentage', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="form-label">จำนวนเงิน (บาท)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={m.amount}
                    onChange={(e) => handleMilestoneChange(m.id, 'amount', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Deliverables sub-list */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>
                    เอกสารและสิ่งส่งมอบในงวดนี้
                  </label>
                  <button
                    type="button"
                    onClick={() => handleAddDeliverableItem(m.id)}
                    className="btn btn-outline"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    <Plus size={12} /> เพิ่มสิ่งส่งมอบ
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {m.deliverables.map((d, dIdx) => (
                    <div key={dIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>•</span>
                      <input
                        type="text"
                        className="form-input"
                        value={d}
                        onChange={(e) => handleDeliverableItemChange(m.id, dIdx, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteDeliverableItem(m.id, dIdx)}
                        className="btn btn-outline"
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)', padding: '0.35rem' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
