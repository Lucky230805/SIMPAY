'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface QueueItem {
  id: number
  patientId: number
  queueNumber: number
  status: string
  polyclinic: string | null
  date: Date
  patient: {
    id: number
    name: string
    dateOfBirth: Date
    gender: string
    address: string | null
    phone: string | null
  }
}

/**
 * Fetch all queue entries for today, ordered by queueNumber.
 * "Today" is defined as from 00:00:00 to 23:59:59 of the current local day.
 */
export async function getTodayQueues(): Promise<QueueItem[]> {
  const today = new Date()
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setHours(23, 59, 59, 999)

  try {
    const queues = await prisma.queue.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ polyclinic: 'asc' }, { queueNumber: 'asc' }],
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            phone: true,
          },
        },
      },
    })

    return queues as QueueItem[]
  } catch (error: any) {
    console.error('Error fetching today queues:', error)
    throw new Error('Gagal mengambil data antrean hari ini')
  }
}

export interface QueueWithPatientDetail {
  id: number
  patientId: number
  queueNumber: number
  status: string
  polyclinic: string | null
  date: Date
  patient: {
    id: number
    name: string
    dateOfBirth: Date
    gender: string
    address: string | null
    phone: string | null
    medicalRecords: {
      id: number
      examinationDate: Date
      complaint: string | null
      diagnosis: string | null
      treatment: string | null
      icd10Code: string | null
    }[]
  }
}

/**
 * Fetch a single queue entry with full patient detail and recent medical records.
 */
export async function getQueueWithPatient(queueId: number): Promise<QueueWithPatientDetail | null> {
  try {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        patient: {
          include: {
            medicalRecords: {
              orderBy: { examinationDate: 'desc' },
              take: 5,
              select: {
                id: true,
                examinationDate: true,
                complaint: true,
                diagnosis: true,
                treatment: true,
                icd10Code: true,
              },
            },
          },
        },
      },
    })

    return queue as QueueWithPatientDetail | null
  } catch (error: any) {
    console.error(`Error fetching queue ${queueId}:`, error)
    throw new Error('Gagal mengambil data antrean')
  }
}

/**
 * Transition a queue entry from MENUNGGU → DALAM_PEMERIKSAAN.
 */
export async function startExamination(queueId: number) {
  try {
    const queue = await prisma.queue.findUnique({ where: { id: queueId } })
    if (!queue) {
      return { success: false, error: 'Antrean tidak ditemukan' }
    }

    if (queue.status !== 'MENUNGGU') {
      return { success: false, error: 'Pasien tidak dalam status menunggu' }
    }

    await prisma.queue.update({
      where: { id: queueId },
      data: { status: 'DALAM_PEMERIKSAAN' },
    })

    try {
      revalidatePath('/antrean')
    } catch {
      // Ignored outside request context
    }

    return { success: true }
  } catch (error: any) {
    console.error(`Error starting examination for queue ${queueId}:`, error)
    return {
      success: false,
      error: 'Gagal memulai pemeriksaan: ' + (error.message || 'Kesalahan server'),
    }
  }
}

/**
 * Fetch single queue by ID with patient details and medical records history.
 */
export async function getQueueById(id: number) {
  try {
    const queue = await prisma.queue.findUnique({
      where: {
        id: id
      },
      include: {
        patient: {
          include: {
            medicalRecords: {
              orderBy: { examinationDate: 'desc' },
              take: 5,
            }
          }
        }
      }
    });

    return queue;
  } catch (error) {
    console.error("Gagal mengambil detail antrean:", error);
    return null;
  }
}

/**
 * Save medical record data, prescriptions, and mark queue as SELESAI inside a transaction.
 */
export async function saveMedicalRecordAndComplete(data: {
  queueId: number
  patientId: number
  complaint: string
  bloodPressure: string
  pulse: string
  temperature: string
  weight: string
  objectiveNotes: string
  diagnosis: string
  medicines: { nama: string; dosis: string; jumlah: string }[]
}) {
  try {
    await prisma.$transaction(async (tx) => {
      const vitalInfo = `TD: ${data.bloodPressure || '-'} mmHg, Nadi: ${data.pulse || '-'} x/m, Suhu: ${data.temperature || '-'} °C, BB: ${data.weight || '-'} kg`
      const medInfo = data.medicines
        .filter(m => m.nama && m.nama.trim() !== '')
        .map(m => `- ${m.nama} (${m.dosis || '-'}, Jml: ${m.jumlah || '0'})`)
        .join('\n')

      const treatmentText = `Tanda Vital:\n${vitalInfo}\nCatatan Objektif: ${data.objectiveNotes || '-'}\n\nResep Obat:\n${medInfo || 'Tidak ada resep'}`

      // 1. Simpan Rekam Medis ke Database dengan menyertakan examinationDate
      const createdRecord = await tx.medicalRecord.create({
        data: {
          patientId: Number(data.patientId),
          examinationDate: new Date(),
          complaint: String(data.complaint || ''),
          diagnosis: String(data.diagnosis || 'Pemeriksaan Umum'),
          treatment: String(treatmentText),
        },
      })

      // 2. Simpan relasi Prescription jika ada resep obat
      const validMedicines = data.medicines.filter(m => m.nama && m.nama.trim() !== '')
      if (validMedicines.length > 0) {
        await Promise.all(
          validMedicines.map(m =>
            tx.prescription.create({
              data: {
                patientId: Number(data.patientId),
                medicalRecordId: createdRecord.id,
                medicineName: m.nama.trim(),
                dosage: m.dosis?.trim() || '1x1',
                instructions: m.jumlah ? `Jumlah: ${m.jumlah}` : null,
              },
            })
          )
        )
      }

      // 3. Ubah status antrean menjadi SELESAI
      await tx.queue.update({
        where: { id: Number(data.queueId) },
        data: { status: 'SELESAI' },
      })

      return createdRecord
    })

    revalidatePath('/antrean')
    revalidatePath('/resep')
    revalidatePath(`/antrean/${data.queueId}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error saving medical record:', error)
    return { success: false, error: error.message || 'Gagal menyimpan rekam medis' }
  }
}