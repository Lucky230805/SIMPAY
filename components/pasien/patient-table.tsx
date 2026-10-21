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
  UserPlus,
  Loader2,
  CheckCircle2,
  Building2,
  X,
  ArrowRight,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatNoRM, formatBirthDateAndAge } from '@/lib/patient-utils'
import { getPatients, PatientRecord, getAllPatientsForExport, addExistingPatientToQueue } from '@/app/pasien/actions'
import { getSessionUserAction } from '@/app/login/actions'
import { PatientFormDialog } from './patient-form-dialog'
import { PatientDeleteDialog } from './patient-delete-dialog'
import { PatientSuccessDialog } from './patient-success-dialog'
import { PatientHistoryDrawer } from './patient-history-drawer'
import { QueueTicketModal, QueueTicketData } from '@/components/antrean/queue-ticket-modal'

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
  const [userRole, setUserRole] = useState<'DOKTER' | 'PERAWAT' | null>(null)

  useEffect(() => {
    let active = true
    getSessionUserAction().then((u) => {
      if (active && u) {
        setUserRole(u.role as 'DOKTER' | 'PERAWAT')
      }
    })
    return () => {
      active = false
    }
  }, [])

  const isDokter = userRole === 'DOKTER'

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

  const [ticketModalData, setTicketModalData] = useState<QueueTicketData | null>(null)
  const [isTicketOpen, setIsTicketOpen] = useState(false)
  const [isQueueingId, setIsQueueingId] = useState<number | null>(null)
  const [selectedPatientForQueue, setSelectedPatientForQueue] = useState<PatientRecord | null>(null)
  const [selectedPoliForQueue, setSelectedPoliForQueue] = useState<string>('Poli Umum 1')
  const [alreadyQueuedInfo, setAlreadyQueuedInfo] = useState<{
    patientName: string
    noRM: string
    queueNumber: number
    status: string
  } | null>(null)

  const handleAddToQueue = (patient: PatientRecord) => {
    setActiveMenuId(null)
    if (patient.todayQueue) {
      setAlreadyQueuedInfo({
        patientName: patient.name,
        noRM: formatNoRM(patient.id),
        queueNumber: patient.todayQueue.queueNumber,
        status: patient.todayQueue.status === 'MENUNGGU' ? 'Menunggu di Ruang Tunggu' : 'Sedang Dalam Pemeriksaan',
      })
      return
    }
    setSelectedPatientForQueue(patient)
    setSelectedPoliForQueue('Poli Umum 1')
  }

  const confirmAddToQueue = async () => {
    if (!selectedPatientForQueue) return
    const patient = selectedPatientForQueue
    setIsQueueingId(patient.id)
    try {
      const res = await addExistingPatientToQueue(patient.id, selectedPoliForQueue)
      if (res.success && res.queue) {
        showToast(`Pasien ${res.patientName} berhasil didaftarkan ke ${selectedPoliForQueue} (#${res.queue.queueNumber})`, 'success')
        setTicketModalData({
          queueNumber: res.queue.queueNumber,
          patientName: res.patientName,
          noRM: formatNoRM(patient.id),
          polyclinic: res.queue.polyclinic || selectedPoliForQueue,
        })
        setIsTicketOpen(true)
        setSelectedPatientForQueue(null)
        fetchData(page, search, genderFilter)
      } else {
        showToast(res.error || 'Gagal mendaftarkan pasien ke antrean', 'error')
      }
    } catch (err: any) {
      showToast('Terjadi kesalahan: ' + err.message, 'error')
    } finally {
      setIsQueueingId(null)
    }
  }

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'error' | 'warning' | 'info'
    message: string
  } | null>(null)

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
        showToast('Tidak ada data pasien untuk diekspor.', 'warning')
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

      showToast('Data pasien berhasil diekspor ke CSV', 'success')
    } catch (err: any) {
      showToast('Gagal mengekspor data: ' + err.message, 'error')
    }
  }

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setFeedbackToast({ type, message: msg })
    setTimeout(() => setFeedbackToast(null), 3500)
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
      {/* Rich Floating Toast alert */}
      {feedbackToast && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 border',
            feedbackToast.type === 'success' && 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20',
            feedbackToast.type === 'error' && 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20',
            feedbackToast.type === 'warning' && 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/20',
            feedbackToast.type === 'info' && 'bg-blue-600 text-white border-blue-500 shadow-blue-600/20'
          )}
        >
          {feedbackToast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {feedbackToast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
          {feedbackToast.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {feedbackToast.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
          <span>{feedbackToast.message}</span>
          <button
            onClick={() => setFeedbackToast(null)}
            className="ml-2 p-0.5 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sleek In-App Modal when Patient is Already Queued */}
      {alreadyQueuedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200">
          <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Pasien Sudah Terdaftar di Antrean
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pasien <strong className="text-foreground">{alreadyQueuedInfo.patientName}</strong> telah terdaftar dalam antrean pemeriksaan aktif hari ini dan tidak dapat didaftarkan ganda.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">No. Rekam Medis:</span>
                <span className="font-mono font-bold text-foreground">{alreadyQueuedInfo.noRM}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nomor Antrean Hari Ini:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  #{alreadyQueuedInfo.queueNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status Pemeriksaan:</span>
                <span className="font-semibold text-foreground">{alreadyQueuedInfo.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlreadyQueuedInfo(null)}
                className="text-xs font-semibold"
              >
                Tutup
              </Button>
              <Link
                href="/antrean"
                className={cn(
                  buttonVariants({ size: 'sm' }),
                  'text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white'
                )}
              >
                Lihat di Antrean
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
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

      {/* Polyclinic Selection Modal for Enqueuing Existing Patient */}
      {selectedPatientForQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in-0">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-border p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Pilih Tujuan Poliklinik
              </h3>
              <button
                onClick={() => setSelectedPatientForQueue(null)}
                className="text-muted-foreground hover:text-foreground rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Nama Pasien:</p>
              <p className="text-sm font-bold text-foreground">
                {selectedPatientForQueue.name}{' '}
                <span className="font-mono text-xs text-primary font-normal">
                  ({formatNoRM(selectedPatientForQueue.id)})
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Poliklinik / Dokter Bertugas:
              </label>
              <select
                value={selectedPoliForQueue}
                onChange={(e) => setSelectedPoliForQueue(e.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-muted/20 px-2.5 py-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <option value="Poli Umum 1">Poli Umum 1 (dr. Raniisyana)</option>
                <option value="Poli Umum 2">Poli Umum 2 (dr. Farisi)</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPatientForQueue(null)}
                disabled={!!isQueueingId}
              >
                Batal
              </Button>
              <Button size="sm" onClick={confirmAddToQueue} disabled={!!isQueueingId}>
                {isQueueingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Daftarkan ke Antrean'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <PatientHistoryDrawer
        patientId={historyPatientId}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <QueueTicketModal
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
        queueData={ticketModalData}
      />

      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        {/* Left: Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Saring tabel ini..."
            className="pl-8 text-xs h-9 bg-muted/20 focus:bg-card"
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
              <div className="absolute right-0 mt-1.5 w-48 bg-popover rounded-lg shadow-lg border border-border p-2 z-30 animate-in fade-in-0 zoom-in-95 text-xs space-y-1">
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
      <div className="bg-card rounded-lg border border-border shadow-xs">
        <div className="overflow-x-auto min-h-[360px] pb-2">
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
                        {!isDokter && (
                          <Button size="sm" onClick={handleOpenAdd} className="mt-3 text-xs">
                            + Tambah Pasien Baru
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                // Patient rows
                patients.map((patient, index) => {
                  const noRM = formatNoRM(patient.id)
                  const birthDateAndAge = formatBirthDateAndAge(patient.dateOfBirth)
                  const isBottomRows = index >= Math.max(2, patients.length - 2)

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
                        <div className="flex items-center justify-end gap-1.5">
                          {patient.todayQueue ? (
                            <Badge
                              variant="outline"
                              onClick={() => !isDokter && handleAddToQueue(patient)}
                              className={`h-7 px-2.5 text-[11px] gap-1 font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs ${!isDokter ? 'cursor-pointer hover:bg-emerald-100' : ''}`}
                              title="Pasien sudah terdaftar di antrean hari ini"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Antrean #{patient.todayQueue.queueNumber}</span>
                            </Badge>
                          ) : (
                            !isDokter && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddToQueue(patient)}
                                disabled={isQueueingId === patient.id}
                                className="h-7 px-2.5 text-[11px] gap-1 font-semibold border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                                title="Daftarkan pasien ini ke antrean hari ini"
                              >
                                {isQueueingId === patient.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <UserPlus className="w-3 h-3" />
                                )}
                                <span>+ Antrean</span>
                              </Button>
                            )
                          )}

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveMenuId(activeMenuId === patient.id ? null : patient.id)
                              }
                              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Aksi Lainnya"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {activeMenuId === patient.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-30"
                                  onClick={() => setActiveMenuId(null)}
                                />
                                <div
                                  className={`absolute right-0 ${
                                    isBottomRows ? 'bottom-full mb-1' : 'top-full mt-1'
                                  } w-44 bg-popover rounded-lg shadow-xl border border-border py-1 z-40 animate-in fade-in-0 zoom-in-95 text-xs text-left`}
                                >
                                  {!isDokter && (
                                    patient.todayQueue ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null)
                                          handleAddToQueue(patient)
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50 transition-colors text-left"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Sudah Antrean #{patient.todayQueue.queueNumber}</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null)
                                          handleAddToQueue(patient)
                                        }}
                                        disabled={isQueueingId === patient.id}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 font-medium text-primary hover:bg-primary/10 transition-colors text-left"
                                      >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        <span>Daftarkan Antrean</span>
                                      </button>
                                    )
                                  )}
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
                                    onClick={() => {
                                      setActiveMenuId(null)
                                      handleOpenHistory(patient.id)
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-foreground hover:bg-muted transition-colors text-left"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Riwayat Medis</span>
                                  </button>
                                  {!isDokter && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null)
                                          handleOpenEdit(patient)
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-foreground hover:bg-muted transition-colors text-left"
                                      >
                                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span>Edit Pasien</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMenuId(null)
                                          handleOpenDelete(patient)
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/10 transition-colors text-left"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Hapus Pasien</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
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
