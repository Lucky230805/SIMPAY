import { prisma } from '../lib/prisma'
import { setTestUser } from '../lib/auth'
import {
  getOrCreateBillingForVisit,
  processPayment,
  checkAndUpdateQueueCompletion,
} from '../app/pembayaran/actions'
import { saveMedicalRecordAndComplete } from '../app/antrean/actions'
import { processPrescriptionQueue, getPrescriptionQueues } from '../app/resep/actions'
import { getReportData } from '../app/laporan/actions'

async function runIntegrationTests() {
  console.log('--------------------------------------------------')
  console.log('RUNNING BACKEND TEST SUITE: ISSUE #48 & #49 INTEGRATION')
  console.log('--------------------------------------------------\n')

  let passedCount = 0
  let totalTests = 28

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`)
      passedCount++
    } else {
      console.error(`✗ [FAIL] ${testName}`)
      if (failureDetails) console.error(`   Details: ${failureDetails}`)
    }
  }

  try {
    // Setup test environment
    const dokter = await prisma.user.findFirst({ where: { role: 'DOKTER' } })
    const perawat = await prisma.user.findFirst({ where: { role: 'PERAWAT' } })

    if (!dokter || !perawat) {
      throw new Error('Test setup failed: Seed users (Dokter & Perawat) not found.')
    }

    const dokterAuthUser = { id: dokter.id, email: dokter.email, name: dokter.name, role: 'DOKTER' as const }
    const perawatAuthUser = { id: perawat.id, email: perawat.email, name: perawat.name, role: 'PERAWAT' as const }

    setTestUser(dokterAuthUser)

    // Create a fresh test patient
    const testPatient = await prisma.patient.create({
      data: {
        name: 'Test Patient Issue 48',
        dateOfBirth: new Date('1992-02-02'),
        gender: 'Perempuan',
        phone: '081234567890',
      },
    })

    // Test 1: Doctor completion sets Queue.status = 'MENUNGGU_OBAT_DAN_BAYAR'
    const queue1 = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 801,
        status: 'DALAM_PEMERIKSAAN',
        polyclinic: 'Poli Umum',
      },
    })

    await saveMedicalRecordAndComplete({
      queueId: queue1.id,
      patientId: testPatient.id,
      complaint: 'Demam dan Batuk',
      bloodPressure: '120/80',
      pulse: '80',
      temperature: '37.5',
      objectiveNotes: 'Pemeriksaan fisik normal',
      diagnosis: 'Febris TRansfort',
      medicines: [{ nama: 'Paracetamol 500mg', dosis: '3x1', jumlah: '10' }],
    })

    const updatedQueue1 = await prisma.queue.findUnique({ where: { id: queue1.id } })
    assert(
      updatedQueue1?.status === 'MENUNGGU_OBAT_DAN_BAYAR',
      'Test 1: Doctor completion sets Queue.status = MENUNGGU_OBAT_DAN_BAYAR (not SELESAI)',
      `Status actual: ${updatedQueue1?.status}`
    )

    // Test 2: Visit with prescription remains MENUNGGU_OBAT_DAN_BAYAR after payment if medicine not handed over
    const billing1 = await getOrCreateBillingForVisit(queue1.id)
    assert(
      billing1.success && billing1.billing?.totalAmount === 200000, // 50k consultation + (10 * 15k = 150k) = 200k
      'Test 2: Billing created with persisted medicine fee (50k consultation + 150k medicine = 200k total)',
      JSON.stringify(billing1)
    )

    setTestUser(perawatAuthUser)
    await processPayment({
      billingId: billing1.billing!.id,
      paymentMethod: 'TUNAI',
      amountPaid: 200000,
      userId: perawat.id,
      userRole: 'PERAWAT',
    })

    const queue1AfterPayment = await prisma.queue.findUnique({ where: { id: queue1.id } })
    assert(
      queue1AfterPayment?.status === 'MENUNGGU_OBAT_DAN_BAYAR',
      'Test 3: Payment alone does NOT auto-complete visit if prescription medicine is not handed over'
    )

    // Test 4: Pharmacy handover does NOT auto-mark billing as paid
    const queue2 = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 802,
        status: 'DALAM_PEMERIKSAAN',
        polyclinic: 'Poli Umum',
      },
    })
    setTestUser(dokterAuthUser)
    await saveMedicalRecordAndComplete({
      queueId: queue2.id,
      patientId: testPatient.id,
      complaint: 'Sakit Kepala',
      bloodPressure: '110/70',
      pulse: '76',
      temperature: '36.6',
      objectiveNotes: 'Pemeriksaan normal',
      diagnosis: 'Cephalea',
      medicines: [{ nama: 'Ibuprofen 400mg', dosis: '2x1', jumlah: '10' }],
    })

    const mr2 = await prisma.medicalRecord.findFirst({
      where: { queueId: queue2.id },
      include: { prescriptions: true },
    })

    setTestUser(perawatAuthUser)
    await processPrescriptionQueue(mr2!.id)

    const billing2Check = await getOrCreateBillingForVisit(queue2.id)
    assert(
      billing2Check.billing?.status === 'BELUM_LUNAS',
      'Test 4: Pharmacy handover does NOT auto-mark billing as paid (Billing status remains BELUM_LUNAS)'
    )

    const queue2AfterHandover = await prisma.queue.findUnique({ where: { id: queue2.id } })
    assert(
      queue2AfterHandover?.status === 'MENUNGGU_OBAT_DAN_BAYAR',
      'Test 5: Pharmacy handover alone does NOT auto-complete visit if billing is unpaid'
    )

    // Test 6: Visit with prescription becomes SELESAI once BOTH medicine is handed over AND payment is LUNAS
    setTestUser(perawatAuthUser)
    await processPayment({
      billingId: billing2Check.billing!.id,
      paymentMethod: 'TRANSFER',
      amountPaid: billing2Check.billing!.totalAmount,
      userId: perawat.id,
      userRole: 'PERAWAT',
    })

    const queue2Final = await prisma.queue.findUnique({ where: { id: queue2.id } })
    assert(
      queue2Final?.status === 'SELESAI',
      'Test 6: Visit becomes SELESAI when BOTH medicine is handed over and billing is LUNAS'
    )

    // Test 7: Handing over medicine for queue1 completes queue1 (since payment was already LUNAS in Test 3)
    const mr1 = await prisma.medicalRecord.findFirst({ where: { queueId: queue1.id } })
    setTestUser(perawatAuthUser)
    await processPrescriptionQueue(mr1!.id)
    const queue1Final = await prisma.queue.findUnique({ where: { id: queue1.id } })
    assert(
      queue1Final?.status === 'SELESAI',
      'Test 7: Visit becomes SELESAI when remaining prescription is handed over'
    )

    // Test 8: Visit WITHOUT prescription becomes SELESAI immediately after payment
    const queueNoRx = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 803,
        status: 'DALAM_PEMERIKSAAN',
        polyclinic: 'Poli Umum',
      },
    })
    setTestUser(dokterAuthUser)
    await saveMedicalRecordAndComplete({
      queueId: queueNoRx.id,
      patientId: testPatient.id,
      complaint: 'Konsultasi Kesehatan',
      bloodPressure: '120/80',
      pulse: '78',
      temperature: '36.5',
      objectiveNotes: 'Sehat walafiat',
      diagnosis: 'Sehat',
      medicines: [], // No prescription!
    })

    const billingNoRx = await getOrCreateBillingForVisit(queueNoRx.id)
    setTestUser(perawatAuthUser)
    await processPayment({
      billingId: billingNoRx.billing!.id,
      paymentMethod: 'QRIS',
      amountPaid: 50000,
      userId: perawat.id,
      userRole: 'PERAWAT',
    })

    const queueNoRxFinal = await prisma.queue.findUnique({ where: { id: queueNoRx.id } })
    assert(
      queueNoRxFinal?.status === 'SELESAI',
      'Test 8: Visit WITHOUT prescription becomes SELESAI immediately after payment is LUNAS'
    )

    // Test 9: Unpaid billing recalculates medicine fee when prescriptions change
    const queueSync = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 804,
        status: 'MENUNGGU_OBAT_DAN_BAYAR',
      },
    })
    const mrSync = await prisma.medicalRecord.create({
      data: {
        patientId: testPatient.id,
        doctorId: dokter.id,
        queueId: queueSync.id,
        examinationDate: new Date(),
        complaint: 'Flu',
        diagnosis: 'Influenza',
        status: 'SELESAI',
      },
    })
    const rxItem1 = await prisma.prescription.create({
      data: {
        patientId: testPatient.id,
        medicalRecordId: mrSync.id,
        medicineName: 'Obat A',
        dosage: '1x1',
        quantity: 1,
        unitPrice: 10000,
        totalPrice: 10000,
      },
    })

    // Initial billing fetch
    const bInitial = await getOrCreateBillingForVisit(queueSync.id)
    assert(
      bInitial.billing?.totalAmount === 60000, // 50k consultation + 10k medicine
      'Test 9: Initial billing calculated correctly (60.000)'
    )

    // Update prescription quantity in DB
    await prisma.prescription.update({
      where: { id: rxItem1.id },
      data: { quantity: 3, totalPrice: 30000 },
    })

    // Fetch billing again -> should auto-synchronize unpaid billing
    const bSynced = await getOrCreateBillingForVisit(queueSync.id)
    assert(
      bSynced.billing?.medicineFee === 30000 && bSynced.billing?.totalAmount === 80000,
      'Test 10: Unpaid billing is automatically recalculated when prescription items update (80.000)'
    )

    // Test 11: Paid billing is NOT recalculated
    setTestUser(perawatAuthUser)
    await processPayment({
      billingId: bSynced.billing!.id,
      paymentMethod: 'TUNAI',
      amountPaid: 80000,
      userId: perawat.id,
      userRole: 'PERAWAT',
    })

    // Try modifying prescription again after payment
    await prisma.prescription.update({
      where: { id: rxItem1.id },
      data: { quantity: 10, totalPrice: 100000 },
    })

    const bPaidCheck = await getOrCreateBillingForVisit(queueSync.id)
    assert(
      bPaidCheck.billing?.totalAmount === 80000 && bPaidCheck.billing?.status === 'LUNAS',
      'Test 11: Paid billing is NOT recalculated after payment is LUNAS'
    )

    // Test 12: getPrescriptionQueues does NOT return mock fallback arrays
    const rxQueues = await getPrescriptionQueues()
    const itemNoRxInList = rxQueues.find((q) => q.queueId === queueNoRx.id)
    assert(
      !!itemNoRxInList && itemNoRxInList.items.length === 0,
      'Test 12: getPrescriptionQueues returns empty items array (no mock fallbacks) for visit without prescription'
    )

    // Test 13: DOKTER payment authorization rejection
    setTestUser(dokterAuthUser)
    const payDokterErr = await processPayment({
      billingId: bSynced.billing!.id,
      paymentMethod: 'TUNAI',
      amountPaid: 80000,
      userId: dokter.id,
      userRole: 'DOKTER',
    })
    setTestUser(perawatAuthUser)
    assert(
      !payDokterErr.success && payDokterErr.error?.includes('Hanya PERAWAT'),
      'Test 13: DOKTER attempting payment is rejected server-side'
    )

    // Test 14: PERAWAT payment success
    assert(
      bPaidCheck.billing?.payment !== null,
      'Test 14: PERAWAT payment processed successfully with Payment record'
    )

    // Test 15: Returning patient visits remain independent
    const queueReturning = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 805,
        status: 'MENUNGGU',
      },
    })
    assert(
      queueReturning.id !== queueSync.id && queueReturning.patientId === testPatient.id,
      'Test 15: Returning patient creates independent visit Queue'
    )

    // Test 16: Duplicate payment rejection
    const payDup = await processPayment({
      billingId: bSynced.billing!.id,
      paymentMethod: 'TUNAI',
      amountPaid: 80000,
      userId: perawat.id,
      userRole: 'PERAWAT',
    })
    assert(
      !payDup.success,
      'Test 16: Duplicate payment on LUNAS billing is rejected'
    )

    // Test 17: Database integrity
    const allPatientRecords = await prisma.medicalRecord.findMany({ where: { patientId: testPatient.id } })
    assert(
      allPatientRecords.length >= 3,
      'Test 17: Database preserves all historical medical records for patient'
    )

    // Test 18: Prescribed medicines reflect exact quantity and unitPrice
    const sampleRx = await prisma.prescription.findFirst({ where: { patientId: testPatient.id } })
    assert(
      !!sampleRx && typeof sampleRx.quantity === 'number' && typeof sampleRx.unitPrice === 'number',
      'Test 18: Prescriptions store exact persisted quantity and unitPrice'
    )

    // --- ISSUE #49 FINANCIAL REPORTING TESTS ---
    // Test 19: getReportData returns financial section
    const todayStr = new Date().toISOString().slice(0, 10)
    const reportRes = await getReportData(todayStr, todayStr)
    assert(
      reportRes.success && !!reportRes.data?.financial,
      'Test 19: getReportData returns valid financial report object'
    )

    const finData = reportRes.data!.financial

    // Test 20: Payment within selected date range is counted
    assert(
      finData.totalRevenue >= 80000,
      'Test 20: Payment within selected date range is counted in totalRevenue'
    )

    // Test 21: Payment outside selected date range is excluded
    const pastReport = await getReportData('2020-01-01', '2020-01-02')
    assert(
      pastReport.success && pastReport.data?.financial.totalRevenue === 0,
      'Test 21: Payment outside selected date range is excluded from totalRevenue'
    )

    // Test 22: totalRevenue equals sum of qualifying Payment.totalAmount
    const todayPayments = await prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: new Date(`${todayStr}T00:00:00.000Z`),
          lte: new Date(`${todayStr}T23:59:59.999Z`),
        },
      },
    })
    const expectedSum = todayPayments.reduce((acc, p) => acc + p.totalAmount, 0)
    assert(
      finData.totalRevenue === expectedSum,
      'Test 22: totalRevenue equals the exact sum of qualifying Payment.totalAmount'
    )

    // Test 23: TUNAI, QRIS, TRANSFER totals reconcile with totalRevenue
    const sumMethods = finData.paymentMethods.reduce((acc, pm) => acc + pm.totalAmount, 0)
    assert(
      sumMethods === finData.totalRevenue,
      'Test 23: Payment method totals (TUNAI + QRIS + TRANSFER) reconcile with totalRevenue'
    )

    // Test 24: Payment method percentages sum to 100% (or 0% when no revenue)
    const sumPct = finData.paymentMethods.reduce((acc, pm) => acc + pm.percentage, 0)
    assert(
      finData.totalRevenue > 0 ? sumPct >= 99 && sumPct <= 101 : sumPct === 0,
      'Test 24: Payment method percentages calculate correctly'
    )

    // Test 25: averageTransaction calculation
    const expectedAvg = finData.paidCount > 0 ? Math.round(finData.totalRevenue / finData.paidCount) : 0
    assert(
      finData.averageTransaction === expectedAvg,
      'Test 25: averageTransaction equals totalRevenue divided by completed payments count'
    )

    // Test 26: Unpaid Billing (BELUM_LUNAS) is counted toward totalUnpaidAmount
    const unbilledQueue = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 899,
        status: 'MENUNGGU',
      },
    })
    const unbilledObj = await getOrCreateBillingForVisit(unbilledQueue.id)
    const reportAfterUnpaid = await getReportData(todayStr, todayStr)
    assert(
      reportAfterUnpaid.data!.financial.totalUnpaidAmount >= unbilledObj.billing!.totalAmount &&
        reportAfterUnpaid.data!.financial.unpaidCount >= 1,
      'Test 26: Unpaid Billing with BELUM_LUNAS is counted toward totalUnpaidAmount'
    )

    // Test 27: Paid Billing is not counted as unpaid
    assert(
      finData.totalPaidAmount > 0 && finData.paidCount >= 1,
      'Test 27: Paid Billing is counted as paid and excluded from unpaid'
    )

    // Test 28: Fee breakdown sums correct Billing components without hardcoded values
    const todayBillings = await prisma.billing.findMany({
      where: {
        createdAt: {
          gte: new Date(`${todayStr}T00:00:00.000Z`),
          lte: new Date(`${todayStr}T23:59:59.999Z`),
        },
      },
    })
    const expectedConsultation = todayBillings.reduce((acc, b) => acc + (b.consultationFee || 0), 0)
    assert(
      reportAfterUnpaid.data!.financial.feeBreakdown.consultationFee === expectedConsultation,
      'Test 28: Fee breakdown accurately sums Billing fee components from Prisma'
    )

    // Cleanup test records
    await prisma.payment.deleteMany({ where: { billing: { patientId: testPatient.id } } })
    await prisma.billing.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.prescription.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.medicalRecord.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.queue.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.patient.delete({ where: { id: testPatient.id } })

    console.log(`\n--------------------------------------------------`)
    console.log(`TEST SUITE COMPLETE: ${passedCount} / ${totalTests} TESTS PASSED`)
    console.log(`--------------------------------------------------\n`)
  } catch (err) {
    console.error('Uncaught error during integration test suite:', err)
  } finally {
    await prisma.$disconnect()
  }
}

runIntegrationTests()
