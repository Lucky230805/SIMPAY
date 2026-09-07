'use client'

import React, { useState } from 'react'
import { FileText, CheckCircle2, AlertCircle, ArrowLeft, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PrescriptionQueueItem {
  id: number
  code: string
  priority: 'Cito' | 'Normal'
  patientName: string
  polyclinic: string
  doctorName: string
  waitTimeMinutes: number
  status: 'ANTRE' | 'PROSES' | 'SELESAI'
  createdAt: Date
  items: {
    id: number
    name: string
    dosage: string
    notes?: string
    qty: string
  }[]
  patient: {
    id: number
    name: string
    gender: string
    age: number
    noRM: string
    address?: string
    phone?: string
    allergy?: string
  }
}

interface ResepViewProps {
  initialQueues: PrescriptionQueueItem[]
}

export function ResepView({ initialQueues }: ResepViewProps) {
  const [queues, setQueues] = useState(initialQueues)
  const [activeTab, setActiveTab] = useState<'antrean' | 'selesai'>('antrean')
  const [selectedQueueId, setSelectedQueueId] = useState<number | null>(
    initialQueues.length > 0 ? initialQueues[0].id : null
  )
  const [processedAlert, setProcessedAlert] = useState<string | null>(null)
  const [detailMode, setDetailMode] = useState<boolean>(false)

  const antreList = queues.filter((q) => q.status !== 'SELESAI')
  const selesaiList = queues.filter((q) => q.status === 'SELESAI')

  const displayedList = activeTab === 'antrean' ? antreList : selesaiList
  const selectedQueue = queues.find((q) => q.id === selectedQueueId) || displayedList[0] || null

  const handleSelectQueue = (id: number) => {
    setSelectedQueueId(id)
  }

  const handleProsesDanSerahkan = (queue: PrescriptionQueueItem) => {
    setQueues((prev) =>
      prev.map((q) => (q.id === queue.id ? { ...q, status: 'SELESAI' as const } : q))
    )
    setProcessedAlert(`Obat untuk pasien ${queue.patientName} telah diserahkan dan status antrean resep telah diperbarui menjadi Selesai.`)
    setDetailMode(true)
  }

  return (
    <div className="p-6 space-y-6 w-full max-w-7xl mx-auto text-xs">
      {/* Alert Banner when processed */}
      {processedAlert && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start justify-between shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Resep Berhasil Diproses</h4>
              <p className="text-xs text-blue-700 mt-0.5">{processedAlert}</p>
            </div>
          </div>
          <button
            onClick={() => setProcessedAlert(null)}
            className="text-blue-500 hover:text-blue-700 text-xs font-bold px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mode Switch: Main Dashboard vs Detail View */}
      {!detailMode ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Daftar Antrean Resep</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manajemen penyiapan obat pasien.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full font-semibold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {antreList.length} Antre
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-full font-semibold text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                {selesaiList.length} Selesai
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border flex gap-6 text-sm font-semibold">
            <button
              onClick={() => {
                setActiveTab('antrean')
                if (antreList.length > 0) setSelectedQueueId(antreList[0].id)
              }}
              className={cn(
                'pb-3 border-b-2 transition-colors',
                activeTab === 'antrean'
                  ? 'border-slate-800 text-slate-900 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Antrean Resep ({antreList.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('selesai')
                if (selesaiList.length > 0) setSelectedQueueId(selesaiList[0].id)
              }}
              className={cn(
                'pb-3 border-b-2 transition-colors',
                activeTab === 'selesai'
                  ? 'border-slate-800 text-slate-900 font-bold'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Selesai Hari Ini ({selesaiList.length})
            </button>
          </div>

          {/* Split Content: Left List & Right Detail Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT LIST (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {displayedList.length === 0 ? (
                <div className="bg-white border rounded-xl p-12 text-center text-muted-foreground">
                  Belum ada resep dalam kategori ini.
                </div>
              ) : (
                displayedList.map((item) => {
                  const isSelected = selectedQueue?.id === item.id
                  const isCito = item.priority === 'Cito'

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectQueue(item.id)}
                      className={cn(
                        'bg-white border rounded-xl p-4 transition-all cursor-pointer flex items-center justify-between gap-4',
                        isCito ? 'border-red-200 bg-red-50/20' : 'border-border',
                        isSelected ? 'ring-2 ring-slate-800 shadow-sm' : 'hover:border-gray-300'
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                              {item.code}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.2 rounded font-semibold border',
                                isCito
                                  ? 'bg-red-100 text-red-700 border-red-200'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              )}
                            >
                              {isCito ? '▲ Cito' : 'Normal'}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-foreground leading-tight">
                            {item.patientName}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {item.polyclinic} • {item.doctorName}
                          </p>
                        </div>
                      </div>

                      <div className="text-right space-y-2 shrink-0">
                        <div>
                          <span className="text-[11px] text-muted-foreground block">Waktu tunggu:</span>
                          <span className="font-bold text-red-600 text-sm">
                            {item.waitTimeMinutes} mnt
                          </span>
                        </div>
                        {item.status !== 'SELESAI' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectQueue(item.id)
                              setDetailMode(true)
                            }}
                            className="px-3 py-1.5 bg-slate-800 text-white rounded-md text-xs font-semibold hover:bg-slate-900 transition"
                          >
                            Proses Resep
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectQueue(item.id)
                              setDetailMode(true)
                            }}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 bg-white rounded-md text-xs font-semibold hover:bg-gray-50 transition"
                          >
                            Lihat Rincian
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* RIGHT DETAIL PANEL (5 cols) */}
            {selectedQueue && (
              <div className="lg:col-span-5 bg-white border border-border rounded-xl p-5 shadow-sm space-y-5">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      DETAIL RESEP AKTIF
                    </span>
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded font-bold border',
                        selectedQueue.priority === 'Cito'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      )}
                    >
                      {selectedQueue.priority}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    {selectedQueue.code}
                  </p>
                  <h2 className="text-xl font-bold text-foreground mt-1">
                    {selectedQueue.patientName}
                  </h2>
                </div>

                {/* Prescription items list */}
                <div className="space-y-3 divide-y divide-border/60">
                  {selectedQueue.items.map((item, idx) => (
                    <div key={idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-foreground text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.dosage}</p>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200 font-mono font-semibold text-xs shrink-0">
                        {item.qty}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Allergy warning if present */}
                {selectedQueue.patient.allergy && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      Pasien memiliki riwayat alergi terhadap{' '}
                      <span className="font-bold">{selectedQueue.patient.allergy}</span>. Harap
                      periksa ulang kesesuaian resep.
                    </p>
                  </div>
                )}

                {/* Submit action */}
                <div className="pt-3 border-t">
                  {selectedQueue.status !== 'SELESAI' ? (
                    <button
                      onClick={() => handleProsesDanSerahkan(selectedQueue)}
                      className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-900 transition text-center"
                    >
                      Selesai &amp; Serahkan
                    </button>
                  ) : (
                    <button
                      onClick={() => setDetailMode(true)}
                      className="w-full py-2.5 border border-gray-300 text-gray-700 bg-white rounded-lg font-bold text-sm hover:bg-gray-50 transition text-center"
                    >
                      Lihat Detail Lengkap
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* DETAIL VIEW SCREEN (Matching 2nd Screenshot) */
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDetailMode(false)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Daftar
                </button>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">Detail Resep</h1>
              <p className="text-xs text-muted-foreground">ID Resep: {selectedQueue?.code}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDetailMode(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold hover:bg-gray-50"
              >
                Kembali ke Daftar
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Label
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Info Panel */}
            <div className="lg:col-span-5 space-y-6">
              {/* Patient Info Card */}
              <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm border-b pb-2">Informasi Pasien</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 font-bold text-gray-700 flex items-center justify-center text-sm">
                    {selectedQueue?.patientName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-base">{selectedQueue?.patientName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedQueue?.patient.gender}, {selectedQueue?.patient.age} Tahun
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">No. RM:</span>
                    <span className="font-mono font-bold">{selectedQueue?.patient.noRM}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dokter:</span>
                    <span className="font-medium">{selectedQueue?.doctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Poli:</span>
                    <span className="font-medium">{selectedQueue?.polyclinic}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold text-[10px]">
                      ✓ SELESAI
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Timeline Log */}
              <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="font-bold text-sm border-b pb-2">Log Status</h3>
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-4 text-xs">
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <p className="font-mono text-[11px] text-muted-foreground">10:05</p>
                    <p className="font-semibold text-foreground">Resep Diterima</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <p className="font-mono text-[11px] text-muted-foreground">10:15</p>
                    <p className="font-semibold text-foreground">Sedang Disiapkan</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-800" />
                    <p className="font-mono text-[11px] font-bold text-slate-800">10:22</p>
                    <p className="font-bold text-slate-900">Selesai &amp; Diserahkan</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Table & Completion Panel */}
            <div className="lg:col-span-7 space-y-6">
              {/* Medicine Table */}
              <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="font-bold text-sm">Daftar Obat</h3>
                  <span className="text-xs text-muted-foreground">
                    {selectedQueue?.items.length} Item
                  </span>
                </div>

                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="py-2 w-10">No</th>
                      <th className="py-2">Nama Obat</th>
                      <th className="py-2">Dosis / Aturan Pakai</th>
                      <th className="py-2 text-right">Jumlah</th>
                      <th className="py-2 text-center w-12">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedQueue?.items.map((item, idx) => (
                      <tr key={idx} className="py-2">
                        <td className="py-3 font-medium text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 font-bold text-foreground">{item.name}</td>
                        <td className="py-3 text-muted-foreground">{item.dosage}</td>
                        <td className="py-3 text-right font-mono font-bold">{item.qty}</td>
                        <td className="py-3 text-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Completion Card */}
              <div className="bg-white border rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Proses Selesai</h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Resep ini telah selesai diproses dan obat telah diserahkan kepada pasien. Tidak ada
                  tindakan lebih lanjut yang diperlukan.
                </p>
                <button
                  onClick={() => setDetailMode(false)}
                  className="mt-2 px-4 py-2 bg-slate-800 text-white font-bold rounded-lg text-xs hover:bg-slate-900 transition"
                >
                  Lihat Antrean Berikutnya
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
