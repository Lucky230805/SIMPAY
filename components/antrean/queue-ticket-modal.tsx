'use client'

import React from 'react'
import { CheckCircle2, Printer, X, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatQueueLabel } from '@/lib/patient-utils'

export interface QueueTicketData {
  queueNumber: number
  patientName: string
  noRM: string
  polyclinic?: string
}

interface QueueTicketModalProps {
  isOpen: boolean
  onClose: () => void
  queueData: QueueTicketData | null
}

export function QueueTicketModal({ isOpen, onClose, queueData }: QueueTicketModalProps) {
  if (!isOpen || !queueData) return null

  const handlePrint = () => {
    window.print()
  }

  const formattedQueueNum = formatQueueLabel(queueData.polyclinic || 'Poli Umum 1', queueData.queueNumber)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-border p-6 text-center animate-in zoom-in-95">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Printable Ticket Card */}
        <div className="p-5 bg-gradient-to-b from-primary/5 via-white to-primary/5 rounded-xl border border-primary/20 space-y-3">
          <div className="flex items-center justify-center gap-2 text-primary font-bold text-sm uppercase tracking-wider border-b border-dashed border-primary/20 pb-3">
            <Building2 className="w-4 h-4" />
            <span>SIMPAY CLINIC</span>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              TIKET ANTREAN PASIEN
            </p>
            <div className="my-2.5 inline-block bg-primary text-primary-foreground text-4xl font-extrabold px-6 py-2 rounded-xl shadow-md font-mono tracking-tight">
              #{formattedQueueNum}
            </div>
            <p className="text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar di {queueData.polyclinic || 'Poli Umum'}
            </p>
          </div>

          <div className="text-left bg-white p-3 rounded-lg border border-border text-xs space-y-1.5 shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Nama Pasien:</span>
              <span className="font-bold text-foreground">{queueData.patientName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">No. Rekam Medis:</span>
              <span className="font-mono font-semibold text-primary">{queueData.noRM}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Waktu Daftar:</span>
              <span className="text-muted-foreground font-mono">
                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handlePrint}
            className="flex-1 text-xs gap-1.5 font-semibold"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            Cetak Tiket
          </Button>
          <Button size="sm" type="button" onClick={onClose} className="flex-1 text-xs font-semibold">
            Selesai
          </Button>
        </div>
      </div>
    </div>
  )
}
