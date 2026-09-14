import { getQueueById } from '../actions'
import { ExaminationView } from '@/components/antrean/examination-view'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export async function generateStaticParams() {
  return []
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DoctorExamPage({ params }: PageProps) {
  const { id } = await params
  const queueId = parseInt(id, 10)

  if (isNaN(queueId)) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-foreground">ID Antrean Tidak Valid</h2>
        <p className="text-xs text-muted-foreground">ID yang Anda masukkan bukan nomor yang valid.</p>
        <Link href="/antrean" className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Kembali ke Daftar Antrean
        </Link>
      </div>
    )
  }

  const queue = await getQueueById(queueId)

  if (!queue || !queue.patient) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Data Antrean / Pasien Tidak Ditemukan</h2>
        <p className="text-xs text-muted-foreground">Data antrean dengan ID tersebut tidak ditemukan di sistem.</p>
        <Link href="/antrean" className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Kembali ke Daftar Antrean
        </Link>
      </div>
    )
  }

  return <ExaminationView queue={queue as any} />
}