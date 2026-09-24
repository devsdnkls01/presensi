'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import { useNotification } from '@/context/NotificationContext';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  KeyRound,
  Shield,
  QrCode,
  CalendarDays,
  X,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface TeacherItem {
  id: string;
  name: string;
  username: string;
  role: string;
  createdAt: string;
}

export default function SchoolTeachersPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { toast } = useNotification();

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
  });

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    username: '',
    password: '',
  });
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/school/teachers');
      const data = await res.json();
      if (data.teachers) setTeachers(data.teachers);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data guru/petugas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadTeachers();
  }, [user]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/school/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal menambahkan akun guru.');
      }

      toast.success(`Akun guru ${form.name} berhasil dibuat!`);
      setIsAddOpen(false);
      setForm({ name: '', username: '', password: '' });
      loadTeachers();
    } catch (err: any) {
      setFormError(err.message);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (t: TeacherItem) => {
    setEditForm({
      id: t.id,
      name: t.name,
      username: t.username,
      password: '',
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/school/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal memperbarui akun guru.');
      }

      toast.success(`Akun guru ${editForm.name} berhasil diperbarui!`);
      setIsEditOpen(false);
      loadTeachers();
    } catch (err: any) {
      setFormError(err.message);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/school/teachers?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal menghapus akun guru.');
      }

      toast.success(`Akun guru ${deleteTarget.name} berhasil dihapus.`);
      setDeleteTarget(null);
      loadTeachers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTeachers = teachers.filter((t) => {
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.username.toLowerCase().includes(q);
  });

  if (!user) return null;

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Kelola Akun Guru & Petugas
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kelola akun guru kelas dan staf piket presensi untuk melakukan pemindaian QR Code dan rekap absensi.
          </p>
        </div>

        <button onClick={() => { setIsAddOpen(true); setFormError(''); }} className="btn btn-primary">
          <Plus size={18} />
          <span>Tambah Akun Guru Baru</span>
        </button>
      </div>

      {/* Info Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: 'var(--radius-lg)' }}>
            <UserCheck size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Guru Terdaftar</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {teachers.length} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Orang</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ padding: '0.85rem', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: 'var(--radius-lg)' }}>
            <QrCode size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hak Akses Scan Presensi</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a' }}>
              Piket & Kamera HP
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ padding: '0.85rem', backgroundColor: '#ecfdf5', color: '#059669', borderRadius: 'var(--radius-lg)' }}>
            <CalendarDays size={26} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hak Akses Rekapitulasi</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#065f46' }}>
              Rekap Bulanan & Cetak
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Search */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', maxWidth: '360px', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari guru atau username..."
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.2rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
              }}
            />
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Menampilkan <strong>{filteredTeachers.length}</strong> dari <strong>{teachers.length}</strong> akun
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Guru / Staf</th>
                <th>Username Login</th>
                <th>Peran & Akses</th>
                <th>Tanggal Dibuat</th>
                <th style={{ textAlign: 'center', width: '180px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Memuat data guru...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    {search ? 'Tidak ada guru yang sesuai pencarian.' : 'Belum ada akun guru terdaftar di sekolah ini.'}
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {t.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{ padding: '0.2rem 0.5rem', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '0.825rem', color: '#0f172a', fontWeight: 600 }}>
                        @{t.username}
                      </code>
                    </td>
                    <td>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={12} />
                        <span>GURU & PETUGAS</span>
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(t.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <button
                          onClick={() => openEditModal(t)}
                          className="btn btn-secondary btn-sm"
                          title="Edit & Reset Password"
                          style={{ padding: '0.4rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(t)}
                          className="btn btn-outline btn-sm"
                          title="Hapus Akun Guru"
                          style={{ padding: '0.4rem 0.55rem', color: 'var(--danger)', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Guru */}
      {isAddOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Tambah Akun Guru / Petugas
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Buat akun untuk guru kelas atau petugas piket presensi sekolah.
                </div>
              </div>
              <button onClick={() => setIsAddOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nama Lengkap Guru / Petugas *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Siti Rahmawati, S.Pd."
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Contoh: bu.siti (tanpa spasi)"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  Digunakan oleh guru untuk login ke sistem.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Password Awal *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimal 6 karakter..."
                    style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: showAddPassword ? 'var(--primary)' : 'var(--text-muted)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showAddPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Akun Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit & Reset Password Guru */}
      {isEditOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Edit Akun & Reset Password
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Perbarui nama, username, atau beri password baru.
                </div>
              </div>
              <button onClick={() => setIsEditOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '1rem' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nama Lengkap Guru / Petugas *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--primary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <KeyRound size={14} />
                    <span>Reset Password Baru (Opsional)</span>
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Kosongkan jika password tidak diubah"
                    style={{ width: '100%', padding: '0.55rem 2.5rem 0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: '#ffffff' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: showEditPassword ? 'var(--primary)' : 'var(--text-muted)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    title={showEditPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem', display: 'block' }}>
                  Hanya isi field ini jika guru lupa password dan meminta reset password baru.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsEditOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal Hapus Guru */}
      {deleteTarget && (
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
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--danger)' }}>
              <div style={{ padding: '0.6rem', backgroundColor: '#fef2f2', borderRadius: '50%' }}>
                <AlertTriangle size={24} />
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b' }}>
                Hapus Akun Guru
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus akun guru <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong> (@{deleteTarget.username})? Guru ini tidak akan bisa login lagi ke sistem.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isSubmitting}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="btn btn-danger"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
