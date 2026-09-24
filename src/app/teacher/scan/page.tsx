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
  const [isMirrored, setIsMirrored] = useState(false);

  // Synchronous locks & token tracking (immune to asynchronous React closures)
  const scannerRef = useRef<any>(null);
  const isStartingRef = useRef(false);
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

    // 2. Anti-repeat check for the SAME student: 5s cooldown so the same card doesn't trigger repeatedly
    if (!isManual && trimmed === lastScannedTokenRef.current && (now - lastScannedTimeRef.current < 5000)) {
      return;
    }

    // 3. Ultra-fast cooldown between DIFFERENT students: only 300ms (queue moves at lightning speed!)
    if (!isManual && trimmed !== lastScannedTokenRef.current && (now - lastScannedTimeRef.current < 300)) {
      return;
    }

    // Immediately acquire lock & record token
    isProcessingRef.current = true;
    lastScannedTokenRef.current = trimmed;
    lastScannedTimeRef.current = now;
    setIsProcessing(true);

    // 0ms Instant optimistic display & instant audio feedback from browser pre-cache
    const cachedStudent = studentCacheRef.current.get(trimmed);
    if (cachedStudent) {
      sound.playSuccess(); // DING IMMEDIATELY! ZERO LATENCY!
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
        if (!cachedStudent) {
          sound.playSuccess();
        }
        setRecentScans((prev) => {
          const updated = [data, ...prev.filter((s) => s.student?.nis !== data.student?.nis)].slice(0, 8);
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
      // Release lock in only 300ms so the NEXT student in line scans INSTANTLY!
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 300);
    }
  };

  // Safe camera starter: continuous 25FPS stream with FULL-FRAME decoding (no tiny box limits)
  const startScanner = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;

    try {
      setCameraError(null);

      // Wait until #qr-reader element is guaranteed to be in DOM
      let attempts = 0;
      while (!document.getElementById('qr-reader') && attempts < 30) {
        await new Promise((r) => setTimeout(r, 50));
        attempts++;
      }

      const container = document.getElementById('qr-reader');
      if (!container) {
        isStartingRef.current = false;
        return;
      }

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      // If scanner is already actively running, preserve it
      if (scannerRef.current && scannerRef.current.isScanning) {
        setCameraActive(true);
        isStartingRef.current = false;
        return;
      }

      // Safely stop and clear previous scanner instance
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (e) {}
        try {
          scannerRef.current.clear();
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

      const scanSuccessCallback = (decodedText: string) => {
        processToken(decodedText);
      };

      // Full-frame scanning without qrbox restriction:
      // Scans instantly the millisecond ANY part of the QR code enters the camera view!
      try {
        await qrScanner.start(
          { facingMode: 'environment' },
          {
            fps: 25,
          },
          scanSuccessCallback,
          () => {}
        );
      } catch (backErr) {
        console.warn('Back camera not available, falling back to front camera/webcam:', backErr);
        // Fallback for laptop or front-only devices
        await qrScanner.start(
          { facingMode: 'user' },
          {
            fps: 25,
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
        'Kamera belum aktif. Pastikan izin kamera telah diizinkan di ikon gembok browser Anda.'
      );
    } finally {
      isStartingRef.current = false;
    }
  };

  // Start html5-qrcode scanner automatically on mount
  useEffect(() => {
    let isMounted = true;

    const initTimer = setTimeout(() => {
      if (isMounted) {
        startScanner();
      }
    }, 100);

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
      <div style={{ maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
        {/* Global Responsive Styles */}
        <style jsx global>{`
          .scan-grid-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1rem;
            margin-bottom: 1.5rem;
          }
          @media (min-width: 900px) {
            .scan-grid-container {
              grid-template-columns: 1fr 1fr;
              gap: 1.5rem;
              margin-bottom: 2rem;
            }
          }

          .scan-card-responsive {
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            min-width: 0;
            width: 100%;
            box-sizing: border-box;
          }
          @media (max-width: 640px) {
            .scan-card-responsive {
              padding: 0.75rem !important;
              border-radius: 14px !important;
            }
          }

          .student-result-card {
            background-color: #ffffff;
            border-radius: 14px;
            padding: 1.15rem;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
            border: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 0.85rem;
            min-width: 0;
            width: 100%;
            box-sizing: border-box;
          }
          .student-avatar-box {
            width: 74px;
            height: 96px;
            border-radius: 10px;
            overflow: hidden;
            background-color: #f1f5f9;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .student-name-text {
            font-size: 1.15rem;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: -0.01em;
            word-break: break-word;
            line-height: 1.25;
          }
          @media (max-width: 640px) {
            .student-result-card {
              padding: 0.75rem !important;
              gap: 0.75rem !important;
              border-radius: 12px !important;
            }
            .student-avatar-box {
              width: 60px !important;
              height: 78px !important;
            }
            .student-name-text {
              font-size: 1rem !important;
            }
          }

          .camera-viewport-box {
            position: relative;
            border-radius: 14px;
            overflow: hidden;
            background-color: #0b0f19;
            height: clamp(220px, 38vh, 320px);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #1e293b;
            box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
          }

          #qr-reader {
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            background: transparent !important;
            position: absolute !important;
            inset: 0 !important;
            overflow: hidden !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #qr-reader video {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
            margin: 0 auto !important;
            transform: ${isMirrored ? 'scaleX(-1)' : 'none'} !important;
            border-radius: 12px !important;
          }
          #qr-reader canvas {
            display: none !important;
            opacity: 0 !important;
            position: absolute !important;
            pointer-events: none !important;
          }
          #qr-reader__scan_region {
            width: 100% !important;
            height: 100% !important;
            position: absolute !important;
            inset: 0 !important;
            background: transparent !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #qr-reader__scan_region img,
          #qr-reader img {
            display: none !important;
          }
          #qr-reader__dashboard,
          #qr-reader__dashboard_section_csr,
          #qr-reader__dashboard_section_swaplink,
          #qr-reader__scan_region span,
          #qr-reader__header_message,
          #qr-reader__status_span {
            display: none !important;
          }
          @keyframes laserScan {
            0% { top: 12%; opacity: 0.8; }
            50% { top: 82%; opacity: 1; }
            100% { top: 12%; opacity: 0.8; }
          }
        `}</style>

        {/* Top Header */}
        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <ScanLine size={24} color="var(--primary)" />
              PRESENSI SISWA
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              Arahkan QR Code kartu siswa ke kamera untuk presensi otomatis.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#ecfdf5', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-full)', border: '1px solid #a7f3d0' }}>
              <Sparkles size={13} color="#059669" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#047857' }}>
                Global Config DB (0ms)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'white', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
              <Volume2 size={14} color="#059669" />
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155' }}>
                Suara: <strong>Aktif</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Main Responsive Grid: Camera & Scan Result */}
        <div className="scan-grid-container">
          {/* CAMERA PANEL */}
          <div className="card scan-card-responsive">
            <div className="card-header" style={{ marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div>
                <div className="card-title" style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Camera size={18} color="var(--primary)" />
                  Kamera Scanner
                </div>
                <div className="card-subtitle" style={{ fontSize: '0.75rem' }}>
                  Deteksi otomatis instan tanpa jeda
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setIsMirrored((m) => !m)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.72rem',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '8px',
                    color: isMirrored ? '#0c35a6' : '#475569',
                    backgroundColor: isMirrored ? '#eff6ff' : '#ffffff',
                    border: isMirrored ? '1px solid #bfdbfe' : '1px solid var(--border-subtle)',
                  }}
                  title="Klik untuk membalik arah pandangan kamera (Mirror / Normal)"
                >
                  <FlipHorizontal size={13} />
                  <span>{isMirrored ? 'Cermin: Aktif' : 'Arah Asli (HP)'}</span>
                </button>
                {isProcessing && (
                  <span className="badge badge-info" style={{ animation: 'pulse 1s infinite', fontSize: '0.72rem', padding: '0.2rem 0.5rem' }}>
                    Memproses...
                  </span>
                )}
              </div>
            </div>

            {/* Video Viewport */}
            <div className="camera-viewport-box">
              <div id="qr-reader" />

              {/* Target Aiming Box with Corner Brackets & Laser Scan */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    width: 'min(170px, 48vw)',
                    height: 'min(170px, 48vw)',
                    position: 'relative',
                  }}
                >
                  {/* Top-Left */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', borderTop: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderLeft: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderTopLeftRadius: '8px', transition: 'border-color 0.2s ease' }} />
                  {/* Top-Right */}
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '20px', height: '20px', borderTop: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderRight: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderTopRightRadius: '8px', transition: 'border-color 0.2s ease' }} />
                  {/* Bottom-Left */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, width: '20px', height: '20px', borderBottom: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderLeft: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderBottomLeftRadius: '8px', transition: 'border-color 0.2s ease' }} />
                  {/* Bottom-Right */}
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderBottom: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderRight: `3px solid ${isProcessing ? '#22c55e' : '#38bdf8'}`, borderBottomRightRadius: '8px', transition: 'border-color 0.2s ease' }} />

                  {/* Scanning Laser Beam Line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '4px',
                      right: '4px',
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
                      bottom: '-24px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: isProcessing ? 'rgba(22, 101, 52, 0.92)' : 'rgba(15, 23, 42, 0.85)',
                      color: isProcessing ? '#86efac' : '#38bdf8',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isProcessing ? '✓ Terdeteksi! Memproses...' : 'Arahkan QR ke sini'}
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
            <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Input Manual Token QR:
              </div>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Ketik token kartu..."
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.65rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                  }}
                />
                <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}>
                  Proses
                </button>
              </form>
            </div>
          </div>

          {/* SCAN RESULT DISPLAY */}
          <div
            className="card scan-card-responsive"
            style={{
              minHeight: '340px',
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
                <div className="student-result-card">
                  <div
                    className="student-avatar-box"
                    style={{
                      border: '2px solid #22c55e',
                      boxShadow: '0 4px 10px rgba(34, 197, 94, 0.2)',
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
                      <User size={30} color="#94a3b8" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
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
                            maxWidth: '160px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {scanResult.student.schoolName}
                        </span>
                      )}
                    </div>

                    <div className="student-name-text">
                      {scanResult.student?.fullName}
                    </div>

                    <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <div>NIS: <strong style={{ color: '#1e293b' }}>{scanResult.student?.nis}</strong></div>
                      {scanResult.student?.nisn && <div>NISN: <strong style={{ color: '#1e293b' }}>{scanResult.student.nisn}</strong></div>}
                    </div>

                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                </div>                {/* Student Identity Card */}
                {scanResult.student && (
                  <div className="student-result-card" style={{ border: '1px solid #fde68a' }}>
                    <div
                      className="student-avatar-box"
                      style={{
                        border: '2px solid #f59e0b',
                        boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)',
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
                        <User size={30} color="#94a3b8" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
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
                              maxWidth: '160px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {scanResult.student.schoolName}
                          </span>
                        )}
                      </div>

                      <div className="student-name-text">
                        {scanResult.student.fullName}
                      </div>

                      <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        <div>NIS: <strong style={{ color: '#1e293b' }}>{scanResult.student.nis}</strong></div>
                        {scanResult.student.nisn && <div>NISN: <strong style={{ color: '#1e293b' }}>{scanResult.student.nisn}</strong></div>}
                      </div>

                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        <div className="card scan-card-responsive">
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
