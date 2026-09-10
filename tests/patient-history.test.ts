import { prisma } from '../lib/prisma'
import { setTestUser } from '../lib/auth'
import { getPatientMedicalHistory } from '../app/pasien/actions'
import { saveMedicalRecordAndComplete } from '../app/antrean/actions'

async function runPatientHistoryTests() {
  console.log('--------------------------------------------------')
  console.log('RUNNING BACKEND TEST SUITE: ISSUE #50 PATIENT HISTORY')
  console.log('--------------------------------------------------\n')

  let passedCount = 0
  const totalTests = 14

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
    const dokter = await prisma.user.findFirst({ where: { role: 'DOKTER' } })
    const perawat = await prisma.user.findFirst({ where: { role: 'PERAWAT' } })

    if (!dokter || !perawat) {
      throw new Error('Test setup failed: Seed users not found.')
    }

    setTestUser({ id: dokter.id, email: dokter.email, name: dokter.name, role: 'DOKTER' })

    // 1. Create a fresh test patient
    const testPatient = await prisma.patient.create({
      data: {
        name: 'Test History Patient Issue 50',
        dateOfBirth: new Date('1995-05-15'),
        gender: 'Laki-laki',
        phone: '081299887766',
        address: 'Jl. Merdeka No. 45',
      },
    })

    // 2. Create Visit 1 (Earlier date)
    const queue1 = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 901,
        status: 'DALAM_PEMERIKSAAN',
        polyclinic: 'Poli Umum',
        date: new Date('2026-08-01T10:00:00Z'),
      },
    })

    await saveMedicalRecordAndComplete({
      queueId: queue1.id,
      patientId: testPatient.id,
      complaint: 'Migrain berat dan mual',
      bloodPressure: '130/85',
      pulse: '84',
      temperature: '36.8',
      respiratoryRate: '18',
      objectiveNotes: 'Mata tampak cowong ringan',
      diagnosis: 'Cephalea Vasculare',
      icd10Code: 'G44.1',
      secondaryDiagnosis: 'Nausea',
      actionTreatment: 'Istirahat total dan minum air',
      medicines: [
        { nama: 'Ibuprofen 400mg', dosis: '3x1', jumlah: '10' },
        { nama: 'Domperidone 10mg', dosis: '3x1 sebelum makan', jumlah: '10' },
      ],
    })

    // Manually adjust visit 1 examinationDate in DB to ensure distinct timestamps
    await prisma.medicalRecord.updateMany({
      where: { queueId: queue1.id },
      data: {
        examinationDate: new Date('2026-08-01T10:00:00Z'),
        doctorId: dokter.id,
      },
    })

    // 3. Create Visit 2 (Later date)
    const queue2 = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 902,
        status: 'DALAM_PEMERIKSAAN',
        polyclinic: 'Poli Spesialis Penyakit Dalam',
        date: new Date('2026-09-01T14:00:00Z'),
      },
    })

    await saveMedicalRecordAndComplete({
      queueId: queue2.id,
      patientId: testPatient.id,
      complaint: 'Demam tinggi berhari-hari',
      bloodPressure: '110/70',
      pulse: '90',
      temperature: '38.5',
      respiratoryRate: '20',
      objectiveNotes: 'Bintik merah di lengan',
      diagnosis: 'Demam Berdarah Dengue',
      icd10Code: 'A91',
      secondaryDiagnosis: 'Thrombocytopenia',
      actionTreatment: 'Cek darah rutin lengkap',
      medicines: [{ nama: 'Paracetamol 500mg', dosis: '4x1', jumlah: '15' }],
    })

    await prisma.medicalRecord.updateMany({
      where: { queueId: queue2.id },
      data: {
        examinationDate: new Date('2026-09-01T14:00:00Z'),
        doctorId: dokter.id,
      },
    })

    // --- TEST EXECUTIONS ---

    // Test 1: Multiple visits returned
    const historyRes = await getPatientMedicalHistory(testPatient.id)
    assert(
      historyRes.success && historyRes.medicalRecords?.length === 2,
      'Test 1: Multiple visits are returned'
    )

    const records = historyRes.medicalRecords || []

    // Test 2: Sort order (examinationDate DESC)
    const isSortedDesc =
      records.length === 2 &&
      new Date(records[0].examinationDate).getTime() >= new Date(records[1].examinationDate).getTime()
    assert(isSortedDesc, 'Test 2: Visits are sorted examinationDate DESC and id DESC')

    // Test 3: Start-date filtering
    const startDateRes = await getPatientMedicalHistory(testPatient.id, {
      startDate: '2026-08-15',
    })
    assert(
      startDateRes.success && startDateRes.medicalRecords?.length === 1 && startDateRes.medicalRecords[0].icd10Code === 'A91',
      'Test 3: Start-date filtering works'
    )

    // Test 4: End-date filtering
    const endDateRes = await getPatientMedicalHistory(testPatient.id, {
      endDate: '2026-08-15',
    })
    assert(
      endDateRes.success && endDateRes.medicalRecords?.length === 1 && endDateRes.medicalRecords[0].icd10Code === 'G44.1',
      'Test 4: End-date filtering works'
    )

    // Test 5: Search matches complaint
    const searchComplaintRes = await getPatientMedicalHistory(testPatient.id, {
      search: 'Migrain',
    })
    assert(
      searchComplaintRes.success && searchComplaintRes.medicalRecords?.length === 1,
      'Test 5: Search matches complaint keyword'
    )

    // Test 6: Search matches diagnosis
    const searchDiagnosisRes = await getPatientMedicalHistory(testPatient.id, {
      search: 'Dengue',
    })
    assert(
      searchDiagnosisRes.success && searchDiagnosisRes.medicalRecords?.length === 1,
      'Test 6: Search matches diagnosis keyword'
    )

    // Test 7: Search matches ICD-10
    const searchIcd10Res = await getPatientMedicalHistory(testPatient.id, {
      search: 'G44.1',
    })
    assert(
      searchIcd10Res.success && searchIcd10Res.medicalRecords?.length === 1,
      'Test 7: Search matches ICD-10 code'
    )

    // Test 8: Search matches medicineName through prescriptions
    const searchMedicineRes = await getPatientMedicalHistory(testPatient.id, {
      search: 'Domperidone',
    })
    assert(
      searchMedicineRes.success && searchMedicineRes.medicalRecords?.length === 1,
      'Test 8: Search matches medicineName through prescriptions'
    )

    // Test 9: Vital signs returned correctly
    const latestVitals = historyRes.latestVitalSigns
    assert(
      !!latestVitals?.bloodPressure &&
        latestVitals.bloodPressure.includes('110/70') &&
        !!latestVitals.temperature &&
        latestVitals.temperature.includes('38.5'),
      'Test 9: Vital signs are returned correctly',
      `Actual BP: ${latestVitals?.bloodPressure}, Temp: ${latestVitals?.temperature}`
    )

    // Test 10: Multiple prescriptions for one medical record are returned
    const visit1Record = records.find((r) => r.icd10Code === 'G44.1')
    assert(
      visit1Record?.prescriptions.length === 2,
      'Test 10: Multiple prescriptions for one medical record are returned'
    )

    // Test 11: Patient with no medical records returns valid empty result
    const emptyPatient = await prisma.patient.create({
      data: {
        name: 'Empty Patient History',
        dateOfBirth: new Date('2000-01-01'),
        gender: 'Perempuan',
      },
    })
    const emptyRes = await getPatientMedicalHistory(emptyPatient.id)
    assert(
      emptyRes.success && emptyRes.medicalRecords?.length === 0,
      'Test 11: Patient with no medical records returns a valid empty result'
    )

    // Test 12: Missing optional fields are handled safely
    const recordWithMissingFields = records[0]
    assert(
      recordWithMissingFields.secondaryDiagnosis !== undefined && recordWithMissingFields.allergy !== undefined,
      'Test 12: Missing optional fields are handled safely'
    )

    // Test 13: Doctor name is returned
    assert(
      records[0].doctorName === dokter.name,
      'Test 13: Doctor name is returned correctly',
      `Actual doctorName: ${records[0].doctorName}`
    )

    // Test 14: Queue/polyclinic information is returned
    assert(
      !!records[0].polyclinic && typeof records[0].queueNumber === 'number',
      'Test 14: Queue number and polyclinic information are returned'
    )

    // Cleanup test records
    await prisma.payment.deleteMany({ where: { billing: { patientId: testPatient.id } } })
    await prisma.billing.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.prescription.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.medicalRecord.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.queue.deleteMany({ where: { patientId: testPatient.id } })
    await prisma.patient.delete({ where: { id: testPatient.id } })

    await prisma.patient.delete({ where: { id: emptyPatient.id } })

    console.log(`\n--------------------------------------------------`)
    console.log(`TEST SUITE COMPLETE: ${passedCount} / ${totalTests} TESTS PASSED`)
    console.log(`--------------------------------------------------\n`)
  } catch (err) {
    console.error('Uncaught error during patient history test suite:', err)
  } finally {
    await prisma.$disconnect()
  }
}

runPatientHistoryTests()
