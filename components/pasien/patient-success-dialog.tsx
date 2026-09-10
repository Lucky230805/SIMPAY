'use client'

import React from 'react'
import Link from 'next/link'
import { CheckCircle2, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatNoRM } from '@/lib/patient-utils'

interface PatientSuccessDialogProps {
  isOpen: boolean
  onClose: () => void
  patient: any | null
}

export function PatientSuccessDialog({
  isOpen,
  onClose,
  patient,
}: PatientSuccessDialogProps) {
  if (!isOpen || !patient) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in-0">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-border p-6 text-center animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <h3 className="text-base font-semibold text-foreground">
          Data Berhasil Ditambahkan
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Data pasien baru telah berhasil disimpan ke dalam sistem. Anda dapat melihat detailnya sekarang.
        </p>

        {/* Patient card snippet */}
        <div className="mt-4 p-3 bg-muted/40 rounded-lg border border-border/60 text-left text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">No. Rekam Medis:</span>
            <span className="font-semibold text-primary">{formatNoRM(patient.id)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nama Pasien:</span>
            <span className="font-medium text-foreground">{patient.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Jenis Kelamin:</span>
            <span className="text-foreground">{patient.gender}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-6">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            TUTUP
          </Button>
          <Link
            href={`/pasien/${patient.id}`}
            className={cn(buttonVariants({ size: 'sm' }), 'w-full sm:w-auto')}
          >
            LIHAT DETAIL PASIEN
          </Link>
        </div>
      </div>
    </div>
  )
}
