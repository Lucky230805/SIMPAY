'use server'

import { prisma } from '@/lib/prisma'
import { parseNoRM } from '@/lib/patient-utils'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth'


export interface GetMedicalRecordsParams {
  search?: string
  dateRange?: string // 'all' | 'today' | '7days' | '30days'
  diagnosis?: string
  patientId?: number
  page?: number
  pageSize?: number
}

export interface MedicalRecordAddendumItem {
  id: number
  medicalRecordId: number
  doctorId: number | null
  doctorName: string
  doctorSip: string | null
  fieldChanged: string
  reason: string
  content: string
  previousValue: string | null
  createdAt: Date
}

export interface MedicalRecordAuditLogItem {
  id: number
  medicalRecordId: number
  userId: number | null
  userName: string
  userRole: string
  action: string
  details: string | null
  ipAddress: string | null
  createdAt: Date
}

export interface MedicalRecordItem {
  id: number
  patientId: number
  doctorId: number | null
  queueId?: number | null
  examinationDate: Date
  complaint: string | null
  diagnosis: string | null
  treatment: string | null
  notes: string | null
  icd10Code: string | null
  secondaryDiagnosis: string | null
  bloodPressure: string | null
  temperature: string | null
  heartRate: string | null
  respiratoryRate: string | null
  allergy: string | null
  status?: string | null
  isLocked?: boolean
  lockedAt?: Date | null
  patient: {
    id: number
    name: string
    dateOfBirth: Date
    gender: string
    phone: string | null
    address: string | null
  }
  doctor: {
    id: number
    name: string
    role: string
  } | null
  prescriptions: {
    id: number
    medicineName: string
    dosage: string
    instructions: string | null
  }[]
  addendums?: MedicalRecordAddendumItem[]
  auditLogs?: MedicalRecordAuditLogItem[]
}

export interface GetMedicalRecordsResult {
  records: MedicalRecordItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

function enrichMedicalRecord(mr: any): MedicalRecordItem {
  if (!mr) return mr
  let bp = mr.bloodPressure
  let temp = mr.temperature
  let hr = mr.heartRate
  let notes = mr.notes

  if (mr.treatment) {
    if (!bp && mr.treatment.includes('TD:')) {
      const match = mr.treatment.match(/TD:\s*([^,\n]+)/)
      if (match && match[1] && match[1].trim() !== '-') bp = match[1].trim()
    }
    if (!temp && mr.treatment.includes('Suhu:')) {
      const match = mr.treatment.match(/Suhu:\s*([^,\n]+)/)
      if (match && match[1] && match[1].trim() !== '-') temp = match[1].trim()
    }
    if (!hr && mr.treatment.includes('Nadi:')) {
      const match = mr.treatment.match(/Nadi:\s*([^,\n]+)/)
      if (match && match[1] && match[1].trim() !== '-') hr = match[1].trim()
    }
    if (!notes && mr.treatment.includes('Catatan Objektif:')) {
      const match = mr.treatment.match(/Catatan Objektif:\s*([^\n]+)/)
      if (match && match[1] && match[1].trim() !== '-' && match[1].trim() !== 'Tidak ada resep') {
        notes = match[1].trim()
      }
    }
  }

  const isLocked = Boolean(mr.isLocked || mr.status === 'SELESAI')

  return {
    ...mr,
    bloodPressure: bp,
    temperature: temp,
    heartRate: hr,
    notes: notes,
    isLocked,
    addendums: mr.addendums || [],
    auditLogs: mr.auditLogs || [],
  }
}

export async function getMedicalRecords(
  params: GetMedicalRecordsParams = {}
): Promise<GetMedicalRecordsResult> {
  await requireAuth()
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.max(1, params.pageSize || 5)
  const skip = (page - 1) * pageSize

  const search = params.search?.trim() || ''
  const dateRange = params.dateRange || 'all'
  const diagnosisFilter = params.diagnosis?.trim() || 'all'
  const patientId = params.patientId

  const andConditions: any[] = []

  // Specific patient filter (if on patient detail page)
  if (patientId) {
    andConditions.push({ patientId })
  }

  // Date range filter
  if (dateRange && dateRange !== 'all') {
    const now = new Date()
    const startDate = new Date()

    if (dateRange === 'today') {
      startDate.setHours(0, 0, 0, 0)
      andConditions.push({
        examinationDate: {
          gte: startDate,
        },
      })
    } else if (dateRange === '7days') {
      startDate.setDate(now.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
      andConditions.push({
        examinationDate: {
          gte: startDate,
        },
      })
    } else if (dateRange === '30days') {
      startDate.setDate(now.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
      andConditions.push({
        examinationDate: {
          gte: startDate,
        },
      })
    }
  }

  // Diagnosis filter
  if (diagnosisFilter && diagnosisFilter !== 'all') {
    andConditions.push({
      OR: [
        { diagnosis: { contains: diagnosisFilter, mode: 'insensitive' } },
        { icd10Code: { contains: diagnosisFilter, mode: 'insensitive' } },
      ],
    })
  }

  // Search filter (patient name, RM number, complaint, diagnosis)
  if (search) {
    const rmId = parseNoRM(search)
    const orConditions: any[] = [
      { patient: { name: { contains: search, mode: 'insensitive' } } },
      { diagnosis: { contains: search, mode: 'insensitive' } },
      { icd10Code: { contains: search, mode: 'insensitive' } },
      { complaint: { contains: search, mode: 'insensitive' } },
    ]

    if (rmId !== null) {
      orConditions.push({ patientId: rmId })
    }

    andConditions.push({ OR: orConditions })
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {}

  try {
    const [total, records] = await Promise.all([
      prisma.medicalRecord.count({ where }),
      prisma.medicalRecord.findMany({
        where,
        orderBy: { examinationDate: 'desc' },
        skip,
        take: pageSize,
        include: {
          patient: true,
          doctor: true,
          prescriptions: true,
          addendums: {
            orderBy: { createdAt: 'asc' },
          },
          auditLogs: {
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
    ])

    return {
      records: records.map(enrichMedicalRecord),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    }
  } catch (error: any) {
    console.error('Error fetching medical records:', error)
    return {
      records: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    }
  }
}

export async function getMedicalRecordById(id: number): Promise<MedicalRecordItem | null> {
  await requireAuth()
  try {
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        prescriptions: true,
        addendums: {
          orderBy: { createdAt: 'asc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    return record ? enrichMedicalRecord(record) : null
  } catch (error: any) {
    console.error(`Error fetching medical record ${id}:`, error)
    return null
  }
}

export async function getPatientMedicalHistory(patientId: number): Promise<MedicalRecordItem[]> {
  await requireAuth()
  try {
    const records = await prisma.medicalRecord.findMany({
      where: { patientId },
      orderBy: { examinationDate: 'desc' },
      include: {
        patient: true,
        doctor: true,
        prescriptions: true,
        addendums: {
          orderBy: { createdAt: 'asc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    return records.map(enrichMedicalRecord)
  } catch (error: any) {
    console.error(`Error fetching medical history for patient ${patientId}:`, error)
    return []
  }
}

export async function getDistinctDiagnoses(): Promise<{ code: string; name: string }[]> {
  await requireAuth()
  try {
    const records = await prisma.medicalRecord.findMany({
      select: {
        diagnosis: true,
        icd10Code: true,
      },
      distinct: ['diagnosis'],
    })

    const list = records
      .filter((r) => r.diagnosis)
      .map((r) => ({
        code: r.icd10Code || '',
        name: r.diagnosis || '',
      }))

    return list
  } catch (error: any) {
    console.error('Error fetching diagnoses:', error)
    return []
  }
}

export interface MedicalRecordInput {
  patientId: number
  examinationDate?: string
  complaint?: string
  diagnosis: string
  icd10Code?: string
  secondaryDiagnosis?: string
  bloodPressure?: string
  temperature?: string
  heartRate?: string
  respiratoryRate?: string
  allergy?: string
  treatment?: string
  notes?: string
  doctorId?: number
}

export async function createMedicalRecord(data: MedicalRecordInput) {
  let doctorUser: any
  try {
    doctorUser = await requireRole('DOKTER')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  const errors: Record<string, string> = {}

  if (!data.patientId) {
    errors.patientId = 'Pasien wajib dipilih'
  }

  if (!data.diagnosis || data.diagnosis.trim().length < 2) {
    errors.diagnosis = 'Diagnosis utama wajib diisi (minimal 2 karakter)'
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors }
  }

  try {
    const doctorId = doctorUser.id

    const created = await prisma.$transaction(async (tx) => {
      const rec = await tx.medicalRecord.create({
        data: {
          patientId: data.patientId,
          doctorId: doctorId,
          examinationDate: data.examinationDate ? new Date(data.examinationDate) : new Date(),
          complaint: data.complaint?.trim() || null,
          diagnosis: data.diagnosis.trim(),
          icd10Code: data.icd10Code?.trim() || null,
          secondaryDiagnosis: data.secondaryDiagnosis?.trim() || null,
          bloodPressure: data.bloodPressure?.trim() || null,
          temperature: data.temperature?.trim() || null,
          heartRate: data.heartRate?.trim() || null,
          respiratoryRate: data.respiratoryRate?.trim() || null,
          allergy: data.allergy?.trim() || null,
          treatment: data.treatment?.trim() || null,
          notes: data.notes?.trim() || null,
          status: 'ANTRE',
          isLocked: false,
        },
        include: {
          patient: true,
          doctor: true,
          prescriptions: true,
          addendums: true,
          auditLogs: true,
        },
      })

      // Catat audit trail pembuatan
      await tx.medicalRecordAuditLog.create({
        data: {
          medicalRecordId: rec.id,
          userId: doctorUser.id,
          userName: doctorUser.name,
          userRole: 'DOKTER',
          action: 'CREATE',
          details: `Pembuatan rekam medis awal untuk pasien ID #${data.patientId}. Diagnosis: ${rec.diagnosis}.`,
        },
      })

      return rec
    })

    try {
      revalidatePath('/rekam-medis')
      revalidatePath(`/pasien/${data.patientId}`)
      revalidatePath('/dashboard')
    } catch {
      // Ignored outside request context
    }

    return { success: true, record: enrichMedicalRecord(created) }
  } catch (error: any) {
    console.error('Error creating medical record:', error)
    return {
      success: false,
      error: 'Gagal membuat rekam medis: ' + (error.message || 'Kesalahan server'),
    }
  }
}

export async function updateMedicalRecord(id: number, data: Partial<MedicalRecordInput>) {
  let doctorUser: any
  try {
    doctorUser = await requireRole('DOKTER')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  const errors: Record<string, string> = {}

  if (data.diagnosis !== undefined && (!data.diagnosis || data.diagnosis.trim().length < 2)) {
    errors.diagnosis = 'Diagnosis utama wajib diisi (minimal 2 karakter)'
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors }
  }

  try {
    const existing = await prisma.medicalRecord.findUnique({
      where: { id },
      select: { id: true, isLocked: true, status: true, patientId: true, diagnosis: true },
    })

    if (!existing) {
      return { success: false, error: 'Rekam medis tidak ditemukan' }
    }

    // Hard locking check: jika sudah dikunci atau status SELESAI, tolak direct edit!
    if (existing.isLocked || existing.status === 'SELESAI') {
      return {
        success: false,
        error:
          'Rekam medis telah difinalisasi dan dikunci permanen. Perubahan atau koreksi klinis wajib dicatat melalui mekanisme Addendum sesuai standar Permenkes No. 24 Tahun 2022.',
        isLocked: true,
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.medicalRecord.update({
        where: { id },
        data: {
          complaint: data.complaint !== undefined ? data.complaint?.trim() || null : undefined,
          diagnosis: data.diagnosis !== undefined ? data.diagnosis.trim() : undefined,
          icd10Code: data.icd10Code !== undefined ? data.icd10Code?.trim() || null : undefined,
          secondaryDiagnosis:
            data.secondaryDiagnosis !== undefined ? data.secondaryDiagnosis?.trim() || null : undefined,
          bloodPressure: data.bloodPressure !== undefined ? data.bloodPressure?.trim() || null : undefined,
          temperature: data.temperature !== undefined ? data.temperature?.trim() || null : undefined,
          heartRate: data.heartRate !== undefined ? data.heartRate?.trim() || null : undefined,
          respiratoryRate:
            data.respiratoryRate !== undefined ? data.respiratoryRate?.trim() || null : undefined,
          allergy: data.allergy !== undefined ? data.allergy?.trim() || null : undefined,
          treatment: data.treatment !== undefined ? data.treatment?.trim() || null : undefined,
          notes: data.notes !== undefined ? data.notes?.trim() || null : undefined,
        },
        include: {
          patient: true,
          doctor: true,
          prescriptions: true,
          addendums: { orderBy: { createdAt: 'asc' } },
          auditLogs: { orderBy: { createdAt: 'desc' } },
        },
      })

      // Catat audit trail perubahan draft
      await tx.medicalRecordAuditLog.create({
        data: {
          medicalRecordId: id,
          userId: doctorUser.id,
          userName: doctorUser.name,
          userRole: 'DOKTER',
          action: 'UPDATE_DRAFT',
          details: `Pembaruan draf sebelum finalisasi. Diagnosis baru: ${rec.diagnosis}.`,
        },
      })

      return rec
    })

    try {
      revalidatePath('/rekam-medis')
      revalidatePath(`/pasien/${updated.patientId}`)
      revalidatePath('/dashboard')
    } catch {
      // Ignored outside request context
    }

    return { success: true, record: enrichMedicalRecord(updated) }
  } catch (error: any) {
    console.error(`Error updating medical record ${id}:`, error)
    return {
      success: false,
      error: 'Gagal memperbarui rekam medis: ' + (error.message || 'Kesalahan server'),
    }
  }
}

export interface CreateAddendumInput {
  medicalRecordId: number
  fieldChanged: string // 'Diagnosis' | 'Terapi' | 'Tanda Vital' | 'Catatan' | 'Lainnya'
  reason: string
  content: string
  previousValue?: string
}

export async function createMedicalRecordAddendum(data: CreateAddendumInput) {
  let doctorUser: any
  try {
    doctorUser = await requireRole('DOKTER')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  if (!data.medicalRecordId) {
    return { success: false, error: 'ID Rekam Medis wajib ditentukan' }
  }

  if (!data.fieldChanged || data.fieldChanged.trim().length < 2) {
    return { success: false, error: 'Kategori/bagian yang dikoreksi wajib diisi' }
  }

  if (!data.reason || data.reason.trim().length < 3) {
    return { success: false, error: 'Alasan koreksi resmi wajib diisi (minimal 3 karakter)' }
  }

  if (!data.content || data.content.trim().length < 3) {
    return { success: false, error: 'Catatan koreksi / addendum wajib diisi (minimal 3 karakter)' }
  }

  try {
    const mr = await prisma.medicalRecord.findUnique({
      where: { id: data.medicalRecordId },
      include: { doctor: true },
    })

    if (!mr) {
      return { success: false, error: 'Rekam medis tidak ditemukan' }
    }

    const doctorProfile = await prisma.user.findUnique({
      where: { id: doctorUser.id },
      select: { name: true, sipNumber: true },
    })

    const addendum = await prisma.$transaction(async (tx) => {
      // 1. Buat catatan addendum resmi
      const created = await tx.medicalRecordAddendum.create({
        data: {
          medicalRecordId: data.medicalRecordId,
          doctorId: doctorUser.id,
          doctorName: doctorProfile?.name || doctorUser.name,
          doctorSip: doctorProfile?.sipNumber || null,
          fieldChanged: data.fieldChanged.trim(),
          reason: data.reason.trim(),
          content: data.content.trim(),
          previousValue: data.previousValue?.trim() || null,
        },
      })

      // 2. Pastikan rekam medis terkunci secara permanen
      await tx.medicalRecord.update({
        where: { id: data.medicalRecordId },
        data: {
          isLocked: true,
          lockedAt: mr.lockedAt || new Date(),
          lockedById: mr.lockedById || doctorUser.id,
        },
      })

      // 3. Catat jejak audit forensik
      await tx.medicalRecordAuditLog.create({
        data: {
          medicalRecordId: data.medicalRecordId,
          userId: doctorUser.id,
          userName: doctorProfile?.name || doctorUser.name,
          userRole: 'DOKTER',
          action: 'ADDENDUM',
          details: `Addendum pada bagian [${data.fieldChanged.trim()}]. Alasan: ${data.reason.trim()}. Koreksi: ${data.content.trim()}`,
        },
      })

      return created
    })

    try {
      revalidatePath('/rekam-medis')
      revalidatePath(`/pasien/${mr.patientId}`)
      revalidatePath('/dashboard')
    } catch {}

    return { success: true, addendum }
  } catch (error: any) {
    console.error('Error creating medical record addendum:', error)
    return {
      success: false,
      error: 'Gagal mencatat addendum: ' + (error.message || 'Kesalahan server'),
    }
  }
}

export async function getMedicalRecordAuditTrail(medicalRecordId: number) {
  await requireAuth()
  try {
    const logs = await prisma.medicalRecordAuditLog.findMany({
      where: { medicalRecordId },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, logs }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal memuat log audit' }
  }
}
