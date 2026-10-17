import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Key,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  X,
  Zap,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  getGeminiApiKey,
  saveGeminiApiKey,
  clearGeminiApiKey,
  testGeminiConnection,
} from '../services/geminiService';

interface GeminiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: (hasKey: boolean) => void;
}

export const GeminiSettingsModal: React.FC<GeminiSettingsModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    saveGeminiApiKey(trimmed);
    if (onKeyUpdated) {
      onKeyUpdated(trimmed.length > 0);
    }
    setTestResult({
      success: true,
      message: 'บันทึก Gemini API Key เรียบร้อยแล้ว',
    });
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleClear = () => {
    clearGeminiApiKey();
    setApiKey('');
    setTestResult(null);
    if (onKeyUpdated) {
      onKeyUpdated(false);
    }
  };

  const handleTest = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setTestResult({
        success: false,
        message: 'กรุณากรอก API Key ก่อนทำการทดสอบ',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const res = await testGeminiConnection(trimmed);
    setIsTesting(false);
    setTestResult({
      success: res.success,
      message: res.message,
    });

    if (res.success) {
      // Auto save if successfully tested
      saveGeminiApiKey(trimmed);
      if (onKeyUpdated) {
        onKeyUpdated(true);
      }
    }
  };

  return (
    <div className="modal-overlay modal-backdrop">
      <div
        className="modal-container"
        style={{ maxWidth: '580px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
            color: '#FFFFFF',
            padding: '1.25rem 1.5rem',
            borderBottom: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} color="#FBBF24" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#FFFFFF' }}>
                ตั้งค่า Google Gemini AI
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#CBD5E1' }}>
                ยกระดับการวิเคราะห์เอกสาร TOR และช่วยเขียนข้อเสนอด้วย Gemini 2.5 Flash
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            style={{ color: '#FFFFFF' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Info Banner */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '0.9rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              fontSize: '0.85rem',
              color: '#334155',
            }}
          >
            <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>ความปลอดภัยสูงสุด (Client-side Encrypted Storage):</strong>
              <div style={{ marginTop: '2px', color: '#64748B' }}>
                API Key ของคุณจะถูกเก็บไว้เฉพาะในเบราว์เซอร์ของเครื่องนี้เท่านั้น ไม่มีการส่งไปเก็บไว้ที่ฐานข้อมูลอื่น และจะส่งคำขอไปยัง Google Gemini อย่างปลอดภัย
              </div>
            </div>
          </div>

          {/* Key Input Field */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={15} color="#4F46E5" /> Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.8rem',
                  color: '#4F46E5',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 500,
                }}
              >
                ขอรับ API Key ฟรีที่ Google AI Studio <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="วาง API Key เช่น AIzaSy..."
                style={{
                  width: '100%',
                  padding: '0.65rem 4.5rem 0.65rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.9rem',
                  fontFamily: 'monospace',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'ซ่อน' : 'แสดง'}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              style={{
                backgroundColor: testResult.success ? '#ECFDF5' : '#FEF2F2',
                border: `1px solid ${testResult.success ? '#A7F3D0' : '#FECACA'}`,
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '0.85rem',
                color: testResult.success ? '#065F46' : '#991B1B',
              }}
            >
              {testResult.success ? (
                <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              ) : (
                <XCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
              )}
              <div>{testResult.message}</div>
            </div>
          )}

          {/* AI Features Guide */}
          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '0.85rem',
              backgroundColor: '#FAFAFA',
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              ฟังก์ชัน AI ที่เปิดใช้งานได้ทันทีหลังเชื่อมต่อ:
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#64748B', lineHeight: '1.6' }}>
              <li><strong>วิเคราะห์ TOR เชิงลึก</strong>: แปลงข้อย่อยและข้อกำหนดเป็นแผนงานและสิ่งที่ต้องส่งมอบ</li>
              <li><strong>ช่วยร่างเนื้อหาส่วนที่ 1</strong>: สรุปความเป็นมา วัตถุประสงค์ และประโยชน์ที่คาดว่าจะได้รับ</li>
              <li><strong>ช่วยร่างระเบียบวิธีส่วนที่ 2</strong>: วางกระบวนการดำเนินงาน (Methodology) ตามมาตรฐานราชการ</li>
              <li><strong>วิเคราะห์ความเสี่ยงส่วนที่ 4</strong>: ประเมินความเสี่ยงและมาตรการป้องกันเชิงรุก</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="btn btn-outline"
                style={{
                  color: '#DC2626',
                  borderColor: '#FCA5A5',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.825rem',
                }}
              >
                <Trash2 size={14} /> ลบ Key
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !apiKey.trim()}
              className="btn btn-outline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
              }}
            >
              {isTesting ? <Loader2 size={15} className="spinner" /> : <Zap size={15} color="#D97706" />}
              {isTesting ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem',
              }}
            >
              <CheckCircle2 size={15} /> บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
