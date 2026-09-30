'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole, getCurrentUser } from '@/lib/auth'

export interface MedicineItem {
  id: number
  name: string
  code: string | null
  unit: string
  category: string | null
  unitPrice: number
  purchasePrice: number | null
  minStock: number
  isActive: boolean
  availableStock: number
  expiredStock: number
  nearExpiryBatchesCount: number
  nearExpiry30BatchesCount: number
  nearExpiry60BatchesCount: number
  alertStatus: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY' | 'NEAR_EXPIRY_30' | 'NEAR_EXPIRY_60' | 'EXPIRED'
  createdAt: Date
  updatedAt: Date
  batches?: {
    id: number
    batchNumber: string
    stockQuantity: number
    initialQuantity: number
    expiryDate: Date
    receivedDate: Date
    isExpired: boolean
    isNearExpiry: boolean
    isNearExpiry30: boolean
    isNearExpiry60: boolean
    daysUntilExpiry: number
    alertLevel: 'EXPIRED' | 'CRITICAL_30' | 'WARNING_60' | 'SAFE'
  }[]
}

export interface MedicineAlertSummary {
  expiredCount: number
  nearExpiryCount: number
  nearExpiry30Count: number
  nearExpiry60Count: number
  lowStockCount: number
  outOfStockCount: number
}

/**
 * Fetch all medicines with calculated available stock, batch summary, and alert status.
 */
export async function getMedicineInventory(): Promise<MedicineItem[]> {
  await requireAuth()

  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: { name: 'asc' },
      include: {
        batches: {
          orderBy: { expiryDate: 'asc' },
        },
      },
    })

    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)

    return medicines.map((med) => {
      let availableStock = 0
      let expiredStock = 0
      let nearExpiry30BatchesCount = 0
      let nearExpiry60BatchesCount = 0

      const mappedBatches = med.batches.map((b) => {
        const expiry = new Date(b.expiryDate)
        const diffMs = expiry.getTime() - now.getTime()
        const daysUntilExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

        const isExpired = expiry < now && b.stockQuantity > 0
        const isNearExpiry30 = expiry >= now && expiry <= thirtyDaysFromNow && b.stockQuantity > 0
        const isNearExpiry60 = expiry > thirtyDaysFromNow && expiry <= sixtyDaysFromNow && b.stockQuantity > 0
        const isNearExpiry = isNearExpiry30 || isNearExpiry60

        if (expiry >= now) {
          availableStock += b.stockQuantity
        } else {
          expiredStock += b.stockQuantity
        }

        if (isNearExpiry30) {
          nearExpiry30BatchesCount += 1
        }
        if (isNearExpiry60) {
          nearExpiry60BatchesCount += 1
        }

        let alertLevel: 'EXPIRED' | 'CRITICAL_30' | 'WARNING_60' | 'SAFE' = 'SAFE'
        if (isExpired) alertLevel = 'EXPIRED'
        else if (isNearExpiry30) alertLevel = 'CRITICAL_30'
        else if (isNearExpiry60) alertLevel = 'WARNING_60'

        return {
          id: b.id,
          batchNumber: b.batchNumber,
          stockQuantity: b.stockQuantity,
          initialQuantity: b.initialQuantity,
          expiryDate: b.expiryDate,
          receivedDate: b.receivedDate,
          isExpired,
          isNearExpiry,
          isNearExpiry30,
          isNearExpiry60,
          daysUntilExpiry,
          alertLevel,
        }
      })

      const nearExpiryBatchesCount = nearExpiry30BatchesCount + nearExpiry60BatchesCount

      // Determine primary alert status
      let alertStatus: MedicineItem['alertStatus'] = 'NORMAL'
      if (availableStock === 0) {
        alertStatus = 'OUT_OF_STOCK'
      } else if (expiredStock > 0) {
        alertStatus = 'EXPIRED'
      } else if (availableStock <= med.minStock) {
        alertStatus = 'LOW_STOCK'
      } else if (nearExpiry30BatchesCount > 0) {
        alertStatus = 'NEAR_EXPIRY_30'
      } else if (nearExpiry60BatchesCount > 0) {
        alertStatus = 'NEAR_EXPIRY_60'
      } else if (nearExpiryBatchesCount > 0) {
        alertStatus = 'NEAR_EXPIRY'
      }

      return {
        id: med.id,
        name: med.name,
        code: med.code,
        unit: med.unit,
        category: med.category,
        unitPrice: med.unitPrice,
        purchasePrice: med.purchasePrice,
        minStock: med.minStock,
        isActive: med.isActive,
        availableStock,
        expiredStock,
        nearExpiryBatchesCount,
        nearExpiry30BatchesCount,
        nearExpiry60BatchesCount,
        alertStatus,
        createdAt: med.createdAt,
        updatedAt: med.updatedAt,
        batches: mappedBatches,
      }
    })
  } catch (error: any) {
    console.error('Error fetching medicine inventory:', error)
    return []
  }
}

/**
 * Get summary alert counts across all medicines.
 */
export async function getMedicineAlerts(): Promise<MedicineAlertSummary> {
  await requireAuth()

  try {
    const inventory = await getMedicineInventory()
    let expiredCount = 0
    let nearExpiryCount = 0
    let nearExpiry30Count = 0
    let nearExpiry60Count = 0
    let lowStockCount = 0
    let outOfStockCount = 0

    for (const med of inventory) {
      if (med.availableStock === 0) {
        outOfStockCount++
      } else if (med.availableStock <= med.minStock) {
        lowStockCount++
      }
      if (med.expiredStock > 0) {
        expiredCount++
      }
      if (med.nearExpiry30BatchesCount > 0) {
        nearExpiry30Count++
      }
      if (med.nearExpiry60BatchesCount > 0) {
        nearExpiry60Count++
      }
      if (med.nearExpiryBatchesCount > 0) {
        nearExpiryCount++
      }
    }

    return {
      expiredCount,
      nearExpiryCount,
      nearExpiry30Count,
      nearExpiry60Count,
      lowStockCount,
      outOfStockCount,
    }
  } catch (error: any) {
    console.error('Error fetching medicine alerts:', error)
    return {
      expiredCount: 0,
      nearExpiryCount: 0,
      nearExpiry30Count: 0,
      nearExpiry60Count: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
    }
  }
}

/**
 * Create a new medicine master record (PERAWAT ONLY).
 */
export async function createMedicine(data: {
  name: string
  code?: string
  unit?: string
  category?: string
  unitPrice?: number
  purchasePrice?: number
  minStock?: number
}) {
  try {
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  if (!data.name || data.name.trim() === '') {
    return { success: false, error: 'Nama obat wajib diisi' }
  }

  if (data.unitPrice !== undefined && data.unitPrice < 0) {
    return { success: false, error: 'Harga jual tidak boleh negatif' }
  }

  if (data.minStock !== undefined && data.minStock < 0) {
    return { success: false, error: 'Minimum stok tidak boleh negatif' }
  }

  try {
    const existingName = await prisma.medicine.findFirst({
      where: { name: data.name.trim() },
    })

    if (existingName) {
      return { success: false, error: `Obat dengan nama "${data.name.trim()}" sudah ada` }
    }

    let finalCode = data.code?.trim()
    if (!finalCode) {
      const count = await prisma.medicine.count()
      finalCode = `OBT-${(count + 1).toString().padStart(3, '0')}`
    }

    const medicine = await prisma.medicine.create({
      data: {
        name: data.name.trim(),
        code: finalCode,
        unit: data.unit?.trim() || 'Pcs',
        category: data.category?.trim() || 'Obat Bebas',
        unitPrice: data.unitPrice !== undefined ? Number(data.unitPrice) : 0,
        purchasePrice: data.purchasePrice !== undefined ? Number(data.purchasePrice) : 0,
        minStock: data.minStock !== undefined ? Number(data.minStock) : 10,
        isActive: true,
      },
    })

    // If category is a procedure/action or injection, automatically create non-expiring stock batch
    const categoryLower = (data.category || '').toLowerCase()
    const isProcedure =
      categoryLower.includes('tindakan') ||
      categoryLower.includes('injeksi') ||
      categoryLower.includes('suntik') ||
      categoryLower.includes('layanan')

    if (isProcedure) {
      const tenYearsLater = new Date()
      tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10)
      await prisma.medicineBatch.create({
        data: {
          medicineId: medicine.id,
          batchNumber: `PROC-${Date.now()}`,
          stockQuantity: 9999,
          initialQuantity: 9999,
          expiryDate: tenYearsLater,
          receivedDate: new Date(),
        },
      })
    }

    try {
      revalidatePath('/obat')
      revalidatePath('/resep')
    } catch {}

    return { success: true, medicine }
  } catch (error: any) {
    console.error('Error creating medicine:', error)
    return { success: false, error: error.message || 'Gagal menambahkan obat' }
  }
}

/**
 * Seed default medical actions/procedures if they don't exist yet.
 */
export async function seedDefaultMedicalActions() {
  await requireAuth()
  const defaultActions = [
    {
      name: 'Injeksi / Obat Suntik (Dexamethasone / Neurobion)',
      code: 'TND-001',
      unit: 'Kali',
      category: 'Tindakan / Layanan Medis',
      unitPrice: 35000,
      purchasePrice: 10000,
      minStock: 0,
    },
    {
      name: 'Terapi Nebulizer (Inhalasi / Uap)',
      code: 'TND-002',
      unit: 'Kali',
      category: 'Tindakan / Layanan Medis',
      unitPrice: 50000,
      purchasePrice: 15000,
      minStock: 0,
    },
    {
      name: 'Rawat & Jahit Luka ringan-sedang',
      code: 'TND-003',
      unit: 'Tindakan',
      category: 'Tindakan / Layanan Medis',
      unitPrice: 75000,
      purchasePrice: 20000,
      minStock: 0,
    },
    {
      name: 'Pemasangan Infus & Cairan RL/PZ',
      code: 'TND-004',
      unit: 'Paket',
      category: 'Tindakan / Layanan Medis',
      unitPrice: 85000,
      purchasePrice: 30000,
      minStock: 0,
    },
    {
      name: 'Pemeriksaan EKG / Rekam Jantung',
      code: 'TND-005',
      unit: 'Pemeriksaan',
      category: 'Tindakan / Layanan Medis',
      unitPrice: 60000,
      purchasePrice: 10000,
      minStock: 0,
    },
  ]

  const tenYearsLater = new Date()
  tenYearsLater.setFullYear(tenYearsLater.getFullYear() + 10)

  for (const act of defaultActions) {
    const existing = await prisma.medicine.findFirst({
      where: { name: act.name },
    })

    if (!existing) {
      const created = await prisma.medicine.create({
        data: {
          name: act.name,
          code: act.code,
          unit: act.unit,
          category: act.category,
          unitPrice: act.unitPrice,
          purchasePrice: act.purchasePrice,
          minStock: act.minStock,
          isActive: true,
        },
      })

      await prisma.medicineBatch.create({
        data: {
          medicineId: created.id,
          batchNumber: `PROC-${act.code}`,
          stockQuantity: 9999,
          initialQuantity: 9999,
          expiryDate: tenYearsLater,
          receivedDate: new Date(),
        },
      })
    }
  }

  try {
    revalidatePath('/obat')
    revalidatePath('/antrean')
  } catch {}
}


/**
 * Update existing medicine details (PERAWAT ONLY).
 */
export async function updateMedicine(
  id: number,
  data: {
    name?: string
    code?: string
    unit?: string
    category?: string
    unitPrice?: number
    purchasePrice?: number
    minStock?: number
    isActive?: boolean
  }
) {
  try {
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  if (data.unitPrice !== undefined && data.unitPrice < 0) {
    return { success: false, error: 'Harga jual tidak boleh negatif' }
  }

  if (data.minStock !== undefined && data.minStock < 0) {
    return { success: false, error: 'Minimum stok tidak boleh negatif' }
  }

  try {
    const updated = await prisma.medicine.update({
      where: { id: Number(id) },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.code !== undefined ? { code: data.code.trim() || null } : {}),
        ...(data.unit !== undefined ? { unit: data.unit.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category.trim() } : {}),
        ...(data.unitPrice !== undefined ? { unitPrice: Number(data.unitPrice) } : {}),
        ...(data.purchasePrice !== undefined ? { purchasePrice: Number(data.purchasePrice) } : {}),
        ...(data.minStock !== undefined ? { minStock: Number(data.minStock) } : {}),
        ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
      },
    })

    try {
      revalidatePath('/obat')
      revalidatePath('/resep')
    } catch {}

    return { success: true, medicine: updated }
  } catch (error: any) {
    console.error('Error updating medicine:', error)
    return { success: false, error: error.message || 'Gagal memperbarui obat' }
  }
}

/**
 * Add / Receive a new stock batch for a medicine (PERAWAT ONLY).
 */
export async function addMedicineBatch(data: {
  medicineId: number
  batchNumber: string
  stockQuantity: number
  expiryDate: string | Date
}) {
  try {
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  if (!data.medicineId) {
    return { success: false, error: 'Obat wajib dipilih' }
  }

  if (!data.batchNumber || data.batchNumber.trim() === '') {
    return { success: false, error: 'Nomor batch wajib diisi' }
  }

  if (data.stockQuantity === undefined || data.stockQuantity <= 0) {
    return { success: false, error: 'Jumlah stok harus lebih besar dari 0' }
  }

  if (!data.expiryDate) {
    return { success: false, error: 'Tanggal kedaluwarsa wajib diisi' }
  }

  const expiry = new Date(data.expiryDate)
  if (isNaN(expiry.getTime())) {
    return { success: false, error: 'Tanggal kedaluwarsa tidak valid' }
  }

  try {
    const existingBatches = await prisma.medicineBatch.findMany({
      where: { medicineId: Number(data.medicineId) },
    })
    const prevStock = existingBatches.reduce((sum, b) => sum + (new Date(b.expiryDate) >= new Date() ? b.stockQuantity : 0), 0)

    const batch = await prisma.medicineBatch.create({
      data: {
        medicineId: Number(data.medicineId),
        batchNumber: data.batchNumber.trim(),
        stockQuantity: Number(data.stockQuantity),
        initialQuantity: Number(data.stockQuantity),
        expiryDate: expiry,
        receivedDate: new Date(),
      },
    })

    const user = await getCurrentUser()
    await (prisma as any).stockMovement.create({
      data: {
        medicineId: Number(data.medicineId),
        batchId: batch.id,
        type: 'IN',
        quantity: Number(data.stockQuantity),
        previousStock: prevStock,
        currentStock: prevStock + Number(data.stockQuantity),
        notes: 'Penerimaan Stok Batch Baru',
        referenceNo: data.batchNumber.trim(),
        createdById: user?.id || null,
        createdByName: user?.name || 'Staf Perawat',
      },
    })

    try {
      revalidatePath('/obat')
      revalidatePath('/resep')
    } catch {}

    return { success: true, batch }
  } catch (error: any) {
    console.error('Error adding medicine batch:', error)
    return { success: false, error: error.message || 'Gagal menambahkan batch stok' }
  }
}

/**
 * Fetch all batches for a specific medicine.
 */
export async function getMedicineBatches(medicineId: number) {
  await requireAuth()

  try {
    const batches = await prisma.medicineBatch.findMany({
      where: { medicineId: Number(medicineId) },
      orderBy: { expiryDate: 'asc' },
    })

    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    return batches.map((b) => ({
      ...b,
      isExpired: new Date(b.expiryDate) < now && b.stockQuantity > 0,
      isNearExpiry:
        new Date(b.expiryDate) >= now &&
        new Date(b.expiryDate) <= thirtyDaysFromNow &&
        b.stockQuantity > 0,
    }))
  } catch (error: any) {
    console.error('Error fetching medicine batches:', error)
    return []
  }
}

/**
 * Update an existing batch (expiry date or stock quantity) (PERAWAT ONLY).
 */
export async function updateMedicineBatch(
  batchId: number,
  data: {
    stockQuantity?: number
    expiryDate?: string | Date
    batchNumber?: string
  }
) {
  try {
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  try {
    const updateData: any = {}
    if (data.stockQuantity !== undefined) updateData.stockQuantity = Number(data.stockQuantity)
    if (data.batchNumber !== undefined) updateData.batchNumber = data.batchNumber.trim()
    if (data.expiryDate) {
      const expiry = new Date(data.expiryDate)
      if (!isNaN(expiry.getTime())) updateData.expiryDate = expiry
    }

    const updated = await prisma.medicineBatch.update({
      where: { id: Number(batchId) },
      data: updateData,
    })

    try {
      revalidatePath('/obat')
      revalidatePath('/resep')
    } catch {}

    return { success: true, batch: updated }
  } catch (error: any) {
    console.error('Error updating medicine batch:', error)
    return { success: false, error: error.message || 'Gagal memperbarui batch stok' }
  }
}

/**
 * Delete a medicine batch (PERAWAT ONLY).
 */
export async function deleteMedicineBatch(batchId: number) {
  try {
    await requireRole('PERAWAT')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

  try {
    const batch = await prisma.medicineBatch.findUnique({
      where: { id: Number(batchId) },
    })

    if (batch) {
      const now = new Date()
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      const expiry = new Date(batch.expiryDate)

      const isExp = expiry < now
      const isNearExp = expiry >= now && expiry <= sixtyDaysFromNow
      const isDisposal = isExp || isNearExp

      const user = await getCurrentUser()
      await (prisma as any).stockMovement.create({
        data: {
          medicineId: batch.medicineId,
          batchId: null,
          type: isDisposal ? 'EXPIRED_DISPOSAL' : 'OUT',
          quantity: -batch.stockQuantity,
          previousStock: batch.stockQuantity,
          currentStock: 0,
          notes: isExp
            ? `Pemusnahan Batch Kadaluarsa (${batch.batchNumber})`
            : isNearExp
            ? `Pemusnahan Batch Mendekati ED (${batch.batchNumber})`
            : `Penghapusan Batch Stok (${batch.batchNumber})`,
          referenceNo: batch.batchNumber,
          createdById: user?.id || null,
          createdByName: user?.name || 'Staf Perawat',
        },
      })
    }

    await prisma.medicineBatch.delete({
      where: { id: Number(batchId) },
    })

    try {
      revalidatePath('/obat')
      revalidatePath('/resep')
    } catch {}

    return { success: true }
  } catch (error: any) {
    console.error('Error deleting medicine batch:', error)
    return { success: false, error: error.message || 'Gagal menghapus batch stok' }
  }
}

export interface StockMovementLogItem {
  id: number
  medicineId: number
  medicineName: string
  medicineCode: string | null
  batchId: number | null
  batchNumber: string | null
  type: 'IN' | 'OUT' | 'DISPENSE' | 'ADJUSTMENT' | 'EXPIRED_DISPOSAL'
  quantity: number
  previousStock: number
  currentStock: number
  notes: string | null
  referenceNo: string | null
  createdByName: string
  createdAt: Date
}

/**
 * Fetch all stock movement logs across medicines or for a specific medicine.
 */
export async function getStockMovements(medicineId?: number): Promise<StockMovementLogItem[]> {
  await requireAuth()

  try {
    const movements = await (prisma as any).stockMovement.findMany({
      where: medicineId ? { medicineId: Number(medicineId) } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        medicine: { select: { name: true, code: true } },
        batch: { select: { batchNumber: true } },
      },
    })

    return movements.map((m: any) => ({
      id: m.id,
      medicineId: m.medicineId,
      medicineName: m.medicine?.name || 'Obat',
      medicineCode: m.medicine?.code || null,
      batchId: m.batchId,
      batchNumber: m.batch?.batchNumber || null,
      type: m.type as any,
      quantity: m.quantity,
      previousStock: m.previousStock,
      currentStock: m.currentStock,
      notes: m.notes,
      referenceNo: m.referenceNo,
      createdByName: m.createdByName,
      createdAt: m.createdAt,
    }))
  } catch (error) {
    console.error('Error fetching stock movements:', error)
    return []
  }
}

/**
 * Create a manual stock adjustment or disposal log (PERAWAT ONLY)
 */
export async function createManualStockAdjustment(data: {
  medicineId: number
  batchId?: number
  type: 'ADJUSTMENT' | 'EXPIRED_DISPOSAL' | 'IN' | 'OUT'
  quantity: number
  notes: string
}) {
  const user = await requireRole('PERAWAT')
  if (!data.medicineId) return { success: false, error: 'Obat wajib dipilih' }
  if (!data.quantity || data.quantity === 0) return { success: false, error: 'Jumlah stok mutasi harus diisi' }

  try {
    let prevStock = 0
    let currStock = 0

    if (data.batchId) {
      const batch = await prisma.medicineBatch.findUnique({ where: { id: Number(data.batchId) } })
      if (!batch) return { success: false, error: 'Batch stok tidak ditemukan' }

      prevStock = batch.stockQuantity
      currStock = Math.max(0, prevStock + data.quantity)

      await prisma.medicineBatch.update({
        where: { id: batch.id },
        data: { stockQuantity: currStock },
      })
    } else {
      const medBatches = await prisma.medicineBatch.findMany({ where: { medicineId: Number(data.medicineId) } })
      prevStock = medBatches.reduce((acc, b) => acc + b.stockQuantity, 0)
      currStock = Math.max(0, prevStock + data.quantity)
    }

    await (prisma as any).stockMovement.create({
      data: {
        medicineId: Number(data.medicineId),
        batchId: data.batchId ? Number(data.batchId) : null,
        type: data.type,
        quantity: Number(data.quantity),
        previousStock: prevStock,
        currentStock: currStock,
        notes: data.notes || 'Penyesuaian Stok Manual',
        referenceNo: `MANUAL-${Date.now().toString().slice(-6)}`,
        createdById: user.id,
        createdByName: user.name,
      },
    })

    try {
      revalidatePath('/obat')
      revalidatePath('/resep')
    } catch {}

    return { success: true }
  } catch (error: any) {
    console.error('Error creating stock adjustment:', error)
    return { success: false, error: error.message || 'Gagal menyimpan penyesuaian stok' }
  }
}
