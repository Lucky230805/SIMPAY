'use client'

import { useState, useTransition } from 'react'
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Katalog & Stok Obat (Apotek)
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Kelola data master obat, batch stok, tanggal kedaluwarsa, dan peringatan restock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isNurse && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              <Info className="w-4 h-4" />
              <span>Akses Baca Saja (Peran DOKTER)</span>
            </div>
          )}

          {isNurse && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={openAddActionModal}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1.5 shadow-sm text-xs h-9"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Tambah Tindakan / Injeksi</span>
              </Button>
              <Button
                onClick={openAddModal}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 shadow-sm text-xs h-9"
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
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:underline">
            Tutup
          </button>
        </div>
      )}

      {/* Summary Alert Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Active */}
        <button
          type="button"
          onClick={() => setFilterStatus('ALL')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterStatus === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Total Master</span>
            <Pill className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold">{totalActive}</div>
          <p className="text-[10px] mt-1 opacity-70">Obat terdaftar</p>
        </button>

        {/* Low Stock */}
        <button
          type="button"
          onClick={() => setFilterStatus('LOW_STOCK')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterStatus === 'LOW_STOCK'
              ? 'bg-amber-500 text-white border-amber-500 shadow-md'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Stok Menipis</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold">{lowStockCount}</div>
          <p className="text-[10px] mt-1 opacity-70">≤ Min. Stok</p>
        </button>

        {/* Out of Stock */}
        <button
          type="button"
          onClick={() => setFilterStatus('OUT_OF_STOCK')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterStatus === 'OUT_OF_STOCK'
              ? 'bg-red-600 text-white border-red-600 shadow-md'
              : 'bg-red-50 text-red-900 border-red-200 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Stok Habis</span>
            <PackageX className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold">{outOfStockCount}</div>
          <p className="text-[10px] mt-1 opacity-70">0 Pcs tersedia</p>
        </button>

        {/* Near Expiry */}
        <button
          type="button"
          onClick={() => setFilterStatus('NEAR_EXPIRY')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterStatus === 'NEAR_EXPIRY'
              ? 'bg-orange-500 text-white border-orange-500 shadow-md'
              : 'bg-orange-50 text-orange-900 border-orange-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Mendekati Kedaluwarsa</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-2xl font-extrabold">{nearExpiryCount}</div>
          <p className="text-[10px] mt-1 opacity-70">≤ 30 Hari lagi</p>
        </button>

        {/* Expired */}
        <button
          type="button"
          onClick={() => setFilterStatus('EXPIRED')}
          className={`p-4 rounded-xl border text-left transition-all ${
            filterStatus === 'EXPIRED'
              ? 'bg-purple-600 text-white border-purple-600 shadow-md'
              : 'bg-purple-50 text-purple-900 border-purple-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Kedaluwarsa</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold">{expiredCount}</div>
          <p className="text-[10px] mt-1 opacity-70">Stok kedaluwarsa</p>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari obat berdasarkan nama, kode..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Status:</span>
          {['ALL', 'LOW_STOCK', 'OUT_OF_STOCK', 'NEAR_EXPIRY', 'EXPIRED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' && 'Semua'}
              {st === 'LOW_STOCK' && 'Stok Menipis'}
              {st === 'OUT_OF_STOCK' && 'Stok Habis'}
              {st === 'NEAR_EXPIRY' && 'Mendekati Kedaluwarsa'}
              {st === 'EXPIRED' && 'Kedaluwarsa'}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    <Pill className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">Tidak ada data obat yang sesuai</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 font-semibold">
                      {med.code || `OBT-${med.id.toString().padStart(3, '0')}`}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{med.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <MedicineCategoryBadge category={med.category} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{med.unit}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">
                      Rp {med.unitPrice.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full font-bold ${
                          med.availableStock === 0
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : med.availableStock <= med.minStock
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {med.availableStock} {med.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 font-medium">
                      {med.minStock} {med.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {med.availableStock === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                          <PackageX className="w-3 h-3" /> Stok Habis
                        </span>
                      ) : med.expiredStock > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                          <Calendar className="w-3 h-3" /> Ada Kedaluwarsa ({med.expiredStock})
                        </span>
                      ) : med.availableStock <= med.minStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3" /> Stok Menipis
                        </span>
                      ) : med.nearExpiryBatchesCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold">
                          <Clock className="w-3 h-3" /> Mendekati Kedaluwarsa ({med.nearExpiryBatchesCount} Batch)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
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
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>

                        {isNurse && (
                          <>
                            <button
                              title="Tambah Batch (Restock)"
                              onClick={() => openAddBatchModal(med)}
                              className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Edit Master Obat"
                              onClick={() => openEditModal(med)}
                              className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {editingMed ? `Edit Master Obat: ${editingMed.name}` : 'Tambah Obat Baru'}
              </h3>
              <button
                onClick={() => setIsAddMedOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Obat *</label>
                <input
                  type="text"
                  required
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="mis. Paracetamol 500mg"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Obat <span className="font-normal text-slate-400 text-[10px]">(Opsional / Otomatis OBT-xxx)</span></label>
                  <input
                    type="text"
                    value={medCode}
                    onChange={(e) => setMedCode(e.target.value)}
                    placeholder="Otomatis terisi mis. OBT-001"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Obat (Golongan BPOM) *</label>
                  <select
                    value={medCategory}
                    onChange={(e) => setMedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                  >
                    <option value="Obat Bebas">Obat Bebas (Lingkaran Hijau Tepi Hitam)</option>
                    <option value="Obat Bebas Terbatas">Obat Bebas Terbatas (Lingkaran Biru Tepi Hitam)</option>
                    <option value="Obat Keras">Obat Keras & Psikotropika (Huruf K Merah Tepi Hitam)</option>
                    <option value="Tindakan / Layanan Medis">Tindakan / Layanan Medis</option>
                  </select>
                </div>
              </div>

              {/* BPOM Symbol & Description Live Preview */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Simbol Golongan Obat (BPOM)</span>
                <MedicineCategoryBadge category={medCategory} showDescription={true} size="md" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
                  <select
                    value={medUnit}
                    onChange={(e) => setMedUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Stok *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={medMinStock}
                    onChange={(e) => setMedMinStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={medUnitPrice}
                    onChange={(e) => setMedUnitPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Beli (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={medPurchasePrice}
                    onChange={(e) => setMedPurchasePrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddMedOpen(false)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isPending} className="text-xs bg-primary">
                  {isPending ? 'Menyimpan...' : 'Simpan Data Obat'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Batch Restock */}
      {isBatchModalOpen && selectedMedForBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
              <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Restock / Tambah Batch: {selectedMedForBatch.name}</span>
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="text-emerald-700 hover:text-emerald-900 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Batch *</label>
                <input
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="mis. BATCH-20260910-001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Stok Baru ({selectedMedForBatch.unit}) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={batchQty}
                  onChange={(e) => setBatchQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Kedaluwarsa (Expiry Date) *
                </label>
                <input
                  type="date"
                  required
                  value={batchExpiryDate}
                  onChange={(e) => setBatchExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isPending} className="text-xs bg-emerald-600 hover:bg-emerald-700">
                  {isPending ? 'Menyimpan...' : 'Tambah Stok Batch'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View Batches */}
      {isViewBatchesOpen && selectedMedViewBatches && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Rincian Batch Stok: {selectedMedViewBatches.name}</span>
              </h3>
              <button
                onClick={() => setIsViewBatchesOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Informasi Manajemen Stok (Sistem FEFO):</strong> Stok obat terbagi per-batch. Peringatan status obat dihitung berdasarkan batch yang stoknya masih tersisa. Jika batch lama sudah tidak berlaku/dibuang/salah input ED, Anda dapat mengedit tanggal kedaluwarsa atau menghapus batch lama di kolom <strong>Aksi</strong>.
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500">Stok Aktif Tersedia: </span>
                  <span className="font-bold text-emerald-700">
                    {selectedMedViewBatches.availableStock} {selectedMedViewBatches.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Stok Kedaluwarsa: </span>
                  <span className="font-bold text-purple-700">
                    {selectedMedViewBatches.expiredStock} {selectedMedViewBatches.unit}
                  </span>
                </div>
              </div>

              {!selectedMedViewBatches.batches || selectedMedViewBatches.batches.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Belum ada batch stok yang terdaftar untuk obat ini.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2">No. Batch</th>
                        <th className="px-3 py-2 text-center">Sisa Stok</th>
                        <th className="px-3 py-2 text-center">Stok Awal</th>
                        <th className="px-3 py-2">Tanggal ED</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        {isNurse && <th className="px-3 py-2 text-center">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedMedViewBatches.batches.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-bold text-slate-800">
                            {b.batchNumber}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-slate-900">
                            {b.stockQuantity} {selectedMedViewBatches.unit}
                          </td>
                          <td className="px-3 py-2 text-center text-slate-400">
                            {b.initialQuantity}
                          </td>
                          <td className="px-3 py-2 text-slate-700 font-medium">
                            {new Date(b.expiryDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {b.isExpired ? (
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 font-bold text-[10px]">
                                Kedaluwarsa
                              </span>
                            ) : b.isNearExpiry ? (
                              <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-700 font-bold text-[10px]">
                                Mendekati Kedaluwarsa
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                                Aman
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
                                  className="p-1 rounded text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  title="Hapus Batch Ini"
                                  onClick={() => openDeleteBatchModal(b.id, b.batchNumber)}
                                  className="p-1 rounded text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
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

              <div className="pt-4 flex justify-end border-t border-slate-100">
                <Button
                  onClick={() => setIsViewBatchesOpen(false)}
                  className="text-xs bg-slate-900 text-white"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto border border-red-200">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Hapus Batch Stok Obat?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong className="text-slate-900 font-mono font-bold">{batchToDelete.batchNumber}</strong>?
                  <br />
                  Stok dari batch ini akan dihapus permanen dari inventaris. Action ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchToDelete(null)}
                  disabled={isPending}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteBatch}
                  disabled={isPending}
                  className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span>Ubah Tanggal Kedaluwarsa</span>
              </h3>
              <button
                type="button"
                onClick={() => setBatchToEditExpiry(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={confirmEditBatchExpiry} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Nomor Batch: </span>
                <span className="font-mono font-bold text-slate-900">{batchToEditExpiry.batchNumber}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tanggal Kedaluwarsa Baru (ED) *
                </label>
                <input
                  type="date"
                  required
                  value={newExpiryDateInput}
                  onChange={(e) => setNewExpiryDateInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBatchToEditExpiry(null)}
                  disabled={isPending}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Tanggal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
