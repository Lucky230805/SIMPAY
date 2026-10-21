'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Plus,
  Trash2,
  FileCode,
  Package,
  Calendar,
  User,
  Info,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import {
  getStockMovements,
  createManualStockAdjustment,
  StockMovementLogItem,
  MedicineItem,
} from '@/app/obat/actions'
import { Button } from '@/components/ui/button'

interface StockMovementModalProps {
  isOpen: boolean
  onClose: () => void
  medicines: MedicineItem[]
  isNurse: boolean
}

export function StockMovementModal({
  isOpen,
  onClose,
  medicines,
  isNurse,
}: StockMovementModalProps) {
  const [logs, setLogs] = useState<StockMovementLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [selectedMedId, setSelectedMedId] = useState<string>('ALL')

  // Adjustment form state
  const [isAdjFormOpen, setIsAdjFormOpen] = useState(false)
  const [adjMedId, setAdjMedId] = useState<string>('')
  const [adjType, setAdjType] = useState<'ADJUSTMENT' | 'EXPIRED_DISPOSAL' | 'IN' | 'OUT'>('ADJUSTMENT')
  const [adjQty, setAdjQty] = useState<string>('0')
  const [adjNotes, setAdjNotes] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [isPending, startTransition] = useTransition()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await getStockMovements(selectedMedId !== 'ALL' ? Number(selectedMedId) : undefined)
      setLogs(res)
    } catch (err) {
      console.error('Failed to load stock movements:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchLogs()
    }
  }, [isOpen, selectedMedId])

  if (!isOpen) return null

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.medicineCode && log.medicineCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.batchNumber && log.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (typeFilter !== 'ALL' && log.type !== typeFilter) return false

    return true
  })

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjMedId) {
      setErrorMsg('Pilih obat terlebih dahulu')
      return
    }
    const qtyNum = Number(adjQty)
    if (!qtyNum || qtyNum === 0) {
      setErrorMsg('Jumlah mutasi stok tidak boleh 0')
      return
    }
    if (!adjNotes.trim()) {
      setErrorMsg('Keterangan / alasan mutasi wajib diisi')
      return
    }

    setErrorMsg(null)
    startTransition(async () => {
      const res = await createManualStockAdjustment({
        medicineId: Number(adjMedId),
        type: adjType,
        quantity: qtyNum,
        notes: adjNotes.trim(),
      })

      if (res.success) {
        setSuccessMsg('Mutasi stok berhasil dicatat ke Audit Log')
        setIsAdjFormOpen(false)
        setAdjQty('0')
        setAdjNotes('')
        fetchLogs()
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan penyesuaian stok')
      }
    })
  }

  const exportLedgerToCSV = () => {
    const lines: string[] = []
    lines.push(`"LAPORAN AUDIT LOG MUTASI STOK OBAT (STOCK LEDGER)"`)
    lines.push(`"Tanggal Unduh",${new Date().toLocaleString('id-ID')}`)
    lines.push('')
    lines.push(`"Waktu & Tanggal","Nama Obat","Kode Obat","No. Batch","Tipe Mutasi","Jumlah Mutasi","Stok Sebelum","Stok Sesudah","Keterangan","Referensi","Petugas"`)

    filteredLogs.forEach((l) => {
      const dateStr = new Date(l.createdAt).toLocaleString('id-ID')
      const nameStr = `"${l.medicineName.replace(/"/g, '""')}"`
      const codeStr = `"${(l.medicineCode || '-').replace(/"/g, '""')}"`
      const batchStr = `"${(l.batchNumber || '-').replace(/"/g, '""')}"`
      const typeStr = `"${l.type}"`
      const qtyStr = l.quantity > 0 ? `+${l.quantity}` : `${l.quantity}`
      const notesStr = `"${(l.notes || '-').replace(/"/g, '""')}"`
      const refStr = `"${(l.referenceNo || '-').replace(/"/g, '""')}"`
      const userStr = `"${l.createdByName.replace(/"/g, '""')}"`

      lines.push(`"${dateStr}",${nameStr},${codeStr},${batchStr},${typeStr},"${qtyStr}",${l.previousStock},${l.currentStock},${notesStr},${refStr},${userStr}`)
    })

    const csvContent = '\uFEFF' + lines.join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `Stock_Ledger_SIMPAY_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getTypeBadge = (type: string, qty: number) => {
    switch (type) {
      case 'IN':
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold text-[10px] inline-flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            <span>Stok Masuk (+{qty})</span>
          </span>
        )
      case 'DISPENSE':
        return (
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold text-[10px] inline-flex items-center gap-1">
            <ArrowDownLeft className="w-3 h-3 text-blue-500" />
            <span>Dispen Resep ({qty})</span>
          </span>
        )
      case 'EXPIRED_DISPOSAL':
        return (
          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 font-extrabold text-[10px] inline-flex items-center gap-1">
            <Trash2 className="w-3 h-3 text-purple-500" />
            <span>Pemusnahan Expired ({qty})</span>
          </span>
        )
      case 'ADJUSTMENT':
        return (
          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-[10px] inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-amber-500" />
            <span>Stok Opname ({qty > 0 ? `+${qty}` : qty})</span>
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border font-bold text-[10px]">
            {type} ({qty})
          </span>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Audit Log Mutasi Stok Obat (Stock Ledger)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pencatatan riwayat alur stok obat real-time (Stok Masuk, Dispen Resep, Pemusnahan Expired &amp; Stok Opname).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl font-bold p-1 rounded-lg transition cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Action & Filter Bar */}
        <div className="p-4 bg-muted/20 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari obat, batch, atau catatan..."
                className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
            >
              <option value="ALL">Semua Jenis Mutasi</option>
              <option value="IN">Stok Masuk (+)</option>
              <option value="DISPENSE">Dispen Resep (-)</option>
              <option value="EXPIRED_DISPOSAL">Pemusnahan Expired (-)</option>
              <option value="ADJUSTMENT">Stok Opname (+/-)</option>
            </select>

            <select
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(e.target.value)}
              className="px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold text-foreground focus:ring-2 focus:ring-primary focus:outline-none max-w-[200px]"
            >
              <option value="ALL">Semua Obat</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              variant="outline"
              onClick={exportLedgerToCSV}
              className="border-border text-foreground bg-card hover:bg-muted text-xs h-8 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-500" />
              <span>Export CSV</span>
            </Button>

            {isNurse && (
              <Button
                onClick={() => setIsAdjFormOpen(!isAdjFormOpen)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Stok Opname / Adjust</span>
              </Button>
            )}
          </div>
        </div>

        {/* Notifications & Forms */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-rose-600 dark:text-rose-400 hover:underline cursor-pointer">
              Tutup
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
              Tutup
            </button>
          </div>
        )}

        {/* Manual Adjustment Form Modal */}
        {isAdjFormOpen && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-muted/30 border border-border text-xs space-y-3">
            <h4 className="font-bold text-foreground flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-emerald-500" />
              <span>Catat Stok Opname / Pemusnahan Manual</span>
            </h4>
            <form onSubmit={handleCreateAdjustment} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-foreground mb-1">Pilih Obat *</label>
                <select
                  required
                  value={adjMedId}
                  onChange={(e) => setAdjMedId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-border rounded-md bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- Pilih Obat --</option>
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Tersedia: {m.availableStock} {m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Tipe Mutasi *</label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 border border-border rounded-md bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="ADJUSTMENT">Stok Opname (+ / -)</option>
                  <option value="EXPIRED_DISPOSAL">Pemusnahan Expired (-)</option>
                  <option value="IN">Tambah Stok (+) </option>
                  <option value="OUT">Kurangi Stok (-)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Jumlah Mutasi * (Gunakan minus (-) jika berkurang)
                </label>
                <input
                  type="number"
                  required
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  placeholder="contoh: -5 atau 10"
                  className="w-full px-2.5 py-1.5 border border-border rounded-md bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Keterangan / Alasan *</label>
                <input
                  type="text"
                  required
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="cth: Stok Opname September / Obat Rusak"
                  className="w-full px-2.5 py-1.5 border border-border rounded-md bg-background text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAdjFormOpen(false)}
                  className="h-7 text-xs cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Mutasi'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Ledger Table */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-xs animate-pulse">
              Memuat data audit log mutasi stok...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
              <Package className="w-8 h-8 mx-auto opacity-40 text-muted-foreground" />
              <p>Belum ada riwayat mutasi stok obat yang tercatat.</p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden shadow-2xs bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-bold uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-3.5 py-2.5">Waktu &amp; Tanggal</th>
                    <th className="px-3.5 py-2.5">Nama Obat &amp; Kode</th>
                    <th className="px-3.5 py-2.5">No. Batch</th>
                    <th className="px-3.5 py-2.5">Tipe Mutasi</th>
                    <th className="px-3.5 py-2.5 text-center">Mutasi (+ / -)</th>
                    <th className="px-3.5 py-2.5 text-center">Stok (Awal &rarr; Akhir)</th>
                    <th className="px-3.5 py-2.5">Keterangan / Catatan</th>
                    <th className="px-3.5 py-2.5">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3.5 py-2.5 text-muted-foreground font-medium whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-foreground">{log.medicineName}</div>
                        {log.medicineCode && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {log.medicineCode}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-foreground font-semibold">
                        {log.batchNumber || '-'}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {getTypeBadge(log.type, log.quantity)}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-extrabold">
                        <span
                          className={
                            log.quantity > 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : log.quantity < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground'
                          }
                        >
                          {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-medium text-muted-foreground">
                        <span>{log.previousStock}</span>
                        <span className="text-muted-foreground/60 mx-1">&rarr;</span>
                        <strong className="text-foreground">{log.currentStock}</strong>
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground max-w-xs">
                        <div>{log.notes || '-'}</div>
                        {log.referenceNo && (
                          <div className="text-[10px] text-muted-foreground/80 font-mono">
                            Ref: {log.referenceNo}
                          </div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground font-medium whitespace-nowrap flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span>{log.createdByName}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
