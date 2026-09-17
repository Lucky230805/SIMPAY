'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Activity,
  Stethoscope,
  Pill,
  Loader2,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  ShoppingBag,
  Syringe,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatNoRM, formatBirthDateAndAge, formatDateIndo, calculateAge } from '@/lib/patient-utils'
import { createMedicalRecord } from '@/app/rekam-medis/actions'
import { saveMedicalRecordAndComplete } from '@/app/antrean/actions'
import type { QueueWithPatientDetail, PrescriptionMedicineOption } from '@/app/antrean/actions'
import { ExaminationSuccessNotification } from './examination-success-notification'
import { MedicineCategoryBadge } from '@/components/ui/medicine-category-badge'
import { PatientHistoryDrawer } from '@/components/pasien/patient-history-drawer'

interface PrescribedMedicineItem {
  id: string
  medicineId?: number
  nama: string
  dosis: string
  jumlah: string
  unitPrice: number
  unit: string
}

interface PrescribedActionItem {
  id: string
  actionId?: number
  nama: string
  tarif: number
  jumlah: string
}

interface ExaminationViewProps {
  queue: QueueWithPatientDetail
  medicinesList?: PrescriptionMedicineOption[]
}

const FREQUENCY_PRESETS = [
  '1x sehari (tiap 24 jam)',
  '2x sehari (tiap 12 jam)',
  '3x sehari (tiap 8 jam)',
  '4x sehari (tiap 6 jam)',
]

const TIMING_PRESETS = [
  'sebelum makan',
  'sesudah makan',
]

const DOSAGE_PRESETS = [
  '3x sehari (tiap 8 jam) sesudah makan',
  '2x sehari (tiap 12 jam) sesudah makan',
  '1x sehari (tiap 24 jam) sesudah makan',
  '4x sehari (tiap 6 jam) sesudah makan',
  '3x sehari (tiap 8 jam) sebelum makan',
  '2x sehari (tiap 12 jam) sebelum makan',
  '1x sehari (tiap 24 jam) sebelum makan',
  '4x sehari (tiap 6 jam) sebelum makan',
]

const ACTION_PRESETS = [
  { nama: 'Injeksi / Obat Suntik (Dexamethasone / Neurobion)', tarif: 35000 },
  { nama: 'Terapi Nebulizer (Inhalasi / Uap)', tarif: 50000 },
  { nama: 'Rawat & Jahit Luka ringan-sedang', tarif: 75000 },
  { nama: 'Pemasangan Infus & Cairan RL/PZ', tarif: 85000 },
  { nama: 'Pemeriksaan EKG / Rekam Jantung', tarif: 60000 },
]

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ExaminationView({ queue, medicinesList = [] }: ExaminationViewProps) {
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

  // Prescribed medicines state
  const [prescriptions, setPrescriptions] = useState<PrescribedMedicineItem[]>([])
  const [selectedMedId, setSelectedMedId] = useState<string>('')
  const [inputDosage, setInputDosage] = useState<string>('3x sehari (tiap 8 jam) sesudah makan')
  const [inputQty, setInputQty] = useState<string>('10')
  const [prescError, setPrescError] = useState<string | null>(null)

  // Prescribed medical actions / procedures state
  const [actionsList, setActionsList] = useState<PrescribedActionItem[]>([])
  const [selectedActionId, setSelectedActionId] = useState<string>('')
  const [inputActionQty, setInputActionQty] = useState<string>('1')
  const [inputActionTarif, setInputActionTarif] = useState<string>('50000')
  const [actionError, setActionError] = useState<string | null>(null)

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)
  const isCompleted = queue.status === 'SELESAI' || showSuccess

  const selectedMedObject = medicinesList.find((m) => m.id.toString() === selectedMedId)
  const selectedActionObject = medicinesList.find((m) => m.id.toString() === selectedActionId)

  // Separate medicine options vs action options
  const medicineOptions = medicinesList.filter(
    (m) =>
      !(
        m.category?.toLowerCase().includes('tindakan') ||
        m.category?.toLowerCase().includes('layanan')
      )
  )
  const procedureOptions = medicinesList.filter(
    (m) =>
      m.category?.toLowerCase().includes('tindakan') ||
      m.category?.toLowerCase().includes('injeksi') ||
      m.category?.toLowerCase().includes('suntik') ||
      m.category?.toLowerCase().includes('layanan')
  )

  const handleAddMedicine = () => {
    setPrescError(null)
    if (!selectedMedId || !selectedMedObject) {
      setPrescError('Silakan pilih obat dari stok terlebih dahulu')
      return
    }
    const qtyNum = parseInt(inputQty, 10)
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setPrescError('Jumlah obat harus berupa angka minimal 1')
      return
    }
    if (qtyNum > selectedMedObject.availableStock) {
      setPrescError(
        `Jumlah melebihi stok yang tersedia (${selectedMedObject.availableStock} ${selectedMedObject.unit})`
      )
      return
    }
    if (!inputDosage.trim()) {
      setPrescError('Dosis / Aturan pakai wajib diisi')
      return
    }

    const existingIndex = prescriptions.findIndex((p) => p.medicineId === selectedMedObject.id)
    if (existingIndex >= 0) {
      const updated = [...prescriptions]
      const newTotalQty = parseInt(updated[existingIndex].jumlah, 10) + qtyNum
      if (newTotalQty > selectedMedObject.availableStock) {
        setPrescError(
          `Total jumlah melebihi stok yang tersedia (${selectedMedObject.availableStock} ${selectedMedObject.unit})`
        )
        return
      }
      updated[existingIndex].jumlah = newTotalQty.toString()
      updated[existingIndex].dosis = inputDosage.trim()
      setPrescriptions(updated)
    } else {
      setPrescriptions((prev) => [
        ...prev,
        {
          id: `${selectedMedObject.id}-${Date.now()}`,
          medicineId: selectedMedObject.id,
          nama: selectedMedObject.name,
          dosis: inputDosage.trim(),
          jumlah: qtyNum.toString(),
          unitPrice: selectedMedObject.unitPrice,
          unit: selectedMedObject.unit,
        },
      ])
    }

    setSelectedMedId('')
    setInputDosage('3x sehari (tiap 8 jam) sesudah makan')
    setInputQty('10')
  }

  const handleRemoveMedicine = (id: string) => {
    setPrescriptions((prev) => prev.filter((p) => p.id !== id))
  }

  const handleAddAction = () => {
    setActionError(null)
    if (!selectedActionId && !selectedActionObject) {
      setActionError('Silakan pilih tindakan medis atau gunakan preset di bawah')
      return
    }

    const tarifNum = parseFloat(inputActionTarif) || 0
    const qtyNum = parseInt(inputActionQty, 10) || 1
    const nameToUse = selectedActionObject ? selectedActionObject.name : 'Tindakan Medis'

    const existingIndex = actionsList.findIndex((a) => a.nama === nameToUse)
    if (existingIndex >= 0) {
      const updated = [...actionsList]
      updated[existingIndex].jumlah = (parseInt(updated[existingIndex].jumlah, 10) + qtyNum).toString()
      updated[existingIndex].tarif = tarifNum
      setActionsList(updated)
    } else {
      setActionsList((prev) => [
        ...prev,
        {
          id: `act-${Date.now()}`,
          actionId: selectedActionObject?.id,
          nama: nameToUse,
          tarif: tarifNum,
          jumlah: qtyNum.toString(),
        },
      ])
    }

    setSelectedActionId('')
    setInputActionQty('1')
  }

  const handleSelectActionPreset = (preset: { nama: string; tarif: number }) => {
    setActionError(null)
    const matchingInStock = medicinesList.find((m) =>
      m.name.toLowerCase().includes(preset.nama.toLowerCase().slice(0, 10))
    )

    const existingIndex = actionsList.findIndex((a) => a.nama === preset.nama)
    if (existingIndex >= 0) {
      const updated = [...actionsList]
      updated[existingIndex].jumlah = (parseInt(updated[existingIndex].jumlah, 10) + 1).toString()
      setActionsList(updated)
    } else {
      setActionsList((prev) => [
        ...prev,
        {
          id: `act-${Date.now()}`,
          actionId: matchingInStock?.id,
          nama: preset.nama,
          tarif: preset.tarif,
          jumlah: '1',
        },
      ])
    }
  }

  const handleRemoveAction = (id: string) => {
    setActionsList((prev) => prev.filter((a) => a.id !== id))
  }

  const totalEstimatedMedicineFee = prescriptions.reduce((sum, item) => {
    const qty = parseInt(item.jumlah, 10) || 0
    return sum + item.unitPrice * qty
  }, 0)

  const totalEstimatedActionFee = actionsList.reduce((sum, item) => {
    const qty = parseInt(item.jumlah, 10) || 1
    return sum + item.tarif * qty
  }, 0)

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
        medicines: prescriptions.map((p) => ({
          nama: p.nama,
          dosis: p.dosis,
          jumlah: p.jumlah,
        })),
        actionsList: actionsList.map((a) => ({
          nama: a.nama,
          tarif: a.tarif,
          jumlah: a.jumlah,
        })),
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
                Isi catatan SOAP, tindakan medis/injeksi, dan resep obat untuk pasien.
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

              {/* ── P1: Tindakan & Layanan Medis (Procedures & Injections) ── */}
              <div className="space-y-4 p-4 rounded-lg border border-purple-200 bg-purple-50/20">
                <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-900 uppercase tracking-wide">
                    <Syringe className="w-3.5 h-3.5 text-purple-700" />
                    <span>Tindakan Medis &amp; Injeksi (Plan)</span>
                  </div>
                  {actionsList.length > 0 && (
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                      {actionsList.length} Tindakan ({formatCurrency(totalEstimatedActionFee)})
                    </span>
                  )}
                </div>

                {!isCompleted && (
                  <div className="p-3.5 rounded-lg border border-purple-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-purple-950 flex items-center gap-1.5">
                        <Syringe className="w-3.5 h-3.5 text-purple-600" />
                        Pilih Tindakan Medis / Obat Suntik
                      </label>
                      <span className="text-[10px] text-muted-foreground">
                        {procedureOptions.length > 0 ? `${procedureOptions.length} tindakan terdaftar` : 'Preset Cepat Tersedia'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-6 space-y-1">
                        <select
                          value={selectedActionId}
                          onChange={(e) => {
                            setSelectedActionId(e.target.value)
                            const obj = medicinesList.find((m) => m.id.toString() === e.target.value)
                            if (obj) {
                              setInputActionTarif(obj.unitPrice.toString())
                            }
                            setActionError(null)
                          }}
                          disabled={isSubmitting || isCompleted}
                          className="w-full h-8 rounded-md border border-input bg-white px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
                        >
                          <option value="">-- Pilih Tindakan Medis / Injeksi --</option>
                          {procedureOptions.map((act) => (
                            <option key={act.id} value={act.id}>
                              {act.name} ({formatCurrency(act.unitPrice)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4 space-y-1">
                        <Input
                          type="number"
                          min="0"
                          value={inputActionTarif}
                          onChange={(e) => setInputActionTarif(e.target.value)}
                          placeholder="Tarif (Rp)"
                          disabled={isSubmitting || isCompleted}
                          className="text-xs h-8 bg-white font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <Input
                          type="number"
                          min="1"
                          value={inputActionQty}
                          onChange={(e) => setInputActionQty(e.target.value)}
                          placeholder="Qty"
                          disabled={isSubmitting || isCompleted}
                          className="text-xs h-8 bg-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Quick Action Presets */}
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-muted-foreground font-medium block">
                        Preset Tindakan Cepat:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {ACTION_PRESETS.map((act) => (
                          <button
                            key={act.nama}
                            type="button"
                            onClick={() => handleSelectActionPreset(act)}
                            disabled={isSubmitting || isCompleted}
                            className="text-[10px] px-2 py-1 rounded border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 transition-colors font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3 text-purple-600" />
                            <span>{act.nama}</span>
                            <span className="font-mono text-[9px] opacity-75">({formatCurrency(act.tarif)})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddAction}
                        disabled={isSubmitting || isCompleted || !selectedActionId}
                        className="h-8 text-xs gap-1 font-semibold px-3 bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Tindakan
                      </Button>
                    </div>

                    {actionError && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {actionError}
                      </p>
                    )}
                  </div>
                )}

                {/* Tabel Tindakan Medis */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground">
                    Daftar Tindakan Medis Ditentukan ({actionsList.length})
                  </label>

                  {actionsList.length === 0 ? (
                    <div className="p-3.5 rounded-lg border border-dashed border-purple-200 text-center text-xs text-muted-foreground bg-purple-50/10">
                      Belum ada tindakan medis / injeksi yang ditentukan. Pilih dari dropdown atau preset tindakan di atas.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-purple-200 overflow-hidden bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-purple-50 text-purple-900 text-[10px] uppercase font-semibold border-b border-purple-200">
                          <tr>
                            <th className="px-3 py-2">Nama Tindakan</th>
                            <th className="px-3 py-2 text-center">Jumlah</th>
                            <th className="px-3 py-2 text-right">Tarif Satuan</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                            {!isCompleted && <th className="px-3 py-2 text-center w-10">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-100 text-slate-800">
                          {actionsList.map((a) => {
                            const qty = parseInt(a.jumlah, 10) || 1
                            const subtotal = a.tarif * qty
                            return (
                              <tr key={a.id} className="hover:bg-purple-50/30">
                                <td className="px-3 py-2 font-medium text-purple-950">{a.nama}</td>
                                <td className="px-3 py-2 text-center font-mono font-semibold">{a.jumlah}x</td>
                                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                                  {formatCurrency(a.tarif)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-purple-900">
                                  {formatCurrency(subtotal)}
                                </td>
                                {!isCompleted && (
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAction(a.id)}
                                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      title="Hapus Tindakan"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-purple-50/60 border-t border-purple-200 font-semibold text-xs text-purple-950">
                          <tr>
                            <td colSpan={3} className="px-3 py-2 text-right text-purple-800 uppercase text-[10px]">
                              Total Biaya Tindakan:
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-sm text-purple-700 font-bold">
                              {formatCurrency(totalEstimatedActionFee)}
                            </td>
                            {!isCompleted && <td />}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* ── P2: Resep Obat (Pharmacy Prescription) ── */}
              <div className="space-y-4 p-4 rounded-lg border border-border bg-white">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground uppercase tracking-wide">
                    <Pill className="w-3.5 h-3.5 text-primary" />
                    <span>Resep &amp; Obat (Plan)</span>
                  </div>
                  {prescriptions.length > 0 && (
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {prescriptions.length} Jenis Obat ({formatCurrency(totalEstimatedMedicineFee)})
                    </span>
                  )}
                </div>

                {/* Pemilih Obat dari Stok */}
                {!isCompleted && (
                  <div className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-800 flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                        Pilih Obat dari Stok Klinik
                      </label>
                      <span className="text-[10px] text-muted-foreground">
                        {medicineOptions.length} obat aktif tersedia
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      {/* Select Obat */}
                      <div className="sm:col-span-6 space-y-1">
                        <select
                          value={selectedMedId}
                          onChange={(e) => {
                            setSelectedMedId(e.target.value)
                            setPrescError(null)
                          }}
                          disabled={isSubmitting || isCompleted}
                          className="w-full h-8 rounded-md border border-input bg-white px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60"
                        >
                          <option value="">-- Pilih Obat --</option>
                          {medicineOptions.map((med) => {
                            const isOutOfStock = med.availableStock <= 0
                            return (
                              <option key={med.id} value={med.id} disabled={isOutOfStock}>
                                {med.name} — Stok: {med.availableStock} {med.unit} ({formatCurrency(med.unitPrice)}) {isOutOfStock ? '[STOK HABIS]' : ''}
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      {/* Input Dosis / Aturan Pakai */}
                      <div className="sm:col-span-4 space-y-1">
                        <Input
                          value={inputDosage}
                          onChange={(e) => setInputDosage(e.target.value)}
                          placeholder="Dosis (mis: 3x sehari (tiap 8 jam) sesudah makan)"
                          disabled={isSubmitting || isCompleted}
                          className="text-xs h-8 bg-white font-medium"
                        />
                      </div>

                      {/* Input Qty */}
                      <div className="sm:col-span-2 space-y-1">
                        <Input
                          type="number"
                          min="1"
                          max={selectedMedObject?.availableStock}
                          value={inputQty}
                          onChange={(e) => setInputQty(e.target.value)}
                          placeholder="Qty"
                          disabled={isSubmitting || isCompleted}
                          className="text-xs h-8 bg-white font-mono"
                        />
                      </div>
                    </div>

                    {/* Preset Dosage Buttons (Frekuensi & Timing) */}
                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-semibold mr-0.5 uppercase tracking-wider">Frekuensi:</span>
                        {FREQUENCY_PRESETS.map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => {
                              // If current dosage has timing (e.g. sesudah makan), append it
                              const currentTiming = TIMING_PRESETS.find((t) => inputDosage.toLowerCase().includes(t.toLowerCase()))
                              if (currentTiming) {
                                setInputDosage(`${freq} ${currentTiming}`)
                              } else {
                                setInputDosage(freq)
                              }
                            }}
                            disabled={isSubmitting || isCompleted}
                            className={cn(
                              'text-[10px] px-2 py-0.5 rounded border transition-colors font-medium',
                              inputDosage.includes(freq)
                                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-semibold mr-0.5 uppercase tracking-wider">Aturan Makan:</span>
                        {TIMING_PRESETS.map((timing) => (
                          <button
                            key={timing}
                            type="button"
                            onClick={() => {
                              const currentFreq = FREQUENCY_PRESETS.find((f) => inputDosage.toLowerCase().includes(f.toLowerCase()))
                              if (currentFreq) {
                                setInputDosage(`${currentFreq} ${timing}`)
                              } else if (inputDosage.trim()) {
                                let clean = inputDosage
                                TIMING_PRESETS.forEach((t) => {
                                  clean = clean.replace(new RegExp(t, 'gi'), '').trim()
                                })
                                setInputDosage(`${clean} ${timing}`.trim())
                              } else {
                                setInputDosage(timing)
                              }
                            }}
                            disabled={isSubmitting || isCompleted}
                            className={cn(
                              'text-[10px] px-2.5 py-0.5 rounded border transition-colors font-medium',
                              inputDosage.toLowerCase().includes(timing.toLowerCase())
                                ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            )}
                          >
                            {timing}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Informative Stock Badge & Add Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                      <div>
                        {selectedMedObject ? (
                          <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 font-semibold">
                              <span>Golongan:</span>
                              <MedicineCategoryBadge category={selectedMedObject.category} size="sm" />
                            </span>
                            <span>·</span>
                            <span>Stok Tersedia: <strong className="text-emerald-600 font-mono">{selectedMedObject.availableStock} {selectedMedObject.unit}</strong></span>
                            <span>·</span>
                            <span>Harga: <strong className="text-slate-800 font-mono">{formatCurrency(selectedMedObject.unitPrice)}/{selectedMedObject.unit}</strong></span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Pilih obat untuk melihat detail harga dan ketersediaan stok.</span>
                        )}
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddMedicine}
                        disabled={isSubmitting || isCompleted || !selectedMedId}
                        className="h-8 text-xs gap-1 font-semibold px-3 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Obat
                      </Button>
                    </div>

                    {prescError && (
                      <p className="text-[11px] font-semibold text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {prescError}
                      </p>
                    )}
                  </div>
                )}

                {/* Tabel / Daftar Obat Ditambahkan */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-foreground">
                    Daftar Obat Yang Diresepkan ({prescriptions.length})
                  </label>

                  {prescriptions.length === 0 ? (
                    <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground bg-muted/5">
                      Belum ada obat yang ditambahkan ke resep. Gunakan pemilih obat dari stok di atas.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/30 text-muted-foreground text-[10px] uppercase font-semibold border-b border-border">
                          <tr>
                            <th className="px-3 py-2">Nama Obat</th>
                            <th className="px-3 py-2">Dosis / Aturan Pakai</th>
                            <th className="px-3 py-2 text-center">Jumlah</th>
                            <th className="px-3 py-2 text-right">Harga Satuan</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                            {!isCompleted && <th className="px-3 py-2 text-center w-10">Aksi</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white text-slate-800">
                          {prescriptions.map((p) => {
                            const qty = parseInt(p.jumlah, 10) || 0
                            const subtotal = p.unitPrice * qty
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 font-medium">{p.nama}</td>
                                <td className="px-3 py-2">
                                  <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[11px]">
                                    {p.dosis}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center font-mono font-semibold">
                                  {p.jumlah} {p.unit}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                                  {formatCurrency(p.unitPrice)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                                  {formatCurrency(subtotal)}
                                </td>
                                {!isCompleted && (
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMedicine(p.id)}
                                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      title="Hapus Obat"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-slate-50 border-t border-border font-semibold text-xs text-slate-800">
                          <tr>
                            <td colSpan={4} className="px-3 py-2 text-right text-muted-foreground uppercase text-[10px]">
                              Total Estimasi Biaya Obat:
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-sm text-primary font-bold">
                              {formatCurrency(totalEstimatedMedicineFee)}
                            </td>
                            {!isCompleted && <td />}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>

                {/* Catatan Tindakan / Edukasi Non-Obat */}
                <div className="space-y-1 pt-2">
                  <label className="text-[11px] font-medium text-foreground">
                    Catatan Tambahan &amp; Edukasi Pasien (Non-Farmasi)
                  </label>
                  <textarea
                    rows={2}
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    placeholder="Catatan tambahan, instruksi istirahat, diet, edukasi pasien..."
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


