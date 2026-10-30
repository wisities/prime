import React, { useState, useEffect } from 'react';
import {
  CloudDownload,
  FolderOpen,
  Search,
  Loader2,
  X,
  FileText,
  Calendar,
  Building,
  DollarSign,
  ArrowDownToLine,
  ExternalLink,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  fetchCloudProposalsList,
  fetchFullProposalFromCloud,
  CloudProposalSummary,
} from '../services/googleSyncService';
import { BiddingProject } from '../types/proposal';
import { saveProject, markProposalAsSynced } from '../services/projectStorageService';

interface CloudProposalPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: BiddingProject) => void;
  onCreateNewProject?: () => void;
}

export const CloudProposalPickerModal: React.FC<CloudProposalPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
  onCreateNewProject,
}) => {
  const [proposals, setProposals] = useState<CloudProposalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pullingCode, setPullingCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCloudProposals = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchCloudProposalsList();
      if (res.success && res.proposals) {
        setProposals(res.proposals);
      } else {
        setErrorMessage(res.error || 'ไม่สามารถโหลดรายชื่อโครงการจาก Google Cloud ได้');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCloudProposals();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredProposals = proposals.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.projectCode.toLowerCase().includes(q) ||
      p.projectTitle.toLowerCase().includes(q) ||
      p.clientAgency.toLowerCase().includes(q)
    );
  });

  const handlePullProject = async (summary: CloudProposalSummary) => {
    setPullingCode(summary.projectCode);
    try {
      const res = await fetchFullProposalFromCloud(
        summary.projectCode,
        summary.projectTitle,
        summary.driveFolderUrl
      );

      if (res.success && res.project) {
        await saveProject(res.project);
        markProposalAsSynced(res.project.id);
        onSelectProject(res.project);
        onClose();
      } else if (res.success && res.overview) {
        // Fallback: หากยังไม่มี JSON ตัวเต็ม ให้สร้างโครงร่างจาก Overview
        const fallbackProject: BiddingProject = {
          id: `proj-${Date.now()}`,
          projectCode: summary.projectCode,
          projectTitle: summary.projectTitle,
          clientAgency: summary.clientAgency,
          budgetAmount: summary.budgetAmount,
          status: (summary.status as any) || 'draft',
          driveFolderUrl: summary.driveFolderUrl,
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          proposalData: {
            cover: {
              projectCode: summary.projectCode,
              projectTitle: summary.projectTitle,
              clientAgency: summary.clientAgency,
              budgetAmount: summary.budgetAmount,
            } as any,
            section1: {} as any,
            section2: {} as any,
            section3: {} as any,
            section4: {} as any,
            section5: {
              pastProjects: res.pastProjects || [],
            } as any,
          },
        };
        await saveProject(fallbackProject);
        markProposalAsSynced(fallbackProject.id);
        onSelectProject(fallbackProject);
        onClose();
      } else {
        alert(res.error || 'ไม่สามารถดึงข้อมูลโครงการนี้ได้');
      }
    } catch (err: any) {
      alert(err?.message || 'เกิดข้อผิดพลาดในการดึงโครงการ');
    } finally {
      setPullingCode(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '840px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloudDownload size={22} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
                เลือกดึงเล่มข้อเสนอโครงการจาก Google Cloud
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                เลือกหยิบเฉพาะโครงการเรื่องที่ต้องการทำลงมาทำงานในเซสชันเครื่องนี้ (โครงการอื่นจะไม่ถูกดึงลงมา)
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={loadCloudProposals}
              disabled={loading}
              className="btn btn-outline"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="รีเฟรชรายชื่อโครงการจาก Google Sheet"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> รีเฟรช
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#64748B',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              color="#94A3B8"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="ค้นหาตามรหัสโครงการ, ชื่อเรื่องข้อเสนอ, หรือหน่วยงานผู้ว่าจ้าง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.25rem', fontSize: '0.875rem' }}
            />
          </div>
        </div>

        {/* Content List */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} color="#2563EB" />
              <div style={{ fontWeight: 600 }}>กำลังอ่านรายชื่อข้อเสนอโครงการจาก Google Sheet & Drive...</div>
            </div>
          ) : errorMessage ? (
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
                border: '1px solid #FCA5A5',
                color: '#991B1B',
                textAlign: 'center',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>⚠️ ไม่สามารถอ่านข้อมูลโครงการได้</div>
              <div style={{ fontSize: '0.85rem' }}>{errorMessage}</div>
              <button
                type="button"
                onClick={loadCloudProposals}
                className="btn btn-primary"
                style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '8px',
                border: '1px dashed #CBD5E1',
              }}
            >
              <FileText size={40} color="#94A3B8" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 700, color: '#334155' }}>
                {proposals.length === 0 ? 'ยังไม่พบรายการข้อเสนอโครงการบน Google Cloud' : 'ไม่พบโครงการที่ตรงกับคำค้นหา'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.25rem' }}>
                {proposals.length === 0
                  ? 'คุณสามารถเริ่มสร้างเล่มข้อเสนอใหม่ และกดซิงค์เพื่อบันทึกขึ้น Google Cloud ได้ทันที'
                  : 'ลองค้นหาด้วยคำอื่น หรือกดปุ่มรีเฟรช'}
              </div>
              {onCreateNewProject && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateNewProject();
                  }}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} /> + สร้างเล่มข้อเสนอโครงการใหม่
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredProposals.map((p) => {
                const isPullingThis = pullingCode === p.projectCode;
                return (
                  <div
                    key={p.projectCode}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#FFFFFF',
                      transition: 'all 0.15s ease',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          {p.projectCode || 'NO-CODE'}
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            backgroundColor: p.status === 'submitted' ? '#DCFCE7' : '#FEF3C7',
                            color: p.status === 'submitted' ? '#15803D' : '#B45309',
                          }}
                        >
                          {p.status === 'submitted' ? 'ยื่นข้อเสนอแล้ว' : 'ฉบับร่าง (Draft)'}
                        </span>
                        {p.lastSyncedAt && (
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            ซิงค์ล่าสุด: {p.lastSyncedAt}
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', marginBottom: '4px' }}>
                        {p.projectTitle}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748B' }}>
                        {p.clientAgency && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Building size={13} /> {p.clientAgency}
                          </span>
                        )}
                        {p.budgetAmount > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <DollarSign size={13} /> {(p.budgetAmount || 0).toLocaleString()} บาท
                          </span>
                        )}
                        {p.driveFolderUrl && (
                          <a
                            href={p.driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#2563EB', textDecoration: 'none' }}
                          >
                            <FolderOpen size={13} /> เปิด Drive <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0 }}>
                      <button
                        type="button"
                        disabled={Boolean(pullingCode)}
                        onClick={() => handlePullProject(p)}
                        className="btn btn-primary"
                        style={{
                          fontSize: '0.85rem',
                          padding: '0.5rem 1.15rem',
                          backgroundColor: '#16A34A',
                          borderColor: '#16A34A',
                          color: '#FFFFFF',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {isPullingThis ? (
                          <>
                            <Loader2 size={15} className="animate-spin" /> กำลังดึงไฟล์...
                          </>
                        ) : (
                          <>
                            <ArrowDownToLine size={15} /> 📥 ดึงมาทำงานบนเครื่องนี้
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            💡 ข้อมูลจะถูกโหลดเข้าสู่เซสชันทำงานชั่วคราว เมื่อปิดเบราว์เซอร์ข้อมูลจะถูกเคลียร์เพื่อความสะอาดของเครื่อง
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {onCreateNewProject && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onCreateNewProject();
                }}
                className="btn btn-outline"
                style={{ fontSize: '0.825rem', padding: '0.45rem 1rem' }}
              >
                + สร้างโครงการใหม่
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              style={{ fontSize: '0.825rem', padding: '0.45rem 1rem' }}
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
