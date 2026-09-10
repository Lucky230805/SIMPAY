import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppLayout from '@/components/shared/AppLayout'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'SIMPAY — Sistem Informasi Pelayanan Pasien',
  description:
    'Sistem berbasis web untuk membantu dokter dan perawat mengelola informasi pasien dan pelayanan klinik dengan lebih cepat dan terstruktur.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-muted/40">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
