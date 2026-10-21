'use client'

import { useEffect, useState } from 'react'
import { getProceduresAction } from './actions'
import { getSessionUserAction } from '@/app/login/actions'
import { ProcedureCatalogView } from '@/components/tindakan/procedure-catalog-view'

export default function TindakanPage() {
  const [procedures, setProcedures] = useState<any[]>([])
  const [userRole, setUserRole] = useState<'DOKTER' | 'PERAWAT'>('PERAWAT')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [res, user] = await Promise.all([
          getProceduresAction(),
          getSessionUserAction(),
        ])
        if (res.success && res.data) {
          setProcedures(res.data)
        }
        if (user?.role === 'DOKTER' || user?.role === 'PERAWAT') {
          setUserRole(user.role)
        }
      } catch (err) {
        console.error('Failed to load procedures:', err)
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
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <ProcedureCatalogView
      initialProcedures={procedures}
      userRole={userRole}
    />
  )
}
