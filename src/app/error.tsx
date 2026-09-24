'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, AlertOctagon, Sparkles, ShieldX } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console / telemetry
    console.error('Unhandled System Exception:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#050c1e',
        backgroundImage: `
          radial-gradient(circle at 15% 15%, rgba(220, 38, 38, 0.2) 0%, transparent 40%),
          radial-gradient(circle at 85% 85%, rgba(12, 53, 166, 0.25) 0%, transparent 45%),
          linear-gradient(180deg, #050c1e 0%, #081533 100%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        color: '#ffffff',
      }}
    >
      {/* Background Matrix Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      {/* Decorative Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          right: '15%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Glassmorphic Card Container */}
      <div
        style={{
          position: 'relative',
          maxWidth: '560px',
          width: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(220, 38, 38, 0.15)',
          borderRadius: '24px',
          padding: '3rem 2.25rem',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        {/* Top Warning Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.9rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(239, 68, 68, 0.18)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '1.75rem',
          }}
        >
          <ShieldX size={15} />
          <span>System Error • 500 / 503 Internal Error</span>
        </div>

        {/* Error Code Typography */}
        <div
          style={{
            fontSize: 'clamp(4.5rem, 12vw, 6.5rem)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #ffffff 0%, #fca5a5 50%, #ef4444 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
            textShadow: '0 10px 30px rgba(239, 68, 68, 0.3)',
          }}
        >
          500
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#f8fafc',
            marginBottom: '0.75rem',
          }}
        >
          Terjadi Gangguan Sistem
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '0.925rem',
            lineHeight: 1.6,
            color: '#94a3b8',
            maxWidth: '440px',
            margin: '0 auto 1.5rem auto',
          }}
        >
          Sistem sedang mengalami kendala sementara atau sedang dalam proses pemeliharaan. Silakan coba memuat ulang halaman.
        </p>

        {/* Error Details if available */}
        {error?.digest && (
          <div
            style={{
              padding: '0.5rem 0.85rem',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              color: '#94a3b8',
              marginBottom: '2rem',
              display: 'inline-block',
            }}
          >
            Digest Code: {error.digest}
          </div>
        )}

        {/* Interactive Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              border: '1px solid rgba(248, 113, 113, 0.4)',
              boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCw size={16} />
            <span>Muat Ulang / Coba Lagi</span>
          </button>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#e2e8f0',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Home size={16} />
            <span>Dashboard</span>
          </Link>
        </div>

        {/* Footer Brand info */}
        <div
          style={{
            marginTop: '2.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          <Sparkles size={13} color="#f87171" />
          <span>SmartSiswa Diagnostic Protection • Status System Active</span>
        </div>
      </div>
    </div>
  );
}
