'use client'

import React, { useEffect, useState } from 'react'
import {
  X,
  Printer,
  Edit,
  User,
  Calendar,
  Clock,
  Activity,
  Thermometer,
  Heart,
  Wind,
  FileText,
  AlertTriangle,
  Pill,
  Stethoscope,
  CheckCircle2,
  History,
  ChevronRight,
  Loader2,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatNoRM, calculateAge, formatDateIndo } from '@/lib/patient-utils'
import { MedicalRecordItem, getPatientMedicalHistory } from '@/app/rekam-medis/actions'

interface MedicalRecordDrawerProps {
  isOpen: boolean
  onClose: () => void
  record: MedicalRecordItem | null
  onOpenEdit: (record: MedicalRecordItem) => void
}

export function MedicalRecordDrawer({
  isOpen,
  onClose,
  record,
  onOpenEdit,
}: MedicalRecordDrawerProps) {
  const [currentRecord, setCurrentRecord] = useState<MedicalRecordItem | null>(record)
  const [historyRecords, setHistoryRecords] = useState<MedicalRecordItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Fetch patient medical history when drawer opens or initial record changes
  useEffect(() => {
    if (isOpen && record) {
      setCurrentRecord(record)
      setLoadingHistory(true)
      getPatientMedicalHistory(record.patient.id)
        .then((data) => {
          setHistoryRecords(data)
          // Find enriched record matching initial record if available
          const found = data.find((r) => r.id === record.id)
          if (found) setCurrentRecord(found)
        })
        .catch((err) => console.error('Failed to fetch patient medical history:', err))
        .finally(() => setLoadingHistory(false))
    }
  }, [isOpen, record])

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !currentRecord) return null

  const noRM = formatNoRM(currentRecord.patient.id)
  const age = calculateAge(currentRecord.patient.dateOfBirth)

  const examDate = new Date(currentRecord.examinationDate)
  const formattedDate = formatDateIndo(examDate)
  const formattedTime = examDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dimmed backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200 print:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-Side Slide-Over Drawer */}
      <div className="relative w-full max-w-2xl lg:max-w-3xl bg-white h-full shadow-2xl border-l border-border flex flex-col z-50 animate-in slide-in-from-right duration-300 print:max-w-none print:w-full print:border-none print:shadow-none print:static">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/10 print:hidden">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Detail Rekam Medis Pasien
                </h2>
                {historyRecords.length > 1 && (
                  <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                    {historyRecords.length} Kunjungan
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground font-mono">
                No. Registrasi: #{currentRecord.id} • {noRM}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onOpenEdit(currentRecord)}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Button>
          </div>
        </div>

        {/* Scrollable Clinical Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs print:p-0 print:overflow-visible">
          {/* Print Only Header Banner */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <h1 className="text-xl font-bold">SIMPAY KLINIK PRATAMA</h1>
            <p className="text-xs text-muted-foreground">Catatan Rekam Medis Pasien Rawat Jalan</p>
          </div>

          {/* 1. PATIENT INFORMATION HEADER CARD */}
          <div className="p-4 rounded-xl bg-muted/25 border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  {currentRecord.patient.name}
                </span>
                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  {noRM}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentRecord.patient.gender}, {age} Tahun
              </p>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
              <span className="text-[11px] font-medium text-muted-foreground block">
                Tanggal Kunjungan Ini
              </span>
              <p className="font-medium text-foreground text-xs">
                {formattedDate}, {formattedTime} WIB
              </p>
            </div>
          </div>

          {/* 2. VISIT SELECTOR / TIMELINE TABS (IF MULTIPLE VISITS) */}
          <div className="space-y-2 border-b border-border/60 pb-4 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                <History className="w-3.5 h-3.5 text-primary" />
                <span>Pilih Kunjungan / Tanggal Berobat Pasien ({historyRecords.length})</span>
              </div>
              {loadingHistory && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>

            {historyRecords.length === 0 && !loadingHistory ? (
              <p className="text-xs text-muted-foreground italic">Hanya ada 1 catatan kunjungan tercatat.</p>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
                {historyRecords.map((item) => {
                  const isSelected = item.id === currentRecord.id
                  const itemDate = formatDateIndo(item.examinationDate)
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentRecord(item)}
                      className={`px-3 py-1.5 rounded-lg border text-left shrink-0 transition-all flex flex-col gap-0.5 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                          : 'bg-white text-slate-700 border-border hover:bg-muted/40 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3 h-3 opacity-80" />
                        <span>{itemDate}</span>
                      </div>
                      <span className={`text-[10px] truncate max-w-[140px] ${isSelected ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                        {item.diagnosis || 'Tanpa diagnosis'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 3. SUBJEKTIF (ANAMNESA) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Subjektif (Anamnesa)</span>
            </div>

            <div className="p-4 rounded-lg border border-border bg-white space-y-3">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Keluhan Utama:
                </span>
                <p className="text-foreground leading-relaxed">
                  {currentRecord.complaint || 'Tidak ada data keluhan utama.'}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Riwayat Alergi:
                </span>
                {currentRecord.allergy ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{currentRecord.allergy}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">Tidak ada alergi tercatat.</span>
                )}
              </div>
            </div>
          </div>

          {/* 4. OBJEKTIF (PEMERIKSAAN FISIK & TANDA VITAL) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span>Objektif (Pemeriksaan Fisik)</span>
            </div>

            {/* Vital Signs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-0.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-semibold">Tekanan Darah</span>
                  <Activity className="w-3 h-3 text-primary" />
                </div>
                <p className="font-bold text-foreground text-xs">
                  {currentRecord.bloodPressure || '—'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-0.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-semibold">Suhu Tubuh</span>
                  <Thermometer className="w-3 h-3 text-orange-500" />
                </div>
                <p className="font-bold text-foreground text-xs">
                  {currentRecord.temperature || '—'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-0.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-semibold">Nadi</span>
                  <Heart className="w-3 h-3 text-rose-500" />
                </div>
                <p className="font-bold text-foreground text-xs">
                  {currentRecord.heartRate || '—'}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-0.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] uppercase font-semibold">Respirasi</span>
                  <Wind className="w-3 h-3 text-blue-500" />
                </div>
                <p className="font-bold text-foreground text-xs">
                  {currentRecord.respiratoryRate || '—'}
                </p>
              </div>
            </div>

            {/* Pemeriksaan Lanjutan / Notes */}
            {currentRecord.notes && (
              <div className="p-3 rounded-lg border border-border/70 bg-white">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Pemeriksaan Fisik & Status Generalis:
                </span>
                <p className="text-foreground leading-relaxed">{currentRecord.notes}</p>
              </div>
            )}
          </div>

          {/* 5. ASSESSMENT (DIAGNOSIS) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
              <Stethoscope className="w-3.5 h-3.5 text-primary" />
              <span>Assessment</span>
            </div>

            <div className="p-4 rounded-lg border border-border bg-white space-y-3">
              {/* Primary Diagnosis */}
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Diagnosis Utama:
                </span>
                <div className="flex items-start gap-2">
                  {currentRecord.icd10Code && (
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-primary text-primary-foreground shrink-0">
                      {currentRecord.icd10Code}
                    </span>
                  )}
                  <p className="text-sm font-bold text-foreground leading-snug">
                    {currentRecord.diagnosis || 'Belum ditegakkan'}
                  </p>
                </div>
              </div>

              {/* Secondary Diagnosis */}
              <div className="pt-2 border-t border-border/50">
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Diagnosis Sekunder:
                </span>
                {currentRecord.secondaryDiagnosis ? (
                  <p className="text-foreground font-medium">{currentRecord.secondaryDiagnosis}</p>
                ) : (
                  <p className="text-muted-foreground italic">Tidak ada diagnosis sekunder tercatat.</p>
                )}
              </div>
            </div>
          </div>

          {/* 6. PLANNING (TINDAKAN & RESEP/OBAT) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>Planning</span>
            </div>

            <div className="p-4 rounded-lg border border-border bg-white space-y-3.5">
              {/* Tindakan */}
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-0.5">
                  Tindakan & Intervensi:
                </span>
                <p className="text-foreground leading-relaxed">
                  {currentRecord.treatment || 'Pemberian terapi simtomatik dan edukasi.'}
                </p>
              </div>

              {/* Linked Prescriptions */}
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5 flex items-center gap-1">
                  <Pill className="w-3 h-3 text-primary" />
                  Resep & Terapi Obat Terkait:
                </span>

                {!currentRecord.prescriptions || currentRecord.prescriptions.length === 0 ? (
                  <p className="text-muted-foreground italic">Tidak ada resep obat terkait pada kunjungan ini.</p>
                ) : (
                  <div className="space-y-2">
                    {currentRecord.prescriptions.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="flex items-start justify-between p-2.5 rounded-md bg-muted/20 border border-border/60"
                      >
                        <div>
                          <p className="font-semibold text-foreground text-xs">{item.medicineName}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.instructions || 'Sesuai petunjuk dokter'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono font-medium text-[11px] shrink-0">
                          {item.dosage}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 7. DOKTER PEMERIKSA */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                Dokter Pemeriksa:
              </span>
              <p className="font-bold text-foreground text-xs mt-0.5">
                {currentRecord.doctor?.name || 'dr. Raniisyana Romula Rekkers'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                SIP: 446.1/128/SIP.DU/2022
              </p>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                TERVALIDASI
              </span>
            </div>
          </div>

          {/* 8. COMPLETE PATIENT MEDICAL HISTORY TIMELINE SECTION */}
          <div className="pt-6 border-t border-border space-y-3 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  Semua Riwayat Rekam Medis Pasien ({historyRecords.length})
                </h3>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Total Kunjungan Pasien di Klinik
              </span>
            </div>

            {loadingHistory ? (
              <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">
                Memuat riwayat rekam medis pasien...
              </div>
            ) : historyRecords.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Tidak ada riwayat rekam medis lainnya.</p>
            ) : (
              <div className="space-y-3">
                {historyRecords.map((hist, index) => {
                  const isCurrent = hist.id === currentRecord.id
                  const histDate = formatDateIndo(hist.examinationDate)
                  return (
                    <div
                      key={hist.id}
                      className={`p-3.5 rounded-xl border transition-all space-y-2 text-xs ${
                        isCurrent
                          ? 'border-primary/50 bg-primary/5 shadow-xs'
                          : 'border-border bg-muted/15 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                            {historyRecords.length - index}
                          </span>
                          <span className="font-bold text-foreground">{histDate}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">#{hist.id}</span>
                        </div>
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground">
                            KUNJUNGAN AKTIF
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCurrentRecord(hist)}
                            className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10 gap-1 font-medium"
                          >
                            <span>Lihat Detail Kunjungan</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold block">DIAGNOSIS UTAMA:</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {hist.icd10Code && (
                              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-primary/10 text-primary shrink-0">
                                {hist.icd10Code}
                              </span>
                            )}
                            <span className="font-semibold text-foreground truncate">{hist.diagnosis || '—'}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold block">KELUHAN UTAMA:</span>
                          <p className="text-foreground truncate mt-0.5">{hist.complaint || '—'}</p>
                        </div>
                      </div>

                      {/* Vital signs summary */}
                      {(hist.bloodPressure || hist.temperature || hist.heartRate) && (
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-1 bg-white/60 p-2 rounded-md border border-border/40">
                          {hist.bloodPressure && (
                            <span>
                              TD: <strong className="text-foreground">{hist.bloodPressure}</strong>
                            </span>
                          )}
                          {hist.temperature && (
                            <span>
                              Suhu: <strong className="text-foreground">{hist.temperature}</strong>
                            </span>
                          )}
                          {hist.heartRate && (
                            <span>
                              Nadi: <strong className="text-foreground">{hist.heartRate}</strong>
                            </span>
                          )}
                          {hist.prescriptions && hist.prescriptions.length > 0 && (
                            <span className="ml-auto text-primary font-medium flex items-center gap-1">
                              <Pill className="w-3 h-3" />
                              {hist.prescriptions.length} Obat Diberikan
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
