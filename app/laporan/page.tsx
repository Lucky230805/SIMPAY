import { getReportData } from './actions'
import { LaporanView } from '@/components/laporan/laporan-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: 'Laporan — SIMPAY' }

export default async function LaporanPage() {
  const res = await getReportData()

  return (
    <LaporanView
      initialReportData={res.success && res.data ? res.data : null}
      initialError={!res.success ? res.error : undefined}
    />
  )
}
