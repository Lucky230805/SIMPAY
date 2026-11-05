'use client'

import React, { useState, useEffect } from 'react'
import {
  Building2,
  Stethoscope,
  Receipt,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Shield,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getClinicProfile, updateClinicProfile, ClinicProfileData } from '@/app/pengaturan/actions'

export function ClinicSettingsView() {
  const [profile, setProfile] = useState<ClinicProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profil' | 'dokter' | 'tarif' | 'preview'>('profil')

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const data = await getClinicProfile()
        setProfile(data)
      } catch (err: any) {
        setErrorMessage('Gagal memuat profil klinik: ' + err.message)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleChange = (field: keyof ClinicProfileData, value: any) => {
    if (!profile) return
    setProfile({
      ...profile,
      [field]: value,
    })
    setSuccessMessage(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    try {
      const res = await updateClinicProfile(profile)
      if (res.success && res.profile) {
        setProfile(res.profile)
        setSuccessMessage('Pengaturan profil klinik & tarif dasar berhasil disimpan!')
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        setErrorMessage(res.error || 'Gagal menyimpan pengaturan.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !profile) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="h-24 bg-muted rounded-xl" />
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                Pengaturan Profil & Tarif Klinik
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Konfigurasi identitas faskes, legalitas operasional, dokter penanggung jawab, dan tarif dasar kasir.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="gap-2 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Menyimpan...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </>
          )}
        </Button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in-0 duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in-0 duration-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => setActiveTab('profil')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-lg border transition-all ${
            activeTab === 'profil'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Identitas & Alamat Faskes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dokter')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-lg border transition-all ${
            activeTab === 'dokter'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>Dokter & Kop Surat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tarif')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-lg border transition-all ${
            activeTab === 'tarif'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Tarif Layanan Dasar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-3.5 py-2 font-medium rounded-lg border transition-all ${
            activeTab === 'preview'
              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Pratinjau Kuitansi & Surat</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: IDENTITAS KLINIK */}
        {activeTab === 'profil' && (
          <div className="space-y-5 animate-in fade-in-0 duration-150">
            <Card className="p-5 sm:p-6 space-y-4 border border-border">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Identitas Resmi & Legalitas Klinik</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Informasi ini otomatis tercetak pada nota kuitansi kasir, faktur farmasi, dan laporan resmi.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Nama Resmi Klinik / Usaha <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={profile.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Contoh: KLINIK PRAKTEK DOKTER UMUM"
                    className="h-9 text-xs"
                    required
                  />
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Nama yang tampil pada kop struk kuitansi kasir.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Nama Badan Hukum / Entitas Faskes
                  </label>
                  <Input
                    value={profile.legalName || ''}
                    onChange={(e) => handleChange('legalName', e.target.value)}
                    placeholder="Contoh: Klinik Pratama SIMPAY"
                    className="h-9 text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground mt-0.5 block">
                    Nama faskes untuk faktur PBF & akreditasi resmi.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Nomor Izin Operasional Klinik (SIO / Dinkes)
                  </label>
                  <Input
                    value={profile.licenseNumber || ''}
                    onChange={(e) => handleChange('licenseNumber', e.target.value)}
                    placeholder="Contoh: 446.1/0085/DPMPTSP/SIP-3/DUM/VI/2020"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Jenis Header / Format Faskes
                  </label>
                  <Input
                    value={profile.headerType || ''}
                    onChange={(e) => handleChange('headerType', e.target.value)}
                    placeholder="Contoh: PRAKTEK UMUM atau KLINIK PRATAMA"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-foreground mb-1">
                    Alamat Lengkap Faskes <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={profile.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Contoh: Perumahan Permata Hijau 2, Blok A59, Cinangsi, Kec. Cibogo, Kabupaten Subang, Jawa Barat"
                    rows={3}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Nomor Telepon / WhatsApp Klinik
                  </label>
                  <Input
                    value={profile.phone || ''}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="Contoh: 0812-3456-7890"
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-foreground mb-1">
                    Email Resmi Klinik
                  </label>
                  <Input
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="Contoh: klinik.simpay@gmail.com"
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: DOKTER & KOP SURAT */}
        {activeTab === 'dokter' && (
          <div className="space-y-5 animate-in fade-in-0 duration-150">
            <Card className="p-5 sm:p-6 space-y-4 border border-border">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-primary" />
                  <span>Dokter Penanggung Jawab & Kop Surat Praktik Bersama</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pengaturan ini digunakan saat mencetak Surat Keterangan Sakit, Surat Sehat, dan Rekam Medis Pasien.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                {/* Dokter Utama */}
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <span className="font-bold text-primary block">
                    1. Dokter Utama / Penanggung Jawab Teknis Medis (DPJP)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-foreground mb-1">
                        Nama Lengkap Dokter & Gelar <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={profile.primaryDoctorName}
                        onChange={(e) => handleChange('primaryDoctorName', e.target.value)}
                        placeholder="Contoh: dr. RANIISYANA R. REKKERS"
                        className="h-9 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-foreground mb-1">
                        Nomor SIP Dokter Utama <span className="text-destructive">*</span>
                      </label>
                      <Input
                        value={profile.primaryDoctorSip}
                        onChange={(e) => handleChange('primaryDoctorSip', e.target.value)}
                        placeholder="Contoh: SIP : No. 446.1/0085/DPMPTSP/SIP-3/DUM/VI/2020"
                        className="h-9 text-xs font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Dokter Pendamping / Mitra */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <span className="font-bold text-muted-foreground block">
                    2. Dokter Pendamping / Mitra (Praktek Bersama - Opsional)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-foreground mb-1">
                        Nama Lengkap Dokter Kedua
                      </label>
                      <Input
                        value={profile.secondaryDoctorName || ''}
                        onChange={(e) => handleChange('secondaryDoctorName', e.target.value)}
                        placeholder="Contoh: dr. FARISI"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-foreground mb-1">
                        Nomor SIP Dokter Kedua
                      </label>
                      <Input
                        value={profile.secondaryDoctorSip || ''}
                        onChange={(e) => handleChange('secondaryDoctorSip', e.target.value)}
                        placeholder="Contoh: SIP : No. 446.1/0086/DPMPTSP/SIP-3/DUM/VI/2020"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground block italic">
                    Kosongkan jika klinik/praktek hanya dikelola oleh 1 dokter tunggal.
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: TARIF LAYANAN DASAR */}
        {activeTab === 'tarif' && (
          <div className="space-y-5 animate-in fade-in-0 duration-150">
            <Card className="p-5 sm:p-6 space-y-4 border border-border">
              <div className="border-b border-border pb-3">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span>Standar Tarif Layanan Dasar Kasir</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tarif ini otomatis diterapkan saat antrean pasien baru diproses ke tahap kasir pembayaran.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-muted/15 border border-border space-y-2">
                  <label className="block font-semibold text-foreground">
                    Biaya Pendaftaran / Administrasi Pasien Default (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground font-semibold">Rp</span>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={profile.defaultRegistrationFee}
                      onChange={(e) => handleChange('defaultRegistrationFee', parseFloat(e.target.value) || 0)}
                      className="h-9 pl-9 text-xs font-mono font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Isi 0 jika pendaftaran gratis atau sudah termasuk dalam jasa konsultasi.
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-muted/15 border border-border space-y-2">
                  <label className="block font-semibold text-foreground">
                    Biaya Jasa Konsultasi Dokter Umum Default (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-muted-foreground font-semibold">Rp</span>
                    <Input
                      type="number"
                      min={0}
                      step={5000}
                      value={profile.defaultConsultationFee}
                      onChange={(e) => handleChange('defaultConsultationFee', parseFloat(e.target.value) || 0)}
                      className="h-9 pl-9 text-xs font-mono font-bold"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground block">
                    Biaya standar konsultasi & pemeriksaan dokter umum per kunjungan.
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                <strong>Catatan Kasir:</strong> Perubahan tarif hanya berlaku untuk kunjungan baru yang didaftarkan setelah pengaturan ini disimpan. Tagihan lama yang sudah terbit atau sudah lunas tidak akan terpengaruh.
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: PRATINJAU DOKUMEN CETAK */}
        {activeTab === 'preview' && (
          <div className="space-y-6 animate-in fade-in-0 duration-150">
            {/* Pratinjau Struk Kuitansi Kasir */}
            <Card className="p-5 border border-border space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                  Pratinjau Struk Bukti Pembayaran Kasir
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Thermal POS 58/80mm
                </Badge>
              </div>

              <div className="max-w-sm mx-auto p-4 bg-white text-black font-mono text-xs rounded-xl border border-slate-300 shadow-sm space-y-2">
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  <h3 className="font-bold text-sm uppercase">{profile.name}</h3>
                  <p className="text-[10px] text-slate-600 mt-0.5">{profile.address}</p>
                  {profile.phone && <p className="text-[10px] text-slate-600">Telp: {profile.phone}</p>}
                </div>

                <div className="text-center py-1 border-b border-dashed border-slate-400 font-bold text-[11px]">
                  BUKTI PEMBAYARAN KLINIK
                </div>

                <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
                  <div className="flex justify-between">
                    <span>Dokter:</span>
                    <span className="font-semibold">{profile.primaryDoctorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Konsultasi:</span>
                    <span>Rp {profile.defaultConsultationFee.toLocaleString('id-ID')}</span>
                  </div>
                  {profile.defaultRegistrationFee > 0 && (
                    <div className="flex justify-between">
                      <span>Pendaftaran:</span>
                      <span>Rp {profile.defaultRegistrationFee.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                <p className="text-center text-[10px] text-slate-500 pt-1">
                  Terima kasih atas kunjungan Anda. Semoga lekas sembuh!
                </p>
              </div>
            </Card>

            {/* Pratinjau Kop Surat Resmi */}
            <Card className="p-5 border border-border space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-xs uppercase tracking-wider text-foreground">
                  Pratinjau Kop Surat Resmi Dokter
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Surat Sakit & Sehat
                </Badge>
              </div>

              <div className="max-w-xl mx-auto p-5 bg-white text-black font-sans text-xs rounded-xl border border-slate-300 shadow-sm space-y-2">
                <div className="text-center leading-tight">
                  <h3 className="font-bold text-sm tracking-[0.2em] uppercase text-slate-900">
                    {profile.headerType || 'PRAKTEK UMUM'}
                  </h3>
                  {profile.secondaryDoctorName && (
                    <>
                      <h4 className="font-bold text-base uppercase mt-1 text-slate-950">
                        {profile.secondaryDoctorName}
                      </h4>
                      <p className="text-[10px] text-slate-600">{profile.secondaryDoctorSip}</p>
                    </>
                  )}
                  <h4 className="font-bold text-base uppercase mt-1 text-slate-950">
                    {profile.primaryDoctorName}
                  </h4>
                  <p className="text-[10px] text-slate-600">{profile.primaryDoctorSip}</p>
                  <p className="text-[10px] text-slate-600 mt-1">Alamat : {profile.address}</p>
                </div>

                <div className="w-full my-2">
                  <div className="border-t-2 border-slate-900 mb-[2px]"></div>
                  <div className="border-t border-slate-900"></div>
                </div>

                <div className="text-center py-2 font-bold text-xs underline uppercase">
                  SURAT KETERANGAN DOKTER
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Klinik</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

