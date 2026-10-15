import React, { useRef } from 'react';
import { ReportImageBlock } from '../types/proposal';
import { createEmptySingleImageBlock, createEmptyPairImageBlock } from '../utils/imageBlockUtils';
import {
  Image as ImageIcon,
  Columns,
  Maximize2,
  Upload,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Sparkles,
} from 'lucide-react';

interface ReportImageManagerProps {
  title?: string;
  subtitle?: string;
  imageBlocks?: ReportImageBlock[];
  onChange: (blocks: ReportImageBlock[]) => void;
  defaultCaptionPrefix?: string;
}

export const ReportImageManager: React.FC<ReportImageManagerProps> = ({
  title = 'ภาพประกอบรายงาน (ไม่จำกัดจำนวน)',
  subtitle = 'รองรับทั้งภาพเดี่ยวขนาด 6 นิ้ว จัดกึ่งกลาง และภาพคู่ 2 คอลัมน์ ขนาดคอลัมน์ละ 3 นิ้ว ในเอกสาร Word',
  imageBlocks = [],
  onChange,
  defaultCaptionPrefix = 'ภาพที่',
}) => {
  const fileInputsRef = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const handleAddSingle = () => {
    const newBlock = createEmptySingleImageBlock('');
    onChange([...imageBlocks, newBlock]);
  };

  const handleAddPair = () => {
    const newBlock = createEmptyPairImageBlock('', '');
    onChange([...imageBlocks, newBlock]);
  };

  const handleRemoveBlock = (blockId: string) => {
    onChange(imageBlocks.filter((b) => b.id !== blockId));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= imageBlocks.length) return;

    const updated = [...imageBlocks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    onChange(updated);
  };

  const handleBlockChange = (blockId: string, partial: Partial<ReportImageBlock>) => {
    onChange(
      imageBlocks.map((b) => (b.id === blockId ? { ...b, ...partial } : b))
    );
  };

  const handleFileUpload = (
    blockId: string,
    field: 'url' | 'leftUrl' | 'rightUrl',
    file: File
  ) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleBlockChange(blockId, { [field]: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      style={{
        marginTop: '0.85rem',
        padding: '1rem',
        borderRadius: '8px',
        backgroundColor: 'var(--slate-50, #F8FAFC)',
        border: '1px solid var(--slate-200, #E2E8F0)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      {/* Header & Action Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.65rem',
          borderBottom: imageBlocks.length > 0 ? '1px solid var(--slate-200, #E2E8F0)' : 'none',
          paddingBottom: imageBlocks.length > 0 ? '0.75rem' : '0',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: 'var(--primary-900, #0F2744)',
            }}
          >
            <ImageIcon size={17} color="var(--primary-700, #1E40AF)" />
            <span>{title}</span>
            <span
              style={{
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '12px',
                backgroundColor: imageBlocks.length > 0 ? 'var(--primary-100, #DBEAFE)' : 'var(--slate-200, #E2E8F0)',
                color: imageBlocks.length > 0 ? 'var(--primary-800, #1E3A8A)' : 'var(--slate-600, #475569)',
                fontWeight: 600,
              }}
            >
              {imageBlocks.length} รายการ
            </span>
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-500, #64748B)', marginTop: '0.15rem' }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* Buttons to Add Images */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleAddSingle}
            className="btn btn-outline"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.775rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderColor: 'var(--primary-600, #2563EB)',
              color: 'var(--primary-700, #1D4ED8)',
              backgroundColor: '#FFFFFF',
            }}
            title="เพิ่มภาพเดี่ยว กว้าง 6 นิ้ว จัดวางกึ่งกลางหน้ากระดาษ Word"
          >
            <Maximize2 size={13} />
            + เพิ่มภาพเดี่ยว (6 นิ้ว กึ่งกลาง)
          </button>
          <button
            type="button"
            onClick={handleAddPair}
            className="btn btn-outline"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.775rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              borderColor: '#0D9488',
              color: '#0F766E',
              backgroundColor: '#FFFFFF',
            }}
            title="เพิ่มภาพคู่ 2 คอลัมน์ ขนาดละ 3 นิ้ว วางคู่กันในหน้ากระดาษ Word"
          >
            <Columns size={13} />
            + เพิ่มภาพคู่ (2 คอลัมน์ 3 นิ้ว)
          </button>
        </div>
      </div>

      {/* Empty State */}
      {imageBlocks.length === 0 && (
        <div
          style={{
            border: '2px dashed var(--slate-300, #CBD5E1)',
            borderRadius: '6px',
            padding: '1.25rem 1rem',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <ImageIcon size={26} color="var(--slate-400, #94A3B8)" style={{ margin: '0 auto 0.35rem' }} />
          <div style={{ fontSize: '0.825rem', color: 'var(--slate-600, #475569)', fontWeight: 500 }}>
            ยังไม่มีการแนบรูปภาพในหัวข้อนี้
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500, #64748B)', marginTop: '0.2rem', marginBottom: '0.75rem' }}>
            คุณสามารถเพิ่มรูปภาพได้ไม่จำกัดจำนวน ทั้งแบบภาพเดี่ยว (กว้าง 6 นิ้ว) หรือภาพคู่ 2 คอลัมน์ (กว้าง 3 นิ้ว)
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={handleAddSingle}
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
            >
              <Maximize2 size={13} /> เพิ่มภาพเดี่ยว 6 นิ้ว
            </button>
            <button
              type="button"
              onClick={handleAddPair}
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
            >
              <Columns size={13} /> เพิ่มภาพคู่ 3 นิ้ว
            </button>
          </div>
        </div>
      )}

      {/* List of Image Blocks */}
      {imageBlocks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {imageBlocks.map((block, idx) => {
            const isSingle = block.type === 'single';

            return (
              <div
                key={block.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '6px',
                  border: '1px solid var(--slate-200, #E2E8F0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                }}
              >
                {/* Block Header */}
                <div
                  style={{
                    backgroundColor: isSingle ? '#EFF6FF' : '#F0FDFA',
                    borderBottom: '1px solid var(--slate-200, #E2E8F0)',
                    padding: '0.45rem 0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        backgroundColor: isSingle ? '#DBEAFE' : '#CCFBF1',
                        color: isSingle ? '#1E40AF' : '#0F766E',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {isSingle ? <Maximize2 size={11} /> : <Columns size={11} />}
                      #{idx + 1} {isSingle ? 'ภาพเดี่ยว (6 นิ้ว กึ่งกลาง)' : 'ภาพคู่ 2 คอลัมน์ (ขนาดละ 3 นิ้ว)'}
                    </span>
                  </div>

                  {/* Move Up, Down, Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveBlock(idx, 'up')}
                      disabled={idx === 0}
                      className="btn btn-outline"
                      style={{ padding: '0.15rem 0.35rem', opacity: idx === 0 ? 0.3 : 1 }}
                      title="เลื่อนขึ้น"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveBlock(idx, 'down')}
                      disabled={idx === imageBlocks.length - 1}
                      className="btn btn-outline"
                      style={{ padding: '0.15rem 0.35rem', opacity: idx === imageBlocks.length - 1 ? 0.3 : 1 }}
                      title="เลื่อนลง"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(block.id)}
                      className="btn btn-outline"
                      style={{
                        padding: '0.15rem 0.45rem',
                        color: 'var(--danger, #DC2626)',
                        borderColor: '#FEE2E2',
                        backgroundColor: '#FEF2F2',
                      }}
                      title="ลบชุดภาพนี้"
                    >
                      <Trash2 size={12} /> ลบ
                    </button>
                  </div>
                </div>

                {/* Block Content */}
                <div style={{ padding: '0.85rem' }}>
                  {isSingle ? (
                    /* Single Image 6 inches */
                    <div>
                      {block.url ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              maxHeight: '260px',
                              display: 'flex',
                              justifyContent: 'center',
                              backgroundColor: '#F8FAFC',
                              padding: '0.5rem',
                              borderRadius: '6px',
                              border: '1px solid var(--slate-200, #E2E8F0)',
                            }}
                          >
                            <img
                              src={block.url}
                              alt="Single 6 inch preview"
                              style={{
                                maxHeight: '240px',
                                maxWidth: '100%',
                                objectFit: 'contain',
                                borderRadius: '4px',
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                display: 'flex',
                                gap: '0.35rem',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => fileInputsRef.current[`single-${block.id}`]?.click()}
                                className="btn btn-outline"
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.2rem 0.45rem',
                                  backgroundColor: '#FFFFFF',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                }}
                              >
                                เปลี่ยนภาพ
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBlockChange(block.id, { url: undefined })}
                                className="btn btn-outline"
                                style={{
                                  fontSize: '0.7rem',
                                  padding: '0.2rem 0.45rem',
                                  backgroundColor: '#FFFFFF',
                                  color: 'var(--danger, #DC2626)',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                }}
                              >
                                ลบภาพ
                              </button>
                            </div>
                          </div>

                          <div style={{ width: '100%', marginTop: '0.35rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700, #334155)', display: 'block', marginBottom: '0.25rem' }}>
                              คำบรรยายใต้ภาพ (กว้าง 6 นิ้ว จัดกึ่งกลางใน Word - เว้นว่างได้):
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                              placeholder="คำบรรยายใต้ภาพ (เว้นว่างไว้ได้หากไม่ต้องการใส่)..."
                              value={block.caption || ''}
                              onChange={(e) => handleBlockChange(block.id, { caption: e.target.value })}
                            />
                          </div>
                        </div>
                      ) : (
                        <label
                          style={{
                            display: 'block',
                            border: '2px dashed var(--slate-300, #CBD5E1)',
                            borderRadius: '6px',
                            padding: '1.25rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: '#F8FAFC',
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            ref={(el) => {
                              fileInputsRef.current[`single-${block.id}`] = el;
                            }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(block.id, 'url', f);
                              e.target.value = '';
                            }}
                          />
                          <Upload size={22} color="var(--primary-600, #2563EB)" style={{ margin: '0 auto 0.25rem' }} />
                          <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--primary-800, #1E3A8A)' }}>
                            คลิกเพื่อเลือกไฟล์ภาพ (ขนาด 6 นิ้ว กึ่งกลาง)
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--slate-500, #64748B)', marginTop: '0.2rem' }}>
                            รองรับไฟล์ PNG, JPG, GIF หรือ WebP
                          </div>
                        </label>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        ref={(el) => {
                          fileInputsRef.current[`single-${block.id}`] = el;
                        }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(block.id, 'url', f);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  ) : (
                    /* Pair Images 3 inches (2 Columns) */
                    <div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                          gap: '0.75rem',
                        }}
                      >
                        {/* Left Column Image (3 inches) */}
                        <div
                          style={{
                            border: '1px solid var(--slate-200, #E2E8F0)',
                            borderRadius: '6px',
                            padding: '0.65rem',
                            backgroundColor: '#FAFAFA',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--slate-700, #334155)',
                              marginBottom: '0.35rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>คอลัมน์ซ้าย (กว้าง 3 นิ้ว)</span>
                            {block.leftUrl && (
                              <button
                                type="button"
                                onClick={() => handleBlockChange(block.id, { leftUrl: undefined })}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: 'var(--danger, #DC2626)',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                }}
                              >
                                ลบภาพ
                              </button>
                            )}
                          </div>

                          {block.leftUrl ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <img
                                src={block.leftUrl}
                                alt="Left 3-inch preview"
                                style={{
                                  width: '100%',
                                  maxHeight: '150px',
                                  objectFit: 'contain',
                                  borderRadius: '4px',
                                  border: '1px solid var(--slate-200, #E2E8F0)',
                                  backgroundColor: '#FFFFFF',
                                }}
                              />
                              <input
                                type="text"
                                className="form-input"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                placeholder="คำบรรยายภาพซ้าย (เว้นว่างได้)"
                                value={block.leftCaption || ''}
                                onChange={(e) => handleBlockChange(block.id, { leftCaption: e.target.value })}
                              />
                            </div>
                          ) : (
                            <label
                              style={{
                                display: 'block',
                                padding: '1rem',
                                border: '1px dashed var(--slate-300, #CBD5E1)',
                                textAlign: 'center',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                backgroundColor: '#FFFFFF',
                              }}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleFileUpload(block.id, 'leftUrl', f);
                                  e.target.value = '';
                                }}
                              />
                              <Upload size={18} color="var(--slate-500, #64748B)" style={{ margin: '0 auto 2px' }} />
                              <div style={{ fontSize: '0.75rem', color: 'var(--primary-700, #1D4ED8)' }}>
                                อัปโหลดภาพซ้าย (3 นิ้ว)
                              </div>
                            </label>
                          )}
                        </div>

                        {/* Right Column Image (3 inches) */}
                        <div
                          style={{
                            border: '1px solid var(--slate-200, #E2E8F0)',
                            borderRadius: '6px',
                            padding: '0.65rem',
                            backgroundColor: '#FAFAFA',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--slate-700, #334155)',
                              marginBottom: '0.35rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>คอลัมน์ขวา (กว้าง 3 นิ้ว)</span>
                            {block.rightUrl && (
                              <button
                                type="button"
                                onClick={() => handleBlockChange(block.id, { rightUrl: undefined })}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  color: 'var(--danger, #DC2626)',
                                  fontSize: '0.7rem',
                                  cursor: 'pointer',
                                }}
                              >
                                ลบภาพ
                              </button>
                            )}
                          </div>

                          {block.rightUrl ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              <img
                                src={block.rightUrl}
                                alt="Right 3-inch preview"
                                style={{
                                  width: '100%',
                                  maxHeight: '150px',
                                  objectFit: 'contain',
                                  borderRadius: '4px',
                                  border: '1px solid var(--slate-200, #E2E8F0)',
                                  backgroundColor: '#FFFFFF',
                                }}
                              />
                              <input
                                type="text"
                                className="form-input"
                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                placeholder="คำบรรยายภาพขวา (เว้นว่างได้)"
                                value={block.rightCaption || ''}
                                onChange={(e) => handleBlockChange(block.id, { rightCaption: e.target.value })}
                              />
                            </div>
                          ) : (
                            <label
                              style={{
                                display: 'block',
                                padding: '1rem',
                                border: '1px dashed var(--slate-300, #CBD5E1)',
                                textAlign: 'center',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                backgroundColor: '#FFFFFF',
                              }}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleFileUpload(block.id, 'rightUrl', f);
                                  e.target.value = '';
                                }}
                              />
                              <Upload size={18} color="var(--slate-500, #64748B)" style={{ margin: '0 auto 2px' }} />
                              <div style={{ fontSize: '0.75rem', color: 'var(--primary-700, #1D4ED8)' }}>
                                อัปโหลดภาพขวา (3 นิ้ว)
                              </div>
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
