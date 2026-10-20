'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getSessionUserAction } from '@/app/login/actions'

export interface ProcedureItem {
  id: number
  code: string | null
  name: string
  tariff: number
  category: string | null
  description: string | null
  isActive: boolean
  createdAt: Date
  usageCount?: number
}

export async function getProceduresAction(
  search?: string,
  category?: string
): Promise<{ success: boolean; data?: ProcedureItem[]; error?: string }> {
  try {
    const whereClause: any = {}

    if (search && search.trim() !== '') {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { code: { contains: search.trim(), mode: 'insensitive' } },
        { category: { contains: search.trim(), mode: 'insensitive' } },
      ]
    }

    if (category && category !== 'ALL') {
      whereClause.category = category
    }

    const items = await (prisma as any).procedure.findMany({
      where: whereClause,
      orderBy: [{ isActive: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { patientProcedures: true },
        },
      },
    })

    const mapped = items.map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      tariff: p.tariff,
      category: p.category,
      description: p.description,
      isActive: p.isActive,
      createdAt: p.createdAt,
      usageCount: p._count?.patientProcedures || 0,
    }))

    return { success: true, data: mapped }
  } catch (err: any) {
    console.error('getProceduresAction error:', err)
    return { success: false, error: err?.message || 'Gagal mengambil data tindakan' }
  }
}

export async function getActiveProceduresForDoctor(): Promise<ProcedureItem[]> {
  try {
    const items = await (prisma as any).procedure.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return items.map((p: any) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      tariff: p.tariff,
      category: p.category,
      description: p.description,
      isActive: p.isActive,
      createdAt: p.createdAt,
    }))
  } catch (err) {
    console.error('getActiveProceduresForDoctor error:', err)
    return []
  }
}

export async function createProcedureAction(input: {
  code?: string
  name: string
  tariff: number
  category?: string
  description?: string
}): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const user = await getSessionUserAction()
    if (!user) {
      return { success: false, error: 'Sesi kedaluwarsa, silakan login kembali' }
    }

    if (!input.name || input.name.trim() === '') {
      return { success: false, error: 'Nama tindakan wajib diisi' }
    }

    if (input.tariff < 0) {
      return { success: false, error: 'Tarif tindakan tidak boleh negatif' }
    }

    const created = await (prisma as any).procedure.create({
      data: {
        code: input.code ? input.code.trim() : null,
        name: input.name.trim(),
        tariff: Number(input.tariff) || 0,
        category: input.category ? input.category.trim() : 'Tindakan Umum',
        description: input.description ? input.description.trim() : null,
        isActive: true,
      },
    })

    revalidatePath('/tindakan')
    revalidatePath('/antrean')
    return { success: true, data: created }
  } catch (err: any) {
    console.error('createProcedureAction error:', err)
    return { success: false, error: err?.message || 'Gagal menambahkan tindakan medis' }
  }
}

export async function updateProcedureAction(
  id: number,
  input: {
    code?: string
    name: string
    tariff: number
    category?: string
    description?: string
    isActive?: boolean
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getSessionUserAction()
    if (!user) {
      return { success: false, error: 'Sesi kedaluwarsa, silakan login kembali' }
    }

    if (!input.name || input.name.trim() === '') {
      return { success: false, error: 'Nama tindakan wajib diisi' }
    }

    await (prisma as any).procedure.update({
      where: { id },
      data: {
        code: input.code ? input.code.trim() : null,
        name: input.name.trim(),
        tariff: Number(input.tariff) || 0,
        category: input.category ? input.category.trim() : 'Tindakan Umum',
        description: input.description ? input.description.trim() : null,
        isActive: input.isActive !== undefined ? input.isActive : true,
      },
    })

    revalidatePath('/tindakan')
    revalidatePath('/antrean')
    return { success: true }
  } catch (err: any) {
    console.error('updateProcedureAction error:', err)
    return { success: false, error: err?.message || 'Gagal memperbarui tindakan medis' }
  }
}

export async function deleteProcedureAction(
  id: number
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const user = await getSessionUserAction()
    if (!user) {
      return { success: false, error: 'Sesi kedaluwarsa, silakan login kembali' }
    }

    // Check if this procedure has been used in clinical records
    const usageCount = await (prisma as any).patientProcedure.count({
      where: { procedureId: id },
    })

    if (usageCount > 0) {
      // Soft-delete (deactivate) to protect historical medical record integrity
      await (prisma as any).procedure.update({
        where: { id },
        data: { isActive: false },
      })
      revalidatePath('/tindakan')
      revalidatePath('/antrean')
      return {
        success: true,
        message: `Tindakan telah dinonaktifkan karena sudah digunakan pada ${usageCount} riwayat rekam medis pasien.`,
      }
    }

    await (prisma as any).procedure.delete({
      where: { id },
    })

    revalidatePath('/tindakan')
    revalidatePath('/antrean')
    return { success: true, message: 'Tindakan medis berhasil dihapus' }
  } catch (err: any) {
    console.error('deleteProcedureAction error:', err)
    return { success: false, error: err?.message || 'Gagal menghapus tindakan' }
  }
}

export async function toggleProcedureStatusAction(
  id: number,
  currentStatus: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await (prisma as any).procedure.update({
      where: { id },
      data: { isActive: !currentStatus },
    })
    revalidatePath('/tindakan')
    revalidatePath('/antrean')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal mengubah status' }
  }
}
