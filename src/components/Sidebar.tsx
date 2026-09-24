'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  School,
  Users,
  CreditCard,
  Printer,
  FileCheck,
  Palette,
  ShieldAlert,
  GraduationCap,
  CalendarCheck,
  CalendarDays,
  QrCode,
  LogOut,
  Sliders,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { SessionUser } from '@/lib/auth';

interface SidebarProps {
  user: SessionUser;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('smartsiswa_user');
        localStorage.removeItem('smartsiswa_recent_scans');
      }
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
      window.location.href = '/login';
    }
  };

  const devLinks = [
    { label: 'Dashboard', href: '/developer/dashboard', icon: LayoutDashboard },
    { label: 'Kelola Sekolah', href: '/developer/schools', icon: School },
    { label: 'Data Siswa (Global)', href: '/developer/students', icon: Users },
    { label: 'Manajemen Kartu', href: '/developer/cards', icon: CreditCard },
    { label: 'Permintaan Cetak', href: '/developer/print-requests', icon: FileCheck },
    { label: 'Produksi Kertas A4', href: '/developer/print-production', icon: Printer },
    { label: 'Template Kartu', href: '/developer/templates', icon: Palette },
    { label: 'Audit Log Sistem', href: '/developer/audit-logs', icon: ShieldAlert },
  ];

  const schoolLinks = [
    { label: 'Dashboard', href: '/school/dashboard', icon: LayoutDashboard },
    { label: 'Data Siswa', href: '/school/students', icon: GraduationCap },
    { label: 'Data Kelas & Rombel', href: '/school/classes', icon: Users },
    { label: 'Kelola Akun Guru', href: '/school/teachers', icon: UserCheck },
    { label: 'Kartu Siswa', href: '/school/cards', icon: CreditCard },
    { label: 'Ajukan Cetak Kartu', href: '/school/print-request', icon: FileCheck },
    { label: 'Rekap Absensi Siswa', href: '/teacher/rekap', icon: CalendarDays },
    { label: 'Log Laporan Presensi', href: '/school/attendance', icon: CalendarCheck },
    { label: 'Aturan Jam Presensi', href: '/school/settings', icon: Sliders },
  ];

  const teacherLinks = [
    { label: 'Scan QR Presensi', href: '/teacher/scan', icon: QrCode },
    { label: 'Presensi Hari Ini', href: '/teacher/attendance', icon: CalendarCheck },
    { label: 'Rekap Absensi Kelas', href: '/teacher/rekap', icon: CalendarDays },
  ];

  let currentNavItems = devLinks;
  let portalTitle = 'DEVELOPER PUSAT';

  if (user.role === 'SCHOOL_ADMIN') {
    currentNavItems = schoolLinks;
    portalTitle = user.schoolName ? user.schoolName.toUpperCase() : 'ADMIN SEKOLAH';
  } else if (user.role === 'TEACHER') {
    currentNavItems = teacherLinks;
    portalTitle = 'GURU / PETUGAS';
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 35,
          }}
          className="no-print"
        />
      )}

      <aside className={`app-sidebar ${isOpen ? 'open' : ''} no-print`}>
        {/* Brand */}
        <div className="sidebar-header">
          <div
            style={{
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="SmartSiswa Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="sidebar-brand-title">SmartSiswa</div>
            <div className="sidebar-brand-sub" title={portalTitle}>
              {portalTitle}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Menu Utama</div>
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Additional quick links */}
          <div className="sidebar-section-title" style={{ marginTop: '0.75rem' }}>
            Akses Cepat
          </div>
          {user.role !== 'DEVELOPER' && (
            <Link
              href="/teacher/scan"
              onClick={onClose}
              className={`nav-item ${pathname === '/teacher/scan' ? 'active' : ''}`}
              style={{
                background: 'rgba(34, 197, 94, 0.12)',
                color: '#4ade80',
                border: '1px dashed rgba(34, 197, 94, 0.3)',
                marginBottom: '0.35rem',
              }}
            >
              <QrCode size={18} />
              <span>Buka Kamera Scan</span>
            </Link>
          )}
        </nav>

        {/* Footer with User info & logout */}
        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name" title={user.name}>
                {user.name}
              </div>
              <div className="user-role">{user.role}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar / Logout"
              style={{
                color: '#ef4444',
                padding: '0.4rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
