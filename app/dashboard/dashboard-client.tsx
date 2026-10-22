"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDashboardStats, getRecentPatients } from './actions'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Users,
  ClipboardList,
  Clock,
  CheckCircle2,
  Stethoscope,
  Calendar,
  Tv,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  CreditCard,
  Pill,
} from 'lucide-react'

function QueueStatusBadge({ status }: { status: string }) {
  const norm = (status || '').trim().toUpperCase()
  const map: Record<string, { label: string; className: string; dotColor: string }> = {
    MENUNGGU: {
      label: 'Menunggu',
      className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
      dotColor: 'bg-amber-500',
    },
    DALAM_PEMERIKSAAN: {
      label: 'Dalam Pemeriksaan',
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
      dotColor: 'bg-blue-500',
    },
    MENUNGGU_OBAT_DAN_BAYAR: {
      label: 'Farmasi & Kasir',
      className: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
      dotColor: 'bg-purple-500',
    },
    SELESAI: {
      label: 'Selesai',
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
      dotColor: 'bg-emerald-500',
    },
  }

  const config = map[norm] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
    dotColor: 'bg-muted-foreground',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border',
        config.className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotColor)} />
      {config.label}
    </span>
  )
}

interface DashboardClientProps {
  currentUser: {
    name: string
    role: 'DOKTER' | 'PERAWAT'
  }
}

export function DashboardClient({ currentUser }: DashboardClientProps) {
  const [stats, setStats] = useState<any>(null)
  const [recentPatients, setRecentPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [s, r] = await Promise.all([
          getDashboardStats(),
          getRecentPatients(),
        ])
        setStats(s)
        setRecentPatients(r)
      } catch (err) {
        console.error('Failed to load dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  if (loading || !stats) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-60 bg-muted rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-muted rounded-xl" />
          <div className="h-72 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  const completionRate =
    stats.queueStats.total > 0
      ? Math.round((stats.queueStats.done / stats.queueStats.total) * 100)
      : 0

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Dashboard Operasional
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Klinik Aktif
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Petugas: <strong className="text-foreground font-semibold">{currentUser.name}</strong> ({currentUser.role}) •{' '}
            Monitoring rekam medis, antrean klinis, dan ketersediaan farmasi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border px-3 py-1.5 rounded-lg shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-foreground">{todayFormatted}</span>
          </div>

          {currentUser.role === 'PERAWAT' && (
            <Link
              href="/antrean/display"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              <Tv className="w-3.5 h-3.5 text-primary" />
              <span>Display TV</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </Link>
          )}
        </div>
      </div>

      {/* ── Clinical Alerts (If any) ── */}
      {((stats.medicineStats?.lowStockCount || 0) > 0 || (stats.medicineStats?.expiringCount || 0) > 0) && (
        <div className="space-y-3">
          {stats.medicineStats?.lowStockCount > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Peringatan Stok Obat Kritis
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-500/25">
                      {stats.medicineStats.lowStockCount} Obat
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <span>Stok di bawah batas aman:</span>
                    {stats.medicineStats.lowStockList.slice(0, 4).map((m: any) => (
                      <span
                        key={m.id}
                        className="px-2 py-0.5 rounded bg-card text-foreground font-medium text-[11px] border border-border font-mono"
                      >
                        {m.name} ({m.availableStock <= 0 ? 'Habis' : `${m.availableStock} ${m.unit}`})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Link
                href="/obat"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-2xs self-start sm:self-auto"
              >
                <span>Kelola Stok</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {stats.medicineStats?.expiringCount > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Batch Mendekati Kedaluwarsa (ED ≤ 60 Hari)
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/25">
                      {stats.medicineStats.expiringCount} Batch
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <span>Prioritas pengeluaran (FEFO):</span>
                    {stats.medicineStats.expiringList.slice(0, 3).map((b: any) => (
                      <span
                        key={b.id}
                        className="px-2 py-0.5 rounded bg-card text-foreground font-medium text-[11px] border border-border font-mono"
                      >
                        {b.medicineName} (#{b.batchNumber} • {b.isExpired ? 'ED' : `${b.daysUntilExpiry} hr`})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <Link
                href="/obat"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-2xs self-start sm:self-auto"
              >
                <span>Audit Batch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── KPI Metrics (4 Clean Balanced Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pasien */}
        <Card className="p-4 bg-card border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Pasien</span>
            <Users className="w-4 h-4 text-muted-foreground/70" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
              {stats.totalPatients}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Pasien terdaftar di database
            </p>
          </div>
        </Card>

        {/* Antrean Hari Ini */}
        <Card className="p-4 bg-card border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Antrean Hari Ini</span>
            <ClipboardList className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold font-mono tracking-tight text-foreground">
              {stats.queueStats.total}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Pasien terdaftar hari ini
            </p>
          </div>
        </Card>

        {/* Menunggu Dokter */}
        <Card className="p-4 bg-card border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Menunggu Dokter</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold font-mono tracking-tight text-foreground text-amber-500">
              {stats.queueStats.waiting + stats.queueStats.inProgress}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats.queueStats.inProgress > 0
                ? `${stats.queueStats.inProgress} sedang diperiksa di poli`
                : 'Belum ada dalam ruang periksa'}
            </p>
          </div>
        </Card>

        {/* Selesai */}
        <Card className="p-4 bg-card border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Selesai Diperiksa</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold font-mono tracking-tight text-foreground text-emerald-500">
              {stats.queueStats.done}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {completionRate}% dari total antrean
            </p>
          </div>
        </Card>
      </div>

      {/* ── Middle Operational Section: Antrean + Distribusi (Side by Side) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Antrean Pasien Hari Ini (8 cols) */}
        <Card className="lg:col-span-8 bg-card border-border shadow-xs flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">
                  Antrean Pasien Hari Ini
                </h2>
              </div>
              <Link
                href="/antrean"
                className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>Buka Antrean Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {stats.todayQueues.length === 0 ? (
              <div className="py-12 px-4 text-center text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-foreground">Belum ada pasien terdaftar hari ini</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gunakan menu Antrean Pemeriksaan untuk mendaftarkan pasien.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-muted/40 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-center w-16">No.</th>
                      <th className="px-4 py-3">Nama Pasien & Rekam Medis</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Kontak</th>
                      <th className="px-4 py-3 text-center w-36">Status</th>
                      <th className="px-4 py-3 text-right w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stats.todayQueues.map((queue: any) => (
                      <tr key={queue.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-mono font-bold text-foreground bg-muted/60 border border-border px-2 py-0.5 rounded text-xs">
                            {queue.queueNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-foreground text-sm leading-tight">
                            {queue.patient.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                            {queue.patient.mrn || queue.patient.medicalRecordNumber || `NIK: ${queue.patient.nik || '—'}`}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground hidden sm:table-cell font-mono">
                          {queue.patient.phone || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <QueueStatusBadge status={queue.status} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            href={`/antrean/${queue.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            <span>Periksa</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
            <span>Menampilkan {stats.todayQueues.length} antrean</span>
            <span>Total antrean hari ini: {stats.queueStats.total}</span>
          </div>
        </Card>

        {/* Distribusi Pelayanan Hari Ini (4 cols) */}
        <Card className="lg:col-span-4 bg-card border-border shadow-xs flex flex-col justify-between p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Distribusi Pelayanan
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Progres pemeriksaan pasien hari ini
                </p>
              </div>
              <span className="font-mono font-bold text-sm text-foreground bg-muted/50 border border-border px-2 py-0.5 rounded">
                {stats.queueStats.total} Pasien
              </span>
            </div>

            <div className="space-y-3 mt-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-muted-foreground">Menunggu Dokter</span>
                </div>
                <span className="font-mono font-bold text-foreground">
                  {stats.queueStats.waiting}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-muted-foreground">Dalam Pemeriksaan</span>
                </div>
                <span className="font-mono font-bold text-foreground">
                  {stats.queueStats.inProgress}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-muted-foreground">Farmasi & Kasir</span>
                </div>
                <span className="font-mono font-bold text-foreground">
                  {stats.queueStats.waitingPharmacy || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-muted-foreground">Selesai Diperiksa</span>
                </div>
                <span className="font-mono font-bold text-foreground">
                  {stats.queueStats.done}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <div className="flex justify-between items-center text-xs font-semibold text-foreground mb-1.5">
              <span>Tingkat Penyelesaian</span>
              <span className="font-mono text-emerald-500">{completionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${(stats.queueStats.done / (stats.queueStats.total || 1)) * 100}%`,
                }}
              />
              <div
                className="bg-purple-500 transition-all duration-300"
                style={{
                  width: `${((stats.queueStats.waitingPharmacy || 0) / (stats.queueStats.total || 1)) * 100}%`,
                }}
              />
              <div
                className="bg-blue-500 transition-all duration-300"
                style={{
                  width: `${(stats.queueStats.inProgress / (stats.queueStats.total || 1)) * 100}%`,
                }}
              />
              <div
                className="bg-amber-500 transition-all duration-300"
                style={{
                  width: `${(stats.queueStats.waiting / (stats.queueStats.total || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Bottom Section: Akses Cepat Klinis & Pasien Baru (50/50 Balanced) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Akses Cepat Modul Klinis */}
        <Card className="p-5 bg-card border-border shadow-xs space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground">
              Akses Cepat Alur Klinis
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Navigasi langsung ke modul utama operasional klinik
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <Link
              href="/antrean"
              className="p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 transition-colors flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                  Antrean Pemeriksaan
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Triase, skrining TTV, dan panggilan
                </p>
              </div>
            </Link>

            <Link
              href="/pasien"
              className="p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 transition-colors flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                  Direktori Pasien
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pendaftaran & riwayat rekam medis
                </p>
              </div>
            </Link>

            <Link
              href="/obat"
              className="p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 transition-colors flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <Pill className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                  Inventori Farmasi
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Manajemen batch stok obat & ED
                </p>
              </div>
            </Link>

            <Link
              href="/pembayaran"
              className="p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 transition-colors flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                  Kasir & Pembayaran
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pelunasan tagihan & cetak kwitansi
                </p>
              </div>
            </Link>
          </div>
        </Card>

        {/* Pasien Baru Terdaftar */}
        <Card className="p-5 bg-card border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Pasien Baru Terdaftar
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                5 pendaftaran pasien paling mutakhir
              </p>
            </div>
            <Link
              href="/pasien"
              className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>Semua Pasien</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentPatients.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Belum ada data pasien terdaftar
            </p>
          ) : (
            <ul className="divide-y divide-border text-xs">
              {recentPatients.slice(0, 5).map((patient: any) => (
                <li key={patient.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="overflow-hidden">
                    <p className="font-semibold text-foreground truncate text-sm">
                      {patient.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                      {patient.gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'} • Kontak: {patient.phone || '—'}
                    </p>
                  </div>
                  <Link
                    href={`/pasien/${patient.id}`}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-2.5 py-1 rounded-md bg-muted/30 hover:bg-muted transition-colors shrink-0"
                  >
                    Buka Profil
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
