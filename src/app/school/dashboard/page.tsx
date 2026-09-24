import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import { getWIBDate } from '@/lib/dateUtils';
import {
  Users,
  CheckCircle2,
  Clock,
  UserX,
  TrendingUp,
  CreditCard,
  FileCheck,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default async function SchoolDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role === 'DEVELOPER') redirect('/developer/dashboard');

  const schoolId = user.schoolId;
  if (!schoolId) {
    return <div>Akun Anda belum terhubung dengan data sekolah.</div>;
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  });

  const todayStr = getWIBDate();

  // Metrics
  const totalStudents = await prisma.student.count({
    where: { schoolId, status: 'AKTIF' },
  });

  const todayAttendances = await prisma.attendance.findMany({
    where: { schoolId, date: todayStr },
    include: {
      student: {
        include: { classRoom: true },
      },
    },
    orderBy: { time: 'desc' },
  });

  const hadirCount = todayAttendances.filter((a: any) => a.status === 'HADIR').length;
  const terlambatCount = todayAttendances.filter((a: any) => a.status === 'TERLAMBAT').length;
  const totalPresensi = todayAttendances.length;
  const belumPresensi = Math.max(0, totalStudents - totalPresensi);
  const persentase = totalStudents > 0 ? Math.round((totalPresensi / totalStudents) * 100) : 0;

  // Active cards vs pending requests
  const activeCardsCount = await prisma.studentCard.count({
    where: {
      student: { schoolId },
      status: 'AKTIF',
    },
  });

  const pendingPrintRequests = await prisma.cardPrintRequest.count({
    where: {
      schoolId,
      status: 'MENUNGGU_VERIFIKASI',
    },
  });

  return (
    <AppLayout user={user}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Dashboard {school?.name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Pantau kehadiran siswa hari ini secara real-time dan status kartu ID siswa.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/school/print-request" className="btn btn-secondary">
            <FileCheck size={16} />
            <span>Ajukan Cetak Kartu</span>
          </Link>
          <Link href="/teacher/scan" className="btn btn-primary">
            <CreditCard size={16} />
            <span>Mulai Scan Presensi</span>
          </Link>
        </div>
      </div>

      {/* Primary Attendance Metric Cards */}
      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
            <Users size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>{totalStudents}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Siswa Aktif</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--success)' }}>{hadirCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hadir Tepat Waktu</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Clock size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--warning)' }}>{terlambatCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Terlambat (Lewat {school?.lateAfter})</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>
            <UserX size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--danger)' }}>{belumPresensi}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Belum Presensi</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(30,58,138,0.1)', color: 'var(--primary)' }}>
            <TrendingUp size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)' }}>{persentase}%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Persentase Kehadiran</div>
          </div>
        </div>
      </div>

      {/* Second Row: Attendance Table & Card Production Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Latest Attendance Live Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Daftar Presensi Terbaru</div>
              <div className="card-subtitle">Siswa yang melakukan presensi hari ini ({todayStr})</div>
            </div>
            <Link href="/school/attendance" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>Lihat Semua Rekap</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Jam</th>
                  <th>Nama Siswa</th>
                  <th>Kelas</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Belum ada siswa yang melakukan presensi hari ini.
                    </td>
                  </tr>
                ) : (
                  todayAttendances.slice(0, 10).map((att: any) => (
                    <tr key={att.id}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{att.time}</td>
                      <td style={{ fontWeight: 700 }}>{att.student.fullName}</td>
                      <td>{att.student.classRoom.name}</td>
                      <td>
                        <span className={`badge ${att.status === 'HADIR' ? 'badge-success' : 'badge-warning'}`}>
                          {att.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* School Info & Quick Card Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom: '0.75rem' }}>
              <div className="card-title" style={{ fontSize: '1rem' }}>Status Kartu Siswa</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Kartu Aktif</span>
                <span style={{ fontWeight: 800, color: 'var(--success)' }}>{activeCardsCount} Siswa</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pengajuan Cetak Menunggu</span>
                <span style={{ fontWeight: 800, color: 'var(--warning)' }}>{pendingPrintRequests} Pengajuan</span>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <Link href="/school/cards" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.8rem' }}>
                <CreditCard size={15} />
                <span>Kelola & Preview Kartu Siswa</span>
              </Link>
            </div>
          </div>

          <div className="card" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)', color: 'white' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.85 }}>Aturan Jam Masuk Sekolah</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.25rem' }}>
              {school?.checkInStartTime} - {school?.lateAfter}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '0.35rem' }}>
              Scan sebelum {school?.lateAfter} dinyatakan <strong>HADIR</strong>. Setelahnya dinyatakan <strong>TERLAMBAT</strong>.
            </div>
            <Link
              href="/school/settings"
              style={{
                display: 'inline-block',
                marginTop: '1rem',
                fontSize: '0.75rem',
                color: '#93c5fd',
                textDecoration: 'underline',
              }}
            >
              Ubah aturan jam masuk →
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
