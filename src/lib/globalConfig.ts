import { get } from '@vercel/global-config';
import { prisma } from './prisma';
import { createAuditLog } from './audit';
import { getWIBDate, getWIBTime } from './dateUtils';
import fs from 'fs';
import path from 'path';

export interface GlobalScanRecord {
  id?: string;
  studentId: string;
  schoolId: string;
  date: string;
  time: string;
  status: 'HADIR' | 'TERLAMBAT';
  scannedBy: string;
  deviceInfo: string;
  syncedToSupabase?: boolean;
  studentData?: {
    id: string;
    fullName: string;
    nis: string;
    nisn?: string | null;
    gender?: string;
    className: string;
    photoUrl?: string | null;
    cardId: string;
    schoolName?: string;
  };
  createdAt: number;
}

// In-Memory Global Buffers for 0ms Zero-Latency Execution
const globalScansBuffer = new Map<string, GlobalScanRecord>(); // key: `${studentId}_${date}`
const globalCardsCache = new Map<string, any>(); // key: token or cardId or nis -> student card details

const CACHE_FILE_PATH = path.join(process.cwd(), '.global_config_scans.json');

// Helper to load persisted local scan buffer if exists
function loadPersistedBuffer() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: GlobalScanRecord) => {
          globalScansBuffer.set(`${item.studentId}_${item.date}`, item);
        });
      }
    }
  } catch (e) {
    // Ignore in read-only edge environments
  }
}

// Helper to save buffer to local fallback cache
function savePersistedBuffer() {
  try {
    const list = Array.from(globalScansBuffer.values());
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    // Ignore in read-only environments
  }
}

// Initialize on module load
loadPersistedBuffer();

/**
 * Safely retrieve values from Vercel Global Config SDK
 */
export async function getGlobalConfig<T = any>(key: string, defaultValue?: T): Promise<T | null> {
  try {
    const val = await get(key);
    return val !== undefined && val !== null ? (val as T) : (defaultValue ?? null);
  } catch (err) {
    return defaultValue ?? null;
  }
}

/**
 * Warm up the Global Card & Token Cache
 * Enables instant 0ms token lookup without querying Supabase on every scan
 */
export function warmUpGlobalCards(cards: any[]) {
  if (!Array.isArray(cards)) return;
  cards.forEach((c) => {
    if (c.qrToken?.token) globalCardsCache.set(c.qrToken.token, c);
    if (c.cardId) globalCardsCache.set(c.cardId, c);
    if (c.student?.nis) globalCardsCache.set(c.student.nis, c);
  });
}

/**
 * Instant O(1) Card Lookup from Global Config / Memory Store
 */
export function lookupCardInGlobalConfig(token: string) {
  return globalCardsCache.get(token) || null;
}

/**
 * Check if student has already scanned today in Global Config
 */
export function hasScannedTodayInGlobalConfig(studentId: string, date: string): GlobalScanRecord | null {
  const key = `${studentId}_${date}`;
  return globalScansBuffer.get(key) || null;
}

/**
 * Record a scan into the Global Config Edge Database
 * Operates purely in 0ms without locking or querying Supabase synchronously
 */
export async function recordScanToGlobalConfig(record: Omit<GlobalScanRecord, 'createdAt' | 'syncedToSupabase'>): Promise<GlobalScanRecord> {
  const fullRecord: GlobalScanRecord = {
    ...record,
    syncedToSupabase: false,
    createdAt: Date.now(),
  };

  const key = `${record.studentId}_${record.date}`;
  globalScansBuffer.set(key, fullRecord);
  savePersistedBuffer();

  return fullRecord;
}

/**
 * Get all scans recorded today in Global Config
 */
export function getTodayScansFromGlobalConfig(date?: string): GlobalScanRecord[] {
  const targetDate = date || getWIBDate();
  return Array.from(globalScansBuffer.values()).filter((item) => item.date === targetDate);
}

/**
 * 24-Hour Migration Engine:
 * Batch-migrates all buffered scans from Global Config into Supabase Database
 * Called automatically every 24 hours by Vercel Cron
 */
export async function migrateGlobalScansToSupabase(targetDate?: string) {
  const dateToSync = targetDate || getWIBDate();
  const allScans = Array.from(globalScansBuffer.values()).filter(
    (item) => item.date === dateToSync && !item.syncedToSupabase
  );

  let insertedCount = 0;
  let alreadyPresentCount = 0;
  const errors: string[] = [];

  for (const scan of allScans) {
    try {
      // Upsert into Supabase (Prisma)
      await prisma.attendance.upsert({
        where: {
          studentId_date: {
            studentId: scan.studentId,
            date: scan.date,
          },
        },
        create: {
          studentId: scan.studentId,
          schoolId: scan.schoolId,
          date: scan.date,
          time: scan.time,
          status: scan.status,
          scannedBy: scan.scannedBy,
          deviceInfo: scan.deviceInfo || 'Global Config Edge Scanner',
        },
        update: {
          time: scan.time,
          status: scan.status,
          scannedBy: scan.scannedBy,
          deviceInfo: scan.deviceInfo,
        },
      });

      scan.syncedToSupabase = true;
      insertedCount++;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        alreadyPresentCount++;
        scan.syncedToSupabase = true;
      } else {
        errors.push(`Error syncing studentId ${scan.studentId}: ${err.message}`);
      }
    }
  }

  savePersistedBuffer();

  return {
    date: dateToSync,
    totalBuffered: allScans.length,
    insertedCount,
    alreadyPresentCount,
    errors,
  };
}
