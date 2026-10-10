import React from 'react';
import { ShieldAlert, LogOut, Mail, HelpCircle } from 'lucide-react';

interface AccessDeniedPageProps {
  userEmail: string;
  onSignOut: () => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ userEmail, onSignOut }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        backgroundImage: 'radial-gradient(circle at 50% 25%, #1E293B 0%, #0F172A 70%)',
        padding: '1.5rem',
        fontFamily: "'Prompt', 'Sarabun', sans-serif',",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FEE2E2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
          }}
        >
          <ShieldAlert size={36} color="#DC2626" />
        </div>

        <h1
          style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            color: '#0F2744',
            marginBottom: '0.5rem',
          }}
        >
          ไม่มีสิทธิ์เข้าใช้งานระบบ
        </h1>

        <p
          style={{
            fontSize: '0.875rem',
            color: '#64748B',
            marginBottom: '1.25rem',
            lineHeight: 1.5,
          }}
        >
          บัญชีของคุณยังไม่ได้รับการอนุญาตสิทธิ์เข้าใช้งานในระบบ Prime Proposal
        </p>

        {/* Current User Email Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            color: '#334155',
            fontWeight: 600,
            wordBreak: 'break-all',
          }}
        >
          <Mail size={16} color="#64748B" />
          <span>{userEmail}</span>
        </div>

        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            fontSize: '0.8rem',
            color: '#92400E',
            textAlign: 'left',
            marginBottom: '2rem',
            display: 'flex',
            gap: '0.5rem',
          }}
        >
          <HelpCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>คำแนะนำ:</strong> กรุณาแจ้งอีเมลด้านบนแก่ผู้ดูแลระบบ (Admin) เพื่อทำการเพิ่มสิทธิ์เข้าใช้งานในเมนู <strong>"จัดการสิทธิ์"</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            backgroundColor: '#0F2744',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1E3A8A')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0F2744')}
        >
          <LogOut size={16} />
          <span>ออกจากระบบ / สลับบัญชีอื่น</span>
        </button>
      </div>
    </div>
  );
};
