'use client'

import React, { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deletePatient, PatientRecord } from '@/app/pasien/actions'
import { formatNoRM } from '@/lib/patient-utils'

interface PatientDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  patient: PatientRecord | null
}

export function PatientDeleteDialog({
  isOpen,
  onClose,
  onSuccess,
  patient,
}: PatientDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !patient) return null

  const handleDelete = async () => {
    setIsDeleting(true)
    setErrorMessage(null)

    try {
      const res = await deletePatient(patient.id)
      if (res.success) {
        onSuccess()
      } else {
        setErrorMessage(res.error || 'Gagal menghapus data pasien')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menghapus')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in-0">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-border p-6 text-center animate-in zoom-in-95">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-semibold text-foreground">
          Hapus Data Pasien?
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Apakah Anda yakin ingin menghapus data pasien ini? Tindakan ini akan menghapus riwayat pemeriksaan pasien dan tidak dapat dibatalkan.
        </p>

        <div className="my-4 p-3 bg-muted/30 rounded-lg border border-border/60 text-left text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">No. RM:</span>
            <span className="font-semibold text-foreground">{formatNoRM(patient.id)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nama:</span>
            <span className="font-medium text-foreground">{patient.name}</span>
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs text-destructive mb-4">{errorMessage}</p>
        )}

        <div className="flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Batal
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Menghapus...
              </>
            ) : (
              'Hapus Pasien'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
