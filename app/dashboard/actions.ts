'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function getDashboardStats() {
  await requireAuth()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

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
  const doneCount = todayQueues.filter((q) => q.status === 'SELESAI').length

  return {
    totalPatients,
    todayQueues,
    queueStats: {
      total: todayQueues.length,
      waiting: waitingCount,
      inProgress: inProgressCount,
      done: doneCount,
    },
    patientsByGender,
  }
}

export async function getRecentPatients() {
  await requireAuth()
  return prisma.patient.findMany({
    take: 5,
    orderBy: { id: 'desc' },
  })
}

