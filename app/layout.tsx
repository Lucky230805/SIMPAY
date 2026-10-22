import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AppLayout from '@/components/shared/AppLayout'
import { getSession } from '@/lib/auth'

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
  const session = await getSession()
  const initialUser = session ? { name: session.name, role: session.role } : null

  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('simpay_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <AppLayout initialUser={initialUser}>{children}</AppLayout>
      </body>
    </html>
  )
}
