'use client';

import React, { useEffect, useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import StudentCardPreview, { CARD_TEMPLATES, CardTemplateId } from '@/components/StudentCardPreview';
import { Palette, Check, Save, Upload, Image as ImageIcon, RotateCcw, Sparkles, ShieldCheck, CreditCard } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

export default function DeveloperTemplatesPage() {
  const { toast } = useNotification();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Template Form States
  const [templateName, setTemplateName] = useState('Royal Sapphire Navy');
  const [schoolName, setSchoolName] = useState('SDN KALISALAK 01');
  const [sloganLine1, setSloganLine1] = useState('BERILMU');
  const [sloganLine2, setSloganLine2] = useState('BERAKHLAK');
  const [sloganLine3, setSloganLine3] = useState('BERPRESTASI');
  const [primaryColor, setPrimaryColor] = useState('#050e1f');
  const [secondaryColor, setSecondaryColor] = useState('#0d2a5c');
  const [logoUrl, setLogoUrl] = useState<string>('/logo.svg');
  const [templateId, setTemplateId] = useState<CardTemplateId>('sapphire-navy');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });

    // Load saved template from API
    fetch('/api/developer/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.template) {
          setTemplateName(data.template.name || 'Royal Sapphire Navy');
          setPrimaryColor(data.template.primaryColor || '#050e1f');
          setSecondaryColor(data.template.secondaryColor || '#0d2a5c');
          if (data.template.templateId) setTemplateId(data.template.templateId as CardTemplateId);
        }
        if (data.schoolLogo) {
          setLogoUrl(data.schoolLogo);
        }
        if (data.schoolName) {
          setSchoolName(data.schoolName);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Handle Logo Upload (Converts image to high-res Base64 for instant preview & persistence)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran File Terlalu Besar', 'Maksimal ukuran logo adalah 2 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
        toast.success('Logo Berhasil Diunggah', 'Pratinjau kartu otomatis diperbarui.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setLogoUrl('/logo.svg');
    toast.info('Logo Direset', 'Menggunakan logo default sistem SmartSiswa.');
  };

  const handleSelectTemplate = (tpl: typeof CARD_TEMPLATES[0]) => {
    setTemplateId(tpl.id);
    setPrimaryColor(tpl.primaryColor);
    setSecondaryColor(tpl.secondaryColor);
    setTemplateName(tpl.name);
    toast.info('Template Dipilih', `Template "${tpl.name}" aktif.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/developer/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          primaryColor,
          secondaryColor,
          templateId,
          logoUrl,
          schoolName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan template.');

      toast.success('Template Berhasil Disimpan', 'Pengaturan desain dan logo kartu telah disimpan ke sistem.');
    } catch (err: any) {
      toast.error('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout user={user}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Template Desain & Logo Kartu Siswa
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Pilih template desain premium, atur logo, dan slogan sekolah untuk semua kartu siswa.
        </p>
      </div>

      {/* ── Template Gallery ─────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
          <CreditCard size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Pilih Template Kartu</h2>
          <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '2px 8px', borderRadius: '99px' }}>{CARD_TEMPLATES.length} template tersedia</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: '1.2rem' }}>
          {CARD_TEMPLATES.map((tpl) => {
            const active = templateId === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                style={{
                  cursor: 'pointer', borderRadius: '14px', overflow: 'hidden',
                  border: active ? '2.5px solid var(--primary)' : '2px solid var(--border-subtle)',
                  boxShadow: active ? '0 0 0 4px rgba(var(--primary-rgb),0.15), 0 4px 16px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s ease',
                  transform: active ? 'scale(1.025)' : 'scale(1)',
                  position: 'relative',
                }}
              >
                {/* Active checkmark badge */}
                {active && (
                  <div style={{ position: 'absolute', top: '7px', right: '7px', zIndex: 10, width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                    <Check size={13} color="white" strokeWidth={3} />
                  </div>
                )}
                {/* Mini card preview */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 12px 8px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
                  <div style={{ transform: 'scale(0.38)', transformOrigin: 'top center', height: 'calc(85.60mm * 0.38)', width: 'calc(53.98mm * 0.38)' }}>
                    <StudentCardPreview
                      templateId={tpl.id}
                      schoolName={schoolName}
                      sloganLine1={sloganLine1}
                      sloganLine2={sloganLine2}
                      sloganLine3={sloganLine3}
                      logoUrl={logoUrl}
                      side="front"
                      scale={1}
                    />
                  </div>
                </div>
                {/* Info */}
                <div style={{ padding: '8px 10px 10px', background: active ? 'rgba(var(--primary-rgb),0.04)' : 'white' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: active ? 'var(--primary)' : 'var(--text-primary)', marginBottom: '2px', lineHeight: 1.2 }}>{tpl.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{tpl.description}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: tpl.primaryColor, border: '1px solid rgba(0,0,0,0.15)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: tpl.secondaryColor, border: '1px solid rgba(0,0,0,0.15)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: tpl.accentColor, border: '1px solid rgba(0,0,0,0.15)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Settings Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Logo Upload Box */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <ImageIcon size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Logo Resmi Kartu Siswa</h2>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Current Logo Thumbnail */}
              <div
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '12px',
                  border: '2px dashed #0284c7',
                  backgroundColor: '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.12)',
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>

              {/* Upload Action Buttons */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png, image/svg+xml, image/jpeg, image/webp"
                  style={{ display: 'none' }}
                />

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Upload size={14} />
                    <span>Unggah Logo Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetLogo}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <RotateCcw size={14} />
                    <span>Logo Default</span>
                  </button>
                </div>

                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Format yang didukung: <strong>SVG, PNG Transparan, JPG</strong> (Maks. 2 MB).
                </span>
              </div>
            </div>
          </div>

          {/* Template Details & Color Palettes */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <Palette size={20} color="var(--primary)" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Pengaturan Tema & Teks Kartu</h2>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Template Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Nama Tema Kartu
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                  required
                />
              </div>

              {/* School Name on Card */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Nama Sekolah (Header & Footer)
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}
                  required
                />
              </div>

              {/* 3 Slogan Lines */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Slogan Sekolah (3 Baris Header Kanan)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={sloganLine1}
                    onChange={(e) => setSloganLine1(e.target.value.toUpperCase())}
                    placeholder="Baris 1"
                    style={{ padding: '0.5rem 0.6rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}
                  />
                  <input
                    type="text"
                    value={sloganLine2}
                    onChange={(e) => setSloganLine2(e.target.value.toUpperCase())}
                    placeholder="Baris 2"
                    style={{ padding: '0.5rem 0.6rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}
                  />
                  <input
                    type="text"
                    value={sloganLine3}
                    onChange={(e) => setSloganLine3(e.target.value.toUpperCase())}
                    placeholder="Baris 3"
                    style={{ padding: '0.5rem 0.6rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Color Customization */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Warna Utama Header
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={{ width: '42px', height: '42px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      style={{ flex: 1, padding: '0.55rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Warna Gradasi / Aksen
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      style={{ width: '42px', height: '42px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      style={{ flex: 1, padding: '0.55rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>
                </div>
              </div>

              {/* Template info */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: '#0369a1' }}>
                <strong>💡 Template Aktif:</strong> {templateName}. Untuk ganti template, gunakan galeri di atas.
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }}
              >
                <Save size={18} />
                <span>{saving ? 'Menyimpan Perubahan...' : 'Simpan & Terapkan Template'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Real-time Live Preview */}
        <div className="card" style={{ position: 'sticky', top: '1.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#f59e0b" />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Pratinjau Kartu Siswa Real-Time</h2>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', backgroundColor: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
              ● Live HD+
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap', padding: '0.5rem 0' }}>
            <StudentCardPreview
              schoolName={schoolName}
              studentName="MUHAMMAD RAGIL MI'ROJI"
              nis="4643"
              nisn="0144151480"
              classNameStr="Kelas 6"
              cardId="KLS01-2026-001225"
              qrToken="STU-B7A66EDE"
              logoUrl={logoUrl}
              sloganLine1={sloganLine1}
              sloganLine2={sloganLine2}
              sloganLine3={sloganLine3}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              templateId={templateId}
              side="front"
            />

            <StudentCardPreview
              schoolName={schoolName}
              studentName="MUHAMMAD RAGIL MI'ROJI"
              nis="4643"
              nisn="0144151480"
              classNameStr="Kelas 6"
              cardId="KLS01-2026-001225"
              qrToken="STU-B7A66EDE"
              logoUrl={logoUrl}
              sloganLine1={sloganLine1}
              sloganLine2={sloganLine2}
              sloganLine3={sloganLine3}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              templateId={templateId}
              side="back"
            />
          </div>

          <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', fontSize: '0.775rem', color: '#64748b', textAlign: 'center' }}>
            Standar Cetak: <strong>ISO/IEC 7810 ID-1 (53.98 × 85.60 mm)</strong> • Siap dicetak langsung pada kertas PVC/die-cut.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
