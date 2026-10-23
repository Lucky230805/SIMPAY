import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import AppLayout from '@/components/shared/AppLayout'
import { getCurrentUser } from '@/lib/auth'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'SIMPAY — Sistem Informasi Pelayanan Pasien',
  description:
    'Sistem berbasis web untuk membantu dokter dan perawat mengelola informasi pasien dan pelayanan klinik dengan lebih cepat dan terstruktur.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get('simpay_theme')?.value
  const roleCookie = cookieStore.get('simpay_role')?.value
  const user = await getCurrentUser()
  const isDark = themeCookie === 'dark'

  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased ${isDark ? 'dark' : ''}`}
      data-simpay-role={user?.role || roleCookie || undefined}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <AppLayout initialUser={user ? { name: user.name, role: user.role } : null}>
          {children}
        </AppLayout>
      </body>
    </html>
  )
}
