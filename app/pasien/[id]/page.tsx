import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getPatientById } from '../actions'
import { PatientDetailView } from '@/components/pasien/patient-detail-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const patientId = parseInt(id, 10)
  if (isNaN(patientId)) return { title: 'Pasien Tidak Ditemukan — SIMPAY' }

  const patient = await getPatientById(patientId)
  if (!patient) return { title: 'Pasien Tidak Ditemukan — SIMPAY' }

  return {
    title: `${patient.name} — Detail Pasien — SIMPAY`,
  }
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { id } = await params
  const patientId = parseInt(id, 10)

  if (isNaN(patientId)) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-foreground">ID Pasien Tidak Valid</h2>
        <p className="text-xs text-muted-foreground">ID yang Anda masukkan bukan nomor yang valid.</p>
        <Link href="/pasien" className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Kembali ke Direktori Pasien
        </Link>
      </div>
    )
  }

  const patient = await getPatientById(patientId)

  if (!patient) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Pasien Tidak Ditemukan</h2>
        <p className="text-xs text-muted-foreground">Data pasien dengan ID tersebut tidak ditemukan di sistem.</p>
        <Link href="/pasien" className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Kembali ke Direktori Pasien
        </Link>
      </div>
    )
  }

  return <PatientDetailView patient={patient} />
}
