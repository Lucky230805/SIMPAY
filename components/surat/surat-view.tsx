'use client'

import { useState } from 'react'
import {
  FileCheck,
  Search,
  Plus,
  Printer,
  Trash2,
  FileText,
  HeartPulse,
  Calendar,
  User,
  Filter,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  SuratItem,
  createSuratSakitAction,
  createSuratSehatAction,
  deleteSuratAction,
} from '@/app/surat/actions'
import { CreateSuratSakitModal } from '@/components/surat/create-surat-sakit-modal'
import { CreateSuratSehatModal } from '@/components/surat/create-surat-sehat-modal'
import { SuratDetailPrintModal } from '@/components/surat/surat-detail-print-modal'

interface PatientOption {
  id: number
  name: string
  dateOfBirth: Date | string
  gender: string
  address: string | null
  phone: string | null
}

interface DoctorOption {
  id: number
  name: string
  sipNumber: string | null
}

interface SuratViewProps {
  initialSuratList: SuratItem[]
  patients: PatientOption[]
  doctors?: DoctorOption[]
}

export function SuratView({ initialSuratList, patients, doctors = [] }: SuratViewProps) {
  const [suratList, setSuratList] = useState<SuratItem[]>(initialSuratList)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'ALL' | 'SAKIT' | 'SEHAT'>('ALL')

  // Modals state
  const [isSakitModalOpen, setIsSakitModalOpen] = useState(false)
  const [isSehatModalOpen, setIsSehatModalOpen] = useState(false)
  const [selectedSuratForPrint, setSelectedSuratForPrint] = useState<SuratItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Filtered List
  const filteredList = suratList.filter((item) => {
    // Filter by type
    if (activeTab === 'SAKIT' && item.type !== 'SAKIT') return false
    if (activeTab === 'SEHAT' && item.type !== 'SEHAT') return false

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchNo = item.certificateNo.toLowerCase().includes(q)
      const matchName = item.patientName.toLowerCase().includes(q)
      const matchIssuer = item.issuedByName.toLowerCase().includes(q)
      const matchPurpose = item.purpose?.toLowerCase().includes(q) || false
      const matchDiagnosis = item.diagnosis?.toLowerCase().includes(q) || false

      return matchNo || matchName || matchIssuer || matchPurpose || matchDiagnosis
    }

    return true
  })

  // Stats
  const totalSurat = suratList.length
  const totalSakit = suratList.filter((s) => s.type === 'SAKIT').length
  const totalSehat = suratList.filter((s) => s.type === 'SEHAT').length
  
  const todayStr = new Date().toDateString()
  const todayCount = suratList.filter(
    (s) => new Date(s.date).toDateString() === todayStr
  ).length

  // Handlers for creating certificates
  const handleCreateSakit = async (payload: {
    patientId: number
    startDate: string
    endDate: string
    diagnosis?: string
    occupation?: string
    notes?: string
  }) => {
    const res = await createSuratSakitAction(payload)
    if (res.success && res.data) {
      // Find patient details
      const patient = patients.find((p) => p.id === payload.patientId)
      const newItem: SuratItem = {
        id: res.data.id,
        certificateNo: res.data.certificateNo,
        type: 'SAKIT',
        patientId: res.data.patientId,
        patientName: patient?.name || 'Pasien',
        patientDob: new Date(patient?.dateOfBirth || new Date()),
        patientGender: patient?.gender || 'Laki-laki',
        patientAddress: patient?.address || null,
        patientPhone: patient?.phone || null,
        issuedById: res.data.issuedById,
        issuedByName: res.data.issuedByName,
        date: res.data.date,
        startDate: res.data.startDate,
        endDate: res.data.endDate,
        durationDays: res.data.durationDays,
        diagnosis: res.data.diagnosis,
        occupation: res.data.occupation,
        notes: res.data.notes,
        createdAt: res.data.createdAt,
      }

      setSuratList((prev) => [newItem, ...prev])
      // Open print modal directly for convenience!
      setSelectedSuratForPrint(newItem)
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  const handleCreateSehat = async (payload: {
    patientId: number
    heightCm?: number
    weightKg?: number
    bloodPressure?: string
    bloodType?: string
    colorBlind?: string
    purpose?: string
    notes?: string
  }) => {
    const res = await createSuratSehatAction(payload)
    if (res.success && res.data) {
      const patient = patients.find((p) => p.id === payload.patientId)
      const newItem: SuratItem = {
        id: res.data.id,
        certificateNo: res.data.certificateNo,
        type: 'SEHAT',
        patientId: res.data.patientId,
        patientName: patient?.name || 'Pasien',
        patientDob: new Date(patient?.dateOfBirth || new Date()),
        patientGender: patient?.gender || 'Laki-laki',
        patientAddress: patient?.address || null,
        patientPhone: patient?.phone || null,
        issuedById: res.data.issuedById,
        issuedByName: res.data.issuedByName,
        date: res.data.date,
        heightCm: res.data.heightCm,
        weightKg: res.data.weightKg,
        bloodPressure: res.data.bloodPressure,
        bloodType: res.data.bloodType,
        colorBlind: res.data.colorBlind,
        purpose: res.data.purpose,
        notes: res.data.notes,
        createdAt: res.data.createdAt,
      }

      setSuratList((prev) => [newItem, ...prev])
      // Open print modal directly!
      setSelectedSuratForPrint(newItem)
      return { success: true }
    }
    return { success: false, error: res.error }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus catatan surat ini?')) return
    setDeletingId(id)
    const res = await deleteSuratAction(id)
    setDeletingId(null)
    if (res.success) {
      setSuratList((prev) => prev.filter((item) => item.id !== id))
    } else {
      alert(res.error || 'Gagal menghapus surat.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Surat Keterangan Medis
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              Layanan Perawat &amp; Dokter
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penerbitan dan pengolahan Surat Keterangan Sakit dan Surat Keterangan Sehat resmi klinik.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={() => setIsSakitModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
          >
            <FileText className="w-4 h-4" /> + Surat Sakit
          </Button>
          <Button
            onClick={() => setIsSehatModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
          >
            <HeartPulse className="w-4 h-4" /> + Surat Sehat
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Surat Diterbitkan</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{totalSurat}</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-lg">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Surat Keterangan Sakit</p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-0.5">{totalSakit}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Surat Keterangan Sehat</p>
            <p className="text-xl sm:text-2xl font-extrabold text-teal-600 mt-0.5">{totalSehat}</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
            <HeartPulse className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-border shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Diterbitkan Hari Ini</p>
            <p className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-0.5">{todayCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({totalSurat})
            </button>
            <button
              onClick={() => setActiveTab('SAKIT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'SAKIT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Surat Sakit ({totalSakit})
            </button>
            <button
              onClick={() => setActiveTab('SEHAT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'SEHAT'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Surat Sehat ({totalSehat})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nomor surat, nama pasien, atau diagnosa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs sm:text-sm bg-slate-50 border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Table of Issued Certificates */}
      <div className="bg-white rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5">Nomor Surat</th>
                <th className="px-4 py-3.5">Pasien</th>
                <th className="px-4 py-3.5">Tipe Surat</th>
                <th className="px-4 py-3.5">Detail / Keperluan</th>
                <th className="px-4 py-3.5">Tgl Terbit</th>
                <th className="px-4 py-3.5">Petugas Medis</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    <FileCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    Belum ada surat keterangan yang diterbitkan.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {item.certificateNo}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900">{item.patientName}</div>
                      <div className="text-[11px] text-slate-500">
                        {(item.patientGender === 'L' || item.patientGender === 'Laki-laki') ? 'Laki-laki' : 'Perempuan'} {item.patientPhone ? `• ${item.patientPhone}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {item.type === 'SAKIT' ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px]">
                          SURAT SAKIT
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 font-bold text-[11px]">
                          SURAT SEHAT
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate">
                      {item.type === 'SAKIT' ? (
                        <div>
                          <span className="font-semibold text-emerald-800">{item.durationDays || 1} Hari</span>
                          {item.diagnosis && <span className="text-slate-500 text-xs"> - {item.diagnosis}</span>}
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-teal-800">{item.purpose || 'Keperluan Umum'}</span>
                          {item.bloodPressure && (
                            <span className="text-slate-500 text-xs"> ({item.bloodPressure} mmHg)</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-800 whitespace-nowrap">
                      {item.issuedByName}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSuratForPrint(item)}
                          className="text-xs h-8 px-2.5 gap-1 text-slate-700 hover:text-slate-900 border-slate-300"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" /> Detail &amp; Cetak
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="text-xs h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateSuratSakitModal
        isOpen={isSakitModalOpen}
        onClose={() => setIsSakitModalOpen(false)}
        patients={patients}
        doctors={doctors}
        onSubmit={handleCreateSakit}
      />

      <CreateSuratSehatModal
        isOpen={isSehatModalOpen}
        onClose={() => setIsSehatModalOpen(false)}
        patients={patients}
        doctors={doctors}
        onSubmit={handleCreateSehat}
      />

      <SuratDetailPrintModal
        surat={selectedSuratForPrint}
        isOpen={!!selectedSuratForPrint}
        onClose={() => setSelectedSuratForPrint(null)}
      />
    </div>
  )
}
