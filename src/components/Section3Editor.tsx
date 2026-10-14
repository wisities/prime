import React, { useRef } from 'react';
import { Section3Methodology, TorScopeItem } from '../types/proposal';
import { TorMapper } from './TorMapper';
import { ReportImageManager } from './ReportImageManager';
import { generateDefaultConceptualDiagram } from '../utils/ganttRenderer';
import { Layers, Image as ImageIcon, Upload, Trash2, Sparkles } from 'lucide-react';

interface Section3EditorProps {
  section3: Section3Methodology;
  scopeItems: TorScopeItem[];
  onChangeSection3: (section3: Section3Methodology) => void;
  onChangeScopeItems: (items: TorScopeItem[]) => void;
}

export const Section3Editor: React.FC<Section3EditorProps> = ({
  section3,
  scopeItems,
  onChangeSection3,
  onChangeScopeItems,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOverviewChange = (text: string) => {
    onChangeSection3({ ...section3, frameworkOverview: text });
  };

  const handleCaptionChange = (text: string) => {
    onChangeSection3({ ...section3, conceptualDiagramCaption: text });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChangeSection3({ ...section3, conceptualDiagramImage: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseDefaultTemplate = () => {
    const defaultImg = generateDefaultConceptualDiagram();
    onChangeSection3({ ...section3, conceptualDiagramImage: defaultImg });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 3.1 Framework & Diagram Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2>
              <Layers size={20} color="var(--primary-700)" />
              ส่วนที่ 3: กรอบแนวคิดและวิธีการดำเนินงาน (Conceptual Framework & TOR Methodology)
            </h2>
            <p>แทรกแผนภาพกรอบแนวคิดสถาปัตยกรรมระบบ และตอบสนองข้อกำหนดขอบเขตงาน TOR ทีละข้ออย่างละเอียด</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            3.1 กรอบแนวคิดและหลักการดำเนินงานภาพรวม (Conceptual Framework Overview)
          </label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '85px' }}
            value={section3.frameworkOverview}
            onChange={(e) => handleOverviewChange(e.target.value)}
          />
        </div>

        {/* Conceptual Diagram Image Uploader */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--slate-200)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <label className="form-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ImageIcon size={18} color="var(--primary-700)" />
                แผนภาพกรอบแนวคิดการดำเนินงาน (ภาพแรก - กว้าง 6 นิ้ว สูงไม่เกิน 19 ซม.)
              </label>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                ภาพแรกจะแสดงต่อจากหัวข้อ 3.1 ในหน้าแรกพอดี (ขนาดบังคับกว้าง 6 นิ้ว ความสูงไม่เกิน 19 ซม.)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={handleUseDefaultTemplate}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              >
                <Sparkles size={14} color="var(--gold-500)" />
                สร้างไดอะแกรมสถาปัตยกรรมตัวอย่าง
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              >
                <Upload size={14} /> อัปโหลดภาพของคุณ
              </button>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />

          {section3.conceptualDiagramImage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <div
                style={{
                  width: '100%',
                  padding: '1rem',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--slate-300)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={section3.conceptualDiagramImage}
                  alt="Conceptual Framework"
                  style={{ maxHeight: '340px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>

              <div style={{ width: '100%', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="คำบรรยายใต้ภาพ (เช่น ภาพที่ 3-1 กรอบแนวคิดสถาปัตยกรรมระบบ...)"
                  value={section3.conceptualDiagramCaption}
                  onChange={(e) => handleCaptionChange(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => onChangeSection3({ ...section3, conceptualDiagramImage: undefined })}
                  className="btn btn-outline"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
                  title="ลบภาพนี้"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--slate-300)',
                borderRadius: '8px',
                padding: '2.5rem 1rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--slate-50)',
              }}
            >
              <ImageIcon size={36} color="var(--slate-400)" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: 500, color: 'var(--primary-800)' }}>
                คลิกเพื่ออัปโหลดภาพแผนภาพกรอบแนวคิด (ภาพแรก)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '0.25rem' }}>
                ขนาดกว้าง 6 นิ้ว สูงไม่เกิน 19 ซม. หรือกดปุ่ม "สร้างไดอะแกรมสถาปัตยกรรมตัวอย่าง" ด้านบน
              </div>
            </div>
          )}

          {/* ภาพประกอบเพิ่มเติมในส่วนที่ 3.1 (ภาพถัดไป - แสดงเต็มหน้า กว้าง 6 นิ้ว สูงไม่เกิน 23 ซม.) */}
          <ReportImageManager
            title="แผนภาพถัดไปในหัวข้อ 3.1 (แสดงเต็มหน้า กว้าง 6 นิ้ว สูงไม่เกิน 23 ซม.)"
            subtitle="ภาพถัดไปจากภาพแรก ระบบจะขึ้นหน้าใหม่ (Page Break) และจัดวางเต็มหน้ากระดาษ A4 ขนาดกว้าง 6 นิ้ว สูงไม่เกิน 23 ซม. ให้อัตโนมัติ"
            imageBlocks={section3.imageBlocks || []}
            defaultCaptionPrefix="ภาพที่ 3.1-"
            onChange={(newBlocks) => onChangeSection3({ ...section3, imageBlocks: newBlocks })}
          />
        </div>
      </div>

      {/* 3.2 TOR Item-by-item Mapper Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2 style={{ fontSize: '1.1rem' }}>
              3.2 วิธีการดำเนินงาน
            </h2>
            <p>
              ระบุวิธีการดำเนินงานเชิงพรรณา, สร้างหัวข้อบูลเล็ตพ้อยต์ หรือแทรกตารางขั้นตอนการทำงาน พร้อมแทรกภาพประกอบ (เดี่ยว 6 นิ้ว, 2 คอลัมน์ 3 นิ้ว หรือทั้งสองแบบ) ตอบสนองข้อกำหนด TOR ทีละข้อ
            </p>
          </div>
        </div>

        <TorMapper
          scopeItems={scopeItems}
          onChange={onChangeScopeItems}
        />
      </div>
    </div>
  );
};
