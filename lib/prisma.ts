import { PrismaClient as DefaultPrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createAdapter() {
  const connectionString = process.env.DATABASE_URL || ''
  return new PrismaPg({ connectionString })
}

function getFreshPrismaClient(): DefaultPrismaClient {
  try {
    if (typeof require !== 'undefined' && require.cache) {
      Object.keys(require.cache).forEach((key) => {
        if (key.includes('@prisma') || key.includes('.prisma')) {
          delete require.cache[key]
        }
      })
    }
    const { PrismaClient: FreshClient } = require('@prisma/client')
    return new FreshClient({
      adapter: createAdapter(),
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  } catch (err) {
    return new DefaultPrismaClient({
      adapter: createAdapter(),
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: any
}

const isClientUpToDate = (client: any) => {
  if (!client) return false
  if (!('medicalCertificate' in client)) return false
  try {
    const fields = client._runtimeDataModel?.models?.Patient?.fields
    if (fields && Array.isArray(fields) && !fields.some((f: any) => f.name === 'occupation')) {
      return false
    }
  } catch {
    return false
  }
  return true
}

if (!globalForPrisma.prisma || !isClientUpToDate(globalForPrisma.prisma)) {
  globalForPrisma.prisma = getFreshPrismaClient()
}

export const prisma: DefaultPrismaClient = globalForPrisma.prisma

