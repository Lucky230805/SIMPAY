'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Users, CheckCircle2, Clock, Building2 } from 'lucide-react'
import { getTodayQueues } from './actions'
import { QueueTable } from '@/components/antrean/queue-table'
import { getSessionUserAction } from '@/app/login/actions'

export default function AntreanPage() {
  const [queues, setQueues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPoli, setSelectedPoli] = useState<string>('ALL')

  useEffect(() => {
    let active = true
    async function loadData() {
      try {
        const u = await getSessionUserAction()
        let initialPoli = 'ALL'
        if (u?.role === 'DOKTER') {
          if (u.name.toLowerCase().includes('farisi')) {
            initialPoli = 'Poli Umum 2'
          } else {
            initialPoli = 'Poli Umum 1'
          }
        }
        if (active) {
          setSelectedPoli(initialPoli)
          const q = await getTodayQueues(initialPoli)
          setQueues(q)
        }
      } catch (err) {
        console.error('Failed to load today queues:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    loadData()
    return () => {
      active = false
    }
  }, [])

  const handlePoliChange = async (newPoli: string) => {
    setSelectedPoli(newPoli)
    setLoading(true)
    try {
      const q = await getTodayQueues(newPoli)
      setQueues(q)
    } catch (err) {
      console.error('Failed to filter queues by polyclinic:', err)
    } finally {
      setLoading(false)
    }
  }

  const total = queues.length
  const menunggu = queues.filter((q) => q.status === 'MENUNGGU').length
  const dalamPemeriksaan = queues.filter((q) => q.status === 'DALAM_PEMERIKSAAN').length
  const selesai = queues.filter((q) => q.status === 'SELESAI').length

  if (loading) {
    return (
      <div className="p-6 space-y-6 w-full animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">Antrean Pemeriksaan</h1>
          </div>
          <p className="text-sm text-muted-foreground">Kelola daftar pasien yang menunggu hari ini.</p>
        </div>

        {/* Polyclinic Filter */}
        <div className="flex items-center gap-2 bg-white border border-border px-3 py-1.5 rounded-xl shadow-xs">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground">Filter Poli:</span>
          <select
            value={selectedPoli}
            onChange={(e) => handlePoliChange(e.target.value)}
            className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer"
          >
            <option value="Poli Umum 1">Poli Umum 1 (dr. Raniisyana)</option>
            <option value="Poli Umum 2">Poli Umum 2 (dr. Farisi)</option>
            <option value="ALL">Semua Poliklinik</option>
          </select>
        </div>
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