'use client'

import React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SuratItem } from '@/app/surat/actions'

interface SuratDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  surat: SuratItem | null
  isDeleting: boolean
  errorMessage?: string | null
}

export function SuratDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  surat,
  isDeleting,
  errorMessage,
}: SuratDeleteDialogProps) {
  if (!isOpen || !surat) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6 text-center animate-in zoom-in-95">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-slate-900">
          Hapus Catatan Surat Medis?
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Apakah Anda yakin ingin menghapus catatan surat ini dari sistem? Tindakan ini tidak dapat dibatalkan.
        </p>

        <div className="my-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-left text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Nomor Surat:</span>
            <span className="font-mono font-bold text-slate-900">{surat.certificateNo}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Pasien:</span>
            <span className="font-semibold text-slate-900">{surat.patientName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Tipe Surat:</span>
            <span className={`font-semibold ${surat.type === 'SAKIT' ? 'text-emerald-700' : 'text-teal-700'}`}>
              {surat.type === 'SAKIT' ? 'Surat Keterangan Sakit' : 'Surat Keterangan Sehat'}
            </span>
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs text-rose-600 mb-4 bg-rose-50 p-2 rounded border border-rose-200">{errorMessage}</p>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting} className="text-xs h-9">
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 font-semibold"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Menghapus...
              </>
            ) : (
              'Ya, Hapus Surat'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
