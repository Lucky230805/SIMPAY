import { ClipboardList, Users, CheckCircle2, Clock } from 'lucide-react'
import { getTodayQueues } from './actions'
import { QueueTable } from '@/components/antrean/queue-table'

export const metadata = { title: 'Antrean Pemeriksaan — SIMPAY' }

export default async function AntreanPage() {
  const queues = await getTodayQueues()

  const total = queues.length
  const menunggu = queues.filter((q) => q.status === 'MENUNGGU').length
  const dalamPemeriksaan = queues.filter((q) => q.status === 'DALAM_PEMERIKSAAN').length
  const selesai = queues.filter((q) => q.status === 'SELESAI').length

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">Antrean Pemeriksaan</h1>
        </div>
        <p className="text-sm text-muted-foreground">Kelola daftar pasien yang menunggu hari ini.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Antrean */}
        <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Total Antrean
            </p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{total}</p>
          </div>
        </div>

        {/* Menunggu */}
        <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Menunggu
            </p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">
              {menunggu + dalamPemeriksaan}
            </p>
            {dalamPemeriksaan > 0 && (
              <p className="text-[10px] text-blue-600 mt-0.5">
                {dalamPemeriksaan} dalam pemeriksaan
              </p>
            )}
          </div>
        </div>

        {/* Selesai */}
        <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Selesai
            </p>
            <p className="text-2xl font-bold text-foreground leading-none mt-0.5">{selesai}</p>
          </div>
        </div>
      </div>

      {/* Queue Table Card */}
      <div className="bg-white rounded-xl border border-border w-full">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Daftar Antrean Hari Ini</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total > 0
              ? `${total} pasien terdaftar · ${selesai} selesai · ${menunggu} menunggu`
              : 'Belum ada pasien yang terdaftar hari ini'}
          </p>
        </div>
        <div className="p-2">
          <QueueTable queues={queues} />
        </div>
      </div>
    </div>
  )
}