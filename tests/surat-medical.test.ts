import 'dotenv/config'
import { prisma } from '../lib/prisma'
import {
  getPatientsForSuratAction,
  getSuratListAction,
  createSuratSakitAction,
  createSuratSehatAction,
  deleteSuratAction,
} from '../app/surat/actions'

async function runSuratMedicalTests() {
  console.log('--------------------------------------------------')
  console.log('RUNNING TEST SUITE: SURAT KETERANGAN SAKIT & SEHAT (PERAWAT/DOKTER)')
  console.log('--------------------------------------------------\n')

  let passedCount = 0
  let totalTests = 5

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`)
      passedCount++
    } else {
      console.error(`✗ [FAIL] ${testName}`)
      if (failureDetails) console.error(`   Details: ${failureDetails}`)
    }
  }

  let testSuratSakitId: number | null = null
  let testSuratSehatId: number | null = null

  try {
    // Get perawat or dokter user from DB for mocking session
    const perawatUser = await prisma.user.findFirst({ where: { role: 'PERAWAT' } })
    const patient = await prisma.patient.findFirst()

    if (!perawatUser || !patient) {
      console.error('Prerequisites missing: Need at least 1 PERAWAT user and 1 Patient in DB')
      return
    }

    // Mock global auth user for tests
    ;(globalThis as any).__SIMPAY_TEST_USER__ = {
      id: perawatUser.id,
      email: perawatUser.email,
      name: perawatUser.name,
      role: 'PERAWAT',
    }

    // Test 1: Fetch Patients for Surat dropdown
    const patientsRes = await getPatientsForSuratAction()
    assert(
      patientsRes.success && Array.isArray(patientsRes.data) && patientsRes.data.length > 0,
      'Test 1: getPatientsForSuratAction returns list of patients',
      patientsRes.error
    )

    // Test 2: Create Surat Keterangan Sakit
    const today = new Date().toISOString().split('T')[0]
    const nextThreeDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const sakitRes = await createSuratSakitAction({
      patientId: patient.id,
      startDate: today,
      endDate: nextThreeDays,
      diagnosis: 'Febris & Infeksi Saluran Pernapasan',
      occupation: 'Karyawan Swasta',
      notes: 'Istirahat di rumah dan hindari minum air dingin',
    })

    assert(
      Boolean(sakitRes.success && sakitRes.data?.certificateNo.startsWith('SKS/') && sakitRes.data?.durationDays === 3),
      'Test 2: createSuratSakitAction generates SKS certificate with correct duration (3 hari)',
      sakitRes.error
    )
    if (sakitRes.data) testSuratSakitId = sakitRes.data.id

    // Test 3: Create Surat Keterangan Sehat
    const sehatRes = await createSuratSehatAction({
      patientId: patient.id,
      heightCm: 170,
      weightKg: 65,
      bloodPressure: '120/80',
      bloodType: 'O',
      colorBlind: 'Tidak',
      purpose: 'Melamar Pekerjaan',
      notes: 'Kondisi umum sangat baik',
    })

    assert(
      Boolean(sehatRes.success && sehatRes.data?.certificateNo.startsWith('SKSEHAT/')),
      'Test 3: createSuratSehatAction generates SKSEHAT certificate with physical test data',
      sehatRes.error
    )
    if (sehatRes.data) testSuratSehatId = sehatRes.data.id

    // Test 4: Query Surat List with Search & Filter
    const listRes = await getSuratListAction({ search: patient.name })
    assert(
      listRes.success && Array.isArray(listRes.data) && listRes.data.length >= 2,
      'Test 4: getSuratListAction filters and returns created certificates',
      listRes.error
    )

    // Test 5: Delete Surat
    if (testSuratSakitId) {
      const delRes = await deleteSuratAction(testSuratSakitId)
      assert(delRes.success, 'Test 5: deleteSuratAction successfully removes certificate')
    } else {
      assert(false, 'Test 5: deleteSuratAction skipped due to missing test ID')
    }

    // Cleanup second test surat if exists
    if (testSuratSehatId) {
      await deleteSuratAction(testSuratSehatId)
    }

    console.log(`\nTEST SUITE SUMMARY: ${passedCount}/${totalTests} TESTS PASSED`)
  } catch (err: any) {
    console.error('Test suite failed with unexpected exception:', err)
  }
}

runSuratMedicalTests()
