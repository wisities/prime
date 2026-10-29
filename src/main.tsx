import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      const gasUrl = localStorage.getItem('prime_google_apps_script_url');
      const geminiKey = localStorage.getItem('prime_gemini_api_key');
      localStorage.clear();
      sessionStorage.clear();
      if (gasUrl) localStorage.setItem('prime_google_apps_script_url', gasUrl);
      if (geminiKey) localStorage.setItem('prime_gemini_api_key', geminiKey);
    } catch {}
    window.location.reload();
  };

  handleDeepReset = async () => {
    try {
      const gasUrl = localStorage.getItem('prime_google_apps_script_url');
      const geminiKey = localStorage.getItem('prime_gemini_api_key');
      localStorage.clear();
      sessionStorage.clear();
      if (gasUrl) localStorage.setItem('prime_google_apps_script_url', gasUrl);
      if (geminiKey) localStorage.setItem('prime_gemini_api_key', geminiKey);
    } catch {}

    if (typeof window !== 'undefined' && window.indexedDB) {
      try {
        if (window.indexedDB.databases) {
          const dbs = await window.indexedDB.databases();
          for (const db of dbs) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        }
      } catch {}

      const knownDbs = [
        'PrimeLocalDataStore_v2',
        'PrimeProposalAttachmentsDB',
        'PrimeLocalDatabase_v1',
        'PrimeLocalDataStore_v1',
      ];
      knownDbs.forEach((name) => {
        try {
          window.indexedDB.deleteDatabase(name);
        } catch {}
      });
    }

    setTimeout(() => {
      window.location.reload();
    }, 350);
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            backgroundColor: '#F8FAFC',
            fontFamily: "'Prompt', sans-serif",
            textAlign: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '2.5rem',
              maxWidth: '660px',
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: '2.75rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#0F2744', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 700 }}>
              เกิดข้อผิดพลาดในการโหลดข้อมูล (Out of Memory หรือรูปแบบข้อมูลเก่า)
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              ตรวจพบข้อมูลเก่าหรือไฟล์แนบสะสมขนาดใหญ่ในฐานข้อมูลเบราว์เซอร์ (IndexedDB/LocalStorage)
              กรุณากดปุ่ม <strong>"ล้างแคชสมบูรณ์และคืน RAM"</strong> เพื่อล้างไฟล์ตกค้างและเริ่มต้นใช้งานระบบใหม่อย่างราบรื่น
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  backgroundColor: '#0F2744',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(15,39,68,0.2)',
                }}
              >
                🔁 ลองโหลดใหม่
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(217,119,6,0.2)',
                }}
              >
                🔄 รีเซ็ตแคช LocalStorage
              </button>
              <button
                type="button"
                onClick={this.handleDeepReset}
                style={{
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(220,38,38,0.2)',
                }}
                title="ล้างข้อมูลทั้ง LocalStorage และ IndexedDB คืนพื้นที่ RAM ทั้งหมด 100%"
              >
                🧹 ล้างแคชสมบูรณ์และคืน RAM (ล้าง IndexedDB)
              </button>
            </div>
            {this.state.error && (
              <details style={{ marginTop: '1.75rem', textAlign: 'left', backgroundColor: '#F1F5F9', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.8rem', color: '#475569' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>ดูรายละเอียดข้อผิดพลาด (Technical Details)</summary>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                  {this.state.error.toString()}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
