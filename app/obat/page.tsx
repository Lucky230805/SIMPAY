import { getMedicineInventory } from './actions'
import { getCurrentUser } from '@/lib/auth'
import { MedicineInventoryView } from '@/components/resep/medicine-inventory-view'

export const dynamic = 'force-dynamic'

export default async function ObatPage() {
  const [inventory, user] = await Promise.all([
    getMedicineInventory(),
    getCurrentUser(),
  ])

  const userRole = user?.role === 'DOKTER' ? 'DOKTER' : 'PERAWAT'

  return <MedicineInventoryView initialInventory={inventory} userRole={userRole} />
}

