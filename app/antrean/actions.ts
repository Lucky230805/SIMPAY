'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth'


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
  await requireAuth()
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
    return []
  }
}

export interface PublicQueueItem {
  id: number
  queueNumber: number
  status: string
  polyclinic: string | null
  date: Date
}

/**
 * Fetch public-safe queue entries for waiting room TV display.
 * Returns ONLY non-sensitive fields (queueNumber, status, polyclinic, date).
 * Strictly excludes patient identity, medical records, and billing data.
 * Public endpoint: NO AUTH REQUIRED.
 */
export async function getPublicQueueDisplay(polyclinic?: string): Promise<PublicQueueItem[]> {
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
        ...(polyclinic && polyclinic !== 'semua' ? { polyclinic } : {}),
      },
      orderBy: [{ polyclinic: 'asc' }, { queueNumber: 'asc' }],
      select: {
        id: true,
        queueNumber: true,
        status: true,
        polyclinic: true,
        date: true,
      },
    })

    return queues as PublicQueueItem[]
  } catch (error: any) {
    console.error('Error fetching public queue display data:', error)
    return []
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
  await requireAuth()
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
    return null
  }
}

/**
 * Transition a queue entry from MENUNGGU → DALAM_PEMERIKSAAN.
 */
export async function startExamination(queueId: number) {
  try {
    await requireRole('DOKTER')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }

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
  await requireAuth()
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
              include: {
                prescriptions: true,
              },
            },
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
  respiratoryRate?: string
  weight?: string
  height?: string
  spo2?: string
  allergy?: string
  pastHistory?: string
  objectiveNotes: string
  diagnosis: string
  icd10Code?: string
  secondaryDiagnosis?: string
  actionTreatment?: string
  medicines: { nama: string; dosis: string; jumlah: string }[]
}) {
  let doctorUser: any
  try {
    doctorUser = await requireRole('DOKTER')
  } catch (err: any) {
    return { success: false, error: err.message || 'Akses ditolak' }
  }
  try {
    await prisma.$transaction(async (tx) => {
      const vitalsArr = [
        data.bloodPressure ? `TD: ${data.bloodPressure} mmHg` : null,
        data.pulse ? `Nadi: ${data.pulse} x/m` : null,
        data.temperature ? `Suhu: ${data.temperature} °C` : null,
        data.respiratoryRate ? `RR: ${data.respiratoryRate} x/m` : null,
        data.weight ? `BB: ${data.weight} kg` : null,
        data.height ? `TB: ${data.height} cm` : null,
        data.spo2 ? `SpO2: ${data.spo2}%` : null,
      ].filter(Boolean)

      const vitalInfo = vitalsArr.length > 0 ? vitalsArr.join(', ') : '-'
      const medInfo = data.medicines
        .filter((m) => m.nama && m.nama.trim() !== '')
        .map((m) => `- ${m.nama} (${m.dosis || '-'}, Jml: ${m.jumlah || '0'})`)
        .join('\n')

      const historyText = data.pastHistory ? `Riwayat Penyakit: ${data.pastHistory}\n` : ''
      const complaintFull = `${data.complaint || ''}\n${historyText}`.trim()
      const actionText = data.actionTreatment ? `Tindakan & Edukasi:\n${data.actionTreatment}\n\n` : ''
      const treatmentText = `${actionText}Tanda Vital:\n${vitalInfo}\nCatatan Objektif: ${data.objectiveNotes || '-'}\n\nResep Obat:\n${medInfo || 'Tidak ada resep'}`

      // 1. Cek apakah Rekam Medis untuk antrean ini sudah pernah dibuat sebelumnya
      const existingMR = await tx.medicalRecord.findFirst({
        where: { queueId: Number(data.queueId) },
      })

      const recordData = {
        patientId: Number(data.patientId),
        queueId: Number(data.queueId),
        doctorId: doctorUser.id,
        examinationDate: new Date(),
        complaint: complaintFull || 'Pemeriksaan Umum',
        diagnosis: String(data.diagnosis || 'Pemeriksaan Umum'),
        icd10Code: data.icd10Code ? String(data.icd10Code) : null,
        secondaryDiagnosis: data.secondaryDiagnosis ? String(data.secondaryDiagnosis) : null,
        treatment: String(treatmentText),
        bloodPressure: data.bloodPressure ? `${data.bloodPressure} mmHg` : null,
        temperature: data.temperature ? `${data.temperature} °C` : null,
        heartRate: data.pulse ? `${data.pulse} x/m` : null,
        respiratoryRate: data.respiratoryRate ? `${data.respiratoryRate} x/m` : null,
        allergy: data.allergy ? String(data.allergy) : null,
        notes: data.objectiveNotes ? String(data.objectiveNotes) : null,
        status: 'SELESAI',
      }

      let createdRecord
      if (existingMR) {
        createdRecord = await tx.medicalRecord.update({
          where: { id: existingMR.id },
          data: recordData,
        })
        // Hapus resep lama agar dapat diperbarui dengan resep baru
        await tx.prescription.deleteMany({
          where: { medicalRecordId: existingMR.id },
        })
      } else {
        createdRecord = await tx.medicalRecord.create({
          data: recordData,
        })
      }

      // 2. Simpan relasi Prescription dengan quantity & unit price persisten
      let totalMedicineFee = 0
      const validMedicines = data.medicines.filter((m) => m.nama && m.nama.trim() !== '')
      if (validMedicines.length > 0) {
        for (const m of validMedicines) {
          const qty = Math.max(1, parseInt(m.jumlah || '10', 10) || 1)
          const nameTrimmed = m.nama.trim()

          const matchingMed = await tx.medicine.findFirst({
            where: { name: nameTrimmed },
          })

          const unitPrice = matchingMed ? matchingMed.unitPrice : 15000
          const totalPrice = qty * unitPrice
          totalMedicineFee += totalPrice

          await tx.prescription.create({
            data: {
              patientId: Number(data.patientId),
              medicalRecordId: createdRecord.id,
              medicineId: matchingMed ? matchingMed.id : null,
              medicineName: nameTrimmed,
              dosage: m.dosis?.trim() || '1x1',
              instructions: m.jumlah ? `Jumlah: ${m.jumlah}` : null,
              quantity: qty,
              unitPrice: unitPrice,
              totalPrice: totalPrice,
            },
          })
        }
      }

      // 3. Buat atau perbarui Billing otomatis untuk kunjungan ini
      const consultationFee = 50000
      const totalAmount = consultationFee + totalMedicineFee

      const existingBilling = await tx.billing.findFirst({
        where: { queueId: Number(data.queueId) },
      })

      if (existingBilling) {
        if (existingBilling.status === 'BELUM_LUNAS') {
          await tx.billing.update({
            where: { id: existingBilling.id },
            data: {
              medicineFee: totalMedicineFee,
              totalAmount: totalAmount,
            },
          })
        }
      } else {
        await tx.billing.create({
          data: {
            patientId: Number(data.patientId),
            queueId: Number(data.queueId),
            medicalRecordId: createdRecord.id,
            registrationFee: 0,
            consultationFee: consultationFee,
            medicineFee: totalMedicineFee,
            otherFee: 0,
            totalAmount: totalAmount,
            status: 'BELUM_LUNAS',
          },
        })
      }

      // 4. Ubah status antrean menjadi MENUNGGU_OBAT_DAN_BAYAR (Pasien berlanjut ke Apotik/Kasir)
      await tx.queue.update({
        where: { id: Number(data.queueId) },
        data: { status: 'MENUNGGU_OBAT_DAN_BAYAR' },
      })

      return createdRecord
    })

    try {
      revalidatePath('/antrean')
      revalidatePath('/resep')
      revalidatePath('/rekam-medis')
      revalidatePath(`/antrean/${data.queueId}`)
    } catch {
      // Ignored outside request context
    }
    return { success: true }
  } catch (error: any) {
    console.error('Error saving medical record:', error)
    return { success: false, error: error.message || 'Gagal menyimpan rekam medis' }
  }
}