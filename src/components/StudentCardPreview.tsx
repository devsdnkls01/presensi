'use client';

import React, { useEffect, useState, memo } from 'react';
import QRCode from 'qrcode';
import { optimizeCloudinaryUrl } from '@/lib/cloudinaryUtils';

const qrDataUrlCache = new Map<string, string>();

export const CLOUDINARY_DEFAULT_AVATAR = 'https://res.cloudinary.com/ixjihcvx/image/upload/v1790218623/presensi-siswa/students/default_pixar_student.png';
export const CLOUDINARY_DEFAULT_LOGO = 'https://res.cloudinary.com/ixjihcvx/image/upload/v1790218638/presensi-siswa/logos/school_logo_kalisalak_01.png';

export type CardTemplateId =
  | 'sapphire-navy'
  | 'emerald-cosmic'
  | 'rose-gold'
  | 'cyber-titanium'
  | 'aurora-purple'
  | 'crimson-royal';

export interface CardTemplate {
  id: CardTemplateId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export const CARD_TEMPLATES: CardTemplate[] = [
  { id: 'sapphire-navy',  name: 'Royal Sapphire Navy',   description: 'Dark navy holographic dengan aksen emas mewah',    primaryColor: '#050e1f', secondaryColor: '#0d2a5c', accentColor: '#f59e0b' },
  { id: 'emerald-cosmic', name: 'Cosmic Emerald',         description: 'Hijau tua elegan dengan aksen cyan berkilau',       primaryColor: '#022c22', secondaryColor: '#064e3b', accentColor: '#34d399' },
  { id: 'rose-gold',      name: 'Rose Gold Executive',    description: 'Putih premium dengan gradien rose gold metalik',    primaryColor: '#fff1f2', secondaryColor: '#ffe4e6', accentColor: '#be123c' },
  { id: 'cyber-titanium', name: 'Cyber Titanium',         description: 'Futuristik gelap dengan aksen neon biru-cyan',      primaryColor: '#0a0a0f', secondaryColor: '#1a1a2e', accentColor: '#00d4ff' },
  { id: 'aurora-purple',  name: 'Aurora Violet',          description: 'Ungu aurora malam dengan efek shimmer gradient',    primaryColor: '#1a0533', secondaryColor: '#2d1b4e', accentColor: '#c084fc' },
  { id: 'crimson-royal',  name: 'Crimson Royal',          description: 'Merah maroon premium dengan aksen putih platinum',  primaryColor: '#3b0012', secondaryColor: '#7f1d1d', accentColor: '#fecdd3' },
];

interface StudentCardPreviewProps {
  schoolName?: string;
  studentName?: string;
  nis?: string;
  nisn?: string | null;
  classNameStr?: string;
  photoUrl?: string | null;
  logoUrl?: string | null;
  sloganLine1?: string;
  sloganLine2?: string;
  sloganLine3?: string;
  cardId?: string;
  qrToken?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  templateId?: CardTemplateId;
  side?: 'front' | 'back' | 'both';
  scale?: number;
  idPrefix?: string;
  isPrint?: boolean;
  watermark?: boolean;
}

interface RenderProps {
  frontId: string; backId: string; cs: React.CSSProperties;
  logo: string; schoolName: string; studentName: string; nis: string;
  nisn: string | null | undefined; classNameStr: string; photoUrl: string | null | undefined;
  cardId: string; qrToken: string | null | undefined; qrDataUrl: string;
  sl1: string; sl2: string; sl3: string; watermark: boolean;
}

// ─── Shared Watermark ─────────────────────────────────────────────────────
const WatermarkOverlay = () => (
  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ transform: 'rotate(-42deg)', backgroundColor: 'rgba(239,68,68,0.18)', borderTop: '0.3mm dashed rgba(220,38,38,0.55)', borderBottom: '0.3mm dashed rgba(220,38,38,0.55)', color: 'rgba(185,28,28,0.9)', padding: '1.2mm 8mm', fontSize: '2.2mm', fontWeight: 900, letterSpacing: '0.07em', textTransform: 'uppercase' as const }}>PREVIEW • BUKAN UNTUK CETAK</div>
  </div>
);

// ─── Shared QR Display ────────────────────────────────────────────────────
function QrDisplay({ qrDataUrl, size = '24mm', borderColor = '#f59e0b', bgColor = '#ffffff' }: { qrDataUrl: string; size?: string; borderColor?: string; bgColor?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '1.8mm', background: bgColor, border: `0.4mm solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0.5mm', boxShadow: `0 2mm 8mm rgba(0,0,0,0.4), 0 0 4mm ${borderColor}55` }}>
      {qrDataUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={qrDataUrl} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
        : <div style={{ fontSize: '1.6mm', color: '#94a3b8', fontWeight: 800 }}>QR CODE</div>
      }
    </div>
  );
}

// ─── Photo Placeholder ────────────────────────────────────────────────────
function PhotoPlaceholder({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.8mm' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span style={{ fontSize: '1.15mm', color, fontWeight: 800, letterSpacing: '0.04em' }}>FOTO SISWA</span>
    </div>
  );
}

// ─── Bottom Rules Box ─────────────────────────────────────────────────────
function RulesBox({ schoolName, labelColor, textColor, dividerColor, bgColor, borderColor }: { schoolName: string; labelColor: string; textColor: string; dividerColor: string; bgColor: string; borderColor: string }) {
  return (
    <div style={{ position: 'absolute', bottom: '7.5mm', left: '2.5mm', right: '2.5mm', zIndex: 10, background: bgColor, border: `0.3mm solid ${borderColor}`, borderRadius: '2mm', padding: '1.3mm 2mm' }}>
      <div style={{ fontSize: '1.35mm', fontWeight: 900, color: labelColor, letterSpacing: '0.08em', marginBottom: '0.5mm' }}>📋 KETENTUAN PENGGUNAAN</div>
      <ol style={{ paddingLeft: '2.8mm', margin: 0, fontSize: '1.25mm', color: textColor, lineHeight: 1.5, fontWeight: 600 }}>
        <li>Wajib dibawa setiap hari sekolah.</li>
        <li>Arahkan QR ke kamera petugas piket.</li>
        <li>Kartu hilang? Segera lapor admin sekolah.</li>
      </ol>
      <div style={{ marginTop: '0.6mm', fontSize: '1.15mm', color: labelColor, borderTop: `0.2mm solid ${dividerColor}`, paddingTop: '0.5mm', textAlign: 'center' as const, opacity: 0.8 }}>
        Diterbitkan: <strong style={{ opacity: 1 }}>{schoolName}</strong>
      </div>
    </div>
  );
}

// ─── Data Panel Rows ──────────────────────────────────────────────────────
function DataRows({ nis, nisn, cardId, labelColor, valueColor, dividerColor }: { nis: string; nisn?: string | null; cardId: string; labelColor: string; valueColor: string; dividerColor: string }) {
  return (
    <>
      {[['NIS', nis], ['NISN', nisn || '—'], ['ID KARTU', cardId]].map(([l, v], i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i < 2 ? '0.85mm' : 0, paddingBottom: i < 2 ? '0.85mm' : 0, borderBottom: i < 2 ? `0.2mm solid ${dividerColor}` : 'none' }}>
          <span style={{ fontSize: '1.3mm', fontWeight: 700, color: labelColor, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{l}</span>
          <span style={{ fontSize: '1.6mm', fontWeight: 900, color: valueColor }}>{v}</span>
        </div>
      ))}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — ROYAL SAPPHIRE NAVY  (dark blue + gold)
// ══════════════════════════════════════════════════════════════════════════
function T1Front(p: RenderProps) {
  return (
    <div id={p.frontId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(145deg, #020b1a 0%, #061e45 35%, #0c3060 65%, #061e45 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 20% 15%, rgba(100,220,255,0.11) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(245,158,11,0.09) 0%, transparent 50%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t1d" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="0.35" fill="rgba(125,211,252,0.1)"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t1d)" />
        <path d="M 170 0 C 200 40, 215 80, 204 130" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="1.5" />
        <path d="M 185 0 C 215 45, 230 90, 204 145" fill="none" stroke="rgba(245,158,11,0.1)" strokeWidth="0.8" />
        <circle cx="30" cy="295" r="40" fill="none" stroke="rgba(125,211,252,0.07)" strokeWidth="0.8" />
      </svg>
      {/* Header wave */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '17mm', zIndex: 10 }}>
        <svg viewBox="0 0 204 64" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <linearGradient id="t1g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#b45309"/><stop offset="35%" stopColor="#f59e0b"/><stop offset="65%" stopColor="#fde68a"/><stop offset="100%" stopColor="#b45309"/></linearGradient>
            <linearGradient id="t1n" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#020b1a"/><stop offset="100%" stopColor="#0d3060"/></linearGradient>
          </defs>
          <path d="M0 0 L204 0 L204 52 Q140 62 70 54 T0 58 Z" fill="url(#t1g)" />
          <path d="M0 0 L204 0 L204 44 Q140 54 70 46 T0 50 Z" fill="url(#t1n)" />
          <path d="M0 50 Q70 46 140 54 T204 44" fill="none" stroke="#fde68a" strokeWidth="0.7" opacity="0.7" />
        </svg>
        <div style={{ position: 'absolute', top: '2mm', left: '2.5mm', right: '2.5mm', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
            <div style={{ width: '8.5mm', height: '8.5mm', borderRadius: '1.2mm', background: 'rgba(255,255,255,0.1)', border: '0.35mm solid rgba(253,230,138,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt="" style={{ width: '75%', height: '75%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '2mm', fontWeight: 900, color: '#f0f9ff', textTransform: 'uppercase' as const, lineHeight: 1.1, maxWidth: '27mm', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>{p.schoolName}</div>
              <div style={{ fontSize: '0.95mm', color: '#7dd3fc', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const }}>KARTU TANDA SISWA</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.25mm', borderLeft: '0.3mm solid rgba(253,230,138,0.4)', paddingLeft: '1.5mm' }}>
            {[p.sl1, p.sl2, p.sl3].map((s, i) => <div key={i} style={{ fontSize: '0.9mm', fontWeight: 900, color: '#fde68a', letterSpacing: '0.08em', opacity: [1, 0.8, 0.65][i] }}>{s}</div>)}
          </div>
        </div>
      </div>
      {/* Photo */}
      <div style={{ position: 'absolute', top: '18.5mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ width: '24mm', height: '24mm', borderRadius: '50%', background: 'conic-gradient(from 0deg, #f59e0b, #fde68a, #f59e0b, #b45309, #fde68a, #f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.55mm', boxShadow: '0 0 5mm rgba(245,158,11,0.3), 0 2mm 6mm rgba(0,0,0,0.4)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#061e45', padding: '0.4mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, #1d4ed8 0%, #0a2558 55%, #020b1a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photoUrl || CLOUDINARY_DEFAULT_AVATAR} alt={p.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 12%' }} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: '1.6mm', fontSize: '2.5mm', fontWeight: 900, color: '#f0f9ff', textTransform: 'uppercase' as const, textAlign: 'center', maxWidth: '48mm', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 0 6mm rgba(125,211,252,0.35)' }} title={p.studentName}>{p.studentName}</div>
        <div style={{ marginTop: '0.8mm', background: 'rgba(14,165,233,0.2)', border: '0.3mm solid rgba(125,211,252,0.45)', borderRadius: '999mm', padding: '0.35mm 3.5mm', fontSize: '1.6mm', fontWeight: 800, color: '#bae6fd' }}>{p.classNameStr}</div>
      </div>
      {/* Data */}
      <div style={{ position: 'absolute', bottom: '7.5mm', left: '2.5mm', right: '2.5mm', zIndex: 10, background: 'rgba(255,255,255,0.055)', border: '0.3mm solid rgba(255,255,255,0.12)', borderRadius: '2.5mm', padding: '1.5mm 2mm' }}>
        <DataRows nis={p.nis} nisn={p.nisn} cardId={p.cardId} labelColor="#7dd3fc" valueColor="#f0f9ff" dividerColor="rgba(255,255,255,0.07)" />
      </div>
      {/* Footer */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: 'linear-gradient(90deg, #92400e, #f59e0b 30%, #fde68a 50%, #f59e0b 70%, #92400e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.4mm', background: 'rgba(255,255,255,0.45)' }} />
        <span style={{ fontSize: '1.25mm', fontWeight: 900, color: 'rgba(0,0,0,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>{p.schoolName}</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

function T1Back(p: RenderProps) {
  return (
    <div id={p.backId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(145deg, #020b1a 0%, #0d3060 50%, #020b1a 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 40%, rgba(14,165,233,0.1) 0%, transparent 60%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t1bd" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="0.3" fill="rgba(125,211,252,0.08)"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t1bd)" />
        <circle cx="102" cy="148" r="52" fill="none" stroke="rgba(14,165,233,0.1)" strokeWidth="0.6" strokeDasharray="5 4" />
        <circle cx="102" cy="148" r="68" fill="none" stroke="rgba(14,165,233,0.06)" strokeWidth="0.5" />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '11mm', zIndex: 10, background: 'linear-gradient(180deg, rgba(2,11,26,0.85) 0%, transparent 100%)' }}>
        <div style={{ position: 'absolute', bottom: 0, left: '2.5mm', right: '2.5mm', height: '0.3mm', background: 'linear-gradient(90deg, transparent, #fde68a 40%, #f59e0b 50%, #fde68a 60%, transparent)', opacity: 0.55 }} />
        <div style={{ position: 'absolute', top: '2mm', left: '2.8mm', right: '2.8mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2mm' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo} alt="" style={{ width: '5mm', height: '5mm', objectFit: 'contain', filter: 'brightness(1.2)' }} />
            <span style={{ fontSize: '1.6mm', fontWeight: 900, color: '#f0f9ff', letterSpacing: '0.06em' }}>PRESENSI RESMI</span>
          </div>
          <span style={{ fontSize: '1.25mm', fontWeight: 800, color: '#fde68a' }}>{p.cardId}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: '12.5mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ fontSize: '1.5mm', fontWeight: 900, color: '#bae6fd', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1mm' }}>— SCAN UNTUK PRESENSI —</div>
        <div style={{ position: 'relative', width: '28.5mm', height: '28.5mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[{ top: 0, left: 0, borderTop: '0.85mm solid #f59e0b', borderLeft: '0.85mm solid #f59e0b', borderTopLeftRadius: '1.2mm' }, { top: 0, right: 0, borderTop: '0.85mm solid #f59e0b', borderRight: '0.85mm solid #f59e0b', borderTopRightRadius: '1.2mm' }, { bottom: 0, left: 0, borderBottom: '0.85mm solid #f59e0b', borderLeft: '0.85mm solid #f59e0b', borderBottomLeftRadius: '1.2mm' }, { bottom: 0, right: 0, borderBottom: '0.85mm solid #f59e0b', borderRight: '0.85mm solid #f59e0b', borderBottomRightRadius: '1.2mm' }].map((s, i) => <div key={i} style={{ position: 'absolute', width: '4mm', height: '4mm', ...s }} />)}
          <QrDisplay qrDataUrl={p.qrDataUrl} size="25mm" borderColor="#f59e0b" />
        </div>
        <div style={{ marginTop: '1.2mm', fontSize: '1.45mm', color: '#bae6fd', fontWeight: 700 }}>Token: <strong style={{ color: '#f0f9ff' }}>{p.qrToken || '—'}</strong></div>
      </div>
      <RulesBox schoolName={p.schoolName} labelColor="#fde68a" textColor="#cbd5e1" dividerColor="rgba(255,255,255,0.07)" bgColor="rgba(255,255,255,0.05)" borderColor="rgba(255,255,255,0.1)" />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: 'linear-gradient(90deg, #92400e, #f59e0b 30%, #fde68a 50%, #f59e0b 70%, #92400e)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2.5mm' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.4mm', background: 'rgba(255,255,255,0.45)' }} />
        <span style={{ fontSize: '1.15mm', fontWeight: 900, color: 'rgba(0,0,0,0.55)' }}>SmartSiswa System</span>
        <span style={{ fontSize: '1.0mm', fontWeight: 800, color: 'rgba(0,0,0,0.4)' }}>ISO/IEC 7810 ID-1</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — COSMIC EMERALD  (dark green + cyan)
// ══════════════════════════════════════════════════════════════════════════
function T2Front(p: RenderProps) {
  return (
    <div id={p.frontId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(160deg, #011510 0%, #022c22 30%, #064e3b 60%, #022c22 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 15% 20%, rgba(52,211,153,0.15) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(6,182,212,0.10) 0%, transparent 50%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t2h" width="12" height="10" patternUnits="userSpaceOnUse"><path d="M6 0 L12 5 L6 10 L0 5 Z" fill="none" stroke="rgba(52,211,153,0.08)" strokeWidth="0.4"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t2h)" />
        <path d="M 180 0 C 204 20, 204 60, 190 90" fill="none" stroke="rgba(52,211,153,0.18)" strokeWidth="1.5" />
        <path d="M 0 280 C 50 250, 120 290, 204 260" fill="none" stroke="rgba(52,211,153,0.1)" strokeWidth="1" />
      </svg>
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <div style={{ height: '14mm', background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)', display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
            <div style={{ width: '8mm', height: '8mm', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '0.4mm solid rgba(52,211,153,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt="" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '2mm', fontWeight: 900, color: '#ecfdf5', textTransform: 'uppercase' as const, lineHeight: 1.1, maxWidth: '28mm', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>{p.schoolName}</div>
              <div style={{ fontSize: '0.9mm', color: '#6ee7b7', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const }}>KARTU TANDA SISWA</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.2mm', borderLeft: '0.3mm solid rgba(52,211,153,0.4)', paddingLeft: '1.5mm' }}>
            {[p.sl1, p.sl2, p.sl3].map((s, i) => <div key={i} style={{ fontSize: '0.85mm', fontWeight: 900, color: '#6ee7b7', letterSpacing: '0.08em', opacity: [1, 0.8, 0.65][i] }}>{s}</div>)}
          </div>
        </div>
        <div style={{ height: '0.5mm', background: 'linear-gradient(90deg, #064e3b, #34d399 30%, #22d3ee 50%, #34d399 70%, #064e3b)' }} />
      </div>
      {/* Photo — rectangular portrait */}
      <div style={{ position: 'absolute', top: '16mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ width: '23mm', height: '26mm', borderRadius: '2.5mm', border: '0.7mm solid #34d399', overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, #059669 0%, #064e3b 55%, #011510 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 6mm rgba(52,211,153,0.35), 0 2mm 8mm rgba(0,0,0,0.4)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photoUrl || CLOUDINARY_DEFAULT_AVATAR} alt={p.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 12%' }} />
        </div>
        <div style={{ marginTop: '1.6mm', fontSize: '2.5mm', fontWeight: 900, color: '#ecfdf5', textTransform: 'uppercase' as const, textAlign: 'center', maxWidth: '49mm', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 0 5mm rgba(52,211,153,0.4)' }} title={p.studentName}>{p.studentName}</div>
        <div style={{ marginTop: '0.8mm', background: 'rgba(52,211,153,0.15)', border: '0.35mm solid rgba(52,211,153,0.5)', borderRadius: '999mm', padding: '0.35mm 3.5mm', fontSize: '1.6mm', fontWeight: 800, color: '#6ee7b7' }}>{p.classNameStr}</div>
      </div>
      <div style={{ position: 'absolute', bottom: '7.5mm', left: '2.5mm', right: '2.5mm', zIndex: 10, background: 'rgba(0,0,0,0.3)', border: '0.35mm solid rgba(52,211,153,0.2)', borderRadius: '2.5mm', padding: '1.4mm 2mm' }}>
        <DataRows nis={p.nis} nisn={p.nisn} cardId={p.cardId} labelColor="#6ee7b7" valueColor="#ecfdf5" dividerColor="rgba(52,211,153,0.12)" />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: 'linear-gradient(90deg, #064e3b, #34d399 30%, #6ee7b7 50%, #34d399 70%, #064e3b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.4mm', background: 'rgba(255,255,255,0.4)' }} />
        <span style={{ fontSize: '1.2mm', fontWeight: 900, color: 'rgba(2,44,34,0.8)', letterSpacing: '0.18em', textTransform: 'uppercase' as const }}>{p.schoolName}</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

function T2Back(p: RenderProps) {
  return (
    <div id={p.backId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(160deg, #011510 0%, #064e3b 50%, #011510 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 40%, rgba(52,211,153,0.12) 0%, transparent 60%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t2bh" width="12" height="10" patternUnits="userSpaceOnUse"><path d="M6 0 L12 5 L6 10 L0 5 Z" fill="none" stroke="rgba(52,211,153,0.06)" strokeWidth="0.3"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t2bh)" />
        <circle cx="102" cy="148" r="55" fill="none" stroke="rgba(52,211,153,0.08)" strokeWidth="0.6" strokeDasharray="5 4" />
        <circle cx="102" cy="148" r="70" fill="none" stroke="rgba(6,182,212,0.06)" strokeWidth="0.5" />
      </svg>
      <div style={{ height: '11mm', background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)', display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2mm' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.logo} alt="" style={{ width: '5mm', height: '5mm', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.6mm', fontWeight: 900, color: '#ecfdf5', letterSpacing: '0.06em' }}>PRESENSI RESMI</span>
        </div>
        <span style={{ fontSize: '1.2mm', fontWeight: 800, color: '#6ee7b7' }}>{p.cardId}</span>
      </div>
      <div style={{ height: '0.5mm', background: 'linear-gradient(90deg, #064e3b, #34d399 30%, #22d3ee 50%, #34d399 70%, #064e3b)', position: 'relative', zIndex: 10 }} />
      <div style={{ position: 'absolute', top: '13mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ fontSize: '1.5mm', fontWeight: 900, color: '#6ee7b7', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1mm' }}>— SCAN UNTUK PRESENSI —</div>
        <QrDisplay qrDataUrl={p.qrDataUrl} size="26mm" borderColor="#34d399" />
        <div style={{ marginTop: '1.2mm', fontSize: '1.45mm', color: '#6ee7b7', fontWeight: 700 }}>Token: <strong style={{ color: '#ecfdf5' }}>{p.qrToken || '—'}</strong></div>
      </div>
      <RulesBox schoolName={p.schoolName} labelColor="#34d399" textColor="#a7f3d0" dividerColor="rgba(52,211,153,0.1)" bgColor="rgba(0,0,0,0.3)" borderColor="rgba(52,211,153,0.2)" />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: 'linear-gradient(90deg, #064e3b, #34d399 30%, #6ee7b7 50%, #34d399 70%, #064e3b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2.5mm' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.4mm', background: 'rgba(255,255,255,0.4)' }} />
        <span style={{ fontSize: '1.15mm', fontWeight: 900, color: 'rgba(2,44,34,0.7)' }}>SmartSiswa System</span>
        <span style={{ fontSize: '1.0mm', fontWeight: 800, color: 'rgba(2,44,34,0.5)' }}>ISO/IEC 7810 ID-1</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — ROSE GOLD EXECUTIVE  (cream white + rose red)
// ══════════════════════════════════════════════════════════════════════════
function T3Front(p: RenderProps) {
  return (
    <div id={p.frontId} style={{ ...p.cs, backgroundColor: '#fdf8f8' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 40%, #fecdd3 70%, #fff1f2 100%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t3l" width="10" height="10" patternUnits="userSpaceOnUse"><line x1="0" y1="10" x2="10" y2="0" stroke="rgba(190,18,60,0.05)" strokeWidth="0.5"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t3l)" />
        <path d="M 0 0 C 40 30, 80 10, 130 40 L 130 0 Z" fill="rgba(190,18,60,0.06)" />
        <path d="M 80 0 C 110 25, 150 8, 204 35 L 204 0 Z" fill="rgba(190,18,60,0.04)" />
      </svg>
      <div style={{ position: 'absolute', top: 0, right: 0, width: '22mm', height: '22mm', zIndex: 3, pointerEvents: 'none', background: 'radial-gradient(ellipse at 100% 0%, rgba(190,18,60,0.08) 0%, transparent 70%)' }} />
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <div style={{ height: '14.5mm', background: 'linear-gradient(135deg, #9f1239 0%, #be123c 40%, #e11d48 70%, #9f1239 100%)', display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
            <div style={{ width: '8.5mm', height: '8.5mm', borderRadius: '1.5mm', background: 'rgba(255,255,255,0.18)', border: '0.4mm solid rgba(255,204,213,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt="" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '2mm', fontWeight: 900, color: '#fff1f2', textTransform: 'uppercase' as const, lineHeight: 1.1, maxWidth: '27mm', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>{p.schoolName}</div>
              <div style={{ fontSize: '0.9mm', color: '#fecdd3', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const }}>KARTU TANDA SISWA</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.2mm', borderLeft: '0.3mm solid rgba(255,204,213,0.5)', paddingLeft: '1.5mm' }}>
            {[p.sl1, p.sl2, p.sl3].map((s, i) => <div key={i} style={{ fontSize: '0.85mm', fontWeight: 900, color: '#fecdd3', letterSpacing: '0.08em', opacity: [1, 0.8, 0.65][i] }}>{s}</div>)}
          </div>
        </div>
        <div style={{ height: '0.6mm', background: 'linear-gradient(90deg, #9f1239, #f43f5e 25%, #fda4af 50%, #f43f5e 75%, #9f1239)' }} />
      </div>
      {/* Photo — framed portrait */}
      <div style={{ position: 'absolute', top: '16.5mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ width: '22.5mm', height: '25.5mm', borderRadius: '1.8mm', border: '0.7mm solid #be123c', overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, #ffffff 0%, #ffe4e6 50%, #fecdd3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2mm 8mm rgba(190,18,60,0.2), 0 0 0 1.2mm rgba(190,18,60,0.08)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photoUrl || CLOUDINARY_DEFAULT_AVATAR} alt={p.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 12%' }} />
        </div>
        <div style={{ marginTop: '1.5mm', fontSize: '2.4mm', fontWeight: 900, color: '#3b0012', textTransform: 'uppercase' as const, textAlign: 'center', maxWidth: '49mm', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.studentName}>{p.studentName}</div>
        <div style={{ marginTop: '0.7mm', background: 'linear-gradient(135deg, #be123c, #e11d48)', borderRadius: '999mm', padding: '0.4mm 3.5mm', fontSize: '1.6mm', fontWeight: 800, color: '#fff1f2' }}>{p.classNameStr}</div>
      </div>
      <div style={{ position: 'absolute', bottom: '7.5mm', left: '2.5mm', right: '2.5mm', zIndex: 10, background: 'rgba(255,255,255,0.7)', border: '0.35mm solid rgba(190,18,60,0.2)', borderRadius: '2.5mm', padding: '1.4mm 2mm', boxShadow: '0 1mm 4mm rgba(190,18,60,0.08)' }}>
        <DataRows nis={p.nis} nisn={p.nisn} cardId={p.cardId} labelColor="#be123c" valueColor="#3b0012" dividerColor="rgba(190,18,60,0.1)" />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: 'linear-gradient(90deg, #9f1239, #be123c 30%, #e11d48 50%, #be123c 70%, #9f1239)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.4mm', background: 'rgba(255,255,255,0.5)' }} />
        <span style={{ fontSize: '1.25mm', fontWeight: 900, color: 'rgba(255,241,242,0.85)', letterSpacing: '0.18em', textTransform: 'uppercase' as const }}>{p.schoolName}</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

function T3Back(p: RenderProps) {
  return (
    <div id={p.backId} style={{ ...p.cs, backgroundColor: '#fdf8f8' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #fff1f2 100%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t3bl" width="10" height="10" patternUnits="userSpaceOnUse"><line x1="0" y1="10" x2="10" y2="0" stroke="rgba(190,18,60,0.04)" strokeWidth="0.5"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t3bl)" />
        <circle cx="102" cy="148" r="52" fill="none" stroke="rgba(190,18,60,0.07)" strokeWidth="0.6" strokeDasharray="5 4" />
        <circle cx="102" cy="148" r="68" fill="none" stroke="rgba(190,18,60,0.04)" strokeWidth="0.5" />
      </svg>
      <div style={{ height: '11mm', background: 'linear-gradient(135deg, #9f1239 0%, #e11d48 100%)', display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2mm' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.logo} alt="" style={{ width: '5mm', height: '5mm', objectFit: 'contain', filter: 'brightness(2)' }} />
          <span style={{ fontSize: '1.6mm', fontWeight: 900, color: '#fff1f2', letterSpacing: '0.06em' }}>PRESENSI RESMI</span>
        </div>
        <span style={{ fontSize: '1.2mm', fontWeight: 800, color: '#fecdd3' }}>{p.cardId}</span>
      </div>
      <div style={{ height: '0.5mm', background: 'linear-gradient(90deg, #9f1239, #f43f5e 25%, #fda4af 50%, #f43f5e 75%, #9f1239)', position: 'relative', zIndex: 10 }} />
      <div style={{ position: 'absolute', top: '13mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ fontSize: '1.5mm', fontWeight: 900, color: '#be123c', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1mm' }}>— SCAN UNTUK PRESENSI —</div>
        <QrDisplay qrDataUrl={p.qrDataUrl} size="26mm" borderColor="#be123c" bgColor="#fff1f2" />
        <div style={{ marginTop: '1.2mm', fontSize: '1.45mm', color: '#be123c', fontWeight: 700 }}>Token: <strong style={{ color: '#3b0012' }}>{p.qrToken || '—'}</strong></div>
      </div>
      <RulesBox schoolName={p.schoolName} labelColor="#be123c" textColor="#3b0012" dividerColor="rgba(190,18,60,0.1)" bgColor="rgba(255,255,255,0.75)" borderColor="rgba(190,18,60,0.2)" />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: 'linear-gradient(90deg, #9f1239, #be123c 30%, #e11d48 50%, #be123c 70%, #9f1239)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2.5mm' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.4mm', background: 'rgba(255,255,255,0.5)' }} />
        <span style={{ fontSize: '1.15mm', fontWeight: 900, color: 'rgba(255,241,242,0.8)' }}>SmartSiswa System</span>
        <span style={{ fontSize: '1.0mm', fontWeight: 800, color: 'rgba(255,241,242,0.55)' }}>ISO/IEC 7810 ID-1</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TEMPLATE 4 — CYBER TITANIUM  (black + neon cyan)
// ══════════════════════════════════════════════════════════════════════════
function T4Front(p: RenderProps) {
  return (
    <div id={p.frontId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#050508' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 0%, rgba(0,212,255,0.12) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(99,102,241,0.08) 0%, transparent 50%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t4g" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0 L0 0 L0 14" fill="none" stroke="rgba(0,212,255,0.06)" strokeWidth="0.4"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t4g)" />
        <path d="M -10 60 L 220 200" fill="none" stroke="rgba(0,212,255,0.06)" strokeWidth="10" />
        <path d="M 180 0 L 204 0 L 204 24" fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth="1.2" />
        <path d="M 0 300 L 0 324 L 24 324" fill="none" stroke="rgba(0,212,255,0.25)" strokeWidth="1.2" />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.5mm', zIndex: 11, background: 'linear-gradient(90deg, transparent, #00d4ff 30%, #a78bfa 50%, #00d4ff 70%, transparent)' }} />
      <div style={{ position: 'absolute', top: '0.5mm', left: 0, right: 0, height: '14mm', zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
          <div style={{ width: '8.5mm', height: '8.5mm', borderRadius: '0.8mm', background: 'rgba(0,212,255,0.1)', border: '0.35mm solid rgba(0,212,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 4mm rgba(0,212,255,0.2)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo} alt="" style={{ width: '70%', height: '70%', objectFit: 'contain', filter: 'brightness(1.5) hue-rotate(180deg)' }} />
          </div>
          <div>
            <div style={{ fontSize: '2mm', fontWeight: 900, color: '#e0f2fe', textTransform: 'uppercase' as const, lineHeight: 1.1, maxWidth: '26mm', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis', textShadow: '0 0 4mm rgba(0,212,255,0.5)' }}>{p.schoolName}</div>
            <div style={{ fontSize: '0.9mm', color: '#00d4ff', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const }}>KARTU TANDA SISWA</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.2mm', borderLeft: '0.3mm solid rgba(0,212,255,0.3)', paddingLeft: '1.5mm' }}>
          {[p.sl1, p.sl2, p.sl3].map((s, i) => <div key={i} style={{ fontSize: '0.85mm', fontWeight: 900, color: '#00d4ff', letterSpacing: '0.08em', opacity: [1, 0.75, 0.55][i] }}>{s}</div>)}
        </div>
      </div>
      <div style={{ position: 'absolute', top: '14.5mm', left: '2.5mm', right: '2.5mm', height: '0.3mm', zIndex: 10, background: 'linear-gradient(90deg, transparent, #00d4ff 40%, transparent)' }} />
      {/* Photo — sharp square with neon border */}
      <div style={{ position: 'absolute', top: '16.5mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ width: '23mm', height: '25.5mm', borderRadius: '0.8mm', border: '0.6mm solid #00d4ff', overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, #0e7490 0%, #082f49 55%, #050508 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8mm rgba(0,212,255,0.35), inset 0 0 0 0.2mm rgba(0,212,255,0.15)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photoUrl || CLOUDINARY_DEFAULT_AVATAR} alt={p.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 12%' }} />
        </div>
        <div style={{ marginTop: '1.6mm', fontSize: '2.45mm', fontWeight: 900, color: '#e0f2fe', textTransform: 'uppercase' as const, textAlign: 'center', maxWidth: '49mm', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 0 5mm rgba(0,212,255,0.4)' }} title={p.studentName}>{p.studentName}</div>
        <div style={{ marginTop: '0.8mm', background: 'rgba(0,212,255,0.1)', border: '0.35mm solid rgba(0,212,255,0.45)', borderRadius: '1mm', padding: '0.35mm 3.5mm', fontSize: '1.6mm', fontWeight: 800, color: '#00d4ff' }}>{p.classNameStr}</div>
      </div>
      <div style={{ position: 'absolute', bottom: '7.5mm', left: '2.5mm', right: '2.5mm', zIndex: 10, background: 'rgba(0,212,255,0.04)', border: '0.35mm solid rgba(0,212,255,0.18)', borderRadius: '1mm', padding: '1.4mm 2mm' }}>
        <DataRows nis={p.nis} nisn={p.nisn} cardId={p.cardId} labelColor="#00d4ff" valueColor="#e0f2fe" dividerColor="rgba(0,212,255,0.1)" />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: 'linear-gradient(135deg, #0a0a14 0%, #1a1a2e 50%, #0a0a14 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.5mm', background: 'linear-gradient(90deg, transparent, #00d4ff 30%, #a78bfa 50%, #00d4ff 70%, transparent)' }} />
        <span style={{ fontSize: '1.2mm', fontWeight: 700, color: 'rgba(0,212,255,0.7)', letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>{p.schoolName}</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

function T4Back(p: RenderProps) {
  return (
    <div id={p.backId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#050508' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 45%, rgba(0,212,255,0.1) 0%, transparent 60%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t4bg" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0 L0 0 L0 14" fill="none" stroke="rgba(0,212,255,0.05)" strokeWidth="0.4"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t4bg)" />
        <circle cx="102" cy="148" r="50" fill="none" stroke="rgba(0,212,255,0.09)" strokeWidth="0.6" />
        <circle cx="102" cy="148" r="65" fill="none" stroke="rgba(167,139,250,0.06)" strokeWidth="0.5" strokeDasharray="5 4" />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.5mm', zIndex: 11, background: 'linear-gradient(90deg, transparent, #00d4ff 30%, #a78bfa 50%, #00d4ff 70%, transparent)' }} />
      <div style={{ position: 'absolute', top: '0.5mm', left: 0, right: 0, height: '11mm', zIndex: 10, display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2mm' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.logo} alt="" style={{ width: '5mm', height: '5mm', objectFit: 'contain', filter: 'brightness(2) hue-rotate(180deg)' }} />
          <span style={{ fontSize: '1.6mm', fontWeight: 900, color: '#00d4ff', letterSpacing: '0.06em', textShadow: '0 0 4mm rgba(0,212,255,0.4)' }}>PRESENSI RESMI</span>
        </div>
        <span style={{ fontSize: '1.2mm', fontWeight: 800, color: 'rgba(0,212,255,0.7)', fontFamily: 'monospace' }}>{p.cardId}</span>
      </div>
      <div style={{ position: 'absolute', top: '11.5mm', left: '2.5mm', right: '2.5mm', height: '0.3mm', zIndex: 10, background: 'linear-gradient(90deg, transparent, #00d4ff 40%, transparent)' }} />
      <div style={{ position: 'absolute', top: '13mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ fontSize: '1.5mm', fontWeight: 900, color: '#00d4ff', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1mm', textShadow: '0 0 4mm rgba(0,212,255,0.4)' }}>[ SCAN UNTUK PRESENSI ]</div>
        <QrDisplay qrDataUrl={p.qrDataUrl} size="26mm" borderColor="#00d4ff" />
        <div style={{ marginTop: '1.2mm', fontSize: '1.45mm', color: '#7dd3fc', fontWeight: 700, fontFamily: 'monospace' }}>TOKEN: <strong style={{ color: '#00d4ff' }}>{p.qrToken || '—'}</strong></div>
      </div>
      <RulesBox schoolName={p.schoolName} labelColor="#00d4ff" textColor="#94a3b8" dividerColor="rgba(0,212,255,0.1)" bgColor="rgba(0,212,255,0.04)" borderColor="rgba(0,212,255,0.15)" />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: '#0a0a14', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2.5mm' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.5mm', background: 'linear-gradient(90deg, transparent, #00d4ff 30%, #a78bfa 50%, #00d4ff 70%, transparent)' }} />
        <span style={{ fontSize: '1.15mm', fontWeight: 700, color: 'rgba(0,212,255,0.6)' }}>SmartSiswa System</span>
        <span style={{ fontSize: '1.0mm', fontWeight: 700, color: 'rgba(0,212,255,0.4)', fontFamily: 'monospace' }}>ISO/IEC 7810 ID-1</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TEMPLATE 5 — AURORA VIOLET  (deep purple + lavender)
// ══════════════════════════════════════════════════════════════════════════
function T5Front(p: RenderProps) {
  return (
    <div id={p.frontId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(160deg, #0f0520 0%, #1a0533 30%, #2d1b4e 60%, #1a0533 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 25% 15%, rgba(192,132,252,0.2) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.15) 0%, transparent 50%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs>
          <pattern id="t5s" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="0.4" fill="rgba(192,132,252,0.15)"/><circle cx="0" cy="0" r="0.25" fill="rgba(192,132,252,0.1)"/></pattern>
          <linearGradient id="t5au" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#c084fc" stopOpacity="0.2"/><stop offset="100%" stopColor="#818cf8" stopOpacity="0.05"/></linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#t5s)" />
        <path d="M -20 80 C 50 50, 150 110, 230 60" fill="none" stroke="url(#t5au)" strokeWidth="8" />
        <path d="M -20 100 C 60 70, 140 130, 230 80" fill="none" stroke="url(#t5au)" strokeWidth="5" />
        <circle cx="170" cy="30" r="1.2" fill="rgba(255,255,255,0.4)"/>
        <circle cx="185" cy="50" r="0.8" fill="rgba(255,255,255,0.3)"/>
      </svg>
      {/* Header */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <div style={{ height: '14mm', background: 'linear-gradient(135deg, #4c1d95 0%, #5b21b6 50%, #6d28d9 100%)', display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
            <div style={{ width: '8.5mm', height: '8.5mm', borderRadius: '1.2mm', background: 'rgba(255,255,255,0.1)', border: '0.4mm solid rgba(192,132,252,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt="" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '2mm', fontWeight: 900, color: '#faf5ff', textTransform: 'uppercase' as const, lineHeight: 1.1, maxWidth: '27mm', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>{p.schoolName}</div>
              <div style={{ fontSize: '0.9mm', color: '#d8b4fe', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const }}>KARTU TANDA SISWA</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.2mm', borderLeft: '0.3mm solid rgba(192,132,252,0.4)', paddingLeft: '1.5mm' }}>
            {[p.sl1, p.sl2, p.sl3].map((s, i) => <div key={i} style={{ fontSize: '0.85mm', fontWeight: 900, color: '#e9d5ff', letterSpacing: '0.08em', opacity: [1, 0.8, 0.65][i] }}>{s}</div>)}
          </div>
        </div>
        <div style={{ height: '0.5mm', background: 'linear-gradient(90deg, #4c1d95, #c084fc 25%, #e879f9 50%, #c084fc 75%, #4c1d95)' }} />
      </div>
      {/* Photo — circular aurora ring */}
      <div style={{ position: 'absolute', top: '17mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ width: '24mm', height: '24mm', borderRadius: '50%', background: 'conic-gradient(from 0deg, #c084fc, #818cf8, #e879f9, #c084fc, #818cf8, #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.55mm', boxShadow: '0 0 6mm rgba(192,132,252,0.35), 0 2mm 8mm rgba(0,0,0,0.5)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#1a0533', padding: '0.35mm', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, #7e22ce 0%, #3b0764 60%, #0f0520 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photoUrl || CLOUDINARY_DEFAULT_AVATAR} alt={p.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 12%' }} />
            </div>
          </div>
        </div>
        <div style={{ marginTop: '1.6mm', fontSize: '2.45mm', fontWeight: 900, color: '#faf5ff', textTransform: 'uppercase' as const, textAlign: 'center', maxWidth: '49mm', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 0 6mm rgba(192,132,252,0.45)' }} title={p.studentName}>{p.studentName}</div>
        <div style={{ marginTop: '0.8mm', background: 'rgba(192,132,252,0.15)', border: '0.35mm solid rgba(192,132,252,0.5)', borderRadius: '999mm', padding: '0.35mm 3.5mm', fontSize: '1.6mm', fontWeight: 800, color: '#e9d5ff' }}>{p.classNameStr}</div>
      </div>
      <div style={{ position: 'absolute', bottom: '7.5mm', left: '2.5mm', right: '2.5mm', zIndex: 10, background: 'rgba(192,132,252,0.07)', border: '0.3mm solid rgba(192,132,252,0.2)', borderRadius: '2.5mm', padding: '1.4mm 2mm' }}>
        <DataRows nis={p.nis} nisn={p.nisn} cardId={p.cardId} labelColor="#c084fc" valueColor="#faf5ff" dividerColor="rgba(192,132,252,0.1)" />
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: 'linear-gradient(90deg, #4c1d95, #6d28d9 30%, #c084fc 50%, #6d28d9 70%, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.5mm', background: 'linear-gradient(90deg, #4c1d95, #e879f9 50%, #4c1d95)' }} />
        <span style={{ fontSize: '1.25mm', fontWeight: 900, color: 'rgba(250,245,255,0.85)', letterSpacing: '0.18em', textTransform: 'uppercase' as const }}>{p.schoolName}</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

function T5Back(p: RenderProps) {
  return (
    <div id={p.backId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(160deg, #0f0520 0%, #2d1b4e 50%, #0f0520 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 40%, rgba(192,132,252,0.14) 0%, transparent 60%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t5bs" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="0.35" fill="rgba(192,132,252,0.12)"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t5bs)" />
        <circle cx="102" cy="148" r="50" fill="none" stroke="rgba(192,132,252,0.1)" strokeWidth="0.6" strokeDasharray="5 4" />
        <circle cx="102" cy="148" r="66" fill="none" stroke="rgba(99,102,241,0.07)" strokeWidth="0.5" />
      </svg>
      <div style={{ height: '11mm', background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)', display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2mm' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.logo} alt="" style={{ width: '5mm', height: '5mm', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.6mm', fontWeight: 900, color: '#faf5ff', letterSpacing: '0.06em' }}>PRESENSI RESMI</span>
        </div>
        <span style={{ fontSize: '1.2mm', fontWeight: 800, color: '#d8b4fe' }}>{p.cardId}</span>
      </div>
      <div style={{ height: '0.5mm', background: 'linear-gradient(90deg, #4c1d95, #c084fc 25%, #e879f9 50%, #c084fc 75%, #4c1d95)', position: 'relative', zIndex: 10 }} />
      <div style={{ position: 'absolute', top: '13mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ fontSize: '1.5mm', fontWeight: 900, color: '#c084fc', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1mm' }}>✦ SCAN UNTUK PRESENSI ✦</div>
        <QrDisplay qrDataUrl={p.qrDataUrl} size="26mm" borderColor="#c084fc" />
        <div style={{ marginTop: '1.2mm', fontSize: '1.45mm', color: '#d8b4fe', fontWeight: 700 }}>Token: <strong style={{ color: '#faf5ff' }}>{p.qrToken || '—'}</strong></div>
      </div>
      <RulesBox schoolName={p.schoolName} labelColor="#c084fc" textColor="#d8b4fe" dividerColor="rgba(192,132,252,0.1)" bgColor="rgba(192,132,252,0.06)" borderColor="rgba(192,132,252,0.18)" />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10, background: 'linear-gradient(90deg, #4c1d95, #6d28d9 30%, #c084fc 50%, #6d28d9 70%, #4c1d95)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2.5mm' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '0.5mm', background: 'linear-gradient(90deg, #4c1d95, #e879f9 50%, #4c1d95)' }} />
        <span style={{ fontSize: '1.15mm', fontWeight: 900, color: 'rgba(250,245,255,0.75)' }}>SmartSiswa System</span>
        <span style={{ fontSize: '1.0mm', fontWeight: 800, color: 'rgba(250,245,255,0.5)' }}>ISO/IEC 7810 ID-1</span>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// TEMPLATE 6 — CRIMSON ROYAL  (dark maroon + silver/white)
// ══════════════════════════════════════════════════════════════════════════
function T6Front(p: RenderProps) {
  return (
    <div id={p.frontId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(150deg, #1a0008 0%, #3b0012 30%, #7f1d1d 60%, #3b0012 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 80% 10%, rgba(252,165,165,0.1) 0%, transparent 55%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t6d" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="0.5" fill="rgba(255,255,255,0.06)"/><circle cx="0" cy="0" r="0.3" fill="rgba(255,255,255,0.04)"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t6d)" />
        <path d="M 0 200 L 204 160" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
        <path d="M 190 0 L 204 0 L 204 14" fill="none" stroke="rgba(252,165,165,0.3)" strokeWidth="1.0" />
        <path d="M 0 310 L 0 324 L 14 324" fill="none" stroke="rgba(252,165,165,0.25)" strokeWidth="1.0" />
      </svg>
      {/* Header — silver bar + red body */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <div style={{ height: '1.5mm', background: 'linear-gradient(90deg, #7f1d1d, #fca5a5 30%, #ffffff 50%, #fca5a5 70%, #7f1d1d)' }} />
        <div style={{ height: '12.5mm', background: 'linear-gradient(135deg, #1a0008 0%, #3b0012 50%, #7f1d1d 100%)', display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
            <div style={{ width: '8mm', height: '8mm', borderRadius: '1.2mm', background: 'rgba(255,255,255,0.1)', border: '0.4mm solid rgba(252,165,165,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.logo} alt="" style={{ width: '70%', height: '70%', objectFit: 'contain', filter: 'brightness(2) grayscale(0.3)' }} />
            </div>
            <div>
              <div style={{ fontSize: '2mm', fontWeight: 900, color: '#fff1f2', textTransform: 'uppercase' as const, lineHeight: 1.1, maxWidth: '27mm', overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>{p.schoolName}</div>
              <div style={{ fontSize: '0.9mm', color: '#fca5a5', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const }}>KARTU TANDA SISWA</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.2mm', borderLeft: '0.3mm solid rgba(252,165,165,0.4)', paddingLeft: '1.5mm' }}>
            {[p.sl1, p.sl2, p.sl3].map((s, i) => <div key={i} style={{ fontSize: '0.85mm', fontWeight: 900, color: '#fca5a5', letterSpacing: '0.08em', opacity: [1, 0.8, 0.65][i] }}>{s}</div>)}
          </div>
        </div>
      </div>
      {/* Photo — oval shape unique to T6 */}
      <div style={{ position: 'absolute', top: '16mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ width: '22mm', height: '26mm', borderRadius: '50% 50% 50% 50% / 35% 35% 65% 65%', border: '0.7mm solid rgba(252,165,165,0.7)', overflow: 'hidden', background: 'radial-gradient(circle at 50% 35%, #991b1b 0%, #450a0a 60%, #1a0008 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 6mm rgba(220,38,38,0.25), 0 2mm 8mm rgba(0,0,0,0.5)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.photoUrl || CLOUDINARY_DEFAULT_AVATAR} alt={p.studentName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 12%' }} />
        </div>
        <div style={{ marginTop: '1.6mm', fontSize: '2.45mm', fontWeight: 900, color: '#fff1f2', textTransform: 'uppercase' as const, textAlign: 'center', maxWidth: '49mm', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.studentName}>{p.studentName}</div>
        <div style={{ marginTop: '0.8mm', background: 'rgba(252,165,165,0.1)', border: '0.35mm solid rgba(252,165,165,0.45)', borderRadius: '999mm', padding: '0.35mm 3.5mm', fontSize: '1.6mm', fontWeight: 800, color: '#fca5a5' }}>{p.classNameStr}</div>
      </div>
      <div style={{ position: 'absolute', bottom: '7.5mm', left: '2.5mm', right: '2.5mm', zIndex: 10, background: 'rgba(255,255,255,0.05)', border: '0.35mm solid rgba(252,165,165,0.2)', borderRadius: '2.5mm', padding: '1.4mm 2mm' }}>
        <DataRows nis={p.nis} nisn={p.nisn} cardId={p.cardId} labelColor="#fca5a5" valueColor="#fff1f2" dividerColor="rgba(252,165,165,0.1)" />
      </div>
      {/* Bottom silver + red */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10 }}>
        <div style={{ height: '0.5mm', background: 'linear-gradient(90deg, #7f1d1d, #fca5a5 30%, #ffffff 50%, #fca5a5 70%, #7f1d1d)' }} />
        <div style={{ height: '6mm', background: 'linear-gradient(135deg, #1a0008 0%, #3b0012 50%, #7f1d1d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '1.2mm', fontWeight: 900, color: 'rgba(252,165,165,0.8)', letterSpacing: '0.2em', textTransform: 'uppercase' as const }}>{p.schoolName}</span>
        </div>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

function T6Back(p: RenderProps) {
  return (
    <div id={p.backId} style={p.cs}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(150deg, #1a0008 0%, #7f1d1d 50%, #1a0008 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 40%, rgba(220,38,38,0.1) 0%, transparent 60%)' }} />
      <svg width="100%" height="100%" viewBox="0 0 204 324" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <defs><pattern id="t6bd" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="0.4" fill="rgba(255,255,255,0.05)"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#t6bd)" />
        <circle cx="102" cy="148" r="50" fill="none" stroke="rgba(252,165,165,0.08)" strokeWidth="0.6" strokeDasharray="5 4" />
        <circle cx="102" cy="148" r="66" fill="none" stroke="rgba(220,38,38,0.06)" strokeWidth="0.5" />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
        <div style={{ height: '1.5mm', background: 'linear-gradient(90deg, #7f1d1d, #fca5a5 30%, #ffffff 50%, #fca5a5 70%, #7f1d1d)' }} />
        <div style={{ height: '9.5mm', background: 'linear-gradient(135deg, #1a0008 0%, #3b0012 100%)', display: 'flex', alignItems: 'center', padding: '0 2.5mm', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2mm' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.logo} alt="" style={{ width: '5mm', height: '5mm', objectFit: 'contain', filter: 'brightness(2)' }} />
            <span style={{ fontSize: '1.6mm', fontWeight: 900, color: '#fff1f2', letterSpacing: '0.06em' }}>PRESENSI RESMI</span>
          </div>
          <span style={{ fontSize: '1.2mm', fontWeight: 800, color: '#fca5a5' }}>{p.cardId}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: '13mm', left: 0, right: 0, zIndex: 10, display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
        <div style={{ fontSize: '1.5mm', fontWeight: 900, color: '#fca5a5', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1mm' }}>— SCAN UNTUK PRESENSI —</div>
        <QrDisplay qrDataUrl={p.qrDataUrl} size="26mm" borderColor="rgba(252,165,165,0.7)" bgColor="#fff1f2" />
        <div style={{ marginTop: '1.2mm', fontSize: '1.45mm', color: '#fca5a5', fontWeight: 700 }}>Token: <strong style={{ color: '#fff1f2' }}>{p.qrToken || '—'}</strong></div>
      </div>
      <RulesBox schoolName={p.schoolName} labelColor="#fca5a5" textColor="#fecdd3" dividerColor="rgba(252,165,165,0.1)" bgColor="rgba(255,255,255,0.04)" borderColor="rgba(252,165,165,0.18)" />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '6.5mm', zIndex: 10 }}>
        <div style={{ height: '0.5mm', background: 'linear-gradient(90deg, #7f1d1d, #fca5a5 30%, #ffffff 50%, #fca5a5 70%, #7f1d1d)' }} />
        <div style={{ height: '6mm', background: 'linear-gradient(135deg, #1a0008 0%, #3b0012 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2.5mm' }}>
          <span style={{ fontSize: '1.15mm', fontWeight: 900, color: 'rgba(252,165,165,0.7)' }}>SmartSiswa System</span>
          <span style={{ fontSize: '1.0mm', fontWeight: 800, color: 'rgba(252,165,165,0.5)' }}>ISO/IEC 7810 ID-1</span>
        </div>
      </div>
      {p.watermark && <WatermarkOverlay />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════════
function StudentCardPreviewComponent({
  schoolName = 'SDN KALISALAK 01',
  studentName = "MUHAMMAD RAGIL MI'ROJI",
  nis = '4643',
  nisn = '0144151480',
  classNameStr = 'Kelas 6',
  photoUrl,
  logoUrl,
  sloganLine1 = 'BERILMU',
  sloganLine2 = 'BERAKHLAK',
  sloganLine3 = 'BERPRESTASI',
  cardId = 'KLS01-2026-001225',
  qrToken = 'STU-B7A66EDE',
  primaryColor: _primaryColor,
  secondaryColor: _secondaryColor,
  templateId = 'sapphire-navy',
  side = 'both',
  scale = 1,
  idPrefix,
  isPrint = false,
  watermark = false,
}: StudentCardPreviewProps) {
  const photoWidth = isPrint ? 600 : 300;
  const logoWidth = isPrint ? 400 : 200;
  const actualLogo = optimizeCloudinaryUrl(logoUrl || CLOUDINARY_DEFAULT_LOGO, logoWidth);
  const actualPhoto = optimizeCloudinaryUrl(photoUrl || CLOUDINARY_DEFAULT_AVATAR, photoWidth);
  const tokenPayload = qrToken || 'STU-B7A66EDE';
  const [qrDataUrl, setQrDataUrl] = useState<string>(() => qrDataUrlCache.get(tokenPayload) || '');
  const frontId = idPrefix ? `${idPrefix}-front` : `card-${cardId}-front`;
  const backId = idPrefix ? `${idPrefix}-back` : `card-${cardId}-back`;

  useEffect(() => {
    if (qrDataUrlCache.has(tokenPayload)) { setQrDataUrl(qrDataUrlCache.get(tokenPayload)!); return; }
    QRCode.toDataURL(tokenPayload, { width: 400, margin: 1, color: { dark: '#0a1628', light: '#ffffff' }, errorCorrectionLevel: 'M' })
      .then((url) => { qrDataUrlCache.set(tokenPayload, url); setQrDataUrl(url); })
      .catch(console.error);
  }, [tokenPayload]);

  const cs: React.CSSProperties = {
    width: '53.98mm', height: '85.60mm', minWidth: '53.98mm', maxWidth: '53.98mm',
    minHeight: '85.60mm', maxHeight: '85.60mm', borderRadius: '4.2mm',
    overflow: 'hidden', position: 'relative', boxSizing: 'border-box',
    boxShadow: isPrint ? 'none' : '0 20px 48px -8px rgba(0,0,0,0.38), 0 6px 16px rgba(0,0,0,0.12)',
    border: isPrint ? '0.25mm solid #cbd5e1' : 'none',
    backgroundColor: '#0a1628',
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: 'top left', pageBreakInside: 'avoid', userSelect: 'none',
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  };

  const rp: RenderProps = { frontId, backId, cs, logo: actualLogo, schoolName, studentName, nis, nisn, classNameStr, photoUrl: actualPhoto, cardId, qrToken, qrDataUrl, sl1: sloganLine1, sl2: sloganLine2, sl3: sloganLine3, watermark };

  const tMap: Record<string, { front: React.ReactElement; back: React.ReactElement }> = {
    'sapphire-navy':  { front: <T1Front {...rp} />, back: <T1Back {...rp} /> },
    'emerald-cosmic': { front: <T2Front {...rp} />, back: <T2Back {...rp} /> },
    'rose-gold':      { front: <T3Front {...rp} />, back: <T3Back {...rp} /> },
    'cyber-titanium': { front: <T4Front {...rp} />, back: <T4Back {...rp} /> },
    'aurora-purple':  { front: <T5Front {...rp} />, back: <T5Back {...rp} /> },
    'crimson-royal':  { front: <T6Front {...rp} />, back: <T6Back {...rp} /> },
  };

  const tpl = tMap[templateId] || tMap['sapphire-navy'];
  if (side === 'front') return tpl.front;
  if (side === 'back') return tpl.back;

  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0a1628', marginBottom: '0.4rem', textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase' }}>✦ SISI DEPAN</div>
        {tpl.front}
      </div>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0a1628', marginBottom: '0.4rem', textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase' }}>✦ SISI BELAKANG</div>
        {tpl.back}
      </div>
    </div>
  );
}

const StudentCardPreview = memo(StudentCardPreviewComponent);
export default StudentCardPreview;

