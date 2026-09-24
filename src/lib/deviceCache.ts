/**
 * SmartSiswa Client Device Cache & Background Synchronizer
 * Downloads and persists 100% of school attendance, classes, students, cards, and recaps into localStorage.
 */

export interface CacheSyncResult {
  success: boolean;
  cardsCount: number;
  classesCount: number;
  studentsCount: number;
  syncedAt: string;
}

let isSyncInProgress = false;

export async function downloadAllSchoolData(isForce = false): Promise<CacheSyncResult> {
  if (typeof window === 'undefined') {
    return { success: false, cardsCount: 0, classesCount: 0, studentsCount: 0, syncedAt: '' };
  }

  // Prevent multiple concurrent sync storms
  if (isSyncInProgress) {
    return { success: true, cardsCount: 0, classesCount: 0, studentsCount: 0, syncedAt: new Date().toISOString() };
  }

  isSyncInProgress = true;
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let cardsCount = 0;
  let classesCount = 0;
  let studentsCount = 0;

  try {
    // 1. Download & Cache All Student Cards & QR Tokens for instant scanning
    try {
      const resCards = await fetch('/api/school/cards');
      if (resCards.ok) {
        const dataCards = await resCards.json();
        if (dataCards.cards && Array.isArray(dataCards.cards)) {
          cardsCount = dataCards.cards.length;
          localStorage.setItem('smartsiswa_cached_cards_v1', JSON.stringify(dataCards.cards));
          localStorage.setItem('smartsiswa_cached_cards_time', new Date().toISOString());
        }
      }
    } catch (e) {
      console.warn('Cache Sync Cards Warning:', e);
    }

    // 2. Download & Cache All School Classes
    let classList: Array<{ id: string; name: string }> = [];
    try {
      const resClasses = await fetch('/api/school/classes');
      if (resClasses.ok) {
        const dataClasses = await resClasses.json();
        if (dataClasses.classes && Array.isArray(dataClasses.classes)) {
          classList = dataClasses.classes;
          classesCount = classList.length;
          localStorage.setItem('smartsiswa_classes_cache', JSON.stringify(classList));
        }
      }
    } catch (e) {
      console.warn('Cache Sync Classes Warning:', e);
    }

    // 3. Download & Cache All Students (all 225 students)
    try {
      const resStudents = await fetch('/api/school/students');
      if (resStudents.ok) {
        const dataStudents = await resStudents.json();
        if (dataStudents.students && Array.isArray(dataStudents.students)) {
          studentsCount = dataStudents.students.length;
          localStorage.setItem('smartsiswa_students_cache_all', JSON.stringify(dataStudents.students));
        }
      }
    } catch (e) {
      console.warn('Cache Sync Students Warning:', e);
    }

    // 4. Download & Cache Today's Attendance Logs
    try {
      const resAtt = await fetch(`/api/school/attendance?date=${today}`);
      if (resAtt.ok) {
        const dataAtt = await resAtt.json();
        if (dataAtt.attendances && Array.isArray(dataAtt.attendances)) {
          localStorage.setItem(`smartsiswa_attendance_${today}`, JSON.stringify(dataAtt.attendances));
        }
      }
    } catch (e) {
      console.warn('Cache Sync Attendance Warning:', e);
    }

    // 5. Download & Cache Master Attendance Recap (All Classes)
    try {
      const resRecapAll = await fetch(`/api/attendance/recap?month=${currentMonth}`);
      if (resRecapAll.ok) {
        const dataRecapAll = await resRecapAll.json();
        if (dataRecapAll && dataRecapAll.matrix) {
          localStorage.setItem(`smartsiswa_rekap_${currentMonth}_all`, JSON.stringify(dataRecapAll));
        }
      }
    } catch (e) {
      console.warn('Cache Sync Recap All Warning:', e);
    }

    // 6. Download & Cache Each Class Attendance Recap in parallel
    if (classList.length > 0) {
      const recapPromises = classList.map(async (cls) => {
        try {
          const res = await fetch(`/api/attendance/recap?classId=${cls.id}&month=${currentMonth}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.matrix) {
              localStorage.setItem(`smartsiswa_rekap_${currentMonth}_${cls.id}`, JSON.stringify(data));
            }
          }
        } catch (e) {}
      });
      await Promise.all(recapPromises);
    }

    const syncedAt = new Date().toISOString();
    localStorage.setItem('smartsiswa_last_full_sync', syncedAt);

    // Notify all open tabs / components that fresh cache is ready
    window.dispatchEvent(new CustomEvent('smartsiswa:cache-updated', { detail: { syncedAt } }));

    return {
      success: true,
      cardsCount,
      classesCount,
      studentsCount,
      syncedAt,
    };
  } finally {
    isSyncInProgress = false;
  }
}
