'use client'

import React, { useState, useEffect, useCallback, useTransition } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatNoRM, formatBirthDateAndAge } from '@/lib/patient-utils'
import { getPatients, PatientRecord, getAllPatientsForExport } from '@/app/pasien/actions'
import { PatientFormDialog } from './patient-form-dialog'
import { PatientDeleteDialog } from './patient-delete-dialog'
import { PatientSuccessDialog } from './patient-success-dialog'
import { PatientHistoryDrawer } from './patient-history-drawer'

interface PatientTableProps {
  initialData?: {
    patients: PatientRecord[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export function PatientTable({ initialData }: PatientTableProps) {
  const [patients, setPatients] = useState<PatientRecord[]>(initialData?.patients || [])
  const [total, setTotal] = useState(initialData?.total || 0)
  const [page, setPage] = useState(initialData?.page || 1)
  const [pageSize] = useState(initialData?.pageSize || 5)
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 1)

  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('ALL')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedPatientForEdit, setSelectedPatientForEdit] = useState<PatientRecord | null>(null)

  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPatientForDelete, setSelectedPatientForDelete] = useState<PatientRecord | null>(null)

  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [newlyAddedPatient, setNewlyAddedPatient] = useState<any | null>(null)

  const [historyPatientId, setHistoryPatientId] = useState<number | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const handleOpenHistory = (pId: number) => {
    setHistoryPatientId(pId)
    setIsHistoryOpen(true)
    setActiveMenuId(null)
  }

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

  const fetchData = useCallback(
    (currentPage: number, currentSearch: string, currentGender: string) => {
      startTransition(async () => {
        try {
          setError(null)
          const result = await getPatients({
            page: currentPage,
            pageSize,
            search: currentSearch,
            gender: currentGender,
          })
          setPatients(result.patients)
          setTotal(result.total)
          setPage(result.page)
          setTotalPages(result.totalPages)
        } catch (err: any) {
          setError(err.message || 'Gagal mengambil data pasien')
        }
      })
    },
    [pageSize]
  )

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1, search, genderFilter)
    }, 250)
    return () => clearTimeout(timer)
  }, [search, genderFilter, fetchData])

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    fetchData(newPage, search, genderFilter)
  }

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const allPatients = await getAllPatientsForExport()
      if (!allPatients.length) {
        alert('Tidak ada data pasien untuk diekspor.')
        return
      }

      const headers = ['No. RM', 'Nama Pasien', 'Jenis Kelamin', 'Tanggal Lahir', 'No. Telepon', 'Alamat']
      const rows = allPatients.map((p) => [
        formatNoRM(p.id),
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.gender,
        new Date(p.dateOfBirth).toLocaleDateString('id-ID'),
        p.phone || '-',
        `"${(p.address || '').replace(/"/g, '""')}"`,
      ])

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `data-pasien-simpay-${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      showToast('Data pasien berhasil diekspor ke CSV')
    } catch (err: any) {
      alert('Gagal mengekspor data: ' + err.message)
    }
  }

  const showToast = (msg: string) => {
    setFeedbackToast(msg)
    setTimeout(() => setFeedbackToast(null), 3000)
  }

  // Handlers for edit and add
  const handleOpenAdd = () => {
    setSelectedPatientForEdit(null)
    setIsFormOpen(true)
  }

  const handleOpenEdit = (p: PatientRecord) => {
    setSelectedPatientForEdit(p)
    setIsFormOpen(true)
    setActiveMenuId(null)
  }

  const handleOpenDelete = (p: PatientRecord) => {
    setSelectedPatientForDelete(p)
    setIsDeleteOpen(true)
    setActiveMenuId(null)
  }

  const handleFormSuccess = (savedPatient: any, isEdit: boolean) => {
    setIsFormOpen(false)
    fetchData(page, search, genderFilter)
    if (isEdit) {
      showToast('Data pasien berhasil diperbarui')
    } else {
      setNewlyAddedPatient(savedPatient)
      setIsSuccessOpen(true)
    }
  }

  const handleDeleteSuccess = () => {
    setIsDeleteOpen(false)
    fetchData(page, search, genderFilter)
    showToast('Data pasien berhasil dihapus')
  }

  // Calculate row indexes
  const startIndex = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      {/* Toast alert */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-xs font-medium shadow-lg animate-in slide-in-from-bottom-5">
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Expose Add Patient Trigger via window event so header button can invoke it */}
      <PatientFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={handleFormSuccess}
        initialData={selectedPatientForEdit}
      />

      <PatientDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={handleDeleteSuccess}
        patient={selectedPatientForDelete}
      />

      <PatientSuccessDialog
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        patient={newlyAddedPatient}
      />

      <PatientHistoryDrawer
        patientId={historyPatientId}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-border">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Saring tabel ini..."
            className="pl-8 text-xs h-9 bg-muted/20 focus:bg-white"
          />
        </div>

        {/* Right: Actions (Filter & Export) */}
        <div className="flex items-center gap-2 self-end sm:self-auto relative">
          {/* Filter Dropdown */}
          <div className="relative">
            <Button
              variant={genderFilter !== 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="h-9 gap-1.5 text-xs font-medium"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter {genderFilter !== 'ALL' ? `(${genderFilter})` : ''}</span>
            </Button>

            {showFilterDropdown && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-lg shadow-lg border border-border p-2 z-30 animate-in fade-in-0 zoom-in-95 text-xs space-y-1">
                <p className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                  Jenis Kelamin
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setGenderFilter('ALL')
                    setShowFilterDropdown(false)
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                    genderFilter === 'ALL'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  Semua Jenis Kelamin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGenderFilter('Laki-laki')
                    setShowFilterDropdown(false)
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                    genderFilter === 'Laki-laki'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  Laki-laki
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGenderFilter('Perempuan')
                    setShowFilterDropdown(false)
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                    genderFilter === 'Perempuan'
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  Perempuan
                </button>
              </div>
            )}
          </div>

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor</span>
          </Button>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchData(page, search, genderFilter)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-lg border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                <th className="text-left px-4 py-3.5 whitespace-nowrap">NO. RM</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">NAMA PASIEN</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">TGL LAHIR (UMUR)</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">NO. TELEPON</th>
                <th className="text-left px-4 py-3.5 whitespace-nowrap">ALAMAT LENGKAP</th>
                <th className="text-right px-4 py-3.5 whitespace-nowrap">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isPending ? (
                // Skeleton loading state
                [...Array(pageSize)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-16 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-32 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-28 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-24 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="h-4 w-44 bg-muted rounded" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="h-4 w-8 bg-muted rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : patients.length === 0 ? (
                // Empty states
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    {search || genderFilter !== 'ALL' ? (
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <Search className="w-8 h-8 text-muted-foreground/40 mb-1" />
                        <p className="text-sm font-semibold text-foreground">Pasien tidak ditemukan</p>
                        <p className="text-xs text-muted-foreground">
                          Ubah kata pencarian atau filter untuk melihat hasil lainnya.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch('')
                            setGenderFilter('ALL')
                          }}
                          className="mt-3 text-xs"
                        >
                          Reset Pencarian
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <Users className="w-8 h-8 text-muted-foreground/40 mb-1" />
                        <p className="text-sm font-semibold text-foreground">Belum ada data pasien</p>
                        <p className="text-xs text-muted-foreground">
                          Data pasien yang terdaftar akan muncul di sini.
                        </p>
                        <Button size="sm" onClick={handleOpenAdd} className="mt-3 text-xs">
                          + Tambah Pasien Baru
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                // Patient rows
                patients.map((patient) => {
                  const noRM = formatNoRM(patient.id)
                  const birthDateAndAge = formatBirthDateAndAge(patient.dateOfBirth)

                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* NO. RM */}
                      <td className="px-4 py-3.5 font-mono text-[11px] font-semibold text-primary whitespace-nowrap">
                        {noRM}
                      </td>

                      {/* NAMA PASIEN */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link
                          href={`/pasien/${patient.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline transition-colors flex items-center gap-2"
                        >
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                            {patient.name.charAt(0).toUpperCase()}
                          </span>
                          <span>{patient.name}</span>
                        </Link>
                      </td>

                      {/* TGL LAHIR (UMUR) */}
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                        {birthDateAndAge}
                      </td>

                      {/* NO. TELEPON */}
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap font-mono text-[11px]">
                        {patient.phone || '-'}
                      </td>

                      {/* ALAMAT LENGKAP */}
                      <td className="px-4 py-3.5 text-muted-foreground max-w-xs truncate" title={patient.address || ''}>
                        {patient.address || '-'}
                      </td>

                      {/* AKSI */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap relative">
                        <div className="inline-block relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuId(activeMenuId === patient.id ? null : patient.id)
                            }
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Aksi"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>

                          {activeMenuId === patient.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-border py-1 z-40 animate-in fade-in-0 zoom-in-95 text-xs text-left">
                              <Link
                                href={`/pasien/${patient.id}`}
                                className="flex items-center gap-2 px-3 py-1.5 text-foreground hover:bg-muted transition-colors"
                                onClick={() => setActiveMenuId(null)}
                              >
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Lihat Detail</span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleOpenHistory(patient.id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-foreground hover:bg-muted transition-colors text-left"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>Riwayat Medis</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(patient)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-foreground hover:bg-muted transition-colors text-left"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>Edit Pasien</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDelete(patient)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors text-left"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Pasien</span>
                              </button>
                            </div>
                          )}
                        </div>
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
          {/* Dynamic counter e.g. "Menampilkan 1–5 dari X pasien" */}
          <div className="text-muted-foreground">
            Menampilkan <span className="font-medium text-foreground">{startIndex}</span>–
            <span className="font-medium text-foreground">{endIndex}</span> dari{' '}
            <span className="font-medium text-foreground">{total}</span> pasien
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

            {/* Page number buttons */}
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
