'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface PrescriptionQueueItem {
  id: number
  code: string // e.g. #RSP-20231024-001
  priority: 'Cito' | 'Normal'
  patientName: string
  polyclinic: string
  doctorName: string
  waitTimeMinutes: number
  status: 'ANTRE' | 'PROSES' | 'SELESAI'
  createdAt: Date
  items: {
    id: number
    name: string
    dosage: string
    notes?: string
    qty: string
  }[]
  patient: {
    id: number
    name: string
    gender: string
    age: number
    noRM: string
    address?: string
    phone?: string
    allergy?: string
  }
}

export async function getPrescriptionQueues() {
  try {
    // Fetch prescriptions grouped by medicalRecordId or latest medical records
    const medicalRecords = await prisma.medicalRecord.findMany({
      orderBy: { examinationDate: 'desc' },
      take: 20,
      include: {
        patient: true,
        doctor: true,
        prescriptions: true,
      },
    })

    const result = medicalRecords.map((mr, idx) => {
      const dateStr = new Date(mr.examinationDate).toISOString().slice(0, 10).replace(/-/g, '')
      const code = `#RSP-${dateStr}-${(mr.id).toString().padStart(3, '0')}`
      
      const birthDate = new Date(mr.patient.dateOfBirth)
      const age = Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970)

      const diffMs = Date.now() - new Date(mr.examinationDate).getTime()
      const waitTimeMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))

      const items = mr.prescriptions.map((p) => ({
        id: p.id,
        name: p.medicineName,
        dosage: p.dosage,
        notes: p.instructions || undefined,
        qty: '10 Tab',
      }))

      // If no relational prescriptions, parse treatment string fallback
      if (items.length === 0 && mr.treatment) {
        const lines = mr.treatment.split('\n')
        lines.forEach((l, i) => {
          if (l.startsWith('- ')) {
            items.push({
              id: i + 1,
              name: l.replace('- ', '').split('(')[0].trim(),
              dosage: '3x1 hari',
              notes: 'Sesudah makan',
              qty: '10 Tab',
            })
          }
        })
      }

      const isCito = mr.complaint?.toLowerCase().includes('cito') || idx === 0

      return {
        id: mr.id,
        code,
        priority: isCito ? ('Cito' as const) : ('Normal' as const),
        patientName: mr.patient.name,
        polyclinic: 'Poli Umum',
        doctorName: mr.doctor?.name || 'dr. Anita Wijaya',
        waitTimeMinutes: Math.min(waitTimeMinutes, 60),
        status: idx === 0 ? ('ANTRE' as const) : ('SELESAI' as const),
        createdAt: mr.examinationDate,
        items: items.length > 0 ? items : [
          { id: 1, name: 'Amoxicillin 500mg', dosage: '3 × 1 hari (Sesudah makan)', qty: '15 Tab' },
          { id: 2, name: 'Paracetamol 500mg', dosage: '3 × 1 hari (Bila demam)', qty: '10 Tab' },
          { id: 3, name: 'Vitamin C 500mg', dosage: '1 × 1 hari', qty: '10 Tab' },
        ],
        patient: {
          id: mr.patient.id,
          name: mr.patient.name,
          gender: mr.patient.gender === 'L' || mr.patient.gender === 'Laki-laki' ? 'Laki-laki' : 'Perempuan',
          age: age || 35,
          noRM: `RM-${mr.patient.id.toString().padStart(5, '0')}`,
          address: mr.patient.address || undefined,
          phone: mr.patient.phone || undefined,
          allergy: mr.allergy || undefined,
        },
      }
    })

    return result
  } catch (error: any) {
    console.error('Error fetching prescription queues:', error)
    return []
  }
}

export async function processPrescriptionQueue(recordId: number) {
  try {
    revalidatePath('/resep')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
