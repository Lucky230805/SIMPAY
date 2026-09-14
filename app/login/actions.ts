'use server'

import { prisma } from '@/lib/prisma'
import { setSessionCookie, clearSessionCookie, verifyPassword } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string)

  if (!email || !password) {
    return { success: false, error: 'Email dan kata sandi wajib diisi' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return { success: false, error: 'Email atau kata sandi tidak valid' }
    }

    const isValid = verifyPassword(password, user.password)
    if (!isValid) {
      return { success: false, error: 'Email atau kata sandi tidak valid' }
    }

    // Verify role constraint (DOKTER vs PERAWAT)
    if (user.role !== 'DOKTER' && user.role !== 'PERAWAT') {
      return { success: false, error: 'Akun Anda tidak memiliki peran yang valid dalam sistem SIMPAY' }
    }

    await setSessionCookie({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }
  } catch (error: any) {
    console.error('Error during login:', error)
    return { success: false, error: 'Gagal memproses login: ' + (error.message || 'Kesalahan server') }
  }
}

export async function logoutAction() {
  await clearSessionCookie()
  redirect('/login')
}

export async function getSessionUserAction() {
  const { getCurrentUser } = await import('@/lib/auth')
  return await getCurrentUser()
}

