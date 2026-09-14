import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    const rawUrl = process.env.DATABASE_URL
    return rawUrl.replace('file:./', 'file:')
  }

  // In Vercel Serverless environment, use /tmp/dev.db for full SQLite read & write permissions
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const tmpPath = path.join('/tmp', 'dev.db')
    const possibleSources = [
      path.join(process.cwd(), 'dev.db'),
      path.join(__dirname, '..', 'dev.db'),
      path.join(__dirname, '..', '..', 'dev.db'),
      path.resolve('dev.db'),
    ]

    const sourcePath = possibleSources.find(p => fs.existsSync(p) && fs.statSync(p).size > 0)

    try {
      const needsCopy = !fs.existsSync(tmpPath) || fs.statSync(tmpPath).size === 0
      if (needsCopy && sourcePath) {
        fs.copyFileSync(sourcePath, tmpPath)
        console.log(`Successfully copied ${sourcePath} to ${tmpPath}`)
      }
    } catch (e) {
      console.error('Failed to copy database to /tmp:', e)
    }
    return `file:${tmpPath}`
  }

  return 'file:dev.db'
}

// PrismaLibSql must be required at runtime to avoid CJS/ESM issues
function createAdapter() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaLibSql } = require('@prisma/adapter-libsql')
  const url = getDatabaseUrl()
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
