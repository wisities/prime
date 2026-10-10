import React, { useState, useRef, useEffect } from 'react';
import { TorScopeItem, ProjectAttachment } from '../types/proposal';
import {
  readDocxFile,
  readPdfFile,
  parseTorTextRules,
  readAttachmentContent,
} from '../services/torDocReader';
import {
  getGeminiApiKey,
  saveGeminiApiKey,
  parseTorWithGemini,
} from '../services/geminiService';
import {
  FileUp,
  FileText,
  Sparkles,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Key,
  UploadCloud,
  Paperclip,
  Check,
  Trash2,
  Plus,
} from 'lucide-react';

interface TorImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: TorScopeItem[]) => void;
  attachments?: ProjectAttachment[];
  selectedAttachmentId?: string | null;
}

export const TorImportModal: React.FC<TorImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  attachments = [],
  selectedAttachmentId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<TorScopeItem[]>([]);
  const [sourceMode, setSourceMode] = useState<'project' | 'upload'>('project');
  const [activeDocName, setActiveDocName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter TOR attachments (or fallback to any PDF/DOCX)
  const torAttachments = attachments.filter(
    (a) =>
      a.category === 'tor' ||
      a.name.toLowerCase().includes('tor') ||
      a.name.toLowerCase().includes('ขอบเขต') ||
      a.name.toLowerCase().includes('scope')
  );
  const availableDocs = torAttachments.length > 0 ? torAttachments : attachments;

  // Extract from existing Project Attachment without re-uploading
  const handleExtractFromAttachment = async (att: ProjectAttachment) => {
    setIsLoading(true);
    setErrorMsg(null);
    setActiveDocName(att.name);
    try {
      const text = await readAttachmentContent(att);
      setRawText(text);
      const items = parseTorTextRules(text);
      setParsedItems(items);
      if (items.length === 0) {
        setErrorMsg('อ่านไฟล์สำเร็จ แต่ไม่พบข้อความที่ตรงตามรูปแบบข้อกำหนด TOR มาตรฐาน สามารถลองใช้ปุ่ม AI แยกข้อด้านล่าง');
      }
    } catch (err: any) {
      console.error('Error reading attachment content:', err);
      setErrorMsg(err.message || 'ไม่สามารถอ่านข้อมูลจากไฟล์แนบนี้ได้');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load when modal opens or selectedAttachmentId changes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setRawText('');
      setParsedItems([]);
      setErrorMsg(null);
      setActiveDocName('');
      return;
    }

    setApiKey(getGeminiApiKey());

    if (selectedAttachmentId && availableDocs.length > 0) {
      const target = availableDocs.find((a) => a.id === selectedAttachmentId);
      if (target) {
        setSourceMode('project');
        handleExtractFromAttachment(target);
        return;
      }
    }

    if (availableDocs.length > 0) {
      setSourceMode('project');
      // If exactly 1 TOR attachment exists, automatically read and extract it!
      if (torAttachments.length === 1) {
        handleExtractFromAttachment(torAttachments[0]);
      }
    } else {
      setSourceMode('upload');
    }
  }, [isOpen, selectedAttachmentId]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setActiveDocName(selectedFile.name);
    setErrorMsg(null);
    setIsLoading(true);

    try {
      let text = '';
      if (selectedFile.name.endsWith('.docx')) {
        text = await readDocxFile(selectedFile);
      } else if (selectedFile.name.endsWith('.pdf')) {
        text = await readPdfFile(selectedFile);
      } else {
        text = await selectedFile.text();
      }

      setRawText(text);
      const items = parseTorTextRules(text);
      setParsedItems(items);
    } catch (err: any) {
      console.error('File read error', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบว่าเป็นไฟล์ .docx หรือ .pdf ที่สมบูรณ์');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAiParser = async () => {
    const keyToUse = apiKey.trim() || getGeminiApiKey();
    if (!keyToUse) {
      alert('กรุณากรอก Gemini API Key เพื่อให้ AI ช่วยสกัดโครงสร้างขอบเขตงาน');
      return;
    }
    if (!rawText.trim()) {
      alert('กรุณาเลือกไฟล์ TOR หรือวางข้อความก่อน');
      return;
    }

    saveGeminiApiKey(keyToUse);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const items = await parseTorWithGemini(rawText);
      setParsedItems(items);
    } catch (err: any) {
      console.error('AI parse error', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI');
    } finally {
      setIsLoading(false);
    }
  };

  // แก้ไขข้อมูลของข้อกำหนดที่สกัดได้
  const handleItemFieldChange = (index: number, field: keyof TorScopeItem, value: any) => {
    setParsedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // ลบข้อกำหนดที่ไม่ต้องการออกก่อนนำเข้า
  const handleDeleteParsedItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // เพิ่มข้อกำหนดใหม่ด้วยตนเอง
  const handleAddNewParsedItem = () => {
    const newItem: TorScopeItem = {
      id: `scope-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      clauseNumber: `${parsedItems.length + 1}`,
      title: 'ระบุหัวข้อข้อกำหนดใหม่',
      requirement: 'ระบุรายละเอียดข้อกำหนดตาม TOR...',
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
    setParsedItems((prev) => [...prev, newItem]);
  };

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) {
      alert('ไม่พบรายการขอบเขตงานที่สามารถนำเข้าได้');
      return;
    }
    const cleanItems = parsedItems.map((item, idx) => ({
      ...item,
      id: item.id || `scope-imported-${Date.now()}-${idx}`,
      clauseNumber: item.clauseNumber?.trim() || `${idx + 1}`,
      title: item.title?.trim() || item.clauseNumber || `ข้อกำหนดที่ ${idx + 1}`,
      requirement: item.requirement?.trim() || item.title || '',
    }));

    if (confirm(`ยืนยันการนำเข้าขอบเขตงาน TOR จำนวน ${cleanItems.length} ข้อ? (จะนำไปแทนที่รายการเดิมและเชื่อมโยงสู่ Gantt Chart และส่วนที่ 3 อัตโนมัติ)`)) {
      onImport(cleanItems);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '920px', maxHeight: '92vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileUp size={22} color="var(--primary-700)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--primary-900)' }}>
                ระบบนำเข้าและอ่านเอกสาร TOR (Word & PDF Importer)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                สกัดขอบเขตงานระดับ 1-5 เข้าสู่ข้อเสนอโครงการอัตโนมัติ โดยใช้ไฟล์ที่แนบไว้แล้วในโครงการได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--slate-400)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Source Mode Toggle if project has attachments */}
          {availableDocs.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#F1F5F9', padding: '0.35rem', borderRadius: '8px' }}>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '0.5rem 0.85rem',
                  backgroundColor: sourceMode === 'project' ? '#FFFFFF' : 'transparent',
                  color: sourceMode === 'project' ? 'var(--primary-900)' : 'var(--slate-600)',
                  boxShadow: sourceMode === 'project' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  borderRadius: '6px',
                }}
                onClick={() => setSourceMode('project')}
              >
                <Paperclip size={15} /> 📑 เอกสาร TOR ในโครงการนี้ ({availableDocs.length} ไฟล์ที่แนบไว้)
              </button>
              <button
                type="button"
                className="btn"
                style={{
                  flex: 1,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  padding: '0.5rem 0.85rem',
                  backgroundColor: sourceMode === 'upload' ? '#FFFFFF' : 'transparent',
                  color: sourceMode === 'upload' ? 'var(--primary-900)' : 'var(--slate-600)',
                  boxShadow: sourceMode === 'upload' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  border: 'none',
                  borderRadius: '6px',
                }}
                onClick={() => setSourceMode('upload')}
              >
                <UploadCloud size={15} /> 📂 อัปโหลดไฟล์ใหม่จากคอมพิวเตอร์
              </button>
            </div>
          )}

          {/* Mode 1: Select from existing project attachments */}
          {sourceMode === 'project' && availableDocs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-700)' }}>
                เลือกไฟล์ TOR ที่แนบไว้แล้วเพื่อสกัดขอบเขตงาน (ไม่ต้องอัปโหลดซ้ำ):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {availableDocs.map((att) => {
                  const isActive = activeDocName === att.name;
                  return (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                        border: `1.5px solid ${isActive ? '#3B82F6' : '#E2E8F0'}`,
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            backgroundColor: att.category === 'tor' ? '#2563EB' : '#059669',
                            color: '#FFFFFF',
                            flexShrink: 0,
                          }}
                        >
                          {att.category === 'tor' ? '📘 TOR' : '📄 ประกาศ'}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--slate-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {att.name}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--slate-400)', flexShrink: 0 }}>
                          ({(att.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.4rem 0.85rem',
                          backgroundColor: isActive ? '#1D4ED8' : 'var(--primary-700)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          flexShrink: 0,
                        }}
                        disabled={isLoading}
                        onClick={() => handleExtractFromAttachment(att)}
                      >
                        {isLoading && isActive ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : isActive ? (
                          <Check size={13} />
                        ) : (
                          <Sparkles size={13} />
                        )}
                        {isLoading && isActive ? 'กำลังอ่าน...' : isActive ? 'สกัดข้อกำหนดแล้ว' : '⚡ สกัดขอบเขตงานจากไฟล์นี้'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 2: Manual File Upload Zone */}
          {sourceMode === 'upload' && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept=".docx,.pdf,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--slate-300)',
                  borderRadius: '10px',
                  padding: '1.75rem 1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--slate-50)',
                  transition: 'background-color 0.15s, border-color 0.15s',
                }}
              >
                <UploadCloud size={34} color="var(--primary-600)" style={{ margin: '0 auto 0.4rem' }} />
                <div style={{ fontWeight: 600, color: 'var(--primary-900)', fontSize: '0.95rem' }}>
                  {file ? `ไฟล์ที่เลือก: ${file.name}` : 'คลิกเพื่อเลือกไฟล์เอกสาร TOR ใหม่ (.docx หรือ .pdf)'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                  ระบบอ่านข้อความขอบเขตงานโดยตรงในเบราว์เซอร์ ปลอดภัย ไม่ส่งเอกสารขึ้นเซิร์ฟเวอร์ภายนอก
                </div>
              </div>
            </>
          )}

          {errorMsg && (
            <div
              style={{
                backgroundColor: 'var(--danger-bg)',
                color: 'var(--danger)',
                padding: '0.75rem 1rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {/* AI Parsing Option Banner */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: '#1E40AF', fontSize: '0.9rem' }}>
                <Sparkles size={16} color="#3B82F6" />
                ใช้ AI สกัดขอบเขตงานและจัดระดับข้อหลัก-ข้อย่อย (Google Gemini)
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                * ช่วยคัดกรองเฉพาะหัวข้อขอบเขตงานและตัดส่วนที่ไม่เกี่ยวข้องออก
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Key size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                  placeholder="ระบุ Gemini API Key (หรือบันทึกไว้ที่ปุ่ม AI Gemini ด้านบน)..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleRunAiParser}
                disabled={isLoading || !rawText}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isLoading ? 'กำลังวิเคราะห์ด้วย Gemini...' : 'เริ่ม AI แยกข้อ TOR (Gemini)'}
              </button>
            </div>
          </div>

          {/* Parsed Items Preview & Editor */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--primary-900)', fontSize: '0.95rem' }}>
                  ผลการสกัดขอบเขตงาน ({parsedItems.length} ข้อ) {activeDocName && <span style={{ color: '#2563EB', fontSize: '0.825rem' }}>- จากไฟล์: {activeDocName}</span>}
                </span>
                <div style={{ fontSize: '0.78rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  ✏️ สามารถแก้ไขเลขข้อ, ชื่อหัวข้อ และข้อความรายละเอียดในแต่ละช่องได้โดยตรงก่อนนำเข้าสู่ระบบ
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleAddNewParsedItem}
                  className="btn btn-outline"
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={13} /> เพิ่มข้อใหม่
                </button>
              </div>
            </div>

            <div
              style={{
                maxHeight: '380px',
                overflowY: 'auto',
                border: '1px solid var(--slate-200)',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                backgroundColor: '#F8FAFC',
              }}
            >
              {parsedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--slate-400)', fontSize: '0.9rem' }}>
                  {availableDocs.length > 0
                    ? 'กรุณาคลิก "⚡ สกัดขอบเขตงานจากไฟล์นี้" บนรายการเอกสารด้านบน'
                    : 'ยังไม่มีข้อมูล กรุณาอัปโหลดไฟล์ Word หรือ PDF'}
                </div>
              ) : (
                parsedItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      padding: '0.65rem 0.75rem',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      border: '1px solid var(--slate-200)',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      marginLeft: `${Math.min((item.level - 1) * 14, 42)}px`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    {/* Top Row: Level + Clause Number + Title + Delete Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <select
                        value={item.level}
                        onChange={(e) => handleItemFieldChange(idx, 'level', parseInt(e.target.value) || 1)}
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.22rem 0.45rem',
                          borderRadius: '4px',
                          border: '1px solid var(--primary-300)',
                          backgroundColor: 'var(--primary-50)',
                          color: 'var(--primary-800)',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="เลือกระดับชั้น (L1-L5)"
                      >
                        <option value={1}>L1 (ข้อหลัก)</option>
                        <option value={2}>L2 (ข้อย่อย 1)</option>
                        <option value={3}>L3 (ข้อย่อย 2)</option>
                        <option value={4}>L4 (ข้อย่อย 3)</option>
                        <option value={5}>L5 (ข้อย่อย 4)</option>
                      </select>

                      <input
                        type="text"
                        value={item.clauseNumber}
                        onChange={(e) => handleItemFieldChange(idx, 'clauseNumber', e.target.value)}
                        placeholder="เลขข้อ เช่น 1.1"
                        style={{
                          width: '100px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          color: 'var(--primary-900)',
                          border: '1px solid var(--slate-300)',
                          borderRadius: '4px',
                          backgroundColor: '#F8FAFC',
                          flexShrink: 0,
                        }}
                        title="เลขข้อกำหนด"
                      />

                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleItemFieldChange(idx, 'title', e.target.value)}
                        placeholder="ชื่อหัวข้อข้อกำหนด..."
                        style={{
                          flex: 1,
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          border: '1px solid var(--slate-300)',
                          borderRadius: '4px',
                        }}
                        title="ชื่อหัวข้อข้อกำหนด"
                      />

                      <button
                        type="button"
                        onClick={() => handleDeleteParsedItem(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '0.3rem',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0.8,
                        }}
                        title="ลบข้อนี้ออก"
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Bottom Row: Editable Requirement text */}
                    <div>
                      <textarea
                        value={item.requirement}
                        onChange={(e) => handleItemFieldChange(idx, 'requirement', e.target.value)}
                        placeholder="รายละเอียดข้อกำหนดตาม TOR (แก้ไข/ปรับปรุงข้อความในช่องนี้ได้โดยตรง)..."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '0.4rem 0.6rem',
                          fontSize: '0.825rem',
                          color: 'var(--slate-800)',
                          border: '1px solid var(--slate-200)',
                          borderRadius: '4px',
                          fontFamily: 'inherit',
                          lineHeight: '1.45',
                          resize: 'vertical',
                          minHeight: '48px',
                          boxSizing: 'border-box',
                          backgroundColor: '#FFFFFF',
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-outline">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedItems.length === 0}
            className="btn btn-primary"
          >
            <CheckCircle size={16} />
            นำเข้าสู่ระบบ ({parsedItems.length} ข้อ)
          </button>
        </div>
      </div>
    </div>
  );
};
