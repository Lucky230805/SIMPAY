'use client'

import { useState } from 'react'
import { X, Calendar, User, Briefcase, FileText, AlertCircle, Loader2 } from 'lucide-react'
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

interface CreateSuratSakitModalProps {
  isOpen: boolean
  onClose: () => void
  patients: PatientOption[]
  doctors?: DoctorOption[]
  onSubmit: (payload: {
    patientId: number
    doctorId?: number
    startDate: string
    endDate: string
    diagnosis?: string
    occupation?: string
    notes?: string
  }) => Promise<{ success: boolean; error?: string }>
}

export function CreateSuratSakitModal({
  isOpen,
  onClose,
  patients,
  doctors = [],
  onSubmit,
}: CreateSuratSakitModalProps) {
  const todayStr = new Date().toISOString().split('T')[0]

  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    doctors.length > 0 ? String(doctors[0].id) : ''
  )
  const [startDate, setStartDate] = useState<string>(todayStr)
  const [endDate, setEndDate] = useState<string>(todayStr)
  const [occupation, setOccupation] = useState<string>('')
  const [diagnosis, setDiagnosis] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePatientSelect = (pId: string) => {
    setSelectedPatientId(pId)
    const p = patients.find((item) => String(item.id) === pId)
    if (p?.occupation) {
      setOccupation(p.occupation)
    }
  }

  // Calculate duration in days
  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
    const diff = end.getTime() - start.getTime()
    if (diff < 0) return 0
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1
  }

  const durationDays = calculateDays()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId) {
      setErrorMsg('Pilih pasien terlebih dahulu.')
      return
    }
    if (!startDate || !endDate) {
      setErrorMsg('Tanggal mulai dan selesai harus diisi.')
      return
    }
    if (durationDays <= 0) {
      setErrorMsg('Tanggal selesai tidak boleh sebelum tanggal mulai.')
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    const res = await onSubmit({
      patientId: Number(selectedPatientId),
      doctorId: selectedDoctorId ? Number(selectedDoctorId) : undefined,
      startDate,
      endDate,
      occupation: occupation.trim() || undefined,
      diagnosis: diagnosis.trim() || undefined,
      notes: notes.trim() || undefined,
    })

    setIsSubmitting(false)

    if (res.success) {
      // Reset form
      setSelectedPatientId('')
      setStartDate(todayStr)
      setEndDate(todayStr)
      setOccupation('')
      setDiagnosis('')
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/15">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base">Buat Surat Keterangan Sakit</h2>
              <p className="text-xs text-emerald-100">Surat Istirahat / Izin Sakit Pasien</p>
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
            <div className="relative">
              <select
                value={selectedPatientId}
                onChange={(e) => handlePatientSelect(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
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
          </div>

          {/* Doctor Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Dokter Penanggung Jawab (Pemeriksa) <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
              required
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.sipNumber ? `(${d.sipNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Occupation */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Pekerjaan Pasien
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Contoh: Karyawan Swasta / Pelajar / PNS"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Dari Tanggal <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs sm:text-sm"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Sampai Tanggal <span className="text-rose-500">*</span>
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs sm:text-sm"
                required
              />
            </div>
          </div>

          {/* Calculated Duration Banner */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-center justify-between text-xs">
            <span className="font-medium">Durasi Istirahat:</span>
            <span className="font-extrabold text-sm text-emerald-700">{durationDays} Hari</span>
          </div>

          {/* Diagnosis / Condition */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Keluhan / Indikasi Medis (Opsional)
            </label>
            <Input
              type="text"
              placeholder="Contoh: Febris &amp; Cephalgia / Infeksi Saluran Pernapasan"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="text-xs sm:text-sm"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Catatan / Pesan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Perlu istirahat total dan perbanyak minum air putih"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                'Terbitkan Surat Sakit'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
