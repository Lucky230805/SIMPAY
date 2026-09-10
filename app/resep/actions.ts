'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { checkAndUpdateQueueCompletion } from '@/app/pembayaran/actions'
import { requireAuth, requireRole } from '@/lib/auth'


export interface PrescriptionQueueItem {
  id: number
  queueId: number
  code: string // e.g. #RSP-20231024-001
  priority: 'Cito' | 'Normal'
  patientName: string
  polyclinic: string
  doctorName: string
  waitTimeMinutes: number
  status: 'ANTRE' | 'PROSES' | 'SELESAI'
  billingId: number | null
  billingStatus: 'BELUM_LUNAS' | 'LUNAS' | 'CANCELLED' | 'BELUM_DITAGIH'
  createdAt: Date
  items: {
    id: number
    name: string
    dosage: string
    notes?: string
    qty: string
    quantity: number
    unitPrice: number
    totalPrice: number
    availableStock?: number
    isStockSufficient?: boolean
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

export async function getPrescriptionQueues(): Promise<PrescriptionQueueItem[]> {
  await requireAuth()
  try {
    const now = new Date()
    const [medicalRecords, medicines] = await Promise.all([
      prisma.medicalRecord.findMany({
        orderBy: { examinationDate: 'desc' },
        take: 30,
        include: {
          patient: true,
          doctor: true,
          prescriptions: true,
          queue: {
            include: {
              billing: true,
            },
          },
          billing: true,
        },
      }),
      prisma.medicine.findMany({
        include: {
          batches: {
            where: {
              expiryDate: { gte: now },
              stockQuantity: { gt: 0 },
            },
          },
        },
      }),
    ])

    const stockMapByName = new Map<string, number>()
    const stockMapById = new Map<number, number>()
    for (const med of medicines) {
      const avail = med.batches.reduce((sum, b) => sum + b.stockQuantity, 0)
      stockMapByName.set(med.name.trim().toLowerCase(), avail)
      stockMapById.set(med.id, avail)
    }

    const result: PrescriptionQueueItem[] = medicalRecords.map((mr) => {
      const dateStr = new Date(mr.examinationDate).toISOString().slice(0, 10).replace(/-/g, '')
      const code = `#RSP-${dateStr}-${mr.id.toString().padStart(3, '0')}`

      const birthDate = new Date(mr.patient.dateOfBirth)
      const age = Math.abs(new Date(Date.now() - birthDate.getTime()).getUTCFullYear() - 1970)

      const diffMs = Date.now() - new Date(mr.examinationDate).getTime()
      const waitTimeMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))

      const items = mr.prescriptions.map((p) => {
        let availableStock: number | undefined = undefined
        if (p.medicineId !== null && p.medicineId !== undefined && stockMapById.has(p.medicineId)) {
          availableStock = stockMapById.get(p.medicineId)
        } else if (p.medicineName && stockMapByName.has(p.medicineName.trim().toLowerCase())) {
          availableStock = stockMapByName.get(p.medicineName.trim().toLowerCase())
        }

        const qtyNeeded = p.quantity || 1
        const isStockSufficient = availableStock === undefined ? true : availableStock >= qtyNeeded

        return {
          id: p.id,
          name: p.medicineName,
          dosage: p.dosage,
          notes: p.instructions || undefined,
          qty: `${qtyNeeded} Pcs`,
          quantity: qtyNeeded,
          unitPrice: p.unitPrice || 0,
          totalPrice: p.totalPrice || 0,
          availableStock,
          isStockSufficient,
        }
      })

      const isCito = mr.complaint?.toLowerCase().includes('cito')

      // Prescription status is SELESAI if prescriptions exist and all are SELESAI
      const isSelesai =
        mr.prescriptions.length > 0 &&
        mr.prescriptions.every((p: any) => p.status === 'SELESAI')

      const billingObj = mr.billing || mr.queue?.billing
      const billingStatus = (billingObj?.status as any) || 'BELUM_DITAGIH'

      return {
        id: mr.id,
        queueId: mr.queueId || mr.queue?.id || mr.id,
        code,
        priority: isCito ? ('Cito' as const) : ('Normal' as const),
        patientName: mr.patient.name,
        polyclinic: mr.queue?.polyclinic || 'Poli Umum',
        doctorName: mr.doctor?.name || 'dr. Raniisyana R.R.',
        waitTimeMinutes: Math.min(waitTimeMinutes, 60),
        status: isSelesai ? ('SELESAI' as const) : ('ANTRE' as const),
        billingId: billingObj?.id || null,
        billingStatus,
        createdAt: mr.examinationDate,
        items,
        patient: {
          id: mr.patient.id,
          name: mr.patient.name,
          gender:
            mr.patient.gender === 'L' || mr.patient.gender === 'Laki-laki'
              ? 'Laki-laki'
              : 'Perempuan',
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
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  try {
    const mr = await prisma.medicalRecord.findUnique({
      where: { id: Number(recordId) },
      select: { queueId: true },
    })

    await prisma.$transaction(async (tx) => {
      const prescriptions = await tx.prescription.findMany({
        where: { medicalRecordId: Number(recordId) },
      })

      const now = new Date()

      for (const p of prescriptions) {
        if (p.status === 'SELESAI') continue

        // Resolve medicine master record by medicineId or medicineName
        let medicine = null
        if (p.medicineId) {
          medicine = await tx.medicine.findUnique({
            where: { id: p.medicineId },
          })
        } else if (p.medicineName) {
          medicine = await tx.medicine.findFirst({
            where: { name: p.medicineName.trim() },
          })
        }

        if (medicine) {
          // Query active non-expired batches ordered by earliest expiry date (FEFO)
          const validBatches = await tx.medicineBatch.findMany({
            where: {
              medicineId: medicine.id,
              expiryDate: { gte: now },
              stockQuantity: { gt: 0 },
            },
            orderBy: { expiryDate: 'asc' },
          })

          const availableStock = validBatches.reduce((sum, b) => sum + b.stockQuantity, 0)
          const neededQty = p.quantity || 1

          if (availableStock < neededQty) {
            throw new Error(
              `Stok obat tidak mencukupi untuk ${p.medicineName}. Tersedia: ${availableStock}, Dibutuhkan: ${neededQty}`
            )
          }

          let remaining = neededQty
          for (const batch of validBatches) {
            if (remaining <= 0) break
            const deduct = Math.min(batch.stockQuantity, remaining)
            await tx.medicineBatch.update({
              where: { id: batch.id },
              data: { stockQuantity: batch.stockQuantity - deduct },
            })
            remaining -= deduct
          }
        }

        // Mark prescription item as SELESAI
        await tx.prescription.update({
          where: { id: p.id },
          data: { status: 'SELESAI' },
        })
      }
    })

    // Check if visit (Queue) can now transition to SELESAI
    if (mr?.queueId) {
      await checkAndUpdateQueueCompletion(mr.queueId)
    }

    try {
      revalidatePath('/resep')
      revalidatePath('/antrean')
      revalidatePath('/pembayaran')
      revalidatePath('/obat')
    } catch {
      // Ignored outside request context
    }

    return { success: true }
  } catch (error: any) {
    if (!error.message?.includes('Stok obat tidak mencukupi')) {
      console.error('Error processing prescription queue:', error)
    }
    return { success: false, error: error.message || 'Gagal menyerahkan resep' }
  }
}
