import React, { useState, useEffect } from 'react';
import { MasterBomItem, BomItem } from '../types/bom';
import { BOM_CATEGORIES, BOM_UNITS } from '../services/bomExportService';
import {
  getMasterBomLibrary,
  fetchMasterBomLibraryFromCloud,
  saveItemToMasterBomLibrary,
  deleteMasterBomItem,
  resetMasterBomLibrary,
  initMasterLibraryRealtime,
} from '../services/masterLibraryService';
import {
  Database,
  Search,
  Filter,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  BookOpen,
  DollarSign,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  Settings2,
} from 'lucide-react';

interface MasterBomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyItems: (items: BomItem[]) => void;
}

export const MasterBomModal: React.FC<MasterBomModalProps> = ({
  isOpen,
  onClose,
  onApplyItems,
}) => {
  const [catalog, setCatalog] = useState<MasterBomItem[]>(getMasterBomLibrary());
  const [activeTab, setActiveTab] = useState<'select' | 'manage'>('select');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);

  // Selection & In-place Adjustments
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adjustedValues, setAdjustedValues] = useState<
    Record<string, { quantity: number; unit: string; unitRate: number }>
  >({});

  // Management Form State
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newItemCategory, setNewItemCategory] = useState<string>(BOM_CATEGORIES[0]);
  const [newItemTitle, setNewItemTitle] = useState<string>('');
  const [newItemRole, setNewItemRole] = useState<string>('');
  const [newItemUnit, setNewItemUnit] = useState<string>(BOM_UNITS[0]);
  const [newItemRate, setNewItemRate] = useState<number>(5000);
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemDesc, setNewItemDesc] = useState<string>('');
  const [newItemDeliverable, setNewItemDeliverable] = useState<string>('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync and subscription
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingCloud(true);
    fetchMasterBomLibraryFromCloud()
      .then((items) => {
        setCatalog(items);
        // Initialize adjusted values
        const initialAdj: Record<string, { quantity: number; unit: string; unitRate: number }> = {};
        items.forEach((it) => {
          initialAdj[it.id] = {
            quantity: it.defaultQuantity || 1,
            unit: it.unit || 'ชุด',
            unitRate: it.defaultRate || 0,
          };
        });
        setAdjustedValues((prev) => ({ ...initialAdj, ...prev }));
      })
      .finally(() => setIsLoadingCloud(false));

    const unsubscribe = initMasterLibraryRealtime(undefined, undefined, (fresh) => {
      setCatalog(fresh);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Toggle item selection
  const handleToggleSelect = (item: MasterBomItem) => {
    const next = new Set(selectedIds);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      next.add(item.id);
      // Ensure it has values
      if (!adjustedValues[item.id]) {
        setAdjustedValues((prev) => ({
          ...prev,
          [item.id]: {
            quantity: item.defaultQuantity || 1,
            unit: item.unit || 'ชุด',
            unitRate: item.defaultRate || 0,
          },
        }));
      }
    }
    setSelectedIds(next);
  };

  // Adjust item field
  const handleAdjustField = (
    id: string,
    field: 'quantity' | 'unit' | 'unitRate',
    val: any
  ) => {
    setAdjustedValues((prev) => {
      const current = prev[id] || {
        quantity: catalog.find((c) => c.id === id)?.defaultQuantity || 1,
        unit: catalog.find((c) => c.id === id)?.unit || 'ชุด',
        unitRate: catalog.find((c) => c.id === id)?.defaultRate || 0,
      };
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: field === 'unit' ? String(val) : Number(val) || 0,
        },
      };
    });
  };

  // Select all visible / Deselect all
  const handleSelectAllVisible = (itemsToSelect: MasterBomItem[]) => {
    const next = new Set(selectedIds);
    const allSelected = itemsToSelect.every((it) => next.has(it.id));
    if (allSelected) {
      itemsToSelect.forEach((it) => next.delete(it.id));
    } else {
      itemsToSelect.forEach((it) => {
        next.add(it.id);
        if (!adjustedValues[it.id]) {
          setAdjustedValues((prev) => ({
            ...prev,
            [it.id]: {
              quantity: it.defaultQuantity || 1,
              unit: it.unit || 'ชุด',
              unitRate: it.defaultRate || 0,
            },
          }));
        }
      });
    }
    setSelectedIds(next);
  };

  // Filtered catalog
  const filteredCatalog = catalog.filter((it) => {
    const matchCat = selectedCategory === 'all' || it.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      it.title.toLowerCase().includes(q) ||
      (it.responsibleRole && it.responsibleRole.toLowerCase().includes(q)) ||
      (it.description && it.description.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  // Calculate selected count & total
  const selectedItemsList = catalog.filter((it) => selectedIds.has(it.id));
  const totalSelectedPrice = selectedItemsList.reduce((sum, it) => {
    const adj = adjustedValues[it.id] || {
      quantity: it.defaultQuantity || 1,
      unitRate: it.defaultRate || 0,
    };
    return sum + Math.round((adj.quantity || 0) * (adj.unitRate || 0));
  }, 0);

  // Apply selected items into BOM
  const handleApply = () => {
    if (selectedIds.size === 0) {
      alert('กรุณาเลือกรายการที่ต้องการนำเข้าสู่ BOM อย่างน้อย 1 รายการ');
      return;
    }

    const bomItems: BomItem[] = selectedItemsList.map((it) => {
      const adj = adjustedValues[it.id] || {
        quantity: it.defaultQuantity || 1,
        unit: it.unit || 'ชุด',
        unitRate: it.defaultRate || 0,
      };
      const qty = Math.max(0.1, adj.quantity || 1);
      const rate = Math.max(0, adj.unitRate || 0);

      return {
        id: `bom-master-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        clauseNumber: 'คลังกลาง',
        title: it.title,
        category: it.category,
        responsibleRole: it.responsibleRole || 'ผู้เชี่ยวชาญ/ผู้จัดงาน',
        quantity: qty,
        unit: adj.unit || it.unit || 'ชุด',
        unitRate: rate,
        totalPrice: Math.round(qty * rate),
        deliverable: it.deliverable || 'เอกสารผลงานและหลักฐานการส่งมอบ',
        notes: it.description || '',
      };
    });

    onApplyItems(bomItems);
    onClose();
  };

  // Add new item into Master Catalog
  const handleSaveNewMasterItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) {
      alert('กรุณาระบุชื่อรายการ');
      return;
    }

    const newItem: MasterBomItem = {
      id: `mbom-custom-${Date.now()}`,
      category: newItemCategory,
      title: newItemTitle.trim(),
      responsibleRole: newItemRole.trim() || 'ผู้ดำเนินงาน',
      unit: newItemUnit,
      defaultRate: Number(newItemRate) || 0,
      defaultQuantity: Number(newItemQuantity) || 1,
      description: newItemDesc.trim(),
      deliverable: newItemDeliverable.trim(),
      isStandard: false,
    };

    const updated = saveItemToMasterBomLibrary(newItem);
    setCatalog(updated);
    setAdjustedValues((prev) => ({
      ...prev,
      [newItem.id]: {
        quantity: newItem.defaultQuantity,
        unit: newItem.unit,
        unitRate: newItem.defaultRate,
      },
    }));
    setIsAddingNew(false);
    setNewItemTitle('');
    setNewItemRole('');
    setNewItemDesc('');
    setNewItemDeliverable('');
    showToast(`เพิ่ม "${newItem.title}" เข้าสู่คลังข้อมูลกลางเรียบร้อยแล้ว`);
  };

  // Delete item from Master Catalog
  const handleDeleteMasterItem = (id: string, title: string) => {
    if (confirm(`คุณต้องการลบ "${title}" ออกจากคลังข้อมูลกลางใช่หรือไม่?`)) {
      const updated = deleteMasterBomItem(id);
      setCatalog(updated);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showToast(`ลบรายการ "${title}" แล้ว`);
    }
  };

  // Reset defaults
  const handleResetCatalog = () => {
    if (
      confirm(
        'ต้องการคืนค่าคลังรายการและอัตราค่าใช้จ่ายกลางกลับเป็นรายการมาตรฐานเริ่มต้นทั้งหมดใช่หรือไม่?'
      )
    ) {
      const defaults = resetMasterBomLibrary();
      setCatalog(defaults);
      setSelectedIds(new Set());
      showToast('คืนค่าคลังข้อมูลกลางเป็นค่าเริ่มต้นเรียบร้อยแล้ว');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1200px',
          maxHeight: '94vh',
          width: '95vw',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.1rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #BFDBFE',
              }}
            >
              <Database size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F2744', margin: 0 }}>
                  คลังรายการและอัตราค่าใช้จ่ายกลาง (Master Cost & BOM Catalog)
                </h3>
                <span
                  style={{
                    fontSize: '0.72rem',
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #A7F3D0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 600,
                  }}
                >
                  💾 บันทึกในเครื่องปลอดภัย (IndexedDB)
                </span>
              </div>
              <p style={{ fontSize: '0.825rem', color: '#64748B', margin: '2px 0 0 0' }}>
                กำหนดเป็นข้อมูลกลางไว้ล่วงหน้า (บันทึกในเครื่องปลอดภัย ไม่สูญหาย) เลือกนำมาใช้และปรับปรุงปริมาณหรือราคาต่อหน่วยได้ทันที
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* View Tab Switcher */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#E2E8F0',
                padding: '3px',
                borderRadius: '8px',
                gap: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('select')}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'select' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'select' ? '#1D4ED8' : '#475569',
                  boxShadow: activeTab === 'select' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <BookOpen size={14} /> เลือกรายการใช้งาน
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                style={{
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'manage' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'manage' ? '#1D4ED8' : '#475569',
                  boxShadow: activeTab === 'manage' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <Settings2 size={14} /> จัดการคลังกลาง ({catalog.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: '4px',
              }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            style={{
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              padding: '8px 16px',
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Filter Toolbar */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 280px',
              maxWidth: '420px',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94A3B8',
              }}
            />
            <input
              type="text"
              placeholder="ค้นหาตามชื่อรายการ, บทบาท, หรือเนื้อหา..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 32px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>
              หมวดงาน:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '0.85rem',
                color: '#0F2744',
                fontWeight: 500,
                maxWidth: '300px',
              }}
            >
              <option value="all">ทุกหมวดงาน ({catalog.length})</option>
              {Array.from(new Set([...BOM_CATEGORIES, ...catalog.map((c) => c.category)])).map(
                (cat) => {
                  const count = catalog.filter((c) => c.category === cat).length;
                  return (
                    <option key={cat} value={cat}>
                      {cat} ({count})
                    </option>
                  );
                }
              )}
            </select>

            {activeTab === 'select' && filteredCatalog.length > 0 && (
              <button
                type="button"
                onClick={() => handleSelectAllVisible(filteredCatalog)}
                className="btn btn-outline"
                style={{
                  fontSize: '0.8rem',
                  padding: '5px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {filteredCatalog.every((it) => selectedIds.has(it.id)) ? (
                  <>
                    <CheckSquare size={14} color="#2563EB" /> ยกเลิกการเลือกทั้งหมด
                  </>
                ) : (
                  <>
                    <Square size={14} /> เลือกทั้งหมดในหน้านี้ ({filteredCatalog.length})
                  </>
                )}
              </button>
            )}

            {activeTab === 'manage' && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(!isAddingNew)}
                  className="btn"
                  style={{
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.8rem',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> {isAddingNew ? 'ปิดฟอร์ม' : 'เพิ่มรายการกลางใหม่'}
                </button>
                <button
                  type="button"
                  onClick={handleResetCatalog}
                  className="btn btn-outline"
                  style={{
                    fontSize: '0.8rem',
                    padding: '5px 10px',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="คืนค่ารายการมาตรฐานเริ่มต้น"
                >
                  <RotateCcw size={13} /> คืนค่าเริ่มต้น
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Add New Master Item Form (in Manage Tab) */}
          {activeTab === 'manage' && isAddingNew && (
            <form
              onSubmit={handleSaveNewMasterItem}
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid #3B82F6',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1E3A8A', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} /> กำหนดรายการค่าใช้จ่ายกลางใหม่ (Add to Master Library)
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    หมวดงาน *
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    {BOM_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    ชื่องาน / รายการค่าใช้จ่าย *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ค่าเช่าห้องประชุม, ค่าอาหารกลางวัน, ค่าลิขสิทธิ์..."
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    บทบาทที่รับผิดชอบ / ผู้จัดจ้าง
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Event Coordinator, Keynote Speaker, Vendor..."
                    value={newItemRole}
                    onChange={(e) => setNewItemRole(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    หน่วยนับมาตรฐาน
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  >
                    {BOM_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    ราคาต่อหน่วยมาตรฐาน (บาท) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(Number(e.target.value) || 0)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    ปริมาณเริ่มต้น (Default Qty)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(Number(e.target.value) || 1)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    รายละเอียดและขอบเขตงาน
                  </label>
                  <input
                    type="text"
                    placeholder="คำอธิบายรายละเอียดงานเพิ่มเติม..."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
                    หลักฐานการส่งมอบงาน (Deliverable)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ใบเสร็จรับเงิน, ภาพถ่ายการจัดงาน, เล่มคู่มือ..."
                    value={newItemDeliverable}
                    onChange={(e) => setNewItemDeliverable(e.target.value)}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.85rem', padding: '6px 12px' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.85rem',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  บันทึกลงคลังกลาง
                </button>
              </div>
            </form>
          )}

          {/* Catalog Items Table / Grid */}
          {filteredCatalog.length === 0 ? (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '3rem',
                textAlign: 'center',
                color: '#64748B',
                border: '1px dashed #CBD5E1',
              }}
            >
              <AlertCircle size={32} style={{ margin: '0 auto 8px auto', color: '#94A3B8' }} />
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</div>
              <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "คืนค่าเริ่มต้น" ด้านบน
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '2px solid #CBD5E1', color: '#334155' }}>
                      {activeTab === 'select' && (
                        <th style={{ width: '40px', padding: '10px 8px', textAlign: 'center' }}>
                          <CheckSquare size={16} />
                        </th>
                      )}
                      <th style={{ padding: '10px 10px', textAlign: 'left', minWidth: '180px' }}>
                        หมวดงาน
                      </th>
                      <th style={{ padding: '10px 10px', textAlign: 'left', minWidth: '260px' }}>
                        รายการ / บทบาทผู้รับผิดชอบ
                      </th>
                      <th style={{ padding: '10px 6px', textAlign: 'center', width: '90px' }}>
                        {activeTab === 'select' ? 'ปรับจำนวน' : 'จำนวนเริ่มต้น'}
                      </th>
                      <th style={{ padding: '10px 6px', textAlign: 'left', width: '130px' }}>
                        หน่วยนับ
                      </th>
                      <th style={{ padding: '10px 6px', textAlign: 'right', width: '130px' }}>
                        {activeTab === 'select' ? 'ปรับราคา/หน่วย' : 'ราคามาตรฐาน'}
                      </th>
                      <th style={{ padding: '10px 10px', textAlign: 'right', width: '120px' }}>
                        ยอดรวม
                      </th>
                      {activeTab === 'manage' && (
                        <th style={{ padding: '10px 8px', textAlign: 'center', width: '60px' }}>
                          จัดการ
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCatalog.map((it, idx) => {
                      const isSelected = selectedIds.has(it.id);
                      const adj = adjustedValues[it.id] || {
                        quantity: it.defaultQuantity || 1,
                        unit: it.unit || 'ชุด',
                        unitRate: it.defaultRate || 0,
                      };
                      const computedTotal = Math.round((adj.quantity || 0) * (adj.unitRate || 0));

                      return (
                        <tr
                          key={it.id}
                          onClick={() => {
                            if (activeTab === 'select') handleToggleSelect(it);
                          }}
                          style={{
                            borderBottom: '1px solid #E2E8F0',
                            backgroundColor: isSelected
                              ? '#EFF6FF'
                              : idx % 2 === 0
                              ? '#FFFFFF'
                              : '#FAFAFA',
                            cursor: activeTab === 'select' ? 'pointer' : 'default',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          {/* Checkbox */}
                          {activeTab === 'select' && (
                            <td
                              style={{ padding: '8px', textAlign: 'center' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelect(it);
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(it)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </td>
                          )}

                          {/* Category Badge */}
                          <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.725rem',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                backgroundColor: it.category.includes('จัดกิจกรรม')
                                  ? '#FEF3C7'
                                  : it.category.includes('ฝึกอบรม')
                                  ? '#E0E7FF'
                                  : it.category.includes('ประชาสัมพันธ์')
                                  ? '#FCE7F3'
                                  : it.category.includes('วิจัย')
                                  ? '#EDE9FE'
                                  : it.category.includes('ที่ปรึกษา')
                                  ? '#CCFBF1'
                                  : '#F1F5F9',
                                color: it.category.includes('จัดกิจกรรม')
                                  ? '#92400E'
                                  : it.category.includes('ฝึกอบรม')
                                  ? '#3730A3'
                                  : it.category.includes('ประชาสัมพันธ์')
                                  ? '#9D174D'
                                  : it.category.includes('วิจัย')
                                  ? '#5B21B6'
                                  : it.category.includes('ที่ปรึกษา')
                                  ? '#0F766E'
                                  : '#475569',
                              }}
                            >
                              {it.category}
                            </span>
                          </td>

                          {/* Title & Description */}
                          <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 600, color: '#0F2744' }}>
                              {it.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                              <span style={{ fontWeight: 500, color: '#2563EB' }}>
                                [{it.responsibleRole || 'ผู้รับผิดชอบ'}]
                              </span>{' '}
                              {it.description}
                            </div>
                          </td>

                          {/* Quantity (Editable in Select tab) */}
                          <td
                            style={{ padding: '6px 4px', textAlign: 'center' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {activeTab === 'select' ? (
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={adj.quantity}
                                onChange={(e) =>
                                  handleAdjustField(it.id, 'quantity', e.target.value)
                                }
                                style={{
                                  width: '70px',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  border: isSelected ? '2px solid #3B82F6' : '1px solid #CBD5E1',
                                  textAlign: 'center',
                                  fontWeight: 600,
                                  fontSize: '0.825rem',
                                  backgroundColor: '#FFFFFF',
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600 }}>{it.defaultQuantity}</span>
                            )}
                          </td>

                          {/* Unit (Editable in Select tab) */}
                          <td
                            style={{ padding: '6px 4px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {activeTab === 'select' ? (
                              <select
                                value={adj.unit}
                                onChange={(e) =>
                                  handleAdjustField(it.id, 'unit', e.target.value)
                                }
                                style={{
                                  width: '100%',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  border: isSelected ? '2px solid #3B82F6' : '1px solid #CBD5E1',
                                  fontSize: '0.8rem',
                                  backgroundColor: '#FFFFFF',
                                }}
                              >
                                {BOM_UNITS.map((u) => (
                                  <option key={u} value={u}>
                                    {u.split(' (')[0]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ color: '#475569' }}>{it.unit}</span>
                            )}
                          </td>

                          {/* Unit Rate (Editable in Select tab) */}
                          <td
                            style={{ padding: '6px 4px', textAlign: 'right' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {activeTab === 'select' ? (
                              <input
                                type="number"
                                min="0"
                                step="100"
                                value={adj.unitRate}
                                onChange={(e) =>
                                  handleAdjustField(it.id, 'unitRate', e.target.value)
                                }
                                style={{
                                  width: '100px',
                                  padding: '4px 6px',
                                  borderRadius: '4px',
                                  border: isSelected ? '2px solid #3B82F6' : '1px solid #CBD5E1',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  fontSize: '0.825rem',
                                  backgroundColor: '#FFFFFF',
                                }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: '#0F2744' }}>
                                {it.defaultRate.toLocaleString()} บ.
                              </span>
                            )}
                          </td>

                          {/* Computed Total Price */}
                          <td
                            style={{
                              padding: '8px 10px',
                              textAlign: 'right',
                              fontWeight: 700,
                              color: isSelected ? '#1E3A8A' : '#334155',
                            }}
                          >
                            {computedTotal.toLocaleString()} บ.
                          </td>

                          {/* Actions (Manage tab) */}
                          {activeTab === 'manage' && (
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteMasterItem(it.id, it.title)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#EF4444',
                                  padding: '4px',
                                }}
                                title="ลบออกจากคลังกลาง"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Action Bar) */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {activeTab === 'select' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                  เลือกแล้ว: <strong style={{ color: '#1D4ED8', fontSize: '1.1rem' }}>{selectedIds.size}</strong> รายการ
                </div>
                <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                  มูลค่ารวมที่ปรับปรุงแล้ว:{' '}
                  <strong style={{ color: '#16A34A', fontSize: '1.2rem' }}>
                    {totalSelectedPrice.toLocaleString()} บาท
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={selectedIds.size === 0}
                  className="btn"
                  style={{
                    backgroundColor: selectedIds.size > 0 ? '#16A34A' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    padding: '8px 24px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: selectedIds.size > 0 ? 'pointer' : 'not-allowed',
                    boxShadow: selectedIds.size > 0 ? '0 4px 6px -1px rgba(22, 163, 74, 0.3)' : 'none',
                  }}
                >
                  <Plus size={18} />
                  <span>นำรายการที่เลือกเข้าสู่ BOM ({selectedIds.size} รายการ)</span>
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <button
                type="button"
                onClick={() => setActiveTab('select')}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontWeight: 600 }}
              >
                กลับไปเลือกรายการใช้งาน
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
