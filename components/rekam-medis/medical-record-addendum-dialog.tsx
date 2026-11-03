'use client'

import React, { useState } from 'react'
import { X, Loader2, AlertCircle, ShieldAlert, FilePlus2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createMedicalRecordAddendum, MedicalRecordItem, getMedicalRecordById } from '@/app/rekam-medis/actions'
import { formatNoRM } from '@/lib/patient-utils'

interface MedicalRecordAddendumDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedRecord: MedicalRecordItem) => void
  record: MedicalRecordItem | null
}

const FIELD_OPTIONS = [
  'Diagnosis Utama',
  'Diagnosis Sekunder & ICD-10',
  'Resep & Terapi Obat',
  'Tanda-Tanda Vital',
  'Tindakan & Prosedur Medis',
  'Anamnesa & Keluhan',
  'Edukasi & Rencana Tindak Lanjut',
  'Lainnya',
]

export function MedicalRecordAddendumDialog({
  isOpen,
  onClose,
  onSuccess,
  record,
}: MedicalRecordAddendumDialogProps) {
  const [fieldChanged, setFieldChanged] = useState(FIELD_OPTIONS[0])
  const [reason, setReason] = useState('')
  const [content, setContent] = useState('')
  const [previousValue, setPreviousValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !record) return null

  const noRM = formatNoRM(record.patient.id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!reason.trim() || reason.trim().length < 3) {
      setError('Alasan koreksi resmi wajib diisi minimal 3 karakter.')
      return
    }

    if (!content.trim() || content.trim().length < 3) {
      setError('Isi catatan addendum koreksi wajib diisi minimal 3 karakter.')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await createMedicalRecordAddendum({
        medicalRecordId: record.id,
        fieldChanged,
        reason: reason.trim(),
        content: content.trim(),
        previousValue: previousValue.trim() || undefined,
      })

      if (res.success) {
        // Fetch fresh enriched record
        const fresh = await getMedicalRecordById(record.id)
        if (fresh) {
          onSuccess(fresh)
        }
        onClose()
      } else {
        setError(res.error || 'Gagal menambahkan addendum.')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat menyimpan addendum.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-card text-card-foreground rounded-2xl shadow-2xl border border-border p-6 z-10 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-start justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Tambah Catatan Addendum Medis
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Pasien: {record.patient.name} ({noRM}) • RM #{record.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Regulatory Notice Banner */}
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed">
            <strong>Permenkes No. 24/2022:</strong> Rekam medis yang telah difinalisasi tidak dapat ditimpa atau dihapus. Koreksi data wajib dicatat secara resmi melalui <em>Addendum</em> dengan menyertakan alasan koreksi klinis dan identitas dokter penanggung jawab.
          </p>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Field Changed Selector */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Bagian / Kategori yang Dikoreksi <span className="text-destructive">*</span>
            </label>
            <select
              value={fieldChanged}
              onChange={(e) => setFieldChanged(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Alasan Resmi Koreksi Klinis <span className="text-destructive">*</span>
            </label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Ralat hasil pemeriksaan penunjang lab / Koreksi salah ketik"
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Previous Value (Optional) */}
          <div>
            <label className="block font-semibold text-muted-foreground mb-1">
              Catatan / Nilai Sebelumnya (Opsional):
            </label>
            <Input
              value={previousValue}
              onChange={(e) => setPreviousValue(e.target.value)}
              placeholder="Contoh: Faringitis Akut (J02.9)"
              className="h-8 text-xs text-muted-foreground"
            />
          </div>

          {/* Content / Addendum Details */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              Isi Catatan Addendum / Koreksi Resmi <span className="text-destructive">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tuliskan catatan perbaikan klinis selengkapnya..."
              rows={4}
              className="w-full rounded-lg border border-input bg-background p-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Addendum Resmi</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

