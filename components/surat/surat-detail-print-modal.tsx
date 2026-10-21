'use client'

import { X, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SuratItem } from '@/app/surat/actions'

interface SuratDetailPrintModalProps {
  surat: SuratItem | null
  isOpen: boolean
  onClose: () => void
}

// Helper to clean SIP string from irregular spaces
function cleanSip(sip?: string | null): string {
  if (!sip) return ''
  return sip.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim()
}

// Helper to convert number to Indonesian words (terbilang)
function terbilang(n: number): string {
  if (n <= 0) return 'Nol'
  const satuan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ]
  if (n < 12) return satuan[n]
  if (n < 20) return terbilang(n - 10) + ' Belas'
  if (n < 100) {
    const sisa = n % 10
    return terbilang(Math.floor(n / 10)) + ' Puluh' + (sisa > 0 ? ' ' + satuan[sisa] : '')
  }
  if (n < 200) {
    const sisa = n - 100
    return 'Seratus' + (sisa > 0 ? ' ' + terbilang(sisa) : '')
  }
  if (n < 1000) {
    const sisa = n % 100
    return terbilang(Math.floor(n / 100)) + ' Ratus' + (sisa > 0 ? ' ' + terbilang(sisa) : '')
  }
  return String(n)
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
        <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8">
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
          <div className="p-6 sm:p-8 bg-slate-900/60 dark:bg-black/60 overflow-y-auto max-h-[75vh]">
            <div className="preserve-light bg-white p-8 sm:p-10 rounded-xl shadow-2xl max-w-2xl mx-auto border border-slate-300 text-slate-900 font-sans text-xs sm:text-sm leading-normal">
              <CertificateContent
                surat={surat}
                calculateAge={calculateAge}
                formattedIssuedDate={formattedIssuedDate}
                formattedStartDate={formattedStartDate}
                formattedEndDate={formattedEndDate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY OFFICIAL MEDICAL CERTIFICATE (HIDDEN ON SCREEN, SHOWN ONLY ON PRINT) */}
      <div id="surat-print-area" className="hidden print:block fixed inset-0 bg-white text-black font-sans p-8 sm:p-10 leading-relaxed z-[9999] preserve-light">
        <CertificateContent
          surat={surat}
          calculateAge={calculateAge}
          formattedIssuedDate={formattedIssuedDate}
          formattedStartDate={formattedStartDate}
          formattedEndDate={formattedEndDate}
          isPrintMode
        />
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
  const isMale = surat.patientGender === 'L' || surat.patientGender === 'Laki-laki'

  return (
    <div className={`space-y-4 font-sans text-slate-900 ${isPrintMode ? 'max-w-2xl mx-auto text-sm' : 'text-xs sm:text-sm'}`}>
      {/* Header / Kop Surat Dokter Bersama */}
      <div className="text-center leading-tight pb-1">
        <h1 className="font-bold text-sm sm:text-base tracking-[0.2em] uppercase text-slate-900">
          PRAKTEK UMUM
        </h1>
        <h2 className="font-bold text-lg sm:text-xl uppercase mt-1 tracking-wide text-slate-950">
          dr. FARISI
        </h2>
        <p className="text-[11px] sm:text-xs font-normal tracking-wide text-slate-700">
          SIP : No. 446.1/0086/DPMPTSP/SIP-3/DUM/VI/2020
        </p>
        <h2 className="font-bold text-lg sm:text-xl uppercase mt-1 tracking-wide text-slate-950">
          dr. RANIISYANA R. REKKERS
        </h2>
        <p className="text-[11px] sm:text-xs font-normal tracking-wide text-slate-700">
          SIP : No. 446.1/0085/DPMPTSP/SIP-3/DUM/VI/2020
        </p>
        <p className="text-[11px] sm:text-xs font-normal mt-1 text-slate-700">
          Alamat : Desa Cibogo Rt. 19 Rw. 05 Kecamatan Cibogo - Subang
        </p>
      </div>

      {/* Double Horizontal Line Separator */}
      <div className="w-full my-2.5">
        <div className="border-t-2 border-slate-900 mb-[2px]"></div>
        <div className="border-t border-slate-900"></div>
      </div>

      {/* Title */}
      <div className="text-center my-3.5 space-y-1">
        <h3 className="font-bold text-base sm:text-lg uppercase tracking-wider underline underline-offset-4 decoration-1 text-slate-950 inline-block">
          {surat.type === 'SAKIT' ? 'SURAT KETERANGAN SAKIT' : 'SURAT KETERANGAN SEHAT'}
        </h3>
        {surat.certificateNo && (
          <p className="text-[11px] text-slate-500 font-mono tracking-wide">
            Nomor: {surat.certificateNo}
          </p>
        )}
      </div>

      {/* Intro Phrase */}
      <p className="text-xs sm:text-sm text-slate-800">
        Yang bertandatangan dibawah ini, menerangkan bahwa :
      </p>

      {/* Patient Data Form */}
      <div className="space-y-1.5 pl-2 sm:pl-4 text-xs sm:text-sm text-slate-800">
        {/* Nama */}
        <div className="flex items-baseline">
          <span className="w-24 sm:w-28 shrink-0 text-slate-700">Nama</span>
          <span className="w-4 shrink-0 text-slate-700">:</span>
          <span className="font-semibold text-slate-950">{surat.patientName}</span>
        </div>

        {/* Umur & Jenis Kelamin */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline">
            <span className="w-24 sm:w-28 shrink-0 text-slate-700">Umur</span>
            <span className="w-4 shrink-0 text-slate-700">:</span>
            <span className="text-slate-900">{calculateAge(surat.patientDob)} th</span>
          </div>
          <div className="flex items-center gap-1.5 pr-2 sm:pr-8 text-slate-700">
            <span className="text-xs sm:text-sm">Jenis Kelamin :</span>
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold ${
                isMale
                  ? 'border border-slate-900 font-bold text-slate-950 bg-slate-100'
                  : 'text-slate-400'
              }`}
            >
              L
            </span>
            <span className="text-slate-400">/</span>
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold ${
                !isMale
                  ? 'border border-slate-900 font-bold text-slate-950 bg-slate-100'
                  : 'text-slate-400'
              }`}
            >
              P
            </span>
          </div>
        </div>

        {/* Pekerjaan */}
        <div className="flex items-baseline">
          <span className="w-24 sm:w-28 shrink-0 text-slate-700">Pekerjaan</span>
          <span className="w-4 shrink-0 text-slate-700">:</span>
          <span className="text-slate-900">{surat.occupation || '-'}</span>
        </div>

        {/* Alamat */}
        <div className="flex items-baseline">
          <span className="w-24 sm:w-28 shrink-0 text-slate-700">Alamat</span>
          <span className="w-4 shrink-0 text-slate-700">:</span>
          <span className="text-slate-900">{surat.patientAddress || '-'}</span>
        </div>

        {/* Dotted guideline line under Alamat */}
        <div className="pt-0.5">
          <div className="border-b border-dotted border-slate-300 ml-28 sm:ml-32 w-full" />
        </div>
      </div>

      {/* Content: SURAT SAKIT */}
      {surat.type === 'SAKIT' && (
        <div className="space-y-3 pt-3 text-xs sm:text-sm text-slate-800 leading-relaxed">
          <p className="indent-6 sm:indent-8 text-justify leading-relaxed">
            Pada pemeriksaan fisik saat ini dalam keadaan sakit, perlu diberikan istirahat
            selama <span className="font-semibold text-slate-950">{surat.durationDays || 1}</span> ( <span className="font-semibold text-slate-950">{terbilang(surat.durationDays || 1)}</span> ) hari, terhitung mulai tanggal <span className="font-semibold text-slate-950">{formattedStartDate}</span> s/d <span className="font-semibold text-slate-950">{formattedEndDate}</span>.
          </p>

          <p className="indent-6 sm:indent-8 text-slate-800">
            Demikian surat keterangan ini dibuat untuk dapat dipergunakan semestinya.
          </p>
        </div>
      )}

      {/* Content: SURAT SEHAT */}
      {surat.type === 'SEHAT' && (
        <div className="space-y-3 pt-3 text-xs sm:text-sm text-slate-800 leading-relaxed">
          <p className="indent-6 sm:indent-8">
            Pada pemeriksaan fisik saat ini dinyatakan dalam keadaan:
          </p>

          <div className="text-center py-2 bg-slate-50 border border-slate-200 rounded">
            <span className="font-bold text-base tracking-wider uppercase text-slate-900">
              SEHAT
            </span>
          </div>

          {/* Physical Measurements Grid */}
          <div className="border border-slate-200 rounded p-3 bg-slate-50/50 space-y-1.5 text-xs text-slate-800">
            <h4 className="font-bold border-b border-slate-200 pb-1 mb-2 text-slate-900">
              Hasil Pemeriksaan Fisik:
            </h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>• Tinggi Badan: <strong className="text-slate-950">{surat.heightCm ? `${surat.heightCm} cm` : '-'}</strong></div>
              <div>• Berat Badan: <strong className="text-slate-950">{surat.weightKg ? `${surat.weightKg} kg` : '-'}</strong></div>
              <div>• Tekanan Darah: <strong className="text-slate-950">{surat.bloodPressure || '-'} mmHg</strong></div>
              <div>• Golongan Darah: <strong className="text-slate-950">{surat.bloodType || '-'}</strong></div>
              <div>• Status Buta Warna: <strong className="text-slate-950">{surat.colorBlind || 'Tidak'}</strong></div>
            </div>
          </div>

          {surat.purpose && (
            <p className="indent-6 sm:indent-8">
              Surat keterangan ini dibuat untuk keperluan:{' '}
              <strong className="underline text-slate-950">{surat.purpose}</strong>.
            </p>
          )}

          <p className="indent-6 sm:indent-8 text-slate-800">
            Demikian surat keterangan ini dibuat untuk dapat dipergunakan semestinya.
          </p>
        </div>
      )}

      {/* Bottom Section: Notes/Dx on left, Signature & Stamp on right */}
      <div className="pt-8 flex justify-between items-start text-xs sm:text-sm">
        {/* Left: Notes / Diagnosis area (matching the handwritten rx/dx notes in the image) */}
        <div className="flex-1 pr-6 space-y-1.5 text-xs">
          {surat.diagnosis && (
            <div className="text-slate-800">
              <span className="font-semibold text-slate-950">dx : </span>
              <span className="italic text-slate-800">{surat.diagnosis}</span>
            </div>
          )}
          {surat.notes && (
            <div className="text-slate-700 whitespace-pre-line text-[11px] pt-1 leading-normal">
              {surat.notes}
            </div>
          )}
        </div>

        {/* Right: Signature & Stamp Block */}
        <div className="shrink-0 w-72 text-center space-y-1">
          <p className="text-slate-800">
            Subang, {formattedIssuedDate}
          </p>
          <p className="font-medium text-slate-900">
            Dokter Periksa,
          </p>
          <div className="h-16 sm:h-20 flex items-center justify-center">
            {/* Space for physical signature and stamp */}
          </div>
          <div className="space-y-0.5">
            <p className="font-bold underline underline-offset-4 decoration-1 text-slate-950 whitespace-nowrap text-xs sm:text-sm">
              (&nbsp;{surat.doctorName || 'dr. Raniisyana R. Rekkers'}&nbsp;)
            </p>
            {surat.doctorSip && (
              <p className="text-[11px] text-slate-600 whitespace-nowrap">
                SIP : {cleanSip(surat.doctorSip)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

