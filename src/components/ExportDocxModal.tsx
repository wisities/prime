import React, { useState } from 'react';
import { ProposalData, PastProject } from '../types/proposal';
import { generateProposalDocxBlob } from '../services/docxExport';
import { exportAppendixZip, AppendixExportProgress } from '../services/appendixZipService';
import saveAs from 'file-saver';
import {
  FileText,
  Download,
  Archive,
  CheckCircle,
  X,
  FileCheck,
  FolderArchive,
  ExternalLink,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';

interface ExportDocxModalProps {
  isOpen: boolean;
  proposalData: ProposalData;
  onClose: () => void;
}

export const ExportDocxModal: React.FC<ExportDocxModalProps> = ({
  isOpen,
  proposalData,
  onClose,
}) => {
  const [exportChoice, setExportChoice] = useState<'both' | 'docx_only' | 'appendix_zip_only'>('both');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<AppendixExportProgress | null>(null);

  if (!isOpen) return null;

  const allSelectedProjects = (proposalData.section5?.pastProjects || []).filter((p) => p.isSelected);
  const projectsWithCerts = allSelectedProjects.filter((p) => !!p.certificateFileUrl);
  const projectsWithContracts = allSelectedProjects.filter((p) => !!p.contractFileUrl);
  const projectsWithDocs = allSelectedProjects.filter((p) => !!p.certificateFileUrl || !!p.contractFileUrl);

  const handleStartExport = async () => {
    try {
      setIsProcessing(true);
      const projectTitle = proposalData.cover?.projectTitle || 'โครงการ';

      // 1. Export DOCX (if both or docx_only)
      if (exportChoice === 'both' || exportChoice === 'docx_only') {
        setProgress({
          current: 1,
          total: 2,
          projectName: 'เล่มข้อเสนอโครงการ (.docx)',
          statusText: 'กำลังประมวลผลเล่มข้อเสนอ Word และแปลงรูปภาพหนังสือรับรองผลงาน...',
        });

        const { blob: docxBlob, fileName: docxFileName } = await generateProposalDocxBlob(proposalData);
        saveAs(docxBlob, docxFileName);
      }

      // 2. Export Appendix ZIP (if both or appendix_zip_only)
      if (exportChoice === 'both' || exportChoice === 'appendix_zip_only') {
        if (projectsWithDocs.length > 0) {
          await exportAppendixZip(allSelectedProjects, projectTitle, (prog) => {
            setProgress(prog);
          });
        }
      }

      onClose();
    } catch (err) {
      console.error('Export error:', err);
      alert('เกิดข้อผิดพลาดระหว่างสร้างเอกสารส่งออก โปรดตรวจสอบข้อมูลและลองใหม่อีกครั้ง');
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const handleOpenDocPreview = (sourceUrl?: string) => {
    if (!sourceUrl) return;
    try {
      const pureBase64 = sourceUrl.includes(',') ? sourceUrl.split(',')[1] : sourceUrl;
      const isPdf = sourceUrl.startsWith('data:application/pdf') || /\.pdf(\?.*)?$/i.test(sourceUrl);
      const binary = atob(pureBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const mimeType = isPdf ? 'application/pdf' : 'image/png';
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch {
      window.open(sourceUrl, '_blank');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '640px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--primary-900)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileCheck size={22} color="var(--gold-400)" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                ส่งออกเล่มข้อเสนอ & ภาคผนวกสัญญาผลงาน
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-300)', marginTop: '2px' }}>
                แปลงหนังสือรับรองเป็นรูปในเล่ม Word และแยกไฟล์ ZIP รวมสัญญารายโครงการ
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--slate-300)',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Summary Status Banner */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate-800)' }}>
                โครงการอ้างอิงที่เลือกในเล่ม: {allSelectedProjects.length} โครงการ
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.785rem' }}>
              <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                📄 หนังสือรับรอง: {projectsWithCerts.length}
              </span>
              <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                📑 สำเนาสัญญา: {projectsWithContracts.length}
              </span>
            </div>
          </div>

          {/* Progress Banner while processing */}
          {isProcessing && progress && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1.5px solid #60A5FA',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Loader2 size={24} className="animate-spin" color="#2563EB" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF' }}>
                  {progress.statusText}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#3B82F6', marginTop: '2px' }}>
                  {progress.projectName} ({progress.current}/{progress.total})
                </div>
              </div>
            </div>
          )}

          {/* Export Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: `2px solid ${exportChoice === 'both' ? '#2563EB' : 'var(--slate-200)'}`,
                backgroundColor: exportChoice === 'both' ? '#F0F9FF' : '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="exportChoice"
                checked={exportChoice === 'both'}
                onChange={() => setExportChoice('both')}
                style={{ marginTop: '3px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>
                  <FolderArchive size={17} color="#2563EB" />
                  <span>ส่งออกทั้งสองส่วน: เล่ม Word (.docx) + ZIP ภาคผนวกสัญญา (แนะนำ)</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px', lineHeight: 1.45 }}>
                  • <strong>เล่ม Word:</strong> มีรูปภาพหนังสือรับรองผลงานแปะต่อท้ายรายละเอียดของแต่ละโครงการใน Section 5 ทันที<br />
                  • <strong>ZIP ภาคผนวก:</strong> มีไฟล์ PDF แยกรายโครงการ (โครงการละ 1 ไฟล์ นำหนังสือรับรองขึ้นก่อนสำเนาสัญญา)
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: `2px solid ${exportChoice === 'appendix_zip_only' ? '#2563EB' : 'var(--slate-200)'}`,
                backgroundColor: exportChoice === 'appendix_zip_only' ? '#F0F9FF' : '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="exportChoice"
                checked={exportChoice === 'appendix_zip_only'}
                onChange={() => setExportChoice('appendix_zip_only')}
                style={{ marginTop: '3px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>
                  <Archive size={17} color="#0D9488" />
                  <span>ส่งออกเฉพาะ ZIP ภาคผนวก (สัญญาและหนังสือรับรองผลงานรายโครงการ)</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px', lineHeight: 1.45 }}>
                  สร้างไฟล์ ZIP บรรจุไฟล์ PDF แยกรายโครงการ (1 โครงการ = 1 ไฟล์ PDF นำหนังสือรับรองขึ้นก่อนสัญญา) พร้อมสารบัญดัชนี
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                border: `2px solid ${exportChoice === 'docx_only' ? '#2563EB' : 'var(--slate-200)'}`,
                backgroundColor: exportChoice === 'docx_only' ? '#F0F9FF' : '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="exportChoice"
                checked={exportChoice === 'docx_only'}
                onChange={() => setExportChoice('docx_only')}
                style={{ marginTop: '3px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>
                  <Download size={17} color="#475569" />
                  <span>ส่งออกเฉพาะไฟล์ Word (.docx) เล่มข้อเสนอโครงการ</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '3px', lineHeight: 1.45 }}>
                  ดาวน์โหลดเฉพาะไฟล์เล่มข้อเสนอหลัก (.docx) พร้อมภาพหนังสือรับรองผลงานต่อท้ายแต่ละโครงการ
                </div>
              </div>
            </label>
          </div>

          {/* List of Attached Documents */}
          {projectsWithDocs.length > 0 && (
            <div style={{ border: '1px solid var(--slate-200)', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  backgroundColor: 'var(--slate-50)',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.785rem',
                  fontWeight: 600,
                  color: 'var(--slate-700)',
                  borderBottom: '1px solid var(--slate-200)',
                }}
              >
                รายการเอกสารที่จะถูกแพ็กลงใน ZIP ภาคผนวก ({projectsWithDocs.length} โครงการ):
              </div>
              <div style={{ maxHeight: '130px', overflowY: 'auto' }}>
                {projectsWithDocs.map((proj, idx) => (
                  <div
                    key={proj.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.45rem 0.85rem',
                      borderBottom: idx === projectsWithDocs.length - 1 ? 'none' : '1px solid var(--slate-100)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      <span style={{ color: 'var(--slate-500)', fontWeight: 700, width: '20px' }}>
                        {idx + 1}.
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--slate-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        [{proj.projectCode || 'PRJ'}] {proj.projectName}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      {proj.certificateFileUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenDocPreview(proj.certificateFileUrl)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', color: '#166534', borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' }}
                          title="เปิดดูหนังสือรับรองผลงาน"
                        >
                          📄 ใบรับรอง
                        </button>
                      )}
                      {proj.contractFileUrl && (
                        <button
                          type="button"
                          onClick={() => handleOpenDocPreview(proj.contractFileUrl)}
                          className="btn btn-outline"
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', color: '#1E40AF', borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }}
                          title="เปิดดูสำเนาสัญญาจ้าง"
                        >
                          📑 สัญญา
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: 'var(--slate-50)',
            borderTop: '1px solid var(--slate-200)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={14} color="#16A34A" /> จัดวางหนังสือรับรองต่อท้ายโครงการในเล่ม Word อัตโนมัติ
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="btn btn-outline"
              style={{ fontSize: '0.85rem' }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleStartExport}
              disabled={isProcessing}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isProcessing ? (
                <>กำลังส่งออกเอกสาร...</>
              ) : exportChoice === 'both' ? (
                <>
                  <Archive size={16} /> ส่งออกเล่ม Word + ZIP ภาคผนวก
                </>
              ) : exportChoice === 'appendix_zip_only' ? (
                <>
                  <Archive size={16} /> ส่งออก ZIP ภาคผนวก
                </>
              ) : (
                <>
                  <Download size={16} /> ส่งออกไฟล์ Word (.docx)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
