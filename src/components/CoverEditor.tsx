import React, { useRef } from 'react';
import { CoverConfig } from '../types/proposal';
import { Image as ImageIcon, Upload, Trash2, FileText, CheckCircle2 } from 'lucide-react';

interface CoverEditorProps {
  cover: CoverConfig;
  onChange: (cover: CoverConfig) => void;
}

export const CoverEditor: React.FC<CoverEditorProps> = ({ cover, onChange }) => {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backCoverInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof CoverConfig, value: any) => {
    onChange({ ...cover, [field]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isBackCover: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
                ภาพปกหน้า (Front Cover Image)
              </h2>
              <p>รองรับไฟล์รูปภาพ PNG, JPG หรือเว้นว่างเพื่อใช้ฟอร์แมตทางการมาตรฐาน</p>
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
                คลิกเพื่ออัปโหลดภาพปกหน้า
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                (แนะนำขนาดอัตราส่วน 16:9 หรือแนวตั้ง A4)
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
                ภาพปกหลัง (Back Cover Image)
              </h2>
              <p>หากไม่มีภาพ ระบบจะสร้างปกหลังตราสัญลักษณ์บริษัทและข้อมูลติดต่อให้อัตโนมัติ</p>
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
                คลิกเพื่ออัปโหลดภาพปกหลัง (ทางเลือก)
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                หรือใช้ปกหลังข้อความทางการของ Prime Digital Consultant
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
