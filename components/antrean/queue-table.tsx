'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Play, Eye, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { startExamination } from '@/app/antrean/actions'
import type { QueueItem } from '@/app/antrean/actions'

interface QueueTableProps {
  queues: QueueItem[]
}

/** Derive queue-number label from polyclinic prefix + number (e.g. "Poli Umum" + 1 → "A01") */
function getQueueLabel(polyclinic: string | null, queueNumber: number): string {
  if (!polyclinic) return String(queueNumber).padStart(3, '0')
  const prefix = polyclinic.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? 'Q'
  return `${prefix}${String(queueNumber).padStart(2, '0')}`
}

/** Format a Date to "HH:MM WIB" */
function formatArrivalTime(date: Date | string): string {
  const d = new Date(date)
  return (
    d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' WIB'
  )
}

interface StatusBadgeProps {
  status: string
}

function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = (status || '').trim().toUpperCase()

  if (normalizedStatus === 'SELESAI') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Selesai
      </span>
    )
  }
  if (normalizedStatus === 'DALAM_PEMERIKSAAN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
        Dalam Pemeriksaan
      </span>
    )
  }
  if (normalizedStatus === 'MENUNGGU_OBAT_DAN_BAYAR') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
        Menunggu Obat & Bayar
      </span>
    )
  }
  // MENUNGGU
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
      Menunggu
    </span>
  )
}

export function QueueTable({ queues }: QueueTableProps) {
  const router = useRouter()
  const [startingId, setStartingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleMulaiPeriksa = async (queue: QueueItem) => {
    setErrorMsg(null)
    setStartingId(queue.id)

    try {
      const res = await startExamination(queue.id)
      if (res.success) {
        startTransition(() => {
          router.push(`/antrean/${queue.id}`)
        })
      } else {
        setErrorMsg(res.error || 'Gagal memulai pemeriksaan')
        setStartingId(null)
      }
    } catch {
      setErrorMsg('Terjadi kesalahan saat memulai pemeriksaan')
      setStartingId(null)
    }
  }

  const handleDetail = (queue: QueueItem) => {
    router.push(`/antrean/${queue.id}`)
  }

  if (queues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Clock className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Belum ada antrean hari ini.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Pasien yang mendaftar hari ini akan muncul di sini.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      {errorMsg && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
          {errorMsg}
        </div>
      )}

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-16">
              No
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Nama Pasien
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-32">
              Waktu Datang
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-32">
              Poliklinik
            </th>
            <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-36">
              Status
            </th>
            <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide w-36">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {queues.map((queue) => {
            const isStarting = startingId === queue.id
            const label = getQueueLabel(queue.polyclinic, queue.queueNumber)
            const arrivalTime = formatArrivalTime(queue.date)
            const statusKey = (queue.status || '').trim().toUpperCase()

            return (
              <tr
                key={queue.id}
                className="hover:bg-muted/30 transition-colors"
              >
                {/* No */}
                <td className="py-3 px-3">
                  <span className="font-mono font-bold text-foreground">{label}</span>
                </td>

                {/* Nama Pasien */}
                <td className="py-3 px-3">
                  <span className="font-medium text-foreground">{queue.patient.name}</span>
                </td>

                {/* Waktu Datang */}
                <td className="py-3 px-3">
                  <span className="text-muted-foreground font-mono">{arrivalTime}</span>
                </td>

                {/* Poliklinik */}
                <td className="py-3 px-3">
                  <span className="text-foreground">{queue.polyclinic ?? '—'}</span>
                </td>

                {/* Status */}
                <td className="py-3 px-3">
                  <StatusBadge status={queue.status} />
                </td>

                {/* Aksi */}
                <td className="py-3 px-3 text-right">
                  {statusKey === 'DALAM_PEMERIKSAAN' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => handleDetail(queue)}
                      id={`btn-lanjut-periksa-${queue.id}`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Lanjut Periksa
                    </Button>
                  ) : statusKey === 'MENUNGGU_OBAT_DAN_BAYAR' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50"
                      onClick={() => handleDetail(queue)}
                      id={`btn-detail-${queue.id}`}
                    >
                      <Eye className="w-3 h-3" />
                      Lihat Rekam Medis
                    </Button>
                  ) : statusKey === 'SELESAI' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => handleDetail(queue)}
                      id={`btn-detail-${queue.id}`}
                    >
                      <Eye className="w-3 h-3" />
                      Detail
                    </Button>
                  ) : (
                    /* Default for MENUNGGU or any unhandled status */
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => handleMulaiPeriksa(queue)}
                      disabled={isStarting || isPending}
                      id={`btn-mulai-periksa-${queue.id}`}
                    >
                      {isStarting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      {isStarting ? 'Memulai...' : 'Mulai Periksa'}
                    </Button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

