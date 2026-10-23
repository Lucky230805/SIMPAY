'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, getCurrentUser } from '@/lib/auth'

/* =========================================================
   1. MASTER DATA SUPPLIER (PBF)
   ========================================================= */

export interface SupplierItem {
  id: number
  code: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  picName: string | null
  licenseNumber: string | null
  isPkp: boolean
  npwp: string | null
  isActive: boolean
  createdAt: Date
}

export async function getSuppliers(): Promise<SupplierItem[]> {
  await requireAuth()

  try {
    let suppliers = await (prisma as any).supplier.findMany({
      orderBy: { name: 'asc' },
    })

    // Auto-seed default PBF if none exists
    if (suppliers.length === 0) {
      await seedDefaultSuppliers()
      suppliers = await (prisma as any).supplier.findMany({
        orderBy: { name: 'asc' },
      })
    }

    return suppliers
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return []
  }
}

export async function seedDefaultSuppliers() {
  const defaults = [
    {
      code: 'PBF-AAM',
      name: 'PT Anugrah Argon Medica (AAM)',
      address: 'Titan Center Lt. 3, Jl. Boulevard Bintaro, Tangerang Selatan',
      phone: '021-7456789',
      email: 'order@argon-medica.co.id',
      picName: 'Bambang Sudibyo (Sales Farmasi)',
      licenseNumber: 'PBF-DKI/123/IX/2021',
      isPkp: true,
      npwp: '01.345.678.9-012.000',
    },
    {
      code: 'PBF-KF',
      name: 'PT Kimia Farma Trading & Distribution',
      address: 'Jl. Budi Utomo No. 1, Jakarta Pusat',
      phone: '021-3847777',
      email: 'order.kftd@kimiafarma.co.id',
      picName: 'Rina Indriani (Account Representative)',
      licenseNumber: 'PBF-KEMENKES/456/2020',
      isPkp: true,
      npwp: '01.234.567.8-034.000',
    },
    {
      code: 'PBF-KALBE',
      name: 'PT Enseval Putera Megatrading Tbk (Kalbe Group)',
      address: 'Kawasan Industri Pulogadung, Jakarta Timur',
      phone: '021-4609042',
      email: 'cs@enseval.com',
      picName: 'Hendra Gunawan',
      licenseNumber: 'PBF-KEMENKES/789/2022',
      isPkp: true,
      npwp: '01.111.222.3-055.000',
    },
    {
      code: 'PBF-MENSA',
      name: 'PT Mensa Binasukses',
      address: 'Jl. Pulo Kambing II No. 26, Kawasan Industri Pulogadung',
      phone: '021-4608888',
      email: 'sales@mbs.co.id',
      picName: 'Dewi Kartika',
      licenseNumber: 'PBF-DKI/998/2021',
      isPkp: true,
      npwp: '02.444.555.6-077.000',
    },
  ]

  for (const item of defaults) {
    const existing = await (prisma as any).supplier.findUnique({
      where: { code: item.code },
    })
    if (!existing) {
      await (prisma as any).supplier.create({ data: item })
    }
  }
}

export async function createSupplier(data: {
  code: string
  name: string
  address?: string
  phone?: string
  email?: string
  picName?: string
  licenseNumber?: string
  isPkp?: boolean
  npwp?: string
}) {
  try {
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  if (!data.name || data.name.trim() === '') {
    return { success: false, error: 'Nama supplier / PBF wajib diisi' }
  }

  const code = data.code?.trim() || `PBF-${Date.now().toString().slice(-4)}`

  try {
    const existing = await (prisma as any).supplier.findUnique({ where: { code } })
    if (existing) {
      return { success: false, error: `Kode supplier "${code}" sudah digunakan` }
    }

    const supplier = await (prisma as any).supplier.create({
      data: {
        code,
        name: data.name.trim(),
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        picName: data.picName?.trim() || null,
        licenseNumber: data.licenseNumber?.trim() || null,
        isPkp: Boolean(data.isPkp),
        npwp: data.npwp?.trim() || null,
      },
    })

    revalidatePath('/transaksi')
    return { success: true, supplier }
  } catch (error: any) {
    console.error('Error creating supplier:', error)
    return { success: false, error: error.message || 'Gagal menambahkan supplier' }
  }
}

/* =========================================================
   2. PESANAN PEMBELIAN (PURCHASE ORDER / PO)
   ========================================================= */

export interface PurchaseOrderItemData {
  medicineId: number
  medicineName: string
  unit: string
  quantity: number
  estimatedPrice: number
  subtotal: number
  notes?: string
}

export interface PurchaseOrderRecord {
  id: number
  orderNumber: string
  supplierId: number
  supplierName: string
  supplierCode: string
  orderDate: Date
  expectedDate: Date | null
  status: 'MENUNGGU' | 'DISETUJUI' | 'DIKIRIM' | 'SELESAI' | 'DIBATALKAN'
  notes: string | null
  createdByName: string
  totalEstimated: number
  items: {
    id: number
    medicineId: number
    medicineName: string
    unit: string
    quantity: number
    estimatedPrice: number
    subtotal: number
    notes: string | null
  }[]
  createdAt: Date
}

export async function getPurchaseOrders(): Promise<PurchaseOrderRecord[]> {
  await requireAuth()

  try {
    const orders = await (prisma as any).purchaseOrder.findMany({
      orderBy: { orderDate: 'desc' },
      include: {
        supplier: { select: { name: true, code: true } },
        items: true,
      },
    })

    return orders.map((o: any) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      supplierId: o.supplierId,
      supplierName: o.supplier?.name || 'PBF',
      supplierCode: o.supplier?.code || '-',
      orderDate: o.orderDate,
      expectedDate: o.expectedDate,
      status: o.status,
      notes: o.notes,
      createdByName: o.createdByName,
      totalEstimated: o.totalEstimated,
      items: o.items || [],
      createdAt: o.createdAt,
    }))
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return []
  }
}

export async function createPurchaseOrder(data: {
  supplierId: number
  expectedDate?: string | Date
  notes?: string
  items: PurchaseOrderItemData[]
}) {
  const user = await requireRole('PERAWAT')

  if (!data.supplierId) {
    return { success: false, error: 'Supplier / PBF wajib dipilih' }
  }

  if (!data.items || data.items.length === 0) {
    return { success: false, error: 'Minimal pilih 1 item obat untuk dipesan' }
  }

  try {
    const count = await (prisma as any).purchaseOrder.count()
    const now = new Date()
    const yearMonth = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`
    const orderNumber = `PO-${yearMonth}-${(count + 1).toString().padStart(4, '0')}`

    const totalEstimated = data.items.reduce((sum, item) => sum + (item.subtotal || item.quantity * item.estimatedPrice), 0)

    const po = await (prisma as any).purchaseOrder.create({
      data: {
        orderNumber,
        supplierId: Number(data.supplierId),
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
        notes: data.notes?.trim() || null,
        createdById: user.id,
        createdByName: user.name,
        totalEstimated,
        status: 'MENUNGGU',
        items: {
          create: data.items.map((it) => ({
            medicineId: Number(it.medicineId),
            medicineName: it.medicineName.trim(),
            unit: it.unit || 'Tablet',
            quantity: Number(it.quantity),
            estimatedPrice: Number(it.estimatedPrice || 0),
            subtotal: Number(it.subtotal || it.quantity * it.estimatedPrice),
            notes: it.notes?.trim() || null,
          })),
        },
      },
      include: {
        items: true,
      },
    })

    revalidatePath('/transaksi')
    return { success: true, purchaseOrder: po }
  } catch (error: any) {
    console.error('Error creating purchase order:', error)
    return { success: false, error: error.message || 'Gagal membuat pesanan pembelian' }
  }
}

export async function updatePurchaseOrderStatus(
  id: number,
  status: 'MENUNGGU' | 'DISETUJUI' | 'DIKIRIM' | 'SELESAI' | 'DIBATALKAN'
) {
  await requireRole('PERAWAT')

  try {
    await (prisma as any).purchaseOrder.update({
      where: { id: Number(id) },
      data: { status },
    })

    revalidatePath('/transaksi')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating purchase order status:', error)
    return { success: false, error: error.message || 'Gagal memperbarui status PO' }
  }
}

/* =========================================================
   3. FAKTUR PEMBELIAN (PURCHASE INVOICE & GOOD RECEIPT)
   ========================================================= */

export interface PurchaseInvoiceItemInput {
  medicineId: number
  medicineName: string
  batchNumber: string
  expiryDate: string | Date
  quantity: number
  bonusQuantity: number
  unit: string
  hnaPrice: number
  discountPercent: number
  isTaxable: boolean
  hnaWithTax: number
  discountWithTax: number
  subtotal: number
  netPrice: number
}

export interface PurchaseInvoiceRecord {
  id: number
  invoiceNumber: string
  supplierInvoiceNumber: string
  purchaseOrderId: number | null
  purchaseOrderNumber?: string | null
  supplierId: number
  supplierName: string
  supplierCode: string
  transactionDate: Date
  facilityLocation: string
  paymentMethod: string
  creditTerm: string | null
  dueDate: Date | null
  status: string
  paymentStatus: string
  taxInvoiceNumber: string | null
  notes: string | null
  totalQty: number
  totalQtyBonus: number
  subtotalBeforeDiscount: number
  itemDiscountAmount: number
  additionalDiscount: number
  dppAmount: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  createdByName: string
  createdAt: Date
  items: {
    id: number
    medicineId: number
    medicineName: string
    batchNumber: string
    expiryDate: Date
    quantity: number
    bonusQuantity: number
    unit: string
    hnaPrice: number
    discountPercent: number
    isTaxable: boolean
    hnaWithTax: number
    discountWithTax: number
    subtotal: number
    netPrice: number
  }[]
}

export async function getPurchaseInvoices(): Promise<PurchaseInvoiceRecord[]> {
  await requireAuth()

  try {
    const invoices = await (prisma as any).purchaseInvoice.findMany({
      orderBy: { transactionDate: 'desc' },
      include: {
        supplier: { select: { name: true, code: true } },
        purchaseOrder: { select: { orderNumber: true } },
        items: true,
      },
    })

    return invoices.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      supplierInvoiceNumber: inv.supplierInvoiceNumber,
      purchaseOrderId: inv.purchaseOrderId,
      purchaseOrderNumber: inv.purchaseOrder?.orderNumber || null,
      supplierId: inv.supplierId,
      supplierName: inv.supplier?.name || 'PBF',
      supplierCode: inv.supplier?.code || '-',
      transactionDate: inv.transactionDate,
      facilityLocation: inv.facilityLocation,
      paymentMethod: inv.paymentMethod,
      creditTerm: inv.creditTerm,
      dueDate: inv.dueDate,
      status: inv.status,
      paymentStatus: inv.paymentStatus,
      taxInvoiceNumber: inv.taxInvoiceNumber,
      notes: inv.notes,
      totalQty: inv.totalQty,
      totalQtyBonus: inv.totalQtyBonus,
      subtotalBeforeDiscount: inv.subtotalBeforeDiscount,
      itemDiscountAmount: inv.itemDiscountAmount,
      additionalDiscount: inv.additionalDiscount,
      dppAmount: inv.dppAmount,
      taxRate: inv.taxRate,
      taxAmount: inv.taxAmount,
      totalAmount: inv.totalAmount,
      createdByName: inv.createdByName,
      createdAt: inv.createdAt,
      items: inv.items || [],
    }))
  } catch (error) {
    console.error('Error fetching purchase invoices:', error)
    return []
  }
}

export async function createPurchaseInvoice(data: {
  supplierInvoiceNumber: string
  purchaseOrderId?: number | null
  supplierId: number
  transactionDate?: string | Date
  facilityLocation?: string
  paymentMethod: 'KREDIT' | 'TUNAI' | 'TRANSFER'
  creditTerm?: 'D7' | 'D21' | 'D30' | string | null
  status?: 'PROSES' | 'TUNDA' | 'SELESAI'
  taxInvoiceNumber?: string | null
  notes?: string | null
  additionalDiscount?: number
  taxRate?: number
  items: PurchaseInvoiceItemInput[]
}) {
  const user = await requireRole('PERAWAT')

  if (!data.supplierInvoiceNumber || data.supplierInvoiceNumber.trim() === '') {
    return { success: false, error: 'Nomor faktur fisik dari supplier/PBF wajib diisi' }
  }

  if (!data.supplierId) {
    return { success: false, error: 'Supplier / PBF wajib dipilih' }
  }

  if (!data.items || data.items.length === 0) {
    return { success: false, error: 'Minimal harus ada 1 barang obat pada faktur' }
  }

  // Validate each item (must have Batch and ED)
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    if (!item.batchNumber || item.batchNumber.trim() === '') {
      return { success: false, error: `Item baris ke-${i + 1} (${item.medicineName}) wajib memiliki Nomor Batch` }
    }
    if (!item.expiryDate) {
      return { success: false, error: `Item baris ke-${i + 1} (${item.medicineName}) wajib memiliki Tanggal Kedaluwarsa (ED)` }
    }
    if (item.quantity <= 0) {
      return { success: false, error: `Jumlah qty item baris ke-${i + 1} harus lebih dari 0` }
    }
  }

  try {
    const transDate = data.transactionDate ? new Date(data.transactionDate) : new Date()

    // Calculate due date based on payment term
    let dueDate: Date | null = null
    if (data.paymentMethod === 'KREDIT' && data.creditTerm) {
      dueDate = new Date(transDate)
      if (data.creditTerm === 'D7') {
        dueDate.setDate(dueDate.getDate() + 7)
      } else if (data.creditTerm === 'D21') {
        dueDate.setDate(dueDate.getDate() + 21)
      } else if (data.creditTerm === 'D30') {
        dueDate.setDate(dueDate.getDate() + 30)
      } else {
        const customDays = parseInt(data.creditTerm.replace(/\D/g, ''), 10) || 30
        dueDate.setDate(dueDate.getDate() + customDays)
      }
    }

    // Auto-generate system invoice number FAK-YYYYMM-XXXX
    const count = await (prisma as any).purchaseInvoice.count()
    const yearMonth = `${transDate.getFullYear()}${(transDate.getMonth() + 1).toString().padStart(2, '0')}`
    const invoiceNumber = `FAK-${yearMonth}-${(count + 1).toString().padStart(4, '0')}`

    // Financial calculations
    let totalQty = 0
    let totalQtyBonus = 0
    let subtotalBeforeDiscount = 0
    let itemDiscountAmount = 0
    let dppAmount = 0

    const taxRate = data.taxRate !== undefined ? Number(data.taxRate) : 11 // default 11%

    const processedItems = data.items.map((item) => {
      const qty = Number(item.quantity)
      const bonus = Number(item.bonusQuantity || 0)
      const hna = Number(item.hnaPrice || 0)
      const discPct = Number(item.discountPercent || 0)

      const lineGross = qty * hna
      const lineDisc = (lineGross * discPct) / 100
      const lineNetBeforeTax = lineGross - lineDisc

      totalQty += qty
      totalQtyBonus += bonus
      subtotalBeforeDiscount += lineGross
      itemDiscountAmount += lineDisc
      dppAmount += lineNetBeforeTax

      // Tax per item
      const isTaxable = item.isTaxable !== false
      const hnaWithTax = isTaxable ? hna * (1 + taxRate / 100) : hna
      const discWithTax = isTaxable ? lineDisc * (1 + taxRate / 100) : lineDisc
      const totalUnits = qty + bonus
      const netPrice = totalUnits > 0 ? (lineNetBeforeTax * (isTaxable ? 1 + taxRate / 100 : 1)) / totalUnits : hna

      return {
        medicineId: Number(item.medicineId),
        medicineName: item.medicineName.trim(),
        batchNumber: item.batchNumber.trim(),
        expiryDate: new Date(item.expiryDate),
        quantity: qty,
        bonusQuantity: bonus,
        unit: item.unit || 'Tablet',
        hnaPrice: hna,
        discountPercent: discPct,
        isTaxable,
        hnaWithTax: Math.round(hnaWithTax * 100) / 100,
        discountWithTax: Math.round(discWithTax * 100) / 100,
        subtotal: Math.round(lineGross * 100) / 100,
        netPrice: Math.round(netPrice * 100) / 100,
      }
    })

    const additionalDiscount = Number(data.additionalDiscount || 0)
    const finalDpp = Math.max(0, dppAmount - additionalDiscount)
    const taxAmount = Math.round(((finalDpp * taxRate) / 100) * 100) / 100
    const totalAmount = Math.round((finalDpp + taxAmount) * 100) / 100

    const invoiceStatus = data.status || 'PROSES'
    const paymentStatus = data.paymentMethod === 'TUNAI' ? 'LUNAS' : 'TAGIHAN'

    const supplier = await (prisma as any).supplier.findUnique({
      where: { id: Number(data.supplierId) },
    })

    // Execute in transaction to guarantee data integrity
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Purchase Invoice
      const invoice = await tx.purchaseInvoice.create({
        data: {
          invoiceNumber,
          supplierInvoiceNumber: data.supplierInvoiceNumber.trim(),
          purchaseOrderId: data.purchaseOrderId ? Number(data.purchaseOrderId) : null,
          supplierId: Number(data.supplierId),
          transactionDate: transDate,
          facilityLocation: data.facilityLocation?.trim() || 'Klinik Pratama SIMPAY',
          paymentMethod: data.paymentMethod,
          creditTerm: data.paymentMethod === 'KREDIT' ? data.creditTerm || 'D30' : null,
          dueDate,
          status: invoiceStatus,
          paymentStatus,
          taxInvoiceNumber: data.taxInvoiceNumber?.trim() || null,
          notes: data.notes?.trim() || null,
          totalQty,
          totalQtyBonus,
          subtotalBeforeDiscount,
          itemDiscountAmount,
          additionalDiscount,
          dppAmount: finalDpp,
          taxRate,
          taxAmount,
          totalAmount,
          createdById: user.id,
          createdByName: user.name,
        },
      })

      // 2. Process Items and Synchronize Stock Batches & Stock Movements
      for (const item of processedItems) {
        const totalReceived = item.quantity + item.bonusQuantity

        // Check if batch with this number already exists for this medicine
        let batch = await tx.medicineBatch.findFirst({
          where: {
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
          },
        })

        if (batch) {
          // Update batch stock
          batch = await tx.medicineBatch.update({
            where: { id: batch.id },
            data: {
              stockQuantity: batch.stockQuantity + totalReceived,
              initialQuantity: batch.initialQuantity + totalReceived,
              expiryDate: item.expiryDate,
            },
          })
        } else {
          // Create new batch
          batch = await tx.medicineBatch.create({
            data: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              stockQuantity: totalReceived,
              initialQuantity: totalReceived,
              expiryDate: item.expiryDate,
              receivedDate: transDate,
            },
          })
        }

        // Create Purchase Invoice Item
        await tx.purchaseInvoiceItem.create({
          data: {
            purchaseInvoiceId: invoice.id,
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            bonusQuantity: item.bonusQuantity,
            unit: item.unit,
            hnaPrice: item.hnaPrice,
            discountPercent: item.discountPercent,
            isTaxable: item.isTaxable,
            hnaWithTax: item.hnaWithTax,
            discountWithTax: item.discountWithTax,
            subtotal: item.subtotal,
            netPrice: item.netPrice,
            batchId: batch.id,
          },
        })

        // Audit Trail Stock Movement (IN)
        const medBatches = await tx.medicineBatch.findMany({
          where: { medicineId: item.medicineId },
        })
        const prevTotalStock = medBatches.reduce((acc: number, b: any) => acc + b.stockQuantity, 0) - totalReceived

        await tx.stockMovement.create({
          data: {
            medicineId: item.medicineId,
            batchId: batch.id,
            type: 'IN',
            quantity: totalReceived,
            previousStock: Math.max(0, prevTotalStock),
            currentStock: Math.max(0, prevTotalStock) + totalReceived,
            notes: `Faktur Masuk: ${data.supplierInvoiceNumber.trim()} (${supplier?.name || 'PBF'})`,
            referenceNo: invoiceNumber,
            createdById: user.id,
            createdByName: user.name,
          },
        })

        // Update medicine purchase price & unit if needed
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: {
            purchasePrice: item.netPrice,
          },
        })
      }

      // If linked to PO, mark PO as SELESAI
      if (data.purchaseOrderId) {
        await tx.purchaseOrder.update({
          where: { id: Number(data.purchaseOrderId) },
          data: { status: 'SELESAI' },
        })
      }

      return invoice
    })

    revalidatePath('/transaksi')
    revalidatePath('/obat')
    revalidatePath('/resep')

    return { success: true, invoice: result }
  } catch (error: any) {
    console.error('Error creating purchase invoice:', error)
    return { success: false, error: error.message || 'Gagal menyimpan faktur pembelian' }
  }
}

export async function updatePurchaseInvoicePaymentStatus(
  id: number,
  paymentStatus: 'TAGIHAN' | 'LUNAS'
) {
  await requireRole('PERAWAT')

  try {
    await (prisma as any).purchaseInvoice.update({
      where: { id: Number(id) },
      data: {
        paymentStatus,
        status: paymentStatus === 'LUNAS' ? 'SELESAI' : 'PROSES',
      },
    })

    revalidatePath('/transaksi')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating invoice payment status:', error)
    return { success: false, error: error.message || 'Gagal memperbarui status pembayaran faktur' }
  }
}
