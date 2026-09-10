import { prisma } from '../lib/prisma'
import { getPublicQueueDisplay } from '../app/antrean/actions'

async function runQueueDisplayTests() {
  console.log('--------------------------------------------------')
  console.log('RUNNING BACKEND TEST SUITE: ISSUE #51 PUBLIC QUEUE DISPLAY')
  console.log('--------------------------------------------------\n')

  let passedCount = 0
  let testIndex = 0

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    testIndex++
    if (condition) {
      console.log(`✓ [PASS ${testIndex}] ${testName}`)
      passedCount++
    } else {
      console.error(`✗ [FAIL ${testIndex}] ${testName}`)
      if (failureDetails) console.error(`   Details: ${failureDetails}`)
    }
  }

  let createdQueueIds: number[] = []
  let testPatientId: number | null = null

  try {
    // 1. Create a dummy test patient for queue linking
    const testPatient = await prisma.patient.create({
      data: {
        name: 'Rahasia Pasien Test Queue Display',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Laki-laki',
        phone: '081234567890',
        address: 'Jl. Testing No. 123',
      },
    })
    testPatientId = testPatient.id

    const todayStr = new Date().toISOString().split('T')[0]
    const todayMorning = new Date(`${todayStr}T08:00:00.000Z`)

    // 2. Create test queues for today across multiple polyclinics
    const q1 = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 801,
        status: 'MENUNGGU',
        polyclinic: 'Poli Umum',
        date: todayMorning,
      },
    })
    createdQueueIds.push(q1.id)

    const q2 = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 802,
        status: 'DALAM_PEMERIKSAAN',
        polyclinic: 'Poli Umum',
        date: new Date(todayMorning.getTime() + 60000),
      },
    })
    createdQueueIds.push(q2.id)

    const q3 = await prisma.queue.create({
      data: {
        patientId: testPatient.id,
        queueNumber: 803,
        status: 'MENUNGGU',
        polyclinic: 'Poli Gigi',
        date: new Date(todayMorning.getTime() + 120000),
      },
    })
    createdQueueIds.push(q3.id)

    // Test 1: getPublicQueueDisplay returns queue items for today
    const publicQueuesAll = await getPublicQueueDisplay()
    assert(
      publicQueuesAll.some((q) => q.id === q1.id) &&
      publicQueuesAll.some((q) => q.id === q2.id) &&
      publicQueuesAll.some((q) => q.id === q3.id),
      'getPublicQueueDisplay returns created queue items for today'
    )

    // Test 2: Privacy Sanitization — result items do not contain any patient identity object
    const targetItem = publicQueuesAll.find((q) => q.id === q1.id) as any
    assert(
      targetItem !== undefined &&
      targetItem.patient === undefined &&
      targetItem.patientName === undefined &&
      targetItem.nik === undefined &&
      targetItem.medicalRecords === undefined &&
      targetItem.billings === undefined,
      'Public queue items strictly exclude patient identity, medical records, and billing details'
    )

    // Test 3: Data schema verification for PublicQueueItem
    assert(
      typeof targetItem.id === 'number' &&
      typeof targetItem.queueNumber === 'number' &&
      typeof targetItem.status === 'string' &&
      typeof targetItem.polyclinic === 'string',
      'PublicQueueItem contains required fields (id: number, queueNumber: number, status: string, polyclinic: string)'
    )

    // Test 4: Status distinction for active call vs waiting
    const activeItem = publicQueuesAll.find((q) => q.id === q2.id)
    assert(
      activeItem?.status === 'DALAM_PEMERIKSAAN',
      'Currently called patient status is correctly returned as DALAM_PEMERIKSAAN'
    )

    // Test 5: Polyclinic filtering — Poli Umum only
    const poliUmumQueues = await getPublicQueueDisplay('Poli Umum')
    assert(
      poliUmumQueues.every((q) => q.polyclinic === 'Poli Umum') &&
      poliUmumQueues.some((q) => q.id === q1.id) &&
      !poliUmumQueues.some((q) => q.id === q3.id),
      'getPublicQueueDisplay("Poli Umum") filters results strictly by polyclinic'
    )

    // Test 6: Polyclinic filtering — Poli Gigi only
    const poliGigiQueues = await getPublicQueueDisplay('Poli Gigi')
    assert(
      poliGigiQueues.every((q) => q.polyclinic === 'Poli Gigi') &&
      poliGigiQueues.some((q) => q.id === q3.id) &&
      !poliGigiQueues.some((q) => q.id === q1.id),
      'getPublicQueueDisplay("Poli Gigi") filters results strictly by polyclinic'
    )

    // Test 7: Handling of non-existent polyclinic
    const nonExistentQueues = await getPublicQueueDisplay('Poli NonExistent')
    assert(
      nonExistentQueues.length === 0,
      'getPublicQueueDisplay returns empty array for non-existent polyclinic'
    )

  } catch (err: any) {
    console.error('CRITICAL ERROR DURING TEST EXECUTION:', err)
  } finally {
    // Teardown test data
    if (createdQueueIds.length > 0) {
      await prisma.queue.deleteMany({
        where: { id: { in: createdQueueIds } },
      })
    }
    if (testPatientId) {
      await prisma.patient.delete({
        where: { id: testPatientId },
      })
    }
    console.log(`\nTEST RUN COMPLETE: ${passedCount}/${testIndex} PASSED`)
    console.log('--------------------------------------------------')
  }
}

runQueueDisplayTests()
