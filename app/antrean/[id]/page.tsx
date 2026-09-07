"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Plus, Trash2, CheckCircle2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getQueueById, saveMedicalRecordAndComplete } from "../actions"

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const queueId = parseInt(resolvedParams.id, 10)

    const [queue, setQueue] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form States
    const [complaint, setComplaint] = useState("")
    const [bloodPressure, setBloodPressure] = useState("")
    const [pulse, setPulse] = useState("")
    const [temperature, setTemperature] = useState("")
    const [weight, setWeight] = useState("")
    const [objectiveNotes, setObjectiveNotes] = useState("")
    const [diagnosis, setDiagnosis] = useState("")
    const [obatList, setObatList] = useState([{ nama: "", dosis: "", jumlah: "" }])

    useEffect(() => {
        async function fetchData() {
            if (isNaN(queueId)) {
                setLoading(false)
                return
            }
            try {
                const data = await getQueueById(queueId)
                setQueue(data)
            } catch (error) {
                console.error("Gagal memuat data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [queueId])

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Memuat data...</div>
    }

    if (isNaN(queueId) || !queue || !queue.patient) {
        return (
            <div className="p-8 text-center space-y-4">
                <h2 className="text-lg font-semibold text-foreground">Data Antrean / Pasien Tidak Ditemukan</h2>
                <p className="text-xs text-muted-foreground">ID yang Anda masukkan tidak valid atau tidak ditemukan di sistem.</p>
                <Link href="/antrean" className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Kembali ke Daftar Antrean
                </Link>
            </div>
        )
    }

    const patient = queue.patient
    const isCompleted = queue.status === 'SELESAI'

    const calculateAge = (dateString: string) => {
        if (!dateString) return "-"
        const birthDate = new Date(dateString)
        const difference = Date.now() - birthDate.getTime()
        const ageDate = new Date(difference)
        return Math.abs(ageDate.getUTCFullYear() - 1970)
    }

    const handleTambahObat = () => {
        setObatList([...obatList, { nama: "", dosis: "", jumlah: "" }])
    }

    const handleHapusObat = (index: number) => {
        const list = [...obatList]
        list.splice(index, 1)
        setObatList(list)
    }

    const handleSimpan = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        const result = await saveMedicalRecordAndComplete({
            queueId: queue.id,
            patientId: patient.id,
            complaint,
            bloodPressure,
            pulse,
            temperature,
            weight,
            objectiveNotes,
            diagnosis,
            medicines: obatList,
        })

        setSubmitting(false)

        if (result.success) {
            setIsModalOpen(true)
        } else {
            alert(result.error || "Gagal menyimpan rekam medis.")
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header Navigasi */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Link href="/antrean" className="hover:text-primary">Antrean</Link>
                        <span>&gt;</span>
                        <span>Pemeriksaan Aktif</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold">Detail Pemeriksaan</h1>
                        {isCompleted && (
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold">
                                Pemeriksaan Selesai
                            </span>
                        )}
                    </div>
                </div>
                <Link href="/antrean" className={cn(buttonVariants({ variant: "outline" }))}>
                    Kembali
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* KOLOM KIRI: Informasi & Riwayat Pasien */}
                <div className="space-y-6">
                    <div className="bg-white border rounded-lg p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start">
                            <h2 className="text-lg font-bold text-foreground">{patient.name}</h2>
                            <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded font-mono">
                                RM-{patient.id.toString().padStart(5, '0')}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-muted-foreground text-xs">Usia</p>
                                <p className="font-medium">{calculateAge(patient.dateOfBirth)} Thn</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Jenis Kelamin</p>
                                <p className="font-medium">
                                    {patient.gender === 'L' || patient.gender === 'Laki-laki' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm border-t pt-4">
                            <div>
                                <p className="text-muted-foreground text-xs">Alamat</p>
                                <p className="text-foreground">{patient.address || "-"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs">Kontak</p>
                                <p className="text-foreground">{patient.phone || "-"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Riwayat Medis Singkat */}
                    <div className="bg-white border rounded-lg shadow-sm">
                        <div className="p-4 border-b">
                            <h3 className="font-bold text-sm">Riwayat Medis Sebelumnya</h3>
                        </div>
                        <div className="p-4 space-y-3 text-sm">
                            {patient.medicalRecords && patient.medicalRecords.length > 0 ? (
                                patient.medicalRecords.map((rec: any, idx: number) => (
                                    <div key={idx} className="border-b pb-2 last:border-0 last:pb-0 text-xs space-y-1">
                                        <p className="text-muted-foreground">{new Date(rec.examinationDate).toLocaleDateString('id-ID')}</p>
                                        <p className="font-medium text-foreground">Keluhan: {rec.complaint || '-'}</p>
                                        <p className="text-gray-600">Diagnosa: {rec.diagnosis || '-'}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground">Belum ada riwayat rekam medis tercatat.</p>
                            )}
                            <Link href={`/pasien/${patient.id}`} className="block text-center w-full py-2 text-xs border rounded-md hover:bg-gray-50 transition mt-2">
                                Lihat Semua Riwayat Pasien
                            </Link>
                        </div>
                    </div>
                </div>

                {/* KOLOM KANAN: Form SOAP & Resep Obat */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSimpan} className="bg-white border rounded-lg shadow-sm p-6 space-y-8">
                        <h2 className="text-xl font-bold border-b pb-4">Form Pemeriksaan Hari Ini</h2>

                        {isCompleted && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-md text-sm">
                                Pemeriksaan untuk pasien ini telah selesai disimpan. Anda dapat melihat rekam medis terbarunya di bawah atau pada menu Rekam Medis.
                            </div>
                        )}

                        {/* Subjektif */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold">Keluhan Utama (Subjektif)</label>
                            <textarea
                                required
                                value={complaint}
                                onChange={(e) => setComplaint(e.target.value)}
                                className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-primary/20 outline-none"
                                placeholder="Tuliskan keluhan utama pasien..."
                            ></textarea>
                        </div>

                        {/* Diagnosa */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold">Diagnosa</label>
                            <input
                                type="text"
                                value={diagnosis}
                                onChange={(e) => setDiagnosis(e.target.value)}
                                placeholder="Contoh: Common Cold / ISPA"
                                className="w-full border rounded-md p-3 text-sm outline-none"
                            />
                        </div>

                        {/* Objektif / Tanda Vital */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold">Tanda Vital (Objektif)</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex border rounded-md overflow-hidden bg-white">
                                    <input
                                        type="text"
                                        value={bloodPressure}
                                        onChange={(e) => setBloodPressure(e.target.value)}
                                        placeholder="Tekanan Darah"
                                        className="w-full p-2 text-sm outline-none"
                                    />
                                    <span className="bg-gray-50 border-l px-2 py-2 text-xs text-gray-500 flex items-center">mmHg</span>
                                </div>
                                <div className="flex border rounded-md overflow-hidden bg-white">
                                    <input
                                        type="text"
                                        value={pulse}
                                        onChange={(e) => setPulse(e.target.value)}
                                        placeholder="Nadi"
                                        className="w-full p-2 text-sm outline-none"
                                    />
                                    <span className="bg-gray-50 border-l px-2 py-2 text-xs text-gray-500 flex items-center">x/m</span>
                                </div>
                                <div className="flex border rounded-md overflow-hidden bg-white">
                                    <input
                                        type="text"
                                        value={temperature}
                                        onChange={(e) => setTemperature(e.target.value)}
                                        placeholder="Suhu"
                                        className="w-full p-2 text-sm outline-none"
                                    />
                                    <span className="bg-gray-50 border-l px-2 py-2 text-xs text-gray-500 flex items-center">°C</span>
                                </div>
                                <div className="flex border rounded-md overflow-hidden bg-white">
                                    <input
                                        type="text"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        placeholder="Berat Badan"
                                        className="w-full p-2 text-sm outline-none"
                                    />
                                    <span className="bg-gray-50 border-l px-2 py-2 text-xs text-gray-500 flex items-center">kg</span>
                                </div>
                            </div>
                            <textarea
                                value={objectiveNotes}
                                onChange={(e) => setObjectiveNotes(e.target.value)}
                                className="w-full border rounded-md p-3 text-sm min-h-[80px] mt-2 outline-none"
                                placeholder="Catatan objektif tambahan..."
                            ></textarea>
                        </div>

                        {/* Plan: Resep Obat */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center border-b pb-2">
                                <label className="text-sm font-semibold">Resep & Obat (Plan)</label>
                                <button type="button" onClick={handleTambahObat} className="text-sm text-primary flex items-center gap-1 hover:underline">
                                    <Plus className="w-4 h-4" /> Tambah Obat
                                </button>
                            </div>

                            <div className="space-y-2">
                                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-1">
                                    <div className="col-span-6">Nama Obat</div>
                                    <div className="col-span-4">Dosis/Frekuensi</div>
                                    <div className="col-span-2 text-center">Jumlah</div>
                                </div>
                                {obatList.map((obat, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-6">
                                            <input
                                                type="text"
                                                value={obat.nama}
                                                onChange={(e) => {
                                                    const list = [...obatList]
                                                    list[index].nama = e.target.value
                                                    setObatList(list)
                                                }}
                                                placeholder="Contoh: Paracetamol 500mg"
                                                className="w-full border p-2 rounded text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <input
                                                type="text"
                                                value={obat.dosis}
                                                onChange={(e) => {
                                                    const list = [...obatList]
                                                    list[index].dosis = e.target.value
                                                    setObatList(list)
                                                }}
                                                placeholder="Dosis..."
                                                className="w-full border p-2 rounded text-sm outline-none"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <input
                                                type="number"
                                                value={obat.jumlah}
                                                onChange={(e) => {
                                                    const list = [...obatList]
                                                    list[index].jumlah = e.target.value
                                                    setObatList(list)
                                                }}
                                                placeholder="Jml"
                                                className="w-full border p-2 rounded text-sm outline-none text-center"
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                            {obatList.length > 1 && (
                                                <button type="button" onClick={() => handleHapusObat(index)} className="text-red-500 hover:text-red-700 p-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-6 border-t">
                            <Link href="/antrean" className={cn(buttonVariants({ variant: "outline" }))}>
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={submitting}
                                className={cn(buttonVariants({ variant: "default" }), "bg-slate-800 text-white")}
                            >
                                {submitting ? "Menyimpan..." : "Simpan Rekam Medis"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal Sukses */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold">Rekam Medis Berhasil Disimpan</h2>
                            <p className="text-sm text-muted-foreground">
                                Data rekam medis untuk pasien <span className="font-bold text-foreground">{patient.name}</span> telah berhasil disimpan dan status antrean diubah menjadi Selesai.
                            </p>
                        </div>
                        <div className="space-y-2 pt-4 border-t">
                            <Link href={`/pasien/${patient.id}`} className="block w-full py-2 bg-slate-800 text-white rounded-md text-sm font-medium hover:bg-slate-900 transition text-center">
                                Lihat Rekam Medis
                            </Link>
                            <button onClick={() => setIsModalOpen(false)} className="w-full py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}