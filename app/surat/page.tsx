'use client'

import { useEffect, useState } from 'react'
import { getSuratListAction, getPatientsForSuratAction, getDoctorsAction } from './actions'
import { SuratView } from '@/components/surat/surat-view'

export default function SuratPage() {
  const [suratList, setSuratList] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [suratRes, patientsRes, doctorsRes] = await Promise.all([
          getSuratListAction(),
          getPatientsForSuratAction(),
          getDoctorsAction(),
        ])
        if (suratRes.success && suratRes.data) setSuratList(suratRes.data)
        if (patientsRes.success && patientsRes.data) setPatients(patientsRes.data)
        if (doctorsRes.success && doctorsRes.data) setDoctors(doctorsRes.data)
      } catch (err) {
        console.error('Failed to load surat data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SuratView initialSuratList={suratList} patients={patients} doctors={doctors} />
    </main>
  )
}
