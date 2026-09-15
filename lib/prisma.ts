import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createAdapter() {
  const connectionString = process.env.DATABASE_URL || ''
  return new PrismaPg({ connectionString })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

