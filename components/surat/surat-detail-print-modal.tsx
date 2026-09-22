'use client'

import { X, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SuratItem } from '@/app/surat/actions'

interface SuratDetailPrintModalProps {
  surat: SuratItem | null
  isOpen: boolean
  onClose: () => void
}

export function SuratDetailPrintModal({
  surat,
  isOpen,
  onClose,
}: SuratDetailPrintModalProps) {
  if (!isOpen || !surat) return null

  const handlePrint = () => {
    window.print()
  }

  // Calculate age
  const calculateAge = (dob: Date | string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const formattedIssuedDate = new Date(surat.date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const formattedStartDate = surat.startDate
    ? new Date(surat.startDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : '-'

  const formattedEndDate = surat.endDate
    ? new Date(surat.endDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    : '-'

  return (
    <div>
      {/* Screen Dialog Backdrop & Container (Hidden during Print) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-0 duration-200 print:hidden overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
            <div>
              <h2 className="font-bold text-base">Pratinjau Surat Resmi</h2>
              <p className="text-xs text-slate-300">
                {surat.type === 'SAKIT' ? 'Surat Keterangan Sakit' : 'Surat Keterangan Sehat'} - {surat.certificateNo}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
              >
                <Printer className="w-4 h-4" /> Cetak Surat
              </Button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* On-Screen Preview Container */}
          <div className="p-8 bg-slate-100 overflow-y-auto max-h-[75vh]">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-xl mx-auto border border-slate-200 text-black font-sans text-xs sm:text-sm">
              <CertificateContent surat={surat} calculateAge={calculateAge} formattedIssuedDate={formattedIssuedDate} formattedStartDate={formattedStartDate} formattedEndDate={formattedEndDate} />
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY OFFICIAL MEDICAL CERTIFICATE (HIDDEN ON SCREEN, SHOWN ONLY ON PRINT) */}
      <div className="hidden print:block fixed inset-0 bg-white text-black font-serif text-black p-10 leading-relaxed z-[9999]">
        <CertificateContent surat={surat} calculateAge={calculateAge} formattedIssuedDate={formattedIssuedDate} formattedStartDate={formattedStartDate} formattedEndDate={formattedEndDate} isPrintMode />
      </div>
    </div>
  )
}

function CertificateContent({
  surat,
  calculateAge,
  formattedIssuedDate,
  formattedStartDate,
  formattedEndDate,
  isPrintMode = false,
}: {
  surat: SuratItem
  calculateAge: (dob: Date | string) => number
  formattedIssuedDate: string
  formattedStartDate: string
  formattedEndDate: string
  isPrintMode?: boolean
}) {
  return (
    <div className={`space-y-5 ${isPrintMode ? 'max-w-3xl mx-auto font-sans text-slate-900 text-sm' : ''}`}>
      {/* Kop Klinik Header */}
      <div className="text-center border-b-2 border-black pb-3">
        <h1 className="font-black text-lg sm:text-xl uppercase tracking-wider text-black">
          KLINIK PRAKTEK DOKTER UMUM
        </h1>
        <p className="text-xs text-slate-700 font-medium mt-1">
          Perumahan Permata Hijau 2, Blok A59, Cinangsi, Kec. Cibogo, Kabupaten Subang, Jawa Barat
        </p>
      </div>

      {/* Title & Document Number */}
      <div className="text-center space-y-1 py-1">
        <h2 className="font-extrabold text-base sm:text-lg uppercase tracking-wide underline underline-offset-4 decoration-2">
          {surat.type === 'SAKIT' ? 'SURAT KETERANGAN SAKIT' : 'SURAT KETERANGAN SEHAT'}
        </h2>
        <p className="text-xs font-semibold text-slate-600">
          Nomor: <span className="font-mono text-slate-900">{surat.certificateNo}</span>
        </p>
      </div>

      {/* Intro Text */}
      <p className="text-xs sm:text-sm text-slate-800">
        Dengan ini menerangkan bahwa berdasarkan hasil pemeriksaan yang telah dilakukan kepada pasien:
      </p>

      {/* Patient Data Table */}
      <div className="pl-4 sm:pl-6 space-y-1.5 text-xs sm:text-sm">
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-4 font-semibold text-slate-700">Nama Lengkap</span>
          <span className="col-span-8 font-bold text-slate-900">: {surat.patientName}</span>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-4 font-semibold text-slate-700">Umur / Tgl Lahir</span>
          <span className="col-span-8 text-slate-900">
            : {calculateAge(surat.patientDob)} Tahun ({new Date(surat.patientDob).toLocaleDateString('id-ID')})
          </span>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-4 font-semibold text-slate-700">Jenis Kelamin</span>
          <span className="col-span-8 text-slate-900">
            : {(surat.patientGender === 'L' || surat.patientGender === 'Laki-laki') ? 'Laki-laki' : 'Perempuan'}
          </span>
        </div>
        {surat.occupation && (
          <div className="grid grid-cols-12 gap-2">
            <span className="col-span-4 font-semibold text-slate-700">Pekerjaan</span>
            <span className="col-span-8 text-slate-900">: {surat.occupation}</span>
          </div>
        )}
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-4 font-semibold text-slate-700">Alamat</span>
          <span className="col-span-8 text-slate-900">: {surat.patientAddress || '-'}</span>
        </div>
      </div>

      {/* Specific Content: SURAT SAKIT */}
      {surat.type === 'SAKIT' && (
        <div className="space-y-4 pt-2 text-xs sm:text-sm leading-relaxed">
          <p>
            Berhubungan dengan keadaan sakitnya, pasien tersebut di atas perlu diberikan{' '}
            <strong className="font-extrabold text-black uppercase">ISTIRAHAT</strong>{' '}
            selama <strong className="font-bold text-black">{surat.durationDays || 1} Hari</strong>,
            terhitung mulai tanggal <strong className="font-bold text-black">{formattedStartDate}</strong> s/d <strong className="font-bold text-black">{formattedEndDate}</strong>.
          </p>

          {surat.diagnosis && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
              <span className="font-semibold text-slate-700">Diagnosa / Indikasi: </span>
              <span className="font-medium text-slate-900">{surat.diagnosis}</span>
            </div>
          )}

          {surat.notes && (
            <p className="italic text-xs text-slate-600">
              * Catatan: {surat.notes}
            </p>
          )}

          <p className="pt-1 text-slate-800">
            Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana mestinya.
          </p>
        </div>
      )}

      {/* Specific Content: SURAT SEHAT */}
      {surat.type === 'SEHAT' && (
        <div className="space-y-4 pt-2 text-xs sm:text-sm leading-relaxed">
          <p>
            Berdasarkan hasil pemeriksaan fisik &amp; medis yang dilakukan pada hari ini, dinyatakan bahwa pasien tersebut di atas berada dalam keadaan:
          </p>

          <div className="text-center py-2 bg-slate-50 border border-slate-300 rounded-lg">
            <span className="font-extrabold text-base text-black tracking-wide uppercase">
              SEHAT &amp; LAYAK
            </span>
          </div>

          {/* Physical Measurements Grid */}
          <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50 space-y-1.5 text-xs">
            <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
              Hasil Pemeriksaan Fisik:
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>• Tinggi Badan: <strong>{surat.heightCm ? `${surat.heightCm} cm` : '-'}</strong></div>
              <div>• Berat Badan: <strong>{surat.weightKg ? `${surat.weightKg} kg` : '-'}</strong></div>
              <div>• Tekanan Darah: <strong>{surat.bloodPressure || '-'} mmHg</strong></div>
              <div>• Golongan Darah: <strong>{surat.bloodType || '-'}</strong></div>
              <div>• Status Buta Warna: <strong>{surat.colorBlind || 'Tidak'}</strong></div>
            </div>
          </div>

          {surat.purpose && (
            <p>
              Surat keterangan sehat ini diterbitkan untuk keperluan:{' '}
              <strong className="font-bold text-slate-900 underline">{surat.purpose}</strong>.
            </p>
          )}

          {surat.notes && (
            <p className="italic text-xs text-slate-600">
              * Catatan: {surat.notes}
            </p>
          )}

          <p className="pt-1 text-slate-800">
            Demikian surat keterangan sehat ini dibuat agar dapat dipergunakan seperlunya.
          </p>
        </div>
      )}

      {/* Signature Section */}
      <div className="pt-8 flex justify-end">
        <div className="text-center w-72 space-y-12">
          <div>
            <p className="text-xs text-slate-800">Subang, {formattedIssuedDate}</p>
            <p className="text-xs font-semibold text-slate-900">Dokter Pemeriksa,</p>
          </div>
          <div className="space-y-0.5">
            <p className="font-bold text-sm text-slate-900 underline decoration-1">
              ( {surat.doctorName || 'dr. Raniisyana Romula Rekkers'} )
            </p>
            <p className="text-[11px] text-slate-700 font-mono">
              SIP : {surat.doctorSip || 'No. 446.1 /0085/ DPMPTSP / SIP-3 / DUM / VI/ 2020'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
