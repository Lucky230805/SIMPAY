'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, CheckCircle2, AlertCircle, ArrowLeft, Printer, CreditCard, Eye, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { processPrescriptionQueue } from '@/app/resep/actions'

export interface PrescriptionQueueItem {
  id: number
  queueId?: number
  code: string
  priority: 'Cito' | 'Normal'
  patientName: string
  polyclinic: string
  doctorName: string
  waitTimeMinutes: number
  status: 'ANTRE' | 'PROSES' | 'SELESAI'
  billingId?: number | null
  billingStatus?: string
  createdAt: Date
  items: {
    id: number
    name: string
    dosage: string
    notes?: string
    qty: string
    quantity?: number
    unitPrice?: number
    totalPrice?: number
    availableStock?: number
    isStockSufficient?: boolean
  }[]
  patient: {
    id: number
    name: string
    gender: string
    age: number
    noRM: string
    address?: string
    phone?: string
    allergy?: string
  }
}

interface ResepViewProps {
  initialQueues: PrescriptionQueueItem[]
}

export function getMedicineKegunaan(medicineName: string, notes?: string): string {
  const notesLower = (notes || '').toLowerCase()
  const nameLower = (medicineName || '').toLowerCase()

  // 1. Check notes first if user/doctor provided explicit indication
  if (notesLower.includes('lambung') || notesLower.includes('maag') || notesLower.includes('asam lambung')) return 'OBAT LAMBUNG / MAAG'
  if (notesLower.includes('demam') || notesLower.includes('pusing') || notesLower.includes('nyeri') || notesLower.includes('sakit kepala')) return 'OBAT DEMAM & ANTI NYERI'
  if (notesLower.includes('batuk') || notesLower.includes('flu') || notesLower.includes('pilek')) return 'OBAT BATUK & PILEK'
  if (notesLower.includes('alergi') || notesLower.includes('gatal')) return 'OBAT ALERGI & GATAL'
  if (notesLower.includes('tensi') || notesLower.includes('darah tinggi') || notesLower.includes('hipertensi')) return 'OBAT DARAH TINGGI'
  if (notesLower.includes('gula') || notesLower.includes('diabetes')) return 'OBAT PENURUN GULA DARAH'
  if (notesLower.includes('antibiotik') || notesLower.includes('infeksi')) return 'OBAT ANTIBIOTIK / INFEKSI'
  if (notesLower.includes('vitamin') || notesLower.includes('suplemen') || notesLower.includes('daya tahan')) return 'VITAMIN & SUPLEMEN'

  // 2. Map standard medicine names to patient-friendly Kegunaan (Khasiat)
  if (nameLower.includes('antasida') || nameLower.includes('ranitidin') || nameLower.includes('omeprazol') || nameLower.includes('sucralfate') || nameLower.includes('lansoprazol') || nameLower.includes('promag') || nameLower.includes('polysilane') || nameLower.includes('mag')) {
    return 'OBAT LAMBUNG / MAAG'
  }
  if (nameLower.includes('paracetamol') || nameLower.includes('pct') || nameLower.includes('ibuprofen') || nameLower.includes('sanmol') || nameLower.includes('pamol') || nameLower.includes('asidrin') || nameLower.includes('mefenamat') || nameLower.includes('mefenamic') || nameLower.includes('bodrex') || nameLower.includes('panadol')) {
    return 'OBAT DEMAM & ANTI NYERI'
  }
  if (nameLower.includes('amoxicillin') || nameLower.includes('amox') || nameLower.includes('cefadroxil') || nameLower.includes('cotrimoxazole') || nameLower.includes('azithromycin') || nameLower.includes('ciprofloxacin')) {
    return 'OBAT ANTIBIOTIK / INFEKSI'
  }
  if (nameLower.includes('ctm') || nameLower.includes('cetirizine') || nameLower.includes('loratadine') || nameLower.includes('dexamethasone') || nameLower.includes('incidal')) {
    return 'OBAT ALERGI & GATAL'
  }
  if (nameLower.includes('ambroxol') || nameLower.includes('obh') || nameLower.includes('dextromethorphan') || nameLower.includes('gg') || nameLower.includes('glyceryl') || nameLower.includes('siladex') || nameLower.includes('komix') || nameLower.includes('silex')) {
    return 'OBAT BATUK & PILEK'
  }
  if (nameLower.includes('amlodipine') || nameLower.includes('captopril') || nameLower.includes('nifedipine') || nameLower.includes('candesartan')) {
    return 'OBAT DARAH TINGGI (HIPERTENSI)'
  }
  if (nameLower.includes('metformin') || nameLower.includes('glibenclamide') || nameLower.includes('glimepiride')) {
    return 'OBAT PENURUN GULA DARAH'
  }
  if (nameLower.includes('simvastatin') || nameLower.includes('atorvastatin')) {
    return 'OBAT PENURUN KOLESTEROL'
  }
  if (nameLower.includes('vitamin') || nameLower.includes('vit') || nameLower.includes('suplemen') || nameLower.includes('curcuma') || nameLower.includes('becom-zet') || nameLower.includes('neurobion')) {
    return 'VITAMIN & SUPLEMEN KESEHATAN'
  }

  // Fallback if no direct match
  return `OBAT ${medicineName.split(' ')[0].toUpperCase()}`
}

export function ResepView({ initialQueues }: ResepViewProps) {
  const router = useRouter()
  const [queues, setQueues] = useState(initialQueues)

  React.useEffect(() => {
    setQueues(initialQueues)
  }, [initialQueues])

  const isToday = (dateInput: Date | string) => {
    const d = new Date(dateInput)
    const today = new Date()
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    )
  }

  const antreList = queues.filter((q) => q.status !== 'SELESAI')
  const selesaiList = queues.filter((q) => q.status === 'SELESAI' && isToday(q.createdAt))

  const [activeTab, setActiveTab] = useState<'antrean' | 'selesai'>('antrean')
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(
    antreList.length > 0 ? antreList[0].id : null
  )
  const [processedAlert, setProcessedAlert] = useState<string | null>(null)
  const [detailMode, setDetailMode] = useState<boolean>(false)
  const [isEtiketModalOpen, setIsEtiketModalOpen] = useState<boolean>(false)

  const displayedList = activeTab === 'antrean' ? antreList : selesaiList
  const selectedQueue = displayedList.find((q) => q.id === selectedQueueId) || displayedList[0] || null

  const handleSelectQueue = (id: number) => {
    setSelectedQueueId(id)
  }

  const handleProsesDanSerahkan = async (queue: PrescriptionQueueItem) => {
    const updatedQueues = queues.map((q) =>
      q.id === queue.id ? { ...q, status: 'SELESAI' as const, createdAt: new Date() } : q
    )
    setQueues(updatedQueues)

    const remainingAntre = updatedQueues.filter((q) => q.status !== 'SELESAI')
    if (remainingAntre.length > 0) {
      setSelectedQueueId(remainingAntre[0].id)
    } else {
      setSelectedQueueId(null)
    }

    setProcessedAlert(`Obat untuk pasien ${queue.patientName} telah diserahkan dan status antrean resep telah diperbarui menjadi Selesai.`)
    await processPrescriptionQueue(queue.id)
    router.refresh()
  }

  useEffect(() => {
    if (!processedAlert) return
    const timer = setTimeout(() => {
      setProcessedAlert(null)
    }, 6000)
    return () => clearTimeout(timer)
  }, [processedAlert])

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto text-xs">
      {/* Alert Banner when processed */}
      {processedAlert && (
        <div className="p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 dark:bg-emerald-950/30 text-foreground flex items-start justify-between shadow-xs animate-in fade-in-0 duration-200 print:hidden">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-semibold text-xs text-foreground">
                Resep Berhasil Diproses
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {processedAlert}
              </p>
            </div>
          </div>
          <button
            onClick={() => setProcessedAlert(null)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mode Switch: Main Dashboard vs Detail View */}
      {!detailMode ? (
        <div className="space-y-6 print:hidden">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Daftar Antrean Resep</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manajemen penyiapan obat pasien.</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full font-semibold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                {antreList.length} Antre
              </span>
              <span className="px-3 py-1 bg-muted/80 text-muted-foreground border border-border rounded-full font-semibold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/60" />
                {selesaiList.length} Selesai
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border flex gap-6 text-sm font-semibold">
            <button
              onClick={() => {
                setActiveTab('antrean')
                if (antreList.length > 0) setSelectedQueueId(antreList[0].id)
                else setSelectedQueueId(null)
              }}
              className={cn(
                'pb-3 border-b-2 transition-colors',
                activeTab === 'antrean'
                  ? 'border-primary text-foreground font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Antrean Resep ({antreList.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('selesai')
                if (selesaiList.length > 0) setSelectedQueueId(selesaiList[0].id)
                else setSelectedQueueId(null)
              }}
              className={cn(
                'pb-3 border-b-2 transition-colors',
                activeTab === 'selesai'
                  ? 'border-primary text-foreground font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Selesai Hari Ini ({selesaiList.length})
            </button>
          </div>

          {/* Split Content: Left List & Right Detail Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT LIST (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {displayedList.length === 0 ? (
                <div className="bg-white border rounded-xl p-12 text-center text-muted-foreground">
                  Belum ada resep dalam kategori ini.
                </div>
              ) : (
                displayedList.map((item) => {
                  const isSelected = selectedQueue?.id === item.id
                  const isCito = item.priority === 'Cito'

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectQueue(item.id)}
                      className={cn(
                        'bg-white border rounded-xl p-4 transition-all cursor-pointer flex items-center justify-between gap-4',
                        isCito ? 'border-red-200 bg-red-50/20' : 'border-border',
                        isSelected ? 'border-2 border-slate-900 shadow-sm' : 'hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                              {item.code}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded font-semibold border',
                                isCito
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                  : 'bg-muted/80 text-muted-foreground border-border'
                              )}
                            >
                              {isCito ? '▲ Cito' : 'Normal'}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded font-semibold border',
                                item.billingStatus === 'LUNAS'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                              )}
                            >
                              {item.billingStatus === 'LUNAS' ? '✓ Tagihan Lunas' : 'Tagihan Belum Lunas'}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-foreground leading-tight">
                            {item.patientName}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {item.polyclinic} • {item.doctorName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right space-y-2 shrink-0">
                        <div>
                          <span className="text-[11px] text-muted-foreground block">Waktu tunggu:</span>
                          <span className="font-bold text-red-600 text-sm">
                            {item.waitTimeMinutes} mnt
                          </span>
                        </div>
                        {item.status !== 'SELESAI' ? (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectQueue(item.id)
                              setDetailMode(true)
                            }}
                            className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition"
                          >
                            Proses Resep
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectQueue(item.id)
                              setDetailMode(true)
                            }}
                            className="h-8 px-3 rounded-lg text-xs font-semibold"
                          >
                            Lihat Rincian
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* RIGHT DETAIL PANEL (5 cols) */}
            {selectedQueue ? (
              <div className="lg:col-span-5 bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      DETAIL RESEP AKTIF
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded font-semibold border',
                          selectedQueue.priority === 'Cito'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            : 'bg-muted/80 text-muted-foreground border-border'
                        )}
                      >
                        {selectedQueue.priority}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded font-semibold border',
                          selectedQueue.billingStatus === 'LUNAS'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        )}
                      >
                        {selectedQueue.billingStatus === 'LUNAS' ? '✓ LUNAS' : 'BELUM LUNAS'}
                      </span>
                    </div>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    {selectedQueue.code}
                  </p>
                  <h2 className="text-xl font-bold text-foreground mt-1">
                    {selectedQueue.patientName}
                  </h2>
                </div>

                {/* Prescription items list with Stock Badges */}
                <div className="space-y-3 divide-y divide-border/60">
                  {selectedQueue.items.length === 0 ? (
                    <div className="py-4 text-center text-muted-foreground bg-slate-50 rounded-lg border border-slate-200">
                      <p className="font-semibold text-xs">Tidak Ada Resep Obat</p>
                      <p className="text-[11px] mt-0.5">Dokter tidak meresepkan obat untuk kunjungan ini.</p>
                    </div>
                  ) : (
                    selectedQueue.items.map((item, idx) => {
                      const hasStockInfo = item.availableStock !== undefined
                      const isSufficient = item.isStockSufficient !== false

                      return (
                        <div key={idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="font-bold text-foreground text-sm flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {hasStockInfo && (
                                <span
                                  className={cn(
                                    'text-[10px] px-2 py-0.5 rounded font-bold border',
                                    isSufficient
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                  )}
                                >
                                  {isSufficient
                                    ? `✓ Stok Tersedia (${item.availableStock})`
                                    : `⚠ Stok Kurang (${item.availableStock}/${item.quantity})`}
                                </span>
                              )}
                            </p>
                            <div className="preserve-light inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-900 text-xs shadow-2xs mt-1">
                              <span className="font-bold text-emerald-800 text-[10px] uppercase tracking-wider">Aturan Pakai:</span>
                              <span className="font-semibold text-slate-900">{item.dosage}</span>
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-muted/70 text-foreground rounded border border-border font-mono font-semibold text-xs shrink-0">
                            {item.qty}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Allergy warning if present */}
                {selectedQueue.patient.allergy && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 flex items-start gap-2.5 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p>
                      Pasien memiliki riwayat alergi terhadap{' '}
                      <span className="font-bold">{selectedQueue.patient.allergy}</span>. Harap
                      periksa ulang kesesuaian resep.
                    </p>
                  </div>
                )}

                {/* Submit action */}
                <div className="pt-3 border-t border-border space-y-2.5">
                  {selectedQueue.items.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEtiketModalOpen(true)}
                        className="flex-1 h-9 rounded-xl font-semibold text-xs gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Pratinjau Etiket</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.print()}
                        className="h-9 px-3.5 rounded-xl font-medium text-xs gap-1.5 bg-muted/40 hover:bg-muted text-foreground border border-border transition"
                        title="Cetak Langsung Etiket Obat"
                      >
                        <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Cetak</span>
                      </Button>
                    </div>
                  )}

                  {selectedQueue.status !== 'SELESAI' && selectedQueue.items.length > 0 ? (
                    <Button
                      size="sm"
                      onClick={() => handleProsesDanSerahkan(selectedQueue)}
                      className="w-full h-10 rounded-xl font-semibold text-xs gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Selesai &amp; Serahkan Obat</span>
                    </Button>
                  ) : selectedQueue.status === 'SELESAI' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailMode(true)}
                      className="w-full h-10 rounded-xl font-semibold text-xs"
                    >
                      Lihat Detail Lengkap
                    </Button>
                  ) : null}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/pembayaran?queueId=${selectedQueue.queueId || selectedQueue.id}`)}
                    className="w-full h-9 rounded-xl font-semibold text-xs gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Buka Kasir Pembayaran Pasien</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-5 bg-card border border-border rounded-xl p-8 text-center text-muted-foreground shadow-sm flex flex-col items-center justify-center space-y-2 min-h-[250px]">
                <FileText className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-sm font-semibold text-foreground">Tidak Ada Resep Terpilih</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {activeTab === 'antrean'
                    ? 'Tidak ada antrean resep aktif yang perlu diproses.'
                    : 'Belum ada resep yang selesai diserahkan.'}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DETAIL VIEW SCREEN (Matching 2nd Screenshot) */
        <div className="space-y-6 print:hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailMode(false)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar
                </button>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Detail Resep</h1>
              <p className="text-xs text-muted-foreground">ID Resep: {selectedQueue?.code}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailMode(false)}
                className="h-8 px-3 rounded-lg text-xs font-medium"
              >
                Kembali ke Daftar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 px-3 rounded-lg text-xs font-medium gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Cetak Label</span>
              </Button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Info Panel */}
            <div className="lg:col-span-5 space-y-6">
              {/* Patient Info Card */}
              <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm border-b pb-2">Informasi Pasien</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 font-bold text-gray-700 flex items-center justify-center text-sm">
                    {selectedQueue?.patientName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-base">{selectedQueue?.patientName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedQueue?.patient.gender}, {selectedQueue?.patient.age} Tahun
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. RM:</span>
                    <span className="font-mono font-bold">{selectedQueue?.patient.noRM}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dokter:</span>
                    <span className="font-medium">{selectedQueue?.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Poli:</span>
                    <span className="font-medium">{selectedQueue?.polyclinic}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[10px]">
                      ✓ SELESAI
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Timeline Log */}
              <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm border-b pb-2">Log Status</h3>
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-4 text-xs">
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <p className="font-mono text-[11px] text-muted-foreground">10:05</p>
                    <p className="font-semibold text-foreground">Resep Diterima</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <p className="font-mono text-[11px] text-muted-foreground">10:15</p>
                    <p className="font-semibold text-foreground">Sedang Disiapkan</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <p className="font-mono text-[11px] font-bold text-slate-800">10:22</p>
                    <p className="font-bold text-slate-900">Selesai &amp; Diserahkan</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Table & Completion Panel */}
            <div className="lg:col-span-7 space-y-6">
              {/* Medicine Table */}
              <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="font-bold text-sm">Daftar Obat</h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedQueue?.items.length} Item
                  </span>
                </div>

                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="py-2 w-10">No</th>
                      <th className="py-2">Nama Obat</th>
                      <th className="py-2">Dosis / Aturan Pakai</th>
                      <th className="py-2 text-right">Jumlah</th>
                      <th className="py-2 text-center w-12">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedQueue?.items.map((item, idx) => (
                      <tr key={idx} className="py-2">
                        <td className="py-3 font-medium text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 font-bold text-foreground">{item.name}</td>
                        <td className="py-3 text-muted-foreground">{item.dosage}</td>
                        <td className="py-3 text-right font-mono font-bold">{item.qty}</td>
                        <td className="py-3 text-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Completion Card */}
              <div className="bg-white border rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Proses Selesai</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Resep ini telah selesai diproses dan obat telah diserahkan kepada pasien. Tidak ada
                  tindakan lebih lanjut yang diperlukan.
                </p>
                <Button
                  size="sm"
                  onClick={() => setDetailMode(false)}
                  className="mt-2 h-9 px-4 rounded-xl font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Lihat Antrean Berikutnya
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ON-SCREEN MODAL PREVIEW FOR ETIKET ATURAN PAKAI OBAT */}
      {isEtiketModalOpen && selectedQueue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200 print:hidden overflow-y-auto">
          <div className="relative w-full max-w-xl bg-card rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col my-8">
            {/* Top Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-900 text-white">
              <div>
                <h2 className="font-bold text-base">Pratinjau Etiket Aturan Pakai Obat</h2>
                <p className="text-xs text-slate-300">
                  {selectedQueue.patientName} • {selectedQueue.items.length} Resep Obat
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Cetak Etiket
                </Button>
                <button
                  onClick={() => setIsEtiketModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Scrollable White Etiket Stickers */}
            <div className="p-6 bg-slate-900/60 dark:bg-black/60 overflow-y-auto max-h-[70vh] space-y-6">
              {selectedQueue.items.map((item, index) => (
                <div
                  key={index}
                  className="preserve-light border-2 border-slate-900 p-5 rounded-xl max-w-md mx-auto text-xs bg-white text-slate-900 shadow-xl space-y-3"
                >
                  {/* Kop Surat Klinik */}
                  <div className="text-center border-b-2 border-slate-900 pb-2">
                    <h2 className="font-black text-sm uppercase tracking-wide text-slate-900">
                      KLINIK PRAKTEK DOKTER UMUM
                    </h2>
                    <p className="text-[10px] text-slate-600">
                      Layanan Resep &amp; Farmasi Pasien
                    </p>
                    <div className="mt-1">
                      <span
                        style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                        className="px-3 py-0.5 bg-white text-black border border-slate-900 font-mono font-bold text-[10px] rounded uppercase tracking-wider inline-block"
                      >
                        ETIKET ATURAN PAKAI OBAT
                      </span>
                    </div>
                  </div>

                  {/* Patient Identity */}
                  <div className="space-y-1 border-b border-slate-300 pb-2 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">No. RM / Antrean:</span>
                      <span className="font-mono font-bold text-slate-950">{selectedQueue.patient.noRM || `RM-${selectedQueue.patient.id}`} ({selectedQueue.code})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Nama Pasien:</span>
                      <span className="font-bold text-sm text-slate-950">{selectedQueue.patientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Dokter / Poli:</span>
                      <span className="font-medium text-slate-900">{selectedQueue.doctorName} ({selectedQueue.polyclinic})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Tanggal:</span>
                      <span className="text-slate-900">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Medicine & Dosage */}
                  <div className="space-y-2 text-center">
                    <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-300">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">KEGUNAAN OBAT &amp; JUMLAH:</span>
                      <h3 className="font-black text-lg text-slate-900 leading-tight mt-0.5">
                        {getMedicineKegunaan(item.name, item.notes)}
                      </h3>
                      <span className="font-mono font-bold text-xs text-slate-700 block mt-1">
                        JUMLAH: {item.qty} ({item.quantity || 1} Pcs)
                      </span>
                    </div>

                    <div className="bg-emerald-50 border-2 border-emerald-600 p-3 rounded-lg text-emerald-950">
                      <span className="text-[10px] font-black uppercase tracking-wider block text-emerald-800">
                        ATURAN MINUM / DOSIS:
                      </span>
                      <p className="font-black text-base text-emerald-900 mt-0.5">
                        {item.dosage}
                      </p>
                      {item.notes && (
                        <p className="text-[10px] text-emerald-800 font-bold mt-1 italic">
                          Catatan: {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-300 text-[9px] text-center text-slate-500 italic font-medium">
                    Semoga Lekas Sembuh • Simpan Obat di Tempat Sejuk &amp; Kering
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY MEDICINE LABELS (ETIKET OBAT PER ITEM PASIEN) */}
      {selectedQueue && (
        <div id="etiket-print-area" className="hidden print:block font-sans text-slate-900 p-2 preserve-light">
          {selectedQueue.items.map((item, index) => (
            <div
              key={index}
              className="preserve-light border-2 border-slate-900 p-4 mb-6 rounded-xl max-w-sm mx-auto page-break-inside-avoid text-xs bg-white shadow-none"
            >
              {/* Kop Surat Klinik */}
              <div className="text-center border-b-2 border-slate-900 pb-2 mb-3">
                <h2 className="font-black text-sm uppercase tracking-wide text-slate-900">
                  KLINIK PRAKTEK DOKTER UMUM
                </h2>
                <p className="text-[10px] text-slate-600">
                  Layanan Resep &amp; Farmasi Pasien
                </p>
                <div className="mt-1">
                  <span
                    style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                    className="px-3 py-0.5 bg-white text-black border border-slate-900 font-mono font-bold text-[10px] rounded uppercase tracking-wider inline-block"
                  >
                    ETIKET ATURAN PAKAI OBAT
                  </span>
                </div>
              </div>

              {/* Patient Identity */}
              <div className="space-y-1 border-b border-slate-300 pb-2.5 mb-2.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">No. RM / Antrean:</span>
                  <span className="font-mono font-bold">{selectedQueue.patient.noRM || `RM-${selectedQueue.patient.id}`} ({selectedQueue.code})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Nama Pasien:</span>
                  <span className="font-bold text-sm">{selectedQueue.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Dokter / Poli:</span>
                  <span className="font-medium">{selectedQueue.doctorName} ({selectedQueue.polyclinic})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tanggal:</span>
                  <span>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Medicine Details & Dosage Instruction */}
              <div className="space-y-2 py-1 text-center">
                <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-300">
                  <span className="text-[10px] text-slate-500 font-semibold block uppercase">KEGUNAAN OBAT &amp; JUMLAH:</span>
                  <h3 className="font-black text-lg text-slate-900 leading-tight mt-0.5">
                    {getMedicineKegunaan(item.name, item.notes)}
                  </h3>
                  <span className="font-mono font-bold text-xs text-slate-700 block mt-1">
                    JUMLAH: {item.qty} ({item.quantity || 1} Pcs)
                  </span>
                </div>

                {/* Highlighted Dosage Instruction */}
                <div className="bg-emerald-50 border-2 border-emerald-600 p-3 rounded-lg text-emerald-950">
                  <span className="text-[10px] font-black uppercase tracking-wider block text-emerald-800">
                    ATURAN MINUM / DOSIS:
                  </span>
                  <p className="font-black text-base text-emerald-900 mt-0.5">
                    {item.dosage}
                  </p>
                  {item.notes && (
                    <p className="text-[10px] text-emerald-800 font-bold mt-1 italic">
                      Catatan: {item.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-300 text-[9px] text-center text-slate-500 italic font-medium">
                Semoga Lekas Sembuh • Simpan Obat di Tempat Sejuk &amp; Kering
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
