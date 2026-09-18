const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const connectionString = process.env.DATABASE_URL || ''
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Clear existing data in correct FK order
  await prisma.payment.deleteMany()
  await prisma.billing.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.medicineBatch.deleteMany()
  await prisma.medicine.deleteMany()
  await prisma.medicalRecord.deleteMany()
  await prisma.queue.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.user.deleteMany()

  // Create Users (2 Doctors & 2 Nurses)
  const drRani = await prisma.user.create({
    data: {
      name: 'dr. Raniisyana Romula Rekkers',
      email: 'dokter@simpay.local',
      password: 'password123',
      role: 'DOKTER',
    },
  })

  const drFarisi = await prisma.user.create({
    data: {
      name: 'dr. Farisi',
      email: 'dokter2@simpay.local',
      password: 'password123',
      role: 'DOKTER',
    },
  })

  const perawatWindy = await prisma.user.create({
    data: {
      name: 'Ns. Windy Apriyani',
      email: 'perawat@simpay.local',
      password: 'password123',
      role: 'PERAWAT',
    },
  })

  const perawatTania = await prisma.user.create({
    data: {
      name: 'Ns. Tania',
      email: 'perawat2@simpay.local',
      password: 'password123',
      role: 'PERAWAT',
    },
  })

  // Create Patients
  const p1 = await prisma.patient.create({
    data: {
      name: 'Budi Santoso',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'Laki-laki',
      address: 'Jl. Merdeka No. 1, Jakarta Pusat',
      phone: '081234567890',
    },
  })

  const p2 = await prisma.patient.create({
    data: {
      name: 'Siti Aminah',
      dateOfBirth: new Date('1985-10-20'),
      gender: 'Perempuan',
      address: 'Jl. Sudirman No. 22, Bandung',
      phone: '081987654321',
    },
  })

  const p3 = await prisma.patient.create({
    data: {
      name: 'Andi Wijaya',
      dateOfBirth: new Date('2000-01-10'),
      gender: 'Laki-laki',
      address: 'Jl. Thamrin No. 5, Surabaya',
      phone: '08111222333',
    },
  })

  const p4 = await prisma.patient.create({
    data: {
      name: 'Rina Kusuma',
      dateOfBirth: new Date('1978-07-25'),
      gender: 'Perempuan',
      address: 'Jl. Gatot Subroto No. 9, Jakarta Selatan',
      phone: '082133445566',
    },
  })

  const p5 = await prisma.patient.create({
    data: {
      name: 'Hendra Gunawan',
      dateOfBirth: new Date('1995-03-12'),
      gender: 'Laki-laki',
      address: 'Jl. Ahmad Yani No. 14, Bekasi',
      phone: '085566778899',
    },
  })

  // Patient 6: Kartika Wijaya - deliberately has NO medical records to test empty state (#033)
  const p6 = await prisma.patient.create({
    data: {
      name: 'Kartika Wijaya',
      dateOfBirth: new Date('1978-11-05'),
      gender: 'Perempuan',
      address: 'Apartemen Sudirman Park Tower A, Lt 12, Jakarta',
      phone: '0811-2233-4455',
    },
  })

  // --- MULTIPLE MEDICAL RECORDS & VISITS ---

  // Visit 1 for Budi Santoso (Today)
  const mr1 = await prisma.medicalRecord.create({
    data: {
      patientId: p1.id,
      doctorId: drRani.id,
      examinationDate: new Date(),
      complaint: 'Demam tinggi disertai sakit kepala berdenyut dan badan menggigil sejak 2 hari yang lalu.',
      diagnosis: 'Infeksi Saluran Pernapasan Akut (ISPA)',
      icd10Code: 'J06.9',
      secondaryDiagnosis: 'Cephalea (Sakit Kepala)',
      bloodPressure: '120/80 mmHg',
      temperature: '38.5 °C',
      heartRate: '88 x/menit',
      respiratoryRate: '20 x/menit',
      allergy: 'Tidak ada alergi obat',
      treatment: 'Pemberian antipiretik, dekongestan, edukasi kompres hangat dan tirah baring.',
      notes: 'Anjurkan banyak minum air putih minimal 2 liter/hari. Kontrol kembali dalam 3 hari jika demam menetap.',
    },
  })

  // Visit 2 for Budi Santoso (1 month ago) - proves multiple visits
  const mr2 = await prisma.medicalRecord.create({
    data: {
      patientId: p1.id,
      doctorId: drRani.id,
      examinationDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      complaint: 'Batuk berdahak kekuningan disertai rasa sesak ringan di dada terutama malam hari.',
      diagnosis: 'Bronkitis Akut',
      icd10Code: 'J20.9',
      secondaryDiagnosis: null,
      bloodPressure: '118/75 mmHg',
      temperature: '37.2 °C',
      heartRate: '82 x/menit',
      respiratoryRate: '22 x/menit',
      allergy: 'Tidak ada alergi obat',
      treatment: 'Pemberian mukolitik, ekspektoran, dan bronkodilator oral.',
      notes: 'Hindari paparan asap rokok dan polusi udara. Gunakan masker saat keluar rumah.',
    },
  })

  // Visit 3 for Budi Santoso (3 months ago) - historical visit
  await prisma.medicalRecord.create({
    data: {
      patientId: p1.id,
      doctorId: drRani.id,
      examinationDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      complaint: 'Pegal linu pada area punggung dan persendian setelah aktivitas fisik berat.',
      diagnosis: 'Myalgia',
      icd10Code: 'M79.1',
      secondaryDiagnosis: null,
      bloodPressure: '120/80 mmHg',
      temperature: '36.6 °C',
      heartRate: '76 x/menit',
      respiratoryRate: '18 x/menit',
      allergy: 'Tidak ada alergi obat',
      treatment: 'Analgetik oral dan edukasi peregangan otot.',
      notes: 'Istirahat cukup dan hindari mengangkat beban berat secara mendadak.',
    },
  })

  // Visit 1 for Siti Aminah (Yesterday)
  const mr3 = await prisma.medicalRecord.create({
    data: {
      patientId: p2.id,
      doctorId: drRani.id,
      examinationDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      complaint: 'Nyeri ulu hati perih seperti terbakar, mual, kembung, nafsu makan berkurang.',
      diagnosis: 'Gastritis Akut',
      icd10Code: 'K29.7',
      secondaryDiagnosis: 'Dispepsia Fungsional',
      bloodPressure: '110/70 mmHg',
      temperature: '36.7 °C',
      heartRate: '80 x/menit',
      respiratoryRate: '18 x/menit',
      allergy: 'Alergi obat golongan NSAID (Aspirin)',
      treatment: 'Pemberian PPI (Omeprazole) dan Antasida sirup.',
      notes: 'Makan dalam porsi kecil namun sering. Hindari makanan pedas, asam, kafein, dan stres.',
    },
  })

  // Visit 2 for Siti Aminah (2 months ago)
  await prisma.medicalRecord.create({
    data: {
      patientId: p2.id,
      doctorId: drRani.id,
      examinationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      complaint: 'Flu, hidung tersumbat, dan bersin-bersin sejak 3 hari.',
      diagnosis: 'Nasofaringitis Akut (Common Cold)',
      icd10Code: 'J00',
      secondaryDiagnosis: null,
      bloodPressure: '115/75 mmHg',
      temperature: '37.1 °C',
      heartRate: '78 x/menit',
      respiratoryRate: '18 x/menit',
      allergy: 'Alergi obat golongan NSAID (Aspirin)',
      treatment: 'Antihistamin dan vitamin C dosis tinggi.',
      notes: 'Tingkatkan asupan cairan hangat dan istirahat.',
    },
  })

  // Visit 1 for Rina Kusuma (3 days ago)
  const mr4 = await prisma.medicalRecord.create({
    data: {
      patientId: p4.id,
      doctorId: drRani.id,
      examinationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      complaint: 'Tengkuk terasa kaku, pusing berputar, dan mata berkunang-kunang.',
      diagnosis: 'Hipertensi Esensial (Primer)',
      icd10Code: 'I10',
      secondaryDiagnosis: 'Vertigo Perifer',
      bloodPressure: '150/95 mmHg',
      temperature: '36.8 °C',
      heartRate: '86 x/menit',
      respiratoryRate: '20 x/menit',
      allergy: 'Tidak ada riwayat alergi',
      treatment: 'Pemberian antihipertensi Amlodipine 5mg dan Betahistine.',
      notes: 'Diet rendah garam (DASH), pantau tekanan darah secara berkala pagi dan sore.',
    },
  })

  // Visit 1 for Andi Wijaya (5 days ago)
  await prisma.medicalRecord.create({
    data: {
      patientId: p3.id,
      doctorId: drRani.id,
      examinationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      complaint: 'BAB cair lebih dari 4 kali sejak pagi, perut melilit dan mual.',
      diagnosis: 'Gastroenteritis Akut',
      icd10Code: 'A09',
      secondaryDiagnosis: null,
      bloodPressure: '110/70 mmHg',
      temperature: '37.4 °C',
      heartRate: '92 x/menit',
      respiratoryRate: '20 x/menit',
      allergy: 'Tidak ada alergi obat',
      treatment: 'Rehidrasi oral dengan oralit, pemberian Zink dan probiotik.',
      notes: 'Minum 1 sachet oralit setiap kali BAB cair. Segera ke IGD jika lemas atau mata cekung.',
    },
  })

  // Visit 1 for Hendra Gunawan (10 days ago)
  await prisma.medicalRecord.create({
    data: {
      patientId: p5.id,
      doctorId: drRani.id,
      examinationDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      complaint: 'Sering merasa haus, sering buang air kecil malam hari, berat badan menurun.',
      diagnosis: 'Diabetes Mellitus Tipe 2',
      icd10Code: 'E11.9',
      secondaryDiagnosis: null,
      bloodPressure: '130/85 mmHg',
      temperature: '36.6 °C',
      heartRate: '80 x/menit',
      respiratoryRate: '18 x/menit',
      allergy: 'Tidak ada riwayat alergi',
      treatment: 'Konseling nutrisi medis, anjuran cek GDS/HbA1c, dan Metformin 500mg.',
      notes: 'Edukasi pola diet gizi seimbang, olahraga 150 menit per minggu, dan kontrol gula darah.',
    },
  })

  // Prescriptions linked to Medical Records
  // For mr1 (Budi Santoso - ISPA)
  await prisma.prescription.create({
    data: {
      patientId: p1.id,
      medicalRecordId: mr1.id,
      medicineName: 'Paracetamol 500mg',
      dosage: '3 x 1 tablet',
      instructions: 'Diminum sesudah makan bila demam',
    },
  })
  await prisma.prescription.create({
    data: {
      patientId: p1.id,
      medicalRecordId: mr1.id,
      medicineName: 'Dextromethorphan Syr',
      dosage: '3 x 1 sendok takar (5 ml)',
      instructions: 'Diminum sesudah makan',
    },
  })

  // For mr2 (Budi Santoso - Bronkitis)
  await prisma.prescription.create({
    data: {
      patientId: p1.id,
      medicalRecordId: mr2.id,
      medicineName: 'Ambroxol 30mg',
      dosage: '3 x 1 tablet',
      instructions: 'Diminum sesudah makan',
    },
  })

  // For mr3 (Siti Aminah - Gastritis)
  await prisma.prescription.create({
    data: {
      patientId: p2.id,
      medicalRecordId: mr3.id,
      medicineName: 'Omeprazole 20mg',
      dosage: '1 x 1 kapsul',
      instructions: 'Diminum pagi hari 30 menit sebelum makan',
    },
  })
  await prisma.prescription.create({
    data: {
      patientId: p2.id,
      medicalRecordId: mr3.id,
      medicineName: 'Antasida Doen Suspensi',
      dosage: '3 x 1 sendok makan',
      instructions: 'Diminum 1 jam sebelum makan atau saat perut perih',
    },
  })

  // For mr4 (Rina Kusuma - Hipertensi)
  await prisma.prescription.create({
    data: {
      patientId: p4.id,
      medicalRecordId: mr4.id,
      medicineName: 'Amlodipine 5mg',
      dosage: '1 x 1 tablet',
      instructions: 'Diminum malam hari secara teratur',
    },
  })

  // Create Queues for today
  // Status values: MENUNGGU, DALAM_PEMERIKSAAN, SELESAI
  // Arrival time is derived from `date` field at display time (no separate field)
  const todayBase = new Date()
  todayBase.setSeconds(0, 0)

  const makeArrival = (h, m) => {
    const d = new Date(todayBase)
    d.setHours(h, m, 0, 0)
    return d
  }

  // Antrean untuk Poli Umum 1 (dr. Raniisyana)
  await prisma.queue.create({
    data: { patientId: p1.id, queueNumber: 1, status: 'SELESAI', polyclinic: 'Poli Umum 1', date: makeArrival(8, 15) },
  })
  await prisma.queue.create({
    data: { patientId: p2.id, queueNumber: 2, status: 'DALAM_PEMERIKSAAN', polyclinic: 'Poli Umum 1', date: makeArrival(8, 30) },
  })
  await prisma.queue.create({
    data: { patientId: p3.id, queueNumber: 3, status: 'MENUNGGU', polyclinic: 'Poli Umum 1', date: makeArrival(8, 45) },
  })

  // Antrean untuk Poli Umum 2 (dr. Farisi)
  await prisma.queue.create({
    data: { patientId: p4.id, queueNumber: 1, status: 'DALAM_PEMERIKSAAN', polyclinic: 'Poli Umum 2', date: makeArrival(9, 0) },
  })
  await prisma.queue.create({
    data: { patientId: p5.id, queueNumber: 2, status: 'MENUNGGU', polyclinic: 'Poli Umum 2', date: makeArrival(9, 15) },
  })

  console.log('✅ Seed data Epic 3 berhasil dimasukkan.')
  console.log(`   Users: ${await prisma.user.count()}, Patients: ${await prisma.patient.count()}, Medical Records: ${await prisma.medicalRecord.count()}, Queues: ${await prisma.queue.count()}, Prescriptions: ${await prisma.prescription.count()}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
