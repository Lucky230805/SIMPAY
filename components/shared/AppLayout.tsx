'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/shared/Sidebar'
import Header from '@/components/shared/Header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isStandalone = pathname === '/login' || pathname === '/antrean/display'

  if (isStandalone) {
    return <div className="min-h-screen bg-slate-900">{children}</div>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground print:h-auto print:overflow-visible">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background text-foreground print:h-auto print:overflow-visible">
        {/* Sticky top header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-muted/20 dark:bg-background print:h-auto print:overflow-visible">
          {children}
        </main>
      </div>
    </div>
  )
}
