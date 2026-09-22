import { getSuratListAction, getPatientsForSuratAction, getDoctorsAction } from './actions'
import { SuratView } from '@/components/surat/surat-view'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function SuratPage() {
  await requireAuth()

  const [suratRes, patientsRes, doctorsRes] = await Promise.all([
    getSuratListAction(),
    getPatientsForSuratAction(),
    getDoctorsAction(),
  ])

  const initialSuratList = suratRes.success && suratRes.data ? suratRes.data : []
  const patients = patientsRes.success && patientsRes.data ? patientsRes.data : []
  const doctors = doctorsRes.success && doctorsRes.data ? doctorsRes.data : []

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <SuratView initialSuratList={initialSuratList} patients={patients} doctors={doctors} />
    </main>
  )
}
