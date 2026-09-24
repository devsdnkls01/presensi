const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('=== INISIALISASI DATABASE SIAP PAKAI SISTEM PRESENSI SDN KALISALAK 01 ===');

  // 1. Bersihkan data lama
  await prisma.attendance.deleteMany();
  await prisma.qrToken.deleteMany();
  await prisma.studentCard.deleteMany();
  await prisma.cardPrintRequest.deleteMany();
  await prisma.cardPrintBatch.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.student.deleteMany();
  await prisma.classRoom.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  await prisma.cardTemplate.deleteMany();
  await prisma.schoolHoliday.deleteMany();

  // 2. Hash Password (dari Environment Variables demi keamanan)
  const devPassword = process.env.INITIAL_DEV_PASSWORD || process.env.DEV_PASSWORD || 'ChangeMeDevPass!';
  const schoolPassword = process.env.INITIAL_SCHOOL_PASSWORD || process.env.SCHOOL_PASSWORD || 'ChangeMeSchoolPass!';

  const hashedPasswordDev = await bcrypt.hash(devPassword, 10);
  const hashedPasswordAdmin = await bcrypt.hash(schoolPassword, 10);
  const hashedPasswordGuru = await bcrypt.hash(schoolPassword, 10);

  // 3. Buat Akun Developer
  const devUsername = process.env.INITIAL_DEV_USERNAME || 'develzy';
  const devUser = await prisma.user.create({
    data: {
      name: 'Super Developer / Admin Pusat',
      username: devUsername,
      password: hashedPasswordDev,
      role: 'DEVELOPER',
    },
  });

  // 4. Buat Sekolah SDN Kalisalak 01
  const school = await prisma.school.create({
    data: {
      name: 'SDN Kalisalak 01',
      npsn: '20325433',
      address: 'Jl. Raya Kalisalak No. 04, Kec. Margasari, Kab. Tegal',
      checkInStartTime: '06:00',
      checkInEndTime: '07:45',
      lateAfter: '07:45',

    },
  });

  // 5. Buat Akun Sekolah
  const schoolAdmin = await prisma.user.create({
    data: {
      name: 'Admin SDN Kalisalak 01',
      username: 'admin.kalisalak',
      password: hashedPasswordAdmin,
      role: 'SCHOOL_ADMIN',
      schoolId: school.id,
    },
  });

  // PTK SDN Kalisalak 01
  const ptkList = [
    { name: 'Imamudin, S.Pd.SD', username: 'guru.imamudin' },
    { name: 'Hendry Badriarto, S.Pd.', username: 'guru.hendry' },
    { name: 'Ismi Kamaliyah, S.Pd.', username: 'guru.ismi' },
    { name: 'Retno Amalia, S.Pd.', username: 'guru.retno' },
    { name: 'Santi Anggraeni, S.Pd.SD', username: 'guru.santi' },
    { name: 'Siti Maria Ulfah, S.Pd.', username: 'guru.siti' },
    { name: 'Syifa Septiyani Fauziah, S.Pd.', username: 'guru.syifa' },
    { name: 'Emma Puji Rakhastiwi, S.Pd.', username: 'guru.emma' },
    { name: "Mukhammad Lu'lu Khulaluddin, S.F.U.", username: 'lulu.khulaluddin' },
  ];

  for (const ptk of ptkList) {
    await prisma.user.create({
      data: {
        name: ptk.name,
        username: ptk.username,
        password: hashedPasswordGuru,
        role: 'TEACHER',
        schoolId: school.id,
      },
    });
  }

  // 6. Template Kartu Standar
  await prisma.cardTemplate.create({
    data: {
      name: 'Standard SD Negeri Merah Putih',
      primaryColor: '#1E3A8A',
      secondaryColor: '#DC2626',
      schoolLogoPosition: 'TOP_LEFT',
      isDefault: true,
    },
  });

  // 7. Buat Ruang Kelas 1 - 6
  const classMap = new Map();
  for (let grade = 1; grade <= 6; grade++) {
    const className = `Kelas ${grade}`;
    const cr = await prisma.classRoom.create({
      data: {
        name: className,
        grade: grade,
        section: 'A',
        schoolId: school.id,
      },
    });
    classMap.set(className, cr.id);
  }

  // 8. Muat Data Siswa Bersih (225 Siswa)
  const jsonPath = path.join(__dirname, '..', 'DATA_SISWA_BERSIH_SDN_KALISALAK_01.json');
  if (!fs.existsSync(jsonPath)) {
    throw new Error('File data siswa bersih tidak ditemukan!');
  }

  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const cleanStudents = rawData.dataSiswa;

  console.log(`Memproses dan mengimpor ${cleanStudents.length} siswa resmi SDN Kalisalak 01...`);

  let totalImported = 0;
  let cardCounter = 1000;

  // Track created students for sample attendance
  const createdStudents = [];

  for (const stu of cleanStudents) {
    cardCounter++;
    const classRoomId = classMap.get(stu.kelas);
    if (!classRoomId) continue;

    // Buat data siswa (TANPA NIK, NO KK, ALAMAT, ATAU DATA ORANG TUA)
    const newStudent = await prisma.student.create({
      data: {
        nis: stu.nis,
        nisn: stu.nisn || null,
        fullName: stu.nama,
        gender: stu.jenisKelamin,
        classRoomId: classRoomId,
        schoolId: school.id,
        status: 'AKTIF',
      },
    });

    createdStudents.push(newStudent);

    // Buat Kartu Siswa & QR Token Aktif siap pakai
    const cardId = `KLS01-${new Date().getFullYear()}-${String(cardCounter).padStart(6, '0')}`;
    const tokenStr = `STU-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const card = await prisma.studentCard.create({
      data: {
        cardId: cardId,
        studentId: newStudent.id,
        status: 'AKTIF',
        activatedAt: new Date(),
      },
    });

    await prisma.qrToken.create({
      data: {
        token: tokenStr,
        cardId: card.id,
        isActive: true,
      },
    });

    totalImported++;
  }

  // 9. Buat Contoh Data Presensi Hari Ini
  const todayStr = new Date().toISOString().split('T')[0];
  const sampleStudents = createdStudents.slice(0, 15);

  for (let i = 0; i < sampleStudents.length; i++) {
    const s = sampleStudents[i];
    const minute = 45 + (i % 14);
    const second = (i * 7) % 60;
    const timeStr = `06:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

    await prisma.attendance.create({
      data: {
        studentId: s.id,
        schoolId: school.id,
        date: todayStr,
        time: timeStr,
        status: 'HADIR',
        scannedBy: 'Imamudin, S.Pd',
        deviceInfo: 'Kamera HP Guru Piket',
      },
    });
  }

  // 10. Audit Log Inisialisasi
  await prisma.auditLog.create({
    data: {
      action: 'DATABASE_INITIALIZED',
      actor: 'Super Developer',
      details: `Inisialisasi database siap pakai: 225 siswa SDN Kalisalak 01, Kelas 1-6, kartu presensi, dan QR Token aktif.`,
      schoolId: school.id,
    },
  });

  console.log('\n======================================================');
  console.log(' DATABASE SIAP PAKAI BERHASIL DIINISIALISASI!');
  console.log('======================================================');
  console.log(`- Sekolah         : ${school.name} (NPSN: ${school.npsn})`);
  console.log(`- Ruang Kelas     : 6 Kelas (Kelas 1 s/d Kelas 6)`);
  console.log(`- Total Siswa     : ${totalImported} Siswa (Semua Aktif)`);
  console.log(`- Total Kartu     : ${totalImported} Kartu Siswa (Status: AKTIF)`);
  console.log(`- Total QR Token  : ${totalImported} QR Code Siap Scan`);
  console.log('------------------------------------------------------');
  console.log('AKUN LOGIN:');
  console.log('1. Developer    : username = "developer"        | password = "dev123"');
  console.log('2. Admin Sekolah: username = "admin.kalisalak" | password = "password123"');
  console.log('3. Guru Piket   : username = "guru.imamudin"   | password = "password123"');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
