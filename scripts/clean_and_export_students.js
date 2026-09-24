const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const inputFilePath = path.join(__dirname, '..', 'SISWA SDN KALISALAK 01 TP 2026 2027 SMT 1.xlsx');
const outputExcelPath = path.join(__dirname, '..', 'DATA_SISWA_BERSIH_SDN_KALISALAK_01.xlsx');
const outputJsonPath = path.join(__dirname, '..', 'DATA_SISWA_BERSIH_SDN_KALISALAK_01.json');

const workbook = xlsx.readFile(inputFilePath);

const cleanWorkbook = xlsx.utils.book_new();
const allCleanStudents = [];
const classBreakdown = [];

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  // Format class name
  let formattedClassName = sheetName.trim();
  const upper = formattedClassName.toUpperCase();
  if (upper.includes('KELAS 1') || upper.includes('KELAS I')) formattedClassName = 'Kelas 1';
  else if (upper.includes('KELAS 2') || upper.includes('KELAS II')) formattedClassName = 'Kelas 2';
  else if (upper.includes('KELAS 3') || upper.includes('KELAS III')) formattedClassName = 'Kelas 3';
  else if (upper.includes('KELAS 4') || upper.includes('KELAS IV')) formattedClassName = 'Kelas 4';
  else if (upper.includes('KELAS 5') || upper.includes('KELAS V')) formattedClassName = 'Kelas 5';
  else if (upper.includes('KELAS 6') || upper.includes('KELAS VI')) formattedClassName = 'Kelas 6';

  // Find header row
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i] || [];
    if (row.some(cell => typeof cell === 'string' && (cell.trim().toUpperCase() === 'NAMA' || cell.trim().toUpperCase() === 'NIS'))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) return;

  const headerRow = rawRows[headerRowIndex].map(h => (h ? String(h).trim().toUpperCase() : ''));
  
  const nameIdx = headerRow.findIndex(h => h === 'NAMA' || h.includes('NAMA PESERTA') || h.includes('NAMA SISWA'));
  const nisIdx = headerRow.findIndex(h => h === 'NIS');
  const nisnIdx = headerRow.findIndex(h => h === 'NISN');
  const jkIdx = headerRow.findIndex(h => h === 'JK' || h === 'JP' || h === 'L/P' || h === 'JENIS KELAMIN');

  const classStudents = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawName = row[nameIdx];
    if (!rawName || typeof rawName !== 'string') continue;

    const cleanName = rawName.trim();
    const cleanUpper = cleanName.toUpperCase();

    // Filter out footer / meta / teacher / header text
    if (
      !cleanName ||
      cleanUpper.startsWith('JUMLAH') ||
      cleanUpper.startsWith('LAKI') ||
      cleanUpper.startsWith('PEREMPUAN') ||
      cleanUpper.startsWith('TOTAL') ||
      cleanUpper.startsWith('MENGETAHUI') ||
      cleanUpper.startsWith('KEPALA') ||
      cleanUpper.startsWith('GURU') ||
      cleanUpper.startsWith('NIP.') ||
      cleanUpper.includes('S.PD') ||
      cleanUpper.includes('MARGASARI')
    ) {
      continue;
    }

    const rawNis = row[nisIdx];
    if (rawNis === undefined || rawNis === null || String(rawNis).trim() === '' || isNaN(Number(String(rawNis).trim()))) {
      // If NIS is missing or not a number, skip non-student row
      continue;
    }

    const nis = String(rawNis).trim();
    const rawNisn = row[nisnIdx];
    const nisn = rawNisn !== undefined && rawNisn !== null ? String(rawNisn).trim() : '';
    
    const rawJk = row[jkIdx];
    let gender = rawJk !== undefined && rawJk !== null ? String(rawJk).trim().toUpperCase() : '';
    if (gender.startsWith('L')) gender = 'L';
    else if (gender.startsWith('P')) gender = 'P';
    else gender = 'L';

    const student = {
      no: classStudents.length + 1,
      kelas: formattedClassName,
      nis: nis,
      nisn: nisn || '',
      nama: cleanName,
      jenisKelamin: gender,
    };

    classStudents.push(student);
    allCleanStudents.push(student);
  }

  // Create sheet for this class
  const classSheetData = classStudents.map((s, idx) => ({
    'No': idx + 1,
    'NIS': s.nis,
    'NISN': s.nisn,
    'Nama Lengkap': s.nama,
    'Jenis Kelamin (L/P)': s.jenisKelamin,
    'Kelas': s.kelas,
  }));

  const ws = xlsx.utils.json_to_sheet(classSheetData);
  xlsx.utils.book_append_sheet(cleanWorkbook, ws, formattedClassName);

  classBreakdown.push({
    kelas: formattedClassName,
    jumlahSiswa: classStudents.length,
    lakiLaki: classStudents.filter(s => s.jenisKelamin === 'L').length,
    perempuan: classStudents.filter(s => s.jenisKelamin === 'P').length,
  });
});

// Also create a master sheet containing all students
const masterSheetData = allCleanStudents.map((s, idx) => ({
  'No': idx + 1,
  'Kelas': s.kelas,
  'NIS': s.nis,
  'NISN': s.nisn,
  'Nama Lengkap': s.nama,
  'Jenis Kelamin (L/P)': s.jenisKelamin,
}));
const masterWs = xlsx.utils.json_to_sheet(masterSheetData);
xlsx.utils.book_append_sheet(cleanWorkbook, masterWs, 'SEMUA SISWA');

// Write clean Excel and JSON files
xlsx.writeFile(cleanWorkbook, outputExcelPath);
fs.writeFileSync(outputJsonPath, JSON.stringify({
  sekolah: 'SD NEGERI KALISALAK 01',
  tahunPelajaran: '2026/2027 SMT 1',
  tanggalEkstraksi: new Date().toISOString(),
  totalSiswa: allCleanStudents.length,
  rekapitulasiKelas: classBreakdown,
  dataSiswa: allCleanStudents,
}, null, 2), 'utf-8');

console.log('=== HASIL EKSTRAKSI BERSIH ===');
console.log('Rekapitulasi:');
console.table(classBreakdown);
console.log(`\nTotal Keseluruhan Siswa Bersih: ${allCleanStudents.length}`);
console.log(`File Excel Bersih tersimpan di: ${outputExcelPath}`);
console.log(`File JSON Bersih tersimpan di: ${outputJsonPath}`);
