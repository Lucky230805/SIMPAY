'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function getDashboardStats() {
  await requireAuth()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  try {
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)

    const [totalPatients, todayQueues, patientsByGender, medicines] = await Promise.all([
      prisma.patient.count(),
      prisma.queue.findMany({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
        include: {
          patient: true,
        },
        orderBy: {
          queueNumber: 'asc',
        },
      }),
      prisma.patient.groupBy({
        by: ['gender'],
        _count: { gender: true },
      }),
      prisma.medicine.findMany({
        where: { isActive: true },
        include: {
          batches: {
            orderBy: { expiryDate: 'asc' },
          },
        },
      }),
    ])

    const waitingCount = todayQueues.filter((q) => q.status === 'MENUNGGU').length
    const inProgressCount = todayQueues.filter((q) => q.status === 'DALAM_PEMERIKSAAN').length
    const waitingPharmacyCount = todayQueues.filter((q) => q.status === 'MENUNGGU_OBAT_DAN_BAYAR').length
    const doneCount = todayQueues.filter((q) => q.status === 'SELESAI').length

    todayQueues.sort((a, b) => {
      const getPriority = (st: string) => {
        const norm = (st || '').trim().toUpperCase()
        if (norm === 'DALAM_PEMERIKSAAN') return 1
        if (norm === 'MENUNGGU') return 2
        if (norm === 'MENUNGGU_OBAT_DAN_BAYAR') return 3
        if (norm === 'SELESAI') return 4
        return 5
      }
      const pA = getPriority(a.status)
      const pB = getPriority(b.status)
      if (pA !== pB) return pA - pB
      return a.queueNumber - b.queueNumber
    })

    // Compute Low Stock & Expiring Batches
    const lowStockList: { id: number; name: string; unit: string; availableStock: number; minStock: number; category: string | null }[] = []
    const expiringBatchesList: { id: number; medicineName: string; batchNumber: string; stockQuantity: number; expiryDate: Date; daysUntilExpiry: number; isExpired: boolean }[] = []

    medicines.forEach((med) => {
      let activeStock = 0
      med.batches.forEach((b) => {
        const expiry = new Date(b.expiryDate)
        const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (expiry >= today) {
          activeStock += b.stockQuantity
        }

        // Expiring within 60 days or already expired with remaining stock
        if (b.stockQuantity > 0 && (expiry <= sixtyDaysFromNow)) {
          expiringBatchesList.push({
            id: b.id,
            medicineName: med.name,
            batchNumber: b.batchNumber,
            stockQuantity: b.stockQuantity,
            expiryDate: b.expiryDate,
            daysUntilExpiry,
            isExpired: expiry < today,
          })
        }
      })

      if (activeStock <= med.minStock) {
        lowStockList.push({
          id: med.id,
          name: med.name,
          unit: med.unit,
          availableStock: activeStock,
          minStock: med.minStock,
          category: med.category,
        })
      }
    })

    // Sort low stock by stock count ascending
    lowStockList.sort((a, b) => a.availableStock - b.availableStock)
    // Sort expiring batches by expiry date ascending
    expiringBatchesList.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())

    return {
      totalPatients,
      todayQueues,
      queueStats: {
        total: todayQueues.length,
        waiting: waitingCount,
        inProgress: inProgressCount,
        waitingPharmacy: waitingPharmacyCount,
        done: doneCount,
      },
      patientsByGender,
      medicineStats: {
        lowStockCount: lowStockList.length,
        lowStockList: lowStockList.slice(0, 5),
        expiringCount: expiringBatchesList.length,
        expiringList: expiringBatchesList.slice(0, 5),
      },
    }
  } catch (error) {
    console.error('Database query error in getDashboardStats:', error)
    return {
      totalPatients: 0,
      todayQueues: [],
      queueStats: {
        total: 0,
        waiting: 0,
        inProgress: 0,
        waitingPharmacy: 0,
        done: 0,
      },
      patientsByGender: [],
      medicineStats: {
        lowStockCount: 0,
        lowStockList: [],
        expiringCount: 0,
        expiringList: [],
      },
    }
  }
}

export async function getRecentPatients() {
  await requireAuth()
  try {
    return await prisma.patient.findMany({
      take: 5,
      orderBy: { id: 'desc' },
    })
  } catch (error) {
    console.error('Database query error in getRecentPatients:', error)
    return []
  }
}

