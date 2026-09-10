import { requireAuth } from '@/lib/auth'
import { getBillingQueues } from './actions'
import { PembayaranView } from '@/components/pembayaran/pembayaran-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: 'Kasir & Pembayaran — SIMPAY' }

interface PembayaranPageProps {
  searchParams: Promise<{ queueId?: string }>
}

export default async function PembayaranPage({ searchParams }: PembayaranPageProps) {
  const user = await requireAuth()
  const params = await searchParams
  const queueIdNum = params?.queueId ? Number(params.queueId) : null

  const queues = await getBillingQueues()

  return (
    <PembayaranView
      initialQueues={queues}
      selectedQueueIdFromUrl={queueIdNum}
      currentUserRole={user.role as any}
      currentUserName={user.name}
    />
  )
}
