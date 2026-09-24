'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import { FileCheck, CheckCircle2, Printer, ArrowRight, Layers, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';

interface RequestItem {
  id: string;
  requestNumber: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  school: {
    id: string;
    name: string;
  };
  cards: Array<{
    id: string;
    cardId: string;
    status: string;
    student: {
      fullName: string;
      nis: string;
      classRoom: { name: string };
    };
  }>;
}

export default function DeveloperPrintRequestsPage() {
  const { toast } = useNotification();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/print-requests');
      const data = await res.json();
      if (data.requests) setRequests(data.requests);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadRequests();
  }, [user]);

  const handleAction = async (requestId: string, action: string) => {
    try {
      const res = await fetch('/api/developer/print-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        toast.success('Status Berhasil Diperbarui', `Aksi [${action}] berhasil dieksekusi.`);
        loadRequests();
      } else {
        const data = await res.json();
        toast.error('Gagal Memproses Permintaan', data.error || 'Terjadi kesalahan sistem.');
      }
    } catch (e: any) {
      toast.error('Terjadi Kesalahan', e.message);
    }
  };

  if (!user) return null;

  return (
    <AppLayout user={user}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Permintaan Cetak Kartu Masuk
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Alur verifikasi developer: [VERIFIKASI] → [GENERATE BATCH] → [PRODUKSI CETAK LEGAL] → [SELESAI / AKTIFKAN].
          </p>
        </div>

        <Link href="/developer/print-production" className="btn btn-secondary">
          <Printer size={16} />
          <span>Buka Layout Produksi Legal (8.5x14&quot;)</span>
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {loading ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Memuat permintaan cetak...
          </div>
        ) : requests.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Tidak ada permohonan cetak yang masuk dari sekolah.
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {req.requestNumber}
                    </span>
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
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Sekolah: <strong>{req.school.name}</strong> • Tanggal:{' '}
                    {new Date(req.createdAt).toLocaleDateString('id-ID')}
                  </div>
                  {req.notes && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                      Catatan: &quot;{req.notes}&quot;
                    </div>
                  )}
                </div>

                {/* Workflow Action Buttons for Developer */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {req.status === 'MENUNGGU_VERIFIKASI' && (
                    <button
                      onClick={() => handleAction(req.id, 'VERIFY')}
                      className="btn btn-primary btn-sm"
                    >
                      <CheckCircle2 size={14} />
                      <span>[ 1. VERIFIKASI ]</span>
                    </button>
                  )}

                  {(req.status === 'DIVERIFIKASI' || req.status === 'MENUNGGU_VERIFIKASI') && (
                    <button
                      onClick={() => handleAction(req.id, 'GENERATE_BATCH')}
                      className="btn btn-secondary btn-sm"
                    >
                      <Layers size={14} />
                      <span>[ 2. GENERATE BATCH ]</span>
                    </button>
                  )}

                  {req.status === 'MENUNGGU_VERIFIKASI' ? (
                    <button
                      disabled
                      className="btn btn-secondary btn-sm"
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                      title="Harap verifikasi pengajuan terlebih dahulu sebelum mencetak"
                    >
                      <Printer size={14} />
                      <span>[ 3. CETAK (Perlu Verifikasi) ]</span>
                    </button>
                  ) : (
                    <Link
                      href={`/developer/print-production?requestId=${req.id}&schoolId=${req.school.id}`}
                      className="btn btn-primary btn-sm"
                    >
                      <Printer size={14} />
                      <span>[ 3. CETAK LEMBAR PRODUKSI ]</span>
                    </Link>
                  )}

                  {req.status !== 'SELESAI' && (
                    <button
                      onClick={() => handleAction(req.id, 'FINISH_ACTIVATE')}
                      className="btn btn-success btn-sm"
                    >
                      <Sparkles size={14} />
                      <span>[ 4. SELESAI & AKTIFKAN ]</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card List in Request */}
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Daftar Siswa dalam Pengajuan Ini ({req.cards.length} Siswa):
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  {req.cards.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: 'var(--bg-muted)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{c.student.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {c.student.classRoom.name} • NIS: {c.student.nis}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                        {c.cardId}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
