/**
 * SmartSiswa - Automated 15-Day Google Drive Backup Worker
 * 
 * Skrip ini memeriksa apakah sudah 15 hari sejak pencadangan terakhir.
 * Jika ya, skrip akan mengekspor database dev.db dan snapshot JSON,
 * lalu mengunggahnya langsung ke folder Google Drive: 10LHCaLApULlK6wdQ7kZ7MYd7PX7eAQ-u
 */

const http = require('http');

async function runAutoBackup() {
  console.log('[AUTO-BACKUP] Memulai pengecekan siklus backup 15 hari Google Drive...');

  try {
    const cronSecret = process.env.CRON_SECRET || 'smartsiswa-cron-secret-backup-key-2026';
    const res = await fetch('http://localhost:3000/api/developer/backup/drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({
        force: false, // Hanya backup jika interval 15 hari sudah tercapai
        format: 'json',
      }),
    });


    const data = await res.json();
    if (data.skipped) {
      console.log(`[AUTO-BACKUP] Info: ${data.message}`);
    } else if (data.success) {
      console.log(`[AUTO-BACKUP] SUKSES: ${data.message}`);
    } else {
      console.error(`[AUTO-BACKUP] Gagal:`, data.error);
    }
  } catch (err) {
    console.error(`[AUTO-BACKUP] Error menghubungi server website:`, err.message);
  }
}

// Jalankan saat script dipanggil
runAutoBackup();
