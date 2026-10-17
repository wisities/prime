import React, { useRef } from 'react';
import { CoverConfig } from '../types/proposal';
import { compressImageFile } from '../utils/imageCompressor';
import { Image as ImageIcon, Upload, Trash2, FileText, CheckCircle2, Layers } from 'lucide-react';

interface CoverEditorProps {
  cover: CoverConfig;
  onChange: (cover: CoverConfig) => void;
}

export const CoverEditor: React.FC<CoverEditorProps> = ({ cover, onChange }) => {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backCoverInputRef = useRef<HTMLInputElement>(null);
  const portraitBgInputRef = useRef<HTMLInputElement>(null);
  const landscapeBgInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof CoverConfig, value: any) => {
    onChange({ ...cover, [field]: value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isBackCover: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1600, 1600, 0.85);
      if (compressed) {
        if (isBackCover) {
          handleFieldChange('backCoverImage', compressed);
        } else {
          handleFieldChange('coverImage', compressed);
        }
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          if (isBackCover) {
            handleFieldChange('backCoverImage', reader.result);
          } else {
            handleFieldChange('coverImage', reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>, isLandscape: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1600, 1600, 0.85);
      if (compressed) {
        if (isLandscape) {
          handleFieldChange('landscapeBgImage', compressed);
        } else {
          handleFieldChange('portraitBgImage', compressed);
        }
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          if (isLandscape) {
            handleFieldChange('landscapeBgImage', reader.result);
          } else {
            handleFieldChange('portraitBgImage', reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Settings Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2>
              <FileText size={20} color="var(--primary-700)" />
              การตั้งค่าหน้าปกและเอกสาร (Cover & Document Setup)
            </h2>
            <p>กำหนดรายละเอียดหัวข้อโครงการ ข้อมูลผู้ว่าจ้าง ภาพปกหน้า และการสร้างสารบัญอัตโนมัติ</p>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              ชื่อโครงการที่ยื่นข้อเสนอ <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={cover.projectTitle}
              onChange={(e) => handleFieldChange('projectTitle', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">รหัสเอกสาร / เลขที่ประกาศประกวดราคา</label>
            <input
              type="text"
              className="form-input"
              value={cover.projectCode}
              onChange={(e) => handleFieldChange('projectCode', e.target.value)}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              หน่วยงานผู้ว่าจ้าง (กรม/กระทรวง/องค์กร) <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={cover.clientAgency}
              onChange={(e) => handleFieldChange('clientAgency', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">กอง / ฝ่าย / สำนัก ผู้รับผิดชอบ</label>
            <input
              type="text"
              className="form-input"
              value={cover.clientDepartment}
              onChange={(e) => handleFieldChange('clientDepartment', e.target.value)}
            />
          </div>
        </div>

        <div className="grid-3">
          <div className="form-group">
            <label className="form-label">
              ชื่อบริษัทผู้ยื่นข้อเสนอ <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={cover.submitterCompany}
              onChange={(e) => handleFieldChange('submitterCompany', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">วันที่ยื่นข้อเสนอ</label>
            <input
              type="text"
              className="form-input"
              placeholder="เช่น 15 พฤษภาคม 2568"
              value={cover.submissionDate}
              onChange={(e) => handleFieldChange('submissionDate', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">วงเงินงบประมาณที่ระบุหน้าปก</label>
            <input
              type="text"
              className="form-input"
              value={cover.budgetFormatted}
              onChange={(e) => handleFieldChange('budgetFormatted', e.target.value)}
            />
          </div>
        </div>

        {/* Checkbox Options */}
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-200)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={cover.includeTOC}
              onChange={(e) => handleFieldChange('includeTOC', e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: 500 }}>สร้างสารบัญ (Table of Contents) และเลขหน้าอัตโนมัติ</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={cover.includeBackCover}
              onChange={(e) => handleFieldChange('includeBackCover', e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span style={{ fontWeight: 500 }}>แทรกหน้าปกหลังปิดเล่ม (Back Cover)</span>
          </label>
        </div>
      </div>

      {/* Cover & Back Cover Image Upload Cards */}
      <div className="grid-2">
        {/* Front Cover Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h2 style={{ fontSize: '1.05rem' }}>
                <ImageIcon size={18} color="var(--primary-700)" />
                ภาพหน้าปกขนาด A4 (ก่อนหน้าหัวข้อโครงการ)
              </h2>
              <p>แทรกรูปภาพปกหน้าขนาด A4 เต็มหน้า เป็นหน้าแรกของเอกสาร ก่อนหน้าหัวข้อโครงการ</p>
            </div>
          </div>

          <input
            type="file"
            ref={coverInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageUpload(e, false)}
          />

          {cover.coverImage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <img
                src={cover.coverImage}
                alt="Front Cover"
                style={{ maxHeight: '220px', width: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="btn btn-outline"
                >
                  <Upload size={14} /> เปลี่ยนภาพ
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('coverImage', undefined)}
                  className="btn btn-outline"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
                >
                  <Trash2 size={14} /> ลบภาพ
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => coverInputRef.current?.click()}
              style={{
                border: '2px dashed var(--slate-300)',
                borderRadius: '8px',
                padding: '2rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--slate-50)',
                transition: 'background-color 0.15s',
              }}
            >
              <Upload size={32} color="var(--slate-400)" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 500, color: 'var(--primary-800)', fontSize: '0.9rem' }}>
                คลิกเพื่ออัปโหลดภาพปกหน้าขนาด A4
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                (ขนาดมาตรฐาน A4: 210 × 297 มม. แนวตั้ง จะแสดงเต็มหน้าก่อนหน้าหัวข้อโครงการ)
              </div>
            </div>
          )}
        </div>

        {/* Back Cover Card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <h2 style={{ fontSize: '1.05rem' }}>
                <ImageIcon size={18} color="var(--primary-700)" />
                ภาพปกหลังขนาด A4 (หน้าสุดท้ายของเล่ม)
              </h2>
              <p>แทรกรูปภาพปกหลังขนาด A4 เต็มหน้า ในหน้าสุดท้าย หรือเว้นว่างเพื่อใช้ปกหลังมาตรฐานบริษัท</p>
            </div>
          </div>

          <input
            type="file"
            ref={backCoverInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleImageUpload(e, true)}
          />

          {cover.backCoverImage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <img
                src={cover.backCoverImage}
                alt="Back Cover"
                style={{ maxHeight: '220px', width: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => backCoverInputRef.current?.click()}
                  className="btn btn-outline"
                >
                  <Upload size={14} /> เปลี่ยนภาพ
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('backCoverImage', undefined)}
                  className="btn btn-outline"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
                >
                  <Trash2 size={14} /> ลบภาพ
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => backCoverInputRef.current?.click()}
              style={{
                border: '2px dashed var(--slate-300)',
                borderRadius: '8px',
                padding: '2rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--slate-50)',
                transition: 'background-color 0.15s',
              }}
            >
              <Upload size={32} color="var(--slate-400)" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 500, color: 'var(--primary-800)', fontSize: '0.9rem' }}>
                คลิกเพื่ออัปโหลดภาพปกหลังขนาด A4 (ทางเลือก)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                (ขนาดมาตรฐาน A4: 210 × 297 มม. แนวตั้ง จะแสดงเต็มหน้าในหน้าสุดท้ายของเล่ม)
              </div>
            </div>
          )}
        </div>
      </div>

      {/* A4 Report Backgrounds (Header & Footer) */}
      <div className="card" style={{ border: '1px solid var(--primary-200)', background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)' }}>
        <div className="card-header">
          <div className="card-title-group">
            <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-900)' }}>
              <Layers size={20} color="var(--primary-700)" />
              ภาพพื้นหลังเอกสารรายงานขนาด A4 (Header & Footer Backgrounds)
            </h2>
            <p style={{ color: 'var(--slate-600)', fontSize: '0.875rem' }}>
              แทรกไฟล์ภาพพื้นหลังสำหรับหน้ากระดาษ A4 ที่มีกราฟิกและข้อความ Header และ Footer ในตัว เพื่อใช้เป็นเทมเพลตมาตรฐานสำหรับหน้าเนื้อหาทุกหน้าของรายงาน
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#1E40AF', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>คำแนะนำขนาดไฟล์:</strong> ขนาด A4 แนวตั้งมาตรฐานคือ <strong>210 x 297 มม.</strong> (หรือสัดส่วน 1:1.414 / 794x1123 px) และ A4 แนวนอนคือ <strong>297 x 210 มม.</strong> (1123x794 px) ระบบจะนำภาพไปวางเป็นพื้นหลังเต็มหน้ากระดาษโดยอัตโนมัติในไฟล์ Word (.docx)
          </div>
        </div>

        {/* 2-Col Grid for Portrait and Landscape Backgrounds */}
        <div className="grid-2">
          {/* Portrait Background Card */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--slate-300)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '16px', border: '2px solid var(--primary-700)', borderRadius: '2px' }} />
                ภาพพื้นหลัง A4 แนวตั้ง (Portrait)
              </h3>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                ส่วนที่ 1, 3, 5.1
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: '0.85rem' }}>
              ใช้เป็นพื้นหลังสำหรับหน้าแนวตั้ง (รวมสารบัญ, บทนำ, วิธีการทำงาน TOR, และโปรไฟล์บริษัท)
            </p>

            <input
              type="file"
              ref={portraitBgInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleBgUpload(e, false)}
            />

            {cover.portraitBgImage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: '100%', maxHeight: '240px', overflow: 'hidden', borderRadius: '6px', border: '1px solid var(--slate-300)', backgroundColor: '#F8FAFC', textAlign: 'center', padding: '4px' }}>
                  <img
                    src={cover.portraitBgImage}
                    alt="Portrait Background"
                    style={{ maxHeight: '230px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => portraitBgInputRef.current?.click()}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    <Upload size={14} /> เปลี่ยนภาพแนวตั้ง
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('portraitBgImage', undefined)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
                  >
                    <Trash2 size={14} /> ลบภาพ
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => portraitBgInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--slate-300)',
                  borderRadius: '6px',
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--slate-50)',
                  transition: 'background-color 0.15s',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={28} color="var(--slate-400)" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600, color: 'var(--primary-800)', fontSize: '0.875rem' }}>
                  คลิกเพื่ออัปโหลดภาพพื้นหลัง A4 แนวตั้ง
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                  (ภาพ A4 อัตราส่วน 1:1.414 พร้อม Header & Footer ในตัว)
                </div>
              </div>
            )}
          </div>

          {/* Landscape Background Card */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--slate-300)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-900)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '12px', border: '2px solid var(--primary-700)', borderRadius: '2px' }} />
                ภาพพื้นหลัง A4 แนวนอน (Landscape)
              </h3>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                ส่วนที่ 2, 4, 5.3
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginBottom: '0.85rem' }}>
              ใช้เป็นพื้นหลังสำหรับหน้าแนวนอน (ตาราง Gantt Chart, บุคลากร, และตารางผลงานอ้างอิง)
            </p>

            <input
              type="file"
              ref={landscapeBgInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleBgUpload(e, true)}
            />

            {cover.landscapeBgImage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ width: '100%', maxHeight: '240px', overflow: 'hidden', borderRadius: '6px', border: '1px solid var(--slate-300)', backgroundColor: '#F8FAFC', textAlign: 'center', padding: '4px' }}>
                  <img
                    src={cover.landscapeBgImage}
                    alt="Landscape Background"
                    style={{ maxHeight: '230px', maxWidth: '100%', objectFit: 'contain', margin: '0 auto' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => landscapeBgInputRef.current?.click()}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                  >
                    <Upload size={14} /> เปลี่ยนภาพแนวนอน
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('landscapeBgImage', undefined)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
                  >
                    <Trash2 size={14} /> ลบภาพ
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => landscapeBgInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--slate-300)',
                  borderRadius: '6px',
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'var(--slate-50)',
                  transition: 'background-color 0.15s',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={28} color="var(--slate-400)" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontWeight: 600, color: 'var(--primary-800)', fontSize: '0.875rem' }}>
                  คลิกเพื่ออัปโหลดภาพพื้นหลัง A4 แนวนอน
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                  (ภาพ A4 แนวนอน 1.414:1 พร้อม Header & Footer ในตัว)
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Options to hide default text header/footer */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--slate-200)' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={cover.hideDefaultHeaderFooter ?? false}
              onChange={(e) => handleFieldChange('hideDefaultHeaderFooter', e.target.checked)}
              style={{ width: '18px', height: '18px', marginTop: '2px' }}
            />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--primary-900)', fontSize: '0.9rem' }}>
                ซ่อนข้อความ Header และ Footer เริ่มต้นของระบบอัตโนมัติ
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                เปิดใช้งานเมื่อรูปภาพพื้นหลัง A4 ของท่านมีข้อความชื่อโครงการ/โลโก้บริษัทที่ด้านบน และเลขหน้าหรือข้อความที่ด้านล่างอยู่แล้ว เพื่อไม่ให้ข้อความตัวหนังสือของระบบซ้อนทับกับกราฟิก
              </div>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};
