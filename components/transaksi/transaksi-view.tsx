'use client'

import React, { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import {
  ReceiptText,
  FileText,
  Truck,
  Building2,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Percent,
  Calculator,
  Eye,
  Trash2,
  Edit,
  Download,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SupplierItem,
  PurchaseOrderRecord,
  PurchaseInvoiceRecord,
  createSupplier,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  createPurchaseInvoice,
  updatePurchaseInvoicePaymentStatus,
} from '@/app/transaksi/actions'
import { MedicineItem } from '@/app/obat/actions'
import { cn } from '@/lib/utils'

interface TransaksiViewProps {
  initialSuppliers: SupplierItem[]
  initialPurchaseOrders: PurchaseOrderRecord[]
  initialInvoices: PurchaseInvoiceRecord[]
  medicines: MedicineItem[]
  userRole: 'DOKTER' | 'PERAWAT'
  initialTab?: string
}

export function TransaksiView({
  initialSuppliers,
  initialPurchaseOrders,
  initialInvoices,
  medicines,
  userRole,
  initialTab = 'faktur',
}: TransaksiViewProps) {
  const [activeTab, setActiveTab] = useState<'faktur' | 'mutasi_faktur' | 'po' | 'mutasi_po' | 'supplier'>(
    (initialTab as any) || 'faktur'
  )

  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>(initialPurchaseOrders)
  const [invoices, setInvoices] = useState<PurchaseInvoiceRecord[]>(initialInvoices)

  const [isPending, startTransition] = useTransition()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isNurse = userRole === 'PERAWAT'

  /* =========================================================
     STATE: FORM FAKTUR PEMBELIAN
     ========================================================= */
  const [fakNoFakturSupplier, setFakNoFakturSupplier] = useState('')
  const [fakSupplierId, setFakSupplierId] = useState<string>(suppliers[0]?.id?.toString() || '')
  const [fakTglTransaksi, setFakTglTransaksi] = useState(new Date().toISOString().slice(0, 10))
  const [fakLokasiFaskes, setFakLokasiFaskes] = useState('Klinik Praktek Dokter Umum')
  const [fakMetodeBayar, setFakMetodeBayar] = useState<'KREDIT' | 'TUNAI' | 'TRANSFER'>('KREDIT')
  const [fakTempoKredit, setFakTempoKredit] = useState<'D7' | 'D21' | 'D30'>('D30')
  const [fakJatuhTempo, setFakJatuhTempo] = useState('')
  const [fakStatusFaktur, setFakStatusFaktur] = useState<'PROSES' | 'TUNDA' | 'SELESAI'>('PROSES')
  const [fakNoFakturPajak, setFakNoFakturPajak] = useState('')
  const [fakNotes, setFakNotes] = useState('')
  const [fakLinkedPoId, setFakLinkedPoId] = useState<string>('')
  const [fakDiskonTambahan, setFakDiskonTambahan] = useState<string>('0')
  const [fakTaxRate, setFakTaxRate] = useState<number>(11)
  const [fakExpectedPhysicalTotal, setFakExpectedPhysicalTotal] = useState<string>('')

  // Rows of items on invoice
  interface InvoiceRowItem {
    id: string
    medicineId: number
    medicineName: string
    batchNumber: string
    expiryDate: string
    quantity: number
    bonusQuantity: number
    unit: string
    hnaPrice: number
    discountPercent: number
    isTaxable: boolean
  }

  const [fakItems, setFakItems] = useState<InvoiceRowItem[]>([
    {
      id: 'row-1',
      medicineId: medicines[0]?.id || 0,
      medicineName: medicines[0]?.name || '',
      batchNumber: `BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      quantity: 100,
      bonusQuantity: 0,
      unit: medicines[0]?.unit || 'Tablet',
      hnaPrice: medicines[0]?.purchasePrice || 800,
      discountPercent: 0,
      isTaxable: true,
    },
  ])

  // Batch & ED Modal helper
  const [batchModalRowId, setBatchModalRowId] = useState<string | null>(null)
  const [tempBatchNumber, setTempBatchNumber] = useState('')
  const [tempExpiryDate, setTempExpiryDate] = useState('')

  // Auto calculate Due Date based on Transaction Date + Payment Term
  useEffect(() => {
    if (fakMetodeBayar === 'KREDIT' && fakTglTransaksi) {
      const dt = new Date(fakTglTransaksi)
      if (!isNaN(dt.getTime())) {
        const days = fakTempoKredit === 'D7' ? 7 : fakTempoKredit === 'D21' ? 21 : 30
        dt.setDate(dt.getDate() + days)
        setFakJatuhTempo(dt.toISOString().slice(0, 10))
      }
    } else {
      setFakJatuhTempo(fakTglTransaksi)
    }
  }, [fakMetodeBayar, fakTempoKredit, fakTglTransaksi])

  // Check if chosen supplier is PKP
  const selectedSupplierObj = suppliers.find((s) => s.id === Number(fakSupplierId))

  /* =========================================================
     CALCULATIONS: FAKTUR PEMBELIAN
     ========================================================= */
  const calculateRow = (row: InvoiceRowItem) => {
    const qty = Number(row.quantity) || 0
    const bonus = Number(row.bonusQuantity) || 0
    const hna = Number(row.hnaPrice) || 0
    const discPct = Number(row.discountPercent) || 0
    const isTax = row.isTaxable

    const lineGross = qty * hna
    const lineDisc = (lineGross * discPct) / 100
    const lineNetBeforeTax = lineGross - lineDisc

    const hnaWithTax = isTax ? hna * (1 + fakTaxRate / 100) : hna
    const discWithTax = isTax ? lineDisc * (1 + fakTaxRate / 100) : lineDisc
    const totalUnits = qty + bonus
    const netPerUnit = totalUnits > 0 ? (lineNetBeforeTax * (isTax ? 1 + fakTaxRate / 100 : 1)) / totalUnits : hna

    return {
      lineGross,
      lineDisc,
      lineNetBeforeTax,
      hnaWithTax,
      discWithTax,
      netPerUnit,
    }
  }

  let totalQtySum = 0
  let totalBonusSum = 0
  let subtotalBeforeDiscSum = 0
  let totalItemDiscSum = 0
  let dppSum = 0

  fakItems.forEach((row) => {
    const calc = calculateRow(row)
    totalQtySum += Number(row.quantity) || 0
    totalBonusSum += Number(row.bonusQuantity) || 0
    subtotalBeforeDiscSum += calc.lineGross
    totalItemDiscSum += calc.lineDisc
    dppSum += calc.lineNetBeforeTax
  })

  const additionalDiscountNum = parseFloat(fakDiskonTambahan) || 0
  const finalDpp = Math.max(0, dppSum - additionalDiscountNum)
  const totalTaxAmount = Math.round(((finalDpp * fakTaxRate) / 100) * 100) / 100
  const grandTotalAmount = Math.round((finalDpp + totalTaxAmount) * 100) / 100

  // Matching check with physical invoice
  const expectedPhysicalNum = parseFloat(fakExpectedPhysicalTotal) || 0
  const hasExpected = expectedPhysicalNum > 0
  const isMatched = hasExpected ? Math.abs(expectedPhysicalNum - grandTotalAmount) < 1 : true
  const matchDifference = expectedPhysicalNum - grandTotalAmount

  // Handle Add Row Item
  const handleAddFakRow = () => {
    const firstMed = medicines[0]
    setFakItems([
      ...fakItems,
      {
        id: `row-${Date.now()}`,
        medicineId: firstMed?.id || 0,
        medicineName: firstMed?.name || '',
        batchNumber: `BAT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(fakItems.length + 1).toString().padStart(2, '0')}`,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        quantity: 50,
        bonusQuantity: 0,
        unit: firstMed?.unit || 'Tablet',
        hnaPrice: firstMed?.purchasePrice || 1000,
        discountPercent: 0,
        isTaxable: true,
      },
    ])
  }

  // Handle Remove Row Item
  const handleRemoveFakRow = (rowId: string) => {
    if (fakItems.length <= 1) {
      setErrorMsg('Faktur harus memiliki minimal 1 item barang')
      return
    }
    setFakItems(fakItems.filter((it) => it.id !== rowId))
  }

  // Open Batch & ED Modal
  const openBatchModal = (row: InvoiceRowItem) => {
    setBatchModalRowId(row.id)
    setTempBatchNumber(row.batchNumber)
    setTempExpiryDate(row.expiryDate)
  }

  // Save Batch & ED Modal
  const saveBatchModal = () => {
    if (!batchModalRowId) return
    setFakItems(
      fakItems.map((r) =>
        r.id === batchModalRowId
          ? { ...r, batchNumber: tempBatchNumber.trim(), expiryDate: tempExpiryDate }
          : r
      )
    )
    setBatchModalRowId(null)
  }

  // Submit Faktur Pembelian
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!fakNoFakturSupplier.trim()) {
      setErrorMsg('Nomor faktur fisik dari supplier wajib diisi')
      return
    }

    if (hasExpected && !isMatched) {
      setErrorMsg(
        `Total hitungan sistem (Rp ${grandTotalAmount.toLocaleString('id-ID')}) belum sama dengan fisik faktur (Rp ${expectedPhysicalNum.toLocaleString('id-ID')}). Selisih: Rp ${Math.abs(matchDifference).toLocaleString('id-ID')}. Periksa kembali HNA, diskon, atau PPN.`
      )
      return
    }

    startTransition(async () => {
      const payloadItems = fakItems.map((it) => {
        const c = calculateRow(it)
        return {
          medicineId: it.medicineId,
          medicineName: it.medicineName,
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          quantity: it.quantity,
          bonusQuantity: it.bonusQuantity,
          unit: it.unit,
          hnaPrice: it.hnaPrice,
          discountPercent: it.discountPercent,
          isTaxable: it.isTaxable,
          hnaWithTax: c.hnaWithTax,
          discountWithTax: c.discWithTax,
          subtotal: c.lineGross,
          netPrice: c.netPerUnit,
        }
      })

      const res = await createPurchaseInvoice({
        supplierInvoiceNumber: fakNoFakturSupplier,
        purchaseOrderId: fakLinkedPoId ? Number(fakLinkedPoId) : null,
        supplierId: Number(fakSupplierId),
        transactionDate: fakTglTransaksi,
        facilityLocation: fakLokasiFaskes,
        paymentMethod: fakMetodeBayar,
        creditTerm: fakMetodeBayar === 'KREDIT' ? fakTempoKredit : null,
        status: fakStatusFaktur,
        taxInvoiceNumber: fakNoFakturPajak,
        notes: fakNotes,
        additionalDiscount: additionalDiscountNum,
        taxRate: fakTaxRate,
        items: payloadItems,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menyimpan faktur pembelian')
      } else {
        setSuccessMsg(
          `Faktur pembelian ${res.invoice?.invoiceNumber} (${fakNoFakturSupplier}) berhasil dimasukkan ke sistem. Stok barang telah disinkronisasi!`
        )
        // Reset form
        setFakNoFakturSupplier('')
        setFakNotes('')
        setFakExpectedPhysicalTotal('')
        window.location.reload()
      }
    })
  }

  /* =========================================================
     STATE: FORM PURCHASE ORDER (PO)
     ========================================================= */
  const [poSupplierId, setPoSupplierId] = useState<string>(suppliers[0]?.id?.toString() || '')
  const [poExpectedDate, setPoExpectedDate] = useState('')
  const [poNotes, setPoNotes] = useState('')
  const [poItems, setPoItems] = useState([
    {
      id: 'po-row-1',
      medicineId: medicines[0]?.id || 0,
      medicineName: medicines[0]?.name || '',
      unit: medicines[0]?.unit || 'Tablet',
      quantity: 100,
      estimatedPrice: medicines[0]?.purchasePrice || 800,
    },
  ])

  const handleAddPoRow = () => {
    const firstMed = medicines[0]
    setPoItems([
      ...poItems,
      {
        id: `po-row-${Date.now()}`,
        medicineId: firstMed?.id || 0,
        medicineName: firstMed?.name || '',
        unit: firstMed?.unit || 'Tablet',
        quantity: 50,
        estimatedPrice: firstMed?.purchasePrice || 1000,
      },
    ])
  }

  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const items = poItems.map((it) => ({
        medicineId: it.medicineId,
        medicineName: it.medicineName,
        unit: it.unit,
        quantity: it.quantity,
        estimatedPrice: it.estimatedPrice,
        subtotal: it.quantity * it.estimatedPrice,
      }))

      const res = await createPurchaseOrder({
        supplierId: Number(poSupplierId),
        expectedDate: poExpectedDate || undefined,
        notes: poNotes,
        items,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal membuat surat pesanan')
      } else {
        setSuccessMsg(`Surat Pesanan Pembelian (${res.purchaseOrder?.orderNumber}) berhasil dibuat!`)
        setActiveTab('mutasi_po')
        window.location.reload()
      }
    })
  }

  /* =========================================================
     STATE: FORM MASTER SUPPLIER (PBF)
     ========================================================= */
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false)
  const [supCode, setSupCode] = useState('')
  const [supName, setSupName] = useState('')
  const [supAddress, setSupAddress] = useState('')
  const [supPhone, setSupPhone] = useState('')
  const [supEmail, setSupEmail] = useState('')
  const [supPic, setSupPic] = useState('')
  const [supLicense, setSupLicense] = useState('')
  const [supIsPkp, setSupIsPkp] = useState(true)
  const [supNpwp, setSupNpwp] = useState('')

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await createSupplier({
        code: supCode,
        name: supName,
        address: supAddress,
        phone: supPhone,
        email: supEmail,
        picName: supPic,
        licenseNumber: supLicense,
        isPkp: supIsPkp,
        npwp: supNpwp,
      })
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menambahkan supplier')
      } else {
        setSuccessMsg(`Supplier ${supName} berhasil didaftarkan!`)
        setIsAddSupplierModalOpen(false)
        window.location.reload()
      }
    })
  }

  // Invoice detail modal state
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState<PurchaseInvoiceRecord | null>(null)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <ReceiptText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                <span>Transaksi Farmasi &amp; Pengadaan</span>
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
                  PBF &amp; Stok Masuk
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pengelolaan pesanan resmi (PO), input fisik faktur pembelian, mutasi audit log, dan master supplier.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/obat"
            className="px-3.5 py-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Katalog Stok Obat</span>
          </Link>
          <Button
            onClick={() => {
              setSupCode(`PBF-${Date.now().toString().slice(-4)}`)
              setSupName('')
              setIsAddSupplierModalOpen(true)
            }}
            variant="outline"
            className="text-xs h-9 border-border bg-card text-foreground font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>+ Supplier PBF</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Tab Navigation Menu */}
      <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-1">
        {[
          { id: 'faktur', label: 'Input Faktur Pembelian', icon: ReceiptText, badge: null },
          { id: 'mutasi_faktur', label: 'Mutasi Pembelian (Faktur)', icon: FileText, badge: invoices.length },
          { id: 'po', label: 'Pesanan Pembelian (PO)', icon: Plus, badge: null },
          { id: 'mutasi_po', label: 'Mutasi Pesanan (PO)', icon: Clock, badge: purchaseOrders.length },
          { id: 'supplier', label: 'Master Supplier (PBF)', icon: Building2, badge: suppliers.length },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                setErrorMsg(null)
                setSuccessMsg(null)
              }}
              className={cn(
                'px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border-b-2',
                isActive
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    isActive ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* =========================================================================
          TAB 1: FORM FAKTUR PEMBELIAN (GOOD RECEIPT & INVOICING)
          ========================================================================= */}
      {activeTab === 'faktur' && (
        <form onSubmit={handleSaveInvoice} className="space-y-6">
          {/* Section A: Header Faktur & Supplier */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">Header &amp; Identitas Faktur Pembelian</h3>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                No. Urut Sistem Otomatis: FAK-YYYYMM-XXXX
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  No. Faktur Fisik Supplier *
                </label>
                <input
                  type="text"
                  required
                  value={fakNoFakturSupplier}
                  onChange={(e) => setFakNoFakturSupplier(e.target.value)}
                  placeholder="mis. AAM-INV-2026/10928"
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono font-bold bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Sesuai yang tertera di kertas fisik</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Supplier (PBF) *
                </label>
                <select
                  required
                  value={fakSupplierId}
                  onChange={(e) => setFakSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-semibold bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name} {s.isPkp ? '(PKP)' : ''}
                    </option>
                  ))}
                </select>
                {selectedSupplierObj && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 block truncate">
                    PIC: {selectedSupplierObj.picName || '-'} | Telp: {selectedSupplierObj.phone || '-'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tanggal Transaksi / Terima *
                </label>
                <input
                  type="date"
                  required
                  value={fakTglTransaksi}
                  onChange={(e) => setFakTglTransaksi(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Lokasi Penerima (Faskes) *
                </label>
                <input
                  type="text"
                  required
                  value={fakLokasiFaskes}
                  onChange={(e) => setFakLokasiFaskes(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Section B: Syarat Pembayaran & Audit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-border/60">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Metode Pembayaran *
                </label>
                <select
                  value={fakMetodeBayar}
                  onChange={(e) => setFakMetodeBayar(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-semibold bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="KREDIT">Kredit / Tempo</option>
                  <option value="TUNAI">Tunai / Cash</option>
                  <option value="TRANSFER">Transfer Bank</option>
                </select>
              </div>

              {fakMetodeBayar === 'KREDIT' ? (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Tempo Kredit (Term of Payment) *
                  </label>
                  <select
                    value={fakTempoKredit}
                    onChange={(e) => setFakTempoKredit(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="D7">D7 (7 Hari setelah barang diterima)</option>
                    <option value="D21">D21 (21 Hari setelah barang diterima)</option>
                    <option value="D30">D30 (30 Hari setelah barang diterima)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Status Bayar
                  </label>
                  <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                    LUNAS Langsung
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Jatuh Tempo (Otomatis)
                </label>
                <input
                  type="date"
                  readOnly
                  value={fakJatuhTempo}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono font-bold bg-muted text-foreground cursor-not-allowed"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  {fakMetodeBayar === 'KREDIT' ? `Terhitung ${fakTempoKredit} dari tgl transaksi` : 'Hari yang sama'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Status Faktur
                </label>
                <select
                  value={fakStatusFaktur}
                  onChange={(e) => setFakStatusFaktur(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-semibold bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="PROSES">PROSES (Stok Masuk)</option>
                  <option value="TUNDA">TUNDA (Menunggu Verifikasi)</option>
                  <option value="SELESAI">SELESAI</option>
                </select>
              </div>
            </div>

            {/* Hubungan PO & Faktur Pajak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Tautkan ke Pesanan Pembelian / PO <span className="font-normal text-muted-foreground text-[10px]">(Opsional)</span>
                </label>
                <select
                  value={fakLinkedPoId}
                  onChange={(e) => setFakLinkedPoId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="">-- Tanpa PO (Faktur Langsung) --</option>
                  {purchaseOrders
                    .filter((po) => po.status !== 'SELESAI' && po.status !== 'DIBATALKAN')
                    .map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.orderNumber} - {po.supplierName} (Est. Rp {po.totalEstimated.toLocaleString('id-ID')})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  No. Faktur Pajak <span className="font-normal text-muted-foreground text-[10px]">(Wajib diisi jika PBF adalah PKP)</span>
                </label>
                <input
                  type="text"
                  value={fakNoFakturPajak}
                  onChange={(e) => setFakNoFakturPajak(e.target.value)}
                  placeholder="mis. 010.002-26.12345678"
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section C: Tabel Inputan Daftar Barang (Obat) */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>Daftar Barang &amp; Detail Satuan Terkecil</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 font-extrabold text-[10px]">
                    {fakItems.length} Item Baris
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Input wajib menggunakan <strong>satuan terkecil (Tablet/Kapsul/Ampul)</strong> agar saat dokter meresepkan dosis eceran, pengurangan stok tidak terjadi salah konversi.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleAddFakRow}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span> Tambah Baris Obat</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[900px]">
                <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">#</th>
                    <th className="px-3 py-2.5 w-48">Nama Barang</th>
                    <th className="px-3 py-2.5 w-36">Batch &amp; ED</th>
                    <th className="px-3 py-2.5 w-20 text-center">Jumlah</th>
                    <th className="px-3 py-2.5 w-20 text-center">Bonus</th>
                    <th className="px-3 py-2.5 w-28">Satuan</th>
                    <th className="px-3 py-2.5 w-28 text-right">HNA (Rp)</th>
                    <th className="px-3 py-2.5 w-20 text-center">Diskon %</th>
                    <th className="px-3 py-2.5 w-24 text-center">Pajak</th>
                    <th className="px-3 py-2.5 w-28 text-right">Subtotal</th>
                    <th className="px-3 py-2.5 w-28 text-right">NET / Pcs</th>
                    <th className="px-3 py-2.5 w-12 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {fakItems.map((item, idx) => {
                    const c = calculateRow(item)
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 text-center font-bold text-muted-foreground">
                          {idx + 1}
                        </td>

                        {/* Nama Barang */}
                        <td className="px-3 py-2.5">
                          <select
                            value={item.medicineId}
                            onChange={(e) => {
                              const selected = medicines.find((m) => m.id === Number(e.target.value))
                              setFakItems(
                                fakItems.map((r) =>
                                  r.id === item.id
                                    ? {
                                      ...r,
                                      medicineId: Number(e.target.value),
                                      medicineName: selected?.name || '',
                                      unit: selected?.unit || 'Tablet',
                                      hnaPrice: selected?.purchasePrice || r.hnaPrice,
                                    }
                                    : r
                                )
                              )
                            }}
                            className="w-full px-2 py-1.5 border border-border rounded-lg text-xs font-semibold bg-background text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                          >
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.unit})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Batch & ED Button */}
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={() => openBatchModal(item)}
                            className="w-full px-2 py-1.5 rounded-lg border border-border bg-muted/50 hover:bg-muted text-left font-mono text-[11px] flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="truncate font-bold text-foreground">{item.batchNumber}</span>
                            <span className="text-[10px] text-muted-foreground ml-1">
                              {new Date(item.expiryDate).toLocaleDateString('id-ID', {
                                month: 'numeric',
                                year: '2-digit',
                              })}
                            </span>
                          </button>
                        </td>

                        {/* Qty */}
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            min={1}
                            required
                            value={item.quantity}
                            onChange={(e) =>
                              setFakItems(
                                fakItems.map((r) =>
                                  r.id === item.id ? { ...r, quantity: Math.max(1, parseInt(e.target.value, 10) || 0) } : r
                                )
                              )
                            }
                            className="w-16 px-2 py-1 border border-border rounded-lg text-xs font-bold text-center bg-background text-foreground"
                          />
                        </td>

                        {/* Bonus */}
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            value={item.bonusQuantity}
                            onChange={(e) =>
                              setFakItems(
                                fakItems.map((r) =>
                                  r.id === item.id ? { ...r, bonusQuantity: Math.max(0, parseInt(e.target.value, 10) || 0) } : r
                                )
                              )
                            }
                            className="w-14 px-2 py-1 border border-border rounded-lg text-xs font-bold text-center text-emerald-600 bg-background"
                          />
                        </td>

                        {/* Satuan Terkecil */}
                        <td className="px-3 py-2.5">
                          <select
                            value={item.unit}
                            onChange={(e) =>
                              setFakItems(
                                fakItems.map((r) => (r.id === item.id ? { ...r, unit: e.target.value } : r))
                              )
                            }
                            className="w-full px-2 py-1.5 border border-border rounded-lg text-xs bg-background text-foreground"
                          >
                            <option value="Tablet">Tablet</option>
                            <option value="Kapsul">Kapsul</option>
                            <option value="Kaplet">Kaplet</option>
                            <option value="Botol">Botol</option>
                            <option value="Tube">Tube</option>
                            <option value="Ampul">Ampul</option>
                            <option value="Strip">Strip</option>
                            <option value="Pcs">Pcs</option>
                            <option value="Dos">Dos / Box</option>
                          </select>
                        </td>

                        {/* HNA Price */}
                        <td className="px-3 py-2.5 text-right">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            value={item.hnaPrice}
                            onChange={(e) =>
                              setFakItems(
                                fakItems.map((r) =>
                                  r.id === item.id ? { ...r, hnaPrice: parseFloat(e.target.value) || 0 } : r
                                )
                              )
                            }
                            className="w-24 px-2 py-1 border border-border rounded-lg text-xs font-mono font-bold text-right bg-background text-foreground"
                          />
                        </td>

                        {/* Diskon % */}
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="any"
                            value={item.discountPercent}
                            onChange={(e) =>
                              setFakItems(
                                fakItems.map((r) =>
                                  r.id === item.id ? { ...r, discountPercent: parseFloat(e.target.value) || 0 } : r
                                )
                              )
                            }
                            className="w-14 px-2 py-1 border border-border rounded-lg text-xs font-bold text-center bg-background text-foreground"
                          />
                        </td>

                        {/* Pajak PPN Dropdown */}
                        <td className="px-3 py-2.5 text-center">
                          <select
                            value={item.isTaxable ? 'PPN' : 'NON'}
                            onChange={(e) =>
                              setFakItems(
                                fakItems.map((r) =>
                                  r.id === item.id ? { ...r, isTaxable: e.target.value === 'PPN' } : r
                                )
                              )
                            }
                            className="px-2 py-1 border border-border rounded-lg text-[11px] font-bold bg-background text-foreground"
                          >
                            <option value="PPN">Pajak (11%)</option>
                            <option value="NON">Non-Pajak</option>
                          </select>
                        </td>

                        {/* Subtotal */}
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                          Rp {c.lineGross.toLocaleString('id-ID')}
                        </td>

                        {/* Net per satuan */}
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          Rp {Math.round(c.netPerUnit).toLocaleString('id-ID')}
                        </td>

                        {/* Action Delete */}
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFakRow(item.id)}
                            className="p-1 rounded text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section D: Footer Kalkulasi Faktur & Live Validator Matching */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Notes & Physical Target Input */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Calculator className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Validasi Kesamaan Faktur Fisik</h3>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Total Nilai Faktur Fisik (Cross-Check Validator)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">Rp</span>
                  <input
                    type="number"
                    step="any"
                    value={fakExpectedPhysicalTotal}
                    onChange={(e) => setFakExpectedPhysicalTotal(e.target.value)}
                    placeholder="Masukkan angka tagihan akhir pada kertas faktur"
                    className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-xs font-mono font-bold text-foreground bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  <strong>Petunjuk Verifikasi:</strong> Total barang dan total harga saat dimasukkan ke sistem <strong>wajib sama persis</strong> dengan yang tertera di lembar fisik faktur PBF.
                </p>
              </div>

              {hasExpected && (
                <div
                  className={cn(
                    'p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3',
                    isMatched
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isMatched ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>
                      {isMatched
                        ? 'Sempurna! Total input sistem sama persis dengan fisik faktur.'
                        : `Perhatian: Masih ada selisih Rp ${Math.abs(matchDifference).toLocaleString('id-ID')} dengan fisik.`}
                    </span>
                  </div>
                  <span className="font-mono font-bold whitespace-nowrap">
                    {isMatched ? 'KLOP 100%' : `Diff: ${matchDifference > 0 ? '+' : ''}${matchDifference}`}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Catatan / Keterangan Faktur
                </label>
                <textarea
                  rows={3}
                  value={fakNotes}
                  onChange={(e) => setFakNotes(e.target.value)}
                  placeholder="Catatan penerimaan barang, no PO PBF, atau catatan pengiriman..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-bold text-foreground">Ringkasan Nilai Faktur</h3>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Total Qty: {totalQtySum} | Bonus: {totalBonusSum}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal Sebelum Diskon:</span>
                  <span className="font-mono font-semibold text-foreground">
                    Rp {subtotalBeforeDiscSum.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Diskon Item Barang:</span>
                  <span className="font-mono font-semibold text-rose-600">
                    - Rp {totalItemDiscSum.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/50">
                  <span className="flex items-center gap-1.5">
                    <span>Diskon Tambahan / Faktur:</span>
                  </span>
                  <div className="w-32">
                    <input
                      type="number"
                      min={0}
                      value={fakDiskonTambahan}
                      onChange={(e) => setFakDiskonTambahan(e.target.value)}
                      placeholder="0"
                      className="w-full px-2 py-1 border border-border rounded text-xs font-mono text-right bg-background text-foreground"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Dasar Pengenaan Pajak (DPP):</span>
                  <span className="font-mono font-bold text-foreground">
                    Rp {finalDpp.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span>PPN ({fakTaxRate}%):</span>
                  </span>
                  <span className="font-mono font-semibold text-foreground">
                    Rp {totalTaxAmount.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm font-extrabold text-foreground pt-3 border-t-2 border-border">
                  <span>Total Tagihan Faktur (Netto):</span>
                  <span className="text-base text-emerald-600 dark:text-emerald-400 font-mono">
                    Rp {grandTotalAmount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <Button
                  type="submit"
                  disabled={isPending || (hasExpected && !isMatched)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-6 shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isPending ? 'Menyimpan Faktur & Stok...' : 'Simpan Faktur & Sinkronisasi Stok'}</span>
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 2: MUTASI PEMBELIAN (RIWAYAT FAKTUR & AUDIT LOG)
          ========================================================================= */}
      {activeTab === 'mutasi_faktur' && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Riwayat Mutasi Pembelian (Faktur PBF)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Daftar seluruh faktur masuk, status jatuh tempo kredit (D7/D21/D30), dan tracking akun pembuat.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="px-3 py-2.5">No. Faktur Sistem</th>
                    <th className="px-3 py-2.5">No. Faktur PBF</th>
                    <th className="px-3 py-2.5">Tgl Transaksi</th>
                    <th className="px-3 py-2.5">Supplier (PBF)</th>
                    <th className="px-3 py-2.5">Syarat Bayar</th>
                    <th className="px-3 py-2.5">Jatuh Tempo</th>
                    <th className="px-3 py-2.5 text-right">Total Nilai</th>
                    <th className="px-3 py-2.5 text-center">Status Bayar</th>
                    <th className="px-3 py-2.5">Dibuat Oleh</th>
                    <th className="px-3 py-2.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                        <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="font-medium">Belum ada faktur pembelian yang tercatat di sistem</p>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-bold text-foreground">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">
                          {inv.supplierInvoiceNumber}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">
                          {new Date(inv.transactionDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-foreground">{inv.supplierName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{inv.supplierCode}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                              inv.paymentMethod === 'KREDIT'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                            )}
                          >
                            {inv.paymentMethod} {inv.creditTerm ? `(${inv.creditTerm})` : ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {inv.dueDate ? (
                            new Date(inv.dueDate).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                          Rp {inv.totalAmount.toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {inv.paymentStatus === 'LUNAS' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                              LUNAS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 font-bold text-[10px]">
                              TAGIHAN
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          <span className="font-medium text-foreground">{inv.createdByName}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoiceDetail(inv)}
                              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Lihat Detail Item Faktur"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {isNurse && inv.paymentStatus !== 'LUNAS' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Tandai faktur ${inv.invoiceNumber} sudah LUNAS?`)) {
                                    startTransition(async () => {
                                      await updatePurchaseInvoicePaymentStatus(inv.id, 'LUNAS')
                                      window.location.reload()
                                    })
                                  }
                                }}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                                title="Tandai Sudah Lunas"
                              >
                                Lunasi
                              </button>
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
        </div>
      )}

      {/* =========================================================================
          TAB 3: PESANAN PEMBELIAN (PURCHASE ORDER / PO)
          ========================================================================= */}
      {activeTab === 'po' && (
        <form onSubmit={handleSavePurchaseOrder} className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">Buat Pesanan Pembelian Baru (Purchase Order ke PBF)</h3>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                No. PO Otomatis: PO-YYYYMM-XXXX
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Pilih Supplier / PBF Tujuan *
                </label>
                <select
                  required
                  value={poSupplierId}
                  onChange={(e) => setPoSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-semibold bg-background text-foreground"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Estimasi Tanggal Pengiriman / Diterima
                </label>
                <input
                  type="date"
                  value={poExpectedDate}
                  onChange={(e) => setPoExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Catatan untuk Distributor (PBF)
                </label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="mis. Mohon sertakan sertifikat analisis (CoA)"
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground"
                />
              </div>
            </div>

            {/* PO Item Rows */}
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground">Daftar Item Obat yang Dipesan</h4>
                <Button
                  type="button"
                  onClick={handleAddPoRow}
                  variant="outline"
                  className="text-xs h-7 px-2.5 border-border bg-card text-foreground font-semibold"
                >
                  Tambah Item
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Nama Obat</th>
                      <th className="px-3 py-2 w-28">Satuan</th>
                      <th className="px-3 py-2 w-24 text-center">Jumlah Pesan</th>
                      <th className="px-3 py-2 w-32 text-right">Est. Harga Satuan</th>
                      <th className="px-3 py-2 w-32 text-right">Subtotal</th>
                      <th className="px-3 py-2 w-12 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {poItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <select
                            value={item.medicineId}
                            onChange={(e) => {
                              const sel = medicines.find((m) => m.id === Number(e.target.value))
                              setPoItems(
                                poItems.map((r) =>
                                  r.id === item.id
                                    ? {
                                      ...r,
                                      medicineId: Number(e.target.value),
                                      medicineName: sel?.name || '',
                                      unit: sel?.unit || 'Tablet',
                                      estimatedPrice: sel?.purchasePrice || r.estimatedPrice,
                                    }
                                    : r
                                )
                              )
                            }}
                            className="w-full px-2 py-1 border border-border rounded text-xs bg-background text-foreground font-medium"
                          >
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) =>
                              setPoItems(
                                poItems.map((r) => (r.id === item.id ? { ...r, unit: e.target.value } : r))
                              )
                            }
                            className="w-full px-2 py-1 border border-border rounded text-xs bg-background text-foreground"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) =>
                              setPoItems(
                                poItems.map((r) =>
                                  r.id === item.id ? { ...r, quantity: parseInt(e.target.value, 10) || 1 } : r
                                )
                              )
                            }
                            className="w-20 px-2 py-1 border border-border rounded text-xs font-bold text-center bg-background text-foreground"
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={item.estimatedPrice}
                            onChange={(e) =>
                              setPoItems(
                                poItems.map((r) =>
                                  r.id === item.id ? { ...r, estimatedPrice: parseFloat(e.target.value) || 0 } : r
                                )
                              )
                            }
                            className="w-24 px-2 py-1 border border-border rounded text-xs font-mono text-right bg-background text-foreground"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                          Rp {(item.quantity * item.estimatedPrice).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (poItems.length > 1) {
                                setPoItems(poItems.filter((r) => r.id !== item.id))
                              }
                            }}
                            className="p-1 text-muted-foreground hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Total Estimasi Pesanan:{' '}
                  <strong className="text-foreground font-mono text-sm">
                    Rp {poItems.reduce((acc, it) => acc + it.quantity * it.estimatedPrice, 0).toLocaleString('id-ID')}
                  </strong>
                </span>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-5 shadow-xs cursor-pointer"
                >
                  {isPending ? 'Menerbitkan PO...' : 'Terbitkan Pesanan Pembelian (PO)'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* =========================================================================
          TAB 4: MUTASI PESANAN (RIWAYAT PO KE PBF)
          ========================================================================= */}
      {activeTab === 'mutasi_po' && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Pesanan Pembelian (PO ke Supplier)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Melihat status surat pesanan yang telah dikirim ke PBF (Menunggu, Disetujui, Dikirim, Selesai).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="px-3 py-2.5">No. PO</th>
                  <th className="px-3 py-2.5">Tanggal Pesan</th>
                  <th className="px-3 py-2.5">Supplier (PBF)</th>
                  <th className="px-3 py-2.5">Estimasi Tiba</th>
                  <th className="px-3 py-2.5 text-center">Jumlah Item</th>
                  <th className="px-3 py-2.5 text-right">Total Estimasi</th>
                  <th className="px-3 py-2.5 text-center">Status PO</th>
                  <th className="px-3 py-2.5">Dibuat Oleh</th>
                  {isNurse && <th className="px-3 py-2.5 text-center">Ubah Status</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-medium">Belum ada riwayat pesanan pembelian (PO)</p>
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-foreground">{po.orderNumber}</td>
                      <td className="px-3 py-2.5 text-foreground">
                        {new Date(po.orderDate).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-foreground">{po.supplierName}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {po.expectedDate
                          ? new Date(po.expectedDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                          : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-foreground">
                        {po.items.length} item
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                        Rp {po.totalEstimated.toLocaleString('id-ID')}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase',
                            po.status === 'SELESAI'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                              : po.status === 'DIKIRIM'
                                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20'
                                : po.status === 'DISETUJUI'
                                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'
                                  : po.status === 'DIBATALKAN'
                                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                          )}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{po.createdByName}</td>
                      {isNurse && (
                        <td className="px-3 py-2.5 text-center">
                          <select
                            value={po.status}
                            onChange={(e) => {
                              startTransition(async () => {
                                await updatePurchaseOrderStatus(po.id, e.target.value as any)
                                window.location.reload()
                              })
                            }}
                            className="px-2 py-1 rounded border border-border text-[11px] bg-background text-foreground"
                          >
                            <option value="MENUNGGU">MENUNGGU</option>
                            <option value="DISETUJUI">DISETUJUI</option>
                            <option value="DIKIRIM">DIKIRIM</option>
                            <option value="SELESAI">SELESAI</option>
                            <option value="DIBATALKAN">DIBATALKAN</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: MASTER SUPPLIER (PBF)
          ========================================================================= */}
      {activeTab === 'supplier' && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Manajemen Distributor / Pedagang Besar Farmasi (PBF)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pengelolaan data supplier resmi faskes, izin PBF, NPWP, dan status PKP.
              </p>
            </div>

            <Button
              onClick={() => {
                setSupCode(`PBF-${Date.now().toString().slice(-4)}`)
                setSupName('')
                setIsAddSupplierModalOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span> Daftarkan PBF Baru</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      {sup.code}
                    </span>
                    <h4 className="text-sm font-bold text-foreground mt-1.5">{sup.name}</h4>
                  </div>
                  {sup.isPkp ? (
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                      PKP
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20 text-[10px] font-bold">
                      Non-PKP
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>📍 {sup.address || 'Alamat belum diatur'}</p>
                  <p>📞 {sup.phone || '-'} {sup.email ? `| ✉️ ${sup.email}` : ''}</p>
                  <p>👤 Kontak PIC: <strong className="text-foreground">{sup.picName || '-'}</strong></p>
                  {sup.licenseNumber && (
                    <p className="font-mono text-[11px]">📜 Izin PBF: {sup.licenseNumber}</p>
                  )}
                  {sup.npwp && <p className="font-mono text-[11px]">💳 NPWP: {sup.npwp}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: BATCH & EXPIRED DATE INPUT PER ITEM
          ========================================================================= */}
      {batchModalRowId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Pengaturan No. Batch &amp; Tanggal Kedaluwarsa (ED)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBatchModalRowId(null)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nomor Batch Pabrikan (Produsen) *
                </label>
                <input
                  type="text"
                  required
                  value={tempBatchNumber}
                  onChange={(e) => setTempBatchNumber(e.target.value)}
                  placeholder="mis. BATCH-202610-098"
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono font-bold bg-background text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Expired Date (ED) *
                </label>
                <input
                  type="date"
                  required
                  value={tempExpiryDate}
                  onChange={(e) => setTempExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground font-medium"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBatchModalRowId(null)}
                  className="text-xs h-8 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={saveBatchModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 cursor-pointer"
                >
                  Terapkan ke Baris
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: DETAIL ITEM FAKTUR DI MUTASI PEMBELIAN
          ========================================================================= */}
      {selectedInvoiceDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Rincian Faktur: {selectedInvoiceDetail.invoiceNumber}
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  Faktur Fisik PBF: {selectedInvoiceDetail.supplierInvoiceNumber} | {selectedInvoiceDetail.supplierName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceDetail(null)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-muted/30 border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Tgl Transaksi</span>
                  <span className="font-bold text-foreground">
                    {new Date(selectedInvoiceDetail.transactionDate).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Syarat Pembayaran</span>
                  <span className="font-bold text-foreground">
                    {selectedInvoiceDetail.paymentMethod} {selectedInvoiceDetail.creditTerm ? `(${selectedInvoiceDetail.creditTerm})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Jatuh Tempo</span>
                  <span className="font-bold text-foreground">
                    {selectedInvoiceDetail.dueDate ? new Date(selectedInvoiceDetail.dueDate).toLocaleDateString('id-ID') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Petugas Input</span>
                  <span className="font-bold text-foreground">{selectedInvoiceDetail.createdByName}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Nama Barang</th>
                      <th className="px-3 py-2">No. Batch</th>
                      <th className="px-3 py-2">ED</th>
                      <th className="px-3 py-2 text-center">Jumlah</th>
                      <th className="px-3 py-2 text-center">Bonus</th>
                      <th className="px-3 py-2 text-right">HNA</th>
                      <th className="px-3 py-2 text-right">Harga Beli NET</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedInvoiceDetail.items.map((it) => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 font-bold text-foreground">{it.medicineName}</td>
                        <td className="px-3 py-2 font-mono">{it.batchNumber}</td>
                        <td className="px-3 py-2">
                          {new Date(it.expiryDate).toLocaleDateString('id-ID', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-3 py-2 text-center font-bold">{it.quantity} {it.unit}</td>
                        <td className="px-3 py-2 text-center text-emerald-600 font-bold">{it.bonusQuantity}</td>
                        <td className="px-3 py-2 text-right font-mono">Rp {it.hnaPrice.toLocaleString('id-ID')}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                          Rp {it.netPrice.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border flex justify-between items-center text-xs">
                <span className="font-semibold text-muted-foreground">Total Nilai Tagihan Faktur:</span>
                <span className="text-base font-extrabold font-mono text-foreground">
                  Rp {selectedInvoiceDetail.totalAmount.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: TAMBAH SUPPLIER (PBF)
          ========================================================================= */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card text-foreground rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Daftarkan Supplier / PBF Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSupplierModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Kode PBF *</label>
                  <input
                    type="text"
                    required
                    value={supCode}
                    onChange={(e) => setSupCode(e.target.value)}
                    placeholder="mis. PBF-AAM"
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono font-bold bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Status Pajak *</label>
                  <select
                    value={supIsPkp ? 'PKP' : 'NON'}
                    onChange={(e) => setSupIsPkp(e.target.value === 'PKP')}
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-bold bg-background text-foreground"
                  >
                    <option value="PKP">PKP (Pengusaha Kena Pajak)</option>
                    <option value="NON">Non-PKP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nama Perusahaan Distributor / PBF *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="mis. PT Anugrah Argon Medica (AAM)"
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs font-bold bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Nama Kontak PIC / Sales</label>
                  <input
                    type="text"
                    value={supPic}
                    onChange={(e) => setSupPic(e.target.value)}
                    placeholder="mis. Bambang (Account Representative)"
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">No. Telepon / WhatsApp</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="mis. 021-7456789 / 08123456789"
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Alamat Kantor / Gudang PBF</label>
                <textarea
                  rows={2}
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="Alamat lengkap distributor..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-xs bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">No. Izin Resmi PBF</label>
                  <input
                    type="text"
                    value={supLicense}
                    onChange={(e) => setSupLicense(e.target.value)}
                    placeholder="mis. PBF-DKI/123/IX/2021"
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">NPWP Perusahaan</label>
                  <input
                    type="text"
                    value={supNpwp}
                    onChange={(e) => setSupNpwp(e.target.value)}
                    placeholder="mis. 01.345.678.9-012.000"
                    className="w-full px-3 py-2 border border-border rounded-lg text-xs font-mono bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddSupplierModalOpen(false)}
                  className="text-xs h-8 cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Data Supplier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
