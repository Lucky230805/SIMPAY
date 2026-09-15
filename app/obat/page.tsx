"use client"

import { useEffect, useState } from 'react'
import { getMedicineInventory } from './actions'
import { getSessionUserAction } from '@/app/login/actions'
import { MedicineInventoryView } from '@/components/resep/medicine-inventory-view'

export default function ObatPage() {
  const [inventory, setInventory] = useState<any[]>([])
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
    return <div className="p-6 text-sm text-muted-foreground animate-pulse">Memuat stok obat...</div>
  }

  return <MedicineInventoryView initialInventory={inventory} userRole={userRole} />
}
