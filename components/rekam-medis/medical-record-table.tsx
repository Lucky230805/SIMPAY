'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import {
  Search,
  Calendar,
  Filter,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatNoRM, formatDateIndo } from '@/lib/patient-utils'
import {
  getMedicalRecords,
  MedicalRecordItem,
  getDistinctDiagnoses,
} from '@/app/rekam-medis/actions'

interface MedicalRecordTableProps {
  initialData: {
    records: MedicalRecordItem[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  initialDiagnoses: { code: string; name: string }[]
  onSelectRecord: (record: MedicalRecordItem) => void
}

export function MedicalRecordTable({
  initialData,
  initialDiagnoses,
  onSelectRecord,
}: MedicalRecordTableProps) {
  const [records, setRecords] = useState<MedicalRecordItem[]>(initialData?.records || [])
  const [total, setTotal] = useState(initialData?.total || 0)
  const [page, setPage] = useState(initialData?.page || 1)
  const [pageSize] = useState(initialData?.pageSize || 5)
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 1)

  const [search, setSearch] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [diagnosisFilter, setDiagnosisFilter] = useState('all')
  const [diagnosesList] = useState<{ code: string; name: string }[]>(initialDiagnoses || [])

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(
    (currentPage: number, currentSearch: string, currentDate: string, currentDiag: string) => {
      startTransition(async () => {
        try {
          setError(null)
          const result = await getMedicalRecords({
            page: currentPage,
            pageSize,
            search: currentSearch,
            dateRange: currentDate,
            diagnosis: currentDiag,
          })
          setRecords(result.records)
          setTotal(result.total)
          setPage(result.page)
          setTotalPages(result.totalPages)
        } catch (err: any) {
          setError(err.message || 'Gagal mengambil data rekam medis')
        }
      })
    },
    [pageSize]
  )

  // Debounced search & filter sync
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1, search, dateRange, diagnosisFilter)
    }, 250)
    return () => clearTimeout(timer)
  }, [search, dateRange, diagnosisFilter, fetchData])

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    fetchData(newPage, search, dateRange, diagnosisFilter)
  }

  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-border shadow-xs">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pasien / RM..."
            className="pl-8 text-xs h-9 bg-muted/20 focus:bg-white"
          />
        </div>

        {/* Right: Date Range & Diagnosis Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 bg-muted/20 border border-border rounded-lg px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-transparent text-xs text-foreground outline-none cursor-pointer pr-1"
            >
              <option value="all">Rentang Tanggal: Semua</option>
              <option value="today">Hari Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
            </select>
          </div>

          {/* Diagnosis Filter */}
          <div className="flex items-center gap-1.5 bg-muted/20 border border-border rounded-lg px-2 py-1 max-w-[220px]">
            <Stethoscope className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={diagnosisFilter}
              onChange={(e) => setDiagnosisFilter(e.target.value)}
              className="bg-transparent text-xs text-foreground outline-none cursor-pointer truncate"
            >
              <option value="all">Diagnosis (ICD-10): Semua</option>
              {diagnosesList.map((d, i) => (
                <option key={i} value={d.name}>
                  {d.code ? `[${d.code}] ` : ''}
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchData(page, search, dateRange, diagnosisFilter)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Medical Records Table */}
      <div className="bg-white rounded-lg border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                <th className="text-left px-4 py-3.5 whitespace-nowrap">TANGGAL</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">NO. RM</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">NAMA PASIEN</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">DIAGNOSIS UTAMA</th>
                <th className="text-right px-4 py-3.5 whitespace-nowrap">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isPending ? (
                // Skeleton loading state
                [...Array(pageSize)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-24 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-16 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-32 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-48 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-4 w-16 bg-muted rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                // Empty states
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    {search || dateRange !== 'all' || diagnosisFilter !== 'all' ? (
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <Search className="w-8 h-8 text-muted-foreground/40 mb-1" />
                        <p className="text-sm font-semibold text-foreground">
                          Rekam medis tidak ditemukan
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ubah kata pencarian atau filter untuk melihat hasil lainnya.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch('')
                            setDateRange('all')
                            setDiagnosisFilter('all')
                          }}
                          className="mt-3 text-xs"
                        >
                          Reset Pencarian & Filter
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <FileText className="w-8 h-8 text-muted-foreground/40 mb-1" />
                        <p className="text-sm font-semibold text-foreground">
                          Belum ada rekam medis
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Catatan rekam medis pemeriksaan pasien akan muncul di sini.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                // Medical record rows
                records.map((record) => {
                  const noRM = formatNoRM(record.patient.id)
                  const formattedDate = formatDateIndo(record.examinationDate)

                  return (
                    <tr
                      key={record.id}
                      onClick={() => onSelectRecord(record)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      {/* TANGGAL */}
                      <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">
                        {formattedDate}
                      </td>

                      {/* NO. RM */}
                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-primary whitespace-nowrap">
                        {noRM}
                      </td>

                      {/* NAMA PASIEN */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                            {record.patient.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {record.patient.name}
                          </span>
                        </div>
                      </td>

                      {/* DIAGNOSIS UTAMA */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {record.icd10Code && (
                            <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                              {record.icd10Code}
                            </span>
                          )}
                          <span className="font-medium text-foreground truncate max-w-xs">
                            {record.diagnosis || '—'}
                          </span>
                        </div>
                      </td>

                      {/* AKSI */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectRecord(record)
                          }}
                          className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10 font-medium gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Detail</span>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20 text-xs">
          {/* Dynamic counter e.g. "Menampilkan 1–5 dari X data" */}
          <div className="text-muted-foreground">
            Menampilkan <span className="font-medium text-foreground">{startIndex}</span>–
            <span className="font-medium text-foreground">{endIndex}</span> dari{' '}
            <span className="font-medium text-foreground">{total}</span> data
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isPending}
              className="h-8 px-2 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
              Sebelumnya
            </Button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1]
                const showEllipsis = prev && p - prev > 1

                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-muted-foreground">...</span>}
                    <Button
                      variant={p === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(p)}
                      disabled={isPending}
                      className="h-8 w-8 p-0 text-xs font-medium"
                    >
                      {p}
                    </Button>
                  </React.Fragment>
                )
              })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isPending}
              className="h-8 px-2 text-xs"
            >
              Selanjutnya
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
