'use client';

import React, { useEffect, useState, Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import { SessionUser } from '@/lib/auth';
import StudentCardPreview, { CardTemplateId, CARD_TEMPLATES } from '@/components/StudentCardPreview';
import { 
  Printer, 
  Download, 
  Layers, 
  ShieldCheck, 
  CheckCircle2, 
  Sliders, 
  FileDown, 
  RefreshCw,
  FileCheck,
  ChevronRight,
  AlertTriangle,
  ArrowLeft,
  Scissors
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { downloadA4SheetAsPdf } from '@/lib/pdfGenerator';
import { useNotification } from '@/context/NotificationContext';

function CuttingGuideOverlay({
  style = 'dashed',
}: {
  style?: 'dashed' | 'solid' | 'cropmarks';
}) {
  const showBorder = style !== 'cropmarks';
  const borderCss = style === 'solid' ? '1px solid #475569' : '1px dashed #64748b';

  return (
    <div
      className="card-cutting-guide"
      style={{
        position: 'absolute',
        inset: 0,
        width: '53.98mm',
        height: '85.60mm',
        pointerEvents: 'none',
        zIndex: 30,
        boxSizing: 'border-box',
      }}
    >
      {/* Outer Rectangle Cutting Guide Border */}
      {showBorder && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: borderCss,
            borderRadius: '4.2mm',
            boxSizing: 'border-box',
          }}
        />
      )}

      {/* 4 Corner Crop Marks (L-shapes extending outward for ruler / cutter alignment) */}
      <div
        style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          width: '9px',
          height: '9px',
          borderTop: '2px solid #0f172a',
          borderLeft: '2px solid #0f172a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '9px',
          height: '9px',
          borderTop: '2px solid #0f172a',
          borderRight: '2px solid #0f172a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-4px',
          left: '-4px',
          width: '9px',
          height: '9px',
          borderBottom: '2px solid #0f172a',
          borderLeft: '2px solid #0f172a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-4px',
          right: '-4px',
          width: '9px',
          height: '9px',
          borderBottom: '2px solid #0f172a',
          borderRight: '2px solid #0f172a',
        }}
      />

      {/* Center Axis Alignment Guides for Scissors / Guillotine Cutter */}
      <div
        style={{
          position: 'absolute',
          top: '-5px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1px',
          height: '5px',
          background: '#0f172a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-5px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '1px',
          height: '5px',
          background: '#0f172a',
        }}
      />

      {/* Scissor icon at top edge */}
      <span
        style={{
          position: 'absolute',
          top: '-11px',
          right: '8px',
          fontSize: '10px',
          lineHeight: 1,
          color: '#334155',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '0 2px',
          fontWeight: 800,
          userSelect: 'none',
        }}
      >
        ✂
      </span>
    </div>
  );
}

interface CardItem {
  id: string;
  cardId: string;
  status: string;
  student: {
    fullName: string;
    nis: string;
    nisn?: string | null;
    photoUrl?: string | null;
    classRoom: { name: string };
    school: { name: string; logo?: string | null };
  };
  qrToken?: { token: string; isActive: boolean } | null;
}

interface PrintRequestInfo {
  id: string;
  requestNumber: string;
  status: string;
  schoolName: string;
  schoolId: string;
  totalCards?: number;
  notes?: string | null;
  createdAt: string;
}

function DeveloperPrintProductionContent() {
  const { toast } = useNotification();
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlRequestId = searchParams.get('requestId') || searchParams.get('printRequestId');
  const schoolId = searchParams.get('schoolId');

  const [user, setUser] = useState<SessionUser | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [currentRequest, setCurrentRequest] = useState<PrintRequestInfo | null>(null);
  const [availableRequests, setAvailableRequests] = useState<PrintRequestInfo[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string>(urlRequestId || '');
  const [templateId, setTemplateId] = useState<CardTemplateId>('cyber-titanium');
  const [schoolLogo, setSchoolLogo] = useState<string>('/logo.svg');
  const [showCutGuides, setShowCutGuides] = useState(true);
  const [cutGuideStyle, setCutGuideStyle] = useState<'dashed' | 'solid' | 'cropmarks'>('dashed');

  const [loading, setLoading] = useState(true);
  const [sideMode, setSideMode] = useState<'front' | 'back' | 'both'>('front');
  const [markingDone, setMarkingDone] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sheetViewMode, setSheetViewMode] = useState<'single' | 'all'>('single');
  const [currentSheet, setCurrentSheet] = useState(1);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const loadProductionData = async (targetReqId?: string) => {
    try {
      setLoading(true);
      const reqIdToUse = targetReqId !== undefined ? targetReqId : (selectedRequestId || urlRequestId || '');
      const params = new URLSearchParams();
      if (reqIdToUse) params.append('requestId', reqIdToUse);
      if (schoolId) params.append('schoolId', schoolId);

      const res = await fetch(`/api/developer/production?${params.toString()}`);
      const data = await res.json();

      if (data.cards) {
        setCards(data.cards);
      } else {
        setCards([]);
      }

      if (data.template?.templateId) {
        setTemplateId(data.template.templateId as CardTemplateId);
      }

      if (data.schoolLogo) {
        setSchoolLogo(data.schoolLogo);
      }

      if (data.currentRequest) {
        setCurrentRequest(data.currentRequest);
        if (!selectedRequestId && data.currentRequest.id) {
          setSelectedRequestId(data.currentRequest.id);
        }
      } else {
        setCurrentRequest(null);
      }

      if (data.availableRequests) {
        setAvailableRequests(data.availableRequests);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal Memuat Data', 'Tidak dapat mengambil data produksi cetak.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProductionData(selectedRequestId);
    }
  }, [user, selectedRequestId, schoolId]);

  const handleSelectRequestChange = (newReqId: string) => {
    setSelectedRequestId(newReqId);
    setCurrentSheet(1);
    // Update URL query string without reloading
    const newParams = new URLSearchParams(window.location.search);
    if (newReqId) {
      newParams.set('requestId', newReqId);
    } else {
      newParams.delete('requestId');
    }
    router.replace(`/developer/print-production?${newParams.toString()}`);
  };

  const handleDownloadPdf = async () => {
    if (downloadingPdf || cards.length === 0) return;
    setDownloadingPdf(true);
    try {
      setSheetViewMode('all');
      await new Promise((resolve) => setTimeout(resolve, 300));
      const modeSuffix = sideMode === 'front' ? 'Depan' : sideMode === 'back' ? 'Belakang_QR' : 'Lengkap';
      const reqLabel = currentRequest ? currentRequest.requestNumber : 'Semua';
      const filename = `Produksi_A4_${reqLabel}_${modeSuffix}.pdf`;
      await downloadA4SheetAsPdf('production-a4-container', filename);
      toast.success('Download Berhasil', `File PDF ${filename} siap dicetak.`);
    } catch (err: any) {
      toast.error('Gagal Membuat PDF', err.message || 'Terjadi kesalahan saat memproses file PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    setSheetViewMode('all');
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const handleMarkPrinted = async () => {
    if (cards.length === 0) return;
    setMarkingDone(true);
    try {
      for (const card of cards) {
        await fetch('/api/developer/cards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: card.id, status: 'DICETAK' }),
        });
      }
      toast.success('Status Berhasil Disimpan', `Seluruh ${cards.length} kartu pengajuan ini berhasil ditandai sebagai DICETAK.`);
      loadProductionData(selectedRequestId);
    } catch (e: any) {
      toast.error('Gagal Menyimpan Status', e.message);
    } finally {
      setMarkingDone(false);
    }
  };

  if (!user) return null;

  // Pagination chunking for A4 Landscape:
  // - Mode 'both': 5 students per A4 Landscape sheet (Row 1: 5 Front, Row 2: 5 Back = 10 cards)
  // - Mode 'front' / 'back': 10 students per A4 Landscape sheet (Row 1: 5 cards, Row 2: 5 cards = 10 cards)
  const chunkSize = sideMode === 'both' ? 5 : 10;
  const pages: CardItem[][] = [];
  for (let i = 0; i < cards.length; i += chunkSize) {
    pages.push(cards.slice(i, i + chunkSize));
  }

  const displayedPages = sheetViewMode === 'single' ? pages.slice(currentSheet - 1, currentSheet) : pages;

  return (
    <AppLayout user={user}>
      {/* Control Toolbar (Hidden in Print) */}
      <div className="no-print" style={{ marginBottom: '1.25rem' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Link href="/developer/print-requests" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                <ArrowLeft size={14} />
                <span>Kembali ke Permintaan Cetak</span>
              </Link>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Lembar Kerja Produksi Cetak Kartu (A4 Landscape)
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Mencetak hanya kartu siswa dari <strong>permohonan cetak yang telah diverifikasi</strong> (tanpa kebocoran data siswa yang belum diajukan).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrint}
              disabled={cards.length === 0}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
            >
              <Printer size={16} />
              <span>Cetak Sekarang (Ctrl+P)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || cards.length === 0}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem' }}
            >
              <FileDown size={16} />
              <span>{downloadingPdf ? 'Menyiapkan PDF...' : 'Download PDF Lembar A4'}</span>
            </button>

            <button
              onClick={handleMarkPrinted}
              disabled={markingDone || cards.length === 0}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', color: '#16a34a' }}
            >
              <CheckCircle2 size={16} />
              <span>{markingDone ? 'Menyimpan...' : 'Tandai Selesai Cetak'}</span>
            </button>
          </div>
        </div>

        {/* Print Request Scope & Selector Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
            border: '1.5px solid #86efac',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            marginBottom: '1rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Target Pengajuan Cetak:
                </span>
                {currentRequest ? (
                  <>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                      {currentRequest.requestNumber}
                    </span>
                    <span className="badge badge-info">{currentRequest.status}</span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tidak Ada Pengajuan Terpilih</span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                Sekolah: <strong>{currentRequest ? currentRequest.schoolName : '-'}</strong> • Jumlah Siswa yang Diajukan:{' '}
                <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>{cards.length} Siswa</strong>
              </div>
            </div>

            {/* Switcher if multiple requests are available */}
            {availableRequests.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Ganti Pengajuan:
                </label>
                <select
                  value={selectedRequestId}
                  onChange={(e) => handleSelectRequestChange(e.target.value)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    background: 'white',
                    color: 'var(--text-primary)',
                  }}
                >
                  {availableRequests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.requestNumber} - {r.schoolName} ({r.totalCards} Siswa • {r.status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Spec Information Alert */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            color: '#1e40af',
          }}
        >
          <ShieldCheck size={18} flex-shrink="0" />
          <div>
            <strong>Spesifikasi Produksi Developer:</strong> Ukuran lembar: <strong>A4 Landscape (297 × 210 mm)</strong> • Margin: <strong>1 cm (10 mm) di seluruh sisi</strong>. Tata letak: <strong>Baris Atas: Sisi Depan</strong>, <strong>Baris Bawah: Sisi Belakang</strong>. Lembar bebas dari header/footer cetak untuk memudahkan pemotongan die-cutter PVC.
          </div>
        </div>

        {/* Sheet Controls */}
        <div className="card" style={{ padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Pilihan Tampilan:
            </span>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setSideMode('both')}
                className={`btn btn-sm ${sideMode === 'both' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.775rem' }}
              >
                Atas Depan - Bawah Belakang
              </button>
              <button
                type="button"
                onClick={() => setSideMode('front')}
                className={`btn btn-sm ${sideMode === 'front' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.775rem' }}
              >
                Lembar Depan
              </button>
              <button
                type="button"
                onClick={() => setSideMode('back')}
                className={`btn btn-sm ${sideMode === 'back' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.775rem' }}
              >
                Lembar Belakang
              </button>
            </div>

            {/* Sheet View Switcher */}
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setSheetViewMode(sheetViewMode === 'single' ? 'all' : 'single')}
                className={`btn btn-sm ${sheetViewMode === 'single' ? 'btn-success' : 'btn-secondary'}`}
                title="Beralih antara mode 1 lembar ringan (sangat cepat) atau semua lembar"
                style={{ fontSize: '0.775rem' }}
              >
                {sheetViewMode === 'single' ? '⚡ Mode Cepat (1 Lembar)' : '📋 Tampilkan Semua Lembar'}
              </button>

              {sheetViewMode === 'single' && pages.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentSheet((s) => Math.max(1, s - 1))}
                    disabled={currentSheet === 1}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', padding: '0 0.3rem' }}>
                    Lembar {currentSheet} / {pages.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentSheet((s) => Math.min(pages.length, s + 1))}
                    disabled={currentSheet === pages.length}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    ▶
                  </button>
                </div>
              )}
              {/* Template Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Template:
                </span>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value as CardTemplateId)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    background: 'white',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  {CARD_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cutting Guide Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '0.75rem' }}>
                <Scissors size={14} color={showCutGuides ? 'var(--primary)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Garis Potong:
                </span>
                <button
                  type="button"
                  onClick={() => setShowCutGuides(!showCutGuides)}
                  className={`btn btn-sm ${showCutGuides ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                >
                  {showCutGuides ? 'Aktif' : 'Nonaktif'}
                </button>
                {showCutGuides && (
                  <select
                    value={cutGuideStyle}
                    onChange={(e) => setCutGuideStyle(e.target.value as any)}
                    style={{
                      padding: '0.28rem 0.5rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: 'white',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="dashed">Garis Putus-putus + Sudut (Standar)</option>
                    <option value="solid">Garis Lurus Tipis</option>
                    <option value="cropmarks">Hanya Tanda Sudut (Crop Marks)</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Total Kartu: <strong style={{ color: 'var(--primary)' }}>{cards.length} siswa</strong> • Halaman: <strong style={{ color: 'var(--primary)' }}>{pages.length} lembar A4 Landscape</strong>
          </div>
        </div>
      </div>

      {/* Production Sheet Container */}
      <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto', padding: '1rem 0' }}>
        <div
          id="production-a4-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2.5rem',
          }}
        >
          {loading ? (
            <div className="card" style={{ width: '297mm', padding: '100px 0', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={20} className="animate-spin" />
                <span>Memuat lembar kerja produksi cetak...</span>
              </div>
            </div>
          ) : cards.length === 0 ? (
            <div className="card" style={{ width: '297mm', padding: '80px 20px', textAlign: 'center', color: '#64748b' }}>
              <AlertTriangle size={36} color="#f59e0b" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                Tidak Ada Kartu yang Siap Dicetak
              </div>
              <p style={{ fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 1.25rem', color: '#64748b' }}>
                Hanya kartu siswa dari permohonan cetak yang <strong>telah diverifikasi dan disetujui</strong> yang akan tampil di halaman ini. Kartu yang belum diajukan tidak akan bocor ke sini.
              </p>
              <Link href="/developer/print-requests" className="btn btn-primary" style={{ display: 'inline-flex', gap: '0.4rem' }}>
                <FileCheck size={16} />
                <span>Buka Menu Permintaan Cetak Masuk</span>
              </Link>
            </div>
          ) : (
            displayedPages.map((pageCards, renderIdx) => {
              const actualPageIndex = sheetViewMode === 'single' ? currentSheet - 1 : renderIdx;
              return (
                <div
                  key={actualPageIndex}
                  className="a4-sheet-page"
                  style={{
                    width: '297mm',
                    height: '210mm',
                    minWidth: '297mm',
                    maxWidth: '297mm',
                    minHeight: '210mm',
                    maxHeight: '210mm',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 10px 35px rgba(0, 0, 0, 0.12)',
                    padding: '10mm', // Margin tepat 1 cm pada semua sisi (atas, bawah, kanan, kiri)
                    boxSizing: 'border-box',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Mode 'both': Row 1 = 5 Front, Row 2 = 5 Back */}
                  {sideMode === 'both' && (
                    <>
                      {/* Baris 1: Sisi Depan (5 Kartu) */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 53.98mm)',
                          columnGap: '2.5mm',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '85.6mm',
                        }}
                      >
                        {pageCards.map((card, idx) => (
                          <div
                            key={`front-${card.id}-${idx}`}
                            style={{
                              width: '53.98mm',
                              height: '85.6mm',
                              position: 'relative',
                              boxSizing: 'border-box',
                            }}
                          >
                            {showCutGuides && <CuttingGuideOverlay style={cutGuideStyle} />}
                            <StudentCardPreview
                              schoolName={card.student.school.name}
                              studentName={card.student.fullName}
                              nis={card.student.nis}
                              nisn={card.student.nisn}
                              classNameStr={card.student.classRoom.name}
                              photoUrl={card.student.photoUrl}
                              logoUrl={card.student.school?.logo || schoolLogo || '/logo.svg'}
                              cardId={card.cardId}
                              qrToken={card.qrToken?.token}
                              templateId={templateId}
                              side="front"
                              idPrefix={`prod-front-${card.id}`}
                              isPrint={true}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Baris 2: Sisi Belakang (5 Kartu dengan QR Token) */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 53.98mm)',
                          columnGap: '2.5mm',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '85.6mm',
                        }}
                      >
                        {pageCards.map((card, idx) => (
                          <div
                            key={`back-${card.id}-${idx}`}
                            style={{
                              width: '53.98mm',
                              height: '85.6mm',
                              position: 'relative',
                              boxSizing: 'border-box',
                            }}
                          >
                            {showCutGuides && <CuttingGuideOverlay style={cutGuideStyle} />}
                            <StudentCardPreview
                              schoolName={card.student.school.name}
                              studentName={card.student.fullName}
                              nis={card.student.nis}
                              nisn={card.student.nisn}
                              classNameStr={card.student.classRoom.name}
                              photoUrl={card.student.photoUrl}
                              logoUrl={card.student.school?.logo || schoolLogo || '/logo.svg'}
                              cardId={card.cardId}
                              qrToken={card.qrToken?.token}
                              templateId={templateId}
                              side="back"
                              idPrefix={`prod-back-${card.id}`}
                              isPrint={true}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Mode 'front' only: 10 Front Cards per sheet (2 baris x 5 kolom) */}
                  {sideMode === 'front' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 53.98mm)',
                        gridTemplateRows: 'repeat(2, 85.6mm)',
                        columnGap: '2.5mm',
                        rowGap: '6mm',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {pageCards.map((card, idx) => (
                        <div
                          key={`front-only-${card.id}-${idx}`}
                          style={{
                            width: '53.98mm',
                            height: '85.6mm',
                            position: 'relative',
                            boxSizing: 'border-box',
                          }}
                        >
                          {showCutGuides && <CuttingGuideOverlay style={cutGuideStyle} />}
                          <StudentCardPreview
                            schoolName={card.student.school.name}
                            studentName={card.student.fullName}
                            nis={card.student.nis}
                            nisn={card.student.nisn}
                            classNameStr={card.student.classRoom.name}
                            photoUrl={card.student.photoUrl}
                            logoUrl={card.student.school?.logo || schoolLogo || '/logo.svg'}
                            cardId={card.cardId}
                            qrToken={card.qrToken?.token}
                            templateId={templateId}
                            side="front"
                            idPrefix={`prod-front-${card.id}`}
                            isPrint={true}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Mode 'back' only: 10 Back Cards per sheet (2 baris x 5 kolom) */}
                  {sideMode === 'back' && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 53.98mm)',
                        gridTemplateRows: 'repeat(2, 85.6mm)',
                        columnGap: '2.5mm',
                        rowGap: '6mm',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {pageCards.map((card, idx) => (
                        <div
                          key={`back-only-${card.id}-${idx}`}
                          style={{
                            width: '53.98mm',
                            height: '85.6mm',
                            position: 'relative',
                            boxSizing: 'border-box',
                          }}
                        >
                          {showCutGuides && <CuttingGuideOverlay style={cutGuideStyle} />}
                          <StudentCardPreview
                            schoolName={card.student.school.name}
                            studentName={card.student.fullName}
                            nis={card.student.nis}
                            nisn={card.student.nisn}
                            classNameStr={card.student.classRoom.name}
                            photoUrl={card.student.photoUrl}
                            logoUrl={card.student.school?.logo || schoolLogo || '/logo.svg'}
                            cardId={card.cardId}
                            qrToken={card.qrToken?.token}
                            templateId={templateId}
                            side="back"
                            idPrefix={`prod-back-${card.id}`}
                            isPrint={true}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function DeveloperPrintProductionPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Memuat sistem produksi kartu...
        </div>
      }
    >
      <DeveloperPrintProductionContent />
    </Suspense>
  );
}
