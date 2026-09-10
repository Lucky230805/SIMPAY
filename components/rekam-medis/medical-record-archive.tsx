'use client'

import React, { useState } from 'react'
import { FileText } from 'lucide-react'
import { MedicalRecordTable } from './medical-record-table'
import { MedicalRecordDrawer } from './medical-record-drawer'
import { MedicalRecordEditDialog } from './medical-record-edit-dialog'
import { MedicalRecordItem } from '@/app/rekam-medis/actions'

interface MedicalRecordArchiveProps {
  initialData: {
    records: MedicalRecordItem[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  initialDiagnoses: { code: string; name: string }[]
}

export function MedicalRecordArchive({
  initialData,
  initialDiagnoses,
}: MedicalRecordArchiveProps) {
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecordItem | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSelectRecord = (record: MedicalRecordItem) => {
    setSelectedRecord(record)
    setIsDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
  }

  const handleOpenEdit = (record: MedicalRecordItem) => {
    setSelectedRecord(record)
    setIsEditOpen(true)
  }

  const handleEditSuccess = (updatedRecord: MedicalRecordItem) => {
    setSelectedRecord(updatedRecord)
    setIsEditOpen(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header matching the reference */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Arsip Rekam Medis
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola dan telusuri riwayat medis pasien terdaftar.
          </p>
        </div>
      </div>

      {/* Main Table */}
      <MedicalRecordTable
        key={refreshKey}
        initialData={initialData}
        initialDiagnoses={initialDiagnoses}
        onSelectRecord={handleSelectRecord}
      />

      {/* Detail Slide-Over Drawer */}
      <MedicalRecordDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        record={selectedRecord}
        onOpenEdit={handleOpenEdit}
      />

      {/* Edit Dialog */}
      <MedicalRecordEditDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
        record={selectedRecord}
      />
    </div>
  )
}
