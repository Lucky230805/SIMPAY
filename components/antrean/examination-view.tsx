'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, User, Calendar, Phone, MapPin, FileText, Activity, Stethoscope, Pill, Loader2, AlertCircle, Clock } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatNoRM, formatBirthDateAndAge, formatDateIndo, calculateAge } from '@/lib/patient-utils'
import { createMedicalRecord } from '@/app/rekam-medis/actions'
import { saveMedicalRecordAndComplete } from '@/app/antrean/actions'
import { ExaminationSuccessNotification } from './examination-success-notification'
import type { QueueWithPatientDetail } from '@/app/antrean/actions'
import { PatientHistoryDrawer } from '@/components/pasien/patient-history-drawer'

interface ExaminationViewProps {
  queue: QueueWithPatientDetail
}

function getQueueLabel(polyclinic: string | null, queueNumber: number): string {
  if (!polyclinic) return String(queueNumber).padStart(3, '0')
  const prefix = polyclinic.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? 'Q'
  return `${prefix}${String(queueNumber).padStart(2, '0')}`
}

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

export function ExaminationView({ queue }: ExaminationViewProps) {
  const { patient } = queue
  const noRM = formatNoRM(patient.id)
  const birthDateAndAge = formatBirthDateAndAge(patient.dateOfBirth)
  const queueLabel = getQueueLabel(queue.polyclinic, queue.queueNumber)
  const arrivalTime = formatArrivalTime(queue.date)

  // SOAP form state
  const [complaint, setComplaint] = useState('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [temperature, setTemperature] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [respiratoryRate, setRespiratoryRate] = useState('')
  const [allergy, setAllergy] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [icd10Code, setIcd10Code] = useState('')
  const [secondaryDiagnosis, setSecondaryDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [notes, setNotes] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [savedRecordId, setSavedRecordId] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)
  const isCompleted = queue.status === 'SELESAI' || showSuccess

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setGeneralError(null)

    // Client-side validation
    const newErrors: Record<string, string> = {}
    if (!diagnosis.trim()) {
      newErrors.diagnosis = 'Diagnosis utama wajib diisi'
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      const res = await saveMedicalRecordAndComplete({
        queueId: queue.id,
        patientId: patient.id,
        complaint: complaint.trim(),
        allergy: allergy.trim(),
        bloodPressure: bloodPressure.trim(),
        pulse: heartRate.trim(),
        temperature: temperature.trim(),
        respiratoryRate: respiratoryRate.trim(),
        weight: '',
        objectiveNotes: notes.trim(),
        diagnosis: diagnosis.trim(),
        icd10Code: icd10Code.trim(),
        secondaryDiagnosis: secondaryDiagnosis.trim(),
        actionTreatment: treatment.trim(),
        medicines: treatment.trim() ? [{ nama: treatment.trim(), dosis: '', jumlah: '1' }] : [],
      })

      if (!res.success) {
        setGeneralError(res.error || 'Gagal menyimpan rekam medis')
        setIsSubmitting(false)
        return
      }

      setShowSuccess(true)
    } catch (err: any) {
      setGeneralError(err.message || 'Terjadi kesalahan sistem saat menyimpan rekam medis')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb + Queue Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/antrean"
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-9 w-9 shrink-0')}
            title="Kembali ke Antrean"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Pemeriksaan — {patient.name}
              </h1>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {noRM}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-muted-foreground">
                Antrean{' '}
                <span className="font-semibold text-foreground">{queueLabel}</span>
                {' · '}
                {queue.polyclinic ?? 'Poli Umum'}
              </p>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Datang {arrivalTime}
              </span>
            </div>
          </div>
        </div>

        {isCompleted && !showSuccess && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Pemeriksaan Selesai
          </span>
        )}
      </div>

      {/* Success notification */}
      {showSuccess && (
        <ExaminationSuccessNotification
          patientId={patient.id}
          patientName={patient.name}
          onClose={() => setShowSuccess(false)}
        />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── LEFT PANEL: Patient Identity ─── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 pb-3.5 border-b border-border mb-4">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Identitas Pasien</h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">No. Rekam Medis</span>
                <span className="font-mono font-bold text-primary text-sm">{noRM}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Nama Lengkap</span>
                <span className="font-medium text-foreground text-sm">{patient.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Jenis Kelamin</span>
                <span className="font-medium text-foreground">{patient.gender}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Tanggal Lahir &amp; Umur</span>
                <span className="font-medium text-foreground">{birthDateAndAge}</span>
              </div>
              {patient.phone && (
                <div className="flex items-start gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="font-mono text-foreground">{patient.phone}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-foreground leading-relaxed">{patient.address}</span>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsHistoryDrawerOpen(true)}
                className="w-full mt-2 text-xs font-semibold gap-1.5 text-slate-800 border-slate-300 hover:bg-slate-50"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Riwayat Medis Lengkap
              </Button>
            </div>
          </div>

          <PatientHistoryDrawer
            patientId={patient.id}
            isOpen={isHistoryDrawerOpen}
            onClose={() => setIsHistoryDrawerOpen(false)}
          />

          {/* Recent Medical History */}
          {patient.medicalRecords && patient.medicalRecords.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 pb-3.5 border-b border-border mb-4">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">Riwayat Sebelumnya</h2>
              </div>
              <div className="space-y-3">
                {patient.medicalRecords.slice(0, 3).map((mr) => (
                  <div
                    key={mr.id}
                    className="p-3 rounded-lg bg-muted/20 border border-border/60 text-xs space-y-1"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDateIndo(mr.examinationDate)}</span>
                      {mr.icd10Code && (
                        <span className="ml-auto font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[10px]">
                          {mr.icd10Code}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-foreground">{mr.diagnosis || '—'}</p>
                    {mr.complaint && (
                      <p className="text-muted-foreground line-clamp-2">{mr.complaint}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── RIGHT PANEL: SOAP Form ─── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-border">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Form Pemeriksaan Hari Ini</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Isi catatan SOAP untuk pemeriksaan ini.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs">
              {/* General Error */}
              {generalError && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{generalError}</span>
                </div>
              )}

              {/* ── S: Subjective ── */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wide">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  <span>Keluhan Utama (Subjektif)</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Keluhan Pasien</label>
                  <textarea
                    rows={3}
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    placeholder="Tulis keluhan utama yang disampaikan pasien saat datang..."
                    disabled={isSubmitting || isCompleted}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
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
                    disabled={isSubmitting || isCompleted}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* ── O: Objective (Vital Signs) ── */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-white">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wide">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  <span>Tanda Vital (Objektif)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-semibold text-muted-foreground">
                      Tekanan Darah
                    </label>
                    <Input
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      placeholder="120/80 mmHg"
                      disabled={isSubmitting || isCompleted}
                      className="text-xs h-8"
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
                      disabled={isSubmitting || isCompleted}
                      className="text-xs h-8"
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
                      disabled={isSubmitting || isCompleted}
                      className="text-xs h-8"
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
                      disabled={isSubmitting || isCompleted}
                      className="text-xs h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">
                    Catatan Pemeriksaan Fisik
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Hasil inspeksi, palpasi, auskultasi, perkusi..."
                    disabled={isSubmitting || isCompleted}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* ── A: Assessment (Diagnosis) ── */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/10">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wide">
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
                      disabled={isSubmitting || isCompleted}
                      className={cn(
                        'text-xs h-8',
                        errors.diagnosis ? 'border-destructive ring-destructive/20' : ''
                      )}
                    />
                    {errors.diagnosis && (
                      <p className="text-[11px] text-destructive">{errors.diagnosis}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground">Kode ICD-10</label>
                    <Input
                      value={icd10Code}
                      onChange={(e) => setIcd10Code(e.target.value)}
                      placeholder="Contoh: J06.9"
                      disabled={isSubmitting || isCompleted}
                      className="text-xs h-8"
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
                    disabled={isSubmitting || isCompleted}
                    className="text-xs h-8"
                  />
                </div>
              </div>

              {/* ── P: Plan (Treatment) ── */}
              <div className="space-y-3 p-4 rounded-lg border border-border bg-white">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wide">
                  <Pill className="w-3.5 h-3.5 text-primary" />
                  <span>Resep &amp; Obat (Plan)</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">
                    Tindakan, Terapi &amp; Edukasi
                  </label>
                  <textarea
                    rows={3}
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    placeholder="Tindakan medis, daftar obat yang diresepkan, edukasi pasien, dan anjuran..."
                    disabled={isSubmitting || isCompleted}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Submit */}
              {!isCompleted && (
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
                  <Link
                    href="/antrean"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs h-9')}
                  >
                    Kembali
                  </Link>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-9 text-xs gap-1.5"
                    disabled={isSubmitting}
                    id="btn-simpan-rekam-medis"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5" />
                        Simpan Rekam Medis
                      </>
                    )}
                  </Button>
                </div>
              )}

              {isCompleted && !showSuccess && (
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Pemeriksaan telah selesai dan rekam medis sudah tersimpan.
                  </p>
                  <Link
                    href="/antrean"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-xs h-8')}
                  >
                    Kembali ke Antrean
                  </Link>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
