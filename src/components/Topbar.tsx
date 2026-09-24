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
    <header className="topbar no-print" style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, flex: 1 }}>
        <button
          onClick={onToggleSidebar}
          aria-label="Menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.35rem',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.schoolName || 'SmartSiswa'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {today}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.55rem',
            backgroundColor: 'var(--bg-muted)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          <ShieldCheck size={13} color="var(--primary)" />
          <span>{user.role}</span>
        </div>
      </div>
    </header>
  );
}
