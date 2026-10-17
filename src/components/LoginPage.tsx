import React, { useState, useEffect } from 'react';
import { signInWithGoogle } from '../services/authService';
import { ShieldCheck, Lock, AlertCircle, HelpCircle, ArrowRight, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface LoginPageProps {
  onBypassOffline?: () => void;
  isSupabaseReady: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({ isSupabaseReady, onBypassOffline }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[] | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(true);

  // ตรวจสอบ Error parameter ที่ส่งกลับมาจาก Supabase / Google OAuth ใน URL
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      
      const error = searchParams.get('error') || hashParams.get('error');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');

      if (error || errorDescription) {
        const decoded = decodeURIComponent(errorDescription || error || 'เกิดข้อผิดพลาดในการยืนยันตัวตน').replace(/\+/g, ' ');
        setErrorMsg(decoded);

        if (
          decoded.includes('user profile') ||
          decoded.includes('external provider') ||
          error === 'server_error' ||
          errorCode === 'unexpected_failure'
        ) {
          setErrorDetails([
            'Google OAuth Consent Screen: ยังไม่ได้เพิ่ม Scope (email, profile, openid)',
            'Publishing status ของ Google App ยังเป็น "Testing": ผู้ใช้ต้องถูกเพิ่มในรายชื่อ "Test users" ใน Google Cloud Console หรือต้องคลิก "Publish App"',
            'Google People API: ยังไม่ได้เปิดใช้งาน (Enable) ใน Google Cloud Console',
            'Redirect URI ใน Google Console ต้องระบุเป็น Supabase Callback URL: https://<project-ref>.supabase.co/auth/v1/callback',
            'Client ID หรือ Client Secret ใน Supabase Dashboard (Authentication > Providers > Google) ไม่ตรงกับใน Google Console',
          ]);
        }
      }
    } catch {}
  }, []);

  const handleClearErrorAndRetry = () => {
    setErrorMsg(null);
    setErrorDetails(null);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setErrorDetails(null);
    window.history.replaceState({}, document.title, window.location.pathname);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setErrorMsg(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง');
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B192C',
        backgroundImage: 'radial-gradient(circle at 50% 20%, #1E3E62 0%, #0B192C 70%)',
        padding: '1.5rem',
        fontFamily: "'Prompt', 'Sarabun', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
        }}
      >
        {/* Logo / Badge */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: '#0F2744',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
            boxShadow: '0 8px 16px rgba(15, 39, 68, 0.25)',
          }}
        >
          <ShieldCheck size={36} color="#F1B844" />
        </div>

        {/* System Title */}
        <h1
          style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#0F2744',
            marginBottom: '0.4rem',
            letterSpacing: '-0.01em',
          }}
        >
          Prime Proposal System
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#64748B',
            marginBottom: '2rem',
            lineHeight: 1.5,
          }}
        >
          ระบบจัดทำและบริหารจัดการเอกสารข้อเสนอด้านเทคนิค<br />
          บริษัท ไพร์มดิจิทัลคอนซัลแทนท์ จำกัด
        </p>

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              textAlign: 'left',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <strong style={{ fontSize: '0.85rem' }}>พบข้อผิดพลาดจาก Google OAuth</strong>
              </div>
              <button
                type="button"
                onClick={handleClearErrorAndRetry}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                }}
              >
                <RefreshCw size={12} /> ล้างข้อความ
              </button>
            </div>

            <p style={{ margin: '0.4rem 0 0 0', lineHeight: 1.4 }}>{errorMsg}</p>

            {errorDetails && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #FCA5A5' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.785rem',
                    color: '#7F1D1D',
                  }}
                  onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HelpCircle size={14} /> สาเหตุและวิธีตรวจสอบใน Google Console & Supabase
                  </span>
                  {showTroubleshoot ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {showTroubleshoot && (
                  <ul style={{ margin: '0.4rem 0 0 1.1rem', padding: 0, fontSize: '0.75rem', lineHeight: 1.5, color: '#7F1D1D' }}>
                    {errorDetails.map((detail, idx) => (
                      <li key={idx} style={{ marginTop: '3px' }}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* Google OAuth Login Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || !isSupabaseReady}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #CBD5E1',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            color: '#1E293B',
            cursor: isLoading || !isSupabaseReady ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            opacity: isLoading || !isSupabaseReady ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading && isSupabaseReady) {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
              e.currentTarget.style.borderColor = '#94A3B8';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && isSupabaseReady) {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
              e.currentTarget.style.borderColor = '#CBD5E1';
            }
          }}
        >
          {/* Official Google 'G' Icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span>{isLoading ? 'กำลังเชื่อมต่อกับ Google...' : 'เข้าสู่ระบบด้วย Google (Gmail)'}</span>
        </button>

        {/* Emergency Bypass Button if OAuth is experiencing configuration issues */}
        {onBypassOffline && (
          <div style={{ marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onBypassOffline}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1.5px dashed #F59E0B',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#B45309',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
              }}
              title="เข้าใช้งานระบบทันทีโดยไม่ผ่าน Google OAuth เพื่อไม่ให้การทำงานสะดุด"
            >
              <span>เข้าใช้งานระบบชั่วคราว (โหมดฉุกเฉิน / Bypass)</span>
              <ArrowRight size={15} />
            </button>
            <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.35rem', margin: '4px 0 0 0' }}>
              * ข้อมูลโครงการและการบันทึกร่างทั้งหมดจะถูกเก็บในเครื่อง (IndexedDB) ปลอดภัย 100%
            </p>
          </div>
        )}

        {!isSupabaseReady && (
          <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '0.75rem' }}>
            ⚠️ ยังไม่ได้ตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY
          </p>
        )}

        {/* Security & Whitelist Notice */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            textAlign: 'left',
          }}
        >
          <Lock size={16} color="#64748B" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.775rem', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
            <strong>การจัดการสิทธิ์การเข้าใช้งาน:</strong> เฉพาะบัญชี Gmail ที่ได้รับอนุญาตและเพิ่มสิทธิ์ไว้ในระบบแล้วเท่านั้นจึงจะสามารถเข้าถึงข้อมูลโครงการได้
          </p>
        </div>
      </div>
    </div>
  );
};
