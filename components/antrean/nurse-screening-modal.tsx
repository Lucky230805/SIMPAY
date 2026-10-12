'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Scale,
  Ruler,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Stethoscope,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveNurseScreening } from '@/app/antrean/actions'
import type { QueueItem } from '@/app/antrean/actions'
import { formatNoRM, formatBirthDateAndAge, formatQueueLabel } from '@/lib/patient-utils'

interface NurseScreeningModalProps {
  isOpen: boolean
  onClose: () => void
  queue: QueueItem | null
  onSuccess?: () => void
}

export function NurseScreeningModal({
  isOpen,
  onClose,
  queue,
  onSuccess,
}: NurseScreeningModalProps) {
  // Form State
  const [bloodPressure, setBloodPressure] = useState('')
  const [temperature, setTemperature] = useState('36.5')
  const [heartRate, setHeartRate] = useState('80')
  const [respiratoryRate, setRespiratoryRate] = useState('18')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [complaint, setComplaint] = useState('')
  const [allergy, setAllergy] = useState('')
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Synchronize form values whenever queue changes
  useEffect(() => {
    if (queue) {
      const existingMR = queue.medicalRecord
      let initialWeight = ''
      let initialHeight = ''
      let initialNotes = existingMR?.notes || ''

      if (initialNotes.includes('[Antropometri:')) {
        const matchW = initialNotes.match(/BB:\s*([\d.]+)\s*kg/i)
        if (matchW) initialWeight = matchW[1]
        const matchH = initialNotes.match(/TB:\s*([\d.]+)\s*cm/i)
        if (matchH) initialHeight = matchH[1]
        initialNotes = initialNotes.replace(/\[Antropometri:[^\]]+\]\s*/i, '').trim()
      }

      setBloodPressure(existingMR?.bloodPressure ? existingMR.bloodPressure.replace(/\s*mmHg/i, '') : '')
      setTemperature(existingMR?.temperature ? existingMR.temperature.replace(/\s*°?C/i, '') : '36.5')
      setHeartRate(existingMR?.heartRate ? existingMR.heartRate.replace(/\s*x\/m(enit)?/i, '') : '80')
      setRespiratoryRate(existingMR?.respiratoryRate ? existingMR.respiratoryRate.replace(/\s*x\/m(enit)?/i, '') : '18')
      setWeight(initialWeight)
      setHeight(initialHeight)
      setComplaint(existingMR?.complaint || '')
      setAllergy(existingMR?.allergy || '')
      setNotes(initialNotes)
      setErrorMsg(null)
      setSuccessMsg(null)
    }
  }, [queue])

  if (!isOpen || !queue) return null

  const { patient } = queue
  const noRM = formatNoRM(patient.id)
  const ageInfo = formatBirthDateAndAge(patient.dateOfBirth)
  const queueLabel = formatQueueLabel(queue.polyclinic, queue.queueNumber)

  // Calculate BMI dynamically
  const weightNum = parseFloat(weight)
  const heightNum = parseFloat(height)
  let bmiValue: string | null = null
  let bmiCategory: { label: string; color: string } | null = null

  if (weightNum > 0 && heightNum > 0) {
    const heightM = heightNum / 100
    const calculatedBMI = weightNum / (heightM * heightM)
    bmiValue = calculatedBMI.toFixed(1)

    if (calculatedBMI < 18.5) {
      bmiCategory = { label: 'Kurus (Underweight)', color: 'bg-amber-50 text-amber-700 border-amber-200' }
    } else if (calculatedBMI < 23) {
      bmiCategory = { label: 'Normal / Ideal', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    } else if (calculatedBMI < 25) {
      bmiCategory = { label: 'Kelebihan BB', color: 'bg-orange-50 text-orange-700 border-orange-200' }
    } else {
      bmiCategory = { label: 'Obesitas', color: 'bg-rose-50 text-rose-700 border-rose-200' }
    }
  }

  // Blood pressure classification helper
  const getBpCategory = (bp: string) => {
    if (!bp.includes('/')) return null
    const [sysStr, diaStr] = bp.split('/')
    const sys = parseInt(sysStr, 10)
    const dia = parseInt(diaStr, 10)
    if (isNaN(sys) || isNaN(dia)) return null

    if (sys < 120 && dia < 80) {
      return { label: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' }
    } else if (sys < 140 && dia < 90) {
      return { label: 'Pre-Hipertensi', color: 'text-amber-700 bg-amber-50 border-amber-200' }
    } else {
      return { label: 'Hipertensi', color: 'text-rose-700 bg-rose-50 border-rose-200' }
    }
  }

  const bpCategory = getBpCategory(bloodPressure)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await saveNurseScreening({
        queueId: queue.id,
        patientId: patient.id,
        bloodPressure: bloodPressure.trim(),
        temperature: temperature.trim(),
        heartRate: heartRate.trim(),
        respiratoryRate: respiratoryRate.trim(),
        weight: weight.trim(),
        height: height.trim(),
        complaint: complaint.trim(),
        allergy: allergy.trim(),
        notes: notes.trim(),
      })

      if (res.success) {
        setSuccessMsg('Hasil skrining tanda vital berhasil disimpan!')
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 800)
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan hasil skrining')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat menyimpan skrining')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Pemeriksaan Awal / Skrining Perawat
                </h3>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {queueLabel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pengukuran tanda-tanda vital (TTV) dan anamnesis awal sebelum konsultasi dokter
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Identity Strip */}
        <div className="px-6 py-2.5 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between text-xs gap-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{patient.name}</span>
            <span className="text-muted-foreground">({patient.gender})</span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white border border-border text-foreground">
              {noRM}
            </span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>{ageInfo}</span>
            <span>•</span>
            <span className="font-medium text-foreground">{queue.polyclinic || 'Poli Umum 1'}</span>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Tanda Vital (TTV) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Tanda-Tanda Vital (Vital Signs)
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">Standar Pemeriksaan Klinis</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tekanan Darah */}
              <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Tekanan Darah (TD)
                  </label>
                  {bpCategory && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${bpCategory.color}`}>
                      {bpCategory.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                    placeholder="Contoh: 120/80"
                    className="h-8 text-xs font-mono font-medium"
                    required
                  />
                  <span className="text-xs text-muted-foreground shrink-0 font-medium">mmHg</span>
                </div>
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['110/70', '120/80', '130/80', '140/90'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBloodPressure(preset)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suhu Tubuh */}
              <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    Suhu Tubuh
                  </label>
                  <span className="text-[10px] text-muted-foreground">Normal: 36.5 - 37.5 °C</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="Contoh: 36.5"
                    className="h-8 text-xs font-mono font-medium"
                    required
                  />
                  <span className="text-xs text-muted-foreground shrink-0 font-medium">°C</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['36.5', '36.8', '37.2', '38.0'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTemperature(preset)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
                    >
                      {preset} °C
                    </button>
                  ))}
                </div>
              </div>

              {/* Denyut Nadi */}
              <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    Denyut Nadi (Heart Rate)
                  </label>
                  <span className="text-[10px] text-muted-foreground">Normal: 60 - 100 x/m</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="Contoh: 80"
                    className="h-8 text-xs font-mono font-medium"
                  />
                  <span className="text-xs text-muted-foreground shrink-0 font-medium">x/menit</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['72', '80', '88', '96'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHeartRate(preset)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Laju Respirasi */}
              <div className="p-3 rounded-xl border border-border bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Wind className="w-3.5 h-3.5 text-teal-500" />
                    Laju Pernapasan (Respirasi)
                  </label>
                  <span className="text-[10px] text-muted-foreground">Normal: 12 - 20 x/m</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={respiratoryRate}
                    onChange={(e) => setRespiratoryRate(e.target.value)}
                    placeholder="Contoh: 18"
                    className="h-8 text-xs font-mono font-medium"
                  />
                  <span className="text-xs text-muted-foreground shrink-0 font-medium">x/menit</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['16', '18', '20', '22'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRespiratoryRate(preset)}
                      className="text-[10px] px-2 py-0.5 rounded bg-white border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Antropometri (BB & TB + IMT Otomatis) */}
          <div className="space-y-3 p-4 rounded-xl border border-border bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  Antropometri & Indeks Massa Tubuh (IMT)
                </h4>
              </div>
              {bmiValue && bmiCategory && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${bmiCategory.color}`}>
                  IMT: {bmiValue} ({bmiCategory.label})
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Berat Badan (BB)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="Contoh: 65"
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-xs font-medium text-muted-foreground shrink-0">kg</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  Tinggi Badan (TB)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="Contoh: 168"
                    className="h-8 text-xs font-mono bg-white"
                  />
                  <span className="text-xs font-medium text-muted-foreground shrink-0">cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Anamnesis Awal & Catatan Perawat */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Keluhan Utama / Alasan Kunjungan
              </label>
              <Input
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                placeholder="Contoh: Pusing berputar sejak kemarin sore, mual dan lemas"
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Riwayat Alergi (Jika Ada)
                </label>
                <Input
                  value={allergy}
                  onChange={(e) => setAllergy(e.target.value)}
                  placeholder="Contoh: Alergi Amoxicillin / Makanan laut"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Catatan Observasi Perawat
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Pasien tampak pucat, mobilisasi mandiri"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Helper Notice */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 text-[11px] text-muted-foreground border border-border/60">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              Data skrining ini akan otomatis muncul pada workbench dokter saat pemeriksaan dimulai,
              sehingga dokter tidak perlu mengukur ulang kecuali diperlukan konfirmasi medis.
            </span>
          </div>

          {/* Modal Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-border shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs h-8"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs h-8 gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Menyimpan Skrining...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Simpan Hasil Skrining
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
