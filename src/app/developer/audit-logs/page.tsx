'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import { ShieldAlert, Search, Filter, Clock } from 'lucide-react';

interface LogItem {
  id: string;
  action: string;
  actor: string;
  details: string;
  ipAddress?: string | null;
  createdAt: string;
  school?: { name: string } | null;
}

export default function DeveloperAuditLogsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);

      const res = await fetch(`/api/developer/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadLogs();
  }, [user, search, actionFilter]);

  if (!user) return null;

  return (
    <AppLayout user={user}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Audit Log Aktivitas Sistem
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Catatan riwayat seluruh aktivitas keamanan, perubahan data siswa, scan presensi, dan pengelolaan kartu.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aktivitas, nama pengguna, atau rincian..."
              style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.4rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          <div style={{ width: '240px' }}>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}
            >
              <option value="">Semua Jenis Aksi</option>
              <option value="SCAN_ATTENDANCE">Scan Presensi</option>
              <option value="CREATE_STUDENT">Buat Siswa</option>
              <option value="UPDATE_CARD_STATUS">Ubah Status Kartu</option>
              <option value="REPLACE_LOST_CARD">Ganti Kartu Hilang</option>
              <option value="SUBMIT_PRINT_REQUEST">Pengajuan Cetak</option>
              <option value="VERIFY_PRINT_REQUEST">Verifikasi Pengajuan</option>
              <option value="GENERATE_PRINT_BATCH">Generate Batch</option>
              <option value="ACTIVATE_CARDS">Aktivasi Kartu</option>
              <option value="LOGIN">Login</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Waktu (WIB)</th>
                <th>Aksi</th>
                <th>Pengguna / Petugas</th>
                <th>Sekolah Terkait</th>
                <th>Rincian Aktivitas</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Memuat log aktivitas...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Tidak ada log aktivitas yang cocok.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.actor}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{log.school?.name || '-'}</td>
                    <td style={{ fontSize: '0.825rem' }}>{log.details}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
