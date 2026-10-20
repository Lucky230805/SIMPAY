import { prisma } from '../lib/prisma'
import { setTestUser } from '../lib/auth'
import { getReportData } from '../app/laporan/actions'
import {
  generateReportCSVString,
  generateReportExcelHTML,
  exportReportToCSV,
  exportReportToExcel,
} from '../lib/export-utils'

async function runFinancialReportRBACTests() {
  console.log('--------------------------------------------------')
  console.log('RUNNING TEST SUITE: FINANCIAL REPORT RBAC PRIVACY')
  console.log('Doctor (Owner) has full access; Nurse (Staff) has financial hidden')
  console.log('--------------------------------------------------\n')

  let passedCount = 0
  let totalTests = 10

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
      throw new Error('Test setup failed: Seed users (Dokter & Perawat) not found.')
    }

    const dokterAuthUser = { id: dokter.id, email: dokter.email, name: dokter.name, role: 'DOKTER' as const }
    const perawatAuthUser = { id: perawat.id, email: perawat.email, name: perawat.name, role: 'PERAWAT' as const }

    const todayStr = new Date().toISOString().slice(0, 10)

    // Test 1: Doctor (Owner) receives financial report data
    setTestUser(dokterAuthUser)
    const dokterReport = await getReportData(todayStr, todayStr)
    assert(
      dokterReport.success && dokterReport.data?.financial !== null && dokterReport.data?.financial !== undefined,
      'Test 1: DOKTER (Klinik Owner) receives full financial report object',
      JSON.stringify(dokterReport.data?.financial)
    )

    // Test 2: Doctor report includes financial details
    assert(
      dokterReport.data?.userRole === 'DOKTER' &&
        typeof dokterReport.data?.financial?.totalRevenue === 'number' &&
        Array.isArray(dokterReport.data?.financial?.paymentMethods) &&
        typeof dokterReport.data?.financial?.feeBreakdown === 'object',
      'Test 2: DOKTER report contains revenue, payment methods breakdown, and fee components'
    )

    // Test 3: Nurse (Staff) has financial report hidden (financial is null)
    setTestUser(perawatAuthUser)
    const perawatReport = await getReportData(todayStr, todayStr)
    assert(
      perawatReport.success && perawatReport.data?.financial === null,
      'Test 3: PERAWAT receives financial: null (confidential revenue withheld by backend)',
      `Actual financial: ${JSON.stringify(perawatReport.data?.financial)}`
    )

    // Test 4: Nurse still receives all operational & clinical reports
    assert(
      perawatReport.data?.userRole === 'PERAWAT' &&
        typeof perawatReport.data?.summary.totalExaminations === 'number' &&
        Array.isArray(perawatReport.data?.examinations.diagnoses) &&
        Array.isArray(perawatReport.data?.demographics.gender) &&
        Array.isArray(perawatReport.data?.prescriptions.medicines) &&
        Array.isArray(perawatReport.data?.queues.byPolyclinic),
      'Test 4: PERAWAT retains full access to clinical, diagnoses, demographics, medicine usage & queue reports'
    )

    // Test 5: CSV generated for PERAWAT strictly omits financial section
    const perawatCSV = generateReportCSVString(perawatReport.data!)
    const hasPerawatFinancialInCSV =
      perawatCSV.includes('=== LAPORAN KEUANGAN & PEMBAYARAN ===') ||
      perawatCSV.includes('Total Pendapatan')
    assert(
      !hasPerawatFinancialInCSV && perawatCSV.includes('LAPORAN PELAYANAN & OPERASIONAL SIMPAY'),
      'Test 5: Generated CSV for PERAWAT omits financial section & revenue metrics'
    )

    // Test 6: Excel HTML generated for PERAWAT strictly omits financial table
    const perawatExcel = generateReportExcelHTML(perawatReport.data!)
    const hasPerawatFinancialInExcel =
      perawatExcel.includes('LAPORAN KEUANGAN &amp; RINGKASAN KASIR') ||
      perawatExcel.includes('Total Pendapatan Kasir')
    assert(
      !hasPerawatFinancialInExcel && perawatExcel.includes('LAPORAN PELAYANAN &amp; OPERASIONAL KLINIK'),
      'Test 6: Generated Excel HTML for PERAWAT omits financial table & revenue metrics'
    )

    // Test 7: CSV generated for DOKTER includes financial section & revenue
    const dokterCSV = generateReportCSVString(dokterReport.data!)
    assert(
      dokterCSV.includes('=== LAPORAN KEUANGAN & PEMBAYARAN ===') &&
        dokterCSV.includes('LAPORAN OPERASIONAL & KEUANGAN SIMPAY'),
      'Test 7: Generated CSV for DOKTER includes full financial and payment breakdown'
    )

    // Test 8: Excel HTML generated for DOKTER includes financial table
    const dokterExcel = generateReportExcelHTML(dokterReport.data!)
    assert(
      dokterExcel.includes('LAPORAN KEUANGAN &amp; RINGKASAN KASIR') &&
        dokterExcel.includes('LAPORAN OPERASIONAL &amp; KEUANGAN KLINIK'),
      'Test 8: Generated Excel HTML for DOKTER includes full financial table'
    )

    // Test 9: exportReportToCSV and exportReportToExcel execute safely without DOM crashes
    let exportSafe = true
    try {
      exportReportToCSV(perawatReport.data!)
      exportReportToExcel(perawatReport.data!)
      exportReportToCSV(dokterReport.data!)
      exportReportToExcel(dokterReport.data!)
    } catch {
      exportSafe = false
    }
    assert(
      exportSafe,
      'Test 9: Browser export functions handle SSR/Node environments without uncaught exceptions'
    )

    // Test 10: Unauthenticated access is rejected via redirect
    setTestUser(null)
    let rejected = false
    try {
      const res = await getReportData(todayStr, todayStr)
      if (!res.success) rejected = true
    } catch (err: any) {
      if (err.message === 'NEXT_REDIRECT' || err.digest?.includes('NEXT_REDIRECT')) {
        rejected = true
      }
    }
    assert(
      rejected,
      'Test 10: Unauthenticated request to getReportData is securely rejected via redirect to /login'
    )

    console.log('\n--------------------------------------------------')
    console.log(`TEST RESULTS: ${passedCount} / ${totalTests} TESTS PASSED`)
    console.log('--------------------------------------------------')

    if (passedCount !== totalTests) {
      process.exit(1)
    }
  } catch (err: any) {
    console.error('Unhandled test runner exception:', err)
    process.exit(1)
  }
}

runFinancialReportRBACTests()
