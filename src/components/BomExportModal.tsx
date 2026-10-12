import React, { useState, useEffect } from 'react';
import { ProposalData } from '../types/proposal';
import { BomItem, MasterBomItem } from '../types/bom';
import {
  BOM_CATEGORIES,
  BOM_UNITS,
  generateInitialBomItems,
  autoAllocateBomBudget,
  calculateCategorySummaries,
  exportBomToExcel,
} from '../services/bomExportService';
import { saveItemToMasterBomLibrary } from '../services/masterLibraryService';
import { MasterBomModal } from './MasterBomModal';
import {
  FileSpreadsheet,
  X,
  Sparkles,
  RotateCcw,
  Plus,
  Trash2,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Info,
  DollarSign,
  Layers,
  Database,
  BookmarkPlus,
} from 'lucide-react';

interface BomExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ProposalData;
}

export const BomExportModal: React.FC<BomExportModalProps> = ({
  isOpen,
  onClose,
  proposal,
}) => {
  const [items, setItems] = useState<BomItem[]>([]);
  const [overheadProfitPct, setOverheadProfitPct] = useState<number>(15);
  const [vatPct, setVatPct] = useState<number>(7);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showMasterBomModal, setShowMasterBomModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const budgetAmount =
    proposal.section1?.budgetAmount || 0;

  // Initialize BOM from scope items whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const initial = generateInitialBomItems(proposal);
      setItems(initial);
    }
  }, [isOpen, proposal]);

  if (!isOpen) return null;

  // Real-time calculations
  const directCost = items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
  const overheadProfit = Math.round(directCost * (overheadProfitPct / 100));
  const preVatTotal = directCost + overheadProfit;
  const vatAmount = Math.round(preVatTotal * (vatPct / 100));
  const grandTotal = preVatTotal + vatAmount;
  const variance = budgetAmount - grandTotal;

  const categorySummaries = calculateCategorySummaries(items);

  // Update item field
  const handleUpdateItem = (id: string, field: keyof BomItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [field]: value };
        if (field === 'quantity' || field === 'unitRate') {
          const qty = field === 'quantity' ? Number(value) || 0 : it.quantity;
          const rate = field === 'unitRate' ? Number(value) || 0 : it.unitRate;
          updated.totalPrice = Math.round(qty * rate);
        }
        return updated;
      })
    );
  };

  // Add custom BOM item
  const handleAddItem = () => {
    const newItem: BomItem = {
      id: `bom-custom-${Date.now()}`,
      clauseNumber: 'เพิ่มเติม',
      title: 'ค่าใช้จ่ายเพิ่มเติม (เช่น ค่าบริการคลาวด์ หรือ Software License)',
      category: 'งานโครงสร้างพื้นฐานและคลาวด์',
      responsibleRole: 'Cloud Engineer / Third-party Service',
      quantity: 1,
      unit: 'ชุด',
      unitRate: 50000,
      totalPrice: 50000,
      deliverable: 'ใบเสร็จและเอกสารสิทธิ์การใช้งาน',
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Remove item
  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Apply items from Master BOM Catalog
  const handleApplyFromMaster = (newItems: BomItem[]) => {
    setItems((prev) => [...prev, ...newItems]);
    showToast(`นำเข้า ${newItems.length} รายการจากคลังข้อมูลกลางเรียบร้อยแล้ว`);
  };

  // Save an item to Master BOM Catalog
  const handleSaveToMaster = (item: BomItem) => {
    const masterItem: MasterBomItem = {
      id: `mbom-custom-${Date.now()}`,
      category: item.category,
      title: item.title,
      responsibleRole: item.responsibleRole,
      unit: item.unit,
      defaultRate: item.unitRate,
      defaultQuantity: item.quantity,
      description: item.notes || '',
      deliverable: item.deliverable || '',
      isStandard: false,
    };
    saveItemToMasterBomLibrary(masterItem);
    showToast(`บันทึก "${item.title}" เข้าสู่คลังข้อมูลกลางแล้ว`);
  };

  // Reset to initial
  const handleReset = () => {
    if (confirm('คุณต้องการรีเซ็ตรายการ BOM กลับเป็นค่าเริ่มต้นจากขอบเขตงานใช่หรือไม่?')) {
      const initial = generateInitialBomItems(proposal);
      setItems(initial);
    }
  };

  // Auto-allocate budget to match TOR target
  const handleAutoAllocate = () => {
    if (budgetAmount <= 0) {
      alert('ไม่พบวงเงินงบประมาณโครงการ (กรุณาระบุวงเงินงบประมาณในส่วนที่ 1 ก่อน)');
      return;
    }
    const allocated = autoAllocateBomBudget(items, budgetAmount, overheadProfitPct, vatPct);
    setItems(allocated);
  };

  // Export to Excel
  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportBomToExcel(proposal, items, overheadProfitPct, vatPct);
    } catch (error) {
      console.error('Export BOM error', error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`เกิดข้อผิดพลาดในการสร้างไฟล์ Excel: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredItems = selectedCategoryFilter === 'all'
    ? items
    : items.filter((it) => it.category === selectedCategoryFilter);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1240px', maxHeight: '95vh', width: '96vw', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            borderBottom: '1px solid #E2E8F0',
            padding: '1.1rem 1.5rem',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F2744', margin: 0 }}>
                ถอดแบบปริมาณงานและราคา (Bill of Materials - BOM Generator)
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748B', margin: '2px 0 0 0' }}>
                แปลงขอบเขตงาน ({items.length} ข้อ) เป็นตารางต้นทุน บุคลากร และส่งออกเป็นไฟล์ Microsoft Excel (.xlsx) ครบ 3 แผ่นงาน
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || items.length === 0}
              className="btn"
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <FileDown size={17} />
              <span>{isExporting ? 'กำลังสร้างไฟล์...' : 'ดาวน์โหลด Excel (.xlsx)'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            padding: '1.25rem 1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            backgroundColor: '#F1F5F9',
          }}
        >
          {/* Top KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
              gap: '0.85rem',
            }}
          >
            {/* TOR Budget */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '1rem',
                borderLeft: '4px solid #3B82F6',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>วงเงินงบประมาณจัดจ้าง (TOR Budget)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1E3A8A', marginTop: '4px' }}>
                {budgetAmount > 0 ? `${budgetAmount.toLocaleString()} บาท` : 'ไม่ระบุวงเงิน'}
              </div>
              <div style={{ fontSize: '0.725rem', color: '#94A3B8', marginTop: '2px' }}>
                {proposal.cover?.projectCode || 'รหัสโครงการ'}
              </div>
            </div>

            {/* Direct Cost */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '1rem',
                borderLeft: '4px solid #0EA5E9',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>ต้นทุนตรงตาม BOM (Direct Cost)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                {directCost.toLocaleString()} บาท
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '2px' }}>
                รวม {items.length} รายการขอบเขตงาน
              </div>
            </div>

            {/* Overhead & Profit */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '1rem',
                borderLeft: '4px solid #F59E0B',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>ค่าบริหาร & กำไร ({overheadProfitPct}%)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#B45309', marginTop: '4px' }}>
                {overheadProfit.toLocaleString()} บาท
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '2px' }}>
                ก่อนภาษี: {preVatTotal.toLocaleString()} บาท
              </div>
            </div>

            {/* VAT 7% */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '1rem',
                borderLeft: '4px solid #8B5CF6',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>ภาษีมูลค่าเพิ่ม (VAT {vatPct}%)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#6D28D9', marginTop: '4px' }}>
                {vatAmount.toLocaleString()} บาท
              </div>
              <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '2px' }}>
                คำนวณจากยอดราคาก่อนภาษี
              </div>
            </div>

            {/* Grand Total */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '1rem',
                borderLeft: `4px solid ${variance >= 0 ? '#10B981' : '#EF4444'}`,
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>ยอดรวมเสนอราคาสุทธิ (Grand Total)</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: variance >= 0 ? '#047857' : '#B91C1C', marginTop: '4px' }}>
                {grandTotal.toLocaleString()} บาท
              </div>
              <div
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  color: variance >= 0 ? '#059669' : '#DC2626',
                  marginTop: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {variance >= 0 ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>อยู่ในกรอบงบประมาณ (คงเหลือ {variance.toLocaleString()} บาท)</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={13} />
                    <span>เกินวงเงินงบประมาณ {Math.abs(variance).toLocaleString()} บาท</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Toast Message */}
          {toastMessage && (
            <div
              style={{
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Controls & Category Filters */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowMasterBomModal(true)}
                className="btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                }}
                title="เลือกรายการค่าใช้จ่ายและอัตรามาตรฐานจากคลังข้อมูลกลาง พร้อมปรับแต่งยอดก่อนนำไปใช้"
              >
                <Database size={15} />
                <span>เลือกจากคลังข้อมูลกลาง (Master Catalog)</span>
              </button>

              <button
                type="button"
                onClick={handleAutoAllocate}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  borderColor: '#FDE68A',
                  fontWeight: 600,
                }}
                title="ปรับสัดส่วน Man-Days และราคาให้ยอดรวมสุทธิตรงตามวงเงินงบประมาณจัดจ้างพอดี"
              >
                <Sparkles size={16} />
                <span>เกลี่ยราคาให้พอดีงบ ({budgetAmount.toLocaleString()} บ.)</span>
              </button>

              <button
                type="button"
                onClick={handleAddItem}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} />
                <span>เพิ่มรายการค่าใช้จ่าย</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="btn btn-outline"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}
                title="รีเซ็ตค่าเริ่มต้นใหม่ทั้งหมดจาก Scope Items"
              >
                <RotateCcw size={15} />
                <span>รีเซ็ต</span>
              </button>
            </div>

            {/* Percentage Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ color: '#475569', fontWeight: 500 }}>กำไร/บริหาร (%):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={overheadProfitPct}
                  onChange={(e) => setOverheadProfitPct(Math.max(0, Number(e.target.value) || 0))}
                  style={{ width: '60px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ color: '#475569', fontWeight: 500 }}>ภาษี VAT (%):</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={vatPct}
                  onChange={(e) => setVatPct(Math.max(0, Number(e.target.value) || 0))}
                  style={{ width: '55px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', textAlign: 'center', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ color: '#475569', fontWeight: 500 }}>กรองหมวด:</label>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                >
                  <option value="all">ทุกหมวดงาน ({items.length})</option>
                  {Array.from(new Set([...BOM_CATEGORIES, ...items.map((it) => it.category)])).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interactive BOM Items Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0F2744', color: '#FFFFFF', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '10px 8px', width: '5%', textAlign: 'center' }}>ลำดับ</th>
                    <th style={{ padding: '10px 8px', width: '9%' }}>ข้อ TOR</th>
                    <th style={{ padding: '10px 8px', width: '28%' }}>รายการขอบเขตงาน</th>
                    <th style={{ padding: '10px 8px', width: '18%' }}>หมวดงาน</th>
                    <th style={{ padding: '10px 8px', width: '14%' }}>ผู้รับผิดชอบหลัก</th>
                    <th style={{ padding: '10px 8px', width: '7%', textAlign: 'center' }}>ปริมาณ</th>
                    <th style={{ padding: '10px 8px', width: '11%' }}>หน่วยนับ</th>
                    <th style={{ padding: '10px 8px', width: '10%', textAlign: 'right' }}>ราคา/หน่วย (บ.)</th>
                    <th style={{ padding: '10px 8px', width: '12%', textAlign: 'right' }}>ราคารวม (บ.)</th>
                    <th style={{ padding: '10px 6px', width: '6%', textAlign: 'center' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                        borderBottom: '1px solid #E2E8F0',
                      }}
                    >
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: '#64748B', fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="text"
                          value={item.clauseNumber}
                          onChange={(e) => handleUpdateItem(item.id, 'clauseNumber', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            fontWeight: 700,
                            color: '#1E3A8A',
                            fontSize: '0.8rem',
                          }}
                        />
                      </td>

                      <td style={{ padding: '8px 6px' }}>
                        <textarea
                          rows={2}
                          value={item.title}
                          onChange={(e) => handleUpdateItem(item.id, 'title', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.8rem',
                            resize: 'vertical',
                          }}
                        />
                      </td>

                      <td style={{ padding: '8px 6px' }}>
                        <select
                          value={item.category}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              const customName = prompt('ระบุชื่อหมวดงานใหม่ที่ต้องการ:');
                              if (customName && customName.trim()) {
                                handleUpdateItem(item.id, 'category', customName.trim());
                              }
                            } else {
                              handleUpdateItem(item.id, 'category', e.target.value);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.75rem',
                          }}
                        >
                          {!BOM_CATEGORIES.includes(item.category as any) && (
                            <option value={item.category}>{item.category} (กำหนดเอง)</option>
                          )}
                          {BOM_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                          <option value="__custom__">+ กำหนดหมวดงานเอง...</option>
                        </select>
                      </td>

                      <td style={{ padding: '8px 6px' }}>
                        <input
                          type="text"
                          value={item.responsibleRole}
                          onChange={(e) => handleUpdateItem(item.id, 'responsibleRole', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.8rem',
                          }}
                        />
                      </td>

                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            textAlign: 'center',
                            fontWeight: 600,
                            fontSize: '0.825rem',
                          }}
                        />
                      </td>

                      <td style={{ padding: '8px 6px' }}>
                        <select
                          value={item.unit}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              const customUnit = prompt('ระบุหน่วยนับใหม่ที่ต้องการ:');
                              if (customUnit && customUnit.trim()) {
                                handleUpdateItem(item.id, 'unit', customUnit.trim());
                              }
                            } else {
                              handleUpdateItem(item.id, 'unit', e.target.value);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.75rem',
                          }}
                        >
                          {!BOM_UNITS.includes(item.unit as any) && (
                            <option value={item.unit}>{item.unit} (กำหนดเอง)</option>
                          )}
                          {BOM_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                          <option value="__custom__">+ กำหนดหน่วยเอง...</option>
                        </select>
                      </td>

                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <input
                          type="number"
                          step="100"
                          value={item.unitRate}
                          onChange={(e) => handleUpdateItem(item.id, 'unitRate', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '4px',
                            borderRadius: '4px',
                            border: '1px solid #CBD5E1',
                            textAlign: 'right',
                            fontWeight: 600,
                            fontSize: '0.825rem',
                          }}
                        />
                      </td>

                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#0F2744' }}>
                        {item.totalPrice.toLocaleString()} บ.
                      </td>

                      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveToMaster(item)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563EB', padding: '2px' }}
                            title="บันทึกรายการนี้เป็นรายการมาตรฐานในคลังข้อมูลกลาง (Master Catalog)"
                          >
                            <BookmarkPlus size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '2px' }}
                            title="ลบรายการนี้"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer Totals */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderTop: '2px solid #CBD5E1',
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ color: '#64748B' }}>
                แสดง <strong>{filteredItems.length}</strong> จากทั้งหมด {items.length} รายการ
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', fontWeight: 600 }}>
                <div>
                  รวมต้นทุนตรง: <span style={{ color: '#0F2744', fontWeight: 700 }}>{directCost.toLocaleString()} บาท</span>
                </div>
                <div>
                  รวมสุทธิ (+กำไร+VAT): <span style={{ color: variance >= 0 ? '#059669' : '#DC2626', fontWeight: 700 }}>{grandTotal.toLocaleString()} บาท</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category Summary Cards */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F2744', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={16} />
              <span>สัดส่วนงบประมาณแยกตามหมวดงาน (Cost Breakdown)</span>
            </h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '0.65rem',
              }}
            >
              {categorySummaries.map((cat) => (
                <div
                  key={cat.category}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E293B' }}>{cat.category}</div>
                    <div style={{ fontSize: '0.725rem', color: '#64748B' }}>{cat.itemCount} รายการ ({cat.percentage}%)</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#0F2744', fontSize: '0.85rem' }}>
                    {cat.totalCost.toLocaleString()} บ.
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            borderTop: '1px solid #E2E8F0',
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={15} />
            <span>ไฟล์ Excel ที่ส่งออกจะประกอบด้วย 3 ชีต: สรุปงบประมาณ, รายละเอียด BOM, และ Rate Card มาตรฐาน</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || items.length === 0}
              className="btn"
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <FileDown size={17} />
              <span>{isExporting ? 'กำลังสร้างไฟล์ Excel...' : 'ส่งออกไฟล์ Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Master BOM Catalog Picker & Management Modal */}
      <MasterBomModal
        isOpen={showMasterBomModal}
        onClose={() => setShowMasterBomModal(false)}
        onApplyItems={handleApplyFromMaster}
      />
    </div>
  );
};
