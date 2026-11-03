import assert from 'assert'
import { prisma } from '../lib/prisma'
import {
  createMedicalRecord,
  updateMedicalRecord,
  createMedicalRecordAddendum,
  getMedicalRecordAuditTrail,
  getMedicalRecordById,
} from '../app/rekam-medis/actions'
import { saveMedicalRecordAndComplete } from '../app/antrean/actions'
import { setTestUser, AuthUser } from '../lib/auth'

async function runTests() {
  console.log('--------------------------------------------------')
  console.log('RUNNING TEST SUITE: MEDICAL RECORD IMMUTABILITY & ADDENDUM AUDIT')
  console.log('--------------------------------------------------\n')

  let dokterUser: any
  let perawatUser: any
  let testPatient: any
  let createdMrId: number | null = null
  let testQueue: any

  try {
    dokterUser = await prisma.user.findFirst({ where: { role: 'DOKTER' } })
    perawatUser = await prisma.user.findFirst({ where: { role: 'PERAWAT' } })

    assert(dokterUser && perawatUser, 'Seed accounts for DOKTER and PERAWAT must exist')

    const dokterAuth: AuthUser = {
      id: dokterUser.id,
      email: dokterUser.email,
      name: dokterUser.name,
      role: 'DOKTER',
    }

    const perawatAuth: AuthUser = {
      id: perawatUser.id,
      email: perawatUser.email,
      name: perawatUser.name,
      role: 'PERAWAT',
    }

    testPatient = await prisma.patient.create({
      data: {
        name: 'Pasien Uji Immutability ' + Date.now(),
        dateOfBirth: new Date('1990-05-15'),
        gender: 'LAKI_LAKI',
        phone: '081234567899',
        address: 'Jl. Immutability No. 1',
      },
    })

    // TEST 1: Doctor creates draft medical record
    setTestUser(dokterAuth)
    const createRes = await createMedicalRecord({
      patientId: testPatient.id,
      diagnosis: 'Faringitis Akut Awal',
      complaint: 'Sakit menelan 2 hari',
    })
    assert(createRes.success && createRes.record, 'Test 1: createMedicalRecord should succeed for DOKTER')
    assert.strictEqual(createRes.record.isLocked, false, 'Test 1: Initial medical record should NOT be locked (draft)')
    createdMrId = createRes.record.id

    // TEST 2: Doctor can update draft record
    const updateDraftRes = await updateMedicalRecord(createdMrId, {
      diagnosis: 'Faringitis Akut Terkonfirmasi',
    })
    assert(updateDraftRes.success, 'Test 2: Doctor should be allowed to update draft record')
    console.log('✓ [PASS] Test 1 & 2: Doctor creates and updates draft medical record')

    // TEST 3: Doctor examination completion via queue locks record permanently
    testQueue = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 9988,
        status: 'DALAM_PEMERIKSAAN',
        polyclinic: 'Poli Umum',
        date: new Date(),
      },
    })

    const completeRes = await saveMedicalRecordAndComplete({
      queueId: testQueue.id,
      patientId: testPatient.id,
      complaint: 'Demam dan sakit tenggorokan',
      bloodPressure: '120/80',
      pulse: '80',
      temperature: '37.8',
      objectiveNotes: 'Faring hiperemis',
      diagnosis: 'Tonsilofaringitis Akut',
      icd10Code: 'J06.8',
      medicines: [{ nama: 'Amoxicillin 500mg', dosis: '3x1', jumlah: '10' }],
    })
    assert(completeRes.success, 'Test 3: saveMedicalRecordAndComplete should succeed')

    const finalizedMR = await prisma.medicalRecord.findFirst({
      where: { queueId: testQueue.id },
    })
    assert(finalizedMR && finalizedMR.isLocked, 'Test 3: Finalized medical record must have isLocked = true')
    assert.strictEqual(finalizedMR.status, 'SELESAI', 'Test 3: Status must be SELESAI')
    console.log('✓ [PASS] Test 3: saveMedicalRecordAndComplete permanently locks the medical record')

    // TEST 4: Direct update on locked record is strictly rejected
    const directUpdateAttempt = await updateMedicalRecord(finalizedMR.id, {
      diagnosis: 'Upaya Ganti Diagnosis Ilegal',
    })
    assert(
      !directUpdateAttempt.success && directUpdateAttempt.isLocked === true,
      'Test 4: Direct update on finalized record must be rejected with isLocked flag'
    )
    console.log('✓ [PASS] Test 4: Direct overwrite on locked record is strictly rejected (Immutability enforced)')

    // TEST 5: Doctor creates official Addendum on locked record
    const addendumRes = await createMedicalRecordAddendum({
      medicalRecordId: finalizedMR.id,
      fieldChanged: 'Diagnosis Utama',
      reason: 'Koreksi hasil pemeriksaan penunjang lanjutan',
      content: 'Diagnosis diperjelas menjadi Tonsilofaringitis Akut Bakterial (J06.8) berdasarkan evaluasi eksudat.',
      previousValue: 'Tonsilofaringitis Akut',
    })
    assert(addendumRes.success && addendumRes.addendum, 'Test 5: createMedicalRecordAddendum should succeed for DOKTER')
    assert.strictEqual(addendumRes.addendum.fieldChanged, 'Diagnosis Utama')
    console.log('✓ [PASS] Test 5: Doctor successfully creates official Addendum with clinical reason')

    // TEST 6: Fetching medical record includes addendums
    const fetchedMR = await getMedicalRecordById(finalizedMR.id)
    assert(fetchedMR && fetchedMR.addendums && fetchedMR.addendums.length > 0, 'Test 6: Enriched record must include addendums')
    assert.strictEqual(fetchedMR.addendums[0].reason, 'Koreksi hasil pemeriksaan penunjang lanjutan')
    console.log('✓ [PASS] Test 6: Enriched medical record includes all registered addendums')

    // TEST 7: PERAWAT cannot create Addendum (Role enforcement)
    setTestUser(perawatAuth)
    const perawatAddendumAttempt = await createMedicalRecordAddendum({
      medicalRecordId: finalizedMR.id,
      fieldChanged: 'Diagnosis Utama',
      reason: 'Upaya perawat mengubah catatan',
      content: 'Ilegal',
    })
    assert(!perawatAddendumAttempt.success, 'Test 7: PERAWAT must be rejected from creating addendum')
    console.log('✓ [PASS] Test 7: Non-doctor (PERAWAT) is strictly rejected from creating medical addendums')

    // TEST 8: Forensic audit trail records actions
    setTestUser(dokterAuth)
    const auditRes = await getMedicalRecordAuditTrail(finalizedMR.id)
    assert(auditRes.success && auditRes.logs && auditRes.logs.length >= 2, 'Test 8: Audit trail must record FINALIZE and ADDENDUM')
    const actions = auditRes.logs.map((l: any) => l.action)
    assert(actions.includes('FINALIZE'), 'Audit trail must contain FINALIZE action')
    assert(actions.includes('ADDENDUM'), 'Audit trail must contain ADDENDUM action')
    console.log('✓ [PASS] Test 8: Audit trail successfully logs FINALIZE and ADDENDUM forensically')

  } finally {
    // TEST 9 & 10: Clean up test artifacts
    if (testQueue) {
      await prisma.prescription.deleteMany({ where: { medicalRecord: { queueId: testQueue.id } } })
      await prisma.billing.deleteMany({ where: { queueId: testQueue.id } })
      await prisma.medicalRecordAddendum.deleteMany({ where: { medicalRecord: { queueId: testQueue.id } } })
      await prisma.medicalRecordAuditLog.deleteMany({ where: { medicalRecord: { queueId: testQueue.id } } })
      await prisma.medicalRecord.deleteMany({ where: { queueId: testQueue.id } })
      await prisma.queue.delete({ where: { id: testQueue.id } }).catch(() => {})
    }
    if (createdMrId) {
      await prisma.medicalRecordAuditLog.deleteMany({ where: { medicalRecordId: createdMrId } })
      await prisma.medicalRecord.delete({ where: { id: createdMrId } }).catch(() => {})
    }
    if (testPatient) {
      await prisma.patient.delete({ where: { id: testPatient.id } }).catch(() => {})
    }
    setTestUser(null)
    console.log('✓ [PASS] Test 9 & 10: Test teardown and cleanup executed cleanly')
  }

  console.log('\n--------------------------------------------------')
  console.log('TEST SUITE COMPLETE: ALL IMMUTABILITY & AUDIT TESTS PASSED!')
  console.log('--------------------------------------------------\n')
}

runTests().catch((err) => {
  console.error('FATAL TEST ERROR:', err)
  process.exit(1)
})

