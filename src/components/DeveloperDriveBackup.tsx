'use client';

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  RefreshCw,
  Send,
  Calendar,
  FolderLock,
  ChevronDown,
  ChevronUp,
  FileCode,
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var folderId = "10LHCaLApULlK6wdQ7kZ7MYd7PX7eAQ-u";
    var folder = DriveApp.getFolderById(folderId);
    
    var data = JSON.parse(e.postData.contents);
    var fileName = data.fileName || ("backup-smartsiswa-" + Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd_HH-mm") + ".json");
    var mimeType = data.mimeType || "application/json";
    
    var blob;
    if (data.isBase64) {
      var decodedBytes = Utilities.base64Decode(data.fileContent);
      blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
    } else {
      blob = Utilities.newBlob(typeof data.fileContent === 'string' ? data.fileContent : JSON.stringify(data.fileContent, null, 2), mimeType, fileName);
    }
    
    var file = folder.createFile(blob);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      sizeBytes: file.getSize(),
      uploadedAt: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function DeveloperDriveBackup() {
  const { toast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [driveData, setDriveData] = useState<any>(null);
  const [webhookInput, setWebhookInput] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptGuide, setShowScriptGuide] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/developer/backup/drive');
      const data = await res.json();
      if (res.ok) {
        setDriveData(data);
      }
    } catch (e) {
      console.error('Failed to load Drive backup status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookInput.trim()) return;

    setSavingWebhook(true);
    try {
      const res = await fetch('/api/developer/backup/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrlOverride: webhookInput.trim(),
          force: false,
        }),
      });

      const data = await res.json();
      if (res.ok || data.skipped) {
        toast.success('Tersimpan', 'URL Webhook Google Apps Script berhasil disimpan.');
        setWebhookInput('');
        loadStatus();
      } else {
        throw new Error(data.error || 'Gagal menyimpan webhook');
      }
    } catch (err: any) {
      toast.error('Gagal', err.message);
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTriggerBackup = async (format: 'sqlite' | 'json') => {
    setBackingUp(true);
    try {
      const res = await fetch('/api/developer/backup/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          force: true, // Developer manual test
          format,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah cadangan ke Google Drive.');
      }

      toast.success('Backup Berhasil!', data.message);
      loadStatus();
    } catch (err: any) {
      toast.error('Gagal Backup ke Drive', err.message);
    } finally {
      setBackingUp(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    toast.success('Tersalin!', 'Kode Google Apps Script berhasil disalin ke clipboard.');
    setTimeout(() => setCopiedScript(false), 3000);
  };

  return (
    <div
      className="card"
      style={{
        marginBottom: '1.5rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #eff6ff 100%)',
        border: '1.5px solid #bbf7d0',
        boxShadow: '0 6px 24px rgba(22, 101, 52, 0.06)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
            }}
          >
            <Cloud size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Backup Otomatis Google Drive (Siklus 15 Hari)</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#15803d' }}>
                AKTIF TERJADWAL
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
              Pencadangan berkas database sistem secara otomatis setiap 15 hari ke folder Google Drive Anda.
            </div>
          </div>
        </div>

        {/* Link to target Google Drive Folder */}
        <a
          href="https://drive.google.com/drive/folders/10LHCaLApULlK6wdQ7kZ7MYd7PX7eAQ-u?usp=sharing"
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#ffffff',
            borderColor: '#bbf7d0',
            color: '#15803d',
            fontWeight: 700,
          }}
        >
          <FolderLock size={15} color="#15803d" />
          <span>Buka Folder Google Drive</span>
          <ExternalLink size={13} />
        </a>
      </div>

      {/* Info Status Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ backgroundColor: '#ffffff', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Target Folder ID</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a', wordBreak: 'break-all' }}>
            10LHCaLApULlK6wdQ7kZ7MYd7PX7eAQ-u
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Pencadangan Terakhir</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
            {driveData?.lastBackupDate ? new Date(driveData.lastBackupDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Belum Pernah'}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Jadwal Otomatis Berikutnya</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={14} />
            <span>
              {driveData?.nextBackupDate
                ? `${new Date(driveData.nextBackupDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} (${driveData.daysRemaining} hari lagi)`
                : '15 hari sejak backup pertama'}
            </span>
          </div>
        </div>
      </div>

      {/* Webhook Configuration or Guide */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '1.25rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
              Status Webhook Google Apps Script: {driveData?.hasWebhook ? (
                <span style={{ color: '#15803d', fontWeight: 700 }}>● Terhubung</span>
              ) : (
                <span style={{ color: '#d97706', fontWeight: 700 }}>● Perlu Konfigurasi URL</span>
              )}
            </div>
            {driveData?.maskedWebhook && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                URL: {driveData.maskedWebhook}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowScriptGuide(!showScriptGuide)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FileCode size={14} color="#2563eb" />
            <span>{showScriptGuide ? 'Sembunyikan Panduan' : 'Lihat Skrip & Panduan Setup (1 Menit)'}</span>
            {showScriptGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Collapsible Script Setup Instructions */}
        {showScriptGuide && (
          <div
            style={{
              marginTop: '0.75rem',
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              Cara Menghubungkan Google Drive Folder (Hanya 3 Langkah Mudah):
            </div>
            <ol style={{ paddingLeft: '1.25rem', margin: '0 0 0.85rem 0', lineHeight: '1.6', color: '#334155' }}>
              <li>
                Buka <strong>Google Drive Anda</strong> (atau langsung ke <a href="https://script.google.com" target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>script.google.com</a>) &rarr; Klik <strong>Proyek Baru (*New Project*)</strong>.
              </li>
              <li>
                Hapus teks default, lalu <strong>Tempel / Paste kode skrip di bawah ini</strong>.
              </li>
              <li>
                Klik tombol biru <strong>Deploy &rarr; New Deployment (Penerapan Baru)</strong> &rarr; Pilih jenis <strong>Web App (Aplikasi Web)</strong> &rarr; Set <i>&quot;Who has access&quot;</i> ke <strong>Anyone (Siapa saja)</strong> &rarr; Klik <strong>Deploy</strong> &rarr; Salin URL Web App yang dihasilkan dan tempelkan pada kolom di bawah.
              </li>
            </ol>

            <div style={{ position: 'relative' }}>
              <pre
                style={{
                  backgroundColor: '#0f172a',
                  color: '#38bdf8',
                  padding: '1rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  maxHeight: '180px',
                  fontFamily: 'monospace',
                }}
              >
                {APPS_SCRIPT_TEMPLATE}
              </pre>

              <button
                type="button"
                onClick={copyScript}
                className="btn btn-sm"
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: copiedScript ? '#16a34a' : '#334155',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.72rem',
                }}
              >
                {copiedScript ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedScript ? 'Tersalin!' : 'Salin Kode Skrip'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Form update Webhook URL */}
        <form onSubmit={handleSaveWebhook} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="url"
            placeholder="Tempel URL Web App Google Apps Script di sini (https://script.google.com/macros/s/.../exec)"
            value={webhookInput}
            onChange={(e) => setWebhookInput(e.target.value)}
            style={{
              flex: 1,
              minWidth: '260px',
              padding: '0.6rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.85rem',
            }}
          />
          <button
            type="submit"
            disabled={savingWebhook || !webhookInput.trim()}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 700 }}
          >
            {savingWebhook ? 'Menyimpan...' : 'Simpan URL Webhook'}
          </button>
        </form>
      </div>

      {/* Manual Test Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
          Sistem otomatis memeriksa interval 15 hari. Anda juga dapat menguji pengunggahan manual sewaktu-waktu:
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            disabled={backingUp || !driveData?.hasWebhook}
            onClick={() => handleTriggerBackup('json')}
            className="btn btn-primary btn-sm"
            style={{
              backgroundColor: '#15803d',
              borderColor: '#15803d',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {backingUp ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            <span>{backingUp ? 'Mengunggah ke Drive...' : 'Uji Cadangkan Database ke Drive (JSON Snapshot)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
