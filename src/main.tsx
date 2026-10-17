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
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
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
              maxWidth: '640px',
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: '2.75rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#0F2744', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 700 }}>
              เกิดข้อผิดพลาดในการโหลดข้อมูลในเบราว์เซอร์
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.92rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              ข้อมูลร่างเดิมบางส่วนในเบราว์เซอร์อาจมีรูปแบบที่ไม่ตรงกับระบบเวอร์ชันปัจจุบัน
              คุณสามารถกดปุ่มลองโหลดใหม่ หรือกดรีเซ็ตแคชเพื่อเริ่มใช้งานใหม่ได้อย่างปลอดภัย
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
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(15,39,68,0.2)',
                }}
              >
                🔁 ลองโหลดหน้าใหม่อีกครั้ง
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#D97706',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(217,119,6,0.2)',
                }}
              >
                🔄 รีเซ็ตแคชและเริ่มใช้งานใหม่
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
