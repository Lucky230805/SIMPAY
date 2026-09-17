'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit2,
  Trash2,
  User,
  Calendar,
  Phone,
  MapPin,
  FileText,
  Clock,
  Activity,
  CheckCircle2,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatNoRM, formatBirthDateAndAge, formatDateIndo } from '@/lib/patient-utils'
import { PatientFormDialog } from './patient-form-dialog'
import { PatientDeleteDialog } from './patient-delete-dialog'
import { MedicalRecordDrawer } from '@/components/rekam-medis/medical-record-drawer'
import { MedicalRecordEditDialog } from '@/components/rekam-medis/medical-record-edit-dialog'
import { MedicalRecordCreateDialog } from '@/components/rekam-medis/medical-record-create-dialog'
import { MedicalRecordItem } from '@/app/rekam-medis/actions'
import { Eye, Plus, UserPlus, Loader2 } from 'lucide-react'
import { addExistingPatientToQueue } from '@/app/pasien/actions'
import { getSessionUserAction } from '@/app/login/actions'
import { QueueTicketModal, QueueTicketData } from '@/components/antrean/queue-ticket-modal'

interface PatientDetailViewProps {
  patient: any
}

export function PatientDetailView({ patient: initialPatient }: PatientDetailViewProps) {
  const router = useRouter()
  const [patient, setPatient] = useState(initialPatient)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'DOKTER' | 'PERAWAT' | null>(null)

  useEffect(() => {
    let active = true
    getSessionUserAction().then((u) => {
      if (active && u) {
        setUserRole(u.role as 'DOKTER' | 'PERAWAT')
      }
    })
    return () => {
      active = false
    }
  }, [])

  const isDokter = userRole === 'DOKTER'

  const [selectedMR, setSelectedMR] = useState<MedicalRecordItem | null>(null)
  const [isMRDrawerOpen, setIsMRDrawerOpen] = useState(false)
  const [isMREditOpen, setIsMREditOpen] = useState(false)
  const [isMRCreateOpen, setIsMRCreateOpen] = useState(false)

  const [isQueueing, setIsQueueing] = useState(false)
  const [ticketModalData, setTicketModalData] = useState<QueueTicketData | null>(null)
  const [isTicketOpen, setIsTicketOpen] = useState(false)

  const showToast = (msg: string) => {
    setFeedbackToast(msg)
    setTimeout(() => setFeedbackToast(null), 3000)
  }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const activeTodayQueue = patient.queues?.find((q: any) => {
    const qDate = new Date(q.date)
    return qDate >= startOfDay && (q.status === 'MENUNGGU' || q.status === 'DALAM_PEMERIKSAAN')
  })

  const handleAddToQueue = async () => {
    if (activeTodayQueue) {
      alert(`Pasien ${patient.name} sudah terdaftar di Antrean Pemeriksaan hari ini (No. Antrean #${activeTodayQueue.queueNumber}, Status: ${activeTodayQueue.status === 'MENUNGGU' ? 'Menunggu' : 'Dalam Pemeriksaan'}). Pasien tidak dapat diinputkan lagi ke antrean.`)
      return
    }

    setIsQueueing(true)
    try {
      const res = await addExistingPatientToQueue(patient.id, 'Poli Umum')
      if (res.success && res.queue) {
        showToast(`Pasien ${res.patientName} berhasil didaftarkan ke Antrean Hari Ini (#${res.queue.queueNumber})`)
        setPatient({
          ...patient,
          queues: [res.queue, ...(patient.queues || [])],
        })
        setTicketModalData({
          queueNumber: res.queue.queueNumber,
          patientName: res.patientName,
          noRM: formatNoRM(patient.id),
          polyclinic: res.queue.polyclinic || 'Poli Umum',
        })
        setIsTicketOpen(true)
      } else {
        alert(res.error || 'Gagal mendaftarkan pasien ke antrean')
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message)
    } finally {
      setIsQueueing(false)
    }
  }

  const handleEditSuccess = (updated: any) => {
    setPatient({
      ...patient,
      ...updated,
    })
    setIsEditOpen(false)
    showToast('Data pasien berhasil diperbarui')
  }

  const handleDeleteSuccess = () => {
    setIsDeleteOpen(false)
    router.push('/pasien')
  }

  const handleOpenMRDetail = (mr: any) => {
    // Format to MedicalRecordItem shape for drawer
    const formattedItem: MedicalRecordItem = {
      ...mr,
      patient: {
        id: patient.id,
        name: patient.name,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        phone: patient.phone,
        address: patient.address,
      },
      doctor: mr.doctor || { id: 1, name: 'dr. Raniisyana Romula Rekkers', role: 'DOKTER' },
      prescriptions: mr.prescriptions || [],
    }
    setSelectedMR(formattedItem)
    setIsMRDrawerOpen(true)
  }

  const handleMRCreateSuccess = (newRecord: any) => {
    setPatient({
      ...patient,
      medicalRecords: [newRecord, ...(patient.medicalRecords || [])],
    })
    setIsMRCreateOpen(false)
    showToast('Rekam medis baru berhasil ditambahkan')
  }

  const handleMREditSuccess = (updatedRecord: MedicalRecordItem) => {
    setPatient({
      ...patient,
      medicalRecords: (patient.medicalRecords || []).map((mr: any) =>
        mr.id === updatedRecord.id ? { ...mr, ...updatedRecord } : mr
      ),
    })
    setSelectedMR(updatedRecord)
    setIsMREditOpen(false)
    showToast('Rekam medis berhasil diperbarui')
  }

  const noRM = formatNoRM(patient.id)
  const birthDateAndAge = formatBirthDateAndAge(patient.dateOfBirth)

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-xs font-medium shadow-lg animate-in slide-in-from-bottom-5">
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Edit & Delete Dialogs */}
      <PatientFormDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
        initialData={patient}
      />

      <PatientDeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={handleDeleteSuccess}
        patient={patient}
      />

      {/* Medical Record Slide-Over Drawer */}
      <MedicalRecordDrawer
        isOpen={isMRDrawerOpen}
        onClose={() => setIsMRDrawerOpen(false)}
        record={selectedMR}
        onOpenEdit={(r) => {
          setSelectedMR(r)
          setIsMREditOpen(true)
        }}
      />

      {/* Medical Record Edit Dialog */}
      <MedicalRecordEditDialog
        isOpen={isMREditOpen}
        onClose={() => setIsMREditOpen(false)}
        onSuccess={handleMREditSuccess}
        record={selectedMR}
      />

      {/* Medical Record Create Dialog */}
      <MedicalRecordCreateDialog
        isOpen={isMRCreateOpen}
        onClose={() => setIsMRCreateOpen(false)}
        onSuccess={handleMRCreateSuccess}
        patientId={patient.id}
        patientName={patient.name}
      />

      <QueueTicketModal
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
        queueData={ticketModalData}
      />

      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/pasien"
            title="Kembali ke Direktori"
            className={cn(buttonVariants({ variant: 'outline', size: 'icon' }), 'h-9 w-9')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {patient.name}
              </h1>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                {noRM}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Data Pasien & Riwayat Medis
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTodayQueue ? (
            <Badge
              variant="outline"
              onClick={() => !isDokter && handleAddToQueue()}
              className={`h-9 px-3 text-xs gap-1.5 font-semibold bg-emerald-50 text-emerald-700 border-emerald-300 border shadow-2xs ${!isDokter ? 'cursor-pointer hover:bg-emerald-100' : ''}`}
              title="Pasien sudah terdaftar di antrean hari ini"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sudah Masuk Antrean (#{activeTodayQueue.queueNumber})</span>
            </Badge>
          ) : (
            !isDokter && (
              <Button
                size="sm"
                onClick={handleAddToQueue}
                disabled={isQueueing}
                className="h-9 text-xs gap-1.5 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                {isQueueing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UserPlus className="w-3.5 h-3.5" />
                )}
                <span>+ Daftarkan ke Antrean Hari Ini</span>
              </Button>
            )
          )}
          {!isDokter && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="h-9 text-xs gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Pasien
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                className="h-9 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Personal Information Card */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 pb-3.5 border-b border-border mb-4">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Informasi Pasien
              </h2>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">No. Rekam Medis</span>
                <span className="font-mono font-semibold text-primary text-sm">{noRM}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Nama Lengkap</span>
                <span className="font-medium text-foreground text-sm">{patient.name}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Jenis Kelamin</span>
                <span className="font-medium text-foreground">{patient.gender}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Tanggal Lahir & Umur</span>
                <span className="font-medium text-foreground">{birthDateAndAge}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Nomor Telepon</span>
                <span className="font-mono text-foreground">{patient.phone || '—'}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">Alamat Lengkap</span>
                <span className="text-foreground leading-relaxed">
                  {patient.address || '—'}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Riwayat Rekam Medis & Riwayat Kunjungan/Antrean */}
        <div className="lg:col-span-2 space-y-6">
          {/* Riwayat Rekam Medis */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Riwayat Rekam Medis ({patient.medicalRecords?.length || 0})
                </h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMRCreateOpen(true)}
                className="h-7 text-xs gap-1 font-medium text-primary border-primary/20 hover:bg-primary/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Rekam Medis</span>
              </Button>
            </div>

            {!patient.medicalRecords || patient.medicalRecords.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
                <p className="text-xs font-medium text-muted-foreground">
                  Belum ada catatan rekam medis untuk pasien ini.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsMRCreateOpen(true)}
                  className="mt-2 text-xs"
                >
                  + Buat Rekam Medis Pertama
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {patient.medicalRecords.map((mr: any) => (
                  <div
                    key={mr.id}
                    className="p-4 rounded-lg bg-muted/20 border border-border/70 space-y-2 text-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{formatDateIndo(mr.examinationDate)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {mr.icd10Code && (
                          <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                            {mr.icd10Code}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenMRDetail(mr)}
                          className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10 gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Lihat Detail</span>
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5">
                      <div>
                        <span className="text-muted-foreground font-medium text-[11px] block">
                          Keluhan:
                        </span>
                        <p className="text-foreground mt-0.5">{mr.complaint || '—'}</p>
                      </div>

                      <div>
                        <span className="text-muted-foreground font-medium text-[11px] block">
                          Diagnosis:
                        </span>
                        <p className="text-foreground font-semibold mt-0.5">{mr.diagnosis || '—'}</p>
                      </div>
                    </div>

                    {mr.treatment && (
                      <div className="pt-1">
                        <span className="text-muted-foreground font-medium text-[11px] block">
                          Tindakan:
                        </span>
                        <p className="text-foreground mt-0.5">{mr.treatment}</p>
                      </div>
                    )}

                    {mr.notes && (
                      <div className="pt-1 text-[11px] text-muted-foreground italic border-t border-border/40">
                        Catatan: {mr.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Riwayat Antrean */}
          <Card className="p-5">
            <div className="flex items-center gap-2 pb-3.5 border-b border-border mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Riwayat Kunjungan / Antrean ({patient.queues?.length || 0})
              </h2>
            </div>

            {!patient.queues || patient.queues.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada riwayat kunjungan pasien.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {patient.queues.map((q: any) => (
                  <div
                    key={q.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-bold text-[11px]">
                        {q.queueNumber}
                      </span>
                      <span className="font-medium text-foreground">
                        {formatDateIndo(q.date)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        q.status === 'SELESAI'
                          ? 'bg-green-100 text-green-800'
                          : q.status === 'DALAM_PEMERIKSAAN'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {q.status === 'SELESAI'
                        ? 'Selesai'
                        : q.status === 'DALAM_PEMERIKSAAN'
                        ? 'Sedang Diperiksa'
                        : 'Menunggu'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
