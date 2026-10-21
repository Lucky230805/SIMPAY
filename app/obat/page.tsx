'use client'

import { useEffect, useState } from 'react'
import { getMedicineInventory } from './actions'
import { getSessionUserAction } from '@/app/login/actions'
import { MedicineInventoryView } from '@/components/resep/medicine-inventory-view'

export default function ObatPage() {
  const [inventory, setInventory] = useState<any>({
    medicines: [],
    lowStockList: [],
    expiringList: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1,
    summary: { totalUniqueMedicines: 0, lowStockCount: 0, expiringBatchCount: 0 },
  })
  const [userRole, setUserRole] = useState<'DOKTER' | 'PERAWAT'>('PERAWAT')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [inv, user] = await Promise.all([
          getMedicineInventory(),
          getSessionUserAction(),
        ])
        setInventory(inv)
        if (user?.role === 'DOKTER' || user?.role === 'PERAWAT') {
          setUserRole(user.role)
        }
      } catch (err) {
        console.error('Failed to load medicine inventory:', err)
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

  return <MedicineInventoryView initialInventory={inventory} userRole={userRole} />
}
