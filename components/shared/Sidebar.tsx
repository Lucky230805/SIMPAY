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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSessionUserAction, logoutAction } from '@/app/login/actions'
import { Button } from '@/components/ui/button'

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
    roles: ['DOKTER', 'PERAWAT'],
  },
  {
    label: 'Rekam Medis',
    href: '/rekam-medis',
    icon: FileText,
    roles: ['DOKTER', 'PERAWAT'],
  },
  {
    label: 'Resep & Penyerahan',
    href: '/resep',
    icon: Pill,
    roles: ['DOKTER', 'PERAWAT'],
  },
  {
    label: 'Stok & Obat',
    href: '/obat',
    icon: Layers,
    roles: ['DOKTER', 'PERAWAT'],
  },
  {
    label: 'Kasir & Pembayaran',
    href: '/pembayaran',
    icon: CreditCard,
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
    <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-border bg-white h-screen sticky top-0 print:hidden">
      {/* Logo / Brand */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <span className="text-base font-semibold tracking-tight text-foreground">SIMPAY</span>
          <p className="text-[10px] text-muted-foreground leading-tight">Sistem Informasi Pelayanan</p>
        </div>
      </div>

      {/* Navigation */}
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

      {/* User Session Footer */}
      <div className="px-4 py-4 border-t border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs',
                isDokter ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              )}
            >
              {roleInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-foreground truncate">
                {user ? user.name : 'Memuat...'}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                {isDokter ? (
                  <Stethoscope className="w-3 h-3 text-blue-600" />
                ) : (
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                )}
                <span className="text-[11px] font-medium text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>

          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </aside>
  )
}
