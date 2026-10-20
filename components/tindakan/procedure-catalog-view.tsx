'use client'

import React, { useState } from 'react'
import {
  Syringe,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Activity,
  Layers,
  X,
  Loader2,
  Info,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ProcedureItem,
  createProcedureAction,
  updateProcedureAction,
  deleteProcedureAction,
  toggleProcedureStatusAction,
} from '@/app/tindakan/actions'
import { cn } from '@/lib/utils'

interface ProcedureCatalogViewProps {
  initialProcedures: ProcedureItem[]
  userRole: 'DOKTER' | 'PERAWAT'
}

const PROCEDURE_CATEGORIES = [
  'Semua',
  'Tindakan Umum',
  'Tindakan Keperawatan',
  'Bedah Minor',
  'Terapi Inhalasi',
  'Diagnostik',
]

const ICD9_RECOMMENDATIONS = [
  { code: '93.94', name: 'Terapi Nebulizer / Inhalasi', cat: 'Terapi Inhalasi' },
  { code: '86.59', name: 'Rawat & Jahit Luka (Hecting)', cat: 'Bedah Minor' },
  { code: '99.18', name: 'Pemasangan Infus Intravena', cat: 'Tindakan Keperawatan' },
  { code: '89.52', name: 'Pemeriksaan EKG 12 Lead', cat: 'Diagnostik' },
  { code: '99.29', name: 'Injeksi Obat (IM/IV/SC)', cat: 'Tindakan Keperawatan' },
  { code: '96.07', name: 'Pemasangan Kateter Urin', cat: 'Tindakan Keperawatan' },
  { code: '86.04', name: 'Insisi & Drainase Abses', cat: 'Bedah Minor' },
  { code: '86.23', name: 'Ekstraksi Kuku (Roset)', cat: 'Bedah Minor' },
  { code: '95.41', name: 'Irigasi / Spooling Telinga', cat: 'Tindakan Umum' },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getCategoryBadge(category: string | null) {
  const cat = (category || 'Tindakan Umum').trim()
  switch (cat) {
    case 'Bedah Minor':
      return 'bg-purple-50 text-purple-700 border-purple-200'
    case 'Tindakan Keperawatan':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'Terapi Inhalasi':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200'
    case 'Diagnostik':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export function ProcedureCatalogView({
  initialProcedures,
  userRole,
}: ProcedureCatalogViewProps) {
  const [procedures, setProcedures] = useState<ProcedureItem[]>(initialProcedures)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ProcedureItem | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    tariff: '',
    category: 'Tindakan Umum',
    description: '',
  })

  // Delete State
  const [deletingItem, setDeletingItem] = useState<ProcedureItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filter items
  const filteredProcedures = procedures.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(search.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(search.toLowerCase()))

    const matchesCategory =
      selectedCategory === 'Semua' || item.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // KPI Calculations
  const totalCount = procedures.length
  const activeCount = procedures.filter((p) => p.isActive).length
  const totalUsages = procedures.reduce((acc, p) => acc + (p.usageCount || 0), 0)

  const openCreateModal = () => {
    setEditingItem(null)
    setFormData({
      code: '',
      name: '',
      tariff: '',
      category: 'Tindakan Umum',
      description: '',
    })
    setMessage(null)
    setIsModalOpen(true)
  }

  const openEditModal = (item: ProcedureItem) => {
    setEditingItem(item)
    setFormData({
      code: item.code || '',
      name: item.name,
      tariff: String(item.tariff),
      category: item.category || 'Tindakan Umum',
      description: item.description || '',
    })
    setMessage(null)
    setIsModalOpen(true)
  }

  const handleApplyICD9Recommendation = (rec: { code: string; name: string; cat: string }) => {
    setFormData((prev) => ({
      ...prev,
      code: rec.code,
      name: prev.name ? prev.name : rec.name,
      category: rec.cat,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const tariffNum = parseFloat(formData.tariff.replace(/\D/g, '')) || 0

      if (editingItem) {
        const res = await updateProcedureAction(editingItem.id, {
          code: formData.code,
          name: formData.name,
          tariff: tariffNum,
          category: formData.category,
          description: formData.description,
        })
        if (res.success) {
          setProcedures((prev) =>
            prev.map((p) =>
              p.id === editingItem.id
                ? {
                    ...p,
                    code: formData.code || null,
                    name: formData.name,
                    tariff: tariffNum,
                    category: formData.category,
                    description: formData.description || null,
                  }
                : p
            )
          )
          setMessage({ type: 'success', text: 'Tindakan medis berhasil diperbarui' })
          setTimeout(() => setIsModalOpen(false), 600)
        } else {
          setMessage({ type: 'error', text: res.error || 'Gagal memperbarui tindakan' })
        }
      } else {
        const res = await createProcedureAction({
          code: formData.code,
          name: formData.name,
          tariff: tariffNum,
          category: formData.category,
          description: formData.description,
        })
        if (res.success && res.data) {
          setProcedures((prev) => [
            {
              id: res.data.id,
              code: res.data.code,
              name: res.data.name,
              tariff: res.data.tariff,
              category: res.data.category,
              description: res.data.description,
              isActive: res.data.isActive,
              createdAt: res.data.createdAt,
              usageCount: 0,
            },
            ...prev,
          ])
          setMessage({ type: 'success', text: 'Tindakan medis baru berhasil ditambahkan' })
          setTimeout(() => setIsModalOpen(false), 600)
        } else {
          setMessage({ type: 'error', text: res.error || 'Gagal menambahkan tindakan' })
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Terjadi kesalahan sistem' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (item: ProcedureItem) => {
    try {
      const res = await toggleProcedureStatusAction(item.id, item.isActive)
      if (res.success) {
        setProcedures((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, isActive: !p.isActive } : p))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    setIsLoading(true)

    try {
      const res = await deleteProcedureAction(deletingItem.id)
      if (res.success) {
        if (deletingItem.usageCount && deletingItem.usageCount > 0) {
          setProcedures((prev) =>
            prev.map((p) => (p.id === deletingItem.id ? { ...p, isActive: false } : p))
          )
        } else {
          setProcedures((prev) => prev.filter((p) => p.id !== deletingItem.id))
        }
        setDeletingItem(null)
      } else {
        alert(res.error || 'Gagal menghapus tindakan')
      }
    } catch (err: any) {
      alert(err?.message || 'Terjadi kesalahan')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <Syringe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Katalog &amp; Tarif Tindakan Medis
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 pl-11.5">
            Kelola master prosedur klinis, kodifikasi ICD-9-CM resmi, dan tarif jasa pelayanan. Murni jasa tanpa manajemen stok barang.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 text-xs h-9 px-4 rounded-lg shadow-xs shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Tindakan Medis</span>
        </Button>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Tindakan Terdaftar
            </p>
            <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
            <p className="text-[11px] text-slate-400">Tersedia pada form rekam medis dokter</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tindakan Aktif
            </p>
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
            <p className="text-[11px] text-slate-400">Siap dipilih saat pemeriksaan klinis</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Pelayanan Pasien
            </p>
            <p className="text-2xl font-bold text-slate-900">{totalUsages}</p>
            <p className="text-[11px] text-slate-400">Frekuensi tindakan terlaksana di klinik</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Filter & Search Toolbar ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full lg:w-80 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Cari tindakan, kode ICD-9, kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-slate-50/50 focus:bg-white border-slate-200"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {PROCEDURE_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
                  )}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Table Card ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-32">Kode ICD-9-CM</th>
                <th className="px-4 py-3.5">Nama Tindakan &amp; Deskripsi</th>
                <th className="px-4 py-3.5 w-48">Kategori</th>
                <th className="px-4 py-3.5 text-right w-36">Tarif Layanan</th>
                <th className="px-4 py-3.5 text-center w-28">Riwayat Pakai</th>
                <th className="px-4 py-3.5 text-center w-28">Status</th>
                <th className="px-4 py-3.5 text-right w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProcedures.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Syringe className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Tidak ada tindakan medis yang ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Ubah kata kunci pencarian atau pilih kategori lain</p>
                  </td>
                </tr>
              ) : (
                filteredProcedures.map((item) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-slate-50/80 transition-colors',
                      !item.isActive && 'opacity-60 bg-slate-50/30'
                    )}
                  >
                    {/* ICD-9 Code */}
                    <td className="px-4 py-3.5">
                      {item.code ? (
                        <span className="font-mono font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-[11px]">
                          {item.code}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">—</span>
                      )}
                    </td>

                    {/* Procedure Name & Description */}
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900 text-sm">{item.name}</p>
                      {item.description ? (
                        <p className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      ) : null}
                    </td>

                    {/* Category Badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border',
                          getCategoryBadge(item.category)
                        )}
                      >
                        {item.category || 'Tindakan Umum'}
                      </span>
                    </td>

                    {/* Tariff */}
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(item.tariff)}
                    </td>

                    {/* Usage Count */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        {item.usageCount || 0}x
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        title={item.isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors border',
                          item.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        )}
                      >
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            item.isActive ? 'bg-emerald-600' : 'bg-slate-400'
                          )}
                        />
                        {item.isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(item)}
                          className="w-7 h-7 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shadow-2xs"
                          title="Edit Tindakan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingItem(item)}
                          className="w-7 h-7 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 flex items-center justify-center transition-colors shadow-2xs"
                          title="Hapus Tindakan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            Menampilkan <span className="font-semibold text-slate-800">{filteredProcedures.length}</span> dari{' '}
            <span className="font-semibold text-slate-800">{procedures.length}</span> tindakan medis terdaftar
          </p>
          <p className="text-[11px] text-slate-400">
            Jasa layanan klinis • Tidak mengurangi stok inventori farmasi
          </p>
        </div>
      </div>

      {/* ── Modal Create / Edit Procedure ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                  <Syringe className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingItem ? 'Edit Tindakan Medis' : 'Tambah Tindakan Medis Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {message && (
                <div
                  className={cn(
                    'p-3 rounded-lg border text-xs flex items-center gap-2',
                    message.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  )}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {/* ICD-9 Code & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kode ICD-9-CM (Prosedur)
                  </label>
                  <Input
                    placeholder="Contoh: 93.94"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="font-mono text-xs uppercase bg-white border-slate-200"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Standar BPJS &amp; SATUSEHAT Kemenkes
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kategori Tindakan *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  >
                    <option value="Tindakan Umum">Tindakan Umum</option>
                    <option value="Tindakan Keperawatan">Tindakan Keperawatan</option>
                    <option value="Bedah Minor">Bedah Minor</option>
                    <option value="Terapi Inhalasi">Terapi Inhalasi</option>
                    <option value="Diagnostik">Diagnostik</option>
                  </select>
                </div>
              </div>

              {/* Quick Preset Recommendations for ICD-9 */}
              {!editingItem && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                    <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Rekomendasi Cepat Prosedur ICD-9-CM:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ICD9_RECOMMENDATIONS.slice(0, 6).map((rec) => (
                      <button
                        type="button"
                        key={rec.code}
                        onClick={() => handleApplyICD9Recommendation(rec)}
                        className="text-[10px] bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 px-2.5 py-1 rounded-md transition-colors text-slate-600 font-medium shadow-2xs"
                      >
                        <span className="font-mono font-bold text-emerald-800">{rec.code}</span> {rec.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Tindakan Medis *
                </label>
                <Input
                  placeholder="Contoh: Rawat & Jahit Luka (Hecting)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="text-xs bg-white border-slate-200"
                />
              </div>

              {/* Tariff */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Tarif Jasa Layanan (Rp) *
                </label>
                <Input
                  type="number"
                  placeholder="50000"
                  value={formData.tariff}
                  onChange={(e) => setFormData({ ...formData, tariff: e.target.value })}
                  required
                  min={0}
                  className="text-xs font-mono bg-white border-slate-200"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Tarif ini otomatis masuk ke rincian tagihan kasir saat dokter memilih tindakan.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Deskripsi / Keterangan Klinis
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan indikasi klinis, alat yang digunakan, dll..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isLoading}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambah Tindakan'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Delete / Deactivate Confirmation ── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Hapus Tindakan Medis?
                </h3>
                <p className="text-xs text-slate-500">
                  Apakah Anda yakin ingin menghapus tindakan{' '}
                  <span className="font-semibold text-slate-900">{deletingItem.name}</span>?
                </p>
                {deletingItem.usageCount && deletingItem.usageCount > 0 ? (
                  <div className="mt-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                    <p className="font-semibold mb-0.5">Catatan Audit Rekam Medis:</p>
                    Tindakan ini sudah pernah tercatat pada <strong>{deletingItem.usageCount}</strong> riwayat pemeriksaan pasien. Sistem akan <strong>menonaktifkannya</strong> secara aman agar riwayat rekam medis pasien tetap utuh.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingItem(null)}
                disabled={isLoading}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="gap-1.5 shadow-xs"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{deletingItem.usageCount && deletingItem.usageCount > 0 ? 'Nonaktifkan' : 'Hapus Tindakan'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
