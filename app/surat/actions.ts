'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'

export interface SuratItem {
  id: number
  certificateNo: string
  type: 'SAKIT' | 'SEHAT'
  patientId: number
  patientName: string
  patientDob: Date
  patientGender: string
  patientAddress: string | null
  patientPhone: string | null
  doctorId?: number | null
  doctorName?: string | null
  doctorSip?: string | null
  issuedById: number | null
  issuedByName: string
  date: Date
  
  // Surat Sakit fields
  startDate?: Date | null
  endDate?: Date | null
  durationDays?: number | null
  diagnosis?: string | null
  occupation?: string | null

  // Surat Sehat fields
  heightCm?: number | null
  weightKg?: number | null
  bloodPressure?: string | null
  bloodType?: string | null
  colorBlind?: string | null
  purpose?: string | null

  notes?: string | null
  createdAt: Date
}

export async function getPatientsForSuratAction() {
  await requireAuth()
  try {
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        name: true,
        dateOfBirth: true,
        gender: true,
        occupation: true,
        address: true,
        phone: true,
      },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: patients }
  } catch (error: any) {
    console.error('Error fetching patients for surat:', error)
    return { success: false, error: 'Gagal mengambil data pasien.' }
  }
}

export async function getDoctorsAction() {
  await requireAuth()
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOKTER' },
      select: {
        id: true,
        name: true,
        sipNumber: true,
      },
      orderBy: { name: 'asc' },
    })
    return { success: true, data: doctors }
  } catch (error: any) {
    console.error('Error fetching doctors:', error)
    return { success: false, error: 'Gagal mengambil data dokter.' }
  }
}

export async function getSuratListAction(params?: { search?: string; type?: string }) {
  await requireAuth()
  try {
    const whereClause: any = {}

    if (params?.type && (params.type === 'SAKIT' || params.type === 'SEHAT')) {
      whereClause.type = params.type
    }

    if (params?.search && params.search.trim() !== '') {
      const q = params.search.trim()
      whereClause.OR = [
        { certificateNo: { contains: q, mode: 'insensitive' } },
        { patient: { name: { contains: q, mode: 'insensitive' } } },
        { doctorName: { contains: q, mode: 'insensitive' } },
        { issuedByName: { contains: q, mode: 'insensitive' } },
        { purpose: { contains: q, mode: 'insensitive' } },
        { diagnosis: { contains: q, mode: 'insensitive' } },
      ]
    }

    const records = await prisma.medicalCertificate.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            gender: true,
            occupation: true,
            address: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            sipNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const formatted: SuratItem[] = records.map((r) => ({
      id: r.id,
      certificateNo: r.certificateNo,
      type: r.type as 'SAKIT' | 'SEHAT',
      patientId: r.patientId,
      patientName: r.patient.name,
      patientDob: r.patient.dateOfBirth,
      patientGender: r.patient.gender,
      patientAddress: r.patient.address,
      patientPhone: r.patient.phone,
      doctorId: r.doctorId,
      doctorName: r.doctorName || r.doctor?.name || 'dr. Raniisyana Romula Rekkers',
      doctorSip: r.doctorSip || r.doctor?.sipNumber || 'No. 446.1 /0085/ DPMPTSP / SIP-3 / DUM / VI/ 2020',
      issuedById: r.issuedById,
      issuedByName: r.issuedByName,
      date: r.date,
      startDate: r.startDate,
      endDate: r.endDate,
      durationDays: r.durationDays,
      diagnosis: r.diagnosis,
      occupation: r.patient.occupation || r.occupation || null,
      heightCm: r.heightCm,
      weightKg: r.weightKg,
      bloodPressure: r.bloodPressure,
      bloodType: r.bloodType,
      colorBlind: r.colorBlind,
      purpose: r.purpose,
      notes: r.notes,
      createdAt: r.createdAt,
    }))

    return { success: true, data: formatted }
  } catch (error: any) {
    console.error('Error fetching surat list:', error)
    return { success: false, error: 'Gagal mengambil daftar surat.' }
  }
}

export async function createSuratSakitAction(payload: {
  patientId: number
  doctorId?: number
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  diagnosis?: string
  occupation?: string
  notes?: string
}) {
  const user = await requireAuth()

  try {
    const start = new Date(payload.startDate)
    const end = new Date(payload.endDate)
    
    // Calculate duration in days (inclusive)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    const dateNow = new Date()
    const year = dateNow.getFullYear()
    const month = String(dateNow.getMonth() + 1).padStart(2, '0')

    const count = await prisma.medicalCertificate.count({
      where: {
        type: 'SAKIT',
        createdAt: {
          gte: new Date(year, dateNow.getMonth(), 1),
          lt: new Date(year, dateNow.getMonth() + 1, 1),
        },
      },
    })

    const seq = String(count + 1).padStart(3, '0')
    const certificateNo = `SKS/${year}/${month}/${seq}`

    // Resolve doctor details
    let doctorId = payload.doctorId || null
    let doctorName = null
    let doctorSip = null

    if (doctorId) {
      const doc = await prisma.user.findUnique({ where: { id: doctorId } })
      if (doc) {
        doctorName = doc.name
        doctorSip = doc.sipNumber
      }
    } else {
      // Fallback: pick first doctor user from DB
      const defaultDoc = await prisma.user.findFirst({ where: { role: 'DOKTER' } })
      if (defaultDoc) {
        doctorId = defaultDoc.id
        doctorName = defaultDoc.name
        doctorSip = defaultDoc.sipNumber
      }
    }

    const newSurat = await prisma.medicalCertificate.create({
      data: {
        certificateNo,
        type: 'SAKIT',
        patientId: payload.patientId,
        doctorId,
        doctorName,
        doctorSip,
        issuedById: user.id,
        issuedByName: user.name,
        date: dateNow,
        startDate: start,
        endDate: end,
        durationDays,
        diagnosis: payload.diagnosis || null,
        occupation: payload.occupation || null,
        notes: payload.notes || null,
      },
    })

    if (payload.occupation && payload.occupation.trim() !== '') {
      try {
        await prisma.patient.update({
          where: { id: payload.patientId },
          data: { occupation: payload.occupation.trim() },
        })
      } catch {}
    }

    try { revalidatePath('/surat') } catch {}
    return { success: true, data: newSurat }
  } catch (error: any) {
    console.error('Error creating Surat Sakit:', error)
    return { success: false, error: error?.message || 'Gagal membuat Surat Keterangan Sakit.' }
  }
}

export async function createSuratSehatAction(payload: {
  patientId: number
  doctorId?: number
  heightCm?: number
  weightKg?: number
  bloodPressure?: string
  bloodType?: string
  colorBlind?: string
  purpose?: string
  notes?: string
}) {
  const user = await requireAuth()

  try {
    const dateNow = new Date()
    const year = dateNow.getFullYear()
    const month = String(dateNow.getMonth() + 1).padStart(2, '0')

    const count = await prisma.medicalCertificate.count({
      where: {
        type: 'SEHAT',
        createdAt: {
          gte: new Date(year, dateNow.getMonth(), 1),
          lt: new Date(year, dateNow.getMonth() + 1, 1),
        },
      },
    })

    const seq = String(count + 1).padStart(3, '0')
    const certificateNo = `SKSEHAT/${year}/${month}/${seq}`

    // Resolve doctor details
    let doctorId = payload.doctorId || null
    let doctorName = null
    let doctorSip = null

    if (doctorId) {
      const doc = await prisma.user.findUnique({ where: { id: doctorId } })
      if (doc) {
        doctorName = doc.name
        doctorSip = doc.sipNumber
      }
    } else {
      const defaultDoc = await prisma.user.findFirst({ where: { role: 'DOKTER' } })
      if (defaultDoc) {
        doctorId = defaultDoc.id
        doctorName = defaultDoc.name
        doctorSip = defaultDoc.sipNumber
      }
    }

    const newSurat = await prisma.medicalCertificate.create({
      data: {
        certificateNo,
        type: 'SEHAT',
        patientId: payload.patientId,
        doctorId,
        doctorName,
        doctorSip,
        issuedById: user.id,
        issuedByName: user.name,
        date: dateNow,
        heightCm: payload.heightCm ? Number(payload.heightCm) : null,
        weightKg: payload.weightKg ? Number(payload.weightKg) : null,
        bloodPressure: payload.bloodPressure || null,
        bloodType: payload.bloodType || null,
        colorBlind: payload.colorBlind || null,
        purpose: payload.purpose || null,
        notes: payload.notes || null,
      },
    })

    try { revalidatePath('/surat') } catch {}
    return { success: true, data: newSurat }
  } catch (error: any) {
    console.error('Error creating Surat Sehat:', error)
    return { success: false, error: error?.message || 'Gagal membuat Surat Keterangan Sehat.' }
  }
}

export async function deleteSuratAction(id: number) {
  await requireAuth()
  try {
    await prisma.medicalCertificate.delete({
      where: { id },
    })
    try { revalidatePath('/surat') } catch {}
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting surat:', error)
    return { success: false, error: 'Gagal menghapus surat.' }
  }
}
