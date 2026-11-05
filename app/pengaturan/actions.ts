'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'

export interface ClinicProfileData {
  id?: number
  name: string
  legalName?: string | null
  licenseNumber?: string | null
  address: string
  phone?: string | null
  email?: string | null
  website?: string | null
  logoUrl?: string | null
  stampUrl?: string | null
  headerType?: string | null
  primaryDoctorName: string
  primaryDoctorSip: string
  secondaryDoctorName?: string | null
  secondaryDoctorSip?: string | null
  defaultRegistrationFee: number
  defaultConsultationFee: number
}

const DEFAULT_PROFILE = {
  name: 'KLINIK PRAKTEK DOKTER UMUM',
  legalName: 'Klinik Pratama SIMPAY',
  licenseNumber: '446.1/0085/DPMPTSP/SIP-3/DUM/VI/2020',
  address: 'Perumahan Permata Hijau 2, Blok A59, Cinangsi, Kec. Cibogo, Kabupaten Subang, Jawa Barat',
  phone: '0812-3456-7890',
  email: 'klinik.simpay@gmail.com',
  headerType: 'PRAKTEK UMUM',
  primaryDoctorName: 'dr. RANIISYANA R. REKKERS',
  primaryDoctorSip: 'SIP : No. 446.1/0085/DPMPTSP/SIP-3/DUM/VI/2020',
  secondaryDoctorName: 'dr. FARISI',
  secondaryDoctorSip: 'SIP : No. 446.1/0086/DPMPTSP/SIP-3/DUM/VI/2020',
  defaultRegistrationFee: 0,
  defaultConsultationFee: 50000,
}

/**
 * Fetch the clinic profile. If none exists, creates and returns the default profile.
 */
export async function getClinicProfile(): Promise<ClinicProfileData> {
  try {
    let profile = await prisma.clinicProfile.findFirst({
      orderBy: { id: 'asc' },
    })

    if (!profile) {
      profile = await prisma.clinicProfile.create({
        data: DEFAULT_PROFILE,
      })
    }

    return profile
  } catch (error) {
    console.error('Failed to get clinic profile, returning default fallback:', error)
    return {
      id: 1,
      ...DEFAULT_PROFILE,
    }
  }
}

/**
 * Update the clinic profile settings.
 */
export async function updateClinicProfile(data: ClinicProfileData) {
  await requireAuth()

  if (!data.name || data.name.trim().length < 2) {
    return { success: false, error: 'Nama klinik wajib diisi (minimal 2 karakter).' }
  }

  if (!data.address || data.address.trim().length < 5) {
    return { success: false, error: 'Alamat lengkap klinik wajib diisi (minimal 5 karakter).' }
  }

  if (!data.primaryDoctorName || data.primaryDoctorName.trim().length < 2) {
    return { success: false, error: 'Nama dokter utama / penanggung jawab wajib diisi.' }
  }

  try {
    const existing = await prisma.clinicProfile.findFirst({
      orderBy: { id: 'asc' },
    })

    const cleanData = {
      name: data.name.trim(),
      legalName: data.legalName?.trim() || null,
      licenseNumber: data.licenseNumber?.trim() || null,
      address: data.address.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      website: data.website?.trim() || null,
      logoUrl: data.logoUrl?.trim() || null,
      stampUrl: data.stampUrl?.trim() || null,
      headerType: data.headerType?.trim() || 'PRAKTEK UMUM',
      primaryDoctorName: data.primaryDoctorName.trim(),
      primaryDoctorSip: data.primaryDoctorSip.trim(),
      secondaryDoctorName: data.secondaryDoctorName?.trim() || null,
      secondaryDoctorSip: data.secondaryDoctorSip?.trim() || null,
      defaultRegistrationFee: Math.max(0, Number(data.defaultRegistrationFee) || 0),
      defaultConsultationFee: Math.max(0, Number(data.defaultConsultationFee) || 0),
    }

    let updated
    if (existing) {
      updated = await prisma.clinicProfile.update({
        where: { id: existing.id },
        data: cleanData,
      })
    } else {
      updated = await prisma.clinicProfile.create({
        data: cleanData,
      })
    }

    try {
      revalidatePath('/pengaturan')
      revalidatePath('/pembayaran')
      revalidatePath('/surat')
      revalidatePath('/rekam-medis')
      revalidatePath('/dashboard')
    } catch {}

    return { success: true, profile: updated }
  } catch (error: any) {
    console.error('Error updating clinic profile:', error)
    return {
      success: false,
      error: 'Gagal memperbarui profil klinik: ' + (error.message || 'Kesalahan server'),
    }
  }
}

