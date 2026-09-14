"use client"

import { useEffect, useState } from 'react'
import { getReportData } from './actions'
import { LaporanView } from '@/components/laporan/laporan-view'

export default function LaporanPage() {
  const [reportData, setReportData] = useState<any>(null)
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await getReportData()
        if (res.success && res.data) {
          setReportData(res.data)
        } else if (!res.success) {
          setError(res.error)
        }
      } catch (err: any) {
        setError(err?.message || 'Gagal memuat laporan')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground animate-pulse">Memuat data laporan...</div>
  }

  return <LaporanView initialReportData={reportData} initialError={error} />
}
