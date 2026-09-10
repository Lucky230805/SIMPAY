'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import {
  X,
  Search,
  Calendar,
  Filter,
  Printer,
  RefreshCw,
  Activity,
  Heart,
  Thermometer,
  Wind,
  AlertTriangle,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Pill,
  User,
  Clock,
  FileText,
} from 'lucide-react'
import {
  getPatientMedicalHistory,
  MedicalRecordHistoryItem,
  PatientMedicalHistoryResult,
} from '@/app/pasien/actions'
import { cn } from '@/lib/utils'

interface PatientHistoryDrawerProps {
  patientId: number | null
  isOpen: boolean
  onClose: () => void
}

function calculateAge(dob: Date | string): number {
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return Math.max(0, age)
}

function formatRupiah(amount: number | null | undefined): string {
  if (amount == null) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PatientHistoryDrawer({ patientId, isOpen, onClose }: PatientHistoryDrawerProps) {
  const [data, setData] = useState<PatientMedicalHistoryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [icd10Code, setIcd10Code] = useState('')
  const [expandedVisits, setExpandedVisits] = useState<Record<number, boolean>>({})
  const [isPending, startTransition] = useTransition()

  const fetchHistory = (pId: number, searchVal?: string, startVal?: string, endVal?: string, icdVal?: string) => {
    setError(null)
    startTransition(async () => {
      const res = await getPatientMedicalHistory(pId, {
        search: searchVal,
        startDate: startVal,
        endDate: endVal,
        icd10Code: icdVal,
      })
      if (res.success) {
        setData(res)
        // Automatically expand the latest visit by default
        if (res.medicalRecords && res.medicalRecords.length > 0) {
          const firstId = res.medicalRecords[0].id
          setExpandedVisits((prev) => ({ ...prev, [firstId]: true }))
        }
      } else {
        setError(res.error || 'Gagal memuat rekam medis pasien')
      }
    })
  }

  useEffect(() => {
    if (isOpen && patientId) {
      setSearch('')
      setStartDate('')
      setEndDate('')
      setIcd10Code('')
      setExpandedVisits({})
      fetchHistory(patientId)
    }
  }, [isOpen, patientId])

  if (!isOpen || !patientId) return null

  const handleApplyFilter = () => {
    fetchHistory(patientId, search, startDate, endDate, icd10Code)
  }

  const handleResetFilter = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setIcd10Code('')
    fetchHistory(patientId, '', '', '', '')
  }

  const toggleVisitExpand = (id: number) => {
    setExpandedVisits((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const handlePrint = () => {
    window.print()
  }

  const patient = data?.patient
  const records = data?.medicalRecords || []
  const vitals = data?.latestVitalSigns

  const isFiltered = Boolean(search || startDate || endDate || icd10Code)

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      {/* DRAWER CONTAINER */}
      <div className="w-full max-w-4xl bg-background text-foreground h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
        {/* HEADER */}
        <div className="p-4 border-b border-border bg-card flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-foreground">
                  Riwayat Rekam Medis Pasien
                </h2>
                {patient && (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-300 rounded font-mono font-bold text-xs">
                    #RM-{String(patient.id).padStart(4, '0')}
                  </span>
                )}
              </div>
              {patient ? (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {patient.name} • {patient.gender} • {calculateAge(patient.dateOfBirth)} Tahun
                  {patient.phone ? ` • Telp: ${patient.phone}` : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Memuat profil pasien...</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPending || !data?.success}
              className="px-3 py-1.5 bg-slate-800 text-white font-semibold rounded-lg text-xs hover:bg-slate-900 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak Riwayat
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCREEN-ONLY BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 print:hidden">
          {/* ERROR ALERT */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-lg flex items-center justify-between text-xs shadow-sm">
              <span>{error}</span>
              <button
                onClick={() => fetchHistory(patientId, search, startDate, endDate, icd10Code)}
                className="px-2.5 py-1 bg-red-100 font-semibold rounded hover:bg-red-200 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Coba Lagi
              </button>
            </div>
          )}

          {/* LATEST VITAL SIGNS SUMMARY PANEL */}
          {patient && vitals && (
            <Card className="p-4 bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" /> Tanda Vital Terakhir
                </span>
                {vitals.allergy && (
                  <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-semibold text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-600" /> Alergi: {vitals.allergy}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2.5">
                  <div className="p-2 rounded bg-red-50 text-red-600 border border-red-200">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Tekanan Darah</span>
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {vitals.bloodPressure ? `${vitals.bloodPressure} mmHg` : '-'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2.5">
                  <div className="p-2 rounded bg-amber-50 text-amber-600 border border-amber-200">
                    <Thermometer className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Suhu Tubuh</span>
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {vitals.temperature ? `${vitals.temperature} °C` : '-'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2.5">
                  <div className="p-2 rounded bg-blue-50 text-blue-600 border border-blue-200">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Laju Nadi</span>
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {vitals.heartRate ? `${vitals.heartRate} bpm` : '-'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center gap-2.5">
                  <div className="p-2 rounded bg-teal-50 text-teal-600 border border-teal-200">
                    <Wind className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-medium">Laju Napas</span>
                    <span className="text-xs font-bold font-mono text-slate-900">
                      {vitals.respiratoryRate ? `${vitals.respiratoryRate} x/mnt` : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* FILTER BAR */}
          <Card className="p-3.5 space-y-3 bg-card shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b pb-2">
              <span className="flex items-center gap-1.5 text-foreground">
                <Filter className="w-3.5 h-3.5 text-primary" /> Filter Riwayat Medis
              </span>
              {isFiltered && (
                <button
                  onClick={handleResetFilter}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Reset Filter
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
              <div className="sm:col-span-4 relative">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari keluhan, diagnosis, obat..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="w-full pl-8 pr-2.5 py-1.5 border rounded-lg focus:ring-1 focus:ring-slate-800 text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Kode ICD-10 (mis. J00)"
                  value={icd10Code}
                  onChange={(e) => setIcd10Code(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                  className="w-full px-2.5 py-1.5 border rounded-lg focus:ring-1 focus:ring-slate-800 text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 border rounded-lg focus:ring-1 focus:ring-slate-800 text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 border rounded-lg focus:ring-1 focus:ring-slate-800 text-xs"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  onClick={handleApplyFilter}
                  disabled={isPending}
                  className="w-full py-1.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition text-xs flex items-center justify-center"
                >
                  {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
                </button>
              </div>
            </div>
          </Card>

          {/* TIMELINE LIST */}
          {isPending ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-800" />
              <p className="font-semibold text-xs">Memuat riwayat rekam medis...</p>
            </div>
          ) : records.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground bg-gray-50/50">
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="font-bold text-sm text-foreground">
                {isFiltered
                  ? 'Tidak ada rekam medis yang cocok dengan kata kunci/filter.'
                  : 'Belum ada riwayat rekam medis terdaftar.'}
              </p>
              {isFiltered && (
                <button
                  onClick={handleResetFilter}
                  className="mt-3 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
                >
                  Tampilkan Semua Riwayat
                </button>
              )}
            </Card>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
              {records.map((rec, index) => {
                const isExpanded = Boolean(expandedVisits[rec.id])
                const visitDate = new Date(rec.examinationDate)
                const formattedDate = visitDate.toLocaleDateString('id-ID', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div key={rec.id} className="relative pl-8">
                    {/* TIMELINE NODE DOT */}
                    <div className="absolute left-1.5 top-3.5 w-4 h-4 rounded-full border-2 border-white bg-slate-800 shadow-sm shrink-0 z-10" />

                    <Card className="p-4 space-y-3 bg-card border-border shadow-sm">
                      {/* CARD HEADER */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">{formattedDate}</span>
                            {rec.polyclinic && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold text-[11px]">
                                {rec.polyclinic}
                              </span>
                            )}
                            {rec.queueNumber && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono text-[11px]">
                                No. Antrean #{rec.queueNumber}
                              </span>
                            )}
                          </div>
                          {rec.doctorName && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Pemeriksa: <strong className="text-foreground">{rec.doctorName}</strong>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {rec.icd10Code && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-mono font-bold text-xs">
                              {rec.icd10Code}
                            </span>
                          )}
                          <button
                            onClick={() => toggleVisitExpand(rec.id)}
                            className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded text-xs flex items-center gap-1 transition"
                          >
                            {isExpanded ? (
                              <>
                                Sembunyikan Detail <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                Detail SOAP <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* PRIMARY DIAGNOSIS PREVIEW */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Diagnosis Utama
                        </span>
                        <p className="text-xs font-bold text-foreground">
                          {rec.diagnosis || 'Diagnosis belum diisi'}
                        </p>
                        {rec.secondaryDiagnosis && (
                          <p className="text-[11px] text-muted-foreground">
                            Sekunder: {rec.secondaryDiagnosis}
                          </p>
                        )}
                      </div>

                      {/* EXPANDABLE SOAP DETAILS */}
                      {isExpanded && (
                        <div className="pt-3 border-t space-y-3 animate-in fade-in duration-200 text-xs">
                          {/* S (Subjective) */}
                          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-700 block">
                              S (Subjective) - Keluhan Utama
                            </span>
                            <p className="text-xs text-foreground font-medium">
                              {rec.complaint || '-'}
                            </p>
                          </div>

                          {/* O (Objective) - Vital Signs */}
                          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase text-slate-700 block">
                              O (Objective) - Tanda Vital &amp; Fisik
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                              <div>TD: <strong>{rec.bloodPressure || '-'}</strong></div>
                              <div>Suhu: <strong>{rec.temperature ? `${rec.temperature} °C` : '-'}</strong></div>
                              <div>Nadi: <strong>{rec.heartRate ? `${rec.heartRate} bpm` : '-'}</strong></div>
                              <div>Napas: <strong>{rec.respiratoryRate ? `${rec.respiratoryRate} x/mnt` : '-'}</strong></div>
                            </div>
                            {rec.notes && (
                              <p className="text-xs text-muted-foreground pt-1 border-t border-slate-200">
                                Catatan Fisik: {rec.notes}
                              </p>
                            )}
                          </div>

                          {/* P (Plan) - Prescriptions */}
                          <div className="bg-slate-50/70 p-2.5 rounded-lg border border-slate-200 space-y-2">
                            <span className="text-[10px] font-bold uppercase text-slate-700 flex items-center justify-between">
                              <span>P (Plan) - Resep &amp; Pengobatan</span>
                              <span className="font-mono text-muted-foreground">{rec.prescriptions.length} Item</span>
                            </span>

                            {rec.prescriptions.length === 0 ? (
                              <p className="text-xs italic text-muted-foreground">Tidak ada resep obat pada kunjungan ini.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs bg-white rounded border divide-y">
                                  <thead>
                                    <tr className="bg-slate-100 text-muted-foreground text-left">
                                      <th className="py-1.5 px-2.5">Obat</th>
                                      <th className="py-1.5 px-2.5">Dosis</th>
                                      <th className="py-1.5 px-2.5 text-center">Jumlah</th>
                                      <th className="py-1.5 px-2.5">Instruksi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {rec.prescriptions.map((rx) => (
                                      <tr key={rx.id}>
                                        <td className="py-1.5 px-2.5 font-semibold text-foreground">{rx.medicineName}</td>
                                        <td className="py-1.5 px-2.5 font-mono">{rx.dosage}</td>
                                        <td className="py-1.5 px-2.5 text-center font-bold font-mono">{rx.quantity || 1}</td>
                                        <td className="py-1.5 px-2.5 text-muted-foreground">{rx.instructions || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {rec.treatment && (
                              <p className="text-[11px] text-muted-foreground pt-1">
                                Catatan Terapi: {rec.treatment}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* PRINT-ONLY OFFICIAL MEDICAL HISTORY DOCUMENT */}
        {patient && (
          <div id="patient-history-print-area" className="hidden print:block font-sans text-slate-900 bg-white p-4">
            {/* Kop Surat Klinik Resmi */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                  SIM
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight uppercase text-slate-900 leading-none">KLINIK PRAKTEK DOKTER UMUM</h1>
                  <p className="text-[11px] font-medium text-slate-700 mt-1">Dokumen Resmi Lembar Riwayat Rekam Medis Pasien</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Perumahan Permata Hijau 2, Blok A59, Cinangsi, Kec. Cibogo, Subang, Jawa Barat</p>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-600">
                <p className="font-bold text-slate-900 text-xs">REKAM MEDIS RESMI</p>
                <p>No. RM: #RM-{String(patient.id).padStart(4, '0')}</p>
                <p>Cetak: {new Date().toLocaleDateString('id-ID')}</p>
              </div>
            </div>

            {/* Identitas Pasien */}
            <div className="mb-4 bg-slate-50 p-3 rounded border border-slate-300 text-xs grid grid-cols-2 gap-2">
              <div>
                <p><span className="text-slate-500">Nama Pasien:</span> <strong>{patient.name}</strong></p>
                <p><span className="text-slate-500">Jenis Kelamin:</span> <strong>{patient.gender}</strong></p>
              </div>
              <div>
                <p><span className="text-slate-500">Umur / Tanggal Lahir:</span> <strong>{calculateAge(patient.dateOfBirth)} Thn ({new Date(patient.dateOfBirth).toLocaleDateString('id-ID')})</strong></p>
                <p><span className="text-slate-500">No. Telepon:</span> <strong>{patient.phone || '-'}</strong></p>
              </div>
            </div>

            {/* Rekapitulasi Riwayat Kunjungan */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase border-l-4 border-slate-800 pl-2">I. Riwayat Konsultasi &amp; Rekam Medis Chronological</h3>
              {records.length === 0 ? (
                <p className="text-xs italic text-slate-500">Tidak ada riwayat rekam medis terdaftar.</p>
              ) : (
                records.map((r, i) => (
                  <div key={r.id} className="border border-slate-300 rounded p-2.5 space-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-200 pb-1 font-bold">
                      <span>Kunjungan #{records.length - i} — {new Date(r.examinationDate).toLocaleString('id-ID')} ({r.polyclinic || 'Poli Umum'})</span>
                      <span>Kode ICD-10: {r.icd10Code || '-'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p><span className="text-slate-500">Keluhan:</span> {r.complaint || '-'}</p>
                        <p><span className="text-slate-500">Diagnosis Utama:</span> <strong>{r.diagnosis || '-'}</strong></p>
                      </div>
                      <div>
                        <p><span className="text-slate-500">Vital Signs:</span> TD: {r.bloodPressure || '-'} | Suhu: {r.temperature ? `${r.temperature} °C` : '-'} | Nadi: {r.heartRate ? `${r.heartRate} bpm` : '-'}</p>
                        <p><span className="text-slate-500">Dokter Pemeriksa:</span> {r.doctorName || '-'}</p>
                      </div>
                    </div>

                    {r.prescriptions.length > 0 && (
                      <div className="pt-1 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-600 block">Resep Obat:</span>
                        <p className="text-xs font-mono">
                          {r.prescriptions.map((rx) => `${rx.medicineName} (${rx.dosage}, Qty: ${rx.quantity || 1})`).join('; ')}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Pengesahan */}
            <div className="mt-6 pt-4 border-t border-slate-300 flex justify-between items-end text-xs">
              <p className="text-[10px] text-slate-500 italic">* Dokumen rekam medis rahasia SIMPAY.</p>
              <div className="text-center w-48">
                <p className="font-bold text-xs mb-10">Penanggung Jawab Klinik</p>
                <p className="font-bold underline text-xs">dr. Raniisyana R.R.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
