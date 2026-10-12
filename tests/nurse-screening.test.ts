import { prisma } from '../lib/prisma'
import { setTestUser } from '../lib/auth'
import { saveNurseScreening, getTodayQueues, getQueueById } from '../app/antrean/actions'

async function runNurseScreeningTests() {
  console.log('--------------------------------------------------')
  console.log('RUNNING TEST SUITE: NURSE SCREENING & VITAL SIGNS TRIAGE (OPSI B)')
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

  let testPatient: any = null
  let testQueue: any = null

  try {
    const perawatUser = await prisma.user.findFirst({ where: { role: 'PERAWAT' } })
    const dokterUser = await prisma.user.findFirst({ where: { role: 'DOKTER' } })

    assert(!!perawatUser && !!dokterUser, 'Test 1: PERAWAT and DOKTER seed accounts exist')

    // Create test patient & queue
    testPatient = await prisma.patient.create({
      data: {
        name: 'Pasien Uji Skrining',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Laki-laki',
        phone: '081234567890',
      },
    })

    testQueue = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 777,
        status: 'MENUNGGU',
        polyclinic: 'Poli Umum 1',
      },
    })

    // 2. PERAWAT performs initial vital signs screening
    setTestUser({
      id: perawatUser!.id,
      email: perawatUser!.email,
      name: perawatUser!.name,
      role: 'PERAWAT',
    })

    const screenRes = await saveNurseScreening({
      queueId: testQueue.id,
      patientId: testPatient.id,
      bloodPressure: '120/80',
      temperature: '36.6',
      heartRate: '80',
      respiratoryRate: '18',
      weight: '70',
      height: '175',
      complaint: 'Pusing dan demam ringan sejak 2 hari',
      allergy: 'Alergi Paracetamol',
      notes: 'Pasien tampak lemas',
    })

    assert(
      screenRes.success,
      'Test 2: PERAWAT can submit vital signs & anthropometry screening',
      screenRes.error
    )

    // 3. Verify MedicalRecord is created and contains screening data
    const createdMR = await prisma.medicalRecord.findFirst({
      where: { queueId: testQueue.id },
    })

    assert(
      Boolean(
        createdMR &&
        createdMR.bloodPressure?.includes('120/80') &&
        createdMR.temperature?.includes('36.6') &&
        createdMR.complaint?.includes('Pusing dan demam') &&
        createdMR.notes?.includes('Antropometri') &&
        createdMR.notes?.includes('IMT: 22.9')
      ),
      'Test 3: Screening data persists into MedicalRecord with calculated BMI (IMT) and vitals'
    )

    // 4. getTodayQueues reflects medicalRecord screening in QueueItem
    const todayQueues = await getTodayQueues('Poli Umum 1')
    const queueItem = todayQueues.find((q) => q.id === testQueue.id)

    assert(
      Boolean(queueItem && queueItem.medicalRecord && queueItem.medicalRecord.bloodPressure?.includes('120/80')),
      'Test 4: getTodayQueues returns pre-populated medicalRecord screening info for the queue row'
    )

    // 5. getQueueById returns active screening medical record for doctor workbench
    const queueDetail = await getQueueById(testQueue.id)
    assert(
      Boolean(queueDetail && (queueDetail as any).medicalRecord && (queueDetail as any).medicalRecord.bloodPressure?.includes('120/80')),
      'Test 5: getQueueById includes medicalRecord for doctor workbench auto-fill'
    )
  } catch (err: any) {
    console.error('Error during nurse screening tests:', err)
  } finally {
    // Cleanup
    if (testQueue) {
      await prisma.medicalRecord.deleteMany({ where: { queueId: testQueue.id } })
      await prisma.queue.deleteMany({ where: { id: testQueue.id } })
    }
    if (testPatient) {
      await prisma.patient.deleteMany({ where: { id: testPatient.id } })
    }

    console.log('\n--------------------------------------------------')
    console.log(`TEST SUITE COMPLETE: ${passedCount} / ${totalTests} TESTS PASSED`)
    console.log('--------------------------------------------------\n')
  }
}

runNurseScreeningTests()
