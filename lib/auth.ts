import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from './prisma'
import {
  createSessionToken,
  verifySessionToken,
  SessionPayload,
  AuthRole,
} from './auth-token'

export type { SessionPayload, AuthRole }

export interface AuthUser {
  id: number
  email: string
  name: string
  role: AuthRole
}

export { createSessionToken, verifySessionToken }

const COOKIE_NAME = 'simpay_session'
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Set the session HTTP-Only cookie
 */
export async function setSessionCookie(user: {
  id: number
  email: string
  name: string
  role: string
}): Promise<string> {
  const role = user.role as AuthRole
  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role,
  })

  try {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_MS / 1000,
    })
  } catch {
    // Graceful fallback outside HTTP request context (e.g. test environment)
  }

  return token
}

/**
 * Clear the session HTTP-Only cookie
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  } catch {
    // Graceful fallback outside HTTP request context (e.g. test environment)
  }
}

/**
 * Get active session payload from cookie
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(COOKIE_NAME)
    if (!sessionCookie?.value) return null
    return await verifySessionToken(sessionCookie.value)
  } catch (error) {
    return null
  }
}

/**
 * Set global test user context for CLI test runners
 */
export function setTestUser(user: AuthUser | null) {
  ;(globalThis as any).__SIMPAY_TEST_USER__ = user
}

/**
 * Get full authenticated user record from session & DB
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if ((globalThis as any).__SIMPAY_TEST_USER__) {
    return (globalThis as any).__SIMPAY_TEST_USER__
  }

  const session = await getSession()
  if (!session) return null

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!dbUser) return null
    if (dbUser.role !== 'DOKTER' && dbUser.role !== 'PERAWAT') return null

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as AuthRole,
    }
  } catch (error) {
    // If DB read fails, fallback to verified session payload if valid
    return {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
    }
  }
}

import { redirect } from 'next/navigation'

/**
 * Require an authenticated user or redirect to /login (or throw error outside HTTP context)
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    try {
      redirect('/login')
    } catch (err: any) {
      if (err?.digest?.startsWith('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
        throw err
      }
    }
    throw new Error('UNAUTHENTICATED: Akses ditolak. Silakan login terlebih dahulu.')
  }
  return user
}

/**
 * Require a specific role (or array of roles) or throw an error
 */
export async function requireRole(allowedRoles: AuthRole | AuthRole[]): Promise<AuthUser> {
  const user = await requireAuth()
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]

  if (!roles.includes(user.role)) {
    const roleNames = roles.join(' atau ')
    throw new Error(
      `UNAUTHORIZED: Akses ditolak. Fungsi ini hanya dapat diakses oleh pengguna dengan peran ${roleNames}.`
    )
  }

  return user
}

/**
 * Verify user password (supports plaintext seed & hashed passwords)
 */
export function verifyPassword(inputPassword: string, storedPassword: string): boolean {
  if (!inputPassword || !storedPassword) return false

  // 1. Check direct match (for initial seed setup)
  if (inputPassword === storedPassword) return true

  // 2. Check scrypt / PBKDF2 hash if structured as hash:salt
  if (storedPassword.includes(':')) {
    try {
      const [hash, salt] = storedPassword.split(':')
      const inputHash = crypto.pbkdf2Sync(inputPassword, salt, 1000, 64, 'sha512').toString('hex')
      return hash === inputHash
    } catch {
      return false
    }
  }

  return false
}

/**
 * Hash a password for production safety
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${hash}:${salt}`
}
