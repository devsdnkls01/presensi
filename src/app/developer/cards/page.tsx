'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import StudentCardPreview, { CardTemplateId } from '@/components/StudentCardPreview';
import { 
  CreditCard, 
  RefreshCw, 
  Power, 
  Eye, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  FileDown, 
  School as SchoolIcon, 
  GraduationCap, 
  ChevronRight, 
  Search, 
  Filter, 
  CheckCircle2, 
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { downloadCardPairAsPdf } from '@/lib/pdfGenerator';
import { useNotification } from '@/context/NotificationContext';

interface SchoolItem {
  id: string;
  name: string;
  npsn: string;
  address?: string | null;
  _count?: {
    students: number;
    classes: number;
  };
}

interface ClassItem {
  id: string;
  name: string;
  grade: number;
  section: string;
  _count?: {
    students: number;
  };
}

interface CardItem {
  id: string;
  cardId: string;
  status: string;
  activatedAt?: string | null;
  student: {
    id: string;
    fullName: string;
    nis: string;
    nisn?: string | null;
    gender: string;
    photoUrl?: string | null;
    school: { id: string; name: string; logo?: string | null };
    classRoom: { id: string; name: string };
  };
  qrToken?: { token: string; isActive: boolean } | null;
}

export default function DeveloperCardsPage() {
  const { toast, showAlert } = useNotification();
  const [user, setUser] = useState<SessionUser | null>(null);

  // Hierarchy Navigation State: SD > Kelas > Siswa
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(''); // '' means all or specific

  // Cards Data State
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AKTIF' | 'NONAKTIF'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Modals State
  const [previewCard, setPreviewCard] = useState<CardItem | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<CardTemplateId>('sapphire-navy');
  const [replaceModalCard, setReplaceModalCard] = useState<CardItem | null>(null);
  const [replaceReason, setReplaceReason] = useState('Kartu fisik hilang');
  const [isReplacing, setIsReplacing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // 1. Initial Load: Authenticate & Fetch Schools
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    // Fetch saved card template setting
    fetch('/api/developer/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.template?.templateId) {
          setPreviewTemplateId(data.template.templateId as CardTemplateId);
        }
      })
      .catch(() => {});
  }, []);

  const loadSchools = async () => {
    try {
      setLoadingSchools(true);
      const res = await fetch('/api/developer/schools');
      const data = await res.json();
      if (data.schools && Array.isArray(data.schools)) {
        setSchools(data.schools);
        // Default select the first school if available
        if (data.schools.length > 0 && !selectedSchoolId) {
          setSelectedSchoolId(data.schools[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load schools:', e);
      toast.error('Gagal Memuat Sekolah', 'Tidak dapat mengambil daftar sekolah.');
    } finally {
      setLoadingSchools(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSchools();
    }
  }, [user]);

  // 2. When School changes, load Classes for that School
  useEffect(() => {
    if (!selectedSchoolId) {
      setClasses([]);
      setSelectedClassId('');
      return;
    }

    const loadClasses = async () => {
      try {
        setLoadingClasses(true);
        const res = await fetch(`/api/school/classes?schoolId=${selectedSchoolId}`);
        const data = await res.json();
        if (data.classes && Array.isArray(data.classes)) {
          setClasses(data.classes);
          // Default to the first class so data is never dumped all at once
          if (data.classes.length > 0) {
            setSelectedClassId(data.classes[0].id);
          } else {
            setSelectedClassId('');
          }
        }
      } catch (e) {
        console.error('Failed to load classes:', e);
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, [selectedSchoolId]);

  // 3. Load Cards filtered by School and Class
  const loadCards = async () => {
    if (!selectedSchoolId) {
      setCards([]);
      return;
    }

    try {
      setLoadingCards(true);
      const params = new URLSearchParams();
      params.append('schoolId', selectedSchoolId);
      if (selectedClassId) {
        params.append('classRoomId', selectedClassId);
      }

      const res = await fetch(`/api/developer/cards?${params.toString()}`);
      const data = await res.json();
      if (data.cards) {
        setCards(data.cards);
      }
    } catch (e) {
      console.error('Failed to load cards:', e);
      toast.error('Gagal Memuat Kartu', 'Tidak dapat mengambil data kartu siswa.');
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    if (selectedSchoolId) {
      loadCards();
      setCurrentPage(1);
    }
  }, [selectedSchoolId, selectedClassId]);

  // Currently selected school and class objects
  const activeSchool = useMemo(() => {
    return schools.find((s) => s.id === selectedSchoolId);
  }, [schools, selectedSchoolId]);

  const activeClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Filter cards by search and status
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        c.cardId.toLowerCase().includes(s) ||
        c.student.fullName.toLowerCase().includes(s) ||
        c.student.nis.toLowerCase().includes(s) ||
        c.student.school.name.toLowerCase().includes(s) ||
        c.student.classRoom.name.toLowerCase().includes(s) ||
        (c.qrToken?.token && c.qrToken.token.toLowerCase().includes(s))
      );
    });
  }, [cards, search, statusFilter]);

  const totalPages = Math.ceil(filteredCards.length / itemsPerPage) || 1;
  const displayedCards = useMemo(() => {
    return filteredCards.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredCards, currentPage, itemsPerPage]);

  // Card stats in current selection
  const stats = useMemo(() => {
    const total = cards.length;
    const active = cards.filter((c) => c.status === 'AKTIF').length;
    const inactive = cards.filter((c) => c.status === 'NONAKTIF').length;
    return { total, active, inactive };
  }, [cards]);

  // Handlers
  const handleDownloadCardPdf = async () => {
    if (!previewCard || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const cleanName = previewCard.student.fullName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Kartu_Siswa_${cleanName}_${previewCard.cardId}.pdf`;
      await downloadCardPairAsPdf(
        'preview-dev-card-front',
        'preview-dev-card-back',
        filename
      );
      toast.success('Berhasil Mengunduh', `Dokumen ${filename} siap dicetak.`);
    } catch (err: any) {
      toast.error('Gagal Membuat PDF', err.message || 'Terjadi kesalahan saat memproses file PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const toggleStatus = async (card: CardItem) => {
    const nextStatus = card.status === 'AKTIF' ? 'NONAKTIF' : 'AKTIF';
    try {
      const res = await fetch('/api/developer/cards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: card.id, status: nextStatus }),
      });
      if (res.ok) {
        toast.success('Status Diperbarui', `Kartu ${card.cardId} (${card.student.fullName}) kini berstatus ${nextStatus}.`);
        loadCards();
      }
    } catch (e: any) {
      toast.error('Gagal Memperbarui Status', e.message);
    }
  };

  const handleConfirmReplace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceModalCard) return;

    setIsReplacing(true);
    const targetStudent = replaceModalCard;
    try {
      const res = await fetch('/api/developer/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldCardId: targetStudent.id,
          reason: replaceReason,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setReplaceModalCard(null);
        showAlert({
          type: 'success',
          title: 'Kartu Pengganti Berhasil Diterbitkan!',
          message: `Kartu lama (${targetStudent.cardId}) telah dinonaktifkan permanen. Kredensial baru untuk ${targetStudent.student.fullName} telah siap:`,
          details: [
            { label: 'Card ID Baru', value: result.newCard.cardId, copyable: true },
            { label: 'Token QR Baru', value: result.newToken, copyable: true },
            { label: 'Nama Siswa', value: targetStudent.student.fullName },
            { label: 'Alasan Penggantian', value: replaceReason },
          ],
          confirmText: 'Selesai & Mengerti',
        });
        loadCards();
      } else {
        toast.error('Gagal Menerbitkan Kartu', result.error || 'Gagal menerbitkan kartu pengganti.');
      }
    } catch (err: any) {
      toast.error('Gagal Menerbitkan Kartu', err.message);
    } finally {
      setIsReplacing(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout user={user}>
      {/* Page Title & Subtitle */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Manajemen Kartu Siswa & QR Token
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Navigasi berjenjang <strong>Pilih SD &gt; Pilih Kelas &gt; Data Siswa</strong> untuk mengelola kartu dan token tanpa penumpukan data.
        </p>
      </div>

      {/* Hierarchical Breadcrumb & Step Navigation Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Breadcrumb Steps */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.875rem' }}>
            {/* Step 1: Sekolah */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: selectedSchoolId ? '#eff6ff' : '#f1f5f9',
                color: selectedSchoolId ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                border: selectedSchoolId ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
              }}
            >
              <SchoolIcon size={16} />
              <span>1. SD: {activeSchool ? activeSchool.name : 'Pilih Sekolah'}</span>
            </div>

            <ChevronRight size={16} color="var(--text-muted)" />

            {/* Step 2: Kelas */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: selectedClassId ? '#ecfdf5' : '#f8fafc',
                color: selectedClassId ? '#059669' : 'var(--text-secondary)',
                fontWeight: 700,
                border: selectedClassId ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
              }}
            >
              <GraduationCap size={16} />
              <span>
                2. Kelas: {activeClass ? activeClass.name : selectedClassId === '' ? 'Semua Kelas' : 'Pilih Kelas'}
              </span>
            </div>

            <ChevronRight size={16} color="var(--text-muted)" />

            {/* Step 3: Data Siswa */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: '#fdf4ff',
                color: '#9333ea',
                fontWeight: 700,
                border: '1px solid #f5d0fe',
              }}
            >
              <CreditCard size={16} />
              <span>3. Data Siswa ({filteredCards.length} Kartu)</span>
            </div>
          </div>

          {/* Quick School Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Ganti SD:
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => {
                setSelectedSchoolId(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.45rem 0.85rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s._count?.students || 0} Siswa)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Step 2: Class Pills / Selector */}
      {selectedSchoolId && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Pilih Kelas di {activeSchool?.name || 'Sekolah Terpilih'}:
              </span>
            </div>
            <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              Klik salah satu kelas untuk menampilkan kartu siswa kelas tersebut
            </span>
          </div>

          {loadingClasses ? (
            <div style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Memuat daftar kelas...
            </div>
          ) : classes.length === 0 ? (
            <div style={{ padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Belum ada kelas yang didaftarkan di sekolah ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {/* Option: Semua Kelas */}
              <button
                type="button"
                onClick={() => {
                  setSelectedClassId('');
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  fontWeight: selectedClassId === '' ? 700 : 500,
                  cursor: 'pointer',
                  border: selectedClassId === '' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: selectedClassId === '' ? 'linear-gradient(135deg, #1e40af, #2563eb)' : '#f8fafc',
                  color: selectedClassId === '' ? '#ffffff' : 'var(--text-primary)',
                  boxShadow: selectedClassId === '' ? '0 4px 10px rgba(37,99,235,0.25)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <span>Semua Kelas</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '999px',
                    background: selectedClassId === '' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: selectedClassId === '' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {activeSchool?._count?.students || 0}
                </span>
              </button>

              {/* Class Pills */}
              {classes.map((cls) => {
                const isSelected = selectedClassId === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '0.5rem 1.1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.825rem',
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      background: isSelected
                        ? 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)'
                        : '#ffffff',
                      color: isSelected ? '#ffffff' : 'var(--text-primary)',
                      boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.28)' : '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span>{cls.name}</span>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '999px',
                        fontWeight: 700,
                        background: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      {cls._count?.students || 0} siswa
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Context Summary & Filter Controls */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Active Context Banner */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {activeSchool?.name || 'Pilih SD'}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                {activeClass ? activeClass.name : 'Seluruh Kelas'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Menampilkan <strong>{filteredCards.length}</strong> kartu siswa
              {statusFilter !== 'ALL' && ` berstatus ${statusFilter}`}
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.775rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: statusFilter === 'ALL' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                background: statusFilter === 'ALL' ? '#eff6ff' : '#ffffff',
                color: statusFilter === 'ALL' ? 'var(--primary)' : 'var(--text-secondary)',
              }}
            >
              Semua: <strong>{stats.total}</strong>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('AKTIF');
                setCurrentPage(1);
              }}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.775rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: statusFilter === 'AKTIF' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                background: statusFilter === 'AKTIF' ? '#ecfdf5' : '#ffffff',
                color: statusFilter === 'AKTIF' ? '#047857' : 'var(--text-secondary)',
              }}
            >
              Aktif: <strong>{stats.active}</strong>
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('NONAKTIF');
                setCurrentPage(1);
              }}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.775rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: statusFilter === 'NONAKTIF' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                background: statusFilter === 'NONAKTIF' ? '#fef2f2' : '#ffffff',
                color: statusFilter === 'NONAKTIF' ? '#b91c1c' : 'var(--text-secondary)',
              }}
            >
              Nonaktif: <strong>{stats.inactive}</strong>
            </button>
          </div>
        </div>

        {/* Search input */}
        <div style={{ marginTop: '0.85rem', position: 'relative' }}>
          <Search
            size={16}
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
            placeholder={`Cari nama siswa, NIS, Card ID, atau QR Token di ${activeClass ? activeClass.name : 'kelas ini'}...`}
            style={{
              width: '100%',
              padding: '0.55rem 1rem 0.55rem 2.25rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              background: '#ffffff',
            }}
          />
        </div>
      </div>

      {/* Main Cards Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '45px' }}>No</th>
                <th>Card ID</th>
                <th>QR Token</th>
                <th>Nama Siswa</th>
                <th>Kelas & NIS</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi Developer</th>
              </tr>
            </thead>
            <tbody>
              {loadingCards ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Memuat data kartu siswa kelas {activeClass?.name || ''}...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedCards.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ maxWidth: '380px', margin: '0 auto' }}>
                      <CreditCard size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        Tidak Ada Kartu Siswa Ditemukan
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {search
                          ? `Tidak ada data kartu yang cocok dengan pencarian "${search}".`
                          : `Belum ada kartu terdaftar di ${activeClass?.name || 'pilihan ini'}.`}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedCards.map((c, idx) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{itemIndex}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', fontSize: '0.825rem' }}>
                        {c.cardId}
                      </td>
                      <td>
                        <code
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.45rem',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            color: '#0f172a',
                            fontWeight: 600,
                          }}
                        >
                          {c.qrToken?.token || '-'}
                        </code>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {c.student.fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Gender: {c.student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                          {c.student.classRoom.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          NIS: {c.student.nis} {c.student.nisn ? `• NISN: ${c.student.nisn}` : ''}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            c.status === 'AKTIF'
                              ? 'badge-success'
                              : c.status === 'NONAKTIF'
                              ? 'badge-danger'
                              : 'badge-warning'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            onClick={() => setPreviewCard(c)}
                            className="btn btn-secondary btn-sm"
                            title="Lihat Pratinjau Kartu Siswa"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem' }}
                          >
                            <Eye size={13} />
                            <span>Lihat</span>
                          </button>

                          <button
                            onClick={() => toggleStatus(c)}
                            className={`btn btn-sm ${c.status === 'AKTIF' ? 'btn-danger' : 'btn-success'}`}
                            title={c.status === 'AKTIF' ? 'Nonaktifkan Kartu' : 'Aktifkan Kartu'}
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.775rem' }}
                          >
                            <Power size={13} />
                            <span>{c.status === 'AKTIF' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                          </button>

                          <button
                            onClick={() => setReplaceModalCard(c)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#d97706', padding: '0.35rem 0.65rem', fontSize: '0.775rem' }}
                            title="Ganti Kartu Hilang"
                          >
                            <RefreshCw size={13} />
                            <span>Kartu Hilang</span>
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
        {!loadingCards && filteredCards.length > itemsPerPage && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '0.75rem',
              fontSize: '0.825rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div>
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, filteredCards.length)} dari {filteredCards.length} kartu
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.775rem' }}
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
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.775rem' }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Card Preview */}
      {previewCard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
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
              maxWidth: '750px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Pratinjau Kartu Siswa</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {previewCard.student.school.name} • {previewCard.student.classRoom.name} • {previewCard.student.fullName}
                </div>
              </div>
              <button
                onClick={() => setPreviewCard(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem', overflowX: 'auto', padding: '0.5rem 0' }}>
              <StudentCardPreview
                schoolName={previewCard.student.school.name}
                studentName={previewCard.student.fullName}
                nis={previewCard.student.nis}
                nisn={previewCard.student.nisn}
                classNameStr={previewCard.student.classRoom.name}
                photoUrl={previewCard.student.photoUrl}
                logoUrl={previewCard.student.school?.logo || '/logo.svg'}
                cardId={previewCard.cardId}
                qrToken={previewCard.qrToken?.token}
                side="both"
                idPrefix="preview-dev-card"
                templateId={previewTemplateId}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8rem' }}>
                Status: <span className="badge badge-success">{previewCard.status}</span> • Token:{' '}
                <code>{previewCard.qrToken?.token || '-'}</code>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={handleDownloadCardPdf}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.825rem' }}
                >
                  <FileDown size={15} />
                  <span>{downloadingPdf ? 'Membuat PDF...' : 'Download File PDF (Depan & Belakang)'}</span>
                </button>
                <button onClick={() => setPreviewCard(null)} className="btn btn-secondary btn-sm">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Replace Lost Card */}
      {replaceModalCard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
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
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--danger)' }}>
                Penggantian Kartu Siswa Hilang
              </div>
              <button
                onClick={() => setReplaceModalCard(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                padding: '0.85rem',
                backgroundColor: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.825rem',
                color: '#92400e',
                marginBottom: '1rem',
              }}
            >
              <strong>Perhatian:</strong> Kartu lama (<code>{replaceModalCard.cardId}</code>) dan Token QR lama akan{' '}
              <strong>dinonaktifkan permanen</strong>. Sistem akan otomatis menerbitkan Card ID dan QR Token baru untuk siswa ini.
            </div>

            <form onSubmit={handleConfirmReplace}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Alasan Penggantian
                </label>
                <input
                  type="text"
                  required
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  placeholder="Contoh: Kartu fisik hilang di perjalanan"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setReplaceModalCard(null)} className="btn btn-secondary">
                  Batal
                </button>
                <button type="submit" disabled={isReplacing} className="btn btn-danger">
                  {isReplacing ? 'Memproses...' : 'Terbitkan Kartu Pengganti Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
