"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDashboardStats, getRecentPatients } from './actions'
import { getSessionUserAction } from '@/app/login/actions'
import { Card } from '@/components/ui/card'
import {
  Users,
  ClipboardList,
  Clock,
  CheckCircle2,
  Stethoscope,
  Activity,
  TrendingUp,
  Calendar,
  Tv,
  ExternalLink,
} from 'lucide-react'

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
}: {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  accent?: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${
            accent || 'bg-primary/10'
          }`}
        >
          <Icon className={`w-5 h-5 ${accent ? 'text-white' : 'text-primary'}`} />
        </div>
      </div>
    </Card>
  )
}

function QueueStatusBadge({ status }: { status: string }) {
  const norm = (status || '').trim().toUpperCase()
  const map: Record<string, { label: string; className: string }> = {
    MENUNGGU: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    DALAM_PEMERIKSAAN: { label: 'Dalam Pemeriksaan', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    MENUNGGU_OBAT_DAN_BAYAR: { label: 'Menunggu Obat & Bayar', className: 'bg-purple-100 text-purple-800 border-purple-200' },
    SELESAI: { label: 'Selesai', className: 'bg-green-100 text-green-800 border-green-200' },
  }
  const config = map[norm] ?? { label: status, className: 'bg-gray-100 text-gray-800 border-gray-200' }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [recentPatients, setRecentPatients] = useState<any[]>([])
  const [userRole, setUserRole] = useState<'DOKTER' | 'PERAWAT'>('PERAWAT')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [s, r, user] = await Promise.all([
          getDashboardStats(),
          getRecentPatients(),
          getSessionUserAction(),
        ])
        setStats(s)
        setRecentPatients(r)
        if (user?.role === 'DOKTER' || user?.role === 'PERAWAT') {
          setUserRole(user.role)
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  if (loading || !stats) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-40 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-muted animate-pulse rounded-lg" />
          <div className="space-y-4">
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground capitalize">{today}</p>
          </div>
        </div>
        {userRole === 'PERAWAT' && (
          <Link
            href="/antrean/display"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm shrink-0"
          >
            <Tv className="w-4 h-4 text-emerald-400" />
            <span>Layar Antrean TV Publik</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        )}
      </div>


      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pasien"
          value={stats.totalPatients}
          description="Pasien terdaftar"
          icon={Users}
        />
        <StatCard
          title="Antrean Hari Ini"
          value={stats.queueStats.total}
          description="Pasien terjadwal"
          icon={ClipboardList}
        />
        <StatCard
          title="Menunggu"
          value={stats.queueStats.waiting}
          description="Pasien belum diperiksa"
          icon={Clock}
          accent="bg-yellow-500"
        />
        <StatCard
          title="Selesai"
          value={stats.queueStats.done}
          description="Pemeriksaan selesai"
          icon={CheckCircle2}
          accent="bg-green-500"
        />
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Queue Table — spans 2 columns */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Antrean Hari Ini</h2>
            </div>
            {stats.queueStats.inProgress > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                <Activity className="w-3 h-3" />
                {stats.queueStats.inProgress} sedang diperiksa
              </span>
            )}
          </div>

          {stats.todayQueues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Tidak ada antrean hari ini</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Antrean pasien akan muncul di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      No.
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Nama Pasien
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                      Nomor Telepon
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide pr-5">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.todayQueues.map((queue: any) => (
                    <tr key={queue.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {queue.queueNumber}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="font-medium text-foreground">{queue.patient.name}</span>
                      </td>
                      <td className="px-3 py-3.5 text-muted-foreground hidden sm:table-cell">
                        {queue.patient.phone || '—'}
                      </td>
                      <td className="px-3 py-3.5 pr-5">
                        <QueueStatusBadge status={queue.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick Stats — spans 1 column */}
        <div className="space-y-4">
          {/* Queue breakdown */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Ringkasan Antrean</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <span className="text-sm text-muted-foreground">Menunggu</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{stats.queueStats.waiting}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-sm text-muted-foreground">Dalam Pemeriksaan</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{stats.queueStats.inProgress}</span>
              </div>
              {stats.queueStats.waitingPharmacy > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-sm text-muted-foreground">Menunggu Obat & Bayar</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{stats.queueStats.waitingPharmacy}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-sm text-muted-foreground">Selesai</span>
                </div>
                <span className="text-sm font-semibold text-foreground">{stats.queueStats.done}</span>
              </div>

              {/* Simple progress bar */}
              {stats.queueStats.total > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden flex">
                    <div
                      className="bg-green-500 h-full"
                      style={{
                        width: `${(stats.queueStats.done / stats.queueStats.total) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-purple-500 h-full"
                      style={{
                        width: `${((stats.queueStats.waitingPharmacy || 0) / stats.queueStats.total) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-blue-500 h-full"
                      style={{
                        width: `${(stats.queueStats.inProgress / stats.queueStats.total) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-yellow-400 h-full"
                      style={{
                        width: `${(stats.queueStats.waiting / stats.queueStats.total) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {Math.round((stats.queueStats.done / stats.queueStats.total) * 100)}% selesai
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Recent Patients */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Pasien Terbaru</h2>
            </div>
            {recentPatients.length === 0 ? (
              <p className="text-xs text-muted-foreground">Belum ada data pasien</p>
            ) : (
              <ul className="space-y-2.5">
                {recentPatients.map((patient: any) => (
                  <li key={patient.id} className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
                      <span className="text-[10px] font-semibold text-primary">
                        {patient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-medium text-foreground truncate">{patient.name}</p>
                      <p className="text-[10px] text-muted-foreground">{patient.gender}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
