'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getPatientById } from '../actions'
import { PatientDetailView } from '@/components/pasien/patient-detail-view'

export default function PatientDetailPage() {
  const params = useParams()
  const idStr = Array.isArray(params?.id) ? params.id[0] : params?.id
  const patientId = idStr ? parseInt(idStr, 10) : NaN

  const [patient, setPatient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNaN(patientId)) {
      setError('ID Pasien Tidak Valid')
      setLoading(false)
      return
    }

    async function loadData() {
      try {
        const p = await getPatientById(patientId)
        if (!p) {
          setError('Pasien Tidak Ditemukan')
        } else {
          setPatient(p)
        }
      } catch (err: any) {
        console.error('Failed to load patient:', err)
        setError('Terjadi kesalahan saat memuat data pasien.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [patientId])

  if (loading) {
    return (
      <div className="p-8 space-y-4 max-w-5xl mx-auto animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{error || 'Pasien Tidak Ditemukan'}</h2>
        <p className="text-xs text-muted-foreground">Data pasien dengan ID tersebut tidak ditemukan di sistem.</p>
        <Link href="/pasien" className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Kembali ke Direktori Pasien
        </Link>
      </div>
    )
  }

  return <PatientDetailView patient={patient} />
}
