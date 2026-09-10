import { getPatients } from './actions'
import { PatientDirectory } from '@/components/pasien/patient-directory'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Direktori Pasien — SIMPAY',
  description: 'Kelola dan cari data rekam medis pasien terdaftar.',
}

export default async function PasienPage() {
  // Fetch initial page of patients from SQLite database
  const initialData = await getPatients({ page: 1, pageSize: 5 })

  return <PatientDirectory initialData={initialData} />
}
