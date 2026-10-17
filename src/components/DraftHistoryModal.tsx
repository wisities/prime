import React, { useState, useEffect } from 'react';
import { History, RotateCcw, X, Clock, Calendar, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DraftBackupSnapshot, getDraftSnapshots } from '../services/localDatabase';
import { ProposalData } from '../types/proposal';

interface DraftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
  onRestoreDraft: (proposalData: ProposalData, snapshotTime: string) => void;
}

export const DraftHistoryModal: React.FC<DraftHistoryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectTitle,
  onRestoreDraft,
}) => {
  const [snapshots, setSnapshots] = useState<DraftBackupSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    setLoading(true);
    getDraftSnapshots(projectId)
      .then((data) => {
        setSnapshots(data);
        if (data.length > 0) setSelectedSnapshotId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);

  const handleRestore = (snapshot: DraftBackupSnapshot) => {
    if (
      window.confirm(
        `คุณต้องการกู้คืนเนื้อหาร่างจากประวัติ "${snapshot.savedTimeFormatted}" ใช่หรือไม่?\nเนื้อหาปัจจุบันในหน้าจอจะถูกแทนที่ด้วยข้อมูลฉบับนี้`
      )
    ) {
      onRestoreDraft(snapshot.proposalData, snapshot.savedTimeFormatted);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '780px',
          width: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '14px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.1rem 1.5rem',
            borderBottom: '1px solid var(--slate-200)',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
              }}
            >
              <History size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F2744', margin: 0 }}>
                ประวัติการบันทึกร่าง & กู้คืนข้อมูล (Draft Snapshots)
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                โครงการ: {projectTitle || projectId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Security & Integrity Banner */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#EFF6FF',
            borderBottom: '1px solid #BFDBFE',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.825rem',
            color: '#1E40AF',
          }}
        >
          <ShieldCheck size={18} color="#2563EB" style={{ flexShrink: 0 }} />
          <span>
            ระบบจัดเก็บประวัติสำเนาของโครงการลงในฐานข้อมูลเครื่อง (IndexedDB) อัตโนมัติทุกครั้งที่กดบันทึก
            ช่วยป้องกันการสูญหายของข้อมูลได้ 100%
          </span>
        </div>

        {/* Content Body */}
        <div style={{ display: 'flex', flex: 1, minHeight: '320px', maxHeight: '55vh', overflow: 'hidden' }}>
          {/* Left: Snapshot List */}
          <div
            style={{
              width: '320px',
              borderRight: '1px solid var(--slate-200)',
              overflowY: 'auto',
              backgroundColor: '#FAFAFA',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                กำลังโหลดประวัติ...
              </div>
            ) : snapshots.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                <Clock size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                ยังไม่มีประวัติการบันทึกย้อนหลังสำหรับโครงการนี้
                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#64748B' }}>
                  ประวัติจะถูกบันทึกอัตโนมัติเมื่อกด "บันทึกร่าง"
                </div>
              </div>
            ) : (
              snapshots.map((s, idx) => {
                const isSelected = s.id === selectedSnapshotId;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSnapshotId(s.id)}
                    style={{
                      padding: '0.75rem 0.85rem',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #D97706' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#FFFBEB' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: idx === 0 ? '#DCFCE7' : '#F1F5F9',
                          color: idx === 0 ? '#15803D' : '#475569',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                        }}
                      >
                        {idx === 0 ? '✓ ล่าสุด' : `#${snapshots.length - idx}`}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                        {s.triggerType === 'manual' ? 'บันทึกด้วยมือ' : 'อัตโนมัติ'}
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1E293B', marginTop: '4px' }}>
                      {s.savedTimeFormatted}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Snapshot Detail & Restore Action */}
          <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', backgroundColor: '#FFFFFF' }}>
            {selectedSnapshot ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#D97706', fontWeight: 600 }}>
                    รายละเอียดสำเนาร่าง
                  </div>
                  <h3 style={{ fontSize: '1rem', color: '#0F2744', marginTop: '4px' }}>
                    บันทึกเมื่อ: {selectedSnapshot.savedTimeFormatted}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                    รหัสโครงการ: {selectedSnapshot.projectCode || '-'} | ชื่อ:{' '}
                    {selectedSnapshot.proposalData?.cover?.projectTitle || selectedSnapshot.projectTitle}
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.8rem',
                    color: '#334155',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#0F2744' }}>สรุปข้อมูลในฉบับนี้:</div>
                  <div>
                    • <strong>ชื่อโครงการ:</strong>{' '}
                    {selectedSnapshot.proposalData?.cover?.projectTitle || '-'}
                  </div>
                  <div>
                    • <strong>หน่วยงาน:</strong>{' '}
                    {selectedSnapshot.proposalData?.cover?.clientAgency || '-'}
                  </div>
                  <div>
                    • <strong>งบประมาณ:</strong>{' '}
                    {selectedSnapshot.proposalData?.section1?.budgetAmount
                      ? `${selectedSnapshot.proposalData.section1.budgetAmount.toLocaleString()} บาท`
                      : '-'}
                  </div>
                  <div>
                    • <strong>ข้อกำหนด TOR:</strong>{' '}
                    {selectedSnapshot.proposalData?.section1?.scopeItems?.length || 0} ข้อ
                  </div>
                  <div>
                    • <strong>แผนงานย่อย (Gantt):</strong>{' '}
                    {selectedSnapshot.proposalData?.section2?.milestones?.length || 0} งวด/กิจกรรม
                  </div>
                  <div>
                    • <strong>บุคลากรในทีม:</strong>{' '}
                    {selectedSnapshot.proposalData?.section4?.teamMembers?.length || 0} ท่าน
                  </div>
                  <div>
                    • <strong>ผลงานอ้างอิง:</strong>{' '}
                    {selectedSnapshot.proposalData?.section5?.pastProjects?.length || 0} โครงการ
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => handleRestore(selectedSnapshot)}
                    className="btn btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0.6rem 1.25rem',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    <RotateCcw size={16} />
                    <span>กู้คืนข้อมูลจากร่างนี้ทันที</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94A3B8' }}>
                เลือกรายการสำเนาทางด้านซ้ายเพื่อดูรายละเอียดและกู้คืน
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '0.85rem 1.5rem',
            borderTop: '1px solid var(--slate-200)',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
            💡 คำแนะนำ: คุณยังสามารถใช้ปุ่ม "สำรอง JSON" ที่เมนูด้านบนเพื่อดาวน์โหลดเก็บไว้ในเครื่องได้ตลอดเวลา
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.825rem' }}
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
