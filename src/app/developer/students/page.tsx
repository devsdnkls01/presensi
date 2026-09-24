'use client';

import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import { 
  Users, 
  Search, 
  School as SchoolIcon, 
  GraduationCap, 
  ChevronRight, 
  CreditCard,
  RefreshCw 
} from 'lucide-react';

interface SchoolItem {
  id: string;
  name: string;
  npsn: string;
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

interface StudentItem {
  id: string;
  nis: string;
  nisn?: string | null;
  fullName: string;
  gender: string;
  status: string;
  school: { id: string; name: string };
  classRoom: { id: string; name: string };
  cards: Array<{
    id: string;
    cardId: string;
    status: string;
  }>;
}

export default function DeveloperStudentsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Hierarchy Navigation State: SD > Kelas > Siswa
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [search, setSearch] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // 1. Initial auth check
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  // 2. Fetch Schools
  useEffect(() => {
    if (!user) return;
    fetch('/api/developer/schools')
      .then((res) => res.json())
      .then((data) => {
        if (data.schools && Array.isArray(data.schools)) {
          setSchools(data.schools);
          if (data.schools.length > 0 && !selectedSchool) {
            setSelectedSchool(data.schools[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, [user]);

  // 3. Fetch Classes when School changes
  useEffect(() => {
    if (!selectedSchool) {
      setClasses([]);
      setSelectedClass('');
      return;
    }

    const loadClasses = async () => {
      try {
        setLoadingClasses(true);
        const res = await fetch(`/api/school/classes?schoolId=${selectedSchool}`);
        const data = await res.json();
        if (data.classes && Array.isArray(data.classes)) {
          setClasses(data.classes);
          if (data.classes.length > 0) {
            setSelectedClass(data.classes[0].id);
          } else {
            setSelectedClass('');
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingClasses(false);
      }
    };

    loadClasses();
  }, [selectedSchool]);

  // 4. Fetch Students based on School, Class, and Search
  const loadStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSchool) params.append('schoolId', selectedSchool);
      if (selectedClass) params.append('classId', selectedClass);
      if (search) params.append('search', search);

      const res = await fetch(`/api/school/students?${params.toString()}`);
      const data = await res.json();
      if (data.students) setStudents(data.students);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && selectedSchool) {
      loadStudents();
      setCurrentPage(1);
    }
  }, [user, selectedSchool, selectedClass, search]);

  const activeSchool = useMemo(() => {
    return schools.find((s) => s.id === selectedSchool);
  }, [schools, selectedSchool]);

  const activeClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClass);
  }, [classes, selectedClass]);

  const totalPages = Math.ceil(students.length / itemsPerPage) || 1;
  const displayedStudents = useMemo(() => {
    return students.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [students, currentPage, itemsPerPage]);

  if (!user) return null;

  return (
    <AppLayout user={user}>
      {/* Title */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Data Siswa Global (Per Sekolah &amp; Kelas)
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Navigasi berjenjang <strong>Pilih SD &gt; Pilih Kelas &gt; Data Siswa</strong> untuk meninjau data peserta didik tanpa tumpang tindih.
        </p>
      </div>

      {/* Breadcrumb Steps */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.875rem' }}>
            {/* Step 1: Sekolah */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: selectedSchool ? '#eff6ff' : '#f1f5f9',
                color: selectedSchool ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 700,
                border: selectedSchool ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
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
                background: selectedClass ? '#ecfdf5' : '#f8fafc',
                color: selectedClass ? '#059669' : 'var(--text-secondary)',
                fontWeight: 700,
                border: selectedClass ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
              }}
            >
              <GraduationCap size={16} />
              <span>2. Kelas: {activeClass ? activeClass.name : selectedClass === '' ? 'Semua Kelas' : 'Pilih Kelas'}</span>
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
              <Users size={16} />
              <span>3. Data Siswa ({students.length} Orang)</span>
            </div>
          </div>

          {/* Quick Switcher Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Ganti SD:
            </label>
            <select
              value={selectedSchool}
              onChange={(e) => {
                setSelectedSchool(e.target.value);
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

      {/* Class Pills */}
      {selectedSchool && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Pilih Kelas di {activeSchool?.name}:
              </span>
            </div>
          </div>

          {loadingClasses ? (
            <div style={{ padding: '0.75rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Memuat daftar kelas...
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {/* Option: Semua Kelas */}
              <button
                type="button"
                onClick={() => {
                  setSelectedClass('');
                  setCurrentPage(1);
                }}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.825rem',
                  fontWeight: selectedClass === '' ? 700 : 500,
                  cursor: 'pointer',
                  border: selectedClass === '' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: selectedClass === '' ? 'linear-gradient(135deg, #1e40af, #2563eb)' : '#f8fafc',
                  color: selectedClass === '' ? '#ffffff' : 'var(--text-primary)',
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
                    background: selectedClass === '' ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: selectedClass === '' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {activeSchool?._count?.students || 0}
                </span>
              </button>

              {classes.map((cls) => {
                const isSelected = selectedClass === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => {
                      setSelectedClass(cls.id);
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: '0.45rem 0.95rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.825rem',
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'linear-gradient(135deg, #1e3a8a, #2563eb)' : '#ffffff',
                      color: isSelected ? '#ffffff' : 'var(--text-primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    <span>{cls.name}</span>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        padding: '0.1rem 0.45rem',
                        borderRadius: '999px',
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

      {/* Search Input Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ position: 'relative' }}>
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
            placeholder={`Cari nama, NIS, atau NISN siswa di ${activeClass ? activeClass.name : 'kelas ini'}...`}
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '45px' }}>No</th>
                <th>Sekolah</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>NIS</th>
                <th>NISN</th>
                <th>Card ID</th>
                <th>Status Kartu</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Memuat data siswa kelas {activeClass?.name || ''}...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    Tidak ada siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((s, idx) => {
                  const latestCard = s.cards[0];
                  const itemIndex = (currentPage - 1) * itemsPerPage + idx + 1;
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{itemIndex}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.825rem' }}>{s.school?.name}</td>
                      <td style={{ fontWeight: 700, fontSize: '0.875rem' }}>{s.fullName}</td>
                      <td style={{ fontWeight: 600, fontSize: '0.825rem' }}>{s.classRoom?.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.825rem' }}>{s.nis}</td>
                      <td style={{ fontSize: '0.825rem', color: s.nisn ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {s.nisn || '-'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.825rem', color: 'var(--primary)' }}>
                        {latestCard?.cardId || '-'}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            latestCard?.status === 'AKTIF'
                              ? 'badge-success'
                              : latestCard?.status === 'NONAKTIF'
                              ? 'badge-danger'
                              : latestCard?.status === 'DIAJUKAN'
                              ? 'badge-warning'
                              : 'badge-info'
                          }`}
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

        {/* Pagination Footer */}
        {!loading && students.length > itemsPerPage && (
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
              {Math.min(currentPage * itemsPerPage, students.length)} dari {students.length} siswa
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
    </AppLayout>
  );
}
