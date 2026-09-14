import { requireAuth } from '@/lib/auth'
import { getMedicineInventory } from './actions'
import { MedicineInventoryView } from '@/components/resep/medicine-inventory-view'

export const metadata = {
  title: 'Katalog & Stok Obat — SIMPAY',
  description: 'Kelola stok obat, batch, kedaluwarsa, dan peringatan restock.',
}

export default async function ObatPage() {
  const user = await requireAuth()
  const inventory = await getMedicineInventory()

  return <MedicineInventoryView initialInventory={inventory} userRole={user.role as any} />
}
