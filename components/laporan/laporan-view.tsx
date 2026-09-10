'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import {
  BarChart2,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Users,
  Stethoscope,
  Pill,
  Activity,
  Printer,
  RefreshCw,
  AlertCircle,
  Clock,
  Filter,
  FileText,
  UserCheck,
  Wallet,
  CreditCard,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { getReportData, ReportData } from '@/app/laporan/actions'
import { cn } from '@/lib/utils'

export type DatePreset = 'HARI_INI' | 'LAST_7' | 'LAST_30' | 'THIS_MONTH' | 'CUSTOM'

export type ReportCategory = 'pemeriksaan' | 'demografi' | 'resep' | 'operasional' | 'keuangan'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface LaporanViewProps {
  initialReportData: ReportData | null
  initialError?: string
}

function formatDateISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getPresetDates(preset: DatePreset): { start: string; end: string } {
  const today = new Date()
  const end = formatDateISO(today)

  if (preset === 'HARI_INI') {
    return { start: end, end }
  }

  if (preset === 'LAST_7') {
    const s = new Date(today)
    s.setDate(s.getDate() - 6)
    return { start: formatDateISO(s), end }
  }

  if (preset === 'LAST_30') {
    const s = new Date(today)
    s.setDate(s.getDate() - 30)
    return { start: formatDateISO(s), end }
  }

  if (preset === 'THIS_MONTH') {
    const s = new Date(today.getFullYear(), today.getMonth(), 1)
    return { start: formatDateISO(s), end }
  }

  return { start: end, end }
}

export function LaporanView({ initialReportData, initialError }: LaporanViewProps) {
  const [report, setReport] = useState<ReportData | null>(initialReportData)
  const [error, setError] = useState<string | null>(initialError || null)
  const [preset, setPreset] = useState<DatePreset>('LAST_30')
  const [startDate, setStartDate] = useState<string>(
    initialReportData?.startDate || getPresetDates('LAST_30').start
  )
  const [endDate, setEndDate] = useState<string>(
    initialReportData?.endDate || getPresetDates('LAST_30').end
  )
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('pemeriksaan')
  const [isPending, startTransition] = useTransition()

  const fetchReport = (startStr: string, endStr: string) => {
    setError(null)
    startTransition(async () => {
      const res = await getReportData(startStr, endStr)
      if (res.success && res.data) {
        setReport(res.data)
      } else {
        setError(res.error || 'Gagal memuat data laporan')
      }
    })
  }

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset)
    if (newPreset !== 'CUSTOM') {
      const { start, end } = getPresetDates(newPreset)
      setStartDate(start)
      setEndDate(end)
      fetchReport(start, end)
    }
  }

  const handleCustomDateApply = () => {
    if (preset === 'CUSTOM') {
      fetchReport(startDate, endDate)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-6 w-full max-w-7xl mx-auto text-xs">
      {/* SCREEN-ONLY APPLICATION UI */}
      <div className="space-y-6 print:hidden">
        {/* SECTION A: Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5 print:border-none">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Laporan Pelayanan &amp; Operasional</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ringkasan data pemeriksaan, demografi pasien, resep obat, dan operasional antrean klinik.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-slate-800 text-white rounded-lg font-semibold text-xs hover:bg-slate-900 transition flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Laporan
            </button>
          </div>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Gagal Mengambil Laporan</h4>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => fetchReport(startDate, endDate)}
              className="px-3 py-1 bg-red-100 text-red-800 font-semibold rounded hover:bg-red-200 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
            </button>
          </div>
        )}

        {/* SECTION B: Date Range Filter */}
        <Card className="p-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5 text-primary" /> Filter Periode:
              </span>
              {[
                { id: 'HARI_INI' as const, label: 'Hari Ini' },
                { id: 'LAST_7' as const, label: '7 Hari Terakhir' },
                { id: 'LAST_30' as const, label: '30 Hari Terakhir' },
                { id: 'THIS_MONTH' as const, label: 'Bulan Ini' },
                { id: 'CUSTOM' as const, label: 'Custom Range' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-md font-semibold transition text-xs border',
                    preset === p.id
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            {preset === 'CUSTOM' && (
              <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Dari:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Sampai:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-slate-800"
                  />
                </div>
                <button
                  onClick={handleCustomDateApply}
                  disabled={isPending}
                  className="px-3 py-1 bg-slate-800 text-white font-semibold rounded hover:bg-slate-900 text-xs transition"
                >
                  Terapkan
                </button>
              </div>
            )}

            {/* Date Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground self-end lg:self-center">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Periode: <strong className="text-foreground">{startDate}</strong> s/d{' '}
                <strong className="text-foreground">{endDate}</strong>
              </span>
            </div>
          </div>
        </Card>

        {/* SECTION C: Summary Cards */}
        {isPending ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-xl border border-border" />
            ))}
          </div>
        ) : report ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 flex items-start justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Total Pemeriksaan</p>
                <p className="text-2xl font-bold text-foreground">{report.summary.totalExaminations}</p>
                <p className="text-[11px] text-muted-foreground">Pemeriksaan medis pasien</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
            </Card>

            <Card className="p-4 flex items-start justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Pasien Baru</p>
                <p className="text-2xl font-bold text-foreground">{report.summary.newPatients}</p>
                <p className="text-[11px] text-muted-foreground">Pasien pertama kali terdaftar</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
            </Card>

            <Card className="p-4 flex items-start justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Resep Selesai</p>
                <p className="text-2xl font-bold text-foreground">{report.summary.completedPrescriptions}</p>
                <p className="text-[11px] text-muted-foreground">Obat telah diserahkan</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
                <Pill className="w-5 h-5" />
              </div>
            </Card>

            <Card className="p-4 flex items-start justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Total Antrean</p>
                <p className="text-2xl font-bold text-foreground">{report.summary.totalQueues}</p>
                <p className="text-[11px] text-muted-foreground">Antrean terdaftar di periode ini</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5" />
              </div>
            </Card>
          </div>
        ) : null}

        {/* SECTION D: Category Navigation Tabs */}
        <div className="border-b border-border flex gap-4 sm:gap-6 text-xs sm:text-sm font-semibold print:hidden overflow-x-auto">
          {[
            { id: 'pemeriksaan' as const, label: 'Pemeriksaan & Diagnosis', icon: Stethoscope },
            { id: 'demografi' as const, label: 'Demografi Pasien', icon: Users },
            { id: 'resep' as const, label: 'Resep & Obat', icon: Pill },
            { id: 'operasional' as const, label: 'Operasional Antrean', icon: Activity },
            { id: 'keuangan' as const, label: 'Keuangan & Pendapatan', icon: Wallet },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={cn(
                'pb-3 border-b-2 transition-colors flex items-center gap-2 shrink-0',
                activeCategory === tab.id
                  ? 'border-slate-800 text-slate-900 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* SECTION E - H: Category Details View */}
        {isPending ? (
          <Card className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-800" />
            <p className="font-semibold text-sm">Memuat data laporan...</p>
          </Card>
        ) : report ? (
          <div className="space-y-6">
            {/* CATEGORY 1: Pemeriksaan & Diagnosis */}
            {activeCategory === 'pemeriksaan' && (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Top Diagnoses */}
                  <Card className="lg:col-span-7 p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-blue-600" /> Diagnosis Terbanyak
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Frekuensi diagnosis medis pasien pada periode terpilih
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono font-bold text-xs">
                        {report.examinations.diagnoses.length} Jenis
                      </span>
                    </div>

                    {report.examinations.diagnoses.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground bg-gray-50 rounded-lg">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="font-medium text-xs">Belum ada data pemeriksaan pada periode ini.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-muted-foreground text-left bg-muted/40">
                              <th className="py-2.5 px-3 w-10">No</th>
                              <th className="py-2.5 px-3">Nama Diagnosis</th>
                              <th className="py-2.5 px-3 text-right">Jumlah Kasus</th>
                              <th className="py-2.5 px-3 text-right">Persentase</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {report.examinations.diagnoses.map((item, idx) => {
                              const pct = Math.round((item.count / report.examinations.total) * 100) || 0
                              return (
                                <tr key={idx} className="hover:bg-muted/20">
                                  <td className="py-2.5 px-3 font-medium text-muted-foreground">{idx + 1}</td>
                                  <td className="py-2.5 px-3 font-semibold text-foreground">{item.name}</td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">{item.count}</td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden hidden sm:block">
                                        <div
                                          className="h-full bg-blue-600 rounded-full"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-muted-foreground font-medium">{pct}%</span>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>

                  {/* ICD-10 Distribution */}
                  <Card className="lg:col-span-5 p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-purple-600" /> Distribusi Kode ICD-10
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Pengodean penyakit standar internasional
                        </p>
                      </div>
                    </div>

                    {report.examinations.icd10.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground bg-gray-50 rounded-lg">
                        <p className="font-medium text-xs">Belum ada data kode ICD-10 pada periode ini.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {report.examinations.icd10.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 border rounded-lg bg-white hover:border-purple-200 transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-mono font-bold text-xs">
                                {item.code}
                              </span>
                            </div>
                            <span className="font-bold text-xs text-foreground">
                              {item.count} <span className="text-muted-foreground font-normal">Pasien</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* CATEGORY 2: Demografi Pasien */}
            {activeCategory === 'demografi' && (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Gender Breakdown */}
                  <Card className="lg:col-span-5 p-5 space-y-5 shadow-sm">
                    <div className="border-b pb-3">
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" /> Distribusi Jenis Kelamin
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Perbandingan pasien laki-laki dan perempuan
                      </p>
                    </div>

                    {report.demographics.totalPatients === 0 ? (
                      <div className="p-8 text-center text-muted-foreground bg-gray-50 rounded-lg">
                        <p className="font-medium text-xs">Belum ada data pasien pada periode ini.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {report.demographics.gender.map((g, idx) => {
                          const isMale = g.gender.toLowerCase().includes('laki')
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex justify-between items-center font-medium">
                                <span className="flex items-center gap-1.5 text-foreground font-bold">
                                  <span
                                    className={cn(
                                      'w-2.5 h-2.5 rounded-full',
                                      isMale ? 'bg-blue-500' : 'bg-pink-500'
                                    )}
                                  />
                                  {g.gender}
                                </span>
                                <span className="font-bold text-slate-900">
                                  {g.count} Pasien ({g.percentage}%)
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full', isMale ? 'bg-blue-500' : 'bg-pink-500')}
                                  style={{ width: `${g.percentage}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>

                  {/* Age Group Distribution */}
                  <Card className="lg:col-span-7 p-5 space-y-4 shadow-sm">
                    <div className="border-b pb-3">
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-amber-600" /> Kelompok Umur Pasien
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Sebaran demografi pasien berdasarkan kelompok usia
                      </p>
                    </div>

                    {report.demographics.totalPatients === 0 ? (
                      <div className="p-8 text-center text-muted-foreground bg-gray-50 rounded-lg">
                        <p className="font-medium text-xs">Belum ada data demografi pasien pada periode ini.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {report.demographics.ageGroups.map((group, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 p-2.5 border rounded-lg bg-white">
                            <div className="w-24 shrink-0 font-bold text-foreground">
                              Usia {group.group}
                            </div>
                            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${group.percentage}%` }}
                              />
                            </div>
                            <div className="w-28 text-right font-bold text-slate-900">
                              {group.count} ({group.percentage}%)
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* CATEGORY 3: Resep & Obat */}
            {activeCategory === 'resep' && (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Top Prescribed Medicines */}
                  <Card className="lg:col-span-7 p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Pill className="w-4 h-4 text-purple-600" /> Obat Paling Sering Diresepkan
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Daftar penggunaan jenis obat pasien
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-mono font-bold text-xs">
                        {report.prescriptions.total} Total Item
                      </span>
                    </div>

                    {report.prescriptions.medicines.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground bg-gray-50 rounded-lg">
                        <p className="font-medium text-xs">Belum ada data resep obat pada periode ini.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-muted-foreground text-left bg-muted/40">
                              <th className="py-2.5 px-3 w-10">No</th>
                              <th className="py-2.5 px-3">Nama Obat</th>
                              <th className="py-2.5 px-3 text-right">Frekuensi Resep</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {report.prescriptions.medicines.map((med, idx) => (
                              <tr key={idx} className="hover:bg-muted/20">
                                <td className="py-2.5 px-3 font-medium text-muted-foreground">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-bold text-foreground">{med.name}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{med.count} Kali</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>

                  {/* Prescription Status Summary */}
                  <Card className="lg:col-span-5 p-5 space-y-4 shadow-sm">
                    <div className="border-b pb-3">
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Status Penyerahan Resep
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Rincian penyiapan dan penyerahan obat
                      </p>
                    </div>

                    {report.prescriptions.total === 0 ? (
                      <div className="p-8 text-center text-muted-foreground bg-gray-50 rounded-lg">
                        <p className="font-medium text-xs">Belum ada data status resep pada periode ini.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {report.prescriptions.statuses.map((st, idx) => {
                          const isSelesai = st.status === 'SELESAI'
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 border rounded-lg bg-white"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'w-2.5 h-2.5 rounded-full',
                                    isSelesai ? 'bg-emerald-500' : 'bg-amber-500'
                                  )}
                                />
                                <span className="font-bold text-foreground">
                                  {isSelesai ? 'Selesai & Diserahkan' : 'Antre / Dalam Proses'}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  'px-2.5 py-1 rounded font-mono font-bold text-xs border',
                                  isSelesai
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                )}
                              >
                                {st.count} Item
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* CATEGORY 4: Operasional Antrean */}
            {activeCategory === 'operasional' && (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Queues by Polyclinic */}
                  <Card className="lg:col-span-6 p-5 space-y-4 shadow-sm">
                    <div className="border-b pb-3">
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-blue-600" /> Antrean Berdasarkan Poliklinik
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Sebaran kedatangan pasien per unit poli
                      </p>
                    </div>

                    {report.queues.total === 0 ? (
                      <div className="p-8 text-center text-muted-foreground bg-gray-50 rounded-lg">
                        <p className="font-medium text-xs">Belum ada data antrean operasional pada periode ini.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {report.queues.byPolyclinic.map((poly, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                            <span className="font-bold text-foreground">{poly.polyclinic}</span>
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono font-bold text-xs">
                              {poly.count} Pasien
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Queue Status Breakdown */}
                  <Card className="lg:col-span-6 p-5 space-y-4 shadow-sm">
                    <div className="border-b pb-3">
                      <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" /> Status Operasional Antrean
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Status alur pelayanan antrean pasien
                      </p>
                    </div>

                    {report.queues.total === 0 ? (
                      <div className="p-8 text-center text-muted-foreground bg-gray-50 rounded-lg">
                        <p className="font-medium text-xs">Belum ada data status antrean pada periode ini.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {report.queues.byStatus.map((st, idx) => {
                          const statusConfig: Record<string, { label: string; style: string }> = {
                            MENUNGGU: { label: 'Menunggu', style: 'bg-amber-50 text-amber-700 border-amber-200' },
                            DALAM_PEMERIKSAAN: { label: 'Dalam Pemeriksaan', style: 'bg-blue-50 text-blue-700 border-blue-200' },
                            SELESAI: { label: 'Selesai', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                          }
                          const conf = statusConfig[st.status] || { label: st.status, style: 'bg-gray-100 text-gray-700 border-gray-200' }
                          return (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                              <span className="font-bold text-foreground">{conf.label}</span>
                              <span className={cn('px-2.5 py-1 rounded font-mono font-bold text-xs border', conf.style)}>
                                {st.count} Pasien
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* CATEGORY 5: Keuangan & Pendapatan */}
            {activeCategory === 'keuangan' && report.financial && (
              <div className="space-y-6">
                {/* Financial KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4 flex items-start justify-between shadow-sm bg-gradient-to-br from-emerald-50/50 to-white border-emerald-200">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-emerald-800">Total Omzet / Pendapatan</p>
                      <p className="text-xl font-bold text-emerald-950">{formatRupiah(report.financial.totalRevenue)}</p>
                      <p className="text-[11px] text-emerald-700">Realisasi pembayaran lunas</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </Card>

                  <Card className="p-4 flex items-start justify-between shadow-sm bg-gradient-to-br from-blue-50/50 to-white border-blue-200">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-blue-800">Tagihan Lunas</p>
                      <p className="text-xl font-bold text-blue-950">{formatRupiah(report.financial.totalPaidAmount)}</p>
                      <p className="text-[11px] text-blue-700">{report.financial.paidCount} Transaksi Selesai</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 border border-blue-300 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </Card>

                  <Card className="p-4 flex items-start justify-between shadow-sm bg-gradient-to-br from-amber-50/50 to-white border-amber-200">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-amber-800">Tagihan Belum Lunas (Piutang)</p>
                      <p className="text-xl font-bold text-amber-950">{formatRupiah(report.financial.totalUnpaidAmount)}</p>
                      <p className="text-[11px] text-amber-700">{report.financial.unpaidCount} Tagihan Belum Dibayar</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                  </Card>

                  <Card className="p-4 flex items-start justify-between shadow-sm bg-gradient-to-br from-purple-50/50 to-white border-purple-200">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-purple-800">Rata-rata Transaksi</p>
                      <p className="text-xl font-bold text-purple-950">{formatRupiah(report.financial.averageTransaction)}</p>
                      <p className="text-[11px] text-purple-700">Nominal rata-rata per pasien</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 border border-purple-300 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Payment Method Distribution */}
                  <Card className="lg:col-span-6 p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-600" /> Distribusi Metode Pembayaran
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Rincian transaksi masuk berdasarkan metode pembayaran
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {report.financial.paymentMethods.map((pm) => {
                        return (
                          <div key={pm.method} className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-slate-800 text-white font-mono font-bold text-[11px] rounded">
                                  {pm.method}
                                </span>
                                <span className="text-xs font-semibold text-foreground">
                                  {pm.count} Transaksi
                                </span>
                              </div>
                              <span className="font-bold text-sm text-slate-900 font-mono">
                                {formatRupiah(pm.totalAmount)}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all duration-300',
                                    pm.method === 'TUNAI' ? 'bg-emerald-600' : pm.method === 'QRIS' ? 'bg-blue-600' : 'bg-purple-600'
                                  )}
                                  style={{ width: `${pm.percentage}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs text-muted-foreground font-semibold w-10 text-right">
                                {pm.percentage}%
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>

                  {/* Fee Component Breakdown */}
                  <Card className="lg:col-span-6 p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b pb-3">
                      <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <DollarSign className="w-4 h-4 text-blue-600" /> Rincian Komponen Tagihan
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Komposisi biaya pendaftaran, konsultasi dokter, obat, dan lainnya
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground text-left bg-muted/40">
                            <th className="py-2.5 px-3">Komponen Biaya</th>
                            <th className="py-2.5 px-3 text-right">Total Nominal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-semibold text-foreground">Biaya Pendaftaran</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(report.financial.feeBreakdown.registrationFee)}
                            </td>
                          </tr>
                          <tr className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-semibold text-foreground">Biaya Konsultasi Dokter</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(report.financial.feeBreakdown.consultationFee)}
                            </td>
                          </tr>
                          <tr className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-semibold text-foreground">Biaya Obat &amp; Sediaan</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(report.financial.feeBreakdown.medicineFee)}
                            </td>
                          </tr>
                          <tr className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-semibold text-foreground">Biaya Lain-lain</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(report.financial.feeBreakdown.otherFee)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
      {/* END OF SCREEN-ONLY APPLICATION UI */}

      {/* PRINT-ONLY OFFICIAL CLINIC EXECUTIVE REPORT */}
      {report && (
        <div id="report-print-area" className="hidden print:block font-sans text-slate-900 bg-white p-4">
          {/* Kop Surat Klinik Resmi */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                SIM
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight uppercase text-slate-900 leading-none">KLINIK PRAKTEK DOKTER UMUM</h1>
                <p className="text-[11px] font-medium text-slate-700 mt-1">Layanan Pelayanan Kesehatan &amp; Pemeriksaan Medis Terpadu</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Perumahan Permata Hijau 2, Blok A59, Cinangsi, Kec. Cibogo, Kabupaten Subang, Jawa Barat
                </p>
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-600">
              <p className="font-bold text-slate-900 text-xs">DOKUMEN RESMI</p>
              <p>No: RPT/Klinik/{new Date().getFullYear()}/{startDate.replace(/-/g, '')}</p>
              <p>Klasifikasi: Operasional Klinik</p>
            </div>
          </div>

          {/* Judul Laporan */}
          <div className="text-center my-3 pb-2 border-b border-slate-300">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">LAPORAN REKAPITULASI PELAYANAN &amp; OPERASIONAL KLINIK</h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Periode Laporan: <strong>{startDate}</strong> s/d <strong>{endDate}</strong>
            </p>
          </div>

          {/* Metadata Cetak */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-4 bg-slate-50 p-2.5 rounded border border-slate-200">
            <div>
              <span className="text-slate-500 block text-[10px]">Tanggal Cetak Laporan:</span>
              <span className="font-bold text-slate-800">{new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Penanggung Jawab Laporan:</span>
              <span className="font-bold text-slate-800">dr. Raniisyana R.R. (Dokter Umum)</span>
            </div>
          </div>

          {/* 1. Ringkasan Eksekutif (KPI Summary Table) */}
          <div className="mb-5 space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-slate-800 pl-2">I. Ringkasan Eksekutif Operasional</h3>
            <table className="w-full text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                  <th className="py-1.5 px-3 text-left border-r border-slate-300">Metrik Utama Pelayanan</th>
                  <th className="py-1.5 px-3 text-center border-r border-slate-300 w-24">Jumlah</th>
                  <th className="py-1.5 px-3 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1.5 px-3 font-semibold border-r border-slate-300">Total Pemeriksaan Medis Pasien</td>
                  <td className="py-1.5 px-3 text-center font-bold font-mono border-r border-slate-300">{report.summary.totalExaminations}</td>
                  <td className="py-1.5 px-3 text-slate-600">Pasien yang telah melalui pemeriksaan rekam medis dokter</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold border-r border-slate-300">Pasien Baru Terdaftar</td>
                  <td className="py-1.5 px-3 text-center font-bold font-mono border-r border-slate-300">{report.summary.newPatients}</td>
                  <td className="py-1.5 px-3 text-slate-600">Pasien baru pertama kali terdaftar di sistem klinik</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold border-r border-slate-300">Resep Obat Selesai Diserahkan</td>
                  <td className="py-1.5 px-3 text-center font-bold font-mono border-r border-slate-300">{report.summary.completedPrescriptions}</td>
                  <td className="py-1.5 px-3 text-slate-600">Resep obat yang telah disiapkan &amp; diserahkan perawat</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold border-r border-slate-300">Total Kunjungan Antrean</td>
                  <td className="py-1.5 px-3 text-center font-bold font-mono border-r border-slate-300">{report.summary.totalQueues}</td>
                  <td className="py-1.5 px-3 text-slate-600">Total seluruh pendaftaran antrean di periode ini</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2. Diagnosis Medis Terbanyak & ICD-10 */}
          <div className="mb-5 space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-slate-800 pl-2">II. Rekapitulasi Diagnosis Medis &amp; ICD-10</h3>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-7">
                <table className="w-full text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="py-1 px-2 text-center border-r border-slate-300 w-8">No</th>
                      <th className="py-1 px-2 text-left border-r border-slate-300">Nama Diagnosis</th>
                      <th className="py-1 px-2 text-right border-r border-slate-300">Kasus</th>
                      <th className="py-1 px-2 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.examinations.diagnoses.length === 0 ? (
                      <tr><td colSpan={4} className="py-2 text-center italic text-slate-500">Tidak ada data diagnosis</td></tr>
                    ) : (
                      report.examinations.diagnoses.map((d, i) => {
                        const pct = Math.round((d.count / report.examinations.total) * 100) || 0
                        return (
                          <tr key={i}>
                            <td className="py-1 px-2 text-center border-r border-slate-300">{i + 1}</td>
                            <td className="py-1 px-2 font-semibold border-r border-slate-300">{d.name}</td>
                            <td className="py-1 px-2 text-right font-bold border-r border-slate-300">{d.count}</td>
                            <td className="py-1 px-2 text-right font-mono">{pct}%</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="col-span-5">
                <table className="w-full text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="py-1 px-2 text-left border-r border-slate-300">Kode ICD-10</th>
                      <th className="py-1 px-2 text-right">Jumlah Pasien</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.examinations.icd10.length === 0 ? (
                      <tr><td colSpan={2} className="py-2 text-center italic text-slate-500">Tidak ada data ICD-10</td></tr>
                    ) : (
                      report.examinations.icd10.map((item, i) => (
                        <tr key={i}>
                          <td className="py-1 px-2 font-mono font-bold border-r border-slate-300">{item.code}</td>
                          <td className="py-1 px-2 text-right font-bold">{item.count} Pasien</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3. Demografi Pasien & Resep Obat */}
          <div className="mb-5 space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-slate-800 pl-2">III. Demografi Pasien &amp; Penggunaan Obat</h3>
            <div className="grid grid-cols-12 gap-3">
              {/* Gender */}
              <div className="col-span-6">
                <table className="w-full text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="py-1 px-2 text-left border-r border-slate-300">Jenis Kelamin</th>
                      <th className="py-1 px-2 text-right">Jumlah Pasien (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.demographics.gender.map((g, i) => (
                      <tr key={i}>
                        <td className="py-1 px-2 font-semibold border-r border-slate-300">{g.gender}</td>
                        <td className="py-1 px-2 text-right font-bold">{g.count} Pasien ({g.percentage}%)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Medicines */}
              <div className="col-span-6">
                <table className="w-full text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                      <th className="py-1 px-2 text-left border-r border-slate-300">Obat Diresepkan</th>
                      <th className="py-1 px-2 text-right">Frekuensi Resep</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.prescriptions.medicines.length === 0 ? (
                      <tr><td colSpan={2} className="py-2 text-center italic text-slate-500">Tidak ada data obat</td></tr>
                    ) : (
                      report.prescriptions.medicines.slice(0, 5).map((med, i) => (
                        <tr key={i}>
                          <td className="py-1 px-2 font-semibold border-r border-slate-300">{med.name}</td>
                          <td className="py-1 px-2 text-right font-bold">{med.count} Kali</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. Operasional Antrean Poliklinik */}
          <div className="mb-5 space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-slate-800 pl-2">IV. Operasional Antrean Poliklinik</h3>
            <table className="w-full text-xs border border-slate-300">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                  <th className="py-1.5 px-3 text-left border-r border-slate-300">Unit Poliklinik</th>
                  <th className="py-1.5 px-3 text-right">Jumlah Kunjungan Pasien</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.queues.byPolyclinic.length === 0 ? (
                  <tr><td colSpan={2} className="py-2 text-center italic text-slate-500">Tidak ada data poliklinik</td></tr>
                ) : (
                  report.queues.byPolyclinic.map((p, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-3 font-semibold border-r border-slate-300">{p.polyclinic}</td>
                      <td className="py-1.5 px-3 text-right font-bold font-mono">{p.count} Pasien</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 5. Rekapitulasi Keuangan & Pendapatan Klinik */}
          {report.financial && (
            <div className="mb-6 space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-l-4 border-slate-800 pl-2">
                V. Rekapitulasi Keuangan &amp; Pendapatan Klinik
              </h3>
              <table className="w-full text-xs border border-slate-300 mb-3">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                    <th className="py-1.5 px-3 text-left border-r border-slate-300">Indikator Keuangan</th>
                    <th className="py-1.5 px-3 text-right border-r border-slate-300">Nominal / Nilai</th>
                    <th className="py-1.5 px-3 text-left">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-1.5 px-3 font-semibold border-r border-slate-300">Total Omzet / Pendapatan Realisasi</td>
                    <td className="py-1.5 px-3 text-right font-bold font-mono border-r border-slate-300">{formatRupiah(report.financial.totalRevenue)}</td>
                    <td className="py-1.5 px-3 text-slate-600">Total pembayaran lunas yang telah diterima kasir</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-semibold border-r border-slate-300">Total Tagihan Lunas</td>
                    <td className="py-1.5 px-3 text-right font-bold font-mono border-r border-slate-300">{formatRupiah(report.financial.totalPaidAmount)}</td>
                    <td className="py-1.5 px-3 text-slate-600">Setara {report.financial.paidCount} transaksi selesai</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-semibold border-r border-slate-300">Total Tagihan Belum Lunas (Piutang)</td>
                    <td className="py-1.5 px-3 text-right font-bold font-mono border-r border-slate-300">{formatRupiah(report.financial.totalUnpaidAmount)}</td>
                    <td className="py-1.5 px-3 text-slate-600">Sebanyak {report.financial.unpaidCount} billing belum dibayar pasien</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-3 font-semibold border-r border-slate-300">Rata-rata Nominal Transaksi</td>
                    <td className="py-1.5 px-3 text-right font-bold font-mono border-r border-slate-300">{formatRupiah(report.financial.averageTransaction)}</td>
                    <td className="py-1.5 px-3 text-slate-600">Rata-rata nilai pembayaran per transaksi lunas</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-6">
                  <table className="w-full text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                        <th className="py-1 px-2 text-left border-r border-slate-300">Metode Pembayaran</th>
                        <th className="py-1 px-2 text-center border-r border-slate-300">Transaksi</th>
                        <th className="py-1 px-2 text-right border-r border-slate-300">Total Nominal</th>
                        <th className="py-1 px-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.financial.paymentMethods.map((pm, i) => (
                        <tr key={i}>
                          <td className="py-1 px-2 font-semibold border-r border-slate-300">{pm.method}</td>
                          <td className="py-1 px-2 text-center font-mono border-r border-slate-300">{pm.count}</td>
                          <td className="py-1 px-2 text-right font-bold font-mono border-r border-slate-300">{formatRupiah(pm.totalAmount)}</td>
                          <td className="py-1 px-2 text-right font-mono">{pm.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="col-span-6">
                  <table className="w-full text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                        <th className="py-1 px-2 text-left border-r border-slate-300">Komponen Biaya</th>
                        <th className="py-1 px-2 text-right">Total Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-1 px-2 font-semibold border-r border-slate-300">Biaya Pendaftaran</td>
                        <td className="py-1 px-2 text-right font-bold font-mono">{formatRupiah(report.financial.feeBreakdown.registrationFee)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-semibold border-r border-slate-300">Biaya Konsultasi Dokter</td>
                        <td className="py-1 px-2 text-right font-bold font-mono">{formatRupiah(report.financial.feeBreakdown.consultationFee)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-semibold border-r border-slate-300">Biaya Obat &amp; Sediaan</td>
                        <td className="py-1 px-2 text-right font-bold font-mono">{formatRupiah(report.financial.feeBreakdown.medicineFee)}</td>
                      </tr>
                      <tr>
                        <td className="py-1 px-2 font-semibold border-r border-slate-300">Biaya Lain-lain</td>
                        <td className="py-1 px-2 text-right font-bold font-mono">{formatRupiah(report.financial.feeBreakdown.otherFee)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. Lembar Pengesahan / Tanda Tangan */}
          <div className="pt-4 border-t border-slate-300 flex justify-between items-end text-xs">
            <div>
              <p className="text-[10px] text-slate-500 italic">* Dokumen ini dibuat secara otomatis oleh Sistem Informasi Pelayanan SIMPAY.</p>
              <p className="text-[10px] text-slate-500 italic">* Sah sebagai dokumen rekapitulasi resmi pelayanan operasional klinik.</p>
            </div>

            <div className="text-center w-56">
              <p className="mb-0.5 text-[11px]">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold text-xs mb-12">Penanggung Jawab Klinik</p>
              <p className="font-bold underline text-slate-900 text-xs">dr. Raniisyana R.R.</p>
              <p className="text-[10px] text-slate-600">SIP: 446/012/SIP-DR/2026</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

