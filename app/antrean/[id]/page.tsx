"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ArrowLeft,
    Plus,
    Trash2,
    CheckCircle2,
    FileText,
    Activity,
    Stethoscope,
    Pill,
    ShieldAlert,
    Edit3
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getQueueById, saveMedicalRecordAndComplete } from "../actions"

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const resolvedParams = use(params)
    const queueId = parseInt(resolvedParams.id, 10)

    const [queue, setQueue] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    // Standard Klinik Umum (SOAP) Form States
    // 1. Subjektif (Anamnesis)
    const [complaint, setComplaint] = useState("")
    const [pastHistory, setPastHistory] = useState("")
    const [allergy, setAllergy] = useState("")

    // 2. Objektif (Tanda Vital & Pemeriksaan Fisik)
    const [bloodPressure, setBloodPressure] = useState("")
    const [pulse, setPulse] = useState("")
    const [temperature, setTemperature] = useState("")
    const [respiratoryRate, setRespiratoryRate] = useState("")
    const [weight, setWeight] = useState("")
    const [height, setHeight] = useState("")
    const [spo2, setSpo2] = useState("")
    const [objectiveNotes, setObjectiveNotes] = useState("")

    // 3. Asesmen (Diagnosis)
    const [diagnosis, setDiagnosis] = useState("")
    const [icd10Code, setIcd10Code] = useState("")
    const [secondaryDiagnosis, setSecondaryDiagnosis] = useState("")

    // 4. Plan (Penatalaksanaan & Resep Obat)
    const [actionTreatment, setActionTreatment] = useState("")
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

                if (data && data.patient && data.patient.medicalRecords && data.patient.medicalRecords.length > 0) {
                    const rec = data.patient.medicalRecords[0]
                    if (rec) {
                        setComplaint(rec.complaint || "")
                        setPastHistory((rec as any).pastHistory || "")
                        setAllergy(rec.allergy || "")
                        setBloodPressure(rec.bloodPressure ? rec.bloodPressure.replace(/\s*mmHg/i, '') : "")
                        setPulse(rec.heartRate ? rec.heartRate.replace(/\s*x\/m/i, '') : "")
                        setTemperature(rec.temperature ? rec.temperature.replace(/\s*°C/i, '') : "")
                        setRespiratoryRate(rec.respiratoryRate ? rec.respiratoryRate.replace(/\s*x\/m/i, '') : "")
                        setObjectiveNotes(rec.notes || "")
                        setDiagnosis(rec.diagnosis || "")
                        setIcd10Code(rec.icd10Code || "")
                        setSecondaryDiagnosis(rec.secondaryDiagnosis || "")
                        setActionTreatment(rec.treatment || "")

                        if (rec.prescriptions && rec.prescriptions.length > 0) {
                            setObatList(
                                rec.prescriptions.map((p: any) => ({
                                    nama: p.medicineName || "",
                                    dosis: p.dosage || "",
                                    jumlah: p.instructions ? p.instructions.replace(/^Jumlah:\s*/i, '') : ""
                                }))
                            )
                        }
                    }
                }
            } catch (error) {
                console.error("Gagal memuat data:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [queueId])

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Memuat data pemeriksaan...</div>
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
            pastHistory,
            allergy,
            bloodPressure,
            pulse,
            temperature,
            respiratoryRate,
            weight,
            height,
            spo2,
            objectiveNotes,
            diagnosis,
            icd10Code,
            secondaryDiagnosis,
            actionTreatment,
            medicines: obatList,
        })

        setSubmitting(false)

        if (result.success) {
            setIsEditing(false)
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Link href="/antrean" className="hover:text-primary">Antrean</Link>
                        <span>&gt;</span>
                        <span className="font-semibold text-foreground">Pemeriksaan Dokter</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Pemeriksaan Pasien</h1>
                        <span className="bg-primary/10 text-primary border border-primary/20 text-xs px-2.5 py-0.5 rounded font-mono font-bold">
                            {queue.polyclinic || "Poli Umum"}
                        </span>
                        {isCompleted && (
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Pemeriksaan Selesai
                            </span>
                        )}
                    </div>
                </div>
                <Link href="/antrean" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Kembali
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* KOLOM KIRI: Identitas & Riwayat Pasien (4 Cols) */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Ringkasan Pasien */}
                    <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-start border-b pb-3">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">{patient.name}</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {patient.gender === 'L' || patient.gender === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}, {calculateAge(patient.dateOfBirth)} Tahun
                                </p>
                            </div>
                            <span className="bg-gray-100 text-gray-800 border text-xs px-2 py-1 rounded font-mono font-bold">
                                RM-{patient.id.toString().padStart(5, '0')}
                            </span>
                        </div>

                        <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">No. Antrean:</span>
                                <span className="font-bold text-primary font-mono text-sm">
                                    #{queue.queueNumber.toString().padStart(3, '0')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Poli Tujuan:</span>
                                <span className="font-semibold text-foreground">{queue.polyclinic || "Poli Umum"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Kontak:</span>
                                <span className="font-mono text-foreground">{patient.phone || "-"}</span>
                            </div>
                            <div className="pt-2 border-t">
                                <span className="text-muted-foreground block mb-0.5">Alamat Lengkap:</span>
                                <p className="text-foreground leading-relaxed">{patient.address || "-"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Riwayat Medis Sebelumnya */}
                    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-primary" />
                                Riwayat Rekam Medis
                            </h3>
                            <span className="text-[11px] text-muted-foreground font-semibold">
                                {patient.medicalRecords?.length || 0} Catatan
                            </span>
                        </div>
                        <div className="p-4 space-y-3">
                            {patient.medicalRecords && patient.medicalRecords.length > 0 ? (
                                patient.medicalRecords.slice(0, 4).map((rec: any, idx: number) => (
                                    <div key={idx} className="p-3 bg-muted/20 border rounded-lg text-xs space-y-1">
                                        <div className="flex justify-between text-[11px] text-muted-foreground">
                                            <span className="font-medium">{new Date(rec.examinationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            {rec.icd10Code && <span className="font-mono font-bold text-primary">{rec.icd10Code}</span>}
                                        </div>
                                        <p className="font-bold text-foreground">{rec.diagnosis || 'Pemeriksaan Umum'}</p>
                                        {rec.complaint && <p className="text-muted-foreground text-[11px] line-clamp-2">Keluhan: {rec.complaint}</p>}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground text-center py-3">Belum ada riwayat rekam medis tercatat.</p>
                            )}
                            <Link href={`/pasien/${patient.id}`} className="block text-center w-full py-2 text-xs font-semibold border rounded-lg hover:bg-gray-50 transition text-primary mt-2">
                                Lihat Rekam Medis Lengkap Pasien
                            </Link>
                        </div>
                    </div>
                </div>

                {/* KOLOM KANAN: Form ATAU Ringkasan Hasil Pemeriksaan (8 Cols) */}
                <div className="lg:col-span-8">
                    {isCompleted && !isEditing ? (
                        /* RINGKASAN HASIL PEMERIKSAAN (READ-ONLY VIEW) */
                        <div className="bg-white border rounded-xl shadow-sm p-6 space-y-6 text-xs">
                            <div className="border-b pb-4 flex justify-between items-center">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-foreground">Hasil Pemeriksaan Pasien</h2>
                                        <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            Pemeriksaan Selesai
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">Rekam medis telah tersimpan secara resmi di sistem klinik.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="px-3 py-1.5 border rounded-lg text-xs font-semibold hover:bg-muted flex items-center gap-1.5 transition text-foreground"
                                >
                                    <Edit3 className="w-3.5 h-3.5 text-primary" /> Edit Rekam Medis
                                </button>
                            </div>

                            {/* Alert status */}
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-lg text-xs flex items-center gap-2.5">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <span>Pemeriksaan untuk pasien ini telah selesai disiapkan. Hasil diagnosis &amp; resep obat sudah tercatat.</span>
                            </div>

                            {/* S - Subjektif */}
                            <div className="p-4 rounded-lg border bg-slate-50/60 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <span>S — Subjektif (Anamnesis)</span>
                                </div>
                                <div className="space-y-1 pt-1">
                                    <span className="text-muted-foreground block text-[11px]">Keluhan Utama:</span>
                                    <p className="font-semibold text-foreground text-xs bg-white p-2.5 rounded border leading-relaxed">
                                        {complaint || "Pemeriksaan Umum / Routine Checkup"}
                                    </p>
                                </div>
                                {(pastHistory || allergy) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        {pastHistory && (
                                            <div>
                                                <span className="text-muted-foreground block text-[11px]">Riwayat Penyakit:</span>
                                                <p className="font-medium text-foreground bg-white p-2 rounded border mt-0.5">{pastHistory}</p>
                                            </div>
                                        )}
                                        {allergy && (
                                            <div>
                                                <span className="text-muted-foreground block text-[11px] flex items-center gap-1">
                                                    <ShieldAlert className="w-3 h-3 text-amber-600 inline" /> Riwayat Alergi:
                                                </span>
                                                <p className="font-medium text-amber-900 bg-amber-50/60 p-2 rounded border border-amber-200 mt-0.5">{allergy}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* O - Objektif */}
                            <div className="p-4 rounded-lg border bg-white space-y-3 shadow-xs">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                                    <Activity className="w-4 h-4 text-emerald-600" />
                                    <span>O — Objektif (Tanda Vital &amp; Fisik)</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                                    <div className="p-2 bg-slate-50 border rounded-lg text-center">
                                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">TD</span>
                                        <span className="font-bold text-foreground font-mono">{bloodPressure || "-"} <span className="text-[9px] font-normal">mmHg</span></span>
                                    </div>
                                    <div className="p-2 bg-slate-50 border rounded-lg text-center">
                                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Nadi</span>
                                        <span className="font-bold text-foreground font-mono">{pulse || "-"} <span className="text-[9px] font-normal">x/m</span></span>
                                    </div>
                                    <div className="p-2 bg-slate-50 border rounded-lg text-center">
                                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Suhu</span>
                                        <span className="font-bold text-foreground font-mono">{temperature || "-"} <span className="text-[9px] font-normal">°C</span></span>
                                    </div>
                                    <div className="p-2 bg-slate-50 border rounded-lg text-center">
                                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">RR</span>
                                        <span className="font-bold text-foreground font-mono">{respiratoryRate || "-"} <span className="text-[9px] font-normal">x/m</span></span>
                                    </div>
                                    <div className="p-2 bg-slate-50 border rounded-lg text-center">
                                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">BB</span>
                                        <span className="font-bold text-foreground font-mono">{weight || "-"} <span className="text-[9px] font-normal">kg</span></span>
                                    </div>
                                    <div className="p-2 bg-slate-50 border rounded-lg text-center">
                                        <span className="text-[10px] text-muted-foreground font-semibold block uppercase">SpO2</span>
                                        <span className="font-bold text-foreground font-mono">{spo2 || "-"} <span className="text-[9px] font-normal">%</span></span>
                                    </div>
                                </div>
                                {objectiveNotes && (
                                    <div className="pt-1">
                                        <span className="text-muted-foreground block text-[11px]">Catatan Pemeriksaan Fisik:</span>
                                        <p className="font-medium text-foreground bg-slate-50 p-2 rounded border mt-0.5">{objectiveNotes}</p>
                                    </div>
                                )}
                            </div>

                            {/* A - Asesmen */}
                            <div className="p-4 rounded-lg border bg-slate-50/60 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                                    <Stethoscope className="w-4 h-4 text-purple-600" />
                                    <span>A — Asesmen (Diagnosis Medis)</span>
                                </div>
                                <div className="flex items-start justify-between gap-3 pt-1">
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Diagnosis Utama:</span>
                                        <p className="font-bold text-foreground text-sm">{diagnosis || "Pemeriksaan Umum"}</p>
                                    </div>
                                    {icd10Code && (
                                        <span className="bg-purple-100 text-purple-800 border border-purple-200 text-xs px-2.5 py-1 rounded font-mono font-bold">
                                            ICD-10: {icd10Code}
                                        </span>
                                    )}
                                </div>
                                {secondaryDiagnosis && (
                                    <div className="pt-1">
                                        <span className="text-muted-foreground block text-[11px]">Diagnosis Sekunder:</span>
                                        <p className="font-medium text-foreground">{secondaryDiagnosis}</p>
                                    </div>
                                )}
                            </div>

                            {/* P - Plan & Resep */}
                            <div className="p-4 rounded-lg border bg-white space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                                    <Pill className="w-4 h-4 text-indigo-600" />
                                    <span>P — Plan (Tindakan &amp; Resep Obat)</span>
                                </div>
                                {actionTreatment && (
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Tindakan &amp; Edukasi:</span>
                                        <p className="font-medium text-foreground bg-slate-50 p-2 rounded border mt-0.5">{actionTreatment}</p>
                                    </div>
                                )}

                                <div className="space-y-2 pt-1">
                                    <span className="text-muted-foreground block text-[11px] font-bold">Daftar Resep Obat:</span>
                                    {obatList.length > 0 && obatList[0].nama ? (
                                        <div className="border rounded-lg overflow-hidden">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-100 border-b text-[11px] text-muted-foreground">
                                                        <th className="p-2 font-semibold text-center w-10">No</th>
                                                        <th className="p-2 font-semibold">Nama Obat &amp; Sediaan</th>
                                                        <th className="p-2 font-semibold">Dosis / Aturan Pakai</th>
                                                        <th className="p-2 font-semibold text-center">Jumlah</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {obatList.map((ob, idx) => (
                                                        <tr key={idx} className="border-b last:border-0 hover:bg-slate-50 text-xs">
                                                            <td className="p-2 font-mono text-muted-foreground text-center">{idx + 1}</td>
                                                            <td className="p-2 font-semibold text-foreground">{ob.nama}</td>
                                                            <td className="p-2 text-muted-foreground">{ob.dosis || "-"}</td>
                                                            <td className="p-2 text-center font-mono font-bold text-primary">{ob.jumlah || "-"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic bg-slate-50 p-2 rounded border">Tidak ada resep obat yang ditambahkan.</p>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-center pt-4 border-t">
                                <p className="text-xs text-muted-foreground">Pemeriksaan selesai. Rekam medis telah tercatat di profil pasien.</p>
                                <Link href="/antrean" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}>
                                    Kembali ke Daftar Antrean
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* EDITABLE FORM (FOR NEW OR EDITING EXAMINATIONS) */
                        <form onSubmit={handleSimpan} className="bg-white border rounded-xl shadow-sm p-6 space-y-6 text-xs">
                            <div className="border-b pb-3 flex justify-between items-center">
                                <div>
                                    <h2 className="text-lg font-bold text-foreground">
                                        {isEditing ? "Edit Data Rekam Medis (SOAP)" : "Form Pemeriksaan Klinik Umum (SOAP)"}
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">Standar pencatatan medis sesuai regulasi pelayanan kesehatan umum.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-2.5 py-1 border rounded text-xs font-medium text-muted-foreground hover:bg-muted"
                                        >
                                            Batal Edit
                                        </button>
                                    )}
                                    <span className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-semibold">
                                        S.O.A.P Format
                                    </span>
                                </div>
                            </div>

                            {/* ─── SECTION S: SUBJEKTIF ─── */}
                            <div className="p-4 rounded-lg border border-border bg-slate-50/50 space-y-3.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <span>S — Subjektif (Anamnesis Pasien)</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="font-semibold text-foreground">
                                        Keluhan Utama (Chief Complaint) <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={complaint}
                                        onChange={(e) => setComplaint(e.target.value)}
                                        placeholder="Tuliskan keluhan utama yang disampaikan pasien (onset, durasi, lokasi nyeri, dll)..."
                                        disabled={submitting}
                                        className="w-full rounded-md border border-input p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                    ></textarea>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="font-semibold text-foreground">Riwayat Penyakit Sekarang / Dahulu</label>
                                        <input
                                            type="text"
                                            value={pastHistory}
                                            onChange={(e) => setPastHistory(e.target.value)}
                                            placeholder="Contoh: Hipertensi, Diabetes Mellitus, Maag..."
                                            disabled={submitting}
                                            className="w-full rounded-md border border-input p-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-semibold text-foreground flex items-center gap-1">
                                            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 inline" />
                                            Riwayat Alergi (Obat / Makanan)
                                        </label>
                                        <input
                                            type="text"
                                            value={allergy}
                                            onChange={(e) => setAllergy(e.target.value)}
                                            placeholder="Contoh: Alergi Amoxicillin, Seafood, Tidak ada..."
                                            disabled={submitting}
                                            className="w-full rounded-md border border-input p-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ─── SECTION O: OBJEKTIF ─── */}
                            <div className="p-4 rounded-lg border border-border bg-white space-y-3.5 shadow-xs">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                                    <Activity className="w-4 h-4 text-emerald-600" />
                                    <span>O — Objektif (Tanda Vital &amp; Pemeriksaan Fisik)</span>
                                </div>

                                {/* Vital Signs Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">Tekanan Darah</label>
                                        <div className="flex border rounded-md overflow-hidden bg-white">
                                            <input
                                                type="text"
                                                value={bloodPressure}
                                                onChange={(e) => setBloodPressure(e.target.value)}
                                                placeholder="120/80"
                                                disabled={submitting}
                                                className="w-full p-1.5 text-xs outline-none font-mono"
                                            />
                                            <span className="bg-gray-100 border-l px-1.5 py-1 text-[10px] text-gray-600 flex items-center font-medium">mmHg</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">Nadi</label>
                                        <div className="flex border rounded-md overflow-hidden bg-white">
                                            <input
                                                type="text"
                                                value={pulse}
                                                onChange={(e) => setPulse(e.target.value)}
                                                placeholder="80"
                                                disabled={submitting}
                                                className="w-full p-1.5 text-xs outline-none font-mono"
                                            />
                                            <span className="bg-gray-100 border-l px-1.5 py-1 text-[10px] text-gray-600 flex items-center font-medium">x/m</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">Suhu Tubuh</label>
                                        <div className="flex border rounded-md overflow-hidden bg-white">
                                            <input
                                                type="text"
                                                value={temperature}
                                                onChange={(e) => setTemperature(e.target.value)}
                                                placeholder="36.5"
                                                disabled={submitting}
                                                className="w-full p-1.5 text-xs outline-none font-mono"
                                            />
                                            <span className="bg-gray-100 border-l px-1.5 py-1 text-[10px] text-gray-600 flex items-center font-medium">°C</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">Laju Napas (RR)</label>
                                        <div className="flex border rounded-md overflow-hidden bg-white">
                                            <input
                                                type="text"
                                                value={respiratoryRate}
                                                onChange={(e) => setRespiratoryRate(e.target.value)}
                                                placeholder="18"
                                                disabled={submitting}
                                                className="w-full p-1.5 text-xs outline-none font-mono"
                                            />
                                            <span className="bg-gray-100 border-l px-1.5 py-1 text-[10px] text-gray-600 flex items-center font-medium">x/m</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">Berat Badan</label>
                                        <div className="flex border rounded-md overflow-hidden bg-white">
                                            <input
                                                type="text"
                                                value={weight}
                                                onChange={(e) => setWeight(e.target.value)}
                                                placeholder="60"
                                                disabled={submitting}
                                                className="w-full p-1.5 text-xs outline-none font-mono"
                                            />
                                            <span className="bg-gray-100 border-l px-1.5 py-1 text-[10px] text-gray-600 flex items-center font-medium">kg</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground block">SpO2</label>
                                        <div className="flex border rounded-md overflow-hidden bg-white">
                                            <input
                                                type="text"
                                                value={spo2}
                                                onChange={(e) => setSpo2(e.target.value)}
                                                placeholder="98"
                                                disabled={submitting}
                                                className="w-full p-1.5 text-xs outline-none font-mono"
                                            />
                                            <span className="bg-gray-100 border-l px-1.5 py-1 text-[10px] text-gray-600 flex items-center font-medium">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1 pt-1">
                                    <label className="font-semibold text-foreground">Catatan Pemeriksaan Fisik (Status Lokalis)</label>
                                    <textarea
                                        rows={2}
                                        value={objectiveNotes}
                                        onChange={(e) => setObjectiveNotes(e.target.value)}
                                        placeholder="Catatan inspeksi, palpasi, auskultasi, perkusi (Kepala, THT, Thorax, Abdomen, Ekstremitas)..."
                                        disabled={submitting}
                                        className="w-full rounded-md border border-input p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                    ></textarea>
                                </div>
                            </div>

                            {/* ─── SECTION A: ASESMEN ─── */}
                            <div className="p-4 rounded-lg border border-border bg-slate-50/50 space-y-3.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                                    <Stethoscope className="w-4 h-4 text-purple-600" />
                                    <span>A — Asesmen (Diagnosis Medis)</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="sm:col-span-2 space-y-1">
                                        <label className="font-semibold text-foreground">
                                            Diagnosis Utama (Primary Diagnosis) <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={diagnosis}
                                            onChange={(e) => setDiagnosis(e.target.value)}
                                            placeholder="Contoh: Infeksi Saluran Pernapasan Akut (ISPA) / Dyspepsia..."
                                            disabled={submitting}
                                            className="w-full rounded-md border border-input p-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 bg-white font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="font-semibold text-foreground">Kode ICD-10</label>
                                        <input
                                            type="text"
                                            value={icd10Code}
                                            onChange={(e) => setIcd10Code(e.target.value)}
                                            placeholder="Contoh: J06.9"
                                            disabled={submitting}
                                            className="w-full rounded-md border border-input p-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 bg-white font-mono uppercase"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="font-semibold text-foreground">Diagnosis Sekunder / Komplikasi (Bila ada)</label>
                                    <input
                                        type="text"
                                        value={secondaryDiagnosis}
                                        onChange={(e) => setSecondaryDiagnosis(e.target.value)}
                                        placeholder="Contoh: Cephalea / Sakit Kepala, Gastritis..."
                                        disabled={submitting}
                                        className="w-full rounded-md border border-input p-2 text-xs outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                    />
                                </div>
                            </div>

                            {/* ─── SECTION P: PLAN & RESEP ─── */}
                            <div className="p-4 rounded-lg border border-border bg-white space-y-4 shadow-xs">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider border-b pb-2">
                                    <Pill className="w-4 h-4 text-indigo-600" />
                                    <span>P — Plan (Tindakan, Terapi &amp; Resep Obat)</span>
                                </div>

                                <div className="space-y-1">
                                    <label className="font-semibold text-foreground">Tindakan Medis &amp; Edukasi Pasien (Non-Farmakologi)</label>
                                    <textarea
                                        rows={2}
                                        value={actionTreatment}
                                        onChange={(e) => setActionTreatment(e.target.value)}
                                        placeholder="Tindakan medis yang diberikan, konseling, edukasi pola makan/istirahat..."
                                        disabled={submitting}
                                        className="w-full rounded-md border border-input p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                    ></textarea>
                                </div>

                                {/* Resep Obat Section */}
                                <div className="space-y-3 pt-2 border-t">
                                    <div className="flex justify-between items-center">
                                        <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                            <span>Resep Obat Pasien</span>
                                            <span className="text-[10px] font-normal text-muted-foreground">({obatList.length} Item)</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleTambahObat}
                                            className="text-xs text-primary font-bold flex items-center gap-1 hover:underline bg-primary/5 px-2.5 py-1 rounded border border-primary/20"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Tambah Obat
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="grid grid-cols-12 gap-2 text-[11px] text-muted-foreground font-semibold px-1">
                                            <div className="col-span-6">Nama Obat &amp; Sediaan</div>
                                            <div className="col-span-4">Dosis / Aturan Pakai</div>
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
                                                        placeholder="Contoh: Paracetamol 500mg Tablet"
                                                        disabled={submitting}
                                                        className="w-full border p-2 rounded text-xs outline-none bg-white focus:border-primary"
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
                                                        placeholder="3 x 1 tab (Sesudah makan)"
                                                        disabled={submitting}
                                                        className="w-full border p-2 rounded text-xs outline-none bg-white focus:border-primary"
                                                    />
                                                </div>
                                                <div className={cn(obatList.length > 1 ? "col-span-1" : "col-span-2")}>
                                                    <input
                                                        type="text"
                                                        value={obat.jumlah}
                                                        onChange={(e) => {
                                                            const list = [...obatList]
                                                            list[index].jumlah = e.target.value
                                                            setObatList(list)
                                                        }}
                                                        placeholder="10 Tab"
                                                        disabled={submitting}
                                                        className="w-full border p-2 rounded text-xs outline-none bg-white text-center font-mono font-semibold"
                                                    />
                                                </div>
                                                {obatList.length > 1 && (
                                                    <div className="col-span-1 flex justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleHapusObat(index)}
                                                            className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50"
                                                            title="Hapus Obat"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons Footer */}
                            <div className="flex justify-end items-center gap-3 pt-4 border-t">
                                {isEditing ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}
                                    >
                                        Batal Edit
                                    </button>
                                ) : (
                                    <Link href="/antrean" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs")}>
                                        Batal
                                    </Link>
                                )}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 transition shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                                >
                                    {submitting
                                        ? "Menyimpan Rekam Medis..."
                                        : isEditing
                                        ? "Simpan Perubahan Rekam Medis"
                                        : "Simpan Rekam Medis"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Modal Sukses */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center space-y-6">
                        <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-foreground">Rekam Medis Berhasil Disimpan</h2>
                            <p className="text-xs text-muted-foreground">
                                Data rekam medis SOAP untuk pasien <span className="font-bold text-foreground">{patient.name}</span> telah tersimpan di sistem dan antrean dinyatakan Selesai.
                            </p>
                        </div>
                        <div className="space-y-2 pt-4 border-t text-xs">
                            <Link href={`/pasien/${patient.id}`} className="block w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition text-center">
                                Lihat Rekam Medis Pasien
                            </Link>
                            <button onClick={() => router.push('/antrean')} className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition">
                                Kembali ke Daftar Antrean
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}