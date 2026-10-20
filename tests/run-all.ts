import { execSync } from 'child_process'
import path from 'path'

const testFiles = [
  'auth-authorization.test.ts',
  'nurse-screening.test.ts',
  'queue-display.test.ts',
  'patient-history.test.ts',
  'medicine-stock.test.ts',
  'billing-payment.test.ts',
  'surat-medical.test.ts',
  'procedure-separation.test.ts',
  'financial-report-rbac.test.ts',
]

console.log('====================================================')
console.log('🚀 SIMPAY CLINIC - RUNNING COMPREHENSIVE TEST SUITE')
console.log('====================================================\n')

let allPassed = true
let passedSuites = 0

for (const file of testFiles) {
  const filePath = path.join(__dirname, file)
  console.log(`\n▶️  Executing: ${file}...`)
  try {
    execSync(`npx tsx -r dotenv/config "${filePath}"`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    })
    passedSuites++
  } catch (error) {
    allPassed = false
    console.error(`❌ Suite failed: ${file}`)
  }
}

console.log('\n====================================================')
console.log(`🏁 TEST RESULTS: ${passedSuites} / ${testFiles.length} SUITES PASSED`)
console.log('====================================================')

if (!allPassed) {
  process.exit(1)
} else {
  console.log('✨ All test suites completed successfully!')
  process.exit(0)
}
