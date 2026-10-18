import React, { useRef } from 'react';
import { Section3Methodology, TorScopeItem } from '../types/proposal';
import { TorMapper } from './TorMapper';
import { ReportImageManager } from './ReportImageManager';
import { generateDefaultConceptualDiagram } from '../utils/ganttRenderer';
import { compressImageFile } from '../utils/imageCompressor';
import {
  Layers,
  Image as ImageIcon,
  Upload,
  Trash2,
  Sparkles,
  Plus,
  Table as TableIcon,
  BookOpen,
  Compass,
  FileText,
} from 'lucide-react';

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

  const handleProjectApproachChange = (text: string) => {
    onChangeSection3({ ...section3, projectApproachOverview: text });
  };

  const handleInsertApproachBullet = () => {
    const bullet = '\n• ';
    const current = section3.projectApproachOverview || '';
    onChangeSection3({
      ...section3,
      projectApproachOverview: current + bullet,
    });
  };

  const handleInsertApproachTable = () => {
    const tableTemplate = `\n\n| ลำดับ | เสาหลักการดำเนินงาน | เครื่องมือและกรอบมาตรฐานที่นำมาใช้ | ผลลัพธ์และคุณค่าที่ส่งมอบ |
| :---: | :--- | :--- | :--- |
| 1 | การศึกษาวิเคราะห์ความต้องการ (Requirement Gathering) | Design Thinking Workshop, User Journey Mapping | ข้อกำหนดความต้องการระบบ (SRS) ที่ตรงใจผู้ใช้ |
| 2 | การออกแบบสถาปัตยกรรมระบบ (System Architecture) | TOGAF 9.2, Microservices, OpenAPI 3.0 | พิมพ์เขียวระบบที่มีเสถียรภาพและปลอดภัย |\n`;
    const current = section3.projectApproachOverview || '';
    onChangeSection3({
      ...section3,
      projectApproachOverview: current + tableTemplate,
    });
  };

  const handleInsertTemplate = (type: 'principles' | 'curriculum' | 'study') => {
    let templateText = '';
    if (type === 'principles') {
      templateText = `\n\nการถอดกรอบแนวคิดสู่การดำเนินโครงการจริง (Project Approach & Operational Principles)
บริษัทฯ ได้ถอดกรอบแนวคิดสถาปัตยกรรมระบบในข้อ 3.1 มาสู่แนวทางการปฏิบัติงานที่เป็นรูปธรรม 4 มิติ:
• การออกแบบระบบที่ยึดผู้ใช้งานเป็นศูนย์กลาง (User-Centric Architecture): ออกแบบ UI/UX ให้ใช้งานง่าย เข้าถึงได้ทุกคนตามมาตรฐาน WCAG 2.1 AA
• สถาปัตยกรรมแบบเปิดและยืดหยุ่น (Microservices & Open API): รองรับการขยายขีดความสามารถและเชื่อมต่อระบบภายนอกอย่างปลอดภัย
• มาตรฐานความมั่นคงปลอดภัยและการคุ้มครองข้อมูล (Zero Trust Security & PDPA): เข้ารหัสข้อมูลและปฏิบัติตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล
• การส่งมอบงานแบบคล่องตัว (Agile Collaboration): พัฒนาและตรวจรับชิ้นงานเป็นรอบ Sprint ย่อย เพื่อความโปร่งใสและตรงตามเป้าหมาย`;
    } else if (type === 'curriculum') {
      templateText = `\n\nโครงสร้างเนื้อหาหลักสูตรการฝึกอบรม (Training Curriculum Framework)
• หลักสูตรสำหรับผู้บริหาร (Executive Overview): การใช้ประโยชน์จากข้อมูลสถิติ แดชบอร์ดสรุปผลเชิงบริหาร และการติดตามตัวชี้วัด (KPIs)
• หลักสูตรสำหรับผู้ดูแลระบบและทีมเทคนิค (System & Security Administrator): การบริหารจัดการบัญชีผู้ใช้ สิทธิ์การเข้าถึง การสำรองและกู้คืนข้อมูล (Backup & DR)
• หลักสูตรสำหรับเจ้าหน้าที่ผู้ปฏิบัติงาน (End-User Operations): ขั้นตอนการบันทึกข้อมูล การตรวจสอบความถูกต้อง และการแก้ไขปัญหาการใช้งานเบื้องต้น`;
    } else if (type === 'study') {
      templateText = `\n\nระเบียบวิธีศึกษางานและรวบรวมข้อมูลในภาพรวม (Study & Discovery Methodology)
1. การสัมภาษณ์เชิงลึก (In-depth Interviews) กับผู้มีส่วนได้ส่วนเสียทุกระดับ เพื่อทำความเข้าใจ Pain Points และความคาดหวัง
2. การสำรวจกระบวนการทำงานปัจจุบัน (As-Is Process Mapping) ร่วมกับการสังเกตการณ์หน้างานจริง (Contextual Inquiry)
3. การศึกษาเปรียบเทียบมาตรฐานสากล (Benchmarking & Best Practices) กับระบบงานชั้นนำ
4. การประชุมเชิงปฏิบัติการเพื่อกำหนดกระบวนการทำงานเป้าหมาย (To-Be Workflow Design Workshop)`;
    }

    const current = section3.projectApproachOverview || '';
    onChangeSection3({
      ...section3,
      projectApproachOverview: current ? `${current}${templateText}` : templateText.trimStart(),
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1600, 1600, 0.85);
      if (compressed) {
        onChangeSection3({ ...section3, conceptualDiagramImage: compressed });
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onChangeSection3({ ...section3, conceptualDiagramImage: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseDefaultTemplate = () => {
    const defaultImg = generateDefaultConceptualDiagram();
    onChangeSection3({ ...section3, conceptualDiagramImage: defaultImg });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Section 3 Header Card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', border: '1px solid var(--primary-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-800)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(15, 39, 68, 0.2)',
            }}
          >
            <Layers size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary-900)', fontWeight: 700 }}>
              ส่วนที่ 3: แนวคิดและวิธีการดำเนินงาน
            </h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginTop: '2px' }}>
              โครงสร้างมาตรฐาน 3 หัวข้อย่อย: 3.1 กรอบแนวคิดการดำเนินงาน, 3.2 แนวคิดการดำเนินโครงการ (ถอดกรอบ/หลักการ/หลักสูตร), และ 3.3 วิธีการดำเนินงานตามขอบเขตงาน TOR
            </div>
          </div>
        </div>
      </div>

      {/* 3.1 Framework & Diagram Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={18} color="var(--primary-700)" />
              3.1 กรอบแนวคิดการดำเนินงาน (Conceptual Framework)
            </h2>
            <p>อัพโหลดภาพแนวคิดและพรรณาภาพรวมสถาปัตยกรรมระบบและกรอบการดำเนินงานโครงการ</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">
            คำบรรยายภาพรวมกรอบแนวคิด (Framework Overview)
          </label>
          <textarea
            className="form-textarea"
            style={{ minHeight: '90px' }}
            placeholder="อธิบายกรอบแนวคิด มิติการทำงาน หรือภาพรวมสถาปัตยกรรมของโครงการ..."
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

      {/* 3.2 Project Approach & Operational Principles Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="var(--primary-700)" />
              3.2 แนวคิดการดำเนินโครงการ (Project Approach & Principles)
            </h2>
            <p>ถอดกรอบแนวคิด อธิบายหลักการทำงานเชิงลึก เนื้อหาหลักสูตรการฝึกอบรม และระเบียบวิธีศึกษางานในภาพรวม</p>
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>
              เนื้อหาแนวคิดการดำเนินโครงการ (ข้อความ, บูลเล็ตพ้อยต์, และตาราง Markdown)
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                onClick={handleInsertApproachBullet}
                title="แทรกหัวข้อบูลเล็ต"
              >
                <Plus size={12} /> บูลเล็ตพ้อยต์
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem' }}
                onClick={handleInsertApproachTable}
                title="แทรกตาราง Markdown สำหรับตารางหลักการทำงาน"
              >
                <TableIcon size={12} /> แทรกตารางตัวอย่าง
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', color: 'var(--primary-700)' }}
                onClick={() => handleInsertTemplate('principles')}
                title="แทรกเทมเพลต: ถอดกรอบและหลักการทำงาน"
              >
                <FileText size={12} /> + ถอดกรอบ/หลักการ
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', color: 'var(--primary-700)' }}
                onClick={() => handleInsertTemplate('curriculum')}
                title="แทรกเทมเพลต: โครงสร้างหลักสูตรการอบรม"
              >
                <BookOpen size={12} /> + โครงสร้างหลักสูตร
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.55rem', color: 'var(--primary-700)' }}
                onClick={() => handleInsertTemplate('study')}
                title="แทรกเทมเพลต: วิธีศึกษางานรวมๆ"
              >
                <Compass size={12} /> + วิธีศึกษางานรวมๆ
              </button>
            </div>
          </div>

          <textarea
            className="form-textarea"
            style={{ minHeight: '220px', fontFamily: 'inherit', lineHeight: '1.6' }}
            placeholder="ระบุการถอดกรอบแนวคิดสู่หลักการทำงานจริง, เนื้อหาหลักสูตรการฝึกอบรม, และระเบียบวิธีศึกษางานในภาพรวม..."
            value={section3.projectApproachOverview || ''}
            onChange={(e) => handleProjectApproachChange(e.target.value)}
          />
          <div className="form-hint" style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--slate-500)' }}>
            💡 <strong>คำแนะนำการจัดรูปแบบ:</strong> สามารถเขียนข้อความพรรณา, ขึ้นบรรทัดใหม่, แทรกบูลเล็ตด้วยเครื่องหมาย <code>•</code> หรือ <code>-</code> และแทรกตารางรูปแบบ Markdown (<code>| ลำดับ | รายละเอียด |</code>) โดยตอน Export ระบบจะจัดย่อหน้าและจัดตาราง Word แท้ๆ ให้อัตโนมัติ
          </div>
        </div>

        {/* ภาพประกอบแนวคิดการดำเนินโครงการ (ภาพเดี่ยว 6 นิ้ว หรือ ภาพคู่ 3 นิ้ว) */}
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--slate-200)', paddingTop: '1.25rem' }}>
          <ReportImageManager
            title="ภาพประกอบแนวคิดการดำเนินโครงการ (ภาพเดี่ยว 6 นิ้ว หรือ ภาพคู่ 3 นิ้ว 2 คอลัมน์)"
            subtitle="สามารถอัปโหลดภาพผังขั้นตอนการทำงาน แผนผังหลักสูตร หรือภาพประกอบแนวคิดโครงการได้ไม่จำกัดจำนวน โดยระบบจัดสัดส่วนให้อัตโนมัติ"
            imageBlocks={section3.projectApproachImageBlocks || []}
            defaultCaptionPrefix="ภาพที่ 3.2-"
            onChange={(newBlocks) =>
              onChangeSection3({ ...section3, projectApproachImageBlocks: newBlocks })
            }
          />
        </div>
      </div>

      {/* 3.3 TOR Item-by-item Mapper Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h2 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="var(--primary-700)" />
              3.3 วิธีการดำเนินงาน (การทำงานตามขอบเขตงานแต่ละข้อ)
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
