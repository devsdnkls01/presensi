'use client';

import React, { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import { useNotification } from '@/context/NotificationContext';
import { optimizeCloudinaryUrl } from '@/lib/cloudinary';
import {
  Users,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  X,
  AlertCircle,
  Edit2,
  Trash2,
  Camera,
  Upload,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';

interface StudentItem {
  id: string;
  nis: string;
  nisn?: string | null;
  fullName: string;
  gender: string;
  status: string;
  photoUrl?: string | null;
  classRoom: {
    id: string;
    name: string;
  };
  cards: Array<{
    id: string;
    cardId: string;
    status: string;
    qrToken?: { token: string; isActive: boolean } | null;
  }>;
}

interface ClassItem {
  id: string;
  name: string;
}

export default function SchoolStudentsPage() {
  const { toast } = useNotification();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Modal Add Student
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    nis: '',
    nisn: '',
    fullName: '',
    gender: 'L',
    classRoomId: '',
    photoUrl: '',
  });

  // Modal Edit Student
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    nis: '',
    nisn: '',
    fullName: '',
    gender: 'L',
    classRoomId: '',
    photoUrl: '',
  });

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<StudentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // File input refs for image upload
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (selectedClass) queryParams.append('classId', selectedClass);

      const [resStu, resCla] = await Promise.all([
        fetch(`/api/school/students?${queryParams.toString()}`),
        fetch('/api/school/classes'),
      ]);

      const stuData = await resStu.json();
      const claData = await resCla.json();

      if (stuData.students) setStudents(stuData.students);
      if (claData.classes) setClasses(claData.classes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, search, selectedClass]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const totalPages = Math.ceil(students.length / itemsPerPage) || 1;
  const displayedStudents = students.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Helper to process & compress image to Base64
  const processImageFile = (file: File, callback: (base64Url: string) => void) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Format Tidak Didukung', 'Harap pilih file gambar (JPG, PNG, atau WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize to standard card portrait (max 400x520) for crisp lightweight storage
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 520;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
          callback(compressedBase64);
        } else {
          callback(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/school/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal menambahkan siswa.');
      }

      toast.success('Siswa Berhasil Ditambahkan', `Data siswa ${formData.fullName} telah tersimpan.`);
      setIsAddOpen(false);
      setFormData({
        nis: '',
        nisn: '',
        fullName: '',
        gender: 'L',
        classRoomId: '',
        photoUrl: '',
      });
      loadData();
    } catch (err: any) {
      setFormError(err.message);
      toast.error('Gagal Menambahkan Siswa', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (student: StudentItem) => {
    setEditFormData({
      id: student.id,
      nis: student.nis,
      nisn: student.nisn || '',
      fullName: student.fullName,
      gender: student.gender,
      classRoomId: student.classRoom?.id || '',
      photoUrl: student.photoUrl || '',
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/school/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal memperbarui data siswa.');
      }

      toast.success('Data Siswa Diperbarui', `Data ${editFormData.fullName} berhasil disimpan.`);
      setIsEditOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
      toast.error('Gagal Memperbarui Siswa', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/school/students?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal menghapus siswa.');
      }

      toast.success('Siswa Dihapus', `Data ${deleteTarget.fullName} telah dihapus dari sistem.`);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      toast.error('Gagal Menghapus Siswa', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Data Siswa & Kartu
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Kelola data siswa, unggah pas foto, dan pencetakan kartu ID ({students.length} Total Siswa).
          </p>
        </div>

        <button onClick={() => setIsAddOpen(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={18} />
          <span>Tambah Siswa Baru</span>
        </button>
      </div>

      {/* Privacy Regulation Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1.25rem',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.825rem',
          color: '#1e40af',
        }}
      >
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Kebijakan Perlindungan Data & Privasi:</strong> Sistem ini hanya mencatat data yang relevan untuk identifikasi kartu dan presensi. Dilarang menyimpan NIK, Nomor KK, atau alamat tempat tinggal siswa.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari berdasarkan nama atau NIS..."
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.4rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div style={{ width: '220px' }}>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.6rem 1rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                backgroundColor: 'white',
              }}
            >
              <option value="">Semua Kelas</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Foto</th>
                <th>NIS</th>
                <th>NISN</th>
                <th>Nama Lengkap</th>
                <th>JK</th>
                <th>Kelas</th>
                <th>Card ID</th>
                <th>Status Kartu</th>
                <th style={{ textAlign: 'center', width: '150px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Memuat data siswa...
                  </td>
                </tr>
              ) : displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Tidak ada siswa yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((st) => {
                  const latestCard = st.cards[0];
                  let badgeClass = 'badge-info';
                  if (latestCard?.status === 'AKTIF') badgeClass = 'badge-success';
                  else if (latestCard?.status === 'DIAJUKAN' || latestCard?.status === 'MENUNGGU_VERIFIKASI') badgeClass = 'badge-warning';
                  else if (latestCard?.status === 'NONAKTIF') badgeClass = 'badge-danger';

                  return (
                    <tr key={st.id}>
                      <td>
                        <div
                          style={{
                            width: '42px',
                            height: '52px',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid var(--border-subtle)',
                            position: 'relative',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleEditClick(st)}
                          title="Klik untuk ganti foto siswa"
                        >
                          {st.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={optimizeCloudinaryUrl(st.photoUrl, 120)}
                              alt={st.fullName}
                              loading="lazy"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#94a3b8', gap: '2px' }}>
                              <Camera size={14} />
                              <span>Upload</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{st.nis}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{st.nisn || '-'}</td>
                      <td style={{ fontWeight: 700 }}>{st.fullName}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: st.gender === 'L' ? '#dbeafe' : '#fce7f3',
                            color: st.gender === 'L' ? '#1e40af' : '#9d174d',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {st.gender}
                        </span>
                      </td>
                      <td>{st.classRoom?.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--primary)' }}>
                        {latestCard?.cardId || '-'}
                      </td>
                      <td>
                        <span className={`badge ${badgeClass}`}>
                          {latestCard?.status || 'DRAFT'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEditClick(st)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              color: '#0369a1',
                              borderColor: '#bae6fd',
                              backgroundColor: '#f0f9ff',
                            }}
                            title="Edit data dan pas foto siswa"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(st)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.5rem',
                              fontSize: '0.75rem',
                              color: '#b91c1c',
                              borderColor: '#fecaca',
                              backgroundColor: '#fef2f2',
                            }}
                            title="Hapus siswa ini"
                          >
                            <Trash2 size={13} />
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

        {/* Pagination Footer */}
        {!loading && students.length > itemsPerPage && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div>
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, students.length)} dari {students.length} siswa
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Sebelumnya
              </button>
              <span style={{ padding: '0 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add Student */}
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
              boxShadow: 'var(--shadow-xl)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Tambah Data Siswa Baru
              </div>
              <button onClick={() => setIsAddOpen(false)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Photo Upload Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                <div
                  style={{
                    width: '70px',
                    height: '88px',
                    borderRadius: '6px',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    flexShrink: 0,
                  }}
                >
                  {formData.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.photoUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={28} color="#94a3b8" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Pas Foto Siswa (Opsional)
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    Format JPG/PNG, ukuran 3x4 / rasio pas foto untuk cetak kartu ID.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      ref={addFileInputRef}
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          processImageFile(file, (base64) => setFormData({ ...formData, photoUrl: base64 }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => addFileInputRef.current?.click()}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Upload size={14} />
                      <span>{formData.photoUrl ? 'Ganti Foto' : 'Pilih Foto'}</span>
                    </button>
                    {formData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photoUrl: '' })}
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.775rem', color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  NIS (Nomor Induk Siswa) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  placeholder="Contoh: 10245"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  NISN (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.nisn}
                  onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                  placeholder="Nomor Induk Siswa Nasional jika ada"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Contoh: Muhammad Farhan"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Jenis Kelamin *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Kelas / Rombel *
                  </label>
                  <select
                    required
                    value={formData.classRoomId}
                    onChange={(e) => setFormData({ ...formData, classRoomId: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Student */}
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
              maxWidth: '540px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Edit Data & Foto Siswa
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Perbarui identitas dan foto siswa untuk cetak kartu.
                </div>
              </div>
              <button onClick={() => setIsEditOpen(false)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger-border)',
                  color: 'var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Photo Upload Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid #e2e8f0' }}>
                <div
                  style={{
                    width: '74px',
                    height: '92px',
                    borderRadius: '6px',
                    backgroundColor: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '2px solid #cbd5e1',
                    flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  {editFormData.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={optimizeCloudinaryUrl(editFormData.photoUrl, 200)} alt="Preview Foto Siswa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={30} color="#94a3b8" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                    Pas Foto Siswa
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.6rem' }}>
                    Upload foto siswa langsung dari HP / komputer (JPG, PNG, WebP).
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          processImageFile(file, (base64) => setEditFormData({ ...editFormData, photoUrl: base64 }));
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="btn btn-primary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Upload size={14} />
                      <span>{editFormData.photoUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
                    </button>
                    {editFormData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, photoUrl: '' })}
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.775rem', color: '#dc2626', background: 'none', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  NIS (Nomor Induk Siswa) *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.nis}
                  onChange={(e) => setEditFormData({ ...editFormData, nis: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  NISN (Opsional)
                </label>
                <input
                  type="text"
                  value={editFormData.nisn}
                  onChange={(e) => setEditFormData({ ...editFormData, nisn: e.target.value })}
                  placeholder="Nomor Induk Siswa Nasional jika ada"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Jenis Kelamin *
                  </label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Kelas / Rombel *
                  </label>
                  <select
                    required
                    value={editFormData.classRoomId}
                    onChange={(e) => setEditFormData({ ...editFormData, classRoomId: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
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

      {/* Modal Delete Confirmation */}
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
              maxWidth: '420px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#dc2626' }}>
              <AlertCircle size={24} />
              <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Konfirmasi Hapus Siswa</div>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Apakah Anda yakin ingin menghapus data siswa <strong>{deleteTarget.fullName}</strong> (NIS: {deleteTarget.nis})?
              Semua kartu dan riwayat terkait siswa ini juga akan dihapus.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="btn btn-danger"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
