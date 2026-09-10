import { prisma } from '../lib/prisma'

async function main() {
  // Clear existing data
  await prisma.payment.deleteMany()
  await prisma.billing.deleteMany()
  await prisma.prescription.deleteMany()
  await prisma.queue.deleteMany()
  await prisma.medicalRecord.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.user.deleteMany()
  await prisma.medicineBatch.deleteMany()
  await prisma.medicine.deleteMany()

  // 1. Create 2-Role Users (Dokter & Perawat)
  const dokterUser = await prisma.user.create({
    data: {
      name: 'dr. Raniisyana R.R.',
      email: 'dokter@simpay.local',
      password: 'password123',
      role: 'DOKTER',
    },
  })

  const perawatUser = await prisma.user.create({
    data: {
      name: 'Suster Nisa (Perawat)',
      email: 'perawat@simpay.local',
      password: 'password123',
      role: 'PERAWAT',
    },
  })

  // 1.5 Create Medicine Catalog & Batches
  const medParacetamol = await prisma.medicine.create({
    data: {
      name: 'Paracetamol 500mg Tablet',
      code: 'OBT-PCT-500',
      unit: 'Tablet',
      category: 'Obat Bebas',
      unitPrice: 1500,
      purchasePrice: 1000,
      minStock: 20,
      isActive: true,
      batches: {
        create: [
          {
            batchNumber: 'PCT-2026-001',
            stockQuantity: 100,
            initialQuantity: 100,
            expiryDate: new Date('2027-12-31'),
          },
        ],
      },
    },
  })

  const medVitaminC = await prisma.medicine.create({
    data: {
      name: 'Vitamin C 500mg Tablet',
      code: 'OBT-VTC-500',
      unit: 'Tablet',
      category: 'Vitamin & Suplemen',
      unitPrice: 1500,
      purchasePrice: 900,
      minStock: 20,
      isActive: true,
      batches: {
        create: [
          {
            batchNumber: 'VTC-2026-001',
            stockQuantity: 80,
            initialQuantity: 80,
            expiryDate: new Date('2027-10-15'),
          },
        ],
      },
    },
  })

  const medAmoxicillin = await prisma.medicine.create({
    data: {
      name: 'Amoxicillin 500mg Kaplet',
      code: 'OBT-AMX-500',
      unit: 'Kaplet',
      category: 'Antibiotik (Obat Keras)',
      unitPrice: 3500,
      purchasePrice: 2200,
      minStock: 15,
      isActive: true,
      batches: {
        create: [
          {
            batchNumber: 'AMX-2026-001',
            stockQuantity: 50,
            initialQuantity: 50,
            expiryDate: new Date('2027-08-20'),
          },
        ],
      },
    },
  })

  const medIbuprofen = await prisma.medicine.create({
    data: {
      name: 'Ibuprofen 400mg Tablet',
      code: 'OBT-IBU-400',
      unit: 'Tablet',
      category: 'Analgesik / Bebas Terbatas',
      unitPrice: 2500,
      purchasePrice: 1500,
      minStock: 10,
      isActive: true,
      batches: {
        create: [
          {
            batchNumber: 'IBU-2026-001',
            stockQuantity: 5, // Low Stock for testing!
            initialQuantity: 50,
            expiryDate: new Date('2027-06-30'),
          },
        ],
      },
    },
  })

  const medAntasida = await prisma.medicine.create({
    data: {
      name: 'Antasida Doen Suspension 60ml',
      code: 'OBT-ATD-060',
      unit: 'Botol',
      category: 'Obat Bebas',
      unitPrice: 12000,
      purchasePrice: 8500,
      minStock: 5,
      isActive: true,
      batches: {
        create: [
          {
            batchNumber: 'ATD-2026-001',
            stockQuantity: 15,
            initialQuantity: 15,
            expiryDate: new Date('2027-11-30'),
          },
        ],
      },
    },
  })

  // 2. Create sample patients
  const patient1 = await prisma.patient.create({
    data: {
      name: 'Budi Santoso',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'Laki-laki',
      address: 'Jl. Merdeka No. 1, Jakarta',
      phone: '081234567890',
    },
  })

  const patient2 = await prisma.patient.create({
    data: {
      name: 'Siti Aminah',
      dateOfBirth: new Date('1985-10-20'),
      gender: 'Perempuan',
      address: 'Jl. Sudirman No. 2, Bandung',
      phone: '081987654321',
    },
  })

  const patient3 = await prisma.patient.create({
    data: {
      name: 'Andi Wijaya',
      dateOfBirth: new Date('2000-01-10'),
      gender: 'Laki-laki',
      address: 'Jl. Thamrin No. 3, Surabaya',
      phone: '08111222333',
    },
  })

  // 3. Create Queues for today
  const queue1 = await prisma.queue.create({
    data: {
      patientId: patient1.id,
      queueNumber: 1,
      status: 'SELESAI',
      polyclinic: 'Poli Umum',
    },
  })

  const queue2 = await prisma.queue.create({
    data: {
      patientId: patient2.id,
      queueNumber: 2,
      status: 'DALAM_PEMERIKSAAN',
      polyclinic: 'Poli Umum',
    },
  })

  const queue3 = await prisma.queue.create({
    data: {
      patientId: patient3.id,
      queueNumber: 3,
      status: 'MENUNGGU',
      polyclinic: 'Poli Umum',
    },
  })

  // 4. Create Medical Records & Prescriptions
  const mr1 = await prisma.medicalRecord.create({
    data: {
      patientId: patient1.id,
      doctorId: dokterUser.id,
      queueId: queue1.id,
      examinationDate: new Date(),
      complaint: 'Demam dan pusing sejak kemarin',
      diagnosis: 'Infeksi Saluran Pernapasan Akut (ISPA)',
      icd10Code: 'J06.9',
      treatment: 'Tindakan: Edukasi banyak minum air hangat.\n\nResep Obat:\n- Paracetamol 500mg (3x1, Jml: 10)\n- Vitamin C 500mg (1x1, Jml: 10)',
      bloodPressure: '120/80 mmHg',
      temperature: '37.8 °C',
      heartRate: '80 x/m',
      status: 'SELESAI',
    },
  })

  // Prescriptions for visit 1
  const p1 = await prisma.prescription.create({
    data: {
      patientId: patient1.id,
      medicalRecordId: mr1.id,
      medicineName: 'Paracetamol 500mg Tablet',
      dosage: '3x1 hari (Sesudah makan)',
      instructions: 'Jumlah: 10',
      quantity: 10,
      unitPrice: 1500,
      totalPrice: 15000,
      status: 'ANTRE',
    },
  })

  const p2 = await prisma.prescription.create({
    data: {
      patientId: patient1.id,
      medicalRecordId: mr1.id,
      medicineName: 'Vitamin C 500mg Tablet',
      dosage: '1x1 hari',
      instructions: 'Jumlah: 10',
      quantity: 10,
      unitPrice: 1500,
      totalPrice: 15000,
      status: 'ANTRE',
    },
  })

  // Create Billing for visit 1
  await prisma.billing.create({
    data: {
      patientId: patient1.id,
      queueId: queue1.id,
      medicalRecordId: mr1.id,
      registrationFee: 0,
      consultationFee: 50000,
      medicineFee: (p1.totalPrice || 0) + (p2.totalPrice || 0),
      otherFee: 0,
      totalAmount: 50000 + (p1.totalPrice || 0) + (p2.totalPrice || 0),
      status: 'BELUM_LUNAS',
    },
  })

  console.log('Seed data inserted successfully with 2-Role (Dokter & Perawat) setup.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
