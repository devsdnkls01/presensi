import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppLayout from '@/components/AppLayout';
import { getWIBDate } from '@/lib/dateUtils';
import {
  School,
  Users,
  CreditCard,
  Printer,
  CalendarCheck,
  ShieldCheck,
  ArrowUpRight,
  FileCheck,
} from 'lucide-react';
import Link from 'next/link';
import DeveloperDriveBackup from '@/components/DeveloperDriveBackup';

export default async function DeveloperDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'DEVELOPER') {
    redirect('/login');
  }

  const todayStr = getWIBDate();

  const totalSchools = await prisma.school.count();
  const totalStudents = await prisma.student.count();
  const totalActiveCards = await prisma.studentCard.count({ where: { status: 'AKTIF' } });
  const pendingRequests = await prisma.cardPrintRequest.count({
    where: { status: 'MENUNGGU_VERIFIKASI' },
  });
  const inProgressRequests = await prisma.cardPrintRequest.count({
    where: { status: { in: ['DALAM_PROSES', 'DIVERIFIKASI'] } },
  });
  const totalActiveRequests = pendingRequests + inProgressRequests;
  const todayAttendanceCount = await prisma.attendance.count({ where: { date: todayStr } });

  const recentRequests = await prisma.cardPrintRequest.findMany({
    include: {
      school: true,
      cards: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const recentLogs = await prisma.auditLog.findMany({
    include: { school: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  return (
    <AppLayout user={user}>
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Pusat Kendali SmartSiswa Developer & Admin Pusat
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Manajemen multi-sekolah, verifikasi pengajuan, dan produksi cetak kartu ID siswa terpusat.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/developer/print-requests" className="btn btn-primary">
            <FileCheck size={16} />
            <span>
              {pendingRequests > 0
                ? `Verifikasi Pengajuan (${pendingRequests})`
                : `Kelola Pengajuan Cetak (${totalActiveRequests})`}
            </span>
          </Link>
          <Link href="/developer/print-production" className="btn btn-secondary">
            <Printer size={16} />
            <span>Lembar Cetak A4 (Margin 1 cm)</span>
          </Link>
        </div>
      </div>

      {/* Global Stat Cards */}
      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
            <School size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800 }}>{totalSchools}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sekolah Terhubung</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(30,58,138,0.1)', color: 'var(--primary)' }}>
            <Users size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--primary)' }}>{totalStudents}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Siswa Terdaftar (Nasional)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <CreditCard size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--success)' }}>{totalActiveCards}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kartu Siswa Aktif</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <Printer size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: totalActiveRequests > 0 ? 'var(--primary)' : 'var(--text-primary)' }}>
              {totalActiveRequests}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Pengajuan Cetak Aktif
            </div>
            <div style={{ fontSize: '0.72rem', color: pendingRequests > 0 ? '#b45309' : '#0284c7', fontWeight: 700, marginTop: '2px' }}>
              {pendingRequests > 0
                ? `${pendingRequests} menunggu verifikasi`
                : `${inProgressRequests} dalam antrean cetak`}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
            <CalendarCheck size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669' }}>{todayAttendanceCount}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Presensi Masuk Hari Ini</div>
          </div>
        </div>
      </div>

      {/* Automated Google Drive Backup Panel (15-Day Cycle) */}
      <DeveloperDriveBackup />

      {/* Database Backup & Security Panel (Poin 50) */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '280px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Cadangan & Keamanan Database Terpusat</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                SNAPSHOT AKTIF
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Unduh salinan berkas SQLite fisik (.db) atau dump data terstruktur (.json) untuk arsip dan pemulihan darurat sistem.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a
            href="/api/developer/backup?format=json"
            download
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
          >
            <span>Cadangkan Database (JSON Snapshot)</span>
          </a>
        </div>
      </div>

      {/* Main Grid: Pending Requests & Recent Audit Logs */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Card Print Requests */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Permintaan Cetak Kartu Masuk</div>
              <div className="card-subtitle">Pengajuan dari sekolah yang menunggu tindakan Developer</div>
            </div>
            <Link href="/developer/print-requests" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>Kelola Semua</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>No. Pengajuan</th>
                  <th>Sekolah</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Tidak ada permintaan cetak yang aktif.
                    </td>
                  </tr>
                ) : (
                  recentRequests.map((req: any) => (
                    <tr key={req.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{req.requestNumber}</td>
                      <td>{req.school.name}</td>
                      <td>
                        <strong>{req.cards.length}</strong> kartu
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            req.status === 'MENUNGGU_VERIFIKASI'
                              ? 'badge-warning'
                              : req.status === 'SELESAI'
                              ? 'badge-success'
                              : 'badge-info'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'MENUNGGU_VERIFIKASI' ? (
                          <Link
                            href="/developer/print-requests"
                            className="btn btn-warning btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', fontWeight: 700 }}
                          >
                            Verifikasi
                          </Link>
                        ) : (
                          <Link
                            href={`/developer/print-production?requestId=${req.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', fontWeight: 700 }}
                          >
                            Cetak Kartu
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ fontSize: '1rem' }}>Log Aktivitas Sistem</div>
              <div className="card-subtitle">Riwayat operasional keamanan & presensi</div>
            </div>
            <Link href="/developer/audit-logs" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
              Semua Log
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {recentLogs.map((log: any) => (
              <div
                key={log.id}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-muted)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>
                    {log.action}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(log.createdAt).toLocaleTimeString('id-ID')}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  {log.details}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Oleh: {log.actor} {log.school ? `• ${log.school.name}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
