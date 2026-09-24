'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import {
  Sliders,
  CheckCircle2,
  Save,
  Clock,
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
  CalendarOff,
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

interface HolidayItem {
  id: string;
  date: string;
  description: string;
}

export default function SchoolSettingsPage() {
  const { toast, showConfirm } = useNotification();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active tab: 'rules' | 'holidays'
  const [activeTab, setActiveTab] = useState<'rules' | 'holidays'>('rules');

  const [form, setForm] = useState({
    checkInStartTime: '06:00',
    checkInEndTime: '07:45',
    lateAfter: '07:45',
  });


  // Holidays state
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayDesc, setHolidayDesc] = useState('');
  const [addingHoliday, setAddingHoliday] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const loadHolidays = async () => {
    try {
      const res = await fetch('/api/school/holidays');
      const data = await res.json();
      if (data.holidays) setHolidays(data.holidays);
    } catch (e) {
      console.error('Failed to load holidays:', e);
    }
  };

  useEffect(() => {
    if (user) {
      fetch('/api/school/settings')
        .then((res) => res.json())
        .then((data) => {
          if (data.school) {
            setForm({
              checkInStartTime: data.school.checkInStartTime || '06:00',
              checkInEndTime: data.school.checkInEndTime || '07:00',
              lateAfter: data.school.lateAfter || '07:00',
            });
          }
        })
        .finally(() => setLoading(false));

      loadHolidays();
    }
  }, [user]);

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/school/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setSavedSuccess(true);
        toast.success('Pengaturan Disimpan', 'Aturan jam presensi berhasil diperbarui.');
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal', 'Terjadi kesalahan saat menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayDesc.trim()) return;

    setAddingHoliday(true);
    try {
      const res = await fetch('/api/school/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: holidayDate,
          description: holidayDesc.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan hari libur.');

      toast.success('Hari Libur Ditambahkan', `Tanggal ${holidayDate} telah ditetapkan sebagai libur.`);
      setHolidayDate('');
      setHolidayDesc('');
      loadHolidays();
    } catch (err: any) {
      toast.error('Gagal Menambah Libur', err.message);
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = (id: string, date: string, desc: string) => {
    showConfirm({
      type: 'error',
      title: 'Hapus Hari Libur?',
      message: `Apakah Anda yakin ingin menghapus hari libur ${date} (${desc}) dari kalender sekolah?`,
      confirmText: 'Ya, Hapus Libur',
      cancelText: 'Batal',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/school/holidays?id=${id}`, {
            method: 'DELETE',
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal menghapus hari libur.');

          toast.success('Dihapus', 'Hari libur berhasil dihapus dari kalender sekolah.');
          setHolidays((prev) => prev.filter((h) => h.id !== id));
        } catch (err: any) {
          toast.error('Gagal Menghapus', err.message);
        }
      },
    });
  };

  if (!user) return null;

  return (
    <AppLayout user={user}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Pengaturan Sekolah & Kalender Presensi
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kelola aturan jadwal presensi dan tetapkan hari libur sekolah agar tidak terhitung sebagai Alpha.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            className={`btn ${activeTab === 'rules' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Clock size={16} />
            <span>Aturan Jam Presensi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('holidays')}
            className={`btn ${activeTab === 'holidays' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <CalendarOff size={16} />
            <span>Kalender Hari Libur ({holidays.length})</span>
          </button>
        </div>

        {/* TAB 1: ATURAN JAM PRESENSI */}
        {activeTab === 'rules' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            {savedSuccess && (
              <div
                style={{
                  padding: '0.85rem 1.25rem',
                  backgroundColor: 'var(--success-bg)',
                  color: 'var(--success)',
                  border: '1px solid var(--success-border)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.5rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={18} />
                <span>Pengaturan jam presensi berhasil disimpan!</span>
              </div>
            )}

            <form onSubmit={handleSubmitSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Jam Mulai Presensi
                </label>
                <input
                  type="time"
                  required
                  value={form.checkInStartTime}
                  onChange={(e) => setForm({ ...form, checkInStartTime: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Waktu awal kamera mulai menerima scan presensi pagi.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Batas Jam Kehadiran Tepat Waktu (Hadir)
                </label>
                <input
                  type="time"
                  required
                  value={form.lateAfter}
                  onChange={(e) => setForm({ ...form, lateAfter: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Scan sampai waktu ini dicatat <strong>HADIR</strong>. Scan setelah waktu ini otomatis dicatat <strong>TERLAMBAT</strong>.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Batas Akhir Sesi Presensi Pagi
                </label>
                <input
                  type="time"
                  required
                  value={form.checkInEndTime}
                  onChange={(e) => setForm({ ...form, checkInEndTime: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.95rem',
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Waktu selesai jadwal sesi presensi pagi sekolah.
                </span>
              </div>

              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: KALENDER HARI LIBUR SEKOLAH (Poin 30) */}
        {activeTab === 'holidays' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Informational Alert */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem 1.25rem',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem',
                color: '#1e40af',
              }}
            >
              <AlertCircle size={20} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Kalender Akademik & Hari Libur:</strong> Tanggal libur yang didaftarkan di sini otomatis dikecualikan dari hari belajar efektif, sehingga <strong>tidak akan dihitung sebagai Alpha / Tidak Hadir</strong> pada rekap presensi guru dan portal cek presensi wali murid.
              </div>
            </div>

            {/* Form Tambah Hari Libur */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="card-title" style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--primary)" />
                <span>Tambah Hari Libur Sekolah / Nasional</span>
              </div>

              <form onSubmit={handleAddHoliday} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Tanggal Libur *
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={(e) => setHolidayDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Nama / Keterangan Libur *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Misal: Libur Idul Fitri, Penilaian Akhir Semester, Hari Guru..."
                    value={holidayDesc}
                    onChange={(e) => setHolidayDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={addingHoliday}
                  className="btn btn-primary"
                  style={{ height: '42px', padding: '0 1.25rem', whiteSpace: 'nowrap' }}
                >
                  <Plus size={16} />
                  <span>{addingHoliday ? 'Menyimpan...' : 'Tambah Libur'}</span>
                </button>
              </form>
            </div>

            {/* List Hari Libur */}
            <div className="card">
              <div className="card-header">
                <div className="card-title" style={{ fontSize: '1rem' }}>
                  Daftar Hari Libur Terdaftar ({holidays.length})
                </div>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>No</th>
                      <th style={{ width: '140px' }}>Tanggal</th>
                      <th>Keterangan Hari Libur</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                          Belum ada hari libur khusus yang didaftarkan. Hari Minggu otomatis dihitung sebagai libur.
                        </td>
                      </tr>
                    ) : (
                      holidays.map((h, idx) => (
                        <tr key={h.id}>
                          <td>{idx + 1}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                            {h.date}
                          </td>
                          <td style={{ fontWeight: 600 }}>{h.description}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(h.id, h.date, h.description)}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ef4444',
                                padding: '0.25rem',
                                borderRadius: '4px',
                              }}
                              title="Hapus hari libur ini"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
