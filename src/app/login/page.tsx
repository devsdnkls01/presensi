'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QrCode, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { downloadAllSchoolData } from '@/lib/deviceCache';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-detect logged-in session on page load & redirect immediately
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          try {
            localStorage.setItem('smartsiswa_user', JSON.stringify(data.user));
          } catch (e) {}
          downloadAllSchoolData().catch(() => {});
          if (data.user.role === 'DEVELOPER') {
            router.replace('/developer/dashboard');
          } else if (data.user.role === 'SCHOOL_ADMIN') {
            router.replace('/school/dashboard');
          } else {
            router.replace('/teacher/scan');
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk.');
      }

      if (data.user) {
        try {
          localStorage.setItem('smartsiswa_user', JSON.stringify(data.user));
        } catch (e) {}
        // Trigger non-blocking full school data pre-caching immediately
        downloadAllSchoolData(true).catch(() => {});
      }

      router.push(data.redirectUrl);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Terjadi kesalahan saat masuk.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at top, #1e3a8a 0%, #0f172a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '76px',
              height: '76px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.svg"
              alt="SmartSiswa Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            SmartSiswa
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
            Sistem Presensi Siswa SD/MI Berbasis QR Code
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User
                size={18}
                color="#94a3b8"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem 0.7rem 2.5rem',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
              Kata Sandi
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                color="#94a3b8"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                required
                style={{
                  width: '100%',
                  padding: '0.7rem 2.75rem 0.7rem 2.5rem',
                  border: '1.5px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: showPassword ? 'var(--primary)' : '#94a3b8',
                  borderRadius: '6px',
                  transition: 'color 0.15s, background-color 0.15s',
                }}
                title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: '0.85rem',
              width: '100%',
              marginTop: '0.5rem',
              fontSize: '0.95rem',
              opacity: loading ? 0.7 : 1,
            }}
          >
            <span>{loading ? 'Memproses Masuk...' : 'Masuk ke Sistem'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Footer info */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            Sistem Informasi Presensi Siswa &copy; {new Date().getFullYear()} SDN Kalisalak 01
          </p>
        </div>
      </div>
    </div>
  );
}
