import { getPrescriptionQueues } from './actions'
import { ResepView } from '@/components/resep/resep-view'

export const dynamic = 'force-dynamic'

export default async function ResepPage() {
  const queues = await getPrescriptionQueues()
  return <ResepView initialQueues={queues} />
}

