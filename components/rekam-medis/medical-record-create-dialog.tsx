'use client'

import React, { useState } from 'react'
import { X, Loader2, AlertCircle, Stethoscope, Activity, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createMedicalRecord } from '@/app/rekam-medis/actions'

interface MedicalRecordCreateDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newRecord: any) => void
  patientId: number
  patientName: string
}

export function MedicalRecordCreateDialog({
  isOpen,
  onClose,
  onSuccess,
  patientId,
  patientName,
}: MedicalRecordCreateDialogProps) {
  const [diagnosis, setDiagnosis] = useState('')
  const [icd10Code, setIcd10Code] = useState('')
  const [secondaryDiagnosis, setSecondaryDiagnosis] = useState('')
  const [complaint, setComplaint] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [temperature, setTemperature] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [respiratoryRate, setRespiratoryRate] = useState('')
  const [allergy, setAllergy] = useState('')
  const [treatment, setTreatment] = useState('')
  const [notes, setNotes] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setGeneralError(null)

    if (!diagnosis.trim()) {
      setErrors({ diagnosis: 'Diagnosis utama wajib diisi' })
      return
    }

    setIsSubmitting(true)

    try {
      const res = await createMedicalRecord({
        patientId,
        diagnosis: diagnosis.trim(),
        icd10Code: icd10Code.trim() || undefined,
        secondaryDiagnosis: secondaryDiagnosis.trim() || undefined,
        complaint: complaint.trim() || undefined,
        bloodPressure: bloodPressure.trim() || undefined,
        temperature: temperature.trim() || undefined,
        heartRate: heartRate.trim() || undefined,
        respiratoryRate: respiratoryRate.trim() || undefined,
        allergy: allergy.trim() || undefined,
        treatment: treatment.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      if (res.success && res.record) {
        onSuccess(res.record)
      } else {
        if (res.errors) {
          setErrors(res.errors)
        } else {
          setGeneralError(res.error || 'Gagal menyimpan rekam medis')
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Terjadi kesalahan sistem saat menyimpan rekam medis')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div>
            <h2 className="text-base font-bold text-foreground">
              Tambah Rekam Medis Baru
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pasien: <span className="font-semibold text-foreground">{patientName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {generalError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Assessment Section */}
          <div className="space-y-3 p-3.5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Stethoscope className="w-3.5 h-3.5 text-primary" />
              <span>Diagnosis (Assessment)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-medium text-foreground">
                  Diagnosis Utama <span className="text-destructive">*</span>
                </label>
                <Input
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Contoh: Infeksi Saluran Pernapasan Akut"
                  disabled={isSubmitting}
                  className={errors.diagnosis ? 'border-destructive ring-destructive/20' : ''}
                />
                {errors.diagnosis && <p className="text-[11px] text-destructive">{errors.diagnosis}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">
                  Kode ICD-10
                </label>
                <Input
                  value={icd10Code}
                  onChange={(e) => setIcd10Code(e.target.value)}
                  placeholder="Contoh: J06.9"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">
                Diagnosis Sekunder (Bila ada)
              </label>
              <Input
                value={secondaryDiagnosis}
                onChange={(e) => setSecondaryDiagnosis(e.target.value)}
                placeholder="Contoh: Cephalea / Sakit Kepala"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Subjektif Section */}
          <div className="space-y-3 p-3.5 rounded-lg border border-border bg-white">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Anamnesa & Keluhan</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">
                Keluhan Utama
              </label>
              <textarea
                rows={2}
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Keluhan pasien saat datang..."
                disabled={isSubmitting}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">
                Riwayat Alergi Obat / Makanan
              </label>
              <Input
                value={allergy}
                onChange={(e) => setAllergy(e.target.value)}
                placeholder="Contoh: Alergi Amoxicillin / Tidak ada"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Objektif Section */}
          <div className="space-y-3 p-3.5 rounded-lg border border-border bg-muted/10">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span>Pemeriksaan Fisik & Tanda Vital</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Tekanan Darah
                </label>
                <Input
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  placeholder="120/80 mmHg"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Suhu (°C)
                </label>
                <Input
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="36.5 °C"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Nadi (x/m)
                </label>
                <Input
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="80 x/menit"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Respirasi (x/m)
                </label>
                <Input
                  value={respiratoryRate}
                  onChange={(e) => setRespiratoryRate(e.target.value)}
                  placeholder="18 x/menit"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">
                Pemeriksaan Lanjutan / Catatan Fisik
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hasil inspeksi, palpasi, auskultasi, dll..."
                disabled={isSubmitting}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
              />
            </div>
          </div>

          {/* Planning Section */}
          <div className="space-y-2 p-3.5 rounded-lg border border-border bg-white">
            <label className="text-[11px] font-medium text-foreground block">
              Tindakan, Terapi & Edukasi (Planning)
            </label>
            <textarea
              rows={2}
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              placeholder="Tindakan medis, edukasi pasien, dan anjuran istirahat..."
              disabled={isSubmitting}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Rekam Medis'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
