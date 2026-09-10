import { prisma } from '../lib/prisma'
import { setTestUser } from '../lib/auth'
import {
  createMedicine,
  updateMedicine,
  addMedicineBatch,
  getMedicineInventory,
  getMedicineAlerts,
  getMedicineBatches,
} from '../app/obat/actions'
import { processPrescriptionQueue } from '../app/resep/actions'
import { saveMedicalRecordAndComplete } from '../app/antrean/actions'
import { processPayment } from '../app/pembayaran/actions'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  } else {
    console.log(`✓ [PASS] ${message}`)
  }
}

async function runMedicineStockTestSuite() {
  console.log('--------------------------------------------------')
  console.log('RUNNING TEST SUITE: ISSUE #53 MEDICINE STOCK & EXPIRY MANAGEMENT')
  console.log('--------------------------------------------------')

  let dokterUser: any
  let perawatUser: any

  try {
    // Initial cleanup of test records if previous run was interrupted
    await prisma.medicineBatch.deleteMany({ where: { batchNumber: { contains: 'CFD-' } } })
    await prisma.medicineBatch.deleteMany({ where: { batchNumber: { contains: 'SLB-' } } })
    await prisma.medicine.deleteMany({ where: { name: { contains: 'Cefadroxil' } } })
    await prisma.medicine.deleteMany({ where: { name: { contains: 'Salbutamol' } } })

    // 1. Resolve Seed Users
    dokterUser = await prisma.user.findUnique({ where: { email: 'dokter@simpay.local' } })
    perawatUser = await prisma.user.findUnique({ where: { email: 'perawat@simpay.local' } })

    assert(!!dokterUser && dokterUser.role === 'DOKTER', 'Test 1: DOKTER seed user exists')
    assert(!!perawatUser && perawatUser.role === 'PERAWAT', 'Test 2: PERAWAT seed user exists')

    // 2. Role Authorization Test: DOKTER cannot create medicine
    setTestUser({ id: dokterUser.id, email: dokterUser.email, name: dokterUser.name, role: 'DOKTER' })
    const dokterCreateRes = await createMedicine({
      name: 'Cefadroxil 500mg',
      code: 'OBT-CFD-500',
      unitPrice: 5000,
    })
    assert(
      !dokterCreateRes.success && dokterCreateRes.error?.includes('ditolak'),
      'Test 3: DOKTER role is rejected from creating medicine master'
    )

    // 3. PERAWAT can create medicine master
    setTestUser({ id: perawatUser.id, email: perawatUser.email, name: perawatUser.name, role: 'PERAWAT' })
    const medRes = await createMedicine({
      name: 'Cefadroxil 500mg Kaplet',
      code: 'OBT-CFD-500',
      unit: 'Kaplet',
      category: 'Antibiotik',
      unitPrice: 5000,
      purchasePrice: 3000,
      minStock: 15,
    })
    assert(medRes.success && !!medRes.medicine?.id, 'Test 4: PERAWAT can create medicine master record')
    const cefadroxilId = medRes.medicine!.id

    // 4. Stock Batch Creation (PERAWAT)
    const expiryFar = new Date()
    expiryFar.setFullYear(expiryFar.getFullYear() + 2)

    const batch1Res = await addMedicineBatch({
      medicineId: cefadroxilId,
      batchNumber: 'CFD-BATCH-001',
      stockQuantity: 20,
      expiryDate: expiryFar.toISOString(),
    })
    assert(batch1Res.success && !!batch1Res.batch?.id, 'Test 5: PERAWAT can create stock batch for medicine')

    // 5. Multiple Batches for One Medicine with FEFO order (Batch 2 expires sooner than Batch 1)
    const expirySoon = new Date()
    expirySoon.setMonth(expirySoon.getMonth() + 2) // Expires in 2 months

    const batch2Res = await addMedicineBatch({
      medicineId: cefadroxilId,
      batchNumber: 'CFD-BATCH-002-SOON',
      stockQuantity: 10,
      expiryDate: expirySoon.toISOString(),
    })
    assert(batch2Res.success, 'Test 6: PERAWAT can add multiple stock batches for same medicine')

    // 6. FEFO Earliest-Expiry Stock Deduction
    // Create a test patient, queue, medical record, and prescription requiring 15 Kaplet of Cefadroxil 500mg Kaplet
    const patient = await prisma.patient.create({
      data: {
        name: 'Test Pasien Stok',
        dateOfBirth: new Date('1995-04-12'),
        gender: 'Laki-laki',
      },
    })

    const queue = await prisma.queue.create({
      data: {
        patientId: patient.id,
        queueNumber: 99,
        status: 'DALAM_PEMERIKSAAN',
        polyclinic: 'Poli Umum',
      },
    })

    setTestUser({ id: dokterUser.id, email: dokterUser.email, name: dokterUser.name, role: 'DOKTER' })
    await saveMedicalRecordAndComplete({
      queueId: queue.id,
      patientId: patient.id,
      complaint: 'Infeksi tenggorokan',
      bloodPressure: '120/80',
      pulse: '80',
      temperature: '37.0',
      objectiveNotes: 'Tenggorokan merah',
      diagnosis: 'Faringitis Akut',
      medicines: [{ nama: 'Cefadroxil 500mg Kaplet', dosis: '3x1', jumlah: '15' }],
    })

    const mr = await prisma.medicalRecord.findFirst({
      where: { queueId: queue.id },
      include: { prescriptions: true },
    })
    assert(mr?.prescriptions.length === 1, 'Test 7: Doctor created prescription linked to medicine master')

    // Verify Prescription snapshot unitPrice matches Medicine.unitPrice (5000)
    const presItem = mr!.prescriptions[0]
    assert(presItem.unitPrice === 5000, 'Test 8: Prescription unitPrice is snapshot of Medicine unitPrice (5000)')

    // 7. Nurse dispenses prescription (FEFO deduction: 10 from CFD-BATCH-002-SOON, 5 from CFD-BATCH-001)
    setTestUser({ id: perawatUser.id, email: perawatUser.email, name: perawatUser.name, role: 'PERAWAT' })
    const processRes = await processPrescriptionQueue(mr!.id)
    assert(processRes.success, 'Test 9: PERAWAT dispenses prescription successfully')

    const updatedBatch2 = await prisma.medicineBatch.findUnique({ where: { id: batch2Res.batch!.id } })
    const updatedBatch1 = await prisma.medicineBatch.findUnique({ where: { id: batch1Res.batch!.id } })

    assert(
      updatedBatch2?.stockQuantity === 0,
      'Test 10: FEFO algorithm fully consumed earliest expiring batch CFD-BATCH-002-SOON (10 -> 0)'
    )
    assert(
      updatedBatch1?.stockQuantity === 15,
      'Test 11: FEFO algorithm deducted remaining 5 from CFD-BATCH-001 (20 -> 15)'
    )

    // 8. Insufficient Stock Rejection & No Partial Deduction Test
    // Create another visit requiring 50 Kaplet when only 15 available
    const queue2 = await prisma.queue.create({
      data: {
        patientId: patient.id,
        queueNumber: 100,
        status: 'DALAM_PEMERIKSAAN',
      },
    })

    setTestUser({ id: dokterUser.id, email: dokterUser.email, name: dokterUser.name, role: 'DOKTER' })
    await saveMedicalRecordAndComplete({
      queueId: queue2.id,
      patientId: patient.id,
      complaint: 'Kontrol ulang',
      bloodPressure: '120/80',
      pulse: '80',
      temperature: '37.0',
      objectiveNotes: 'Stok kurang test',
      diagnosis: 'Faringitis Akut',
      medicines: [{ nama: 'Cefadroxil 500mg Kaplet', dosis: '3x1', jumlah: '50' }],
    })

    const mr2 = await prisma.medicalRecord.findFirst({
      where: { queueId: queue2.id },
      include: { prescriptions: true },
    })

    setTestUser({ id: perawatUser.id, email: perawatUser.email, name: perawatUser.name, role: 'PERAWAT' })
    const insufficientRes = await processPrescriptionQueue(mr2!.id)
    assert(
      !insufficientRes.success && insufficientRes.error?.includes('tidak mencukupi'),
      'Test 12: Insufficient stock attempt is rejected with clear error message'
    )

    const batch1AfterFailedAttempt = await prisma.medicineBatch.findUnique({
      where: { id: batch1Res.batch!.id },
    })
    assert(
      batch1AfterFailedAttempt?.stockQuantity === 15,
      'Test 13: Failed dispensing attempt did NOT partially deduct stock (Atomicity preserved)'
    )

    // 9. Expired Batch Exclusion Test
    // Add an expired batch for Cefadroxil
    const expiredDate = new Date()
    expiredDate.setDate(expiredDate.getDate() - 10) // Expired 10 days ago

    await prisma.medicineBatch.create({
      data: {
        medicineId: cefadroxilId,
        batchNumber: 'CFD-EXPIRED-BATCH',
        stockQuantity: 100,
        initialQuantity: 100,
        expiryDate: expiredDate,
      },
    })

    const inv = await getMedicineInventory()
    const cefadroxilInv = inv.find((m) => m.id === cefadroxilId)
    assert(
      cefadroxilInv?.availableStock === 15 && cefadroxilInv?.expiredStock === 100,
      'Test 14: Available non-expired stock (15) correctly excludes expired batch stock (100)'
    )

    // 10. Alert Detection Tests: Near Expiry, Expired, Low Stock
    const nearExpiryDate = new Date()
    nearExpiryDate.setDate(nearExpiryDate.getDate() + 15) // Expires in 15 days (within 30 days)

    await addMedicineBatch({
      medicineId: cefadroxilId,
      batchNumber: 'CFD-NEAR-EXPIRY-BATCH',
      stockQuantity: 10,
      expiryDate: nearExpiryDate.toISOString(),
    })

    const alerts = await getMedicineAlerts()
    assert(
      alerts.expiredCount > 0 && alerts.nearExpiryCount > 0,
      'Test 15: getMedicineAlerts correctly detects Expired and Near Expiry batches'
    )

    // 11. Low Stock & Out of Stock Alert Detection
    const lowStockMed = await createMedicine({
      name: 'Salbutamol 2mg',
      minStock: 10,
    })
    await addMedicineBatch({
      medicineId: lowStockMed.medicine!.id,
      batchNumber: 'SLB-BATCH-001',
      stockQuantity: 3, // <= 10 minStock
      expiryDate: expiryFar.toISOString(),
    })

    const inv2 = await getMedicineInventory()
    const salbutamolInv = inv2.find((m) => m.id === lowStockMed.medicine!.id)
    assert(
      salbutamolInv?.alertStatus === 'LOW_STOCK',
      'Test 16: Medicine with stock <= minStock correctly receives LOW_STOCK alert status'
    )

    // 12. Billing medicineFee Integrity & Payment Workflow Verification
    // Pay billing for first visit (queue 1)
    const billing = await prisma.billing.findFirst({ where: { queueId: queue.id } })
    assert(
      billing?.medicineFee === 75000,
      'Test 17: Billing medicineFee matches persisted prescription total (15 * 5000 = 75.000)'
    )

    const payRes = await processPayment({
      billingId: billing!.id,
      paymentMethod: 'TUNAI',
      amountPaid: 150000,
      userId: perawatUser.id,
    })
    assert(payRes.success, 'Test 18: Payment processes successfully and visit completes normally')

    // Cleanup test records
    await prisma.payment.deleteMany({ where: { billingId: billing!.id } })
    await prisma.billing.deleteMany({ where: { patientId: patient.id } })
    await prisma.prescription.deleteMany({ where: { patientId: patient.id } })
    await prisma.medicalRecord.deleteMany({ where: { patientId: patient.id } })
    await prisma.queue.deleteMany({ where: { patientId: patient.id } })
    await prisma.patient.delete({ where: { id: patient.id } })
    await prisma.medicineBatch.deleteMany({ where: { medicineId: cefadroxilId } })
    await prisma.medicineBatch.deleteMany({ where: { medicineId: lowStockMed.medicine!.id } })
    await prisma.medicine.delete({ where: { id: cefadroxilId } })
    await prisma.medicine.delete({ where: { id: lowStockMed.medicine!.id } })

    console.log('--------------------------------------------------')
    console.log('TEST SUITE COMPLETE: 18 / 18 TESTS PASSED')
    console.log('--------------------------------------------------')
  } catch (error: any) {
    console.error('TEST SUITE ERROR:', error)
    process.exit(1)
  }
}

runMedicineStockTestSuite()
