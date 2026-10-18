import React, { useState } from 'react';
import { ProposalData, PastProject } from '../types/proposal';
import { generateProposalDocxBlob } from '../services/docxExport';
import { exportProposalWithAnnexZip } from '../services/projectPackageService';
import saveAs from 'file-saver';
import {
  FileText,
  Download,
  Archive,
  CheckCircle,
  X,
  FileCheck,
  FolderArchive,
  AlertCircle,
  ExternalLink,
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
  const [includeAnnex, setIncludeAnnex] = useState(true);
  const [exportMode, setExportMode] = useState<'zip' | 'separate' | 'docx_only'>('zip');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const projectsWithCerts = (proposalData.section5?.pastProjects || []).filter(
    (p) => p.isSelected && !!p.certificateFileUrl
  );

  const handleStartExport = async () => {
    try {
      setIsProcessing(true);

      // 1. Generate DOCX blob
      const { blob: docxBlob, fileName: docxFileName } = await generateProposalDocxBlob(proposalData);

      if (!includeAnnex || projectsWithCerts.length === 0 || exportMode === 'docx_only') {
        // Mode: Download Word only
        saveAs(docxBlob, docxFileName);
      } else if (exportMode === 'zip') {
        // Mode: Package into ZIP with Annex Folder
        await exportProposalWithAnnexZip(docxBlob, docxFileName, proposalData);
      } else if (exportMode === 'separate') {
        // Mode: Download Word + Download each certificate file
        saveAs(docxBlob, docxFileName);

        projectsWithCerts.forEach((proj, idx) => {
          if (!proj.certificateFileUrl) return;
          try {
            const isPdf =
              proj.certificateFileUrl.startsWith('data:application/pdf') ||
              (proj.certificateFileName || '').toLowerCase().endsWith('.pdf');
            const ext = isPdf ? 'pdf' : 'png';
            const rawName = proj.certificateFileName || `สำเนาสัญญา_${proj.projectName || `ลำดับ_${idx + 1}`}`;
            const cleanName = rawName.replace(/[/\\?%*:|"<>]/g, '_');
            const fileName = cleanName.endsWith(`.${ext}`) ? cleanName : `${cleanName}.${ext}`;

            // Convert Base64 dataURL to Blob
            const pureBase64 = proj.certificateFileUrl.includes(',')
              ? proj.certificateFileUrl.split(',')[1]
              : proj.certificateFileUrl;
            const binary = atob(pureBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            const mimeType = isPdf ? 'application/pdf' : 'image/png';
            const certBlob = new Blob([bytes], { type: mimeType });

            setTimeout(() => {
              saveAs(certBlob, `ภาคผนวก_ก_${idx + 1}_${fileName}`);
            }, 300 * (idx + 1));
          } catch (e) {
            console.error('Failed to download certificate', e);
          }
        });
      }

      onClose();
    } catch (err) {
      console.error('Export error', err);
      alert('เกิดข้อผิดพลาดระหว่างสร้างเอกสารส่งออก โปรดตรวจสอบข้อมูลและลองใหม่อีกครั้ง');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCertPreview = (proj: PastProject) => {
    if (!proj.certificateFileUrl) return;
    try {
      const pureBase64 = proj.certificateFileUrl.includes(',')
        ? proj.certificateFileUrl.split(',')[1]
        : proj.certificateFileUrl;
      const isPdf =
        proj.certificateFileUrl.startsWith('data:application/pdf') ||
        (proj.certificateFileName || '').toLowerCase().endsWith('.pdf');
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
      window.open(proj.certificateFileUrl, '_blank');
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
          maxWidth: '620px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
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
                ตัวเลือกการส่งออกเล่มข้อเสนอโครงการ
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--slate-300)', marginTop: '2px' }}>
                กำหนดการรวมไฟล์แนบภาคผนวกสำเนาสัญญาและหนังสือรับรองผลงาน
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
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Annex Discovery Banner */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              gap: '0.85rem',
              alignItems: 'flex-start',
            }}
          >
            <div
              style={{
                backgroundColor: '#1D4ED8',
                color: '#FFFFFF',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#1E3A8A', fontSize: '0.95rem' }}>
                ตรวจพบไฟล์สำเนาสัญญา / หนังสือรับรองผลงาน {projectsWithCerts.length} รายการ
              </div>
              <div style={{ fontSize: '0.825rem', color: '#3B82F6', marginTop: '3px', lineHeight: 1.5 }}>
                โครงการที่คุณเลือกไว้ในส่วนที่ 5 มีเอกสารสัญญาและใบรับรองผลงานแนบไว้ในเครื่อง ระบบสามารถส่งมอบพร้อมตัวเล่มข้อเสนอได้ทันที
              </div>
            </div>
          </div>

          {/* List of Attached Files */}
          <div style={{ border: '1px solid var(--slate-200)', borderRadius: '8px', overflow: 'hidden' }}>
            <div
              style={{
                backgroundColor: 'var(--slate-50)',
                padding: '0.5rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--slate-700)',
                borderBottom: '1px solid var(--slate-200)',
              }}
            >
              รายการเอกสารหลักฐานในภาคผนวก ก:
            </div>
            <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
              {projectsWithCerts.map((proj, idx) => {
                const isPdf =
                  (proj.certificateFileUrl || '').startsWith('data:application/pdf') ||
                  (proj.certificateFileName || '').toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={proj.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.85rem',
                      borderBottom: idx === projectsWithCerts.length - 1 ? 'none' : '1px solid var(--slate-100)',
                      fontSize: '0.825rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          backgroundColor: isPdf ? '#FEE2E2' : '#EFF6FF',
                          color: isPdf ? '#DC2626' : '#2563EB',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        {isPdf ? 'PDF' : 'IMAGE'}
                      </span>
                      <span style={{ fontWeight: 500, color: 'var(--slate-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {proj.certificateFileName || proj.projectName}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenCertPreview(proj)}
                      className="btn btn-outline"
                      style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="เปิดดูเอกสาร"
                    >
                      <ExternalLink size={12} /> ดูไฟล์
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Option Selector: Include or Exclude Annex */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem',
                borderRadius: '8px',
                border: `2px solid ${includeAnnex ? 'var(--primary-700)' : 'var(--slate-200)'}`,
                backgroundColor: includeAnnex ? '#F8FAFC' : '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="includeAnnexChoice"
                checked={includeAnnex}
                onChange={() => setIncludeAnnex(true)}
                style={{ marginTop: '3px' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--primary-900)', fontSize: '0.9rem' }}>
                  รวมไฟล์แนบภาคผนวกสำเนาสัญญาและหนังสือรับรองผลงานไปด้วย (แนะนำ)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  แนบเอกสารหลักฐานคุณสมบัติเพื่อประกอบการพิจารณาจัดซื้อจัดจ้างตามข้อกำหนด TOR
                </div>

                {/* Sub-modes for including annex */}
                {includeAnnex && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--slate-200)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="exportSubMode"
                        checked={exportMode === 'zip'}
                        onChange={() => setExportMode('zip')}
                      />
                      <FolderArchive size={16} color="#0D9488" />
                      <span>
                        <strong>แพ็กเกจ ZIP (.zip) บรรจุเล่ม Word + โฟลเดอร์สำเนาสัญญา PDF</strong> (สะดวกสำหรับส่งมอบ)
                      </span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.825rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="exportSubMode"
                        checked={exportMode === 'separate'}
                        onChange={() => setExportMode('separate')}
                      />
                      <Download size={16} color="#2563EB" />
                      <span>
                        <strong>ดาวน์โหลดไฟล์ Word (.docx) พร้อมดาวน์โหลดไฟล์แนบสัญญาแยก</strong> (ดาวน์โหลดคู่กัน)
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem',
                borderRadius: '8px',
                border: `2px solid ${!includeAnnex ? 'var(--primary-700)' : 'var(--slate-200)'}`,
                backgroundColor: !includeAnnex ? '#F8FAFC' : '#FFFFFF',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="includeAnnexChoice"
                checked={!includeAnnex}
                onChange={() => {
                  setIncludeAnnex(false);
                  setExportMode('docx_only');
                }}
                style={{ marginTop: '3px' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.9rem' }}>
                  ไม่รวม (ส่งออกเฉพาะไฟล์ Word .docx เล่มข้อเสนออย่างเดียว)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  เอกสารแนบสัญญาจะไม่ถูกดาวน์โหลดออกมาด้วย (ในเล่มจะแสดงรายการอ้างอิงตามปกติ)
                </div>
              </div>
            </label>
          </div>
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
            <CheckCircle size={14} color="#16A34A" /> จัดรูปแบบตามเกณฑ์ราชการ 100%
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
                <>กำลังสร้างเอกสาร...</>
              ) : exportMode === 'zip' && includeAnnex ? (
                <>
                  <Archive size={16} /> ส่งออกเป็นแพ็กเกจ ZIP (.zip)
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
