'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export interface ReportSummary {
  totalExaminations: number
  newPatients: number
  completedPrescriptions: number
  totalQueues: number
}

export interface DiagnosisStat {
  name: string
  count: number
}

export interface ICD10Stat {
  code: string
  count: number
}

export interface ExaminationReport {
  total: number
  diagnoses: DiagnosisStat[]
  icd10: ICD10Stat[]
}

export interface GenderStat {
  gender: string
  count: number
  percentage: number
}

export interface AgeGroupStat {
  group: string
  count: number
  percentage: number
}

export interface PatientDemographicsReport {
  totalPatients: number
  gender: GenderStat[]
  ageGroups: AgeGroupStat[]
}

export interface MedicineUsageStat {
  name: string
  count: number
}

export interface PrescriptionStatusStat {
  status: string
  count: number
}

export interface PrescriptionReport {
  total: number
  medicines: MedicineUsageStat[]
  statuses: PrescriptionStatusStat[]
}

export interface PolyclinicStat {
  polyclinic: string
  count: number
}

export interface QueueStatusStat {
  status: string
  count: number
}

export interface QueueReport {
  total: number
  byPolyclinic: PolyclinicStat[]
  byStatus: QueueStatusStat[]
}

export interface PaymentMethodStat {
  method: 'TUNAI' | 'QRIS' | 'TRANSFER'
  count: number
  totalAmount: number
  percentage: number
}

export interface FeeBreakdownStat {
  registrationFee: number
  consultationFee: number
  medicineFee: number
  otherFee: number
}

export interface FinancialReport {
  totalRevenue: number
  totalPaidAmount: number
  totalUnpaidAmount: number
  paidCount: number
  unpaidCount: number
  averageTransaction: number
  paymentMethods: PaymentMethodStat[]
  feeBreakdown: FeeBreakdownStat
}

export interface ReportData {
  startDate: string
  endDate: string
  summary: ReportSummary
  examinations: ExaminationReport
  demographics: PatientDemographicsReport
  prescriptions: PrescriptionReport
  queues: QueueReport
  financial: FinancialReport
}

export interface ReportResponse {
  success: boolean
  data?: ReportData
  error?: string
}

/**
 * Helper to calculate age in years from date of birth
 */
function calculateAge(dob: Date, relativeTo: Date = new Date()): number {
  const birthDate = new Date(dob)
  let age = relativeTo.getFullYear() - birthDate.getFullYear()
  const m = relativeTo.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && relativeTo.getDate() < birthDate.getDate())) {
    age--
  }
  return Math.max(0, age)
}

/**
 * Fetch reporting & aggregated metrics for SIMPAY based on a date range.
 */
export async function getReportData(
  startDateInput?: string | Date,
  endDateInput?: string | Date
): Promise<ReportResponse> {
  await requireAuth()
  try {
    // Default: last 30 days if not provided
    const now = new Date()
    const defaultStart = new Date(now)
    defaultStart.setDate(defaultStart.getDate() - 30)

    const rawStart = startDateInput ? new Date(startDateInput) : defaultStart
    const rawEnd = endDateInput ? new Date(endDateInput) : now

    if (isNaN(rawStart.getTime()) || isNaN(rawEnd.getTime())) {
      return {
        success: false,
        error: 'Format tanggal yang dimasukkan tidak valid',
      }
    }

    const start = new Date(rawStart)
    start.setHours(0, 0, 0, 0)

    const end = new Date(rawEnd)
    end.setHours(23, 59, 59, 999)

    if (start.getTime() > end.getTime()) {
      return {
        success: false,
        error: 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir',
      }
    }

    // 1. Fetch Medical Records within date range
    const medicalRecords = await prisma.medicalRecord.findMany({
      where: {
        examinationDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        patient: true,
        prescriptions: true,
      },
    })

    // 2. Fetch Queues within date range
    const queues = await prisma.queue.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
    })

    // 3. Fetch all Patients & compute New Patients (earliest record/queue within range)
    const allPatients = await prisma.patient.findMany({
      include: {
        medicalRecords: {
          orderBy: { examinationDate: 'asc' },
          take: 1,
        },
        queues: {
          orderBy: { date: 'asc' },
          take: 1,
        },
      },
    })

    let newPatientsCount = 0
    allPatients.forEach((p) => {
      const firstMrDate = p.medicalRecords[0]?.examinationDate
      const firstQueueDate = p.queues[0]?.date
      let earliestDate: Date | null = null

      if (firstMrDate && firstQueueDate) {
        earliestDate = firstMrDate < firstQueueDate ? firstMrDate : firstQueueDate
      } else {
        earliestDate = firstMrDate || firstQueueDate || null
      }

      if (earliestDate && earliestDate >= start && earliestDate <= end) {
        newPatientsCount++
      }
    })

    // --- A. SUMMARY METRICS ---
    const totalExaminations = medicalRecords.length
    const totalQueues = queues.length

    // Count completed prescriptions
    let completedPrescriptions = 0
    medicalRecords.forEach((mr) => {
      if (mr.prescriptions.length > 0) {
        const finished = mr.prescriptions.filter((p) => p.status === 'SELESAI').length
        completedPrescriptions += finished
      } else if (mr.status === 'SELESAI') {
        completedPrescriptions += 1
      }
    })

    const summary: ReportSummary = {
      totalExaminations,
      newPatients: newPatientsCount,
      completedPrescriptions,
      totalQueues,
    }

    // --- B. EXAMINATIONS & DIAGNOSES ---
    const diagnosisMap: Record<string, number> = {}
    const icd10Map: Record<string, number> = {}

    medicalRecords.forEach((mr) => {
      if (mr.diagnosis && mr.diagnosis.trim() !== '') {
        const diag = mr.diagnosis.trim()
        diagnosisMap[diag] = (diagnosisMap[diag] || 0) + 1
      }

      if (mr.icd10Code && mr.icd10Code.trim() !== '') {
        const code = mr.icd10Code.trim()
        icd10Map[code] = (icd10Map[code] || 0) + 1
      }
    })

    const diagnoses: DiagnosisStat[] = Object.entries(diagnosisMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const icd10: ICD10Stat[] = Object.entries(icd10Map)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)

    const examinations: ExaminationReport = {
      total: totalExaminations,
      diagnoses,
      icd10,
    }

    // --- C. PATIENT DEMOGRAPHICS ---
    // Patients who visited during the period (via medical records or queues)
    const activePatientMap = new Map<number, (typeof allPatients)[0]>()
    medicalRecords.forEach((mr) => {
      if (mr.patient) activePatientMap.set(mr.patient.id, mr.patient as any)
    })
    const activePatients = Array.from(activePatientMap.values())
    const totalActivePatients = activePatients.length || allPatients.length

    const samplePatients = activePatients.length > 0 ? activePatients : allPatients

    let maleCount = 0
    let femaleCount = 0
    const ageGroupCounts = {
      '< 18': 0,
      '18 - 35': 0,
      '36 - 50': 0,
      '51 - 65': 0,
      '> 65': 0,
    }

    samplePatients.forEach((p) => {
      const g = p.gender?.toLowerCase() || ''
      if (g === 'l' || g === 'laki-laki' || g.includes('laki')) {
        maleCount++
      } else {
        femaleCount++
      }

      const age = calculateAge(p.dateOfBirth, end)
      if (age < 18) {
        ageGroupCounts['< 18']++
      } else if (age <= 35) {
        ageGroupCounts['18 - 35']++
      } else if (age <= 50) {
        ageGroupCounts['36 - 50']++
      } else if (age <= 65) {
        ageGroupCounts['51 - 65']++
      } else {
        ageGroupCounts['> 65']++
      }
    })

    const sampleTotal = samplePatients.length || 1
    const genderStats: GenderStat[] = [
      {
        gender: 'Laki-laki',
        count: maleCount,
        percentage: Math.round((maleCount / sampleTotal) * 100),
      },
      {
        gender: 'Perempuan',
        count: femaleCount,
        percentage: Math.round((femaleCount / sampleTotal) * 100),
      },
    ]

    const ageGroupStats: AgeGroupStat[] = Object.entries(ageGroupCounts).map(([group, count]) => ({
      group,
      count,
      percentage: Math.round((count / sampleTotal) * 100),
    }))

    const demographics: PatientDemographicsReport = {
      totalPatients: samplePatients.length,
      gender: genderStats,
      ageGroups: ageGroupStats,
    }

    // --- D. PRESCRIPTIONS & MEDICINES ---
    const medicineMap: Record<string, number> = {}
    const statusMap: Record<string, number> = { ANTRE: 0, SELESAI: 0 }
    let totalPrescriptionItems = 0

    medicalRecords.forEach((mr) => {
      if (mr.prescriptions.length > 0) {
        mr.prescriptions.forEach((p) => {
          totalPrescriptionItems++
          const name = p.medicineName.trim()
          medicineMap[name] = (medicineMap[name] || 0) + 1

          const st = p.status || 'ANTRE'
          statusMap[st] = (statusMap[st] || 0) + 1
        })
      } else if (mr.treatment) {
        // Fallback parse lines starting with '- '
        const lines = mr.treatment.split('\n')
        lines.forEach((l) => {
          if (l.startsWith('- ')) {
            totalPrescriptionItems++
            const name = l.replace('- ', '').split('(')[0].trim()
            medicineMap[name] = (medicineMap[name] || 0) + 1

            const st = mr.status || 'ANTRE'
            statusMap[st] = (statusMap[st] || 0) + 1
          }
        })
      }
    })

    const medicineStats: MedicineUsageStat[] = Object.entries(medicineMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const statusStats: PrescriptionStatusStat[] = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }))

    const prescriptions: PrescriptionReport = {
      total: totalPrescriptionItems,
      medicines: medicineStats,
      statuses: statusStats,
    }

    // --- E. QUEUES & OPERATIONAL ---
    const polyclinicMap: Record<string, number> = {}
    const queueStatusMap: Record<string, number> = {}

    queues.forEach((q) => {
      const poly = q.polyclinic || 'Poli Umum'
      polyclinicMap[poly] = (polyclinicMap[poly] || 0) + 1

      const st = q.status || 'MENUNGGU'
      queueStatusMap[st] = (queueStatusMap[st] || 0) + 1
    })

    const polyclinicStats: PolyclinicStat[] = Object.entries(polyclinicMap)
      .map(([polyclinic, count]) => ({ polyclinic, count }))
      .sort((a, b) => b.count - a.count)

    const queueStatusStats: QueueStatusStat[] = Object.entries(queueStatusMap)
      .map(([status, count]) => ({ status, count }))

    const queueReport: QueueReport = {
      total: totalQueues,
      byPolyclinic: polyclinicStats,
      byStatus: queueStatusStats,
    }

    // --- F. FINANCIAL & REVENUE ---
    const payments = await prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: start,
          lte: end,
        },
      },
    })

    const billings = await prisma.billing.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    })

    let totalRevenue = 0
    const methodCounts: Record<'TUNAI' | 'QRIS' | 'TRANSFER', { count: number; totalAmount: number }> = {
      TUNAI: { count: 0, totalAmount: 0 },
      QRIS: { count: 0, totalAmount: 0 },
      TRANSFER: { count: 0, totalAmount: 0 },
    }

    payments.forEach((p) => {
      totalRevenue += p.totalAmount
      const method = (p.paymentMethod as 'TUNAI' | 'QRIS' | 'TRANSFER') || 'TUNAI'
      if (methodCounts[method]) {
        methodCounts[method].count++
        methodCounts[method].totalAmount += p.totalAmount
      }
    })

    const paymentMethods: PaymentMethodStat[] = (['TUNAI', 'QRIS', 'TRANSFER'] as const).map((method) => {
      const stat = methodCounts[method]
      const percentage = totalRevenue > 0 ? Math.round((stat.totalAmount / totalRevenue) * 100) : 0
      return {
        method,
        count: stat.count,
        totalAmount: stat.totalAmount,
        percentage,
      }
    })

    let totalPaidAmount = 0
    let paidCount = 0
    let totalUnpaidAmount = 0
    let unpaidCount = 0

    let registrationFee = 0
    let consultationFee = 0
    let medicineFee = 0
    let otherFee = 0

    billings.forEach((b) => {
      registrationFee += b.registrationFee || 0
      consultationFee += b.consultationFee || 0
      medicineFee += b.medicineFee || 0
      otherFee += b.otherFee || 0

      if (b.status === 'LUNAS') {
        paidCount++
        totalPaidAmount += b.totalAmount
      } else if (b.status === 'BELUM_LUNAS') {
        unpaidCount++
        totalUnpaidAmount += b.totalAmount
      }
    })

    const totalCompletedPayments = payments.length
    const averageTransaction = totalCompletedPayments > 0 ? Math.round(totalRevenue / totalCompletedPayments) : 0

    const financial: FinancialReport = {
      totalRevenue,
      totalPaidAmount,
      totalUnpaidAmount,
      paidCount,
      unpaidCount,
      averageTransaction,
      paymentMethods,
      feeBreakdown: {
        registrationFee,
        consultationFee,
        medicineFee,
        otherFee,
      },
    }

    return {
      success: true,
      data: {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        summary,
        examinations,
        demographics,
        prescriptions,
        queues: queueReport,
        financial,
      },
    }
  } catch (error: any) {
    console.error('Error generating report data:', error)
    return {
      success: false,
      error: 'Gagal mengambil data laporan: ' + (error.message || 'Kesalahan server'),
    }
  }
}
