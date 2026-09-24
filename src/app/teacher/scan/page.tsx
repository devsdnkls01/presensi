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

  // Synchronous locks & token tracking (immune to asynchronous React closures)
  const scannerRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const lastScannedTokenRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const studentCacheRef = useRef<Map<string, any>>(new Map());

  // Load client cached data after hydration to prevent React error #418 & #425
  useEffect(() => {
    try {
      const cached = localStorage.getItem('smartsiswa_user');
      if (cached) setUser(JSON.parse(cached));
      const cachedScans = localStorage.getItem('smartsiswa_recent_scans');
      if (cachedScans) setRecentScans(JSON.parse(cachedScans));
    } catch (e) {}
  }, []);

  // Pre-load student card cache for 0ms instant scan recognition
  useEffect(() => {
    fetch('/api/school/cards?status=AKTIF')
      .then((res) => res.json())
      .then((data) => {
        if (data.cards && Array.isArray(data.cards)) {
          const map = new Map();
          data.cards.forEach((c: any) => {
            if (c.qrToken?.token) map.set(c.qrToken.token, c.student);
            if (c.cardId) map.set(c.cardId, c.student);
            if (c.student?.nis) map.set(c.student.nis, c.student);
          });
          studentCacheRef.current = map;
        }
      })
      .catch(() => {});
  }, [user?.schoolId]);

  // Fetch current user & keep local cache fresh
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          try {
            localStorage.setItem('smartsiswa_user', JSON.stringify(data.user));
          } catch (e) {}
        }
      })
      .catch((e) => console.error(e));
  }, []);

  // Process token verification & attendance recording with hardware lock & anti-repeat
  const processToken = async (tokenStr: string, isManual = false) => {
    const trimmed = (tokenStr || '').trim();
    if (!trimmed) return;

    const now = Date.now();

    // 1. Thread-safe lock: drop frame immediately if already processing
    if (isProcessingRef.current) return;

    // 2. Anti-repeat check: ignore exact same token within 10 seconds to prevent repeated scans for the same child
    if (!isManual && trimmed === lastScannedTokenRef.current && (now - lastScannedTimeRef.current < 10000)) {
      return;
    }

    // 3. Minimum cooldown between ANY two scans: 1.2s to prevent jitter
    if (!isManual && (now - lastScannedTimeRef.current < 1200)) {
      return;
    }

    // Immediately acquire lock & record token
    isProcessingRef.current = true;
    lastScannedTokenRef.current = trimmed;
    lastScannedTimeRef.current = now;
    setIsProcessing(true);

    // Pause camera scanning immediately so it stops decoding frames and frees up CPU
    try {
      if (scannerRef.current && (scannerRef.current as any).getState?.() === 2) {
        (scannerRef.current as any).pause(true);
      }
    } catch (e) {
      console.warn('Camera pause error:', e);
    }

    // 0ms Instant optimistic display from browser cache if available
    const cachedStudent = studentCacheRef.current.get(trimmed);
    if (cachedStudent) {
      setScanResult({
        success: true,
        code: 'SUCCESS',
        status: 'HADIR',
        time: 'Memverifikasi...',
        student: {
          id: cachedStudent.id,
          fullName: cachedStudent.fullName,
          nis: cachedStudent.nis,
          nisn: cachedStudent.nisn,
          className: cachedStudent.classRoom?.name || '',
          photoUrl: cachedStudent.photoUrl,
          cardId: cachedStudent.cardId || '',
          schoolName: cachedStudent.school?.name,
        },
      });
    }

    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: trimmed,
          deviceInfo: navigator.userAgent.includes('Mobile') ? 'Kamera HP' : 'Webcam Laptop',
        }),
      });

      const data: ScanResult = await res.json();
      setScanResult(data);

      if (res.ok && data.success) {
        sound.playSuccess();
        setRecentScans((prev) => {
          const updated = [data, ...prev.slice(0, 7)];
          try {
            localStorage.setItem('smartsiswa_recent_scans', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
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
      // Auto-ready for NEXT student scan after 1.6s cooldown
      setTimeout(() => {
        // Resume scanner if it was paused
        try {
          if (scannerRef.current && (scannerRef.current as any).getState?.() === 3) {
            (scannerRef.current as any).resume();
          }
        } catch (e) {
          console.warn('Camera resume error:', e);
        }
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 1600);
    }
  };

  // Safe camera starter that adheres strictly to Html5Qrcode constraints
  const startScanner = async () => {
    try {
      setCameraError(null);

      // Wait until #qr-reader element is guaranteed to be in DOM
      let attempts = 0;
      while (!document.getElementById('qr-reader') && attempts < 30) {
        await new Promise((r) => setTimeout(r, 60));
        attempts++;
      }

      const container = document.getElementById('qr-reader');
      if (!container) return;

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      // Safely stop and clear previous scanner instance
      if (scannerRef.current) {
        try {
          const currentScanner: any = scannerRef.current;
          if (currentScanner.isScanning) {
            await currentScanner.stop();
          }
        } catch (e) {}
        try {
          (scannerRef.current as any).clear();
        } catch (e) {}
        scannerRef.current = null;
      }

      container.innerHTML = '';

      const qrScanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });
      scannerRef.current = qrScanner;

      const qrBoxCalc = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const size = Math.floor(minEdge * 0.72);
        const clamped = Math.max(180, Math.min(size, 280));
        return {
          width: clamped,
          height: clamped,
        };
      };

      const scanSuccessCallback = (decodedText: string) => {
        processToken(decodedText);
      };

      // Determine camera configuration
      // Html5Qrcode requires cameraIdOrConfig to be either a string ID or an object with EXACTLY 1 key.
      let cameraConfig: any = { facingMode: 'environment' };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const backCam = devices.find((d) => {
            const label = (d.label || '').toLowerCase();
            return (
              label.includes('back') ||
              label.includes('rear') ||
              label.includes('belakang') ||
              label.includes('environment')
            );
          });
          cameraConfig = backCam ? backCam.id : devices[0].id;
        }
      } catch (camErr) {
        cameraConfig = { facingMode: 'environment' };
      }

      try {
        await qrScanner.start(
          cameraConfig,
          {
            fps: 20,
            qrbox: qrBoxCalc,
            aspectRatio: 1.0,
          },
          scanSuccessCallback,
          () => {}
        );
      } catch (primaryStartErr) {
        console.warn('Primary camera start failed, trying user camera fallback:', primaryStartErr);
        // Fallback for laptops / desktop webcams that don't have an environment camera
        await qrScanner.start(
          { facingMode: 'user' },
          {
            fps: 20,
            qrbox: qrBoxCalc,
            aspectRatio: 1.0,
          },
          scanSuccessCallback,
          () => {}
        );
      }

      setCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Camera start error or permission denied:', err);
      setCameraActive(false);
      setCameraError(
        'Kamera belum aktif atau izin belum diberikan. Klik tombol di bawah atau izinkan akses kamera di ikon gembok browser Anda.'
      );
    }
  };

  // Start html5-qrcode scanner automatically on mount
  useEffect(() => {
    let isMounted = true;

    const initTimer = setTimeout(() => {
      if (isMounted) {
        startScanner();
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      if (scannerRef.current) {
        try {
          const s = scannerRef.current as any;
          if (s.isScanning) {
            s.stop().catch(() => {}).then(() => {
              try {
                s.clear();
              } catch (e) {}
            });
          }
        } catch (e) {}
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken) {
      processToken(manualToken, true);
      setManualToken('');
    }
  };

  const activeUser: SessionUser = user || {
    id: '',
    name: 'Petugas Presensi',
    username: 'guru',
    role: 'TEACHER',
  };

  return (
    <AppLayout user={activeUser}>
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
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '28px', height: '28px', borderTop: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderLeft: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderTopLeftRadius: '8px', transition: 'border-color 0.2s ease' }} />
                  {/* Top-Right */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '28px', height: '28px', borderTop: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderRight: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderTopRightRadius: '8px', transition: 'border-color 0.2s ease' }} />
                  {/* Bottom-Left */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '28px', height: '28px', borderBottom: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderLeft: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderBottomLeftRadius: '8px', transition: 'border-color 0.2s ease' }} />
                  {/* Bottom-Right */}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '28px', height: '28px', borderBottom: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderRight: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderBottomRightRadius: '8px', transition: 'border-color 0.2s ease' }} />

                  {/* Scanning Laser Beam Line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '8px',
                      right: '8px',
                      height: '2px',
                      background: isProcessing
                        ? 'linear-gradient(90deg, transparent 0%, #22c55e 50%, transparent 100%)'
                        : 'linear-gradient(90deg, transparent 0%, #38bdf8 50%, transparent 100%)',
                      boxShadow: isProcessing ? '0 0 12px #22c55e' : '0 0 10px #38bdf8',
                      animation: 'laserScan 2s infinite ease-in-out',
                    }}
                  />

                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-28px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: isProcessing ? 'rgba(22, 101, 52, 0.92)' : 'rgba(15, 23, 42, 0.85)',
                      color: isProcessing ? '#86efac' : '#38bdf8',
                      padding: '0.2rem 0.65rem',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isProcessing ? '✓ Terdeteksi! Memproses...' : 'Arahkan QR ke kotak ini'}
                  </div>
                </div>
              </div>
            </div>

            {cameraError && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>{cameraError}</div>
                <button
                  type="button"
                  onClick={() => startScanner()}
                  className="btn btn-primary btn-sm"
                  style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}
                >
                  <RotateCcw size={14} />
                  Buka / Muat Ulang Kamera Sekarang
                </button>
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
                  onClick={() => {
                    setScanResult(null);
                    lastScannedTokenRef.current = '';
                    lastScannedTimeRef.current = 0;
                  }}
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
                        {scanResult.attendance?.scannedBy || activeUser.name}
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
