'use server'

import { prisma } from '@/lib/prisma'
import { parseNoRM } from '@/lib/patient-utils'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth'


export interface GetPatientsParams {
  search?: string
  gender?: string
  page?: number
  pageSize?: number
}

export interface PatientRecord {
  id: number
  name: string
  dateOfBirth: Date
  gender: string
  address: string | null
  phone: string | null
  _count?: {
    medicalRecords: number
    queues: number
    prescriptions: number
  }
}

export interface GetPatientsResult {
  patients: PatientRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getPatients(params: GetPatientsParams = {}): Promise<GetPatientsResult> {
  await requireAuth()
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.max(1, params.pageSize || 5)
  const skip = (page - 1) * pageSize

  const search = params.search?.trim() || ''
  const gender = params.gender?.trim() || ''

  const andConditions: any[] = []

  if (gender && gender !== 'ALL') {
    andConditions.push({ gender: { equals: gender } })
  }

  if (search) {
    const rmId = parseNoRM(search)
    const orConditions: any[] = [
      { name: { contains: search } },
      { phone: { contains: search } },
      { address: { contains: search } },
    ]

    if (rmId !== null) {
      orConditions.push({ id: { equals: rmId } })
    }

    andConditions.push({ OR: orConditions })
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {}

  try {
    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take: pageSize,
        include: {
          _count: {
            select: {
              medicalRecords: true,
              queues: true,
              prescriptions: true,
            },
          },
        },
      }),
    ])

    return {
      patients,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    }
  } catch (error: any) {
    console.error('Error fetching patients:', error)
    throw new Error('Gagal mengambil data pasien: ' + (error.message || 'Kesalahan database'))
  }
}

export async function getPatientById(id: number) {
  await requireAuth()
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        medicalRecords: {
          orderBy: { examinationDate: 'desc' },
        },
        queues: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        prescriptions: {
          orderBy: { id: 'desc' },
          take: 5,
        },
      },
    })

    return patient
  } catch (error: any) {
    console.error(`Error fetching patient with id ${id}:`, error)
    throw new Error('Gagal memuat detail pasien')
  }
}

export interface PatientInput {
  name: string
  dateOfBirth: string
  gender: string
  phone?: string
  address?: string
}

export async function createPatient(data: PatientInput & { polyclinic?: string }) {
  try {
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  // 1. Validation
  const errors: Record<string, string> = {}

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Nama pasien minimal 2 karakter'
  }

  if (!data.gender || !['Laki-laki', 'Perempuan'].includes(data.gender)) {
    errors.gender = 'Pilih jenis kelamin yang valid (Laki-laki atau Perempuan)'
  }

  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Tanggal lahir wajib diisi'
  } else {
    const dob = new Date(data.dateOfBirth)
    if (isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Format tanggal lahir tidak valid'
    } else if (dob > new Date()) {
      errors.dateOfBirth = 'Tanggal lahir tidak boleh di masa depan'
    }
  }

  if (data.phone && data.phone.trim().length > 0) {
    const phoneClean = data.phone.trim()
    if (!/^[0-9]{7,13}$/.test(phoneClean)) {
      errors.phone = 'Nomor telepon hanya boleh berisi angka (7-13 digit)'
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors }
  }

  try {
    // Gunakan transaction agar data Patient dan Queue tersimpan bersamaan dengan aman
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat data pasien baru
      const newPatient = await tx.patient.create({
        data: {
          name: data.name.trim(),
          dateOfBirth: new Date(data.dateOfBirth),
          gender: data.gender,
          phone: data.phone?.trim() || null,
          address: data.address?.trim() || null,
        },
      })

      // 2. Hitung nomor urut antrean untuk hari ini
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date()
      endOfDay.setHours(23, 59, 59, 999)

      const todayQueueCount = await tx.queue.count({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      })

      const nextQueueNumber = todayQueueCount + 1

      // 3. Buat data antrean otomatis untuk hari ini
      await tx.queue.create({
        data: {
          patientId: newPatient.id,
          queueNumber: nextQueueNumber,
          status: 'MENUNGGU',
          polyclinic: data.polyclinic || 'Poli Umum',
        },
      })

      return newPatient
    })

    try {
      revalidatePath('/pasien')
      revalidatePath('/antrean')
      revalidatePath('/dashboard')
    } catch {
      // Ignored outside request context
    }

    return {
      success: true,
      patient: result,
    }
  } catch (error: any) {
    console.error('Error creating patient and queue:', error)
    return {
      success: false,
      error: 'Gagal menyimpan pasien dan membuat antrean: ' + (error.message || 'Kesalahan server'),
    }
  }
}

export async function updatePatient(id: number, data: PatientInput) {
  try {
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  // 1. Validation
  const errors: Record<string, string> = {}

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Nama pasien minimal 2 karakter'
  }

  if (!data.gender || !['Laki-laki', 'Perempuan'].includes(data.gender)) {
    errors.gender = 'Pilih jenis kelamin yang valid'
  }

  if (!data.dateOfBirth) {
    errors.dateOfBirth = 'Tanggal lahir wajib diisi'
  } else {
    const dob = new Date(data.dateOfBirth)
    if (isNaN(dob.getTime())) {
      errors.dateOfBirth = 'Format tanggal lahir tidak valid'
    } else if (dob > new Date()) {
      errors.dateOfBirth = 'Tanggal lahir tidak boleh di masa depan'
    }
  }

  if (data.phone && data.phone.trim().length > 0) {
    const phoneClean = data.phone.trim()
    if (!/^[0-9]{7,13}$/.test(phoneClean)) {
      errors.phone = 'Nomor telepon hanya boleh berisi angka (7-13 digit)'
    }
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors }
  }

  try {
    const updated = await prisma.patient.update({
      where: { id },
      data: {
        name: data.name.trim(),
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
      },
    })

    try {
      revalidatePath('/pasien')
      revalidatePath(`/pasien/${id}`)
      revalidatePath('/dashboard')
    } catch {
      // Ignored outside request context
    }

    return {
      success: true,
      patient: updated,
    }
  } catch (error: any) {
    console.error(`Error updating patient ${id}:`, error)
    return {
      success: false,
      error: 'Gagal memperbarui data pasien: ' + (error.message || 'Kesalahan server'),
    }
  }
}

export async function deletePatient(id: number) {
  try {
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  try {
    // Delete in sequence inside a transaction to prevent foreign key violation
    await prisma.$transaction(async (tx) => {
      // 1. Delete prescriptions
      await tx.prescription.deleteMany({ where: { patientId: id } })
      // 2. Delete queues
      await tx.queue.deleteMany({ where: { patientId: id } })
      // 3. Delete medical records
      await tx.medicalRecord.deleteMany({ where: { patientId: id } })
      // 4. Delete patient
      await tx.patient.delete({ where: { id } })
    })

    try {
      revalidatePath('/pasien')
      revalidatePath('/dashboard')
    } catch {
      // Ignored outside request context
    }

    return { success: true }
  } catch (error: any) {
    console.error(`Error deleting patient ${id}:`, error)
    return {
      success: false,
      error: 'Gagal menghapus data pasien: ' + (error.message || 'Kesalahan server'),
    }
  }
}

export async function getAllPatientsForExport() {
  await requireAuth()
  try {
    return await prisma.patient.findMany({
      orderBy: { id: 'asc' },
    })
  } catch (error: any) {
    console.error('Error exporting patients:', error)
    return []
  }
}

export interface MedicalHistoryFilter {
  startDate?: string
  endDate?: string
  search?: string
  icd10Code?: string
}

export interface PrescriptionDetail {
  id: number
  medicineName: string
  dosage: string
  instructions: string | null
  quantity: number | null
  unitPrice: number | null
  totalPrice: number | null
  status: string | null
}

export interface MedicalRecordHistoryItem {
  id: number
  examinationDate: Date
  complaint: string | null
  diagnosis: string | null
  secondaryDiagnosis: string | null
  icd10Code: string | null
  treatment: string | null
  notes: string | null
  bloodPressure: string | null
  temperature: string | null
  heartRate: string | null
  respiratoryRate: string | null
  allergy: string | null
  doctorName: string | null
  polyclinic: string | null
  queueNumber: number | null
  prescriptions: PrescriptionDetail[]
}

export interface PatientMedicalHistoryResult {
  success: boolean
  patient?: {
    id: number
    name: string
    dateOfBirth: Date
    gender: string
    phone: string | null
    address: string | null
  }
  medicalRecords?: MedicalRecordHistoryItem[]
  latestVitalSigns?: {
    bloodPressure: string | null
    temperature: string | null
    heartRate: string | null
    respiratoryRate: string | null
    allergy: string | null
  }
  error?: string
}

export async function getPatientMedicalHistory(
  patientId: number,
  filters: MedicalHistoryFilter = {}
): Promise<PatientMedicalHistoryResult> {
  await requireAuth()
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        name: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        address: true,
      },
    })

    if (!patient) {
      return { success: false, error: 'Pasien tidak ditemukan' }
    }

    const andConditions: any[] = [{ patientId }]

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const dateCond: any = {}
      if (filters.startDate) {
        const start = new Date(filters.startDate)
        start.setHours(0, 0, 0, 0)
        dateCond.gte = start
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate)
        end.setHours(23, 59, 59, 999)
        dateCond.lte = end
      }
      andConditions.push({ examinationDate: dateCond })
    }

    // Specific ICD-10 filter
    if (filters.icd10Code && filters.icd10Code.trim() !== '') {
      andConditions.push({
        icd10Code: { contains: filters.icd10Code.trim() },
      })
    }

    // Keyword search filter across complaint, diagnosis, secondaryDiagnosis, icd10Code, or prescription medicineName
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim()
      andConditions.push({
        OR: [
          { complaint: { contains: q } },
          { diagnosis: { contains: q } },
          { secondaryDiagnosis: { contains: q } },
          { icd10Code: { contains: q } },
          { prescriptions: { some: { medicineName: { contains: q } } } },
        ],
      })
    }

    const where = { AND: andConditions }

    const records = await prisma.medicalRecord.findMany({
      where,
      orderBy: [
        { examinationDate: 'desc' },
        { id: 'desc' },
      ],
      include: {
        doctor: {
          select: { id: true, name: true },
        },
        queue: {
          select: { id: true, polyclinic: true, queueNumber: true, date: true },
        },
        prescriptions: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            medicineName: true,
            dosage: true,
            instructions: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            status: true,
          },
        },
      },
    })

    // Fetch latest vital signs across all patient medical records for summary panel
    const latestRecordWithVitals = await prisma.medicalRecord.findFirst({
      where: { patientId },
      orderBy: [
        { examinationDate: 'desc' },
        { id: 'desc' },
      ],
      select: {
        bloodPressure: true,
        temperature: true,
        heartRate: true,
        respiratoryRate: true,
        allergy: true,
      },
    })

    const medicalRecords: MedicalRecordHistoryItem[] = records.map((r) => ({
      id: r.id,
      examinationDate: r.examinationDate,
      complaint: r.complaint,
      diagnosis: r.diagnosis,
      secondaryDiagnosis: r.secondaryDiagnosis,
      icd10Code: r.icd10Code,
      treatment: r.treatment,
      notes: r.notes,
      bloodPressure: r.bloodPressure,
      temperature: r.temperature,
      heartRate: r.heartRate,
      respiratoryRate: r.respiratoryRate,
      allergy: r.allergy,
      doctorName: r.doctor?.name || null,
      polyclinic: r.queue?.polyclinic || null,
      queueNumber: r.queue?.queueNumber || null,
      prescriptions: r.prescriptions,
    }))

    return {
      success: true,
      patient,
      medicalRecords,
      latestVitalSigns: latestRecordWithVitals
        ? {
            bloodPressure: latestRecordWithVitals.bloodPressure,
            temperature: latestRecordWithVitals.temperature,
            heartRate: latestRecordWithVitals.heartRate,
            respiratoryRate: latestRecordWithVitals.respiratoryRate,
            allergy: latestRecordWithVitals.allergy,
          }
        : {
            bloodPressure: null,
            temperature: null,
            heartRate: null,
            respiratoryRate: null,
            allergy: null,
          },
    }
  } catch (error: any) {
    console.error(`Error fetching medical history for patient ${patientId}:`, error)
    return {
      success: false,
      error: 'Gagal mengambil riwayat rekam medis pasien: ' + (error.message || 'Kesalahan database'),
    }
  }
}
