"use client"

import { useEffect, useState } from 'react'
import { getMedicalRecords, getDistinctDiagnoses } from './actions'
import { MedicalRecordArchive } from '@/components/rekam-medis/medical-record-archive'

export default function RekamMedisPage() {
  const [data, setData] = useState<any>({ records: [], totalCount: 0, totalPages: 0, currentPage: 1 })
  const [diagnoses, setDiagnoses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [rec, diag] = await Promise.all([
          getMedicalRecords({ page: 1, pageSize: 5 }),
          getDistinctDiagnoses(),
        ])
        setData(rec)
        setDiagnoses(diag)
      } catch (err) {
        console.error('Failed to load medical records:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground animate-pulse">Memuat rekam medis...</div>
  }

  return (
    <MedicalRecordArchive
      initialData={data}
      initialDiagnoses={diagnoses}
    />
  )
}
