import { getMedicalRecords, getDistinctDiagnoses } from './actions'
import { MedicalRecordArchive } from '@/components/rekam-medis/medical-record-archive'

export const metadata = {
  title: 'Arsip Rekam Medis — SIMPAY',
  description: 'Kelola dan telusuri riwayat medis pasien terdaftar.',
}

export default async function RekamMedisPage() {
  const [initialData, initialDiagnoses] = await Promise.all([
    getMedicalRecords({ page: 1, pageSize: 5 }),
    getDistinctDiagnoses(),
  ])

  return (
    <MedicalRecordArchive
      initialData={initialData}
      initialDiagnoses={initialDiagnoses}
    />
  )
}
