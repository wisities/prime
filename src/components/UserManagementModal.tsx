import React, { useState, useEffect } from 'react';
import {
  fetchAllowedUsers,
  addAllowedUser,
  removeAllowedUser,
  AllowedUser,
} from '../services/authService';
import { Users, UserPlus, Trash2, X, ShieldCheck, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
}) => {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setMessage(null);
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAllowedUsers();
      setUsers(list);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsLoading(true);
    setMessage(null);

    const res = await addAllowedUser(newEmail.trim(), newName.trim(), currentUserEmail || 'Admin');
    if (res.success) {
      setMessage({ type: 'success', text: `เพิ่มสิทธิ์ให้ ${newEmail.trim().toLowerCase()} เรียบร้อยแล้ว` });
      setNewEmail('');
      setNewName('');
      await loadUsers();
    } else {
      setMessage({ type: 'error', text: res.message || 'ไม่สามารถเพิ่มผู้ใช้งานได้' });
    }
    setIsLoading(false);
  };

  const handleRemoveUser = async (email: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการถอนสิทธิ์ของ ${email}?`)) {
      setIsLoading(true);
      await removeAllowedUser(email);
      setMessage({ type: 'success', text: `ถอนสิทธิ์ของ ${email} เรียบร้อยแล้ว` });
      await loadUsers();
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#0F2744',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} color="#F1B844" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--primary-900)', margin: 0 }}>
                การจัดการสิทธิ์เข้าใช้งานระบบ (User Access Control)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', margin: 0 }}>
                กำหนดบัญชี Gmail ที่ได้รับอนุญาตให้เข้าใช้งานระบบจัดทำข้อเสนอโครงการ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: 'var(--slate-400)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Notification Alert */}
          {message && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${message.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
                color: message.type === 'success' ? '#166534' : '#991B1B',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Form to Add Allowed Gmail */}
          <form
            onSubmit={handleAddUser}
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#0F2744',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <UserPlus size={16} color="#1E3A8A" />
              เพิ่มสิทธิ์บัญชี Gmail ใหม่
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '0.65rem', alignItems: 'center' }}>
              <div>
                <input
                  type="email"
                  placeholder="ตัวอย่าง: user@gmail.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="ชื่อผู้ใช้งาน / บทบาท (ระบุหรือไม่ก็ได้)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                  style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                >
                  <UserPlus size={15} />
                  <span>เพิ่มสิทธิ์</span>
                </button>
              </div>
            </div>
          </form>

          {/* Allowed Users List Table */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', margin: 0 }}>
              รายชื่อผู้ได้รับสิทธิ์ทั้งหมด ({users.length} บัญชี)
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
              * ทุกคนในรายการนี้มีสิทธิ์เข้าถึงและใช้งานระบบได้เท่าเทียมกัน
            </span>
          </div>

          <div
            style={{
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              overflow: 'hidden',
              maxHeight: '320px',
              overflowY: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#0F2744', color: '#FFFFFF', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>อีเมล Gmail ที่ได้รับสิทธิ์</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>ชื่อ / รายละเอียด</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center' }}>วันที่เพิ่ม</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'center', width: '70px' }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                      ยังไม่มีรายชื่อผู้ได้รับสิทธิ์ (กรุณาเพิ่มบัญชี Gmail ด้านบน)
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => {
                    const isSelf = currentUserEmail && u.email.toLowerCase() === currentUserEmail.toLowerCase();
                    return (
                      <tr
                        key={u.id || idx}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                          borderBottom: '1px solid #E2E8F0',
                        }}
                      >
                        <td style={{ padding: '8px 12px', fontWeight: 500, color: '#0F2744' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Mail size={15} color="#3B82F6" />
                            <span>{u.email}</span>
                            {isSelf && (
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  backgroundColor: '#E0E7FF',
                                  color: '#3730A3',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 600,
                                }}
                              >
                                บัญชีปัจจุบัน
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', color: '#475569' }}>
                          {u.name || '-'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                          {new Date(u.createdAt).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveUser(u.email)}
                            title="ลบสิทธิ์"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '4px',
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748B' }}>
            <ShieldCheck size={16} color="#10B981" />
            <span>ระบบตรวจสอบสิทธิ์แบบอัตโนมัติทุกครั้งที่เข้าสู่ระบบ</span>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
