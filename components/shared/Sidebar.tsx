'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  Pill,
  BarChart2,
  Activity,
  CreditCard,
  LogOut,
  Stethoscope,
  UserCheck,
  Layers,
  FileCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSessionUserAction } from '@/app/login/actions'
import { Button } from '@/components/ui/button'
import { LogoutConfirmDialog } from '@/components/shared/logout-confirm-dialog'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['DOKTER', 'PERAWAT'],
  },
  {
    label: 'Data Pasien',
    href: '/pasien',
    icon: Users,
    roles: ['DOKTER', 'PERAWAT'],
  },
  {
    label: 'Antrean Pemeriksaan',
    href: '/antrean',
    icon: ClipboardList,
    roles: ['DOKTER'],
  },
  {
    label: 'Rekam Medis',
    href: '/rekam-medis',
    icon: FileText,
    roles: ['DOKTER'],
  },
  {
    label: 'Resep & Penyerahan',
    href: '/resep',
    icon: Pill,
    roles: ['PERAWAT'],
  },
  {
    label: 'Stok & Obat',
    href: '/obat',
    icon: Layers,
    roles: ['PERAWAT'],
  },
  {
    label: 'Kasir & Pembayaran',
    href: '/pembayaran',
    icon: CreditCard,
    roles: ['PERAWAT'],
  },
  {
    label: 'Surat Keterangan',
    href: '/surat',
    icon: FileCheck,
    roles: ['PERAWAT'],
  },
  {
    label: 'Laporan',
    href: '/laporan',
    icon: BarChart2,
    roles: ['DOKTER', 'PERAWAT'],
  },
]


export default function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ name: string; role: 'DOKTER' | 'PERAWAT' } | null>(null)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)

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
  const roleLabel = isDokter ? 'Dokter' : 'Perawat'
  const roleInitials = isDokter ? 'DR' : 'PR'

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-border/80 bg-card h-screen sticky top-0 print:hidden shadow-xs">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border/80">
        <img src="/logo.png" alt="SIMPAY Logo" className="w-9 h-9 object-contain shrink-0 drop-shadow-xs" />
        <div className="overflow-hidden">
          <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5 leading-tight">
            SIMPAY
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </span>
          <p className="text-[10px] font-medium text-muted-foreground leading-tight truncate">
            Pelayanan, Antrean & Medis
          </p>
        </div>
      </div>

      {/* Navigation */}
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
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30'
                  )}
                >
                  <item.icon className={cn('w-4 h-4 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-emerald-600/80 dark:text-emerald-400')} />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User Session Footer */}
      <div className="px-4 py-4 border-t border-border/80 bg-muted/30 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ring-2 ring-background shadow-xs',
                isDokter ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              )}
            >
              {roleInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-foreground truncate">
                {user ? user.name : 'Memuat...'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {isDokter ? (
                  <Stethoscope className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                ) : (
                  <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                )}
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setIsLogoutConfirmOpen(true)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Keluar / Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <LogoutConfirmDialog
        open={isLogoutConfirmOpen}
        onOpenChange={setIsLogoutConfirmOpen}
      />
    </aside>
  )
}
