import { getPrescriptionQueues } from './actions'
import { ResepView } from '@/components/resep/resep-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: 'Resep & Obat — SIMPAY' }

export default async function ResepPage() {
  const queues = await getPrescriptionQueues()

  return <ResepView initialQueues={queues} />
}
