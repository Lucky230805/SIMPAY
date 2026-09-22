'use client'

import { useState } from 'react'
import { X, HeartPulse, User, Activity, AlertCircle, Loader2, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PatientOption {
  id: number
  name: string
  dateOfBirth: Date | string
  gender: string
  occupation?: string | null
  address: string | null
  phone: string | null
}

interface DoctorOption {
  id: number
  name: string
  sipNumber: string | null
}

interface CreateSuratSehatModalProps {
  isOpen: boolean
  onClose: () => void
  patients: PatientOption[]
  doctors?: DoctorOption[]
  onSubmit: (payload: {
    patientId: number
    doctorId?: number
    heightCm?: number
    weightKg?: number
    bloodPressure?: string
    bloodType?: string
    colorBlind?: string
    purpose?: string
    notes?: string
  }) => Promise<{ success: boolean; error?: string }>
}

export function CreateSuratSehatModal({
  isOpen,
  onClose,
  patients,
  doctors = [],
  onSubmit,
}: CreateSuratSehatModalProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    doctors.length > 0 ? String(doctors[0].id) : ''
  )
  const [heightCm, setHeightCm] = useState<string>('')
  const [weightKg, setWeightKg] = useState<string>('')
  const [bloodPressure, setBloodPressure] = useState<string>('120/80')
  const [bloodType, setBloodType] = useState<string>('O')
  const [colorBlind, setColorBlind] = useState<string>('Tidak')
  const [purpose, setPurpose] = useState<string>('Melamar Pekerjaan')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePatientSelect = (pId: string) => {
    setSelectedPatientId(pId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId) {
      setErrorMsg('Pilih pasien terlebih dahulu.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    const res = await onSubmit({
      patientId: Number(selectedPatientId),
      doctorId: selectedDoctorId ? Number(selectedDoctorId) : undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      bloodPressure: bloodPressure.trim() || undefined,
      bloodType: bloodType || undefined,
      colorBlind: colorBlind || undefined,
      purpose: purpose.trim() || undefined,
      notes: notes.trim() || undefined,
    })

    setIsSubmitting(false)

    if (res.success) {
      // Reset form
      setSelectedPatientId('')
      setHeightCm('')
      setWeightKg('')
      setBloodPressure('120/80')
      setBloodType('O')
      setColorBlind('Tidak')
      setPurpose('Melamar Pekerjaan')
      setNotes('')
      onClose()
    } else {
      setErrorMsg(res.error || 'Terjadi kesalahan saat menyimpan surat.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-teal-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/15">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Buat Surat Keterangan Sehat</h2>
              <p className="text-xs text-teal-100">Hasil Pemeriksaan Kesehatan Pasien</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-800 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Patient Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Pilih Pasien <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
              required
            >
              <option value="">-- Pilih Pasien --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({(p.gender === 'L' || p.gender === 'Laki-laki') ? 'Laki-laki' : 'Perempuan'}) - {p.phone || 'No telp -'}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Dokter Penanggung Jawab (Pemeriksa) <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
              required
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.sipNumber ? `(${d.sipNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Keperluan Surat
            </label>
            <Input
              type="text"
              placeholder="Contoh: Melamar Pekerjaan / Persyaratan Kuliah / SIM"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="text-xs sm:text-sm"
            />
          </div>

          {/* Physical Stats Section Header */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-1">
              <Activity className="w-4 h-4 text-teal-600" /> Hasil Pemeriksaan Fisik
            </h3>
          </div>

          {/* Physical Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tinggi Badan (cm)
              </label>
              <Input
                type="number"
                placeholder="Contoh: 168"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Berat Badan (kg)
              </label>
              <Input
                type="number"
                placeholder="Contoh: 62"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tekanan Darah
              </label>
              <Input
                type="text"
                placeholder="120/80"
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Gol. Darah
              </label>
              <select
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-2.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
                <option value="-">Tdk Tahu (-)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Buta Warna
              </label>
              <select
                value={colorBlind}
                onChange={(e) => setColorBlind(e.target.value)}
                className="w-full px-2.5 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Tidak">Tidak</option>
                <option value="Ya">Ya</option>
                <option value="Parsial">Parsial</option>
              </select>
            </div>
          </div>

          {/* Statement summary */}
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 text-xs">
            Status Hasil: <span className="font-bold text-teal-800">SEHAT &amp; LAYAK</span> untuk keperluan di atas.
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Catatan / Hasil Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Kondisi kesehatan secara umum baik, visus mata normal"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                'Terbitkan Surat Sehat'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
