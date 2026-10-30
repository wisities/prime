import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PastProject } from '../types/proposal';
import {
  getUniqueClientAgencies,
  ClientAgencyOption,
  normalizeClientAgencyName,
  saveClientAgencyLogo,
  MASTER_PROJECTS_UPDATED_EVENT,
} from '../services/masterLibraryService';
import { compressImageFile } from '../utils/imageCompressor';
import { Building2, ChevronDown, Upload, Check, Search, Plus } from 'lucide-react';

interface ClientAgencySelectProps {
  value: string;
  logoUrl?: string;
  onChange: (clientName: string, clientLogoUrl?: string) => void;
  onLogoChange?: (logoUrl?: string) => void;
  showLogoUpload?: boolean;
  extraProjects?: PastProject[];
  placeholder?: string;
  required?: boolean;
}

export const ClientAgencySelect: React.FC<ClientAgencySelectProps> = ({
  value,
  logoUrl,
  onChange,
  onLogoChange,
  showLogoUpload = true,
  extraProjects,
  placeholder = 'เลือกหรือพิมพ์ชื่อหน่วยงานผู้ว่าจ้าง...',
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterMode, setFilterMode] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleUpdate = () => setRefreshTick((t) => t + 1);
    window.addEventListener(MASTER_PROJECTS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(MASTER_PROJECTS_UPDATED_EVENT, handleUpdate);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setFilterMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const agencies: ClientAgencyOption[] = useMemo(() => {
    return getUniqueClientAgencies(extraProjects);
  }, [extraProjects, refreshTick, value, logoUrl]);

  const matchedAgency = useMemo(() => {
    const normVal = normalizeClientAgencyName(value).toLowerCase();
    if (!normVal) return undefined;
    return agencies.find((a) => a.clientName.toLowerCase() === normVal);
  }, [agencies, value]);

  const effectiveLogoUrl = logoUrl || matchedAgency?.clientLogoUrl;

  const filteredAgencies = useMemo(() => {
    if (!filterMode || !value.trim()) return agencies;
    const q = value.trim().toLowerCase();
    const matches = agencies.filter((a) => a.clientName.toLowerCase().includes(q));
    return matches.length > 0 ? matches : agencies;
  }, [agencies, filterMode, value]);

  const handleSelectOption = (opt: ClientAgencyOption) => {
    onChange(opt.clientName, opt.clientLogoUrl);
    if (onLogoChange && opt.clientLogoUrl) {
      onLogoChange(opt.clientLogoUrl);
    }
    setIsOpen(false);
    setFilterMode(false);
  };

  const handleLogoFileUpload = async (file: File) => {
    let base64Result = '';
    try {
      base64Result = await compressImageFile(file, 600, 600, 0.88);
    } catch {
      base64Result = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.readAsDataURL(file);
      });
    }
    if (!base64Result) return;

    if (value && value.trim()) {
      saveClientAgencyLogo(value, base64Result);
    }
    if (onLogoChange) {
      onLogoChange(base64Result);
    } else {
      onChange(value, base64Result);
    }
    setRefreshTick((t) => t + 1);
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onLogoChange) {
      onLogoChange(undefined);
    } else {
      onChange(value, undefined);
    }
  };

  const isExactMatch = useMemo(() => {
    const normVal = normalizeClientAgencyName(value).toLowerCase();
    if (!normVal) return true;
    return agencies.some((a) => a.clientName.toLowerCase() === normVal);
  }, [agencies, value]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Left Logo Preview / Upload Button */}
        {effectiveLogoUrl ? (
          <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
            <label
              style={{
                cursor: showLogoUpload ? 'pointer' : 'default',
                display: 'block',
                margin: 0,
              }}
              title={showLogoUpload ? 'คลิกเพื่อเปลี่ยนโลโก้หน่วยงานผู้ว่าจ้าง' : 'โลโก้หน่วยงานผู้ว่าจ้าง'}
            >
              {showLogoUpload && (
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      handleLogoFileUpload(f);
                      e.target.value = '';
                    }
                  }}
                />
              )}
              <img
                src={effectiveLogoUrl}
                alt="Client Logo"
                style={{
                  height: '38px',
                  width: '46px',
                  objectFit: 'contain',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--slate-300)',
                  borderRadius: '6px',
                  padding: '2px',
                  display: 'block',
                }}
              />
            </label>
            {showLogoUpload && logoUrl && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
                title="ลบโลโก้ลูกค้า"
              >
                ✕
              </button>
            )}
          </div>
        ) : showLogoUpload ? (
          <label
            style={{
              padding: '0.4rem 0.55rem',
              border: '1px dashed var(--slate-300)',
              borderRadius: '6px',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '0.75rem',
              color: 'var(--primary-700)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              height: '38px',
              flexShrink: 0,
            }}
            title="อัปโหลดภาพโลโก้ของลูกค้า / หน่วยงานผู้ว่าจ้าง"
          >
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  handleLogoFileUpload(f);
                  e.target.value = '';
                }
              }}
            />
            <Upload size={12} />
            <span>โลโก้</span>
          </label>
        ) : null}

        {/* Input + Dropdown Trigger */}
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            style={{ width: '100%', paddingRight: '2.2rem' }}
            placeholder={placeholder}
            value={value || ''}
            required={required}
            onFocus={() => {
              setIsOpen(true);
              setFilterMode(false);
            }}
            onChange={(e) => {
              const newVal = e.target.value;
              const normNew = normalizeClientAgencyName(newVal).toLowerCase();
              const match = agencies.find((a) => a.clientName.toLowerCase() === normNew);
              onChange(newVal, match?.clientLogoUrl || logoUrl);
              setIsOpen(true);
              setFilterMode(true);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              setFilterMode(false);
              if (!isOpen) {
                inputRef.current?.focus();
              }
            }}
            style={{
              position: 'absolute',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              padding: '4px 6px',
              cursor: 'pointer',
              color: 'var(--slate-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
            title={`เลือกหน่วยงานผู้ว่าจ้างจากที่มีอยู่เดิม (${agencies.length} หน่วยงาน)`}
          >
            <ChevronDown
              size={16}
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>
        </div>
      </div>

      {/* Rich Dropdown List with Logos */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--slate-300)',
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.18), 0 4px 10px -2px rgba(15, 23, 42, 0.08)',
            maxHeight: '290px',
            overflowY: 'auto',
          }}
        >
          {/* Header bar */}
          <div
            style={{
              padding: '6px 10px',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid var(--slate-200)',
              fontSize: '0.72rem',
              color: 'var(--slate-600)',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Search size={11} /> รายชื่อหน่วยงานผู้ว่าจ้างที่มีในระบบ ({agencies.length} หน่วยงาน)
            </span>
            <span style={{ color: '#0284C7', fontWeight: 500 }}>คลิกเพื่อเลือกพร้อมโลโก้</span>
          </div>

          {/* Custom typed value option if not in list */}
          {value.trim() !== '' && !isExactMatch && (
            <div
              onClick={() => {
                setIsOpen(false);
                setFilterMode(false);
              }}
              style={{
                padding: '8px 10px',
                borderBottom: '1px solid var(--slate-100)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#F0F9FF',
                fontSize: '0.82rem',
                color: '#0369A1',
                fontWeight: 600,
              }}
            >
              <Plus size={15} />
              <span>ใช้ชื่อหน่วยงานใหม่: &ldquo;{value.trim()}&rdquo;</span>
            </div>
          )}

          {filteredAgencies.map((opt) => {
            const isSelected =
              normalizeClientAgencyName(value).toLowerCase() === opt.clientName.toLowerCase();
            return (
              <div
                key={opt.clientName}
                onClick={() => handleSelectOption(opt)}
                style={{
                  padding: '7px 10px',
                  borderBottom: '1px solid var(--slate-100)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {opt.clientLogoUrl ? (
                    <img
                      src={opt.clientLogoUrl}
                      alt={opt.clientName}
                      style={{
                        width: '40px',
                        height: '34px',
                        objectFit: 'contain',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--slate-200)',
                        borderRadius: '5px',
                        padding: '2px',
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '40px',
                        height: '34px',
                        borderRadius: '5px',
                        backgroundColor: '#F1F5F9',
                        border: '1px solid var(--slate-200)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B',
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={16} />
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#1D4ED8' : 'var(--slate-800)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={opt.clientName}
                    >
                      {opt.clientName}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
                      {opt.projectCount > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>
                          ผลงานเดิม {opt.projectCount} โครงการ
                        </span>
                      )}
                      {opt.clientLogoUrl && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            color: '#15803D',
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '4px',
                            padding: '0px 5px',
                            fontWeight: 600,
                          }}
                        >
                          ✓ มีโลโก้
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <Check size={16} color="#1D4ED8" style={{ flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

