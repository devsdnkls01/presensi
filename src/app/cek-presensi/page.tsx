'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  School,
  GraduationCap,
  CreditCard,
  CalendarDays,
  Sparkles,
  RefreshCw,
  QrCode,
  User,
  ShieldCheck,
  Camera,
  CameraOff,
  ScanLine,
  Hash,
  RotateCcw,
} from 'lucide-react';

function ParentAttendanceContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('nis') || searchParams.get('nisn') || searchParams.get('id') || '';

  const [activeTab, setActiveTab] = useState<'scan' | 'nisn'>('scan');
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Camera QR Scanner state (Method 1)
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const scannerRef = useRef<any>(null);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
    setScannerStarting(false);
  };

  const startCamera = async () => {
    setError('');
    setScannerStarting(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode('parent-qr-reader');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          let cleanToken = decodedText.trim();
          // If scanned a URL, extract query or id param
          if (cleanToken.includes('query=')) {
            try {
              const url = new URL(cleanToken);
              cleanToken = url.searchParams.get('query') || cleanToken;
            } catch (e) {}
          } else if (cleanToken.includes('id=')) {
            try {
              const url = new URL(cleanToken);
              cleanToken = url.searchParams.get('id') || cleanToken;
            } catch (e) {}
          }

          stopCamera();
          setSearchQuery(cleanToken);
          handleSearch(cleanToken);
        },
        () => {}
      );

      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraActive(false);
      setError('Tidak dapat membuka kamera. Pastikan izin kamera telah diberikan di browser Anda.');
    } finally {
      setScannerStarting(false);
    }
  };

  // Cleanup camera on unmount or tab change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleTabChange = (tab: 'scan' | 'nisn') => {
    if (cameraActive) {
      stopCamera();
    }
    setActiveTab(tab);
    setError('');
  };

  const handleSearch = async (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    if (!q) {
      setError('Silakan masukkan NISN atau pindai QR Code pada kartu siswa.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/public/student-attendance?query=${encodeURIComponent(q)}&month=${selectedMonth}`);
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Data siswa tidak ditemukan.');
      }

      setData(result);
    } catch (err: any) {
      setData(null);
      setError(err.message || 'Gagal mencari data siswa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (data && data.student) {
      handleSearch(data.student.nisn || data.student.nis);
    }
  }, [selectedMonth]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 50%, #f8fafc 100%)',
        color: '#0f172a',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        padding: '1.5rem 1rem 3rem',
      }}
    >
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        {/* Top Header Badge */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem' }}>
          <span
            style={{
              fontSize: '0.78rem',
              padding: '0.35rem 0.95rem',
              borderRadius: '9999px',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1d4ed8',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              letterSpacing: '0.02em',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            <ShieldCheck size={14} />
            <span>PORTAL RESMI PENGECEKAN PRESENSI SISWA • SMARTSISWA</span>
          </span>
        </div>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="SmartSiswa Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Cek Presensi & Kehadiran Siswa
          </h1>
          <p style={{ fontSize: '0.925rem', color: '#64748b', maxWidth: '540px', margin: '0 auto' }}>
            Pantau kehadiran putra/putri Anda secara langsung (real-time). Pilih metode pemindaian QR Code atau masukkan NISN siswa di bawah ini.
          </p>
        </div>

        {/* 2 Methods Selector Card (Hidden once student is found) */}
        {(!data || !data.student) && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              padding: '1.5rem',
              boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0',
              marginBottom: '2rem',
            }}
          >
          {/* Tabs Navigation */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              padding: '0.35rem',
              backgroundColor: '#f1f5f9',
              borderRadius: '12px',
              marginBottom: '1.5rem',
            }}
          >
            <button
              type="button"
              onClick={() => handleTabChange('scan')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: activeTab === 'scan' ? '#ffffff' : 'transparent',
                color: activeTab === 'scan' ? '#1d4ed8' : '#64748b',
                boxShadow: activeTab === 'scan' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <QrCode size={18} />
              <span>1. Pindai QR Code Kartu</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('nisn')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: activeTab === 'nisn' ? '#ffffff' : 'transparent',
                color: activeTab === 'nisn' ? '#1d4ed8' : '#64748b',
                boxShadow: activeTab === 'nisn' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Hash size={18} />
              <span>2. Masukkan NISN</span>
            </button>
          </div>

          {/* METHOD 1: SCAN QR CODE */}
          {activeTab === 'scan' && (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              {!cameraActive ? (
                <div
                  style={{
                    border: '2px dashed #bfdbfe',
                    borderRadius: '14px',
                    padding: '2.5rem 1.5rem',
                    backgroundColor: '#f8faff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <QrCode size={34} />
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                      Pindai QR Code Kartu Siswa
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
                      Arahkan kamera HP atau webcam laptop Anda ke QR Code yang ada di kartu fisik siswa untuk melihat rekam presensi otomatis.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={scannerStarting}
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.85rem 1.85rem',
                      borderRadius: '10px',
                      backgroundColor: '#1d4ed8',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px rgba(29, 78, 216, 0.3)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {scannerStarting ? (
                      <>
                        <RefreshCw size={18} className="spin" />
                        <span>Mempersiapkan Kamera...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={18} />
                        <span>Buka Kamera & Pindai Sekarang</span>
                      </>
                    )}
                  </button>

                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    * Kamera tidak langsung terbuka otomatis demi kenyamanan & privasi Anda.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      maxWidth: '420px',
                      padding: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }} />
                      <span>Kamera Aktif • Arahkan ke QR Code</span>
                    </div>

                    <button
                      type="button"
                      onClick={stopCamera}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <CameraOff size={14} />
                      <span>Tutup Kamera</span>
                    </button>
                  </div>

                  {/* QR Reader Container */}
                  <div
                    id="parent-qr-reader"
                    style={{
                      width: '100%',
                      maxWidth: '380px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '3px solid #3b82f6',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    }}
                  />

                  <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Posisikan kotak QR Code kartu siswa tepat di tengah area bingkai pemindai.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* METHOD 2: ENTER NISN */}
          {activeTab === 'nisn' && (
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}>
                    Nomor Induk Siswa Nasional (NISN)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={20}
                      color="#94a3b8"
                      style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Masukkan 10 digit NISN siswa (contoh: 0081234567)..."
                      style={{
                        width: '100%',
                        padding: '0.9rem 1rem 0.9rem 3rem',
                        borderRadius: '12px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s ease',
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', display: 'block' }}>
                    * Jika tidak hafal NISN, Anda juga dapat memasukkan Nomor Induk Siswa (NIS).
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '0.85rem 2rem',
                      borderRadius: '10px',
                      backgroundColor: '#1d4ed8',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow: '0 4px 14px rgba(29, 78, 216, 0.25)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {loading ? <RefreshCw size={18} className="spin" /> : <Search size={18} />}
                    <span>{loading ? 'Mencari Data...' : 'Cek Kehadiran Siswa'}</span>
                  </button>
                </div>
              </form>


            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

        {/* If student is found: Top Action Bar to Search Another Student */}
        {data && data.student && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              backgroundColor: '#ffffff',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
              <span style={{ fontSize: '0.875rem', color: '#475569' }}>
                Hasil Pencarian Siswa: <strong style={{ color: '#0f172a' }}>{data.student.fullName}</strong> ({data.student.nis})
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setData(null);
                setSearchQuery('');
                setError('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <RotateCcw size={14} />
              <span>Ganti / Cari Siswa Lain</span>
            </button>
          </div>
        )}

        {/* Student Results Display */}
        {data && data.student && (() => {
          const todayRecord = data.todayAttendance || data.today?.record;
          const stats = data.stats || {
            totalHadir: data.monthSummary?.totalHadir ?? 0,
            totalTerlambat: data.monthSummary?.terlambat ?? 0,
            totalIzin: 0,
            totalSakit: 0,
            totalAlpha: Math.max(0, (data.monthSummary?.effectiveSchoolDays ?? 0) - (data.monthSummary?.totalHadir ?? 0)),
            attendanceRate: data.monthSummary?.persentase ?? 0,
            daysInMonth: data.monthSummary?.daysInMonth ?? 30,
          };
          const calendarDays = data.calendar?.days || (data.daysList ? data.daysList.map((d: any) => ({
            day: d.dayNumber,
            date: d.date,
            isWeekend: d.isSunday,
            status: d.status === 'HADIR' ? 'HADIR' : d.status === 'TERLAMBAT' ? 'TERLAMBAT' : d.status === 'BELUM' ? null : d.status,
            time: d.time,
          })) : []);
          const totalDaysInMonth = data.calendar?.daysInMonth || data.monthSummary?.daysInMonth || 30;

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Student Profile Card */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    width: '76px',
                    height: '96px',
                    borderRadius: '10px',
                    backgroundColor: '#f1f5f9',
                    border: '2px solid #e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {data.student.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.student.photoUrl}
                      alt={data.student.fullName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <User size={36} color="#94a3b8" />
                  )}
                </div>

                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {data.student.fullName}
                    </h2>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {data.student.classRoom ? data.student.classRoom.name : data.student.className || 'Kelas -'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.85rem', color: '#475569', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                    <div>
                      NIS: <strong>{data.student.nis}</strong>
                    </div>
                    <div>
                      NISN: <strong>{data.student.nisn || '-'}</strong>
                    </div>
                    <div>
                      Sekolah: <strong>{data.student.school ? data.student.school.name : data.student.schoolName || '-'}</strong>
                    </div>
                  </div>

                  {data.student.cards && data.student.cards.length > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <CreditCard size={13} />
                      <span>Card ID: <code>{data.student.cards[0].cardId}</code></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Today's Status Banner */}
              <div
                style={{
                  borderRadius: '16px',
                  padding: '1.5rem',
                  backgroundColor: todayRecord ? '#f0fdf4' : '#fffbeb',
                  border: `1.5px solid ${todayRecord ? '#bbf7d0' : '#fef08a'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: todayRecord ? '#22c55e' : '#eab308',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {todayRecord ? <CheckCircle2 size={26} /> : <Clock size={26} />}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: todayRecord ? '#15803d' : '#854d0e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Status Kehadiran Hari Ini
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                      {todayRecord ? (
                        todayRecord.status === 'HADIR' ? (
                          <span style={{ color: '#16a34a' }}>Hadir Tepat Waktu</span>
                        ) : (
                          <span style={{ color: '#d97706' }}>Hadir (Terlambat)</span>
                        )
                      ) : (
                        <span style={{ color: '#854d0e' }}>Belum Melakukan Presensi</span>
                      )}
                    </div>
                  </div>
                </div>

                {todayRecord && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Waktu Scan Masuk:</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                      {todayRecord.time} WIB
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Recap & Calendar */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CalendarDays size={18} color="#2563eb" />
                      <span>Rekapitulasi Kehadiran Bulanan</span>
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Riwayat presensi siswa sepanjang bulan ini
                    </div>
                  </div>

                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#1e293b',
                    }}
                  />
                </div>

                {/* Stats Counters */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ backgroundColor: '#f0fdf4', padding: '0.85rem', borderRadius: '10px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>Total Hadir</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#15803d' }}>{stats.totalHadir} Hari</div>
                  </div>

                  <div style={{ backgroundColor: '#fffbeb', padding: '0.85rem', borderRadius: '10px', border: '1px solid #fef08a', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#854d0e', fontWeight: 600 }}>Terlambat</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b45309' }}>{stats.totalTerlambat} Kali</div>
                  </div>

                  <div style={{ backgroundColor: '#eff6ff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 600 }}>Izin / Sakit</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb' }}>{stats.totalIzin + stats.totalSakit} Hari</div>
                  </div>

                  <div style={{ backgroundColor: '#fef2f2', padding: '0.85rem', borderRadius: '10px', border: '1px solid #fecaca', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>Tanpa Keterangan</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#dc2626' }}>{stats.totalAlpha} Hari</div>
                  </div>

                  <div style={{ backgroundColor: '#faf5ff', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e9d5ff', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b21a8', fontWeight: 600 }}>Persentase</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#7e22ce' }}>{stats.attendanceRate}%</div>
                  </div>
                </div>

                {/* Day-by-Day Grid Matrix (Poin 47 Rujukan) */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.65rem' }}>
                    Matriks Hari Presensi (Tanggal 1 s/d {totalDaysInMonth}):
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))', gap: '0.35rem' }}>
                    {calendarDays.map((d: any) => {
                      let bg = '#f8fafc';
                      let border = '#e2e8f0';
                      let text = '#64748b';

                      if (d.status === 'HADIR') {
                        bg = '#dcfce7';
                        border = '#86efac';
                        text = '#15803d';
                      } else if (d.status === 'TERLAMBAT') {
                        bg = '#fef3c7';
                        border = '#fde047';
                        text = '#b45309';
                      } else if (d.status === 'IZIN' || d.status === 'SAKIT') {
                        bg = '#dbeafe';
                        border = '#93c5fd';
                        text = '#1d4ed8';
                      } else if (d.status === 'ALPHA') {
                        bg = '#fee2e2';
                        border = '#fca5a5';
                        text = '#b91c1c';
                      } else if (d.isWeekend) {
                        bg = '#f1f5f9';
                        border = '#e2e8f0';
                        text = '#94a3b8';
                      }

                      return (
                        <div
                          key={d.day}
                          title={`Tgl ${d.day}: ${d.status || (d.isWeekend ? 'Libur Akhir Pekan' : 'Belum Ada Data')}${d.time ? ` (${d.time})` : ''}`}
                          style={{
                            height: '38px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            backgroundColor: bg,
                            border: `1px solid ${border}`,
                            color: text,
                            cursor: 'default',
                          }}
                        >
                          <span style={{ fontSize: '0.72rem', fontWeight: 800 }}>{d.day}</span>
                          <span style={{ fontSize: '0.55rem', fontWeight: 700 }}>
                            {d.status ? d.status.slice(0, 1) : d.isWeekend ? '-' : '•'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '3px' }} />
                      <span>Hadir (H)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#fef3c7', border: '1px solid #fde047', borderRadius: '3px' }} />
                      <span>Terlambat (T)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '3px' }} />
                      <span>Izin/Sakit (I/S)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '3px' }} />
                      <span>Alpha (A)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default function ParentAttendancePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw className="spin" size={24} />
        </div>
      }
    >
      <ParentAttendanceContent />
    </Suspense>
  );
}
