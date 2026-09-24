'use client';

import React from 'react';
import { Menu, School, Bell, ShieldCheck } from 'lucide-react';
import { SessionUser } from '@/lib/auth';

interface TopbarProps {
  user: SessionUser;
  onToggleSidebar: () => void;
}

export default function Topbar({ user, onToggleSidebar }: TopbarProps) {
  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="topbar no-print">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={onToggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.4rem',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
          }}
        >
          <Menu size={22} />
        </button>

        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {user.schoolName || 'SmartSiswa - Pusat Manajemen Multi-Sekolah SD/MI'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {today}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            backgroundColor: 'var(--bg-muted)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <ShieldCheck size={14} color="var(--primary)" />
          <span>Akses: <strong>{user.role}</strong></span>
        </div>
      </div>
    </header>
  );
}
