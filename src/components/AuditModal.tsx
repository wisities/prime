import React, { useState, useEffect } from 'react';
import { ProposalData, AuditIssue } from '../types/proposal';
import { runRuleBasedAudit, runGeminiDeepAudit } from '../services/proposalAuditor';
import { ShieldCheck, AlertTriangle, AlertCircle, Info, Sparkles, RefreshCw, Key } from 'lucide-react';

interface AuditModalProps {
  data: ProposalData;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ data, isOpen, onClose }) => {
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Run instant offline rule-based audit
      const ruleIssues = runRuleBasedAudit(data);
      setIssues(ruleIssues);
      setAiError(null);
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const handleRunAiAudit = async () => {
    if (!apiKey.trim()) {
      alert('กรุณากรอก Gemini API Key เพื่อเปิดใช้งาน AI ตรวจสอบภาษาและความสอดคล้องเชิงลึก');
      return;
    }

    setIsLoadingAi(true);
    setAiError(null);
    try {
      const aiIssues = await runGeminiDeepAudit(data, apiKey.trim());
      // Merge with rule issues
      const ruleIssues = runRuleBasedAudit(data);
      setIssues([...ruleIssues, ...aiIssues]);
    } catch (err: any) {
      setAiError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Gemini API');
    } finally {
      setIsLoadingAi(false);
    }
  };

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const infoCount = issues.filter((i) => i.severity === 'info').length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldCheck size={22} color="var(--primary-700)" />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--primary-900)' }}>
                ตรวจสอบความสอดคล้องและการสะกดคำ (Consistency & Spelling Auditor)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                ตรวจสอบความสมบูรณ์ของ TOR, ความสอดคล้องของตัวเลขและเวลา, และคำผิดตามแบบแผนราชการ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--slate-400)' }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Status Counter Bar */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              backgroundColor: 'var(--slate-50)',
              padding: '0.85rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--slate-200)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem' }}>
              <AlertCircle size={18} />
              ข้อผิดพลาดเร่งด่วน ({errorCount})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold-600)', fontWeight: 600, fontSize: '0.9rem' }}>
              <AlertTriangle size={18} />
              ข้อควรระวัง/ไม่สอดคล้อง ({warningCount})
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-600)', fontWeight: 600, fontSize: '0.9rem' }}>
              <Info size={18} />
              คำผิด/ข้อเสนอแนะภาษา ({infoCount})
            </div>
          </div>

          {/* AI Deep Scan Panel (Optional) */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#1E40AF', fontSize: '0.9rem' }}>
                <Sparkles size={16} color="#3B82F6" />
                AI ตรวจคำผิดและความสอดคล้องเชิงลึก (Google Gemini)
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                * ระบบตรวจสอบกฎอัตโนมัติทำงานให้แล้ว สามารถกดเรียก Gemini เพื่อสแกนภาษาไทยขั้นสูงเพิ่มเติมได้
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Key size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '11px' }} />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
                  placeholder="ระบุ Gemini API Key (หากต้องการวิเคราะห์เชิงลึกด้วย AI)"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleRunAiAudit}
                disabled={isLoadingAi}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                {isLoadingAi ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {isLoadingAi ? 'กำลังวิเคราะห์...' : 'เริ่ม AI Deep Scan'}
              </button>
            </div>

            {aiError && (
              <div style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>
                {aiError}
              </div>
            )}
          </div>

          {/* Issues List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {issues.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '3rem 1rem',
                  color: 'var(--success)',
                  backgroundColor: 'var(--success-bg)',
                  borderRadius: '8px',
                }}
              >
                <ShieldCheck size={48} style={{ margin: '0 auto 0.5rem' }} />
                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  ไม่พบข้อผิดพลาดหรือจุดไม่สอดคล้องในข้อเสนอโครงการ!
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)', marginTop: '0.25rem' }}>
                  เอกสารมีความสอดคล้องของระยะเวลา ตัวเลขงวดงาน ขอบเขตงาน TOR และการสะกดคำในระดับดีมาก พร้อมสำหรับนำเสนอ
                </div>
              </div>
            ) : (
              issues.map((item) => {
                let badgeClass = 'pill-primary';
                let icon = <Info size={14} />;
                let borderColor = 'var(--primary-300)';

                if (item.severity === 'error') {
                  badgeClass = 'pill-danger';
                  icon = <AlertCircle size={14} />;
                  borderColor = '#FCA5A5';
                } else if (item.severity === 'warning') {
                  badgeClass = 'pill-warning';
                  icon = <AlertTriangle size={14} />;
                  borderColor = '#FCD34D';
                }

                return (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`pill ${badgeClass}`}>{icon} {item.section}</span>
                        <span style={{ fontWeight: 600, color: 'var(--slate-900)', fontSize: '0.9rem' }}>
                          {item.message}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--slate-600)', paddingLeft: '0.25rem' }}>
                      {item.detail}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-outline">
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
