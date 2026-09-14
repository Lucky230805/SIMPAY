"use client"

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getBillingQueues } from './actions'
import { PembayaranView } from '@/components/pembayaran/pembayaran-view'

function PembayaranContent() {
  const searchParams = useSearchParams()
  const queueIdStr = searchParams.get('queueId')
  const queueIdNum = queueIdStr ? Number(queueIdStr) : null

  const [queues, setQueues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const q = await getBillingQueues()
        setQueues(q)
      } catch (err) {
        console.error('Failed to load billing queues:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground animate-pulse">Memuat antrean kasir...</div>
  }

  return (
    <PembayaranView
      initialQueues={queues}
      selectedQueueIdFromUrl={queueIdNum}
      currentUserRole="PERAWAT"
      currentUserName="Kasir Klinik"
    />
  )
}

export default function PembayaranPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Memuat antrean kasir...</div>}>
      <PembayaranContent />
    </Suspense>
  )
}
