"use client"

import { useEffect, useState } from 'react'
import { getMedicineInventory } from './actions'
import { MedicineInventoryView } from '@/components/resep/medicine-inventory-view'

export default function ObatPage() {
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const inv = await getMedicineInventory()
        setInventory(inv)
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

  return <MedicineInventoryView initialInventory={inventory} userRole="DOKTER" />
}
