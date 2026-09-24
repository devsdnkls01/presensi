'use client';

import React from 'react';
import { RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          backgroundColor: '#050c1e',
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(12, 53, 166, 0.25) 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(220, 38, 38, 0.2) 0%, transparent 45%),
            linear-gradient(180deg, #050c1e 0%, #081533 100%)
          `,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          color: '#ffffff',
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '90%',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '3rem 2rem',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.9rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}
          >
            <ShieldAlert size={15} />
            <span>Critical System Error</span>
          </div>

          <div
            style={{
              fontSize: '5rem',
              fontWeight: 900,
              lineHeight: 1,
              background: 'linear-gradient(135deg, #ffffff 0%, #fca5a5 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '1rem',
            }}
          >
            500
          </div>

          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Gangguan Layanan Utama
          </h1>

          <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2rem' }}>
            Terjadi kesalahan pada modul aplikasi. Silakan tekan tombol di bawah untuk memuat ulang sistem.
          </p>

          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0c35a6 0%, #0284c7 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            <span>Muat Ulang Aplikasi</span>
          </button>
        </div>
      </body>
    </html>
  );
}
