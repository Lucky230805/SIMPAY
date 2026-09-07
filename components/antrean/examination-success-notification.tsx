'use client'

import { CheckCircle2, FileText, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ExaminationSuccessNotificationProps {
  patientId: number
  patientName: string
  onClose: () => void
}

export function ExaminationSuccessNotification({
  patientId,
  patientName,
  onClose,
}: ExaminationSuccessNotificationProps) {
  const router = useRouter()

  const handleLihatRekamMedis = () => {
    router.push(`/pasien/${patientId}`)
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
      <div className="flex items-start gap-3">
        {/* Success icon */}
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800">
            Rekam medis berhasil disimpan
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Data pemeriksaan <span className="font-medium">{patientName}</span> telah tersimpan ke
            sistem dan status antrean diperbarui menjadi{' '}
            <span className="font-semibold">Selesai</span>.
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
              onClick={handleLihatRekamMedis}
              id="btn-lihat-rekam-medis"
            >
              <FileText className="w-3.5 h-3.5" />
              Lihat Rekam Medis
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100"
              onClick={onClose}
              id="btn-tutup-notifikasi"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
