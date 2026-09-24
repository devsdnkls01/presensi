'use client';

import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, Search, ShieldAlert, Sparkles, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#050c1e',
        backgroundImage: `
          radial-gradient(circle at 20% 20%, rgba(12, 53, 166, 0.25) 0%, transparent 40%),
          radial-gradient(circle at 80% 80%, rgba(56, 189, 248, 0.15) 0%, transparent 45%),
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
      {/* Background Micro Guilloché Grid Glow */}
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
          left: '10%',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(12, 53, 166, 0.4) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '10%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(0,0,0,0) 70%)',
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
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(12, 53, 166, 0.2)',
          borderRadius: '24px',
          padding: '3rem 2.25rem',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        {/* Top Security & Status Badge */}
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
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '1.75rem',
          }}
        >
          <ShieldAlert size={14} />
          <span>Error 404 • Page Not Found</span>
        </div>

        {/* Big Stylized 404 Typography */}
        <div
          style={{
            fontSize: 'clamp(4.5rem, 12vw, 6.5rem)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #38bdf8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem',
            textShadow: '0 10px 30px rgba(56, 189, 248, 0.3)',
          }}
        >
          404
        </div>

        {/* Subtitle / Title */}
        <h1
          style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#f8fafc',
            marginBottom: '0.75rem',
          }}
        >
          Halaman Tidak Ditemukan
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: '0.925rem',
            lineHeight: 1.6,
            color: '#94a3b8',
            maxWidth: '440px',
            margin: '0 auto 2rem auto',
          }}
        >
          Tautan yang Anda tuju mungkin sudah kedaluwarsa, berpindah alamat, atau belum tersedia di sistem SmartSiswa.
        </p>

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
            onClick={() => window.history.back()}
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
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.14)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
          >
            <ArrowLeft size={16} />
            <span>Kembali</span>
          </button>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.4rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0c35a6 0%, #0284c7 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              boxShadow: '0 4px 15px rgba(12, 53, 166, 0.4)',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Home size={16} />
            <span>Dashboard Utama</span>
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
          <Sparkles size={13} color="#38bdf8" />
          <span>SmartSiswa Security Matrix • Bank-Grade Identity Platform</span>
        </div>
      </div>
    </div>
  );
}
