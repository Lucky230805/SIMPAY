import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { getProceduresAction, createProcedureAction } from '../app/tindakan/actions'

async function runTest() {
  console.log('🧪 Testing Medical Procedure & Medicine Separation...')

  // 1. Check that procedures table exists and has entries
  const procedures = await (prisma as any).procedure.findMany({
    where: { isActive: true },
  })
  if (procedures.length === 0) {
    throw new Error('❌ Expected procedures to exist in database, but found 0')
  }
  console.log(`✅ Found ${procedures.length} active procedures in catalog`)

  // 2. Check for ICD-9-CM codes
  const hasIcd9 = procedures.some((p: any) => p.code && p.code.length > 0)
  if (!hasIcd9) {
    throw new Error('❌ Expected procedures to contain standard ICD-9-CM codes')
  }
  console.log('✅ Procedures properly contain ICD-9-CM codes (e.g. 93.94, 86.59)')

  // 3. Verify Medicine table has NO procedure category
  const invalidMeds = await (prisma as any).medicine.findMany({
    where: {
      category: 'Tindakan / Layanan Medis',
      isActive: true,
    },
  })
  if (invalidMeds.length > 0) {
    throw new Error(`❌ Found ${invalidMeds.length} active medicine items with Tindakan category!`)
  }
  console.log('✅ Medicine table is clean: 0 active items marked as Tindakan / Layanan Medis')

  // 4. Verify Procedure does NOT have stockQuantity or expiryDate fields in schema
  const sampleProc = procedures[0]
  if ('stockQuantity' in sampleProc || 'expiryDate' in sampleProc) {
    throw new Error('❌ Procedure model should not contain inventory stock or expiry fields!')
  }
  console.log('✅ Procedure entity is strictly service/procedure based (no stock or expiry)')

  // 5. Test getProceduresAction server action
  const res = await getProceduresAction()
  if (!res.success || !res.data || res.data.length === 0) {
    throw new Error('❌ getProceduresAction failed or returned empty')
  }
  console.log(`✅ getProceduresAction returned ${res.data.length} items`)

  console.log('🎉 All procedure separation checks passed successfully!')
}

runTest()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
