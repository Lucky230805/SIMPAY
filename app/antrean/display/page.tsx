import { PublicQueueDisplay } from '@/components/antrean/public-queue-display'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Layar Antrean TV — SIMPAY',
  description: 'Layar Tampilan Antrean dan Panggilan Suara Otomatis Ruang Tunggu Klinik.',
}

export default function PublicQueueDisplayPage() {
  return <PublicQueueDisplay />
}
