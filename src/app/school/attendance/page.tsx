'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import { useNotification } from '@/context/NotificationContext';
import Link from 'next/link';
import {
  CalendarCheck,
  CalendarDays,
  Download,
  Printer,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  status: string;
  scannedBy: string;
  deviceInfo?: string | null;
  student: {
    fullName: string;
    nis: string;
    nisn?: string | null;
    classRoom: { name: string };
  };
}

interface ClassItem {
  id: string;
  name: string;
}

export default function SchoolAttendanceReportPage() {
  const { toast, showConfirm } = useNotification();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  // Delete modal state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'filtered' | 'all'>('filtered');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (classId) params.append('classId', classId);
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const [resAtt, resCla] = await Promise.all([
        fetch(`/api/school/attendance?${params.toString()}`),
        fetch('/api/school/classes'),
      ]);

      const dataAtt = await resAtt.json();
      const dataCla = await resCla.json();

      if (dataAtt.attendances) setAttendances(dataAtt.attendances);
      if (dataCla.classes) setClasses(dataCla.classes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user, date, classId, status, search]);

  const exportCSV = () => {
    const headers = ['No', 'Tanggal', 'Jam', 'Nama Siswa', 'Kelas', 'NIS', 'Status', 'Petugas'];
    const rows = attendances.map((a, idx) => [
      idx + 1,
      a.date,
      a.time,
      `"${a.student.fullName}"`,
      `"${a.student.classRoom.name}"`,
      a.student.nis,
      a.status,
      `"${a.scannedBy}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_presensi_${date || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClearAttendance = async () => {
    try {
      setIsDeleting(true);
      let url = '/api/school/attendance';
      if (resetMode === 'all') {
        url += '?all=true';
      } else if (date) {
        url += `?date=${date}`;
      } else {
        url += '?all=true';
      }

      const res = await fetch(url, { method: 'DELETE' });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Gagal menghapus data presensi.');
      }

      toast.success('Berhasil Dihapus', result.message || 'Data presensi berhasil dibersihkan.');
      setIsResetOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Gagal Menghapus', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = (id: string, studentName: string) => {
    showConfirm({
      type: 'error',
      title: 'Hapus Catatan Presensi?',
      message: `Hapus catatan kehadiran untuk ${studentName}?`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/school/attendance?id=${id}`, { method: 'DELETE' });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || 'Gagal menghapus');
          toast.success('Dihapus', 'Catatan presensi berhasil dihapus.');
          loadData();
        } catch (err: any) {
          toast.error('Gagal', err.message);
        }
      },
    });
  };

  if (!user) return null;

  return (
    <AppLayout user={user}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }} className="no-print">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Rekap & Laporan Presensi
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Rekap kehadiran siswa dengan filter tanggal, kelas, status, dan opsi ekspor.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/teacher/rekap" className="btn btn-secondary" style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
            <CalendarDays size={16} />
            <span>Matriks Presensi Bulanan</span>
          </Link>
          <button onClick={exportCSV} className="btn btn-secondary">
            <Download size={16} />
            <span>Ekspor Excel/CSV</span>
          </button>
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer size={16} />
            <span>Cetak Dokumen</span>
          </button>
          {attendances.length > 0 && (
            <button
              onClick={() => {
                setResetMode('filtered');
                setIsResetOpen(true);
              }}
              className="btn btn-secondary"
              style={{ color: '#dc2626', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
            >
              <Trash2 size={16} />
              <span>Hapus Data Ini</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card no-print" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Tanggal Presensi
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Kelas
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}
            >
              <option value="">Semua Status</option>
              <option value="HADIR">Hadir</option>
              <option value="TERLAMBAT">Terlambat</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Cari Nama / NIS
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik nama atau NIS..."
              style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
        </div>
      </div>

      {/* Printable Report Document Header */}
      <div className="print-only" style={{ display: 'none', marginBottom: '1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>LAPORAN PRESENSI SISWA</h2>
        <h3 style={{ fontSize: '1.1rem', color: '#334155' }}>{user.schoolName}</h3>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Tanggal: {date || 'Seluruh Tanggal'}</p>
        <hr style={{ margin: '1rem 0' }} />
      </div>

      {/* Report Table */}
      <div className="card">
        <div className="card-header no-print">
          <div className="card-title" style={{ fontSize: '1rem' }}>
            Data Presensi Terfilter ({attendances.length} Catatan)
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Jam</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>NIS</th>
                <th>Status</th>
                <th>Petugas Scan</th>
                <th style={{ textAlign: 'center', width: '70px' }} className="no-print">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Memuat data presensi...
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Tidak ada catatan presensi pada kriteria ini.
                  </td>
                </tr>
              ) : (
                attendances.map((a, idx) => (
                  <tr key={a.id}>
                    <td>{idx + 1}</td>
                    <td style={{ fontFamily: 'monospace' }}>{a.date}</td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{a.time}</td>
                    <td style={{ fontWeight: 700 }}>{a.student.fullName}</td>
                    <td>{a.student.classRoom.name}</td>
                    <td>{a.student.nis}</td>
                    <td>
                      <span className={`badge ${a.status === 'HADIR' ? 'badge-success' : 'badge-warning'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{a.scannedBy}</td>
                    <td style={{ textAlign: 'center' }} className="no-print">
                      <button
                        onClick={() => handleDeleteSingle(a.id, a.student.fullName)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                        }}
                        title="Hapus baris ini"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Clear / Delete Confirmation */}
      {isResetOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '440px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#dc2626' }}>
              <AlertTriangle size={24} />
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Konfirmasi Hapus Data Presensi</div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Pilih cakupan data presensi yang ingin dihapus:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  border: resetMode === 'filtered' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: resetMode === 'filtered' ? '#fef2f2' : 'white',
                }}
              >
                <input
                  type="radio"
                  name="resetMode"
                  checked={resetMode === 'filtered'}
                  onChange={() => setResetMode('filtered')}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                    Hapus Data Tanggal Ini ({date})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Menghapus {attendances.length} catatan presensi pada tanggal {date}.
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  border: resetMode === 'all' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  backgroundColor: resetMode === 'all' ? '#fef2f2' : 'white',
                }}
              >
                <input
                  type="radio"
                  name="resetMode"
                  checked={resetMode === 'all'}
                  onChange={() => setResetMode('all')}
                  style={{ marginTop: '0.2rem' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b' }}>
                    Hapus SEMUA Data Presensi Sekolah
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Menghapus seluruh riwayat presensi tanpa terkecuali (reset total).
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                disabled={isDeleting}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAttendance}
                disabled={isDeleting}
                className="btn btn-danger"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
