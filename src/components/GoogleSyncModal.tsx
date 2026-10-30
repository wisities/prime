import React, { useState, useEffect } from 'react';
import { BiddingProject } from '../types/proposal';
import {
  syncProposalToGoogle,
  syncMasterLibraryToGoogle,
  fetchProposalFromGoogleSheet,
  checkGoogleSyncHealth,
  GoogleSyncResult,
  GoogleSyncHealth,
  getEffectiveAppsScriptUrl,
} from '../services/googleSyncService';
import { saveMasterProjectsLibrary } from '../services/masterLibraryService';
import { saveProject } from '../services/projectStorageService';
import {
  CloudUpload,
  Download,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  FileSpreadsheet,
  X,
  ExternalLink,
  ShieldCheck,
  FileText,
  Loader2,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';

interface GoogleSyncModalProps {
  isOpen: boolean;
  project: BiddingProject;
  onClose: () => void;
  onProjectUpdated?: (updated: BiddingProject) => void;
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({ isOpen, project, onClose, onProjectUpdated }) => {
  const [health, setHealth] = useState<GoogleSyncHealth | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [syncResult, setSyncResult] = useState<GoogleSyncResult | null>(null);
  const [includeDocx, setIncludeDocx] = useState(false);
  const [syncMasterLibrary, setSyncMasterLibrary] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return getEffectiveAppsScriptUrl();
  });

  useEffect(() => {
    if (isOpen) {
      setIsChecking(true);
      setSyncResult(null);
      setProgressPercent(0);
      checkGoogleSyncHealth()
        .then((h) => {
          setHealth(h);
          setIsChecking(false);
        })
        .catch(() => {
          setIsChecking(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const pastProjectsWithCerts = (project.proposalData?.section5?.pastProjects || []).filter(
    (p) => p.isSelected !== false && !!p.certificateFileUrl
  );
  const pastProjectsWithImages = (project.proposalData?.section5?.pastProjects || []).filter(
    (p) => !!p.projectImageUrl || (p.imageBlocks && p.imageBlocks.length > 0)
  );
  const teamMembersWithPhotos = (project.proposalData?.section4?.teamMembers || []).filter(
    (m) => !!m.photoUrl
  );
  const totalAttachments = (project.attachments || []).length;

  const handlePullLatestFromGoogle = async () => {
    try {
      setIsPulling(true);
      setSyncResult(null);
      const res = await fetchProposalFromGoogleSheet(project.projectCode, project.projectTitle);
      if (res.success) {
        if (res.masterProjects && res.masterProjects.length > 0) {
          saveMasterProjectsLibrary(res.masterProjects);
        }
        if (res.pastProjects && res.pastProjects.length > 0 && project.proposalData) {
          const updatedProj: BiddingProject = {
            ...project,
            ...(res.overview
              ? {
                  clientAgency: res.overview.clientAgency || project.clientAgency,
                  budgetAmount: res.overview.budgetAmount || project.budgetAmount,
                  driveFolderUrl: res.overview.driveFolderUrl || project.driveFolderUrl,
                }
              : {}),
            proposalData: {
              ...project.proposalData,
              section5: {
                ...project.proposalData.section5,
                pastProjects: res.pastProjects,
              },
            },
          };
          saveProject(updatedProj);
          if (onProjectUpdated) {
            onProjectUpdated(updatedProj);
          }
        }
        const totalBlocks = (res.pastProjects || []).reduce((s, p) => s + ((p.imageBlocks || []).length), 0);
        alert(
          `✅ ดึงข้อมูลและไฟล์ล่าสุดจาก Google Sheet & Drive ลงเครื่องสำเร็จ!\n\n• โครงการอ้างอิงในข้อเสนอ: ${(res.pastProjects || []).length} โครงการ (${totalBlocks} บล็อกภาพประกอบ)\n• คลังผลงานกลาง: ${(res.masterProjects || []).length} โครงการ\n\nคุณสามารถแก้ไขเพิ่มเติมในเครื่อง แล้วกดซิงค์เฉพาะข้อมูลที่แก้ไขกลับขึ้นไปได้ทันที`
        );
      } else {
        alert(res.error || 'ไม่สามารถดึงข้อมูลล่าสุดจาก Google Sheet ได้');
      }
    } catch (err: any) {
      alert(err?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setIsPulling(false);
    }
  };

  const handleStartSync = async () => {
    try {
      setIsSyncing(true);
      setSyncResult(null);

      const result = await syncProposalToGoogle(project, {
        generateDocx: includeDocx,
        onProgress: (msg, percent) => {
          setProgressMsg(msg);
          setProgressPercent(syncMasterLibrary ? Math.min(percent, 75) : percent);
        },
      });

      if (result.success && syncMasterLibrary) {
        setProgressMsg('กำลังซิงค์คลังข้อมูลกลาง (ผลงานและบุคลากรกลาง)...');
        setProgressPercent(85);
        try {
          await syncMasterLibraryToGoogle({
            onProgress: (msg) => setProgressMsg(msg),
          });
        } catch (mErr) {
          console.warn('Master library sync warning:', mErr);
        }
      }

      setSyncResult(result);
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err.message || 'การเชื่อมต่อขัดข้อง',
        error: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyFolderUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
          maxWidth: '680px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(147, 197, 253, 0.3)',
              }}
            >
              <CloudUpload size={22} color="#60A5FA" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
                ซิงค์ข้อเสนอทั้งโครงการขึ้น Google Drive & Sheets
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>
                บันทึกฐานข้อมูลลง Google Sheet และจัดเก็บไฟล์สัญญา/TOR ลงโฟลเดอร์ Google Drive
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Project Summary Banner */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #E2E8F0',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
              โครงการที่กำลังดำเนินการ
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
              [{project.projectCode || 'NO-CODE'}] {project.projectTitle}
            </div>
            <div
              style={{
                display: 'flex',
                gap: '1.25rem',
                fontSize: '0.825rem',
                color: '#475569',
                marginTop: '8px',
                flexWrap: 'wrap',
              }}
            >
              <span>
                🏛️ หน่วยงาน: <strong>{project.clientAgency || '-'}</strong>
              </span>
              <span>
                💰 งบประมาณ:{' '}
                <strong>{Number(project.budgetAmount || 0).toLocaleString()} บาท</strong>
              </span>
              <span>
                📁 สัญญาแนบ: <strong>{pastProjectsWithCerts.length} ฉบับ</strong>
              </span>
              <span>
                🖼️ ภาพผลงาน: <strong>{pastProjectsWithImages.length} โครงการ</strong>
              </span>
              <span>
                👤 รูปถ่ายบุคลากร: <strong>{teamMembersWithPhotos.length} ท่าน</strong>
              </span>
              <span>
                📎 เอกสาร TOR: <strong>{totalAttachments} ไฟล์</strong>
              </span>
            </div>
          </div>

          {/* Sync Status / Health Check Notification */}
          {!isChecking && health && !health.configured && !syncResult && (
            <div
              style={{
                backgroundColor: '#FEF3C7',
                border: '1.5px solid #FCD34D',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#92400E' }}>
                    ยังไม่ได้ใส่ Service Account Key ใน Environment Variables
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#B45309', lineHeight: 1.5 }}>
                    ระบบเตรียมโค้ดฝั่ง Backend API ไว้พร้อมแล้ว เพื่อให้สามารถเขียน Google Drive & Sheets ได้
                    กรุณานำค่า Service Account จาก Google Cloud Console มาใส่ในไฟล์ <code>.env</code> หรือ Vercel
                    Environment:
                  </p>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '0.78rem', color: '#92400E' }}>
                    <li>
                      <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code> (อีเมลบัญชีบริการ)
                    </li>
                    <li>
                      <code>GOOGLE_PRIVATE_KEY</code> (Private Key จากไฟล์ JSON)
                    </li>
                    <li>
                      <code>GOOGLE_DRIVE_PARENT_FOLDER_ID</code> (ID โฟลเดอร์ใน Google Drive)
                    </li>
                    <li>
                      <code>GOOGLE_MASTER_SHEET_ID</code> (ID ของ Google Sheet แดชบอร์ด)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* What will be synced Checklist */}
          {!syncResult && !isSyncing && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>
                รายการข้อมูลและเอกสารที่จะถูกซิงค์ขึ้นระบบ Google:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F1F5F9',
                    fontSize: '0.85rem',
                    color: '#334155',
                  }}
                >
                  <HardDrive size={18} color="#2563EB" />
                  <span>
                    <strong>สร้างโฟลเดอร์ Google Drive:</strong> แยกหมวดหมู่ปี พ.ศ. และรหัสโครงการ
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F1F5F9',
                    fontSize: '0.85rem',
                    color: '#334155',
                  }}
                >
                  <FileText size={18} color="#D97706" />
                  <span>
                    <strong>อัปโหลดสำเนาสัญญา & หนังสือรับรอง ({pastProjectsWithCerts.length} ฉบับ):</strong> ลงในโฟลเดอร์ <code>02_สำเนาสัญญาและหนังสือรับรองผลงาน</code>
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F1F5F9',
                    fontSize: '0.85rem',
                    color: '#334155',
                  }}
                >
                  <FileText size={18} color="#8B5CF6" />
                  <span>
                    <strong>อัปโหลดภาพผลงานโครงการ & ภาพกิจกรรม ({pastProjectsWithImages.length} โครงการ):</strong> ลงในโฟลเดอร์ <code>05_ภาพผลงานและกิจกรรมโครงการ</code> พร้อมสูตร <code>=IMAGE(...)</code>
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F1F5F9',
                    fontSize: '0.85rem',
                    color: '#334155',
                  }}
                >
                  <FileText size={18} color="#EC4899" />
                  <span>
                    <strong>อัปโหลดรูปถ่ายบุคลากร ({teamMembersWithPhotos.length} ท่าน):</strong> ลงในโฟลเดอร์ <code>06_รูปถ่ายบุคลากร</code> พร้อมสูตร <code>=IMAGE(...)</code> แสดงรูป 1.5 นิ้ว
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F1F5F9',
                    fontSize: '0.85rem',
                    color: '#334155',
                  }}
                >
                  <FileText size={18} color="#059669" />
                  <span>
                    <strong>สร้างและอัปโหลดเล่มข้อเสนอโครงการ (.docx):</strong> ลงในโฟลเดอร์ <code>03_เล่มข้อเสนอโครงการ</code>
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#F1F5F9',
                    fontSize: '0.85rem',
                    color: '#334155',
                  }}
                >
                  <FileSpreadsheet size={18} color="#15803D" />
                  <span>
                    <strong>บันทึกข้อมูลทั้งเล่มลง Google Sheet:</strong> 5 แท็บ (ภาพรวม, งวดงาน, BOM, สัญญาพร้อมภาพผลงาน, บุคลากรพร้อมรูปถ่าย) พร้อมลิงก์เปิดดูไฟล์ใน Drive
                  </span>
                </div>
              </div>

              {/* Step 1: Pull Latest from Drive & Sheet */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  border: '1.5px solid #6EE7B7',
                  marginTop: '0.85rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#065F46' }}>
                    📥 ดึงข้อมูลและไฟล์ล่าสุดจาก Google Drive & Sheet ลงเครื่อง (Get Latest)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#047857' }}>
                    อัปเดตข้อมูลโครงการและภาพผลงานจากไดรฟ์ลงเครื่อง Local ก่อนแก้ไขเพิ่มเติม
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handlePullLatestFromGoogle}
                  disabled={isPulling || isSyncing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: isPulling || isSyncing ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isPulling ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>{isPulling ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลล่าสุดลงเครื่อง'}</span>
                </button>
              </div>

              {/* Selective DOCX Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid #CBD5E1',
                  cursor: 'pointer',
                  marginTop: '0.65rem',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={includeDocx}
                  onChange={(e) => setIncludeDocx(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
                    📄 สร้างและอัปโหลดไฟล์เล่มข้อเสนอ Word (.docx) ใหม่ขึ้น Drive ด้วย
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    หากเว้นว่างไว้ ระบบจะซิงค์เฉพาะข้อมูลและภาพที่แก้ไขขึ้น Google Sheet & Drive อย่างรวดเร็ว (ใช้เวลา ~2 วินาที)
                  </div>
                </div>
              </label>

              {/* Master Library Sync Option */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid #CBD5E1',
                  cursor: 'pointer',
                  marginTop: '0.65rem',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="checkbox"
                  checked={syncMasterLibrary}
                  onChange={(e) => setSyncMasterLibrary(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563EB' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B' }}>
                    🌐 ซิงค์คลังข้อมูลกลางทั้งหมด (Master Library) เข้าไปด้วย
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    หากต้องการซิงค์เฉพาะโครงการที่แก้ไข ไม่จำเป็นต้องติ๊กช่องนี้ (สามารถซิงค์แยกเฉพาะโครงการได้ในคลังกลาง)
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Sync In Progress */}
          {isSyncing && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <Loader2 size={36} color="#3B82F6" className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1E293B', marginBottom: '4px' }}>
                {progressMsg || 'กำลังประมวลผล...'}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#64748B', marginBottom: '16px' }}>
                โปรดรอสักครู่ ระบบกำลังอัปโหลดไฟล์และอัปเดต Google Sheet
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    backgroundColor: '#3B82F6',
                    borderRadius: '999px',
                    transition: 'width 0.4s ease-in-out',
                  }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                {progressPercent}% เสร็จสิ้น
              </div>
            </div>
          )}

          {/* Sync Result Success */}
          {syncResult && syncResult.success && (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <CheckCircle2 size={28} color="#16A34A" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#166534' }}>
                    ซิงค์ขึ้น Google Drive & Sheets สำเร็จเรียบร้อย!
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803D' }}>
                    อัปโหลดไฟล์สำเร็จทั้งหมด {syncResult.uploadedFilesCount || 0} ไฟล์ พร้อมบันทึกลงชีตเรียบร้อย
                  </p>
                </div>
              </div>

              {/* Action Buttons to Open Google Drive & Sheets */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '1rem' }}>
                {syncResult.driveFolderUrl && (
                  <a
                    href={syncResult.driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '0.75rem',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    <FolderOpen size={16} />
                    <span>เปิดโฟลเดอร์ใน Drive</span>
                    <ExternalLink size={14} />
                  </a>
                )}

                {syncResult.sheetUrl && (
                  <a
                    href={syncResult.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '0.75rem',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                    }}
                  >
                    <FileSpreadsheet size={16} />
                    <span>เปิด Google Sheet</span>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>

              {/* Uploaded Files Details */}
              {syncResult.uploadedFiles && syncResult.uploadedFiles.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #BBF7D0', paddingTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.775rem', fontWeight: 700, color: '#166534', marginBottom: '6px' }}>
                    ไฟล์ที่อัปโหลดและผูกลิงก์ในไดรฟ์แล้ว:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                    {syncResult.uploadedFiles.map((f, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: '#14532D',
                          backgroundColor: 'rgba(255, 255, 255, 0.6)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '380px' }}>
                          📄 {f.name}
                        </span>
                        {f.webViewLink && (
                          <a
                            href={f.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2563EB', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                          >
                            เปิดดู <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync Result Error */}
          {syncResult && !syncResult.success && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <AlertCircle size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#991B1B' }}>
                    เกิดข้อผิดพลาดในการซิงค์ข้อมูล
                  </h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#B91C1C', lineHeight: 1.5 }}>
                    {syncResult.message}
                  </p>
                  {syncResult.error && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '6px 10px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: '#7F1D1D',
                        border: '1px solid #FECACA',
                      }}
                    >
                      {syncResult.error}
                    </div>
                  )}

                  {/* Quota Solution Guide */}
                  {syncResult.error && syncResult.error.includes('storage quota') && (
                    <div
                      style={{
                        marginTop: '1rem',
                        backgroundColor: '#EFF6FF',
                        border: '1.5px solid #93C5FD',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        color: '#1E3A8A',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1E40AF', marginBottom: '4px' }}>
                        💡 วิธีแก้ไขที่ได้ผล 100%: สลับไปใช้ Google Apps Script Web App
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#1E3A8A', lineHeight: 1.6 }}>
                        Google Drive ไม่อนุญาตให้ Service Account ถือครองไฟล์ในไดรฟ์ส่วนตัว (My Drive) แต่ระบบของเราเตรียมไฟล์สคริปต์{' '}
                        <code>google_apps_script_sync.js</code> ที่รันด้วยโควต้าไดรฟ์ของคุณเองไว้ให้แล้ว:
                        <ol style={{ margin: '6px 0 8px 0', paddingLeft: '18px' }}>
                          <li>เปิด Google Sheet ของคุณ แล้วไปที่ <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong></li>
                          <li>คัดลอกโค้ดจากไฟล์ <code>google_apps_script_sync.js</code> ในโปรเจกต์ไปวางแทนที่</li>
                          <li>กด <strong>ทำให้ใช้งานได้ (Deploy) &gt; การทำให้ใช้งานได้รายการใหม่</strong> เลือกเป็น <strong>เว็บแอป (Web app)</strong> (ดำเนินการในฐานะ: "ฉัน", ผู้เข้าถึง: "ทุกคน")</li>
                          <li>นำ <strong>URL ของเว็บแอป</strong> (ลงท้ายด้วย <code>/exec</code>) มาวางในช่องด้านล่างนี้:</li>
                        </ol>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input
                          type="text"
                          placeholder="วาง URL เว็บแอป เช่น https://script.google.com/macros/s/.../exec"
                          value={appsScriptUrl}
                          onChange={(e) => {
                            setAppsScriptUrl(e.target.value);
                            localStorage.setItem('prime_google_apps_script_url', e.target.value.trim());
                          }}
                          style={{
                            flex: 1,
                            padding: '0.45rem 0.65rem',
                            borderRadius: '6px',
                            border: '1px solid #93C5FD',
                            fontSize: '0.8rem',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('prime_google_apps_script_url', appsScriptUrl.trim());
                            handleStartSync();
                          }}
                          disabled={!appsScriptUrl.trim() || isSyncing}
                          style={{
                            padding: '0.45rem 0.85rem',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          บันทึกและซิงค์ใหม่
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            backgroundColor: '#F8FAFC',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
            }}
          >
            {syncResult?.success ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
          </button>

          {!syncResult?.success && (
            <button
              type="button"
              onClick={handleStartSync}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.6rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSyncing ? '#94A3B8' : '#2563EB',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)',
              }}
            >
              {isSyncing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>กำลังซิงค์ข้อมูล...</span>
                </>
              ) : (
                <>
                  <CloudUpload size={16} />
                  <span>เริ่มซิงค์ทั้งโครงการทันที</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
