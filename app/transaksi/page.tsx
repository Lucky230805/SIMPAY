'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  getSuppliers,
  getPurchaseOrders,
  getPurchaseInvoices,
  SupplierItem,
  PurchaseOrderRecord,
  PurchaseInvoiceRecord,
} from './actions'
import { getMedicineInventory, MedicineItem } from '@/app/obat/actions'
import { getSessionUserAction } from '@/app/login/actions'
import { TransaksiView } from '@/components/transaksi/transaksi-view'

function TransaksiContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'faktur'

  const [suppliers, setSuppliers] = useState<SupplierItem[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([])
  const [invoices, setInvoices] = useState<PurchaseInvoiceRecord[]>([])
  const [medicines, setMedicines] = useState<MedicineItem[]>([])
  const [userRole, setUserRole] = useState<'DOKTER' | 'PERAWAT'>('PERAWAT')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [sups, pos, invs, meds, user] = await Promise.all([
          getSuppliers(),
          getPurchaseOrders(),
          getPurchaseInvoices(),
          getMedicineInventory(),
          getSessionUserAction(),
        ])
        setSuppliers(sups)
        setPurchaseOrders(pos)
        setInvoices(invs)
        setMedicines(meds)
        if (user?.role === 'DOKTER' || user?.role === 'PERAWAT') {
          setUserRole(user.role)
        }
      } catch (err) {
        console.error('Failed to load transaction data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-64 bg-muted rounded-lg" />
        <div className="h-14 bg-muted rounded-xl" />
        <div className="h-96 bg-muted rounded-2xl" />
      </div>
    )
  }

  return (
    <TransaksiView
      initialSuppliers={suppliers}
      initialPurchaseOrders={purchaseOrders}
      initialInvoices={invoices}
      medicines={medicines}
      userRole={userRole}
      initialTab={initialTab}
    />
  )
}

export default function TransaksiPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4 max-w-7xl mx-auto animate-pulse">
          <div className="h-8 w-64 bg-muted rounded-lg" />
          <div className="h-14 bg-muted rounded-xl" />
          <div className="h-96 bg-muted rounded-2xl" />
        </div>
      }
    >
      <TransaksiContent />
    </Suspense>
  )
}
