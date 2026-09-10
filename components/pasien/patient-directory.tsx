'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PatientTable } from './patient-table'
import { PatientFormDialog } from './patient-form-dialog'
import { PatientSuccessDialog } from './patient-success-dialog'
import { PatientRecord } from '@/app/pasien/actions'

interface PatientDirectoryProps {
  initialData: {
    patients: PatientRecord[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export function PatientDirectory({ initialData }: PatientDirectoryProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [newlyAddedPatient, setNewlyAddedPatient] = useState<any | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleAddSuccess = (patient: any) => {
    setIsAddOpen(false)
    setNewlyAddedPatient(patient)
    setIsSuccessOpen(true)
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Direktori Pasien
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola dan cari data rekam medis pasien terdaftar.
          </p>
        </div>

        {/* Primary Action Button */}
        <Button
          onClick={() => setIsAddOpen(true)}
          className="font-semibold text-xs h-9 px-4 uppercase tracking-wide gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          TAMBAH PASIEN BARU
        </Button>
      </div>

      {/* Add Modal */}
      <PatientFormDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {/* Success Modal */}
      <PatientSuccessDialog
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        patient={newlyAddedPatient}
      />

      {/* Patient Table with real DB integration */}
      <PatientTable key={refreshKey} initialData={initialData} />
    </div>
  )
}
