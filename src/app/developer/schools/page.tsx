'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import { useNotification } from '@/context/NotificationContext';
import {
  School,
  Plus,
  Users,
  GraduationCap,
  X,
  CheckCircle2,
  Edit2,
  Trash2,
  KeyRound,
  Shield,
  Clock,
  AlertTriangle,
  Building2,
} from 'lucide-react';

interface SchoolItem {
  id: string;
  name: string;
  npsn: string;
  address?: string | null;
  checkInStartTime: string;
  lateAfter: string;
  users: Array<{ id: string; name: string; username: string; role: string }>;
  _count: {
    students: number;
    classes: number;
    printRequests: number;
  };
}

export default function DeveloperSchoolsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SchoolItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { toast } = useNotification();

  const [form, setForm] = useState({
    name: '',
    npsn: '',
    address: '',
    adminName: '',
    adminUsername: '',
    adminPassword: '',
  });

  const [editForm, setEditForm] = useState({
    id: '',
    name: '',
    npsn: '',
    address: '',
    checkInStartTime: '06:00',
    lateAfter: '07:00',
    adminName: '',
    adminUsername: '',
    adminPassword: '',
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/schools');
      const data = await res.json();
      if (data.schools) setSchools(data.schools);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data sekolah.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadSchools();
  }, [user]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/developer/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal menambahkan sekolah.');
      }

      toast.success(`Sekolah ${form.name} berhasil didaftarkan!`);
      setIsAddOpen(false);
      setForm({
        name: '',
        npsn: '',
        address: '',
        adminName: '',
        adminUsername: '',
        adminPassword: '',
      });
      loadSchools();
    } catch (err: any) {
      setFormError(err.message);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (s: SchoolItem) => {
    const admin = s.users.find((u) => u.role === 'SCHOOL_ADMIN');
    setEditForm({
      id: s.id,
      name: s.name,
      npsn: s.npsn,
      address: s.address || '',
      checkInStartTime: s.checkInStartTime || '06:00',
      lateAfter: s.lateAfter || '07:00',
      adminName: admin ? admin.name : '',
      adminUsername: admin ? admin.username : '',
      adminPassword: '',
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/developer/schools', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal memperbarui data sekolah.');
      }

      toast.success(`Data ${editForm.name} berhasil diperbarui!`);
      setIsEditOpen(false);
      loadSchools();
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
      const res = await fetch(`/api/developer/schools?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal menghapus sekolah.');
      }

      toast.success(`Sekolah ${deleteTarget.name} berhasil dihapus.`);
      setDeleteTarget(null);
      loadSchools();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout user={user}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Kelola Multi-Sekolah SD/MI
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Daftar lembaga sekolah dasar dan madrasah ibtidaiyah terdaftar beserta pengelolaan akun administrator sekolah.
          </p>
        </div>

        <button onClick={() => { setIsAddOpen(true); setFormError(''); }} className="btn btn-primary">
          <Plus size={18} />
          <span>Tambah Sekolah Baru</span>
        </button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Sekolah</th>
                <th>NPSN</th>
                <th>Alamat Sekolah</th>
                <th>Admin Sekolah</th>
                <th>Total Siswa</th>
                <th>Total Kelas</th>
                <th>Aturan Masuk</th>
                <th style={{ textAlign: 'center', width: '170px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Memuat data sekolah...
                  </td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Belum ada sekolah terdaftar.
                  </td>
                </tr>
              ) : (
                schools.map((s) => {
                  const admin = s.users.find((u) => u.role === 'SCHOOL_ADMIN');
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 800, color: 'var(--primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Building2 size={16} style={{ color: 'var(--primary)' }} />
                          <span>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>{s.npsn}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{s.address || '-'}</td>
                      <td>
                        {admin ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Shield size={12} style={{ color: 'var(--primary)' }} />
                              <span>{admin.name}</span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              @{admin.username}
                            </div>
                          </div>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Belum Ada Admin</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-info">{s._count.students} Siswa</span>
                      </td>
                      <td>{s._count.classes} Kelas</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {s.checkInStartTime} - {s.lateAfter}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                          <button
                            onClick={() => openEditModal(s)}
                            className="btn btn-secondary btn-sm"
                            title="Edit Data Sekolah & Kelola Akun Admin"
                            style={{ padding: '0.4rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            <Edit2 size={13} />
                            <span>Edit & Admin</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(s)}
                            className="btn btn-outline btn-sm"
                            title="Hapus Sekolah"
                            style={{ padding: '0.4rem 0.55rem', color: 'var(--danger)', borderColor: '#fecaca', backgroundColor: '#fef2f2' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add School */}
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
              maxWidth: '540px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Tambah Sekolah & Akun Admin
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

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Nama Sekolah (SD/MI) *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: SDN Kalisalak 02"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    NPSN *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.npsn}
                    onChange={(e) => setForm({ ...form, npsn: e.target.value })}
                    placeholder="20325499"
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Alamat Instansi Sekolah
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Jl. Merdeka No. 1"
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Shield size={14} />
                  <span>Akun Admin Sekolah:</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Nama Petugas Admin
                    </label>
                    <input
                      type="text"
                      value={form.adminName}
                      onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                      placeholder="Admin SDN Kalisalak 02"
                      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.adminUsername}
                        onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                        placeholder="admin.kalisalak02"
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Kata Sandi *
                      </label>
                      <input
                        type="password"
                        required
                        value={form.adminPassword}
                        onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                        placeholder="******"
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Sekolah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit School & Manage Admin */}
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
              maxWidth: '560px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Edit Data Sekolah & Kelola Akun Admin
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Perbarui profil lembaga sekolah dan reset akun admin sekolah.
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
                  Nama Sekolah (SD/MI) *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    NPSN *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.npsn}
                    onChange={(e) => setEditForm({ ...editForm, npsn: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Alamat Instansi
                  </label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Jam Mulai Masuk
                  </label>
                  <input
                    type="time"
                    value={editForm.checkInStartTime}
                    onChange={(e) => setEditForm({ ...editForm, checkInStartTime: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Batas Akhir / Terlambat
                  </label>
                  <input
                    type="time"
                    value={editForm.lateAfter}
                    onChange={(e) => setEditForm({ ...editForm, lateAfter: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <KeyRound size={15} />
                  <span>Pengaturan Akun Admin Sekolah:</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      Nama Petugas Admin
                    </label>
                    <input
                      type="text"
                      value={editForm.adminName}
                      onChange={(e) => setEditForm({ ...editForm, adminName: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: '#ffffff' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Username Admin *
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.adminUsername}
                        onChange={(e) => setEditForm({ ...editForm, adminUsername: e.target.value })}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: '#ffffff' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Password Baru <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Kosongkan jika tidak diganti)</span>
                      </label>
                      <input
                        type="password"
                        value={editForm.adminPassword}
                        onChange={(e) => setEditForm({ ...editForm, adminPassword: e.target.value })}
                        placeholder="Ketik password baru..."
                        style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: '#ffffff' }}
                      />
                    </div>
                  </div>
                </div>
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

      {/* Confirmation Modal Delete School */}
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
              maxWidth: '460px',
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
                Konfirmasi Hapus Sekolah
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus lembaga <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong> (NPSN: {deleteTarget.npsn})?
            </p>

            <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.8rem', color: '#9f1239' }}>
              <strong>Peringatan Penting:</strong>
              <ul style={{ margin: '0.35rem 0 0 1rem', padding: 0 }}>
                <li>Seluruh data <strong>{deleteTarget._count.students} Siswa</strong> & <strong>{deleteTarget._count.classes} Kelas</strong> akan dihapus permanen.</li>
                <li>Akun Admin Sekolah serta seluruh riwayat kartu dan presensi akan dimusnahkan.</li>
              </ul>
            </div>

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
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
