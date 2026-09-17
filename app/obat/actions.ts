'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth'

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
  alertStatus: 'NORMAL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEAR_EXPIRY' | 'EXPIRED'
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
  }[]
}

export interface MedicineAlertSummary {
  expiredCount: number
  nearExpiryCount: number
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

    return medicines.map((med) => {
      let availableStock = 0
      let expiredStock = 0
      let nearExpiryBatchesCount = 0

      const mappedBatches = med.batches.map((b) => {
        const expiry = new Date(b.expiryDate)
        const isExpired = expiry < now && b.stockQuantity > 0
        const isNearExpiry = expiry >= now && expiry <= thirtyDaysFromNow && b.stockQuantity > 0

        if (expiry >= now) {
          availableStock += b.stockQuantity
        } else {
          expiredStock += b.stockQuantity
        }

        if (isNearExpiry) {
          nearExpiryBatchesCount += 1
        }

        return {
          id: b.id,
          batchNumber: b.batchNumber,
          stockQuantity: b.stockQuantity,
          initialQuantity: b.initialQuantity,
          expiryDate: b.expiryDate,
          receivedDate: b.receivedDate,
          isExpired,
          isNearExpiry,
        }
      })

      // Determine primary alert status
      let alertStatus: MedicineItem['alertStatus'] = 'NORMAL'
      if (availableStock === 0) {
        alertStatus = 'OUT_OF_STOCK'
      } else if (expiredStock > 0) {
        alertStatus = 'EXPIRED'
      } else if (availableStock <= med.minStock) {
        alertStatus = 'LOW_STOCK'
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
      if (med.nearExpiryBatchesCount > 0) {
        nearExpiryCount++
      }
    }

    return {
      expiredCount,
      nearExpiryCount,
      lowStockCount,
      outOfStockCount,
    }
  } catch (error: any) {
    console.error('Error fetching medicine alerts:', error)
    return {
      expiredCount: 0,
      nearExpiryCount: 0,
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
