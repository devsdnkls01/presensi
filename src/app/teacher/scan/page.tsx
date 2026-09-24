'use client';

import React, { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import { sound } from '@/components/AudioPlayer';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  User,
  School,
  RotateCcw,
  Sparkles,
  Volume2,
  ScanLine,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Check,
  FlipHorizontal,
} from 'lucide-react';

interface ScanResult {
  success: boolean;
  code?: string;
  error?: string;
  status?: 'HADIR' | 'TERLAMBAT';
  time?: string;
  date?: string;
  attendance?: {
    id?: string;
    date?: string;
    time?: string;
    status?: string;
    scannedBy?: string;
  };
  student?: {
    id?: string;
    fullName: string;
    nis: string;
    nisn?: string | null;
    className: string;
    photoUrl?: string | null;
    cardId: string;
    schoolName?: string;
  };
}

export default function TeacherScanPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualToken, setManualToken] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [isMirrored, setIsMirrored] = useState(true);
  const scannerRef = useRef<unknown>(null);

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch((e) => console.error(e));
  }, []);

  // Process token verification & attendance recording
  const processToken = async (tokenStr: string) => {
    if (!tokenStr || isProcessing) return;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenStr,
          deviceInfo: navigator.userAgent.includes('Mobile') ? 'Kamera HP' : 'Webcam Laptop',
        }),
      });

      const data: ScanResult = await res.json();
      setScanResult(data);

      if (res.ok && data.success) {
        sound.playSuccess();
        setRecentScans((prev) => [data, ...prev.slice(0, 7)]);
      } else if (data.code === 'ALREADY_SCANNED') {
        sound.playWarning();
      } else {
        sound.playError();
      }
    } catch (err) {
      console.error('Scan submission error:', err);
      sound.playError();
      setScanResult({
        success: false,
        error: 'Gagal menghubungi server.',
      });
    } finally {
      // Auto-ready for next student scan without reload!
      setTimeout(() => {
        setIsProcessing(false);
      }, 1800);
    }
  };

  // Start html5-qrcode scanner with double-mount protection & optimal performance
  useEffect(() => {
    let isMounted = true;
    let qrScanner: any = null;

    const startScanner = async () => {
      try {
        const container = document.getElementById('qr-reader');
        if (container) {
          container.innerHTML = '';
        }

        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (!isMounted) return;

        // Clean up previous instance if any
        if (scannerRef.current) {
          try {
            await (scannerRef.current as any).stop();
          } catch (e) {}
        }

        qrScanner = new Html5Qrcode('qr-reader', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = qrScanner;

        // Responsive scan box that preserves camera's native aspect ratio
        const qrBoxCalc = (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minEdge * 0.75);
          return {
            width: Math.max(200, Math.min(size, 320)),
            height: Math.max(200, Math.min(size, 320)),
          };
        };

        await qrScanner.start(
          { facingMode: 'environment' },
          {
            fps: 20, // 20 FPS for quick QR detection
            qrbox: qrBoxCalc,
          },
          (decodedText: string) => {
            if (isMounted) {
              processToken(decodedText);
            }
          },
          () => {
            // Frame evaluation callback (no code in frame, continue)
          }
        );

        if (isMounted) {
          setCameraActive(true);
          setCameraError(null);
        } else {
          try {
            await qrScanner.stop();
            qrScanner.clear();
          } catch (e) {}
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Camera start error or permission denied:', err);
        setCameraActive(false);
        setCameraError(
          'Kamera belum aktif atau izin ditolak. Pastikan izin kamera telah diizinkan di browser.'
        );
      }
    };

    const initTimer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      if (qrScanner) {
        try {
          qrScanner.stop().catch(() => {}).then(() => {
            try {
              qrScanner.clear();
            } catch (e) {}
          });
        } catch (e) {}
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken) {
      processToken(manualToken);
      setManualToken('');
    }
  };

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        Memuat sistem presensi...
      </div>
    );
  }

  return (
    <AppLayout user={user}>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Top Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ScanLine size={28} color="var(--primary)" />
              PRESENSI SISWA
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Arahkan QR Code kartu siswa ke kamera untuk mencatat kehadiran otomatis.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <Volume2 size={18} color="#059669" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
              Audio Feedback: <strong>Aktif</strong>
            </span>
          </div>
        </div>

        {/* Main Grid: Camera & Scan Result */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* CAMERA PANEL */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div className="card-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Camera size={20} color="var(--primary)" />
                  Area Kamera Scan
                </div>
                <div className="card-subtitle">
                  Kamera HP atau Webcam Laptop otomatis mendeteksi QR Code
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsMirrored((m) => !m)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    color: isMirrored ? '#0c35a6' : '#475569',
                    backgroundColor: isMirrored ? '#eff6ff' : '#ffffff',
                    border: isMirrored ? '1px solid #bfdbfe' : '1px solid var(--border-subtle)',
                  }}
                  title="Klik untuk membalik arah pandangan kamera (Mirror / Normal)"
                >
                  <FlipHorizontal size={14} />
                  <span>{isMirrored ? 'Arah: Sesuai Gerak' : 'Arah: Lensa Asli'}</span>
                </button>
                {isProcessing && (
                  <span className="badge badge-info" style={{ animation: 'pulse 1s infinite' }}>
                    Memindai...
                  </span>
                )}
              </div>
            </div>

            {/* Global style overrides for html5-qrcode to prevent layout explosion */}
            <style jsx global>{`
              #qr-reader {
                width: 100% !important;
                border: none !important;
                background: transparent !important;
                position: relative !important;
                overflow: hidden !important;
              }
              #qr-reader video {
                width: 100% !important;
                height: 100% !important;
                max-height: 360px !important;
                object-fit: cover !important;
                border-radius: 12px !important;
                display: block !important;
                transform: ${isMirrored ? 'scaleX(-1)' : 'scaleX(1)'} !important;
                transition: transform 0.2s ease !important;
              }
              #qr-reader__scan_region {
                background: transparent !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
              }
              #qr-reader__dashboard,
              #qr-reader__dashboard_section_csr,
              #qr-reader__dashboard_section_swaplink {
                display: none !important;
              }
              @keyframes laserScan {
                0% { top: 10%; opacity: 0.8; }
                50% { top: 85%; opacity: 1; }
                100% { top: 10%; opacity: 0.8; }
              }
            `}</style>

            {/* Video Viewport */}
            <div
              style={{
                position: 'relative',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                backgroundColor: '#0f172a',
                height: '360px',
                maxHeight: '360px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid #334155',
              }}
            >
              <div id="qr-reader" style={{ width: '100%', height: '100%' }} />

              {/* Target Aiming Box with Corner Brackets & Laser Scan */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '220px',
                    height: '220px',
                    position: 'relative',
                  }}
                >
                  {/* Top-Left */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '28px', height: '28px', borderTop: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8', borderTopLeftRadius: '8px' }} />
                  {/* Top-Right */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '28px', height: '28px', borderTop: '3px solid #38bdf8', borderRight: '3px solid #38bdf8', borderTopRightRadius: '8px' }} />
                  {/* Bottom-Left */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '28px', height: '28px', borderBottom: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8', borderBottomLeftRadius: '8px' }} />
                  {/* Bottom-Right */}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderBottom: '3px solid #38bdf8', borderRight: '3px solid #38bdf8', borderBottomRightRadius: '8px' }} />

                  {/* Scanning Laser Beam Line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '8px',
                      right: '8px',
                      height: '2px',
                      background: 'linear-gradient(90deg, transparent 0%, #38bdf8 50%, transparent 100%)',
                      boxShadow: '0 0 10px #38bdf8',
                      animation: 'laserScan 2s infinite ease-in-out',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-28px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(15, 23, 42, 0.85)',
                      color: '#38bdf8',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Arahkan QR ke kotak ini
                  </div>
                </div>
              </div>
            </div>

            {cameraError && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.85rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--warning)' }}>
                {cameraError}
              </div>
            )}

            {/* Manual Token Input Fallback */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Input Manual Token QR:
              </div>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Ketik token QR kartu siswa..."
                  style={{
                    flex: 1,
                    padding: '0.5rem 0.75rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                  }}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Proses
                </button>
              </form>
            </div>
          </div>

          {/* SCAN RESULT DISPLAY */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '440px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Card Header with Status Tag and Reset Action */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>Hasil Pemindaian</span>
                  {scanResult && (
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        letterSpacing: '0.03em',
                        backgroundColor: scanResult.success
                          ? '#dcfce7'
                          : scanResult.code === 'ALREADY_SCANNED'
                          ? '#fef3c7'
                          : '#fee2e2',
                        color: scanResult.success
                          ? '#15803d'
                          : scanResult.code === 'ALREADY_SCANNED'
                          ? '#b45309'
                          : '#b91c1c',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      {scanResult.success ? (
                        <>
                          <Check size={13} strokeWidth={3} />
                          TERVERIFIKASI
                        </>
                      ) : scanResult.code === 'ALREADY_SCANNED' ? (
                        <>
                          <Clock size={13} strokeWidth={2.5} />
                          SUDAH TERCATAT
                        </>
                      ) : (
                        <>
                          <AlertCircle size={13} strokeWidth={2.5} />
                          DITOLAK
                        </>
                      )}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Monitor identitas siswa & status presensi real-time
                </div>
              </div>

              {scanResult && (
                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  title="Bersihkan Tampilan"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* STATE 1: WAITING FOR SCAN */}
            {!scanResult ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'radial-gradient(ellipse at center, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '16px',
                  border: '2px dashed #cbd5e1',
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '20px',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.12)',
                    marginBottom: '1.25rem',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <ScanLine size={40} color="#2563eb" strokeWidth={1.75} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b', marginBottom: '0.35rem' }}>
                  Menunggu Pemindaian Kartu Siswa
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '320px', margin: '0 auto 1.5rem' }}>
                  Arahkan QR Code kartu siswa ke jendela kamera scanner di sebelah kiri.
                </p>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: '#ffffff',
                    padding: '0.4rem 0.9rem',
                    borderRadius: '9999px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.78rem',
                    color: '#15803d',
                    fontWeight: 600,
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                  <span>Kamera aktif memantau presensi</span>
                </div>
              </div>
            ) : scanResult.success ? (
              /* STATE 2: SCAN SUCCESS (HADIR / TERLAMBAT) */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 40%, #ffffff 100%)',
                  borderRadius: '16px',
                  border: '1px solid #86efac',
                  boxShadow: '0 12px 30px -10px rgba(22, 163, 74, 0.15)',
                  padding: '1.5rem',
                  position: 'relative',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                {/* Header Status Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)',
                      }}
                    >
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d' }}>
                        PRESENSI BERHASIL DICATAT
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                        {scanResult.status === 'HADIR' ? 'Hadir Tepat Waktu' : 'Tercatat Terlambat'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#ffffff',
                      padding: '0.4rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #bbf7d0',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                      textAlign: 'right',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Waktu Masuk:</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                      {scanResult.time} WIB
                    </div>
                  </div>
                </div>

                {/* Student Identity Card */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '74px',
                      height: '96px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      backgroundColor: '#f1f5f9',
                      border: '2px solid #22c55e',
                      boxShadow: '0 4px 10px rgba(34, 197, 94, 0.2)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {scanResult.student?.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={scanResult.student.photoUrl}
                        alt={scanResult.student.fullName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <User size={34} color="#94a3b8" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                        }}
                      >
                        {scanResult.student?.className}
                      </span>
                      {scanResult.student?.schoolName && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {scanResult.student.schoolName}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                      {scanResult.student?.fullName}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                      <div>NIS: <strong style={{ color: '#1e293b' }}>{scanResult.student?.nis}</strong></div>
                      {scanResult.student?.nisn && <div>NISN: <strong style={{ color: '#1e293b' }}>{scanResult.student.nisn}</strong></div>}
                    </div>

                    <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      Card ID: {scanResult.student?.cardId}
                    </div>
                  </div>
                </div>

                {/* Ready note footer */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#15803d', fontWeight: 600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                    <span>Kamera otomatis siap membaca kartu berikutnya tanpa reload</span>
                  </div>

                  {scanResult.student?.nis && (
                    <Link
                      href={`/cek-presensi?nis=${scanResult.student.nis}`}
                      target="_blank"
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <span>Lihat Riwayat</span>
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            ) : scanResult.code === 'ALREADY_SCANNED' ? (
              /* STATE 3: ALREADY SCANNED TODAY (PERINGATAN SUDAH PRESENSI) */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 45%, #ffffff 100%)',
                  borderRadius: '16px',
                  border: '1px solid #fcd34d',
                  boxShadow: '0 12px 30px -10px rgba(217, 119, 6, 0.18)',
                  padding: '1.5rem',
                  position: 'relative',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                {/* Header Status Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1.25rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                      }}
                    >
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#b45309' }}>
                        SUDAH PRESENSI HARI INI
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>
                        Peringatan: Pemindaian Ganda Diabaikan
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      background: '#ffffff',
                      color: '#b45309',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #fde68a',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    Status: Sudah Hadir
                  </span>
                </div>

                {/* Student Identity Card */}
                {scanResult.student && (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '14px',
                      padding: '1.25rem',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                      border: '1px solid #fde68a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.25rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <div
                      style={{
                        width: '74px',
                        height: '96px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        backgroundColor: '#f1f5f9',
                        border: '2px solid #f59e0b',
                        boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {scanResult.student.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={scanResult.student.photoUrl}
                          alt={scanResult.student.fullName}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <User size={34} color="#94a3b8" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                          }}
                        >
                          {scanResult.student.className}
                        </span>
                        {scanResult.student.schoolName && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                            }}
                          >
                            {scanResult.student.schoolName}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
                        {scanResult.student.fullName}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        <div>NIS: <strong style={{ color: '#1e293b' }}>{scanResult.student.nis}</strong></div>
                        {scanResult.student.nisn && <div>NISN: <strong style={{ color: '#1e293b' }}>{scanResult.student.nisn}</strong></div>}
                      </div>

                      <div style={{ fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                        Card ID: {scanResult.student.cardId}
                      </div>
                    </div>
                  </div>
                )}

                {/* Prior Attendance Details Box */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    border: '1px solid #fed7aa',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9a3412', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={14} />
                    <span>Catatan Presensi Sebelumnya Hari Ini:</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Waktu Masuk:</span>{' '}
                      <strong style={{ fontFamily: 'monospace', color: '#0f172a' }}>
                        {scanResult.attendance?.time || scanResult.time || 'Tercatat'} WIB
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Status:</span>{' '}
                      <strong style={{ color: scanResult.attendance?.status === 'HADIR' ? '#16a34a' : '#ea580c' }}>
                        {scanResult.attendance?.status || 'HADIR'}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Petugas:</span>{' '}
                      <strong style={{ color: '#0f172a' }}>
                        {scanResult.attendance?.scannedBy || user.name}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Ready note footer */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.78rem',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b45309', fontWeight: 600 }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b', display: 'inline-block' }} />
                    <span>Kamera otomatis siap membaca kartu berikutnya tanpa reload</span>
                  </div>

                  {scanResult.student?.nis && (
                    <Link
                      href={`/cek-presensi?nis=${scanResult.student.nis}`}
                      target="_blank"
                      style={{
                        color: '#2563eb',
                        textDecoration: 'none',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <span>Lihat Riwayat</span>
                      <ExternalLink size={12} />
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              /* STATE 4: ERROR STATE (UNREGISTERED / INACTIVE / WRONG SCHOOL / NETWORK) */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 40%, #ffffff 100%)',
                  borderRadius: '16px',
                  border: '1px solid #fca5a5',
                  boxShadow: '0 12px 30px -10px rgba(220, 38, 38, 0.15)',
                  padding: '1.5rem',
                  position: 'relative',
                  animation: 'fadeIn 0.3s ease',
                }}
              >
                {/* Header Status Banner */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                    }}
                  >
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#b91c1c' }}>
                      KARTU TIDAK DAPAT DIPROSES
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>
                      {scanResult.error || 'Terjadi kesalahan saat memverifikasi kartu.'}
                    </div>
                  </div>
                </div>

                {/* Student Info if Available */}
                {scanResult.student && (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      padding: '1rem',
                      border: '1px solid #fecaca',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      {scanResult.student.fullName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>
                      {scanResult.student.className} • NIS: {scanResult.student.nis} • Card ID: {scanResult.student.cardId}
                    </div>
                  </div>
                )}

                {/* Explanation guidance */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    border: '1px solid #f1f5f9',
                    fontSize: '0.8rem',
                    color: '#475569',
                    lineHeight: '1.4',
                    marginBottom: '1rem',
                  }}
                >
                  <strong>Panduan:</strong>{' '}
                  {scanResult.code === 'UNREGISTERED'
                    ? 'Pastikan QR code berasal dari kartu resmi SmartSiswa yang telah diaktifkan oleh Developer Pusat.'
                    : scanResult.code === 'INACTIVE'
                    ? 'Kartu ini sudah dinonaktifkan (misal karena dilaporkan hilang). Ajukan kartu baru pada Admin Sekolah.'
                    : scanResult.code === 'WRONG_SCHOOL'
                    ? 'Siswa ini terdaftar di sekolah lain dan tidak dapat melakukan presensi di sekolah ini.'
                    : 'Silakan periksa kembali kartu siswa atau coba scan ulang.'}
                </div>

                {/* Ready note footer */}
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#b91c1c', fontSize: '0.78rem', fontWeight: 600 }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                  <span>Kamera otomatis siap membaca kartu berikutnya</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RECENT SCANS TABLE */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ fontSize: '1rem' }}>Presensi Terkini Hari Ini</div>
              <div className="card-subtitle">Riwayat pemindaian siswa yang baru saja tercatat</div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Jam</th>
                  <th>Nama Siswa</th>
                  <th>Kelas</th>
                  <th>NIS</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                      Belum ada presensi yang dipindai pada sesi ini.
                    </td>
                  </tr>
                ) : (
                  recentScans.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.time}</td>
                      <td style={{ fontWeight: 700 }}>{item.student?.fullName}</td>
                      <td>{item.student?.className}</td>
                      <td>{item.student?.nis}</td>
                      <td>
                        <span className={`badge ${item.status === 'HADIR' ? 'badge-success' : 'badge-warning'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
