'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Pill,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PackageX,
  Search,
  Calendar,
  Layers,
  Edit2,
  RefreshCw,
  Info,
  Trash2,
  History,
  Syringe,
} from 'lucide-react'
import {
  MedicineItem,
  createMedicine,
  updateMedicine,
  addMedicineBatch,
  updateMedicineBatch,
  deleteMedicineBatch,
} from '@/app/obat/actions'
import { Button } from '@/components/ui/button'
import { MedicineCategoryBadge } from '@/components/ui/medicine-category-badge'
import { StockMovementModal } from '@/components/resep/stock-movement-modal'
import { cn } from '@/lib/utils'

interface MedicineInventoryViewProps {
  initialInventory: MedicineItem[]
  userRole: 'DOKTER' | 'PERAWAT'
}

export function MedicineInventoryView({ initialInventory, userRole }: MedicineInventoryViewProps) {
  const [inventory, setInventory] = useState<MedicineItem[]>(initialInventory)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  // Modals state
  const [isAddMedOpen, setIsAddMedOpen] = useState(false)
  const [editingMed, setEditingMed] = useState<MedicineItem | null>(null)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
  const [selectedMedForBatch, setSelectedMedForBatch] = useState<MedicineItem | null>(null)
  const [isViewBatchesOpen, setIsViewBatchesOpen] = useState(false)
  const [selectedMedViewBatches, setSelectedMedViewBatches] = useState<MedicineItem | null>(null)
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false)

  // Form inputs
  const [medName, setMedName] = useState('')
  const [medCode, setMedCode] = useState('')
  const [medUnit, setMedUnit] = useState('Pcs')
  const [medCategory, setMedCategory] = useState('Obat Bebas')
  const [medUnitPrice, setMedUnitPrice] = useState('15000')
  const [medPurchasePrice, setMedPurchasePrice] = useState('10000')
  const [medMinStock, setMedMinStock] = useState('10')

  // Batch Form inputs
  const [batchNumber, setBatchNumber] = useState('')
  const [batchQty, setBatchQty] = useState('50')
  const [batchExpiryDate, setBatchExpiryDate] = useState('')

  // Custom Delete Batch Modal State
  const [batchToDelete, setBatchToDelete] = useState<{ id: number; batchNumber: string } | null>(null)

  // Custom Edit Batch Expiry Modal State
  const [batchToEditExpiry, setBatchToEditExpiry] = useState<{
    id: number
    batchNumber: string
    currentExpiry: Date
  } | null>(null)
  const [newExpiryDateInput, setNewExpiryDateInput] = useState('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isNurse = userRole === 'PERAWAT'

  // Summary counts
  const totalActive = inventory.filter((m) => m.isActive).length
  const expiredCount = inventory.filter((m) => m.expiredStock > 0).length
  const nearExpiry30Count = inventory.filter((m) => m.nearExpiry30BatchesCount > 0).length
  const nearExpiry60Count = inventory.filter((m) => m.nearExpiry60BatchesCount > 0).length
  const nearExpiryCount = inventory.filter((m) => m.nearExpiryBatchesCount > 0).length
  const lowStockCount = inventory.filter((m) => m.availableStock <= m.minStock && m.availableStock > 0).length
  const outOfStockCount = inventory.filter((m) => m.availableStock === 0).length

  // Filtered inventory
  const filteredInventory = inventory.filter((med) => {
    const matchesSearch =
      med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (med.code && med.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (med.category && med.category.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (filterStatus === 'LOW_STOCK') return med.availableStock <= med.minStock && med.availableStock > 0
    if (filterStatus === 'OUT_OF_STOCK') return med.availableStock === 0
    if (filterStatus === 'EXPIRED') return med.expiredStock > 0
    if (filterStatus === 'NEAR_EXPIRY_30') return med.nearExpiry30BatchesCount > 0
    if (filterStatus === 'NEAR_EXPIRY_60') return med.nearExpiry60BatchesCount > 0
    if (filterStatus === 'NEAR_EXPIRY') return med.nearExpiryBatchesCount > 0

    return true
  })

  // Open Add Modal
  const openAddModal = () => {
    setEditingMed(null)
    setMedName('')
    setMedCode('')
    setMedUnit('Pcs')
    setMedCategory('Obat Bebas')
    setMedUnitPrice('15000')
    setMedPurchasePrice('10000')
    setMedMinStock('10')
    setErrorMsg(null)
    setIsAddMedOpen(true)
  }

  // Open Add Action/Procedure Modal
  const openAddActionModal = () => {
    setEditingMed(null)
    setMedName('')
    setMedCode(`TND-${Math.floor(Math.random() * 900 + 100)}`)
    setMedUnit('Kali')
    setMedCategory('Tindakan / Layanan Medis')
    setMedUnitPrice('50000')
    setMedPurchasePrice('10000')
    setMedMinStock('0')
    setErrorMsg(null)
    setIsAddMedOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (med: MedicineItem) => {
    setEditingMed(med)
    setMedName(med.name)
    setMedCode(med.code || '')
    setMedUnit(med.unit)
    setMedCategory(med.category || 'Obat Bebas')
    setMedUnitPrice(med.unitPrice.toString())
    setMedPurchasePrice((med.purchasePrice || 0).toString())
    setMedMinStock(med.minStock.toString())
    setErrorMsg(null)
    setIsAddMedOpen(true)
  }

  // Open Add Batch Modal
  const openAddBatchModal = (med: MedicineItem) => {
    setSelectedMedForBatch(med)
    // Generate default batch number like BATCH-YYYYMMDD-001
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    setBatchNumber(`BATCH-${todayStr}-${Math.floor(Math.random() * 900 + 100)}`)
    setBatchQty('50')

    // Default expiry date 1 year from now
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    setBatchExpiryDate(nextYear.toISOString().slice(0, 10))

    setErrorMsg(null)
    setIsBatchModalOpen(true)
  }

  // Handle Save Medicine (Create or Update)
  const handleSaveMedicine = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    startTransition(async () => {
      if (editingMed) {
        const res = await updateMedicine(editingMed.id, {
          name: medName,
          code: medCode,
          unit: medUnit,
          category: medCategory,
          unitPrice: parseFloat(medUnitPrice) || 0,
          purchasePrice: parseFloat(medPurchasePrice) || 0,
          minStock: parseInt(medMinStock, 10) || 10,
        })
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal memperbarui obat')
        } else {
          setSuccessMsg(`Obat "${medName}" berhasil diperbarui`)
          setIsAddMedOpen(false)
          window.location.reload()
        }
      } else {
        const res = await createMedicine({
          name: medName,
          code: medCode,
          unit: medUnit,
          category: medCategory,
          unitPrice: parseFloat(medUnitPrice) || 0,
          purchasePrice: parseFloat(medPurchasePrice) || 0,
          minStock: parseInt(medMinStock, 10) || 0,
        })
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal menambahkan item')
        } else {
          setSuccessMsg(`Item/Tindakan "${medName}" berhasil ditambahkan`)
          setIsAddMedOpen(false)
          window.location.reload()
        }
      }
    })
  }


  // Handle Save Batch
  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMedForBatch) return
    setErrorMsg(null)

    startTransition(async () => {
      const res = await addMedicineBatch({
        medicineId: selectedMedForBatch.id,
        batchNumber,
        stockQuantity: parseInt(batchQty, 10) || 0,
        expiryDate: batchExpiryDate,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menambahkan batch stok')
      } else {
        setSuccessMsg(`Batch ${batchNumber} untuk "${selectedMedForBatch.name}" berhasil ditambahkan`)
        setIsBatchModalOpen(false)
        window.location.reload()
      }
    })
  }

  // Open Delete Batch Modal
  const openDeleteBatchModal = (batchId: number, batchNumber: string) => {
    setBatchToDelete({ id: batchId, batchNumber })
  }

  // Execute Delete Batch Action
  const confirmDeleteBatch = () => {
    if (!batchToDelete) return

    startTransition(async () => {
      const res = await deleteMedicineBatch(batchToDelete.id)
      if (res.success) {
        setSuccessMsg(`Batch ${batchToDelete.batchNumber} berhasil dihapus`)
        setBatchToDelete(null)
        window.location.reload()
      } else {
        setErrorMsg(res.error || 'Gagal menghapus batch')
      }
    })
  }

  // Open Edit Batch Expiry Modal
  const openEditBatchExpiryModal = (batchId: number, batchNumber: string, currentExpiry: Date) => {
    setBatchToEditExpiry({ id: batchId, batchNumber, currentExpiry })
    setNewExpiryDateInput(new Date(currentExpiry).toISOString().slice(0, 10))
  }

  // Execute Edit Batch Expiry Action
  const confirmEditBatchExpiry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!batchToEditExpiry || !newExpiryDateInput) return

    startTransition(async () => {
      const res = await updateMedicineBatch(batchToEditExpiry.id, { expiryDate: newExpiryDateInput })
      if (res.success) {
        setSuccessMsg('Tanggal kedaluwarsa batch berhasil diperbarui')
        setBatchToEditExpiry(null)
        window.location.reload()
      } else {
        setErrorMsg(res.error || 'Gagal memperbarui tanggal kedaluwarsa')
      }
    })
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Pill className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Katalog & Stok Obat (Apotek)
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Kelola data master obat, batch stok, tanggal kedaluwarsa, dan peringatan restock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsLedgerModalOpen(true)}
            className="border-border bg-card text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 shadow-xs text-xs h-9 cursor-pointer"
            title="Lihat riwayat alur mutasi stok obat (Stock Ledger)"
          >
            <History className="w-3.5 h-3.5 text-emerald-500" />
            <span>Audit Log Mutasi Stok</span>
          </Button>

          {!isNurse && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
              <Info className="w-4 h-4" />
              <span>Akses Baca Saja (Peran DOKTER)</span>
            </div>
          )}

          {isNurse && (
            <div className="flex items-center gap-2">
              <Link
                href="/tindakan"
                className="border border-border bg-card text-foreground hover:bg-muted font-semibold flex items-center gap-1.5 shadow-xs text-xs h-9 px-3 rounded-lg transition-colors cursor-pointer"
              >
                <Syringe className="w-3.5 h-3.5 text-emerald-500" />
                <span>Katalog Tindakan Medis</span>
              </Link>
              <Button
                onClick={openAddModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs text-xs h-9 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Obat Baru</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Alert Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
            Tutup
          </button>
        </div>
      )}

      {/* Widget Banner Peringatan Expiry H-30 & H-60 */}
      {(nearExpiry30Count > 0 || nearExpiry60Count > 0 || expiredCount > 0) && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 text-foreground shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-500 text-white shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <span>Peringatan Masa Kadaluarsa Batch (Sistem FEFO)</span>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-orange-600 text-white rounded-full">
                    Sistem Kontrol H-30 &amp; H-60
                  </span>
                </h4>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Terdapat batch obat yang perlu perhatian operasional untuk diprioritaskan keluar (FEFO), dikarantina, atau diretur ke distributor.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {nearExpiry30Count > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('NEAR_EXPIRY_30')}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{nearExpiry30Count} Batch Kritis H-30</span>
                </button>
              )}
              {nearExpiry60Count > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('NEAR_EXPIRY_60')}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{nearExpiry60Count} Batch Waspada H-60</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Alert Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Active */}
        <button
          type="button"
          onClick={() => setFilterStatus('ALL')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            filterStatus === 'ALL'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-card text-foreground border-border hover:border-slate-400 dark:hover:border-slate-600 hover:bg-muted/30'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Master</span>
            <Pill className={cn("w-4 h-4", filterStatus === 'ALL' ? "text-white" : "text-emerald-500")} />
          </div>
          <div className="text-xl font-extrabold">{totalActive}</div>
          <p className={cn("text-[10px] mt-0.5", filterStatus === 'ALL' ? "text-white/80" : "text-muted-foreground")}>Obat terdaftar</p>
        </button>

        {/* Low Stock */}
        <button
          type="button"
          onClick={() => setFilterStatus('LOW_STOCK')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            filterStatus === 'LOW_STOCK'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
              : 'bg-card text-foreground border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", filterStatus === 'LOW_STOCK' ? "text-white" : "text-amber-600 dark:text-amber-400")}>Stok Menipis</span>
            <AlertTriangle className={cn("w-4 h-4", filterStatus === 'LOW_STOCK' ? "text-white" : "text-amber-600 dark:text-amber-400")} />
          </div>
          <div className={cn("text-xl font-extrabold", filterStatus === 'LOW_STOCK' ? "text-white" : "text-amber-600 dark:text-amber-400")}>{lowStockCount}</div>
          <p className={cn("text-[10px] mt-0.5", filterStatus === 'LOW_STOCK' ? "text-white/80" : "text-muted-foreground")}>≤ Min. Stok</p>
        </button>

        {/* Out of Stock */}
        <button
          type="button"
          onClick={() => setFilterStatus('OUT_OF_STOCK')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            filterStatus === 'OUT_OF_STOCK'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20'
              : 'bg-card text-foreground border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/10'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", filterStatus === 'OUT_OF_STOCK' ? "text-white" : "text-rose-600 dark:text-rose-400")}>Stok Habis</span>
            <PackageX className={cn("w-4 h-4", filterStatus === 'OUT_OF_STOCK' ? "text-white" : "text-rose-600 dark:text-rose-400")} />
          </div>
          <div className={cn("text-xl font-extrabold", filterStatus === 'OUT_OF_STOCK' ? "text-white" : "text-rose-600 dark:text-rose-400")}>{outOfStockCount}</div>
          <p className={cn("text-[10px] mt-0.5", filterStatus === 'OUT_OF_STOCK' ? "text-white/80" : "text-muted-foreground")}>0 Pcs tersedia</p>
        </button>

        {/* Kritis H-30 */}
        <button
          type="button"
          onClick={() => setFilterStatus('NEAR_EXPIRY_30')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            filterStatus === 'NEAR_EXPIRY_30'
              ? 'bg-orange-600 text-white border-orange-600 shadow-md ring-2 ring-orange-500/20'
              : 'bg-card text-foreground border-orange-500/30 hover:border-orange-500/60 hover:bg-orange-500/10'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", filterStatus === 'NEAR_EXPIRY_30' ? "text-white" : "text-orange-600 dark:text-orange-400")}>Kritis H-30</span>
            <AlertTriangle className={cn("w-4 h-4", filterStatus === 'NEAR_EXPIRY_30' ? "text-white" : "text-orange-600 dark:text-orange-400")} />
          </div>
          <div className={cn("text-xl font-extrabold", filterStatus === 'NEAR_EXPIRY_30' ? "text-white" : "text-orange-600 dark:text-orange-400")}>{nearExpiry30Count}</div>
          <p className={cn("text-[10px] mt-0.5", filterStatus === 'NEAR_EXPIRY_30' ? "text-white/80" : "text-muted-foreground")}>≤ 30 Hari ED</p>
        </button>

        {/* Waspada H-60 */}
        <button
          type="button"
          onClick={() => setFilterStatus('NEAR_EXPIRY_60')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            filterStatus === 'NEAR_EXPIRY_60'
              ? 'bg-yellow-600 text-white border-yellow-600 shadow-md ring-2 ring-yellow-500/20'
              : 'bg-card text-foreground border-yellow-500/30 hover:border-yellow-500/60 hover:bg-yellow-500/10'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", filterStatus === 'NEAR_EXPIRY_60' ? "text-white" : "text-yellow-600 dark:text-yellow-400")}>Waspada H-60</span>
            <Clock className={cn("w-4 h-4", filterStatus === 'NEAR_EXPIRY_60' ? "text-white" : "text-yellow-600 dark:text-yellow-400")} />
          </div>
          <div className={cn("text-xl font-extrabold", filterStatus === 'NEAR_EXPIRY_60' ? "text-white" : "text-yellow-600 dark:text-yellow-400")}>{nearExpiry60Count}</div>
          <p className={cn("text-[10px] mt-0.5", filterStatus === 'NEAR_EXPIRY_60' ? "text-white/80" : "text-muted-foreground")}>31–60 Hari ED</p>
        </button>

        {/* Expired */}
        <button
          type="button"
          onClick={() => setFilterStatus('EXPIRED')}
          className={cn(
            'p-3.5 rounded-xl border text-left transition-all cursor-pointer',
            filterStatus === 'EXPIRED'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-500/20'
              : 'bg-card text-foreground border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10'
          )}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", filterStatus === 'EXPIRED' ? "text-white" : "text-purple-600 dark:text-purple-400")}>Kedaluwarsa</span>
            <Calendar className={cn("w-4 h-4", filterStatus === 'EXPIRED' ? "text-white" : "text-purple-600 dark:text-purple-400")} />
          </div>
          <div className={cn("text-xl font-extrabold", filterStatus === 'EXPIRED' ? "text-white" : "text-purple-600 dark:text-purple-400")}>{expiredCount}</div>
          <p className={cn("text-[10px] mt-0.5", filterStatus === 'EXPIRED' ? "text-white/80" : "text-muted-foreground")}>Stok kedaluwarsa</p>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-card p-4 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari obat berdasarkan nama, kode..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filter Status:</span>
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'LOW_STOCK', label: 'Stok Menipis' },
            { id: 'OUT_OF_STOCK', label: 'Stok Habis' },
            { id: 'NEAR_EXPIRY_30', label: 'Kritis H-30' },
            { id: 'NEAR_EXPIRY_60', label: 'Waspada H-60' },
            { id: 'EXPIRED', label: 'Kedaluwarsa' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer',
                filterStatus === st.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Kode</th>
                <th className="px-4 py-3">Nama Obat</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Satuan</th>
                <th className="px-4 py-3 text-right">Harga Jual</th>
                <th className="px-4 py-3 text-center">Stok Tersedia</th>
                <th className="px-4 py-3 text-center">Min. Stok</th>
                <th className="px-4 py-3 text-center">Status Peringatan</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <Pill className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Tidak ada data obat yang sesuai</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((med) => (
                  <tr key={med.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground font-semibold">
                      {med.code || `OBT-${med.id.toString().padStart(3, '0')}`}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">{med.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <MedicineCategoryBadge category={med.category} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{med.unit}</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      Rp {med.unitPrice.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full font-bold text-xs border',
                          med.availableStock === 0
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            : med.availableStock <= med.minStock
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        )}
                      >
                        {med.availableStock} {med.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground font-medium">
                      {med.minStock} {med.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {med.availableStock === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          <PackageX className="w-3 h-3" /> Stok Habis
                        </span>
                      ) : med.expiredStock > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[10px] font-bold">
                          <Calendar className="w-3 h-3" /> Ada Kedaluwarsa ({med.expiredStock})
                        </span>
                      ) : med.availableStock <= med.minStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" /> Stok Menipis
                        </span>
                      ) : med.nearExpiryBatchesCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/30 text-[10px] font-bold">
                          <Clock className="w-3 h-3" /> Mendekati Kedaluwarsa ({med.nearExpiryBatchesCount} Batch)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Aman
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          title="Lihat Rincian Batch"
                          onClick={() => {
                            setSelectedMedViewBatches(med)
                            setIsViewBatchesOpen(true)
                          }}
                          className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>

                        {isNurse && (
                          <>
                            <button
                              title="Tambah Batch (Restock)"
                              onClick={() => openAddBatchModal(med)}
                              className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Edit Master Obat"
                              onClick={() => openEditModal(med)}
                              className="p-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add / Edit Medicine Master */}
      {isAddMedOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl shadow-xl border border-border w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="text-sm font-bold text-foreground">
                {editingMed ? `Edit Master Obat: ${editingMed.name}` : 'Tambah Obat Baru'}
              </h3>
              <button
                onClick={() => setIsAddMedOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nama Obat *</label>
                <input
                  type="text"
                  required
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="mis. Paracetamol 500mg"
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Kode Obat <span className="font-normal text-muted-foreground text-[10px]">(Opsional / Otomatis OBT-xxx)</span></label>
                  <input
                    type="text"
                    value={medCode}
                    onChange={(e) => setMedCode(e.target.value)}
                    placeholder="Otomatis terisi mis. OBT-001"
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Kategori Obat (Golongan BPOM) *</label>
                  <select
                    value={medCategory}
                    onChange={(e) => setMedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground"
                  >
                    <option value="Obat Bebas">Obat Bebas (Lingkaran Hijau Tepi Hitam)</option>
                    <option value="Obat Bebas Terbatas">Obat Bebas Terbatas (Lingkaran Biru Tepi Hitam)</option>
                    <option value="Obat Keras">Obat Keras & Psikotropika (Huruf K Merah Tepi Hitam)</option>
                    <option value="Alat Kesehatan / BMHP">Alat Kesehatan / BMHP (Bahan Medis Habis Pakai)</option>
                  </select>
                </div>
              </div>

              {/* BPOM Symbol & Description Live Preview */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Simbol Golongan Obat (BPOM)</span>
                <MedicineCategoryBadge category={medCategory} showDescription={true} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Satuan</label>
                  <select
                    value={medUnit}
                    onChange={(e) => setMedUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Botol">Botol</option>
                    <option value="Strip">Strip</option>
                    <option value="Kaplet">Kaplet</option>
                    <option value="Tube">Tube</option>
                    <option value="Ampul">Ampul</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Minimum Stok *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={medMinStock}
                    onChange={(e) => setMedMinStock(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={medUnitPrice}
                    onChange={(e) => setMedUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Harga Beli (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={medPurchasePrice}
                    onChange={(e) => setMedPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddMedOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isPending} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                  {isPending ? 'Menyimpan...' : 'Simpan Data Obat'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Batch Restock */}
      {isBatchModalOpen && selectedMedForBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl shadow-xl border border-border w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-emerald-500/10">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Restock / Tambah Batch: {selectedMedForBatch.name}</span>
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nomor Batch *</label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="mis. BATCH-20260910-001"
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Jumlah Stok Baru ({selectedMedForBatch.unit}) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={batchQty}
                  onChange={(e) => setBatchQty(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tanggal Kedaluwarsa (Expiry Date) *
                </label>
                <input
                  type="date"
                  required
                  value={batchExpiryDate}
                  onChange={(e) => setBatchExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isPending} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                  {isPending ? 'Menyimpan...' : 'Tambah Stok Batch'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View Batches */}
      {isViewBatchesOpen && selectedMedViewBatches && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl shadow-xl border border-border w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Rincian Batch Stok: {selectedMedViewBatches.name}</span>
              </h3>
              <button
                onClick={() => setIsViewBatchesOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Informasi Manajemen Stok (Sistem FEFO):</strong> Stok obat terbagi per-batch. Peringatan status obat dihitung berdasarkan batch yang stoknya masih tersisa. Jika batch lama sudah tidak berlaku/dibuang/salah input ED, Anda dapat mengedit tanggal kedaluwarsa atau menghapus batch lama di kolom <strong>Aksi</strong>.
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground">Stok Aktif Tersedia: </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedMedViewBatches.availableStock} {selectedMedViewBatches.unit}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Stok Kedaluwarsa: </span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {selectedMedViewBatches.expiredStock} {selectedMedViewBatches.unit}
                  </span>
                </div>
              </div>

              {!selectedMedViewBatches.batches || selectedMedViewBatches.batches.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs">
                  Belum ada batch stok yang terdaftar untuk obat ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2">No. Batch</th>
                        <th className="px-3 py-2 text-center">Sisa Stok</th>
                        <th className="px-3 py-2 text-center">Stok Awal</th>
                        <th className="px-3 py-2">Tanggal ED</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        {isNurse && <th className="px-3 py-2 text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selectedMedViewBatches.batches.map((b) => (
                        <tr key={b.id} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono font-bold text-foreground">
                            {b.batchNumber}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-foreground">
                            {b.stockQuantity} {selectedMedViewBatches.unit}
                          </td>
                          <td className="px-3 py-2 text-center text-muted-foreground">
                            {b.initialQuantity}
                          </td>
                          <td className="px-3 py-2 text-foreground font-medium">
                            {new Date(b.expiryDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {b.isExpired ? (
                              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold text-[10px] inline-flex items-center gap-1">
                                <span>Kedaluwarsa</span>
                                <span className="opacity-80">({Math.abs(b.daysUntilExpiry)} hr lalu)</span>
                              </span>
                            ) : b.isNearExpiry30 ? (
                              <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 font-extrabold text-[10px] inline-flex items-center gap-1">
                                <span>🚨 Kritis H-30</span>
                                <span>({b.daysUntilExpiry} hr lagi)</span>
                              </span>
                            ) : b.isNearExpiry60 ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-[10px] inline-flex items-center gap-1">
                                <span>🟡 Waspada H-60</span>
                                <span>({b.daysUntilExpiry} hr lagi)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                                Aman (&gt;60 hr)
                              </span>
                            )}
                          </td>
                          {isNurse && (
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  title="Ubah Tanggal ED Batch"
                                  onClick={() => openEditBatchExpiryModal(b.id, b.batchNumber, b.expiryDate)}
                                  className="p-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-blue-500/30 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  title="Hapus Batch Ini"
                                  onClick={() => openDeleteBatchModal(b.id, b.batchNumber)}
                                  className="p-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-4 flex justify-end border-t border-border">
                <Button
                  onClick={() => setIsViewBatchesOpen(false)}
                  className="text-xs bg-muted text-foreground hover:bg-muted/80 border border-border cursor-pointer"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Custom Delete Batch Confirmation Dialog */}
      {batchToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Hapus Batch Stok Obat?</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong className="text-foreground font-mono font-bold">{batchToDelete.batchNumber}</strong>?
                  <br />
                  Stok dari batch ini akan dihapus permanen dari inventaris. Action ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchToDelete(null)}
                  disabled={isPending}
                  className="py-2.5 px-4 rounded-xl border border-border text-foreground font-semibold text-xs hover:bg-muted transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteBatch}
                  disabled={isPending}
                  className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isPending ? 'Menghapus...' : 'Ya, Hapus Batch'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Custom Edit Batch Expiry Date Dialog */}
      {batchToEditExpiry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Ubah Tanggal Kedaluwarsa</span>
              </h3>
              <button
                type="button"
                onClick={() => setBatchToEditExpiry(null)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={confirmEditBatchExpiry} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs">
                <span className="text-muted-foreground font-medium">Nomor Batch: </span>
                <span className="font-mono font-bold text-foreground">{batchToEditExpiry.batchNumber}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Tanggal Kedaluwarsa Baru (ED) *
                </label>
                <input
                  type="date"
                  required
                  value={newExpiryDateInput}
                  onChange={(e) => setNewExpiryDateInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchToEditExpiry(null)}
                  disabled={isPending}
                  className="py-2.5 px-4 rounded-xl border border-border text-foreground font-semibold text-xs hover:bg-muted transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Tanggal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal 4: Stock Movement Audit Log Modal */}
      <StockMovementModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        medicines={inventory}
        isNurse={isNurse}
      />
    </div>
  )
}
