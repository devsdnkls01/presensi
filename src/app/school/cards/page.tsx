'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import StudentCardPreview from '@/components/StudentCardPreview';
import { CreditCard, Eye, X, ShieldAlert, CheckCircle2, Clock, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';

interface CardItem {
  id: string;
  cardId: string;
  status: string;
  student: {
    id: string;
    fullName: string;
    nis: string;
    nisn?: string | null;
    gender: string;
    photoUrl?: string | null;
    classRoom: { name: string };
    school: { name: string; logo?: string | null };
  };
  qrToken?: { token: string } | null;
}

export default function SchoolCardsPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCard, setPreviewCard] = useState<CardItem | null>(null);
  const { toast } = useNotification();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/school/cards');
      const data = await res.json();
      if (data.cards) setCards(data.cards);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadCards();
  }, [user]);

  if (!user) return null;

  return (
    <AppLayout user={user}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Daftar Kartu Siswa
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Status pembuatan, verifikasi, dan pratinjau kartu ID siswa resmi.
          </p>
        </div>

        <Link href="/school/print-request" className="btn btn-primary">
          <span>+ Buat Pengajuan Cetak</span>
        </Link>
      </div>

      {/* Notice Card for School Admin */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1.25rem',
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          fontSize: '0.825rem',
          color: '#475569',
        }}
      >
        <ShieldAlert size={20} color="var(--primary)" flex-shrink="0" />
        <div>
          Sekolah berhak melihat pratinjau kartu dan mengajukan permohonan cetak. File produksi dan pencetakan fisik kartu dikelola terpusat oleh <strong>Developer/Admin Pusat</strong>.
        </div>
      </div>

      {/* Cards Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Card ID</th>
                <th>Nama Siswa</th>
                <th>Kelas</th>
                <th>NIS</th>
                <th>Pasfoto</th>
                <th>Status Kartu</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Memuat kartu siswa...
                  </td>
                </tr>
              ) : cards.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Belum ada kartu siswa.
                  </td>
                </tr>
              ) : (
                cards.map((c, idx) => {
                  let badge = 'badge-info';
                  if (c.status === 'AKTIF') badge = 'badge-success';
                  else if (c.status === 'DIAJUKAN' || c.status === 'MENUNGGU_VERIFIKASI') badge = 'badge-warning';
                  else if (c.status === 'NONAKTIF') badge = 'badge-danger';

                  const hasPhoto = Boolean(c.student.photoUrl && c.student.photoUrl.trim() !== '');

                  return (
                    <tr key={c.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                        {c.cardId}
                      </td>
                      <td style={{ fontWeight: 700 }}>{c.student.fullName}</td>
                      <td>{c.student.classRoom.name}</td>
                      <td>{c.student.nis}</td>
                      <td>
                        {hasPhoto ? (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <CheckCircle2 size={12} />
                            Lengkap
                          </span>
                        ) : (
                          <Link
                            href={`/school/students`}
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              textDecoration: 'none',
                            }}
                            title="Klik untuk menuju data siswa dan unggah foto"
                          >
                            <ShieldAlert size={12} />
                            Belum Ada
                          </Link>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${badge}`}>{c.status}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => setPreviewCard(c)}
                          className="btn btn-secondary btn-sm"
                        >
                          <Eye size={14} />
                          <span>Lihat Kartu</span>
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

      {/* Card Preview Modal */}
      {previewCard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
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
              padding: '2rem',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Pratinjau Kartu Siswa</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Standar ID-1 (85.60 mm × 53.98 mm) • {previewCard.student.fullName}
                </div>
              </div>
              <button onClick={() => setPreviewCard(null)}>
                <X size={22} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', overflowX: 'auto', padding: '1rem 0' }}>
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
                idPrefix="preview-school-card"
                watermark={true}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Status Kartu: <strong>{previewCard.status}</strong> • <span style={{ color: '#ea580c' }}>Pratinjau resmi ber-watermark</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link
                  href="/school/print-request"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.85rem' }}
                >
                  <FileCheck size={15} />
                  <span>Ajukan Permohonan Cetak</span>
                </Link>
                <button onClick={() => setPreviewCard(null)} className="btn btn-secondary btn-sm">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
