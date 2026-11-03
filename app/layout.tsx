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
    <html lang="id" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storedTheme = localStorage.getItem('simpay_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }

                  var storedUser = localStorage.getItem('simpay_user');
                  var role = null;
                  if (storedUser) {
                    try { role = JSON.parse(storedUser).role; } catch(e) {}
                  }
                  if (!role) {
                    var match = document.cookie.match(/(?:^|;\\s*)simpay_role=([^;]*)/);
                    if (match) role = match[1];
                  }
                  if (role === 'DOKTER' || role === 'PERAWAT') {
                    document.documentElement.setAttribute('data-simpay-role', role);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
