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

  const polyclinicName = !queueData.polyclinic || queueData.polyclinic.trim() === 'Poli Umum' ? 'Poli Umum 1' : queueData.polyclinic.trim()
  const formattedQueueNum = formatQueueLabel(polyclinicName, queueData.queueNumber)

  return (
    <>
      {/* Screen Modal Container (Hidden during Print) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 print:hidden">
        <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-border p-6 text-center animate-in zoom-in-95">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Interactive Screen Ticket Card */}
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
                {formattedQueueNum}
              </div>
              <p className="text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terdaftar di {polyclinicName}
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

      {/* PRINT-ONLY AUTHENTIC CLINIC THERMAL QUEUE TICKET RECEIPT */}
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
            {formattedQueueNum}
          </div>
          <span className="text-[11px] font-black uppercase text-black">
            {polyclinicName}
          </span>
        </div>

        {/* Patient Detail Table */}
        <div className="text-left border-y border-dashed border-black py-2 my-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="font-medium text-black">No. Rekam Medis:</span>
            <span className="font-mono font-black text-black">{queueData.noRM}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-black">Nama Pasien:</span>
            <span className="font-black text-black">{queueData.patientName}</span>
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
    </>
  )
}
