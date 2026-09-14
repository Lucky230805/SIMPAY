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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { getSessionUserAction, logoutAction } from '@/app/login/actions'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['DOKTER', 'PERAWAT'] },
  { label: 'Data Pasien', href: '/pasien', icon: Users, roles: ['DOKTER', 'PERAWAT'] },
  { label: 'Antrean Pemeriksaan', href: '/antrean', icon: ClipboardList, roles: ['DOKTER', 'PERAWAT'] },
  { label: 'Rekam Medis', href: '/rekam-medis', icon: FileText, roles: ['DOKTER', 'PERAWAT'] },
  { label: 'Resep & Obat', href: '/resep', icon: Pill, roles: ['DOKTER', 'PERAWAT'] },
  { label: 'Kasir & Pembayaran', href: '/pembayaran', icon: CreditCard, roles: ['PERAWAT'] },
  { label: 'Laporan', href: '/laporan', icon: BarChart2, roles: ['DOKTER', 'PERAWAT'] },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; role: 'DOKTER' | 'PERAWAT' } | null>(null)
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
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-white px-4 lg:px-6 print:hidden">
        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka navigasi"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile logo (only visible on mobile) */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
            <Activity className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">SIMPAY</span>
        </div>

        {/* Right side user badge & logout */}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0',
                isDokter ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              )}
            >
              {roleInitials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-medium text-foreground leading-tight">
                {user ? user.name : 'Memuat...'}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
          </div>

          {user && (
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs font-medium gap-1.5 px-2.5"
                title="Keluar / Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            </form>
          )}
        </div>
      </header>

      {/* Mobile Slide-in Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-16 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
                  <Activity className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold">SIMPAY</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              <ul className="space-y-0.5">
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
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
