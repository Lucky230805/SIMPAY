import assert from 'assert'
import { prisma } from '../lib/prisma'
import { getClinicProfile, updateClinicProfile } from '../app/pengaturan/actions'
import { getOrCreateBillingForVisit } from '../app/pembayaran/actions'
import { setTestUser, AuthUser } from '../lib/auth'

async function runTests() {
  console.log('--------------------------------------------------')
  console.log('RUNNING TEST SUITE: CLINIC PROFILE & DYNAMIC SETTINGS')
  console.log('--------------------------------------------------\n')

  let dokterUser: any
  let testPatient: any
  let testQueue: any
  let initialProfile: any

  try {
    dokterUser = await prisma.user.findFirst({ where: { role: 'DOKTER' } })
    assert(dokterUser, 'Seed account for DOKTER must exist')

    const dokterAuth: AuthUser = {
      id: dokterUser.id,
      email: dokterUser.email,
      name: dokterUser.name,
      role: 'DOKTER',
    }
    setTestUser(dokterAuth)

    // 1. Fetch initial clinic profile
    console.log('Step 1: Fetch clinic profile...')
    initialProfile = await getClinicProfile()
    assert(initialProfile, 'Clinic profile should be fetched')
    assert(typeof initialProfile.name === 'string', 'Clinic name must be string')
    assert(typeof initialProfile.defaultConsultationFee === 'number', 'Consultation fee must be number')
    console.log(`✅ Default/Initial Profile: "${initialProfile.name}" - Konsultasi: Rp ${initialProfile.defaultConsultationFee}`)

    // 2. Test Validation
    console.log('\nStep 2: Test validation for invalid clinic data...')
    const invalidRes1 = await updateClinicProfile({
      ...initialProfile,
      name: '',
    })
    assert.strictEqual(invalidRes1.success, false, 'Should fail if name is empty')

    const invalidRes2 = await updateClinicProfile({
      ...initialProfile,
      address: 'abc',
    })
    assert.strictEqual(invalidRes2.success, false, 'Should fail if address is too short')

    const invalidRes3 = await updateClinicProfile({
      ...initialProfile,
      primaryDoctorName: '',
    })
    assert.strictEqual(invalidRes3.success, false, 'Should fail if primary doctor is empty')
    console.log('✅ Validation checks passed')

    // 3. Update Clinic Profile
    console.log('\nStep 3: Update clinic profile to custom values...')
    const updatedData = {
      ...initialProfile,
      name: 'KLINIK MEDIKA SENTOSA BANDUNG',
      legalName: 'PT Medika Sentosa Indonesia',
      licenseNumber: '503/SIP-KLINIK/2026/DPMPTSP',
      address: 'Jl. Riau No. 123, Citarum, Kota Bandung, Jawa Barat',
      phone: '022-7654321',
      email: 'kontak@medikasentosa.id',
      primaryDoctorName: 'dr. Alexander Graham, Sp.A',
      primaryDoctorSip: 'SIP: 446.1/0999/SIP.SP/2026',
      secondaryDoctorName: 'dr. Beatrice Chandra',
      secondaryDoctorSip: 'SIP: 446.1/1000/SIP.DU/2026',
      defaultRegistrationFee: 15000,
      defaultConsultationFee: 75000,
      headerType: 'KLINIK PRATAMA RAWAT JALAN',
    }

    const updateRes = await updateClinicProfile(updatedData)
    assert(updateRes.success, 'Update clinic profile must succeed: ' + updateRes.error)

    const refreshedProfile = await getClinicProfile()
    assert.strictEqual(refreshedProfile.name, 'KLINIK MEDIKA SENTOSA BANDUNG')
    assert.strictEqual(refreshedProfile.defaultRegistrationFee, 15000)
    assert.strictEqual(refreshedProfile.defaultConsultationFee, 75000)
    assert.strictEqual(refreshedProfile.primaryDoctorName, 'dr. Alexander Graham, Sp.A')
    console.log('✅ Clinic profile updated and persisted successfully')

    // 4. Test Billing generation uses dynamic clinic settings
    console.log('\nStep 4: Verify new billing inherits dynamic fees and clinic info...')
    testPatient = await prisma.patient.create({
      data: {
        name: 'Pasien Uji Settings ' + Date.now(),
        dateOfBirth: new Date('1992-03-10'),
        gender: 'PEREMPUAN',
        phone: '081299998888',
        address: 'Jl. Uji Pengaturan No. 5',
      },
    })

    testQueue = await prisma.queue.create({
      data: {
        queueNumber: 999,
        patientId: testPatient.id,
        status: 'MENUNGGU_PEMBAYARAN',
      },
    })

    const billingRes = await getOrCreateBillingForVisit(testQueue.id)
    assert(billingRes.success, 'getOrCreateBillingForVisit must succeed')
    const billing = billingRes.billing!
    assert(billing, 'Billing must be generated')
    assert.strictEqual(billing.registrationFee, 15000, 'Registration fee must match updated default')
    assert.strictEqual(billing.consultationFee, 75000, 'Consultation fee must match updated default')
    assert.strictEqual(billing.clinicInfo?.name, 'KLINIK MEDIKA SENTOSA BANDUNG')
    assert.strictEqual(billing.clinicInfo?.primaryDoctorName, 'dr. Alexander Graham, Sp.A')
    console.log(`✅ Billing accurately inherited: Reg=Rp ${billing.registrationFee}, Konsultasi=Rp ${billing.consultationFee}, Clinic="${billing.clinicInfo?.name}"`)

    // 5. Restore profile to original
    console.log('\nStep 5: Restoring clinic profile to original state...')
    await updateClinicProfile(initialProfile)
    const restored = await getClinicProfile()
    assert.strictEqual(restored.name, initialProfile.name)
    console.log('✅ Restored initial clinic profile')

    console.log('\n==================================================')
    console.log('🎉 ALL CLINIC SETTINGS TESTS PASSED!')
    console.log('==================================================')
  } finally {
    setTestUser(null)
    if (testQueue) {
      await prisma.billing.deleteMany({ where: { queueId: testQueue.id } }).catch(() => {})
      await prisma.queue.delete({ where: { id: testQueue.id } }).catch(() => {})
    }
    if (testPatient) {
      await prisma.patient.delete({ where: { id: testPatient.id } }).catch(() => {})
    }
    await prisma.$disconnect()
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err)
  process.exit(1)
})

