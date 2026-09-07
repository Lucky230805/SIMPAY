import { PrismaClient } from '@prisma/client'

// PrismaLibSql must be required at runtime to avoid CJS/ESM issues
function createAdapter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSql } = require('@prisma/adapter-libsql')
  const rawUrl = process.env.DATABASE_URL || 'file:./dev.db'
  // LibSQL expects file:dev.db, not file:./dev.db
  const url = rawUrl.replace('file:./', 'file:')
  return new PrismaLibSql({ url })
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
