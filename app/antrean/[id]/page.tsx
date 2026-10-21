'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getQueueById, getAvailableMedicinesForPrescription } from '../actions'
import { getActiveProceduresForDoctor } from '@/app/tindakan/actions'
import { ExaminationView } from '@/components/antrean/examination-view'

export default function DoctorExamPage() {
  const params = useParams()
  const idStr = Array.isArray(params?.id) ? params.id[0] : params?.id
  const queueId = idStr ? parseInt(idStr, 10) : NaN

  const [queue, setQueue] = useState<any>(null)
  const [medicinesList, setMedicinesList] = useState<any[]>([])
  const [proceduresList, setProceduresList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNaN(queueId)) {
      setError('ID Antrean Tidak Valid')
      setLoading(false)
      return
    }

    async function loadData() {
      try {
        const [q, m, p] = await Promise.all([
          getQueueById(queueId),
          getAvailableMedicinesForPrescription(),
          getActiveProceduresForDoctor(),
        ])

        if (!q || !q.patient) {
          setError('Data Antrean / Pasien Tidak Ditemukan')
        } else {
          setQueue(q)
          setMedicinesList(m)
          setProceduresList(p)
        }
      } catch (err: any) {
        console.error('Failed to load examination queue:', err)
        setError('Terjadi kesalahan saat memuat data antrean.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [queueId])

  if (loading) {
    return (
      <div className="p-8 space-y-4 max-w-5xl mx-auto animate-pulse">
        <div className="h-6 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    )
  }

  if (error || !queue) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{error || 'Data Tidak Ditemukan'}</h2>
        <p className="text-xs text-muted-foreground">Silakan periksa kembali tautan atau nomor antrean.</p>
        <Link href="/antrean" className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Kembali ke Daftar Antrean
        </Link>
      </div>
    )
  }

  return (
    <ExaminationView
      queue={queue}
      medicinesList={medicinesList}
      proceduresList={proceduresList}
    />
  )
}