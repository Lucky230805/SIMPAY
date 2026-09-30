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
  if (!('stockMovement' in client)) return false
  try {
    const fields = (client as any)?._runtimeDataModel?.models?.MedicalRecord?.fields
    if (Array.isArray(fields) && !fields.some((f: any) => f.name === 'nextControlDate')) {
      return false
    }
  } catch (e) {}
  return true
}

function getPrisma(): DefaultPrismaClient {
  if (!globalForPrisma.prisma || !isClientUpToDate(globalForPrisma.prisma)) {
    globalForPrisma.prisma = getFreshPrismaClient()
  }
  return globalForPrisma.prisma
}

export const prisma: DefaultPrismaClient = new Proxy({} as any, {
  get(_target, prop) {
    const client = getPrisma()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

