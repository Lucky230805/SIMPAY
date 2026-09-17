'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Printer,
  UserCheck,
  ShieldAlert,
  Loader2,
  Banknote,
  QrCode,
  ArrowRight,
  FileText,
  Search,
  Check,
  Calendar,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getOrCreateBillingForVisit,
  processPayment,
  BillingDetail,
  BillingQueueItem,
} from '@/app/pembayaran/actions'

interface PembayaranViewProps {
  initialQueues: BillingQueueItem[]
  selectedQueueIdFromUrl?: number | null
  currentUserRole?: 'PERAWAT' | 'DOKTER'
  currentUserName?: string
}

export function PembayaranView({
  initialQueues,
  selectedQueueIdFromUrl,
  currentUserRole = 'PERAWAT',
  currentUserName,
}: PembayaranViewProps) {
  const router = useRouter()
  const [queues, setQueues] = useState<BillingQueueItem[]>(initialQueues)
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(
    selectedQueueIdFromUrl || (initialQueues.length > 0 ? initialQueues[0].queueId : null)
  )

  // Session role source of truth
  const activeRole = currentUserRole

  // Billing detail loaded from server action
  const [billing, setBilling] = useState<BillingDetail | null>(null)
  const [isLoadingBilling, setIsLoadingBilling] = useState<boolean>(false)
  const [billingError, setBillingError] = useState<string | null>(null)

  // Payment form states
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'QRIS' | 'TRANSFER'>('TUNAI')
  const [amountPaidInput, setAmountPaidInput] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Feedback states
  const [actionError, setActionError] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | 'BELUM_LUNAS' | 'LUNAS'>('SEMUA')
  const [dateRangeFilter, setDateRangeFilter] = useState<'TODAY' | 'ALL'>('TODAY')

  // Load billing when selected queue ID changes
  useEffect(() => {
    if (!selectedQueueId) {
      setBilling(null)
      return
    }

    let isMounted = true
    setIsLoadingBilling(true)
    setBillingError(null)
    setActionError(null)
    setPaymentSuccess(null)

    getOrCreateBillingForVisit(selectedQueueId)
      .then((res) => {
        if (!isMounted) return
        if (res.success && res.billing) {
          setBilling(res.billing)
          // Set default cash input to total amount
          setAmountPaidInput(res.billing.totalAmount.toString())
        } else {
          setBillingError(res.error || 'Gagal mengambil rincian tagihan')
          setBilling(null)
        }
      })
      .catch((err) => {
        if (!isMounted) return
        setBillingError(err.message || 'Terjadi kesalahan sistem saat memuat tagihan')
        setBilling(null)
      })
      .finally(() => {
        if (isMounted) setIsLoadingBilling(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedQueueId])

  // Helper to compare dates
  const isSameDay = (d1: Date | string, d2: Date) => {
    const date1 = new Date(d1)
    return (
      date1.getFullYear() === d2.getFullYear() &&
      date1.getMonth() === d2.getMonth() &&
      date1.getDate() === d2.getDate()
    )
  }

  // Filter queues by date, search & status
  const filteredQueues = queues.filter((q) => {
    const matchesDate =
      dateRangeFilter === 'ALL' || isSameDay(q.visitDate, new Date())

    const matchesSearch =
      q.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.patientNoRM.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `antrean-${q.queueNumber}`.includes(searchTerm.toLowerCase())

    if (!matchesDate) return false

    if (statusFilter === 'SEMUA') return matchesSearch
    if (statusFilter === 'BELUM_LUNAS')
      return matchesSearch && (q.billingStatus === 'BELUM_LUNAS' || q.billingStatus === 'BELUM_DITAGIH')
    if (statusFilter === 'LUNAS') return matchesSearch && q.billingStatus === 'LUNAS'
    return matchesSearch
  })

  // Selected visit item
  const selectedQueue = queues.find((q) => q.queueId === selectedQueueId) || null

  // Calculate cash change
  const numericAmountPaid = Number(amountPaidInput) || 0
  const totalAmount = billing?.totalAmount || 0
  const cashChange = paymentMethod === 'TUNAI' ? Math.max(0, numericAmountPaid - totalAmount) : 0
  const isCashInsufficient = paymentMethod === 'TUNAI' && numericAmountPaid < totalAmount

  // Handle Payment Submit
  const handleProcessPayment = async () => {
    if (!billing) return
    if (activeRole === 'DOKTER') {
      setActionError('Akses Ditolak: Dokter tidak berhak memproses pembayaran kasir.')
      return
    }

    if (billing.status === 'LUNAS') {
      setActionError('Tagihan ini sudah dilunasi sebelumnya.')
      return
    }

    if (isCashInsufficient) {
      setActionError('Uang tunai yang dibayarkan kurang dari total tagihan.')
      return
    }

    setIsSubmitting(true)
    setActionError(null)

    try {
      const payloadAmount = paymentMethod === 'TUNAI' ? numericAmountPaid : billing.totalAmount

      const res = await processPayment({
        billingId: billing.id,
        paymentMethod,
        amountPaid: payloadAmount,
        userRole: activeRole,
      })

      if (res.success && res.payment) {
        setPaymentSuccess(res.payment)
        // Refresh billing details locally
        const updatedBillingRes = await getOrCreateBillingForVisit(billing.queueId || selectedQueueId!)
        if (updatedBillingRes.success && updatedBillingRes.billing) {
          setBilling(updatedBillingRes.billing)
        }
        // Update list status locally
        setQueues((prev) =>
          prev.map((q) =>
            q.queueId === selectedQueueId
              ? { ...q, billingStatus: 'LUNAS', totalAmount: billing.totalAmount }
              : q
          )
        )
        router.refresh()
      } else {
        setActionError(res.error || 'Gagal memproses pembayaran')
      }
    } catch (err: any) {
      setActionError(err.message || 'Terjadi kesalahan sistem saat memproses transaksi')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-7xl mx-auto text-xs">
      {/* SCREEN-ONLY APPLICATION UI */}
      <div className="space-y-6 print:hidden">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-primary" />
              Kasir & Pembayaran Pasien
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pelayanan kasir dan penerimaan pembayaran kunjungan pasien (Perawat).
            </p>
          </div>

          {/* User Session Role Badge */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
            <span className="text-[11px] font-semibold text-muted-foreground">Peran Pengguna:</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded font-bold text-[10px] uppercase border',
                activeRole === 'PERAWAT'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              )}
            >
              {activeRole}
            </span>
          </div>
        </div>

        {/* Role Warning Banner if Dokter */}
        {activeRole === 'DOKTER' && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 shadow-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Peringatan Hak Akses</h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Anda sedang melihat antarmuka dengan peran <span className="font-bold">DOKTER</span>.
                Dokter tidak diperkenankan memproses pembayaran kasir. Pengajuan transaksi akan ditolak oleh server.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid: Left Visit Selector & Right Billing Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Patient Visit List (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-border rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-foreground">Daftar Antrean & Tagihan</h3>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {filteredQueues.length} Kunjungan
                </span>
              </div>
              {/* Date Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-[10px]">
                <button
                  onClick={() => setDateRangeFilter('TODAY')}
                  className={cn(
                    'flex-1 py-1 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1',
                    dateRangeFilter === 'TODAY'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Calendar className="w-3 h-3 text-emerald-600" /> Hari Ini
                </button>
                <button
                  onClick={() => setDateRangeFilter('ALL')}
                  className={cn(
                    'flex-1 py-1 px-2 rounded-md font-bold transition-all flex items-center justify-center gap-1',
                    dateRangeFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <Clock className="w-3 h-3 text-blue-600" /> Semua Riwayat
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Cari pasien / No. RM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('SEMUA')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-bold text-[10px] border transition-colors',
                    statusFilter === 'SEMUA'
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter('BELUM_LUNAS')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-bold text-[10px] border transition-colors',
                    statusFilter === 'BELUM_LUNAS'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                  )}
                >
                  Belum Lunas
                </button>
                <button
                  onClick={() => setStatusFilter('LUNAS')}
                  className={cn(
                    'px-2.5 py-1 rounded-md font-bold text-[10px] border transition-colors',
                    statusFilter === 'LUNAS'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                  )}
                >
                  Lunas
                </button>
              </div>
            </div>

            {/* Queue List */}
            <div className="space-y-2.5 max-h-[650px] overflow-y-auto p-1 pr-1.5">
              {filteredQueues.length === 0 ? (
                <div className="bg-white border rounded-xl p-8 text-center text-muted-foreground shadow-sm">
                  Tidak ada data antrean/tagihan ditemukan.
                </div>
              ) : (
                filteredQueues.map((item) => {
                  const isSelected = selectedQueueId === item.queueId
                  const isLunas = item.billingStatus === 'LUNAS'

                  return (
                    <div
                      key={item.queueId}
                      onClick={() => setSelectedQueueId(item.queueId)}
                      className={cn(
                        'bg-white rounded-xl p-4 transition-all cursor-pointer flex items-center justify-between gap-3',
                        isSelected ? 'border-2 border-slate-900 shadow-md' : 'border border-border hover:border-slate-300',
                        isLunas ? 'bg-slate-50/50' : ''
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                            Antrean #{item.queueNumber}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {item.patientNoRM}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-foreground leading-tight">
                          {item.patientName}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {item.polyclinic} • {item.doctorName}
                        </p>
                      </div>

                      <div className="text-right space-y-1 shrink-0">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded font-bold text-[10px] border',
                            isLunas
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                          )}
                        >
                          {isLunas ? '✓ LUNAS' : 'BELUM LUNAS'}
                        </span>
                        {item.totalAmount > 0 && (
                          <p className="font-bold text-xs text-foreground font-mono">
                            Rp {item.totalAmount.toLocaleString('id-ID')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Billing Details & Payment Form (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {!selectedQueueId ? (
              <div className="bg-white border rounded-xl p-12 text-center text-muted-foreground shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[350px]">
                <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="font-bold text-base text-foreground">Pilih Kunjungan Pasien</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Pilih salah satu kunjungan dari daftar di sebelah kiri untuk melihat rincian tagihan dan memproses pembayaran.
                </p>
              </div>
            ) : isLoadingBilling ? (
              <div className="bg-white border rounded-xl p-12 text-center shadow-sm flex flex-col items-center justify-center space-y-3 min-h-[350px]">
                <Loader2 className="w-8 h-8 text-slate-800 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Memuat data rincian tagihan database...</p>
              </div>
            ) : billingError ? (
              <div className="bg-white border rounded-xl p-8 text-center shadow-sm space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <h3 className="font-bold text-base text-rose-700">Gagal Memuat Tagihan</h3>
                <p className="text-xs text-muted-foreground">{billingError}</p>
                <button
                  onClick={() => setSelectedQueueId(selectedQueueId)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-slate-900"
                >
                  Coba Lagi
                </button>
              </div>
            ) : billing ? (
              <div className="space-y-6">
                {/* Visit Information Header Card */}
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        RINCIAN KUNJUNGAN PASIEN
                      </span>
                      <h2 className="text-lg font-bold text-foreground mt-0.5">
                        {billing.patientName}
                      </h2>
                    </div>
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full font-bold text-xs border flex items-center gap-1.5',
                        billing.status === 'LUNAS'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}
                    >
                      {billing.status === 'LUNAS' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Tagihan Lunas
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Belum Lunas
                        </>
                      )}
                    </span>
                  </div>

                  {/* Patient / Visit Meta */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">No. RM:</span>
                      <span className="font-bold font-mono">{billing.patientNoRM}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Dokter Pemeriksa:</span>
                      <span className="font-semibold">{billing.doctorName || 'dr. Raniisyana R.R.'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Poliklinik:</span>
                      <span className="font-semibold">{billing.polyclinic || 'Poli Umum'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Status Resep / Obat:</span>
                      <span className="font-bold">
                        {billing.items.filter((i) => !i.name.includes('Konsultasi') && !i.name.includes('Pendaftaran') && !i.name.startsWith('Tindakan') && !i.name.includes('Injeksi')).length === 0 ? (
                          <span className="text-gray-500">Tidak Ada Resep</span>
                        ) : (
                          <span className="text-slate-700">Ada Resep Obat</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Tanggal Kunjungan:</span>
                      <span className="font-semibold">
                        {new Date(billing.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itemized Billing Breakdown Table */}
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="font-bold text-sm border-b pb-2 text-foreground">Rincian Tagihan Layanan & Obat</h3>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="py-2">Item Layanan / Obat</th>
                        <th className="py-2 text-center w-16">Qty</th>
                        <th className="py-2 text-right w-24">Harga Satuan</th>
                        <th className="py-2 text-right w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {billing.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-medium text-foreground">{item.name}</td>
                          <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                          <td className="py-2.5 text-right font-mono text-muted-foreground">
                            Rp {item.unitPrice.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-foreground">
                            Rp {item.totalPrice.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={3} className="py-3 text-right font-bold text-sm text-foreground">
                          Total Tagihan:
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-base text-emerald-700">
                          Rp {billing.totalAmount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Action Error Banner */}
                {actionError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3 text-xs shadow-sm">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold">Gagal Memproses Pembayaran</h5>
                      <p className="mt-0.5">{actionError}</p>
                    </div>
                  </div>
                )}

                {/* Payment Success Receipt Card */}
                {paymentSuccess || billing.status === 'LUNAS' ? (
                  <div className="bg-white border border-emerald-300 rounded-xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                        <div>
                          <h3 className="font-bold text-base text-emerald-900">Pembayaran Berhasil</h3>
                          <p className="text-[11px] text-emerald-700">
                            Nomor Kuitansi: <span className="font-mono font-bold">{billing.payment?.paymentNumber || paymentSuccess?.paymentNumber}</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <Printer className="w-4 h-4" /> Cetak Struk Kuitansi
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-emerald-50/50 p-4 rounded-lg border border-emerald-100">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Metode Pembayaran:</span>
                        <span className="font-bold text-foreground">
                          {billing.payment?.paymentMethod || paymentSuccess?.paymentMethod || 'TUNAI'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Kasir / Perawat:</span>
                        <span className="font-semibold text-foreground">
                          {billing.payment?.processedByName || paymentSuccess?.processedBy?.name || currentUserName || 'Petugas Kasir'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Jumlah Dibayarkan:</span>
                        <span className="font-bold font-mono text-foreground">
                          Rp {(billing.payment?.amountPaid || paymentSuccess?.amountPaid || billing.totalAmount).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Kembalian:</span>
                        <span className="font-bold font-mono text-emerald-700">
                          Rp {(billing.payment?.changeAmount || paymentSuccess?.changeAmount || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground italic text-center pt-1">
                      * Catatan: Pembayaran telah dicatat secara sah di database. Status obat/resep dapat diserahkan terpisah oleh Perawat di menu Resep & Obat.
                    </p>
                  </div>
                ) : (
                  /* Payment Processing Input Form */
                  <div className="bg-white border border-border rounded-xl p-5 shadow-sm space-y-5">
                    <h3 className="font-bold text-sm border-b pb-2 text-foreground flex items-center justify-between">
                      <span>Formulir Pembayaran Kasir</span>
                      <span className="text-[11px] font-normal text-muted-foreground">Diproses oleh Perawat</span>
                    </h3>

                    {/* Payment Method Selector */}
                    <div className="space-y-2">
                      <label className="font-bold text-xs text-foreground block">Pilih Metode Pembayaran:</label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('TUNAI')
                            setAmountPaidInput(billing.totalAmount.toString())
                          }}
                          className={cn(
                            'p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all',
                            paymentMethod === 'TUNAI'
                              ? 'border-slate-800 bg-slate-900 text-white font-bold shadow-sm'
                              : 'border-gray-200 bg-white text-slate-700 hover:bg-gray-50'
                          )}
                        >
                          <Banknote className="w-5 h-5" />
                          <span className="text-xs">TUNAI</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('QRIS')
                            setAmountPaidInput(billing.totalAmount.toString())
                          }}
                          className={cn(
                            'p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all',
                            paymentMethod === 'QRIS'
                              ? 'border-slate-800 bg-slate-900 text-white font-bold shadow-sm'
                              : 'border-gray-200 bg-white text-slate-700 hover:bg-gray-50'
                          )}
                        >
                          <QrCode className="w-5 h-5" />
                          <span className="text-xs">QRIS</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod('TRANSFER')
                            setAmountPaidInput(billing.totalAmount.toString())
                          }}
                          className={cn(
                            'p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all',
                            paymentMethod === 'TRANSFER'
                              ? 'border-slate-800 bg-slate-900 text-white font-bold shadow-sm'
                              : 'border-gray-200 bg-white text-slate-700 hover:bg-gray-50'
                          )}
                        >
                          <CreditCard className="w-5 h-5" />
                          <span className="text-xs">TRANSFER</span>
                        </button>
                      </div>
                    </div>

                    {/* Method Specific Inputs */}
                    {paymentMethod === 'TUNAI' ? (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="font-bold text-xs text-foreground">Nominal Uang Tunai Diterima:</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setAmountPaidInput(billing.totalAmount.toString())}
                              className="px-2 py-0.5 bg-white border rounded text-[10px] font-semibold hover:bg-gray-100"
                            >
                              Pas (Rp {billing.totalAmount.toLocaleString('id-ID')})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const roundedUp = Math.ceil(billing.totalAmount / 50000) * 50000
                                setAmountPaidInput(roundedUp.toString())
                              }}
                              className="px-2 py-0.5 bg-white border rounded text-[10px] font-semibold hover:bg-gray-100"
                            >
                              Pecahan Terdekat
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <span className="absolute left-3 top-2.5 font-bold text-muted-foreground text-xs">Rp</span>
                          <input
                            type="number"
                            value={amountPaidInput}
                            onChange={(e) => setAmountPaidInput(e.target.value)}
                            placeholder="Masukkan jumlah uang"
                            className={cn(
                              'w-full pl-9 pr-3 py-2 bg-white border rounded-lg font-mono font-bold text-sm focus:outline-none focus:ring-2',
                              isCashInsufficient
                                ? 'border-rose-400 focus:ring-rose-400 text-rose-700'
                                : 'border-border focus:ring-slate-800 text-foreground'
                            )}
                          />
                        </div>

                        {/* Realtime Cash Change Calculation */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                          <span className="text-muted-foreground font-semibold">Uang Kembalian:</span>
                          <span
                            className={cn(
                              'font-mono font-bold text-sm',
                              isCashInsufficient ? 'text-rose-600' : 'text-emerald-700'
                            )}
                          >
                            {isCashInsufficient
                              ? 'Uang Tunai Kurang'
                              : `Rp ${cashChange.toLocaleString('id-ID')}`}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Total Tagihan Nontunai ({paymentMethod}):</span>
                          <span className="font-mono font-bold text-sm text-foreground">
                            Rp {billing.totalAmount.toLocaleString('id-ID')}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Pastikan pembayaran via {paymentMethod} telah berhasil diterima pada mesin EDC / merchant QRIS klinik sebelum mengonfirmasi.
                        </p>
                      </div>
                    )}

                    {/* Submission Button */}
                    <button
                      type="button"
                      disabled={isSubmitting || activeRole === 'DOKTER' || isCashInsufficient}
                      onClick={handleProcessPayment}
                      className={cn(
                        'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm',
                        activeRole === 'DOKTER' || isCashInsufficient
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.99]'
                      )}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Memproses Pembayaran...
                        </>
                      ) : (
                        <>
                          Konfirmasi Pembayaran ({paymentMethod}) <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {/* END OF SCREEN-ONLY APPLICATION UI */}

      {/* PRINT-ONLY CLINIC RECEIPT (STRUK KUITANSI PEMBAYARAN KLINIK) */}
      {billing && (
        <div id="receipt-print-area" className="hidden print:block font-mono text-black bg-white p-6 max-w-md mx-auto">
          {/* Header Klinik */}
          <div style={{ textAlign: 'center', paddingBottom: '8px', borderBottom: '1px dashed #64748b' }}>
            <h1 style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase', margin: 0 }}>
              KLINIK PRAKTEK DOKTER UMUM
            </h1>
            <p style={{ fontSize: '9px', color: '#64748b', margin: '2px 0 0 0' }}>
              Perumahan Permata Hijau 2, Blok A59, Cinangsi, Kec. Cibogo, Kabupaten Subang, Jawa Barat
            </p>
          </div>

          {/* Struk Title */}
          <div style={{ textAlign: 'center', padding: '6px 0', borderBottom: '1px dashed #64748b' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
              BUKTI PEMBAYARAN
            </span>
          </div>

          {/* Transaction & Patient Info */}
          <div style={{ padding: '8px 0', fontSize: '11px', lineHeight: '1.5', borderBottom: '1px dashed #64748b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>No. Kuitansi:</span>
              <strong style={{ fontFamily: 'monospace' }}>
                {billing.payment?.paymentNumber || paymentSuccess?.paymentNumber || `INV-${billing.id}`}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tanggal / Waktu:</span>
              <span>
                {new Date(billing.payment?.paymentDate || billing.createdAt || new Date()).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>No. Rekam Medis:</span>
              <strong>{billing.patientNoRM}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Nama Pasien:</span>
              <strong>{billing.patientName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Dokter Pemeriksa:</span>
              <span>{billing.doctorName || 'dr. Raniisyana R.R.'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Poliklinik:</span>
              <span>{billing.polyclinic || 'Poli Umum'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Petugas / Perawat:</span>
              <span>{billing.payment?.processedByName || paymentSuccess?.processedBy?.name || currentUserName || 'Suster Nisa (Perawat)'}</span>
            </div>
          </div>

          {/* Items & Fees Breakdown */}
          <div style={{ padding: '8px 0', borderBottom: '1px dashed #64748b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10px', paddingBottom: '4px', borderBottom: '1px solid #cbd5e1', marginBottom: '6px' }}>
              <span>LAYANAN / OBAT</span>
              <span>SUBTOTAL</span>
            </div>
            <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
              {billing.registrationFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Biaya Pendaftaran</span>
                  <span>Rp {billing.registrationFee.toLocaleString('id-ID')}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Jasa Konsultasi Dokter</span>
                <span>Rp {billing.consultationFee.toLocaleString('id-ID')}</span>
              </div>

              {billing.items && billing.items.length > 0 ? (
                <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dotted #e2e8f0' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#334155' }}>Resep & Obat-obatan:</div>
                  {billing.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px' }}>
                      <span>
                        - {item.name} ({item.quantity}x @ Rp {item.unitPrice.toLocaleString('id-ID')})
                      </span>
                      <span>Rp {item.totalPrice.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              ) : billing.medicineFee > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Biaya Obat-obatan</span>
                  <span>Rp {billing.medicineFee.toLocaleString('id-ID')}</span>
                </div>
              ) : null}

              {billing.otherFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Biaya Lainnya</span>
                  <span>Rp {billing.otherFee.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div style={{ padding: '8px 0', fontSize: '11px', lineHeight: '1.6', borderBottom: '1px dashed #64748b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', paddingTop: '2px' }}>
              <span>TOTAL TAGIHAN:</span>
              <span>Rp {billing.totalAmount.toLocaleString('id-ID')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span>Metode Pembayaran:</span>
              <strong>{billing.payment?.paymentMethod || paymentSuccess?.paymentMethod || paymentMethod}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Uang Dibayarkan:</span>
              <span>Rp {(billing.payment?.amountPaid || paymentSuccess?.amountPaid || (amountPaidInput ? Number(amountPaidInput) : billing.totalAmount)).toLocaleString('id-ID')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Kembalian:</span>
              <span>Rp {(billing.payment?.changeAmount || paymentSuccess?.changeAmount || 0).toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Footer & Status Stamp */}
          <div style={{ textAlign: 'center', paddingTop: '12px' }}>
            <div style={{ display: 'inline-block', padding: '3px 12px', border: '2px solid #047857', color: '#047857', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px', borderRadius: '4px', marginBottom: '8px' }}>
              *** LUNAS ***
            </div>
            <p style={{ fontSize: '10px', color: '#475569', fontStyle: 'italic', margin: 0 }}>
              Terima kasih atas kunjungan Anda.<br />Semoga lekas sembuh!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

