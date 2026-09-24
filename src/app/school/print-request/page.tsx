'use client';

import React, { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import {
  FileCheck,
  CheckSquare,
  Square,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';

interface StudentCandidate {
  id: string;
  fullName: string;
  nis: string;
  gender: string;
  photoUrl?: string | null;
  classRoom: { id: string; name: string };
  cards: Array<{
    id: string;
    cardId: string;
    status: string;
  }>;
}

interface PrintRequestItem {
  id: string;
  requestNumber: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  cards: Array<{
    id: string;
    cardId: string;
    student: {
      fullName: string;
      classRoom: { name: string };
    };
  }>;
}

interface ClassItem {
  id: string;
  name: string;
}

export default function SchoolPrintRequestPage() {
  const { toast, showAlert } = useNotification();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [candidates, setCandidates] = useState<StudentCandidate[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [pastRequests, setPastRequests] = useState<PrintRequestItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with_photo' | 'without_photo'>('all');

  // Quick Photo Upload Modal
  const [uploadTarget, setUploadTarget] = useState<StudentCandidate | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

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
      const [resStu, resReq, resCla] = await Promise.all([
        fetch('/api/school/students'),
        fetch('/api/school/print-request'),
        fetch('/api/school/classes'),
      ]);

      const dataStu = await resStu.json();
      const dataReq = await resReq.json();
      const dataCla = await resCla.json();

      if (dataStu.students) setCandidates(dataStu.students);
      if (dataReq.requests) setPastRequests(dataReq.requests);
      if (dataCla.classes) setClasses(dataCla.classes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Filter calculation
  const filteredCandidates = candidates.filter((s) => {
    const matchesSearch =
      !search ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.includes(search);
    const matchesClass = !selectedClass || s.classRoom?.id === selectedClass;
    const hasPhoto = Boolean(s.photoUrl && s.photoUrl.trim() !== '');

    let matchesPhoto = true;
    if (photoFilter === 'with_photo') matchesPhoto = hasPhoto;
    else if (photoFilter === 'without_photo') matchesPhoto = !hasPhoto;

    return matchesSearch && matchesClass && matchesPhoto;
  });

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage) || 1;
  const displayedCandidates = filteredCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const totalWithPhoto = candidates.filter((s) => Boolean(s.photoUrl && s.photoUrl.trim() !== '')).length;
  const totalWithoutPhoto = candidates.length - totalWithPhoto;

  const toggleSelect = (s: StudentCandidate) => {
    const hasPhoto = Boolean(s.photoUrl && s.photoUrl.trim() !== '');
    if (!hasPhoto) {
      toast.warning(
        'Pasfoto Belum Ada',
        `Siswa ${s.fullName} belum memiliki pasfoto. Silakan klik tombol "Upload Foto" terlebih dahulu.`
      );
      return;
    }

    if (selectedIds.includes(s.id)) {
      setSelectedIds(selectedIds.filter((item) => item !== s.id));
    } else {
      setSelectedIds([...selectedIds, s.id]);
    }
  };

  const selectAllVisibleWithPhoto = () => {
    const eligibleVisible = filteredCandidates
      .filter((s) => Boolean(s.photoUrl && s.photoUrl.trim() !== ''))
      .map((s) => s.id);

    const merged = Array.from(new Set([...selectedIds, ...eligibleVisible]));
    setSelectedIds(merged);

    toast.info(
      'Siswa Dipilih',
      `${eligibleVisible.length} siswa yang memiliki pasfoto pada filter saat ini telah dicentang.`
    );
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  // Process and upload photo directly
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Format Tidak Didukung', 'Harap pilih file gambar (JPG, PNG, atau WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
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
          setUploadPreview(canvas.toDataURL('image/jpeg', 0.88));
        } else {
          setUploadPreview(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhoto = async () => {
    if (!uploadTarget) return;
    setIsSavingPhoto(true);

    try {
      const res = await fetch('/api/school/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: uploadTarget.id,
          photoUrl: uploadPreview,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan foto siswa.');

      toast.success('Foto Berhasil Disimpan', `Pasfoto ${uploadTarget.fullName} telah tersimpan.`);

      // Auto-select this student now that they have a photo
      if (uploadPreview && !selectedIds.includes(uploadTarget.id)) {
        setSelectedIds((prev) => [...prev, uploadTarget.id]);
      }

      setUploadTarget(null);
      setUploadPreview('');
      loadData();
    } catch (err: any) {
      toast.error('Gagal', err.message);
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    setSubmitting(true);

    try {
      const res = await fetch('/api/school/print-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedIds, notes }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal mengajukan permohonan.');
      }

      setSelectedIds([]);
      setNotes('');
      showAlert({
        type: 'success',
        title: 'Pengajuan Cetak Berhasil Dikirim!',
        message: `Permohonan cetak ${result.totalCards} kartu siswa berhasil dikirim ke Developer Pusat untuk diverifikasi dan dicetak secara fisik.`,
        details: [
          { label: 'Nomor Pengajuan', value: result.printRequest.requestNumber, copyable: true },
          { label: 'Total Kartu', value: `${result.totalCards} Siswa` },
          { label: 'Status Saat Ini', value: 'MENUNGGU VERIFIKASI' },
        ],
        confirmText: 'Selesai & Tutup',
      });
      loadData();
    } catch (err: any) {
      toast.error('Gagal Mengajukan Cetak', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Pengajuan Cetak Kartu Siswa
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Pilih siswa yang sudah memiliki pasfoto untuk diajukan ke Developer agar dicetak secara fisik.
        </p>
      </div>

      {/* Summary KPI Badges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            borderLeft: '4px solid #3b82f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => {
            setPhotoFilter('all');
            setCurrentPage(1);
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Siswa</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>{candidates.length}</div>
          </div>
          <span className="badge badge-info">Semua</span>
        </div>

        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            borderLeft: '4px solid #10b981',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: photoFilter === 'with_photo' ? '#f0fdf4' : 'white',
            cursor: 'pointer',
          }}
          onClick={() => {
            setPhotoFilter('with_photo');
            setCurrentPage(1);
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700 }}>✅ Siap Diajukan (Ada Foto)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#065f46' }}>{totalWithPhoto}</div>
          </div>
          <span className="badge badge-success">Siap Cetak</span>
        </div>

        <div
          className="card"
          style={{
            padding: '1rem 1.25rem',
            borderLeft: '4px solid #ef4444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: photoFilter === 'without_photo' ? '#fef2f2' : 'white',
            cursor: 'pointer',
          }}
          onClick={() => {
            setPhotoFilter('without_photo');
            setCurrentPage(1);
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 700 }}>⚠️ Belum Ada Pasfoto</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b' }}>{totalWithoutPhoto}</div>
          </div>
          <span className="badge badge-danger">Perlu Foto</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Student Selection Checklist */}
        <div className="card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <div className="card-title" style={{ fontSize: '1.05rem' }}>Pilih Siswa Berfoto</div>
              <div className="card-subtitle">
                Centang siswa yang siap diajukan cetak ({selectedIds.length} Siswa Dipilih)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={selectAllVisibleWithPhoto}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: '#0c35a6',
                  borderColor: '#bfdbfe',
                  backgroundColor: '#eff6ff',
                }}
              >
                <CheckSquare size={14} />
                <span>Pilih Semua Berfoto</span>
              </button>

              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={deselectAll}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                >
                  Batal Pilih
                </button>
              )}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div
            style={{
              padding: '0.85rem',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1rem',
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari nama atau NIS siswa..."
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem 0.45rem 2.2rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                }}
              />
            </div>

            <div style={{ width: '160px' }}>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  backgroundColor: 'white',
                }}
              >
                <option value="">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ width: '180px' }}>
              <select
                value={photoFilter}
                onChange={(e) => {
                  setPhotoFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.825rem',
                  backgroundColor: 'white',
                  fontWeight: 600,
                  color: photoFilter === 'with_photo' ? '#047857' : photoFilter === 'without_photo' ? '#b91c1c' : '#1e293b',
                }}
              >
                <option value="all">Semua Status Foto</option>
                <option value="with_photo">✅ Sudah Ada Foto</option>
                <option value="without_photo">⚠️ Belum Ada Foto</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Pilih</th>
                  <th style={{ width: '50px' }}>Foto</th>
                  <th>Nama Siswa</th>
                  <th>Kelas</th>
                  <th>NIS</th>
                  <th>Kelengkapan Foto</th>
                  <th>Status Kartu</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Memuat daftar siswa...
                    </td>
                  </tr>
                ) : displayedCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Tidak ada data siswa yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  displayedCandidates.map((s) => {
                    const latestCard = s.cards[0];
                    const isSelected = selectedIds.includes(s.id);
                    const hasPhoto = Boolean(s.photoUrl && s.photoUrl.trim() !== '');

                    return (
                      <tr
                        key={s.id}
                        onClick={() => toggleSelect(s)}
                        style={{
                          cursor: hasPhoto ? 'pointer' : 'default',
                          backgroundColor: isSelected ? '#f0fdf4' : undefined,
                        }}
                      >
                        <td>
                          {hasPhoto ? (
                            isSelected ? (
                              <CheckSquare size={18} color="#0c35a6" />
                            ) : (
                              <Square size={18} color="#94a3b8" />
                            )
                          ) : (
                            <Square size={18} color="#e2e8f0" style={{ cursor: 'not-allowed' }} />
                          )}
                        </td>
                        <td>
                          <div
                            style={{
                              width: '36px',
                              height: '46px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {s.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={s.photoUrl}
                                alt={s.fullName}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <ImageIcon size={16} color="#94a3b8" />
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {s.fullName}
                          </div>
                        </td>
                        <td>{s.classRoom?.name}</td>
                        <td style={{ fontFamily: 'monospace' }}>{s.nis}</td>
                        <td>
                          {hasPhoto ? (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: '#dcfce7',
                                color: '#15803d',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                              }}
                            >
                              <CheckCircle2 size={12} />
                              Foto Lengkap
                            </span>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <AlertCircle size={12} />
                                Belum Ada Foto
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUploadTarget(s);
                                  setUploadPreview(s.photoUrl || '');
                                }}
                                style={{
                                  padding: '0.2rem 0.45rem',
                                  fontSize: '0.7rem',
                                  backgroundColor: '#f1f5f9',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  color: '#0369a1',
                                  fontWeight: 600,
                                }}
                              >
                                + Upload
                              </button>
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              latestCard?.status === 'AKTIF'
                                ? 'badge-success'
                                : latestCard?.status === 'DIAJUKAN' || latestCard?.status === 'MENUNGGU_VERIFIKASI'
                                ? 'badge-warning'
                                : 'badge-info'
                            }`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {latestCard?.status || 'DRAFT'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredCandidates.length > itemsPerPage && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1rem',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.825rem',
                color: 'var(--text-secondary)',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredCandidates.length)} dari {filteredCandidates.length} siswa
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Sebelumnya
                </button>
                <span style={{ padding: '0 0.4rem', fontWeight: 700 }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Submission Form & Past Requests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontSize: '1rem' }}>Ringkasan Pengajuan</div>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1.25rem',
                border: '1px solid #bfdbfe',
              }}
            >
              <div style={{ fontSize: '0.825rem', color: '#1e40af', fontWeight: 600 }}>
                Jumlah Kartu Siap Diajukan:
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0c35a6', lineHeight: 1.1, marginTop: '0.35rem' }}>
                {selectedIds.length} <span style={{ fontSize: '1rem', fontWeight: 700 }}>Siswa</span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Catatan Pengajuan ke Developer (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Permohonan cetak kartu siswa baru Kelas 1 semester ganjil"
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}
                />
              </div>

              <button
                type="submit"
                disabled={selectedIds.length === 0 || submitting}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0c35a6 0%, #0284c7 100%)',
                  boxShadow: '0 4px 15px rgba(12, 53, 166, 0.35)',
                  opacity: selectedIds.length === 0 || submitting ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <Send size={16} />
                <span>{submitting ? 'Mengirim Pengajuan...' : `AJUKAN CETAK (${selectedIds.length} SISWA)`}</span>
              </button>
            </form>
          </div>

          {/* Past Requests History */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ fontSize: '1rem' }}>Riwayat Pengajuan Sekolah</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pastRequests.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                  Belum ada riwayat pengajuan cetak.
                </div>
              ) : (
                pastRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '0.85rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace', color: '#0c35a6' }}>
                        {req.requestNumber}
                      </span>
                      <span
                        className={`badge ${
                          req.status === 'SELESAI'
                            ? 'badge-success'
                            : req.status === 'MENUNGGU_VERIFIKASI'
                            ? 'badge-warning'
                            : 'badge-info'
                        }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Total: <strong>{req.cards.length} kartu</strong> • Diajukan pada {new Date(req.createdAt).toLocaleDateString('id-ID')}
                    </div>
                    {req.notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        &quot;{req.notes}&quot;
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Photo Upload Modal */}
      {uploadTarget && (
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
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Upload Pas Foto Siswa
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {uploadTarget.fullName} (NIS: {uploadTarget.nis})
                </div>
              </div>
              <button
                onClick={() => setUploadTarget(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.5rem',
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  width: '90px',
                  height: '115px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: '#e2e8f0',
                  border: '2px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                }}
              >
                {uploadPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={uploadPreview} alt="Preview Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ImageIcon size={36} color="#94a3b8" />
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/webp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processImageFile(file);
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-primary"
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Upload size={15} />
                <span>{uploadPreview ? 'Ganti Foto' : 'Pilih File Pas Foto'}</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setUploadTarget(null)}
                className="btn btn-secondary"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={!uploadPreview || isSavingPhoto}
                className="btn btn-primary"
                style={{ fontWeight: 700 }}
              >
                {isSavingPhoto ? 'Menyimpan...' : 'Simpan & Centang Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
