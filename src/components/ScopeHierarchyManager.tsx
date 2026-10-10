import React from 'react';
import { TorScopeItem } from '../types/proposal';
import {
  Plus,
  Trash2,
  CornerDownRight,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown,
  ListTree,
} from 'lucide-react';

interface ScopeHierarchyManagerProps {
  items: TorScopeItem[];
  totalMonths?: number;
  onChange: (items: TorScopeItem[]) => void;
}

export const ScopeHierarchyManager: React.FC<ScopeHierarchyManagerProps> = ({
  items,
  onChange,
}) => {
  const handleItemChange = (id: string, field: keyof TorScopeItem, value: any) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleTorTextChange = (id: string, text: string) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, title: text, requirement: text } : item
      )
    );
  };

  // Add top-level main clause (Level 1)
  const handleAddMainClause = () => {
    const nextClauseNum = `ข้อ 4.${items.filter((i) => i.level === 1).length + 1}`;
    const defaultText = 'ระบุรายละเอียดขอบเขตงานตามประกาศจัดจ้าง...';
    const newItem: TorScopeItem = {
      id: `scope-${Date.now()}`,
      clauseNumber: nextClauseNum,
      title: defaultText,
      requirement: defaultText,
      level: 1,
      startMonth: 1,
      startWeek: 1,
      durationDays: 30,
      durationWeeks: 4,
      responsibleRole: 'ผู้จัดการโครงการ / ทีมที่ปรึกษา',
      proposedMethodology: '',
      toolsAndTechnology: '',
      deliverable: '',
    };
    onChange([...items, newItem]);
  };

  // Add sub-clause (Level + 1) right after a specific item
  const handleAddSubClause = (parentIndex: number) => {
    const parent = items[parentIndex];
    if (parent.level >= 5) {
      alert('ระบบรองรับโครงสร้างข้อย่อยสูงสุดที่ระดับ 5 (Level 5) ตามมาตรฐานงานราชการ');
      return;
    }

    const subLevel = parent.level + 1;
    const parentClause = parent.clauseNumber.startsWith('ข้อ')
      ? parent.clauseNumber
      : `ข้อ ${parent.clauseNumber}`;
    const subClauseNum = `${parentClause}.1`;
    const defaultText = `ระบุรายละเอียดข้อย่อยระดับ ${subLevel} ตาม TOR...`;

    const newItem: TorScopeItem = {
      id: `scope-${Date.now()}`,
      clauseNumber: subClauseNum,
      title: defaultText,
      requirement: defaultText,
      level: subLevel,
      startMonth: parent.startMonth,
      startWeek: parent.startWeek,
      durationDays: Math.max(7, Math.round(parent.durationDays / 2)),
      durationWeeks: Math.max(1, Math.round(parent.durationDays / 14)),
      responsibleRole: parent.responsibleRole,
      proposedMethodology: '',
      toolsAndTechnology: '',
      deliverable: '',
    };

    const newItems = [...items];
    newItems.splice(parentIndex + 1, 0, newItem);
    onChange(newItems);
  };

  // Indent (Level + 1 up to 5)
  const handleIndent = (index: number) => {
    if (items[index].level >= 5) return;
    const updated = [...items];
    updated[index] = { ...updated[index], level: updated[index].level + 1 };
    onChange(updated);
  };

  // Outdent (Level - 1 down to 1)
  const handleOutdent = (index: number) => {
    if (items[index].level <= 1) return;
    const updated = [...items];
    updated[index] = { ...updated[index], level: updated[index].level - 1 };
    onChange(updated);
  };

  // Move Up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onChange(updated);
  };

  // Move Down
  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onChange(updated);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('คุณต้องการลบข้อกำหนดขอบเขตงานนี้ใช่หรือไม่?')) {
      onChange(items.filter((item) => item.id !== id));
    }
  };

  const levelBadges = [
    { label: 'Level 1', bg: '#0F2744', color: '#FFFFFF' },
    { label: 'Level 2', bg: '#1E40AF', color: '#FFFFFF' },
    { label: 'Level 3', bg: '#0D9488', color: '#FFFFFF' },
    { label: 'Level 4', bg: '#7C3AED', color: '#FFFFFF' },
    { label: 'Level 5', bg: '#D97706', color: '#FFFFFF' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Controls Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          border: '1px solid var(--slate-200)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <ListTree size={22} color="var(--primary-700)" />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--primary-900)', fontSize: '1rem' }}>
              รายการขอบเขตงานตาม TOR (รองรับข้อหลักและข้อย่อยถึงระดับ 5)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
              รวมทั้งหมด {items.length} ข้อ | กำหนดเลขข้อและรายละเอียดตามประกาศ TOR (กำหนดการทำงานใน Gantt Chart จะตั้งค่าในส่วนที่ 2)
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddMainClause}
          className="btn btn-primary"
        >
          <Plus size={16} />
          เพิ่มข้อหลัก (Level 1)
        </button>
      </div>

      {/* Items Tree List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {items.map((item, index) => {
          const badge = levelBadges[(item.level - 1) % levelBadges.length];
          const indentPixels = (item.level - 1) * 20;

          return (
            <div
              key={item.id}
              style={{
                marginLeft: `${indentPixels}px`,
                border: `1px solid ${item.level === 1 ? 'var(--primary-600)' : 'var(--slate-300)'}`,
                borderRadius: '8px',
                backgroundColor: item.level === 1 ? '#F8FAFC' : '#FFFFFF',
                padding: '0.65rem 0.85rem',
                boxShadow: item.level === 1 ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Level Badge */}
              <span
                style={{
                  backgroundColor: badge.bg,
                  color: badge.color,
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px',
                  whiteSpace: 'nowrap',
                  marginTop: '2px',
                }}
              >
                L{item.level}
              </span>

              {/* Clause Number */}
              <input
                type="text"
                style={{
                  fontWeight: 700,
                  width: '110px',
                  padding: '0.35rem 0.55rem',
                  fontSize: '0.875rem',
                  borderRadius: '5px',
                  border: '1px solid var(--slate-300)',
                  backgroundColor: '#FFFFFF',
                }}
                value={item.clauseNumber}
                onChange={(e) => handleItemChange(item.id, 'clauseNumber', e.target.value)}
                placeholder="ข้อ 4.1"
              />

              {/* TOR Details Text Area directly following the clause number */}
              <textarea
                rows={2}
                style={{
                  fontWeight: item.level === 1 ? 600 : 400,
                  flex: 1,
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.875rem',
                  borderRadius: '5px',
                  border: '1px solid var(--slate-300)',
                  color: item.level === 1 ? 'var(--primary-900)' : 'var(--slate-800)',
                  backgroundColor: '#FFFFFF',
                  resize: 'vertical',
                  minHeight: '40px',
                  lineHeight: '1.45',
                }}
                value={item.requirement || item.title}
                onChange={(e) => handleTorTextChange(item.id, e.target.value)}
                placeholder="รายละเอียดข้อกำหนดตาม TOR..."
              />

              {/* Action Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {/* Add Sub-clause button */}
                {item.level < 5 && (
                  <button
                    type="button"
                    onClick={() => handleAddSubClause(index)}
                    className="btn btn-outline"
                    style={{
                      padding: '0.25rem 0.55rem',
                      fontSize: '0.75rem',
                      color: 'var(--primary-700)',
                      borderColor: 'var(--primary-300)',
                      whiteSpace: 'nowrap',
                    }}
                    title={`เพิ่มข้อย่อยระดับ ${item.level + 1} ใต้ข้อนี้`}
                  >
                    <CornerDownRight size={13} /> +ข้อย่อย L{item.level + 1}
                  </button>
                )}

                {/* Indent / Outdent */}
                <button
                  type="button"
                  onClick={() => handleOutdent(index)}
                  disabled={item.level <= 1}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', opacity: item.level <= 1 ? 0.35 : 1 }}
                  title="เลื่อนขึ้นระดับก่อนหน้า (Outdent)"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleIndent(index)}
                  disabled={item.level >= 5}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', opacity: item.level >= 5 ? 0.35 : 1 }}
                  title="ย่นเข้าระดับย่อย (Indent)"
                >
                  <ChevronRight size={14} />
                </button>

                {/* Move Up / Down */}
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', opacity: index === 0 ? 0.35 : 1 }}
                  title="เลื่อนขึ้น"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === items.length - 1}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.45rem', fontSize: '0.75rem', opacity: index === items.length - 1 ? 0.35 : 1 }}
                  title="เลื่อนลง"
                >
                  <ArrowDown size={14} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteItem(item.id)}
                  className="btn btn-outline"
                  style={{ padding: '0.25rem 0.45rem', color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
                  title="ลบข้อนี้"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
