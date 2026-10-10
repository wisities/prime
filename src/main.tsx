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
    localStorage.clear();
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
              borderRadius: '12px',
              padding: '2.5rem',
              maxWidth: '600px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#0F2744', marginBottom: '0.75rem', fontSize: '1.3rem' }}>
              เกิดข้อผิดพลาดในการโหลดข้อมูลเก่าในเบราว์เซอร์
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              ข้อมูลร่างเดิมที่บันทึกไว้ใน LocalStorage มีรูปแบบที่ไม่ตรงกับระบบเวอร์ชันใหม่
              คุณสามารถกดปุ่มด้านล่างเพื่อล้างข้อมูลแคชและโหลดข้อมูลตัวอย่างเริ่มต้น
            </p>
            <button
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
              }}
            >
              🔄 รีเซ็ตแคชและเริ่มใช้งานใหม่
            </button>
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
