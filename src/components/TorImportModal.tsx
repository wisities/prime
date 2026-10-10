import React, { useState, useRef } from 'react';
import { TorScopeItem } from '../types/proposal';
import { readDocxFile, readPdfFile, parseTorTextRules, parseTorTextWithGemini } from '../services/torDocReader';
import { FileUp, FileText, Sparkles, CheckCircle, AlertCircle, X, RefreshCw, Key, UploadCloud } from 'lucide-react';

interface TorImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: TorScopeItem[]) => void;
}

export const TorImportModal: React.FC<TorImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<TorScopeItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrorMsg(null);
    setIsLoading(true);

    try {
      let text = '';
      if (selectedFile.name.endsWith('.docx')) {
        text = await readDocxFile(selectedFile);
      } else if (selectedFile.name.endsWith('.pdf')) {
        text = await readPdfFile(selectedFile);
      } else {
        // Plain text fallback
        text = await selectedFile.text();
      }

      setRawText(text);

      // Auto-run rule parser initially
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
    if (!apiKey.trim()) {
      alert('กรุณากรอก Gemini API Key เพื่อให้ AI ช่วยสกัดโครงสร้างขอบเขตงาน');
      return;
    }
    if (!rawText.trim()) {
      alert('กรุณาอัปโหลดไฟล์ Word/PDF หรือวางข้อความ TOR ก่อน');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const items = await parseTorTextWithGemini(rawText, apiKey.trim());
      setParsedItems(items);
    } catch (err: any) {
      console.error('AI parse error', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์ด้วย AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) {
      alert('ไม่พบรายการขอบเขตงานที่สามารถนำเข้าได้');
      return;
    }
    if (confirm(`ยืนยันการนำเข้าขอบเขตงาน TOR จำนวน ${parsedItems.length} ข้อ? (จะนำไปแทนที่รายการเดิมและเชื่อมโยงสู่ Gantt Chart และส่วนที่ 3 อัตโนมัติ)`)) {
      onImport(parsedItems);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '92vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileUp size={22} color="var(--primary-700)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--primary-900)' }}>
                ระบบนำเข้าและอ่านเอกสาร TOR (Word & PDF Importer)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                อัปโหลดไฟล์ TOR (.docx หรือ .pdf) เพื่อสกัดขอบเขตงานระดับ 1-5 เข้าสู่ระบบอัตโนมัติ
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

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* File Upload Zone */}
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
              padding: '2rem 1.5rem',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: 'var(--slate-50)',
              transition: 'background-color 0.15s, border-color 0.15s',
            }}
          >
            <UploadCloud size={38} color="var(--primary-600)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: 600, color: 'var(--primary-900)', fontSize: '0.95rem' }}>
              {file ? `ไฟล์ที่เลือก: ${file.name}` : 'คลิกเพื่อเลือกไฟล์เอกสาร TOR (Microsoft Word .docx หรือ PDF)'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
              ระบบอ่านข้อความขอบเขตงานโดยตรงในเบราว์เซอร์ ปลอดภัย ไม่ส่งเอกสารขึ้นเซิร์ฟเวอร์ภายนอก
            </div>
          </div>

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
                  placeholder="ระบุ Gemini API Key สำหรับให้ AI สกัดโครงสร้างขอบเขตงาน..."
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
                {isLoading ? 'กำลังประมวลผล...' : 'เริ่ม AI แยกข้อ TOR'}
              </button>
            </div>
          </div>

          {/* Parsed Items Preview */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary-900)', fontSize: '0.95rem' }}>
                ผลการสกัดขอบเขตงาน ({parsedItems.length} ข้อ)
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                ตรวจสอบและแก้ไขเพิ่มเติมในระบบได้หลังจากนำเข้า
              </span>
            </div>

            <div
              style={{
                maxHeight: '260px',
                overflowY: 'auto',
                border: '1px solid var(--slate-200)',
                borderRadius: '8px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                backgroundColor: '#FFFFFF',
              }}
            >
              {parsedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--slate-400)', fontSize: '0.9rem' }}>
                  ยังไม่มีข้อมูล กรุณาอัปโหลดไฟล์ Word หรือ PDF
                </div>
              ) : (
                parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      paddingLeft: `${(item.level - 1) * 16}px`,
                      borderBottom: '1px solid var(--slate-100)',
                      paddingBottom: '0.4rem',
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: 'var(--primary-100)',
                        color: 'var(--primary-800)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '3px',
                        marginRight: '6px',
                      }}
                    >
                      L{item.level}
                    </span>
                    <strong style={{ color: 'var(--primary-900)', marginRight: '6px' }}>{item.clauseNumber}</strong>
                    <span style={{ fontWeight: 500 }}>{item.title}</span>
                    <div style={{ fontSize: '0.775rem', color: 'var(--slate-500)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.requirement}
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
