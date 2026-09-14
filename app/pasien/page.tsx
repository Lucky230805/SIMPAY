"use client"

import { useEffect, useState } from 'react'
import { getPatients } from './actions'
import { PatientDirectory } from '@/components/pasien/patient-directory'

export default function PasienPage() {
  const [data, setData] = useState<any>({ patients: [], totalCount: 0, totalPages: 0, currentPage: 1 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getPatients({ page: 1, pageSize: 5 })
        setData(res)
      } catch (err) {
        console.error('Failed to load patients:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground animate-pulse">Memuat direktori pasien...</div>
  }

  return <PatientDirectory initialData={data} />
}
