'use client'

import React from 'react'
import Link from 'next/link'
import { CheckCircle2, X, Printer, Ticket } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatNoRM, formatQueueLabel } from '@/lib/patient-utils'

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
  const rawPolyclinic = queue?.polyclinic || patient?.todayQueue?.polyclinic || 'Poli Umum 1'
  const polyclinicName = !rawPolyclinic || rawPolyclinic.trim() === 'Poli Umum' ? 'Poli Umum 1' : rawPolyclinic.trim()
  const formattedQueueNumText = queueNum ? formatQueueLabel(polyclinicName, queueNum) : null

  return (
    <>
      {/* Screen Modal Container (Hidden during Print) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in-0 print:hidden">
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
            Pasien &amp; Antrean Berhasil Didaftarkan!
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Data pasien baru telah tersimpan dan otomatis masuk ke antrean hari ini.
          </p>

          {/* Ticket Header & Number */}
          {formattedQueueNumText && (
            <div className="my-4 p-4 bg-gradient-to-b from-primary/10 via-primary/5 to-white rounded-xl border border-primary/20 text-center shadow-xs">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-1">
                <Ticket className="w-3.5 h-3.5 text-primary" />
                NOMOR ANTREAN PASIEN
              </p>
              <div className="my-2 inline-block bg-primary text-primary-foreground text-3xl font-extrabold px-6 py-1.5 rounded-xl shadow-md font-mono tracking-tight">
                {formattedQueueNumText}
              </div>
              <p className="text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar di {polyclinicName}
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

      {/* PRINT-ONLY AUTHENTIC CLINIC THERMAL QUEUE TICKET RECEIPT */}
      {formattedQueueNumText && (
        <div className="hidden print:block font-sans text-black p-4 max-w-[80mm] mx-auto text-center bg-white">
          {/* Kop Klinik */}
          <div className="border-b-2 border-black pb-2 mb-3">
            <h2 className="font-black text-base uppercase tracking-wider text-black">
              SIMPAY CLINIC
            </h2>
            <p className="text-[11px] font-bold text-black mt-0.5">
              Klinik Pratama &amp; Layanan Medis Terpadu
            </p>
            <p className="text-[10px] text-black">
              Jl. Kesehatan No. 1 • Telp: (021) 555-0123
            </p>
          </div>

          {/* Sub Header */}
          <div className="my-2">
            <span className="text-[11px] font-black uppercase tracking-widest border-b border-black pb-0.5 inline-block">
              TIKET ANTREAN PASIEN
            </span>
          </div>

          {/* Big Queue Number Box */}
          <div className="my-3 py-3 border-2 border-black rounded-xl bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black">
              NOMOR ANTREAN:
            </span>
            <div className="text-5xl font-black font-mono tracking-tight my-1 text-black">
              {formattedQueueNumText}
            </div>
            <span className="text-[11px] font-black uppercase text-black">
              {polyclinicName}
            </span>
          </div>

          {/* Patient Detail Table */}
          <div className="text-left border-y border-dashed border-black py-2 my-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="font-medium text-black">No. Rekam Medis:</span>
              <span className="font-mono font-black text-black">{formatNoRM(patient.id)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-black">Nama Pasien:</span>
              <span className="font-black text-black">{patient.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-black">Tujuan Poli:</span>
              <span className="font-bold text-black">{polyclinicName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-black">Waktu Daftar:</span>
              <span className="font-mono font-bold text-black">
                {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            </div>
          </div>

          {/* Waiting Room Himbauan / Footer */}
          <div className="text-[10px] text-black space-y-1 mt-4">
            <p className="font-bold">
              * Mohon menunggu nomor antrean Anda dipanggil di Ruang Tunggu.
            </p>
            <p className="italic text-[9px] mt-2 border-t border-slate-300 pt-1">
              Terima Kasih Atas Kepercayaan Anda Kepada SIMPAY Clinic
            </p>
          </div>
        </div>
      )}
    </>
  )
}
