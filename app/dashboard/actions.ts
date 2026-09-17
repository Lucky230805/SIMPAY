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
    const [totalPatients, todayQueues, patientsByGender] = await Promise.all([
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

