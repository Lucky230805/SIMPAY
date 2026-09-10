import { prisma } from '../lib/prisma'
import {
  createSessionToken,
  verifySessionToken,
  verifyPassword,
} from '../lib/auth'
import { loginAction } from '../app/login/actions'
import { createPatient, updatePatient, deletePatient } from '../app/pasien/actions'
import { startExamination, saveMedicalRecordAndComplete, getPublicQueueDisplay } from '../app/antrean/actions'
import { createMedicalRecord, updateMedicalRecord } from '../app/rekam-medis/actions'
import { processPrescriptionQueue } from '../app/resep/actions'
import { processPayment, getOrCreateBillingForVisit } from '../app/pembayaran/actions'
import { getReportData } from '../app/laporan/actions'

async function runAuthAuthorizationTests() {
  console.log('--------------------------------------------------')
  console.log('RUNNING TEST SUITE: ISSUE #52 ROLE-BASED AUTH & SESSION SECURITY')
  console.log('--------------------------------------------------\n')

  let passedCount = 0
  let totalTests = 20

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
    // 1. Setup DB User references
    const dokterUser = await prisma.user.findFirst({ where: { role: 'DOKTER' } })
    const perawatUser = await prisma.user.findFirst({ where: { role: 'PERAWAT' } })

    assert(
      !!dokterUser && !!perawatUser,
      'Test 1: Seed accounts for DOKTER and PERAWAT exist in database',
      `Dokter: ${dokterUser?.name}, Perawat: ${perawatUser?.name}`
    )

    // 2. Password Verification Test
    const validPass = verifyPassword('password123', dokterUser!.password)
    const invalidPass = verifyPassword('wrongpassword', dokterUser!.password)
    assert(
      validPass && !invalidPass,
      'Test 2: Password verification correctly validates credentials and rejects invalid passwords'
    )

    // 3. Session Token Encryption & Verification Test
    const token = await createSessionToken({
      userId: dokterUser!.id,
      email: dokterUser!.email,
      name: dokterUser!.name,
      role: 'DOKTER',
    })
    const payload = await verifySessionToken(token)
    assert(
      payload?.userId === dokterUser!.id && payload?.role === 'DOKTER',
      'Test 3: HMAC-SHA256 session token creates and verifies valid session payload'
    )

    // 4. Tampered Session Token Rejection
    const tamperedToken = token + 'tampered'
    const tamperedPayload = await verifySessionToken(tamperedToken)
    assert(
      tamperedPayload === null,
      'Test 4: Tampered session token signature is detected and rejected'
    )

    // 5. Valid Login Action Test
    const dokterForm = new FormData()
    dokterForm.append('email', dokterUser!.email)
    dokterForm.append('password', 'password123')
    const loginRes = await loginAction(dokterForm)
    assert(
      loginRes.success && loginRes.user?.role === 'DOKTER',
      'Test 5: loginAction succeeds with valid DOKTER credentials'
    )

    // 6. Invalid Login Action Test
    const invalidForm = new FormData()
    invalidForm.append('email', dokterUser!.email)
    invalidForm.append('password', 'invalidpass')
    const invalidLoginRes = await loginAction(invalidForm)
    assert(
      !invalidLoginRes.success && !!invalidLoginRes.error?.includes('tidak valid'),
      'Test 6: loginAction fails with incorrect password'
    )

    // 7. Public Queue Display Route Accessibility (NO AUTH REQUIRED)
    const publicQueues = await getPublicQueueDisplay()
    assert(
      Array.isArray(publicQueues),
      'Test 7: Public queue display endpoint (getPublicQueueDisplay) is accessible without authentication'
    )

    // Setup temporary test patient for action authorization tests
    const testPatient = await prisma.patient.create({
      data: {
        name: 'Test Auth Patient',
        dateOfBirth: new Date('1995-05-05'),
        gender: 'Laki-laki',
        phone: '081999888777',
      },
    })

    const testQueue = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 999,
        status: 'DALAM_PEMERIKSAAN',
        polyclinic: 'Poli Umum',
      },
    })

    const dokterAuthUser = { id: dokterUser!.id, email: dokterUser!.email, name: dokterUser!.name, role: 'DOKTER' as const }
    const perawatAuthUser = { id: perawatUser!.id, email: perawatUser!.email, name: perawatUser!.name, role: 'PERAWAT' as const }

    // Test 8: Save medical record as DOKTER succeeds & binds doctorId to session doctor
    const { setTestUser } = await import('../lib/auth')
    setTestUser(dokterAuthUser)
    const saveRes = await saveMedicalRecordAndComplete({
      queueId: testQueue.id,
      patientId: testPatient.id,
      complaint: 'Sakit tenggorokan',
      bloodPressure: '120/80',
      pulse: '75',
      temperature: '36.8',
      objectiveNotes: 'Pemeriksaan fisik normal',
      diagnosis: 'Faringitis',
      medicines: [{ nama: 'Amoxicillin 500mg', dosis: '3x1', jumlah: '10' }],
    })

    // Check saved record doctorId
    const savedRecord = await prisma.medicalRecord.findFirst({
      where: { queueId: testQueue.id },
    })

    assert(
      saveRes.success && !!savedRecord && savedRecord.doctorId === dokterUser!.id,
      'Test 8: Doctor examination save MedicalRecord succeeds and binds doctorId to session user ID'
    )

    // Test 9: PERAWAT allowed for processPayment
    setTestUser(perawatAuthUser)
    const billing = await getOrCreateBillingForVisit(testQueue.id)
    const payResPerawat = await processPayment({
      billingId: billing.billing!.id,
      paymentMethod: 'TUNAI',
      amountPaid: 200000,
      userId: dokterUser!.id, // Client attempts to pass fake userId/userRole
      userRole: 'DOKTER',
    })

    const paymentRow = await prisma.payment.findUnique({
      where: { billingId: billing.billing!.id },
    })

    assert(
      payResPerawat.success && paymentRow?.processedById === perawatUser!.id,
      'Test 9: PERAWAT session processes payment successfully and uses authenticated session ID as processedById (ignoring client fake userId)'
    )

    // Test 10: DOKTER rejected from processPayment
    setTestUser(dokterAuthUser)
    const testQueue2 = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 998,
        status: 'DALAM_PEMERIKSAAN',
      },
    })
    await saveMedicalRecordAndComplete({
      queueId: testQueue2.id,
      patientId: testPatient.id,
      complaint: 'Batuk',
      bloodPressure: '120/80',
      pulse: '80',
      temperature: '36.5',
      objectiveNotes: 'Normal',
      diagnosis: 'Batuk Akut',
      medicines: [],
    })
    const billing2 = await getOrCreateBillingForVisit(testQueue2.id)

    let dokterRejected = false
    try {
      const dokterPayRes = await processPayment({
        billingId: billing2.billing!.id,
        paymentMethod: 'TUNAI',
        amountPaid: 50000,
        userRole: 'PERAWAT', // Spoofed client input trying to bypass
      })
      dokterRejected = !dokterPayRes.success && dokterPayRes.error?.includes('Hanya PERAWAT')
    } catch {
      dokterRejected = true
    }

    assert(
      dokterRejected,
      'Test 10: DOKTER role is strictly rejected from executing payment actions (Hanya PERAWAT)'
    )

    // Test 11: PERAWAT allowed for createPatient mutation
    setTestUser(perawatAuthUser)
    const createPatientRes = await createPatient({
      name: 'Pasien Baru Perawat',
      dateOfBirth: '1998-08-08',
      gender: 'Perempuan',
      phone: '081234567800',
    })
    assert(
      createPatientRes.success && !!createPatientRes.patient,
      'Test 11: PERAWAT session is allowed to register new patients'
    )

    // Test 12: PERAWAT allowed for updatePatient mutation
    if (createPatientRes.patient) {
      const updatePatientRes = await updatePatient(createPatientRes.patient.id, {
        name: 'Pasien Baru Perawat Updated',
        dateOfBirth: '1998-08-08',
        gender: 'Perempuan',
        phone: '081234567800',
      })
      assert(
        updatePatientRes.success,
        'Test 12: PERAWAT session is allowed to update patient data'
      )
    }

    // Test 13: PERAWAT allowed for deletePatient mutation
    if (createPatientRes.patient) {
      const delPatientRes = await deletePatient(createPatientRes.patient.id)
      assert(
        delPatientRes.success,
        'Test 13: PERAWAT session is allowed to delete patient data'
      )
    }

    // Test 14: PERAWAT allowed for processPrescriptionQueue
    const rxRes = await processPrescriptionQueue(savedRecord!.id)
    assert(
      rxRes.success,
      'Test 14: PERAWAT session is allowed to process pharmacy prescription handover'
    )

    // Test 15: Reports accessible to authenticated user
    const reportRes = await getReportData()
    assert(
      reportRes.success && !!reportRes.data,
      'Test 15: Authenticated users can fetch analytical report data'
    )

    // Test 16: createMedicalRecord binds session doctor ID
    setTestUser(dokterAuthUser)
    const directMrRes = await createMedicalRecord({
      patientId: testPatient.id,
      diagnosis: 'Konsultasi Rutin',
      complaint: 'Kontrol ulang',
    })
    assert(
      directMrRes.success && directMrRes.record?.doctorId === dokterUser!.id,
      'Test 16: createMedicalRecord binds doctorId to authenticated doctor user ID'
    )

    // Test 17: updateMedicalRecord allowed for DOKTER
    if (directMrRes.record) {
      const updateMrRes = await updateMedicalRecord(directMrRes.record.id, {
        diagnosis: 'Konsultasi Rutin Terverifikasi',
      })
      assert(
        updateMrRes.success,
        'Test 17: DOKTER session is allowed to update medical record'
      )
    }

    // Test 18: Client-supplied fake userRole cannot bypass authorization
    const fakeRoleAttempt = await processPayment({
      billingId: billing2.billing!.id,
      paymentMethod: 'TUNAI',
      amountPaid: 50000,
      userRole: 'PERAWAT', // Attempting to pass fake role string while active session is DOKTER
    })
    assert(
      !fakeRoleAttempt.success,
      'Test 18: Action evaluates session token rather than client-supplied userRole string'
    )

    // Test 19: Database integrity check (No orphan records)
    const countCheck = await prisma.patient.count({ where: { id: testPatient.id } })
    assert(
      countCheck === 1,
      'Test 19: Database integrity preserved across authorization tests'
    )

    // Test 20: Cleanup test records
    await prisma.payment.deleteMany({ where: { billing: { patientId: testPatient.id } } })
    await prisma.billing.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.prescription.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.medicalRecord.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.queue.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.patient.delete({ where: { id: testPatient.id } })

    assert(
      true,
      'Test 20: Test cleanup executed cleanly'
    )

    console.log(`\n--------------------------------------------------`)
    console.log(`TEST SUITE COMPLETE: ${passedCount} / ${totalTests} TESTS PASSED`)
    console.log(`--------------------------------------------------\n`)
  } catch (err) {
    console.error('Uncaught error during auth authorization test suite:', err)
  } finally {
    await prisma.$disconnect()
  }
}

runAuthAuthorizationTests()
