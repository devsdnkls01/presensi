'use client';

import React, { useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  MessageCircle,
  X,
  Send,
  Search,
  Filter,
  UserCheck,
  Phone,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';

interface Student {
  id: string;
  fullName: string;
  nis: string;
  classRoom: { name: string };
}

interface AttendanceItem {
  id: string;
  date: string;
  time: string;
  status: string;
  scannedBy: string;
  notes?: string | null;
  student: {
    id: string;
    fullName: string;
    nis: string;
    classRoom: { name: string };
  };
}

interface TeacherAttendanceManagerProps {
  initialAttendances: AttendanceItem[];
  schoolStudents: Student[];
  todayStr: string;
  schoolName: string;
}

export default function TeacherAttendanceManager({
  initialAttendances,
  schoolStudents,
  todayStr,
  schoolName,
}: TeacherAttendanceManagerProps) {
  const { toast } = useNotification();
  const [attendances, setAttendances] = useState<AttendanceItem[]>(initialAttendances);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Manual Attendance Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [manualStatus, setManualStatus] = useState('IZIN');
  const [manualNotes, setManualNotes] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // WhatsApp Alert Modal State
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waStudent, setWaStudent] = useState<AttendanceItem | null>(null);
  const [waPhone, setWaPhone] = useState('');
  const [waCustomMessage, setWaCustomMessage] = useState('');

  // Stats calculation
  const totalHadir = attendances.filter((a) => a.status === 'HADIR').length;
  const totalTerlambat = attendances.filter((a) => a.status === 'TERLAMBAT').length;
  const totalIzin = attendances.filter((a) => a.status === 'IZIN').length;
  const totalSakit = attendances.filter((a) => a.status === 'SAKIT').length;
  const totalAlpha = attendances.filter((a) => a.status === 'ALPHA').length;

  // Filtered attendance list
  const filteredList = attendances.filter((item) => {
    const matchesSearch =
      item.student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student.nis.includes(searchQuery) ||
      item.student.classRoom.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Handle Manual Attendance Submit
  const handleSaveManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Pilih Siswa', 'Silakan pilih siswa terlebih dahulu.');
      return;
    }

    setIsSubmittingManual(true);
    try {
      const res = await fetch('/api/attendance/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          date: todayStr,
          status: manualStatus,
          notes: manualNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan presensi');
      }

      // Upsert local state
      const targetStudent = schoolStudents.find((s) => s.id === selectedStudentId);
      if (targetStudent) {
        const updatedItem: AttendanceItem = {
          id: data.attendance.id,
          date: data.attendance.date,
          time: data.attendance.time,
          status: data.attendance.status,
          scannedBy: data.attendance.scannedBy,
          notes: data.attendance.notes,
          student: {
            id: targetStudent.id,
            fullName: targetStudent.fullName,
            nis: targetStudent.nis,
            classRoom: targetStudent.classRoom,
          },
        };

        setAttendances((prev) => {
          const index = prev.findIndex((a) => a.student.id === selectedStudentId);
          if (index >= 0) {
            const next = [...prev];
            next[index] = updatedItem;
            return next;
          }
          return [updatedItem, ...prev];
        });
      }

      toast.success('Berhasil Dicatat', data.message);
      setIsManualModalOpen(false);
      setSelectedStudentId('');
      setManualNotes('');
      setManualStatus('IZIN');
    } catch (err: any) {
      toast.error('Gagal', err.message);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Open WhatsApp Modal with generated message
  const handleOpenWaModal = (item: AttendanceItem) => {
    setWaStudent(item);
    setWaPhone('');

    let statusText = 'Hadir';
    if (item.status === 'TERLAMBAT') statusText = 'TERLAMBAT';
    else if (item.status === 'IZIN') statusText = 'IZIN';
    else if (item.status === 'SAKIT') statusText = 'SAKIT';
    else if (item.status === 'ALPHA') statusText = 'BELUM HADIR / ALPHA';

    const defaultMsg = `Yth. Bapak/Ibu Orang Tua / Wali dari ananda *${item.student.fullName}* (Kelas ${item.student.classRoom.name}, NIS: ${item.student.nis}).

Kami dari *${schoolName}* menginformasikan laporan presensi harian pada tanggal *${todayStr}*:
Status: *${statusText}*
Waktu Pencatatan: ${item.time} WIB
${item.notes ? `Keterangan: ${item.notes}\n` : ''}
Pemberitahuan ini dikirim otomatis demi memantau keselamatan dan ketertiban belajar ananda. Terima kasih atas kerja sama Bapak/Ibu.`;

    setWaCustomMessage(defaultMsg);
    setIsWaModalOpen(true);
  };

  // Dispatch WhatsApp link
  const handleSendWa = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanedPhone = waPhone.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = '62' + cleanedPhone.slice(1);
    }

    const encodedText = encodeURIComponent(waCustomMessage);
    const waUrl = cleanedPhone
      ? `https://wa.me/${cleanedPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
    setIsWaModalOpen(false);
    toast.success('Membuka WhatsApp', 'Membuka aplikasi WhatsApp dengan pesan terformat.');
  };

  return (
    <>
      {/* Header Actions */}
      <div
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Presensi Siswa Hari Ini
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Tanggal: <strong>{todayStr}</strong> • Sekolah: <strong>{schoolName}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <PlusCircle size={16} color="var(--primary)" />
            <span>Catat Izin / Sakit / Hadir Manual</span>
          </button>
          <Link href="/teacher/rekap" className="btn btn-secondary">
            <CalendarDays size={16} />
            <span>Rekap Bulanan</span>
          </Link>
          <Link href="/teacher/scan" className="btn btn-primary">
            <span>Buka Kamera Scan</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
            <CalendarCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{attendances.length}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Tercatat</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>{totalHadir}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Hadir Tepat Waktu</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--warning)' }}>{totalTerlambat}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Terlambat</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <UserCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb' }}>{totalIzin}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Izin</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#9333ea' }}>{totalSakit}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Sakit</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Cari siswa berdasarkan nama, NIS, atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '0.875rem',
              backgroundColor: 'transparent',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--text-muted)" />
          {['ALL', 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT', 'ALPHA'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className="btn btn-sm"
              style={{
                fontSize: '0.75rem',
                padding: '0.25rem 0.65rem',
                backgroundColor: filterStatus === st ? 'var(--primary)' : '#f1f5f9',
                color: filterStatus === st ? '#ffffff' : 'var(--text-primary)',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              {st === 'ALL' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ fontSize: '1rem' }}>
            Daftar Presensi Hari Ini ({filteredList.length})
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Waktu</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>NIS</th>
                <th>Status</th>
                <th>Metode / Keterangan</th>
                <th style={{ textAlign: 'center' }}>Notifikasi WA</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Belum ada data presensi yang sesuai. Gunakan tombol kamera scan atau catat manual di atas.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, index) => {
                  let badgeClass = 'badge-info';
                  let statusBg = '#eff6ff';
                  let statusColor = '#2563eb';

                  if (item.status === 'HADIR') {
                    badgeClass = 'badge-success';
                    statusBg = '#dcfce7';
                    statusColor = '#15803d';
                  } else if (item.status === 'TERLAMBAT') {
                    badgeClass = 'badge-warning';
                    statusBg = '#fef3c7';
                    statusColor = '#b45309';
                  } else if (item.status === 'IZIN') {
                    statusBg = '#dbeafe';
                    statusColor = '#1d4ed8';
                  } else if (item.status === 'SAKIT') {
                    statusBg = '#f3e8ff';
                    statusColor = '#7e22ce';
                  } else if (item.status === 'ALPHA') {
                    statusBg = '#fee2e2';
                    statusColor = '#b91c1c';
                  }

                  return (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.time}</td>
                      <td style={{ fontWeight: 700 }}>{item.student.fullName}</td>
                      <td>{item.student.classRoom.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{item.student.nis}</td>
                      <td>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '9999px',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            backgroundColor: statusBg,
                            color: statusColor,
                            display: 'inline-block',
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div>{item.scannedBy}</div>
                        {item.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                            &quot;{item.notes}&quot;
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenWaModal(item)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.6rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#16a34a',
                            borderColor: '#bbf7d0',
                            backgroundColor: '#f0fdf4',
                          }}
                          title="Kirim Notifikasi WhatsApp ke Wali Murid"
                        >
                          <MessageCircle size={14} color="#16a34a" />
                          <span>Kirim WA</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: PENCATATAN MANUAL (IZIN, SAKIT, HADIR, ALPHA) */}
      {isManualModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              animation: 'scaleUp 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={20} color="var(--primary)" />
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Pencatatan Presensi Manual</div>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Gunakan fitur ini untuk mencatat siswa yang berhalangan hadir (Izin/Sakit) atau siswa yang lupa membawa kartu fisik (Hadir Manual).
            </p>

            <form onSubmit={handleSaveManualAttendance} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Pilih Siswa *
                </label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <option value="">-- Pilih Siswa --</option>
                  {schoolStudents.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.fullName} ({stu.classRoom.name} - NIS: {stu.nis})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Status Presensi *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                  {[
                    { id: 'IZIN', label: 'Izin', clr: '#2563eb', bg: '#eff6ff' },
                    { id: 'SAKIT', label: 'Sakit', clr: '#9333ea', bg: '#faf5ff' },
                    { id: 'HADIR', label: 'Hadir (Lupa Kartu)', clr: '#16a34a', bg: '#f0fdf4' },
                    { id: 'TERLAMBAT', label: 'Terlambat Manual', clr: '#ea580c', bg: '#fff7ed' },
                    { id: 'ALPHA', label: 'Alpha', clr: '#dc2626', bg: '#fef2f2' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setManualStatus(s.id)}
                      style={{
                        padding: '0.6rem 0.5rem',
                        borderRadius: '8px',
                        border: manualStatus === s.id ? `2px solid ${s.clr}` : '1px solid var(--border-subtle)',
                        backgroundColor: manualStatus === s.id ? s.bg : '#ffffff',
                        color: manualStatus === s.id ? s.clr : 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Keterangan / Alasan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Ada surat dokter, acara keluarga di luar kota, kartu tertinggal di rumah..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.875rem',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={isSubmittingManual}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingManual}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{isSubmittingManual ? 'Menyimpan...' : 'Simpan Presensi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NOTIFIKASI WHATSAPP KE WALI MURID (Poin 28) */}
      {isWaModalOpen && waStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              position: 'relative',
              animation: 'scaleUp 0.2s ease-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageCircle size={22} color="#16a34a" />
                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Kirim Notifikasi WhatsApp</div>
              </div>
              <button
                type="button"
                onClick={() => setIsWaModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <strong>{waStudent.student.fullName}</strong> ({waStudent.student.classRoom.name})
              </div>
              <div>
                Status: <strong style={{ color: 'var(--primary)' }}>{waStudent.status}</strong> ({waStudent.time})
              </div>
            </div>

            <form onSubmit={handleSendWa} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Nomor WhatsApp Orang Tua / Wali (Opsional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone
                    size={16}
                    color="#94a3b8"
                    style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                  />
                  <input
                    type="tel"
                    placeholder="Contoh: 08123456789 (Kosongkan jika ingin memilih kontak langsung di WA)"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.2rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Jika nomor dikosongkan, WhatsApp akan terbuka dan Anda dapat memilih kontak wali murid secara manual.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Isi Pesan Konfirmasi / Notifikasi
                </label>
                <textarea
                  rows={6}
                  value={waCustomMessage}
                  onChange={(e) => setWaCustomMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    lineHeight: '1.45',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsWaModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    backgroundColor: '#16a34a',
                    borderColor: '#16a34a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Send size={16} />
                  <span>Buka WhatsApp Sekarang</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
