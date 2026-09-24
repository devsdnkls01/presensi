'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import {
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Printer,
  Search,
  Filter,
  Users,
  Grid,
  List,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

interface ClassItem {
  id: string;
  name: string;
  grade: number;
  section: string;
  _count?: { students: number };
}

interface MatrixItem {
  student: {
    id: string;
    fullName: string;
    nis: string;
    nisn?: string | null;
    gender: string;
    photoUrl?: string | null;
    className: string;
    classId: string;
  };
  daily: Record<string, { status: string; time: string } | null>;
  summary: {
    hadirTepatWaktu: number;
    terlambat: number;
    totalHadir: number;
    tidakHadir: number;
    persentase: number;
  };
}

export default function TeacherAttendanceRecapPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // View mode: 'matrix' | 'cards' | 'logs'
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');

  // Recap response data
  const [recapData, setRecapData] = useState<{
    school: any;
    month: string;
    daysInMonth: number;
    effectiveSchoolDays: number;
    datesList: { date: string; dayNumber: number; dayName: string; isSunday: boolean }[];
    totalStudents: number;
    avgPercentage: number;
    matrix: MatrixItem[];
  } | null>(null);

  // Fetch current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  // Fetch classes
  useEffect(() => {
    if (user) {
      fetch('/api/school/classes')
        .then((res) => res.json())
        .then((data) => {
          if (data.classes) {
            setClasses(data.classes);
            if (data.classes.length > 0 && !selectedClassId) {
              setSelectedClassId(data.classes[0].id);
            }
          }
        });
    }
  }, [user]);

  // Fetch recap data
  const loadRecap = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClassId) params.append('classId', selectedClassId);
      if (selectedMonth) params.append('month', selectedMonth);
      if (search) params.append('search', search);

      const res = await fetch(`/api/attendance/recap?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRecapData(data);
      }
    } catch (e) {
      console.error('Failed to load recap:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadRecap();
    }
  }, [user, selectedClassId, selectedMonth, search]);

  const handleExportCSV = () => {
    if (!recapData || !recapData.matrix || recapData.matrix.length === 0) return;

    // Headers: No, NIS, Nama, Kelas, [Tanggal 1..N], Hadir, Terlambat, Total, %
    const dateHeaders = recapData.datesList.map((d) => `${d.dayNumber}/${recapData.month.slice(5)}`);
    const headers = ['No', 'NIS', 'Nama Lengkap', 'Kelas', ...dateHeaders, 'Tepat Waktu', 'Terlambat', 'Total Hadir', '% Kehadiran'];

    const rows = recapData.matrix.map((row, idx) => {
      const dailyCols = recapData.datesList.map((d) => {
        const item = row.daily[d.date];
        if (!item) return d.isSunday ? 'LIBUR' : '-';
        return item.status === 'HADIR' ? 'H' : 'T';
      });

      return [
        idx + 1,
        row.student.nis,
        `"${row.student.fullName}"`,
        `"${row.student.className}"`,
        ...dailyCols,
        row.summary.hadirTepatWaktu,
        row.summary.terlambat,
        row.summary.totalHadir,
        `${row.summary.persentase}%`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_presensi_${selectedMonth}_${selectedClassId || 'semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!user) return null;

  const currentClassName = classes.find((c) => c.id === selectedClassId)?.name || 'Semua Kelas';

  return (
    <AppLayout user={user}>
      {/* Header Bar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
              }}
            >
              Wali Kelas & Guru
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {user.schoolName}
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Rekap Absensi Siswa
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Laporan rekapitulasi kehadiran siswa bulanan, matriks harian, dan statistik kehadiran kelas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={16} />
            <span>Ekspor Excel/CSV</span>
          </button>
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer size={16} />
            <span>Cetak Rekap Resmi</span>
          </button>
        </div>
      </div>

      {/* Filter & Control Toolbar */}
      <div className="card no-print" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Pilih Kelas
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                fontWeight: 600,
              }}
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c._count ? `(${c._count.students} siswa)` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Bulan Presensi
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Cari Nama / NIS
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama atau NIS..."
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2.2rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Mode Tampilan
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-md)',
                  border: viewMode === 'matrix' ? '1px solid #2563eb' : '1px solid var(--border-subtle)',
                  backgroundColor: viewMode === 'matrix' ? '#eff6ff' : '#ffffff',
                  color: viewMode === 'matrix' ? '#2563eb' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <Grid size={15} />
                <span>Matriks</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.55rem',
                  borderRadius: 'var(--radius-md)',
                  border: viewMode === 'cards' ? '1px solid #2563eb' : '1px solid var(--border-subtle)',
                  backgroundColor: viewMode === 'cards' ? '#eff6ff' : '#ffffff',
                  color: viewMode === 'cards' ? '#2563eb' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <List size={15} />
                <span>Ringkasan</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      {recapData && (
        <>
          <div className="grid-stats no-print" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Users size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{recapData.totalStudents}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Siswa di Kelas</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
              <CalendarDays size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{recapData.effectiveSchoolDays} Hari</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hari Belajar Efektif</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)' }}>
                {recapData.avgPercentage}%
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rata-rata Kehadiran Kelas</div>
            </div>
          </div>
        </div>


      </>
      )}

      {/* Printable Report Document Header (Hidden in Web, Visible in Print) */}
      <div className="print-only" style={{ display: 'none', marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000000', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
            LEMBAR REKAPITULASI PRESENSI SISWA
          </h2>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.2rem 0', color: '#1e293b' }}>
            {user.schoolName}
          </h3>
          <p style={{ fontSize: '0.85rem', margin: 0, color: '#475569' }}>
            Kelas: <strong>{currentClassName}</strong> • Bulan: <strong>{selectedMonth}</strong> • Hari Efektif: <strong>{recapData?.effectiveSchoolDays || 0} Hari</strong>
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Memuat Rekap Presensi...</div>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Menghitung matriks kehadiran siswa.</p>
        </div>
      ) : !recapData || recapData.matrix.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <CalendarCheck size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tidak ada data siswa / presensi pada filter ini.</div>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Silakan pilih kelas lain atau ubah bulan presensi.
          </p>
        </div>
      ) : viewMode === 'matrix' ? (
        /* MODE 1: MATRIKS PRESENSI BULANAN */
        <div className="card" style={{ padding: '1rem', overflow: 'hidden' }}>
          <div
            className="no-print"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Matriks Presensi {currentClassName} — Bulan {selectedMonth}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#22c55e' }} />
                <strong>H</strong> = Hadir
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b' }} />
                <strong>T</strong> = Terlambat
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#3b82f6' }} />
                <strong>I</strong> = Izin
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#a855f7' }} />
                <strong>S</strong> = Sakit
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444' }} />
                <strong>A</strong> = Alpha
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#fde047' }} />
                <strong>L</strong> = Libur
              </span>
            </div>
          </div>

          <div className="table-responsive" style={{ maxHeight: '680px', overflow: 'auto' }}>
            <table
              className="table"
              style={{
                fontSize: '0.78rem',
                borderCollapse: 'collapse',
                width: '100%',
                whiteSpace: 'nowrap',
              }}
            >
              <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', zIndex: 10 }}>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)' }}>
                  <th style={{ padding: '0.5rem 0.6rem', width: '35px', textAlign: 'center' }}>No</th>
                  <th style={{ padding: '0.5rem 0.75rem', minWidth: '150px' }}>Nama Siswa</th>
                  <th style={{ padding: '0.5rem 0.6rem', width: '60px' }}>NIS</th>
                  <th style={{ padding: '0.5rem 0.6rem', width: '70px' }}>Kelas</th>
                  {/* Daily date columns (1..31) */}
                  {recapData.datesList.map((d: any) => {
                    const isHolidayDay = d.isSunday || d.isHoliday;
                    return (
                      <th
                        key={d.date}
                        style={{
                          padding: '0.35rem 0.25rem',
                          width: '26px',
                          textAlign: 'center',
                          backgroundColor: d.isHoliday ? '#fef9c3' : d.isSunday ? '#fee2e2' : undefined,
                          color: d.isHoliday ? '#854d0e' : d.isSunday ? '#b91c1c' : undefined,
                          fontWeight: 700,
                        }}
                        title={d.isHoliday ? `${d.date}: Libur - ${d.holidayName}` : `${d.date} (${d.dayName})`}
                      >
                        <div style={{ fontSize: '0.65rem' }}>{d.dayName}</div>
                        <div>{d.dayNumber}</div>
                      </th>
                    );
                  })}
                  {/* Summary columns */}
                  <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', backgroundColor: '#f0fdf4', color: '#16a34a' }} title="Hadir Tepat Waktu">H</th>
                  <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', backgroundColor: '#fff7ed', color: '#ea580c' }} title="Hadir Terlambat">T</th>
                  <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', backgroundColor: '#eff6ff', color: '#1d4ed8' }} title="Izin">I</th>
                  <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', backgroundColor: '#faf5ff', color: '#7e22ce' }} title="Sakit">S</th>
                  <th style={{ padding: '0.5rem 0.4rem', textAlign: 'center', backgroundColor: '#fef2f2', color: '#dc2626' }} title="Alpha">A</th>
                  <th style={{ padding: '0.5rem 0.6rem', textAlign: 'center', backgroundColor: '#f1f5f9', color: '#0f172a' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {recapData.matrix.map((row, idx) => (
                  <tr key={row.student.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.student.fullName}</td>
                    <td style={{ fontFamily: 'monospace' }}>{row.student.nis}</td>
                    <td>{row.student.className}</td>

                    {/* Daily Cells */}
                    {recapData.datesList.map((d: any) => {
                      const record = row.daily[d.date];
                      if (d.isHoliday) {
                        return (
                          <td
                            key={d.date}
                            style={{
                              textAlign: 'center',
                              backgroundColor: '#fef9c3',
                              color: '#854d0e',
                              fontSize: '0.65rem',
                              padding: '0.2rem',
                              fontWeight: 700,
                            }}
                            title={`Hari Libur: ${d.holidayName || 'Libur Sekolah'}`}
                          >
                            L
                          </td>
                        );
                      }
                      if (d.isSunday) {
                        return (
                          <td
                            key={d.date}
                            style={{
                              textAlign: 'center',
                              backgroundColor: '#fef2f2',
                              color: '#ef4444',
                              fontSize: '0.65rem',
                              padding: '0.2rem',
                            }}
                          >
                            -
                          </td>
                        );
                      }

                      if (!record) {
                        return (
                          <td
                            key={d.date}
                            style={{
                              textAlign: 'center',
                              color: '#cbd5e1',
                              padding: '0.2rem',
                            }}
                          >
                            •
                          </td>
                        );
                      }

                      let bg = '#dcfce7';
                      let clr = '#15803d';
                      let code = 'H';
                      if (record.status === 'TERLAMBAT') { bg = '#fed7aa'; clr = '#c2410c'; code = 'T'; }
                      else if (record.status === 'IZIN') { bg = '#dbeafe'; clr = '#1d4ed8'; code = 'I'; }
                      else if (record.status === 'SAKIT') { bg = '#f3e8ff'; clr = '#7e22ce'; code = 'S'; }
                      else if (record.status === 'ALPHA') { bg = '#fee2e2'; clr = '#b91c1c'; code = 'A'; }

                      return (
                        <td
                          key={d.date}
                          style={{
                            textAlign: 'center',
                            padding: '0.2rem',
                            backgroundColor: bg,
                            color: clr,
                            fontWeight: 800,
                            borderRadius: '2px',
                          }}
                          title={`${row.student.fullName} - ${d.date}: ${record.status} (${record.time})`}
                        >
                          {code}
                        </td>
                      );
                    })}

                    {/* Summary Cells */}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a', backgroundColor: '#f0fdf4' }}>
                      {row.summary.hadirTepatWaktu}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#ea580c', backgroundColor: '#fff7ed' }}>
                      {row.summary.terlambat}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8', backgroundColor: '#eff6ff' }}>
                      {(row.summary as any).izin ?? 0}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#7e22ce', backgroundColor: '#faf5ff' }}>
                      {(row.summary as any).sakit ?? 0}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#dc2626', backgroundColor: '#fef2f2' }}>
                      {(row.summary as any).alpha ?? row.summary.tidakHadir}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#2563eb', backgroundColor: '#eff6ff' }}>
                      {row.summary.persentase}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODE 2: KARTU RINGKASAN PER SISWA */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {recapData.matrix.map((row) => (
            <div
              key={row.student.id}
              className="card"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {row.student.fullName}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      NIS: {row.student.nis} • {row.student.className}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      backgroundColor: row.summary.persentase >= 85 ? '#dcfce7' : '#fee2e2',
                      color: row.summary.persentase >= 85 ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {row.summary.persentase}%
                  </span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--border-subtle)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    marginBottom: '1rem',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${row.summary.persentase}%`,
                      backgroundColor: row.summary.persentase >= 85 ? '#22c55e' : '#ef4444',
                      borderRadius: '9999px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', textAlign: 'center', fontSize: '0.75rem' }}>
                  <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: '#f0fdf4' }}>
                    <div style={{ fontWeight: 800, color: '#16a34a', fontSize: '1.1rem' }}>{row.summary.hadirTepatWaktu}</div>
                    <div style={{ color: '#64748b' }}>Tepat Waktu</div>
                  </div>
                  <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: '#fff7ed' }}>
                    <div style={{ fontWeight: 800, color: '#ea580c', fontSize: '1.1rem' }}>{row.summary.terlambat}</div>
                    <div style={{ color: '#64748b' }}>Terlambat</div>
                  </div>
                  <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: '#fef2f2' }}>
                    <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.1rem' }}>{row.summary.tidakHadir}</div>
                    <div style={{ color: '#64748b' }}>Tidak Hadir</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Total Hadir: <strong>{row.summary.totalHadir}</strong> hari
                </span>
                <Link
                  href={`/cek-presensi?nis=${row.student.nis}`}
                  target="_blank"
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--primary)',
                    textDecoration: 'none',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span>Lihat Detail</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Official Signatures for Print View */}
      <div
        className="print-only"
        style={{
          display: 'none',
          marginTop: '2.5rem',
          paddingTop: '1rem',
          pageBreakInside: 'avoid',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem' }}>Mengetahui,</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Kepala Sekolah</div>
            <div style={{ height: '60px' }} />
            <div style={{ borderBottom: '1px solid #000', width: '180px', margin: '0 auto' }} />
            <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>NIP. ........................................</div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem' }}>
              Kalisalak, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Wali Kelas / Guru Petugas</div>
            <div style={{ height: '60px' }} />
            <div style={{ borderBottom: '1px solid #000', width: '180px', margin: '0 auto' }}>
              <strong>{user.name}</strong>
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>NIP. ........................................</div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
