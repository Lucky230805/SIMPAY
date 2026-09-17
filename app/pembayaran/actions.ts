'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth'


export interface BillingDetailItem {
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface BillingDetail {
  id: number
  patientId: number
  queueId: number | null
  medicalRecordId: number | null
  registrationFee: number
  consultationFee: number
  medicineFee: number
  otherFee: number
  totalAmount: number
  status: string
  createdAt: Date
  patientName: string
  patientNoRM: string
  doctorName?: string
  polyclinic?: string
  items: BillingDetailItem[]
  payment?: {
    id: number
    paymentNumber: string
    paymentMethod: string
    totalAmount: number
    amountPaid: number
    changeAmount: number
    paymentDate: Date
    processedByName?: string
  } | null
}

export interface ProcessPaymentInput {
  billingId: number
  paymentMethod: 'TUNAI' | 'QRIS' | 'TRANSFER'
  amountPaid: number
  userId?: number
  userRole?: string
}

/**
 * Fetch or generate the Billing for a specific patient visit (Queue).
 * Source of truth is the database persisted records.
 */
export async function getOrCreateBillingForVisit(queueId: number) {
  await requireAuth()
  try {
    const queue = await prisma.queue.findUnique({
      where: { id: Number(queueId) },
      include: {
        patient: true,
        medicalRecord: {
          include: {
            doctor: true,
            prescriptions: true,
          },
        },
        billing: {
          include: {
            payment: {
              include: {
                processedBy: true,
              },
            },
          },
        },
      },
    })

    if (!queue) {
      return { success: false, error: 'Data antrean / kunjungan tidak ditemukan' }
    }

    const patient = queue.patient
    const mr = queue.medicalRecord
    const doctorName = mr?.doctor?.name || 'dr. Raniisyana R.R.'

    // Check if Billing already exists in DB
    let billingRecord = queue.billing

    if (!billingRecord) {
      // Calculate fees from persisted database records
      const registrationFee = 0
      const consultationFee = 50000

      let medicineFee = 0
      if (mr && mr.prescriptions && mr.prescriptions.length > 0) {
        medicineFee = mr.prescriptions.reduce((sum, p) => {
          const qty = p.quantity || 1
          const price = p.unitPrice || 15000
          const itemTotal = p.totalPrice || qty * price
          return sum + itemTotal
        }, 0)
      }

      const totalAmount = registrationFee + consultationFee + medicineFee

      // Persist new Billing record for this visit inside a transaction
      billingRecord = await prisma.$transaction(async (tx) => {
        return await tx.billing.create({
          data: {
            patientId: patient.id,
            queueId: queue.id,
            medicalRecordId: mr?.id || null,
            registrationFee,
            consultationFee,
            medicineFee,
            otherFee: 0,
            totalAmount,
            status: 'BELUM_LUNAS',
          },
          include: {
            payment: {
              include: {
                processedBy: true,
              },
            },
          },
        })
      })
    } else if (billingRecord.status === 'BELUM_LUNAS') {
      // Synchronize / Recalculate medicine fee for UNPAID billings if prescriptions changed
      let currentMedicineFee = 0
      if (mr && mr.prescriptions && mr.prescriptions.length > 0) {
        currentMedicineFee = mr.prescriptions.reduce((sum, p) => {
          const qty = p.quantity || 1
          const price = p.unitPrice || 15000
          const itemTotal = p.totalPrice || qty * price
          return sum + itemTotal
        }, 0)
      }

      const newTotalAmount =
        billingRecord.registrationFee +
        billingRecord.consultationFee +
        currentMedicineFee +
        billingRecord.otherFee

      if (
        billingRecord.medicineFee !== currentMedicineFee ||
        billingRecord.totalAmount !== newTotalAmount
      ) {
        billingRecord = await prisma.billing.update({
          where: { id: billingRecord.id },
          data: {
            medicineFee: currentMedicineFee,
            totalAmount: newTotalAmount,
          },
          include: {
            payment: {
              include: {
                processedBy: true,
              },
            },
          },
        })
      }
    }

    // Build itemized breakdown
    const items: BillingDetailItem[] = [
      {
        name: 'Jasa Konsultasi Dokter',
        quantity: 1,
        unitPrice: billingRecord.consultationFee,
        totalPrice: billingRecord.consultationFee,
      },
    ]

    if (billingRecord.registrationFee > 0) {
      items.unshift({
        name: 'Biaya Pendaftaran & Administrasi',
        quantity: 1,
        unitPrice: billingRecord.registrationFee,
        totalPrice: billingRecord.registrationFee,
      })
    }

    if (mr && mr.prescriptions && mr.prescriptions.length > 0) {
      mr.prescriptions.forEach((p) => {
        const qty = p.quantity || 1
        const unitPrice = p.unitPrice || 15000
        const totalPrice = p.totalPrice || qty * unitPrice
        items.push({
          name: p.medicineName,
          quantity: qty,
          unitPrice,
          totalPrice,
        })
      })
    }

    if (billingRecord.otherFee > 0) {
      let addedActions = false
      if (mr?.treatment && mr.treatment.includes('Tindakan Medis Ditentukan:')) {
        const section = mr.treatment.split('Tindakan Medis Ditentukan:')[1]?.split('\n\n')[0]
        if (section) {
          const lines = section.split('\n').filter((l) => l.trim().startsWith('- '))
          lines.forEach((line) => {
            const match = line.match(/^-\s*(.*?)\s*\(Jml:\s*(\d+),\s*Tarif:\s*Rp\s*([\d\.]+)\)/)
            if (match) {
              const actionName = match[1].trim()
              const qty = parseInt(match[2], 10) || 1
              const unitPrice = parseFloat(match[3].replace(/\./g, '')) || 0
              items.push({
                name: `Tindakan: ${actionName}`,
                quantity: qty,
                unitPrice,
                totalPrice: qty * unitPrice,
              })
              addedActions = true
            }
          })
        }
      }

      if (!addedActions) {
        items.push({
          name: 'Biaya Tindakan Medis & Injeksi',
          quantity: 1,
          unitPrice: billingRecord.otherFee,
          totalPrice: billingRecord.otherFee,
        })
      }
    }

    const billingDetail: BillingDetail = {
      id: billingRecord.id,
      patientId: patient.id,
      queueId: queue.id,
      medicalRecordId: mr?.id || null,
      registrationFee: billingRecord.registrationFee,
      consultationFee: billingRecord.consultationFee,
      medicineFee: billingRecord.medicineFee,
      otherFee: billingRecord.otherFee,
      totalAmount: billingRecord.totalAmount,
      status: billingRecord.status,
      createdAt: billingRecord.createdAt,
      patientName: patient.name,
      patientNoRM: `RM-${patient.id.toString().padStart(5, '0')}`,
      doctorName,
      polyclinic: queue.polyclinic || 'Poli Umum',
      items,
      payment: billingRecord.payment
        ? {
            id: billingRecord.payment.id,
            paymentNumber: billingRecord.payment.paymentNumber,
            paymentMethod: billingRecord.payment.paymentMethod,
            totalAmount: billingRecord.payment.totalAmount,
            amountPaid: billingRecord.payment.amountPaid,
            changeAmount: billingRecord.payment.changeAmount,
            paymentDate: billingRecord.payment.paymentDate,
            processedByName: billingRecord.payment.processedBy?.name || (billingRecord.payment.processedById ? `User #${billingRecord.payment.processedById}` : 'Perawat'),
          }
        : null,
    }

    return { success: true, billing: billingDetail }
  } catch (error: any) {
    console.error('Error fetching/creating billing:', error)
    return { success: false, error: error.message || 'Gagal memuat billing' }
  }
}

/**
 * Server action to process payment.
 * Strict Server-Side Role Authorization: ONLY PERAWAT can process payments.
 * Atomic Prisma Transaction: Creates Payment & updates Billing status to LUNAS simultaneously.
 */
export async function processPayment(input: ProcessPaymentInput) {
  let perawatUser: any
  try {
    perawatUser = await requireRole('PERAWAT')
  } catch (err: any) {
    return {
      success: false,
      error: 'Akses ditolak: Hanya PERAWAT yang berwenang memproses pembayaran.',
    }
  }

  try {
    const { billingId, paymentMethod, amountPaid } = input

    // 2. Fetch Billing
    const billing = await prisma.billing.findUnique({
      where: { id: Number(billingId) },
      include: { payment: true },
    })

    if (!billing) {
      return { success: false, error: 'Data billing tidak ditemukan' }
    }

    // 3. Prevent Already Paid / Duplicate Payment
    if (billing.status === 'LUNAS' || billing.payment) {
      return {
        success: false,
        error: 'Tagihan/Billing ini sudah dilunasi sebelumnya (Duplicate Payment Rejection)',
      }
    }

    // 4. Validate Payment Method
    const validMethods = ['TUNAI', 'QRIS', 'TRANSFER']
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return { success: false, error: 'Metode pembayaran tidak valid. Pilih TUNAI, QRIS, atau TRANSFER' }
    }

    // 5. Validate Amount Paid & Calculate Cash Change
    if (isNaN(amountPaid) || amountPaid <= 0) {
      return { success: false, error: 'Jumlah uang yang dibayarkan tidak valid' }
    }

    let changeAmount = 0

    if (paymentMethod === 'TUNAI') {
      if (amountPaid < billing.totalAmount) {
        return {
          success: false,
          error: `Uang dibayarkan (Rp ${amountPaid.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${billing.totalAmount.toLocaleString('id-ID')})`,
        }
      }
      changeAmount = amountPaid - billing.totalAmount
    } else {
      // QRIS or TRANSFER
      changeAmount = 0
      if (amountPaid < billing.totalAmount) {
        return {
          success: false,
          error: `Pembayaran via ${paymentMethod} (Rp ${amountPaid.toLocaleString('id-ID')}) tidak mencukupi total tagihan (Rp ${billing.totalAmount.toLocaleString('id-ID')})`,
        }
      }
    }

    // 6. Generate Unique Payment Invoice Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const paymentNumber = `INV-${dateStr}-${billing.id.toString().padStart(4, '0')}`

    // 7. Atomic Transaction Safety
    const result = await prisma.$transaction(async (tx) => {
      // Re-verify payment inside transaction block to prevent concurrent double-click
      const currentBilling = await tx.billing.findUnique({
        where: { id: Number(billingId) },
        include: { payment: true },
      })

      if (currentBilling?.status === 'LUNAS' || currentBilling?.payment) {
        throw new Error('Tagihan sudah dilunasi oleh transaksi lain')
      }

      // Create Payment row bound to authenticated perawatUser.id
      const paymentRecord = await tx.payment.create({
        data: {
          billingId: billing.id,
          processedById: perawatUser.id,
          paymentNumber,
          paymentMethod,
          totalAmount: billing.totalAmount,
          amountPaid,
          changeAmount,
          paymentDate: new Date(),
        },
        include: {
          processedBy: true,
        },
      })

      // Update Billing status to LUNAS
      await tx.billing.update({
        where: { id: billing.id },
        data: { status: 'LUNAS' },
      })

      return paymentRecord
    })

    // Evaluate if the Queue can now transition to SELESAI
    if (billing.queueId) {
      await checkAndUpdateQueueCompletion(billing.queueId)
    }

    try {
      revalidatePath('/resep')
      revalidatePath('/antrean')
      revalidatePath('/pembayaran')
    } catch {
      // Ignored outside request context
    }

    return {
      success: true,
      payment: result,
    }
  } catch (error: any) {
    console.error('Error processing payment:', error)
    return {
      success: false,
      error: error.message || 'Gagal memproses transaksi pembayaran',
    }
  }
}

/**
 * Centralized server-side check to determine if a visit (Queue) can transition to SELESAI.
 * A Queue becomes SELESAI if:
 * 1. Billing.status === 'LUNAS'
 * AND
 * 2. (No prescriptions exist OR all prescriptions have status === 'SELESAI')
 */
export async function checkAndUpdateQueueCompletion(queueId: number, tx?: any) {
  try {
    const client = tx || prisma

    const queue = await client.queue.findUnique({
      where: { id: Number(queueId) },
      include: {
        billing: true,
        medicalRecord: {
          include: {
            prescriptions: true,
          },
        },
      },
    })

    if (!queue) return { success: false, reason: 'Antrean tidak ditemukan' }

    const billing = queue.billing
    const isPaid = billing?.status === 'LUNAS'

    const mr = queue.medicalRecord
    const prescriptions = mr?.prescriptions || []
    const hasPrescriptions = prescriptions.length > 0
    const allPrescriptionsHandedOver =
      hasPrescriptions && prescriptions.every((p: any) => p.status === 'SELESAI')

    // Condition A: No prescription & Billing is LUNAS
    // Condition B: Prescriptions exist & all prescriptions are SELESAI & Billing is LUNAS
    const canComplete = isPaid && (!hasPrescriptions || allPrescriptionsHandedOver)

    if (canComplete && queue.status !== 'SELESAI') {
      await client.queue.update({
        where: { id: queue.id },
        data: { status: 'SELESAI' },
      })

      try {
        revalidatePath('/antrean')
        revalidatePath('/resep')
        revalidatePath('/pembayaran')
      } catch {
        // Ignored outside request context
      }

      return { success: true, completed: true }
    }

    return { success: true, completed: queue.status === 'SELESAI' }
  } catch (error: any) {
    console.error(`Error checking queue completion for queue ${queueId}:`, error)
    return { success: false, error: error.message }
  }
}

export interface BillingQueueItem {
  queueId: number
  queueNumber: number
  patientId: number
  patientName: string
  patientNoRM: string
  polyclinic: string
  doctorName: string
  visitDate: Date
  billingId: number | null
  billingStatus: 'BELUM_LUNAS' | 'LUNAS' | 'CANCELLED' | 'BELUM_DITAGIH'
  totalAmount: number
}

/**
 * Fetch recent visits / queues for cashier billing list.
 */
export async function getBillingQueues(): Promise<BillingQueueItem[]> {
  await requireAuth()
  try {
    const queues = await prisma.queue.findMany({
      orderBy: { date: 'desc' },
      take: 30,
      include: {
        patient: true,
        medicalRecord: {
          include: {
            doctor: true,
          },
        },
        billing: true,
      },
    })

    return queues.map((q: any) => {
      const b = q.billing
      let status: 'BELUM_LUNAS' | 'LUNAS' | 'CANCELLED' | 'BELUM_DITAGIH' = 'BELUM_DITAGIH'
      if (b) {
        status = b.status as any
      }

      return {
        queueId: q.id,
        queueNumber: q.queueNumber,
        patientId: q.patient.id,
        patientName: q.patient.name,
        patientNoRM: `RM-${q.patient.id.toString().padStart(5, '0')}`,
        polyclinic: q.polyclinic || 'Poli Umum',
        doctorName: q.medicalRecord?.doctor?.name || 'dr. Raniisyana R.R.',
        visitDate: q.date,
        billingId: b ? b.id : null,
        billingStatus: status,
        totalAmount: b ? b.totalAmount : 0,
      }
    })
  } catch (error) {
    console.error('Error fetching billing queues:', error)
    return []
  }
}
