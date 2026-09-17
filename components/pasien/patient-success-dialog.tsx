'use client'

import React from 'react'
import Link from 'next/link'
import { CheckCircle2, X, Printer, Ticket } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatNoRM } from '@/lib/patient-utils'

interface PatientSuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: any | null
  queue?: any | null
}

export function PatientSuccessDialog({
  isOpen,
  onClose,
  patient,
  queue,
}: PatientSuccessDialogProps) {
  if (!isOpen || !patient) return null

  const handlePrint = () => {
    window.print()
  }

  const queueNum = queue?.queueNumber || patient?.todayQueue?.queueNumber
  const formattedQueueNum = queueNum ? String(queueNum).padStart(3, '0') : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in-0">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-border p-6 text-center animate-in zoom-in-95">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-foreground">
          Pasien & Antrean Berhasil Didaftarkan!
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Data pasien baru telah tersimpan dan otomatis masuk ke antrean hari ini.
        </p>

        {/* Ticket Header & Number */}
        {formattedQueueNum && (
          <div className="my-4 p-4 bg-gradient-to-b from-primary/10 via-primary/5 to-white rounded-xl border border-primary/20 text-center shadow-xs">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-primary" />
              NOMOR ANTREAN PASIEN
            </p>
            <div className="my-2 inline-block bg-primary text-primary-foreground text-3xl font-extrabold px-6 py-1.5 rounded-xl shadow-md font-mono tracking-tight">
              #{formattedQueueNum}
            </div>
            <p className="text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar di {queue?.polyclinic || 'Poli Umum'}
            </p>
          </div>
        )}

        {/* Patient card snippet */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border/60 text-left text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">No. Rekam Medis:</span>
            <span className="font-mono font-semibold text-primary">{formatNoRM(patient.id)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Nama Pasien:</span>
            <span className="font-bold text-foreground">{patient.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground font-medium">Jenis Kelamin:</span>
            <span className="text-foreground">{patient.gender}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-5">
          <Button variant="outline" size="sm" type="button" onClick={handlePrint} className="w-full sm:w-auto gap-1.5 font-semibold text-xs">
            <Printer className="w-3.5 h-3.5 text-primary" />
            Cetak Tiket
          </Button>
          <Link
            href={`/pasien/${patient.id}`}
            className={cn(buttonVariants({ size: 'sm' }), 'w-full sm:w-auto text-xs font-semibold')}
          >
            LIHAT DETAIL PASIEN
          </Link>
        </div>
      </div>
    </div>
  )
}
