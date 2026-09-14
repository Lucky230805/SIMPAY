import { getPrescriptionQueues } from './actions'
import { ResepView } from '@/components/resep/resep-view'

export const metadata = { title: 'Resep & Obat — SIMPAY' }

export default async function ResepPage() {
  const queues = await getPrescriptionQueues()

  return <ResepView initialQueues={queues} />
}
