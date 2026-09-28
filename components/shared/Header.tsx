'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Pill,
  BarChart2,
  Activity,
  CreditCard,
  LogOut,
  Layers,
  FileCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getSessionUserAction } from '@/app/login/actions'
import { LogoutConfirmDialog } from '@/components/shared/logout-confirm-dialog'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['DOKTER', 'PERAWAT'] },
  { label: 'Data Pasien', href: '/pasien', icon: Users, roles: ['DOKTER', 'PERAWAT'] },
  { label: 'Antrean Pemeriksaan', href: '/antrean', icon: ClipboardList, roles: ['DOKTER'] },
  { label: 'Rekam Medis', href: '/rekam-medis', icon: FileText, roles: ['DOKTER'] },
  { label: 'Resep & Penyerahan', href: '/resep', icon: Pill, roles: ['PERAWAT'] },
  { label: 'Stok & Obat', href: '/obat', icon: Layers, roles: ['PERAWAT'] },
  { label: 'Kasir & Pembayaran', href: '/pembayaran', icon: CreditCard, roles: ['PERAWAT'] },
  { label: 'Surat Keterangan', href: '/surat', icon: FileCheck, roles: ['PERAWAT'] },
  { label: 'Laporan', href: '/laporan', icon: BarChart2, roles: ['DOKTER', 'PERAWAT'] },
]


export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; role: 'DOKTER' | 'PERAWAT' } | null>(null)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    let active = true
    getSessionUserAction().then((u) => {
      if (active && u) {
        setUser({ name: u.name, role: u.role })
      }
    })
    return () => {
      active = false
    }
  }, [])

  const filteredNavItems = navItems.filter(
    (item) => !user || item.roles.includes(user.role)
  )

  const isDokter = user?.role === 'DOKTER'
  const roleInitials = isDokter ? 'DR' : 'PR'
  const roleLabel = isDokter ? 'Dokter' : 'Perawat'

  return (
    <>
      {/* Top Header — mobile + page title */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/80 bg-background/80 backdrop-blur-md px-4 lg:px-6 print:hidden shadow-xs">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka navigasi"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </Button>

        {/* Mobile logo (only visible on mobile) */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <img src="/logo.png" alt="SIMPAY Logo" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs" />
          <span className="text-sm font-bold tracking-tight text-foreground">SIMPAY</span>
        </div>

        {/* Right side user badge & logout */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-background shadow-xs',
                isDokter ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              )}
            >
              {roleInitials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-bold text-foreground leading-tight">
                {user ? user.name : 'Memuat...'}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
          </div>

          {user && (
            <Button
              type="button"
              onClick={() => setIsLogoutConfirmOpen(true)}
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-medium gap-1.5 px-2.5 rounded-lg"
              title="Keluar / Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </Button>
          )}
        </div>
      </header>

      {/* Mobile Slide-in Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card shadow-2xl flex flex-col border-r border-border">
            <div className="flex items-center justify-between px-5 h-16 border-b border-border">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="SIMPAY Logo" className="w-9 h-9 object-contain shrink-0" />
                <span className="text-base font-bold tracking-tight text-foreground">SIMPAY</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              <ul className="space-y-1">
                {filteredNavItems.map((item) => {
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard' || pathname === '/'
                      : pathname.startsWith(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                          isActive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30'
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}

      <LogoutConfirmDialog
        open={isLogoutConfirmOpen}
        onOpenChange={setIsLogoutConfirmOpen}
      />
    </>
  )
}
