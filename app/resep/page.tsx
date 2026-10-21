'use client'

import { useEffect, useState } from 'react'
import { getPrescriptionQueues } from './actions'
import { ResepView } from '@/components/resep/resep-view'

export default function ResepPage() {
  const [queues, setQueues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const q = await getPrescriptionQueues()
        setQueues(q)
      } catch (err) {
        console.error('Failed to load prescription queues:', err)
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

  return <ResepView initialQueues={queues} />
}
