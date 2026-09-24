'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

export interface DetailItem {
  label: string;
  value: string;
  copyable?: boolean;
}

export interface ModalAlertOptions {
  type?: NotificationType;
  title: string;
  message: string;
  details?: DetailItem[];
  confirmText?: string;
  onConfirm?: () => void;
}

export interface ModalConfirmOptions {
  type?: NotificationType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface NotificationContextType {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
  showAlert: (options: ModalAlertOptions) => void;
  showConfirm: (options: ModalConfirmOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [alertModal, setAlertModal] = useState<ModalAlertOptions | null>(null);
  const [confirmModal, setConfirmModal] = useState<ModalConfirmOptions | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const addToast = useCallback(
    (type: NotificationType, title: string, message?: string, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title: string, message?: string, duration?: number) =>
      addToast('success', title, message, duration),
    error: (title: string, message?: string, duration?: number) =>
      addToast('error', title, message, duration),
    warning: (title: string, message?: string, duration?: number) =>
      addToast('warning', title, message, duration),
    info: (title: string, message?: string, duration?: number) =>
      addToast('info', title, message, duration),
  };

  const showAlert = useCallback((options: ModalAlertOptions) => {
    setAlertModal(options);
  }, []);

  const showConfirm = useCallback((options: ModalConfirmOptions) => {
    setConfirmModal(options);
  }, []);

  // Intercept native window.alert as fallback so no native browser popup ever appears
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (msg?: any) => {
        const text = String(msg || '');
        if (text.toLowerCase().includes('berhasil') || text.toLowerCase().includes('sukses')) {
          showAlert({
            type: 'success',
            title: 'Pemberitahuan Berhasil',
            message: text,
          });
        } else if (text.toLowerCase().includes('gagal') || text.toLowerCase().includes('error')) {
          showAlert({
            type: 'error',
            title: 'Terjadi Kesalahan',
            message: text,
          });
        } else {
          showAlert({
            type: 'info',
            title: 'Informasi',
            message: text,
          });
        }
      };

      return () => {
        window.alert = originalAlert;
      };
    }
  }, [showAlert]);

  const handleCopy = (text: string, key: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  return (
    <NotificationContext.Provider value={{ toast, showAlert, showConfirm }}>
      {children}

      {/* Modern Floating Toast Notification Stack */}
      <div
        style={{
          position: 'fixed',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '440px',
          width: 'calc(100% - 2.5rem)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          let accentGradient = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
          let glowColor = 'rgba(16, 185, 129, 0.25)';
          let badgeBg = 'rgba(16, 185, 129, 0.12)';
          let badgeBorder = 'rgba(16, 185, 129, 0.3)';
          let badgeText = '#059669';
          let IconComp = CheckCircle2;

          if (t.type === 'error') {
            accentGradient = 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
            glowColor = 'rgba(239, 68, 68, 0.28)';
            badgeBg = 'rgba(239, 68, 68, 0.12)';
            badgeBorder = 'rgba(239, 68, 68, 0.3)';
            badgeText = '#dc2626';
            IconComp = AlertCircle;
          } else if (t.type === 'warning') {
            accentGradient = 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)';
            glowColor = 'rgba(245, 158, 11, 0.25)';
            badgeBg = 'rgba(245, 158, 11, 0.12)';
            badgeBorder = 'rgba(245, 158, 11, 0.3)';
            badgeText = '#d97706';
            IconComp = AlertTriangle;
          } else if (t.type === 'info') {
            accentGradient = 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)';
            glowColor = 'rgba(56, 189, 248, 0.25)';
            badgeBg = 'rgba(56, 189, 248, 0.12)';
            badgeBorder = 'rgba(56, 189, 248, 0.3)';
            badgeText = '#0284c7';
            IconComp = Info;
          }

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: 'auto',
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '16px',
                padding: '1rem 1.15rem',
                boxShadow: `0 20px 35px -8px rgba(15, 23, 42, 0.18), 0 0 25px ${glowColor}`,
                border: '1px solid rgba(226, 232, 240, 0.9)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                position: 'relative',
                overflow: 'hidden',
                animation: 'toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              }}
            >
              {/* Left Accent Glow Bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '4px',
                  background: accentGradient,
                }}
              />

              {/* Glowing Icon Badge */}
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: badgeBg,
                  border: `1px solid ${badgeBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${glowColor}`,
                }}
              >
                <IconComp size={20} color={badgeText} />
              </div>

              {/* Text Information */}
              <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    lineHeight: 1.3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <span>{t.title}</span>
                </div>
                {t.message && (
                  <div
                    style={{
                      fontSize: '0.825rem',
                      color: '#475569',
                      marginTop: '0.25rem',
                      lineHeight: 1.45,
                    }}
                  >
                    {t.message}
                  </div>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: '4px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={16} />
              </button>

              {/* Countdown Progress Bar */}
              {t.duration && t.duration > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '3px',
                    background: accentGradient,
                    width: '100%',
                    animation: `toastProgress ${t.duration}ms linear forwards`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Modern Ultra-Premium Alert Modal */}
      {alertModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(5, 12, 30, 0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'modalBackdropFade 0.2s ease-out',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '490px',
              width: '100%',
              padding: '2.25rem 2rem 1.75rem',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 35px rgba(12, 53, 166, 0.15)',
              textAlign: 'center',
              animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              border: '1px solid rgba(226, 232, 240, 0.8)',
            }}
          >
            {/* Glowing Icon Badge with Halo */}
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                margin: '0 auto 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  alertModal.type === 'error'
                    ? '#fee2e2'
                    : alertModal.type === 'warning'
                    ? '#fef3c7'
                    : alertModal.type === 'info'
                    ? '#e0f2fe'
                    : '#dcfce7',
                border:
                  alertModal.type === 'error'
                    ? '2px solid #fecaca'
                    : alertModal.type === 'warning'
                    ? '2px solid #fde68a'
                    : alertModal.type === 'info'
                    ? '2px solid #bae6fd'
                    : '2px solid #bbf7d0',
                boxShadow:
                  alertModal.type === 'error'
                    ? '0 0 25px rgba(220, 38, 38, 0.25)'
                    : alertModal.type === 'warning'
                    ? '0 0 25px rgba(217, 119, 6, 0.25)'
                    : alertModal.type === 'info'
                    ? '0 0 25px rgba(2, 132, 199, 0.25)'
                    : '0 0 25px rgba(5, 150, 105, 0.25)',
              }}
            >
              {alertModal.type === 'error' ? (
                <AlertCircle size={34} color="#dc2626" />
              ) : alertModal.type === 'warning' ? (
                <AlertTriangle size={34} color="#d97706" />
              ) : alertModal.type === 'info' ? (
                <Info size={34} color="#0284c7" />
              ) : (
                <CheckCircle2 size={34} color="#059669" />
              )}
            </div>

            <h3
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '0.5rem',
                letterSpacing: '-0.02em',
              }}
            >
              {alertModal.title}
            </h3>

            <p
              style={{
                fontSize: '0.9rem',
                color: '#475569',
                lineHeight: 1.55,
                marginBottom: '1.5rem',
              }}
            >
              {alertModal.message}
            </p>

            {/* Optional Structured Details Box */}
            {alertModal.details && alertModal.details.length > 0 && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  textAlign: 'left',
                }}
              >
                {alertModal.details.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.825rem',
                    }}
                  >
                    <span style={{ color: '#64748b', fontWeight: 600 }}>{item.label}:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700,
                          color: '#0c35a6',
                          backgroundColor: '#eff6ff',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        {item.value}
                      </span>
                      {item.copyable && (
                        <button
                          type="button"
                          onClick={() => handleCopy(item.value, `${idx}-${item.value}`)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedKey === `${idx}-${item.value}` ? '#059669' : '#94a3b8',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Salin ke clipboard"
                        >
                          {copiedKey === `${idx}-${item.value}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (alertModal.onConfirm) alertModal.onConfirm();
                setAlertModal(null);
              }}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.8rem 1.5rem',
                fontSize: '0.925rem',
                fontWeight: 700,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0c35a6 0%, #0284c7 100%)',
                boxShadow: '0 4px 15px rgba(12, 53, 166, 0.35)',
              }}
            >
              {alertModal.confirmText || 'Selesai & Mengerti'}
            </button>
          </div>
        </div>
      )}

      {/* Modern Ultra-Premium Confirm Modal */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            backgroundColor: 'rgba(5, 12, 30, 0.72)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            animation: 'modalBackdropFade 0.2s ease-out',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '470px',
              width: '100%',
              padding: '2.25rem 2rem 1.75rem',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35), 0 0 35px rgba(220, 38, 38, 0.15)',
              textAlign: 'center',
              animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                margin: '0 auto 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: confirmModal.type === 'error' ? '#fee2e2' : '#fef3c7',
                border: confirmModal.type === 'error' ? '2px solid #fecaca' : '2px solid #fde68a',
                boxShadow:
                  confirmModal.type === 'error'
                    ? '0 0 25px rgba(220, 38, 38, 0.25)'
                    : '0 0 25px rgba(217, 119, 6, 0.25)',
              }}
            >
              {confirmModal.type === 'error' ? (
                <AlertCircle size={34} color="#dc2626" />
              ) : (
                <AlertTriangle size={34} color="#d97706" />
              )}
            </div>

            <h3
              style={{
                fontSize: '1.3rem',
                fontWeight: 800,
                color: '#0f172a',
                marginBottom: '0.5rem',
                letterSpacing: '-0.02em',
              }}
            >
              {confirmModal.title}
            </h3>

            <p
              style={{
                fontSize: '0.9rem',
                color: '#475569',
                lineHeight: 1.55,
                marginBottom: '1.75rem',
              }}
            >
              {confirmModal.message}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                  setConfirmModal(null);
                }}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '12px', fontWeight: 600 }}
              >
                {confirmModal.cancelText || 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`btn ${confirmModal.type === 'error' ? 'btn-danger' : 'btn-primary'}`}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  fontWeight: 700,
                  borderRadius: '12px',
                  background:
                    confirmModal.type === 'error'
                      ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                      : 'linear-gradient(135deg, #0c35a6 0%, #0284c7 100%)',
                  boxShadow:
                    confirmModal.type === 'error'
                      ? '0 4px 15px rgba(220, 38, 38, 0.35)'
                      : '0 4px 15px rgba(12, 53, 166, 0.35)',
                }}
              >
                {confirmModal.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
