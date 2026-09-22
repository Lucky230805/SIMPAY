'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { X, User, Phone, MapPin, Calendar, Loader2, AlertCircle, Building2, Briefcase } from 'lucide-react'
import { createPatient, updatePatient, PatientInput, PatientRecord } from '@/app/pasien/actions'

interface PatientFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (patient: any, isEdit: boolean, queue?: any) => void
  initialData?: PatientRecord | null
}

export function PatientFormDialog({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: PatientFormDialogProps) {
  const isEdit = !!initialData

  const [formData, setFormData] = useState<PatientInput>({
    name: '',
    dateOfBirth: '',
    gender: 'Laki-laki',
    occupation: '',
    phone: '',
    address: '',
    polyclinic: 'Poli Umum 1',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialData) {
      // Format dateOfBirth to YYYY-MM-DD for <input type="date" />
      const dob = new Date(initialData.dateOfBirth)
      const formattedDob = !isNaN(dob.getTime())
        ? dob.toISOString().split('T')[0]
        : ''

      setFormData({
        name: initialData.name || '',
        dateOfBirth: formattedDob,
        gender: initialData.gender || 'Laki-laki',
        occupation: initialData.occupation || '',
        phone: initialData.phone || '',
        address: initialData.address || '',
        polyclinic: 'Poli Umum 1',
      })
    } else {
      setFormData({
        name: '',
        dateOfBirth: '',
        gender: 'Laki-laki',
        occupation: '',
        phone: '',
        address: '',
        polyclinic: 'Poli Umum 1',
      })
    }
    setErrors({})
    setGeneralError(null)
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setGeneralError(null)

    // Client-side quick check
    const clientErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      clientErrors.name = 'Nama lengkap pasien wajib diisi'
    }
    if (!formData.dateOfBirth) {
      clientErrors.dateOfBirth = 'Tanggal lahir wajib diisi'
    }
    if (!formData.gender) {
      clientErrors.gender = 'Pilih jenis kelamin'
    }
    if (formData.phone && !/^[0-9]{7,13}$/.test(formData.phone)) {
      clientErrors.phone = 'Nomor telepon harus berupa angka (7 hingga 13 digit)'
    }

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setIsSubmitting(true)

    try {
      if (isEdit && initialData) {
        const res = await updatePatient(initialData.id, formData)
        if (res.success && res.patient) {
          onSuccess(res.patient, true)
        } else {
          if (res.errors) {
            setErrors(res.errors)
          } else {
            setGeneralError(res.error || 'Gagal memperbarui data pasien')
          }
        }
      } else {
        const res = await createPatient(formData)
        if (res.success && res.patient) {
          onSuccess(res.patient, false, res.queue)
        } else {
          if (res.errors) {
            setErrors(res.errors)
          } else {
            setGeneralError(res.error || 'Gagal menyimpan pasien')
          }
        }
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Terjadi kesalahan sistem saat menyimpan data')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in-0">
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {isEdit ? 'Edit Data Pasien' : 'Tambah Pasien Baru'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit
                ? 'Perbarui informasi rekam medis pasien.'
                : 'Lengkapi data identitas pasien untuk pendaftaran.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {generalError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Nama Pasien */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Nama Lengkap Pasien <span className="text-destructive">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
              disabled={isSubmitting}
              className={errors.name ? 'border-destructive ring-destructive/20' : ''}
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>

          {/* Jenis Kelamin & Tanggal Lahir in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Jenis Kelamin */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                Jenis Kelamin <span className="text-destructive">*</span>
              </label>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Laki-laki"
                    checked={formData.gender === 'Laki-laki'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    disabled={isSubmitting}
                    className="accent-primary"
                  />
                  Laki-laki
                </label>
                <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="Perempuan"
                    checked={formData.gender === 'Perempuan'}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    disabled={isSubmitting}
                    className="accent-primary"
                  />
                  Perempuan
                </label>
              </div>
              {errors.gender && <p className="text-[11px] text-destructive">{errors.gender}</p>}
            </div>

            {/* Tanggal Lahir */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Tanggal Lahir <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                disabled={isSubmitting}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              {errors.dateOfBirth && (
                <p className="text-[11px] text-destructive">{errors.dateOfBirth}</p>
              )}
            </div>
          </div>

          {/* Pekerjaan Pasien */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
              Pekerjaan Pasien (Opsional)
            </label>
            <Input
              type="text"
              placeholder="Contoh: Karyawan Swasta / Pelajar / PNS / Wiraswasta"
              value={formData.occupation || ''}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              disabled={isSubmitting}
              className="h-8 text-xs"
            />
          </div>

          {/* Nomor Telepon */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground" />
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={13}
              value={formData.phone || ''}
              onKeyDown={(e) => {
                // Allow control keys: Backspace, Delete, Tab, Escape, Enter, Arrow keys, Home, End, Ctrl/Cmd shortcuts
                if (
                  [
                    'Backspace',
                    'Delete',
                    'Tab',
                    'Escape',
                    'Enter',
                    'ArrowLeft',
                    'ArrowRight',
                    'Home',
                    'End',
                  ].includes(e.key) ||
                  e.ctrlKey ||
                  e.metaKey
                ) {
                  return
                }
                // Prevent any non-digit keypress
                if (!/^[0-9]$/.test(e.key)) {
                  e.preventDefault()
                }
              }}
              onBeforeInput={(e: any) => {
                if (e.data && !/^[0-9]+$/.test(e.data)) {
                  e.preventDefault()
                }
              }}
              onInput={(e: any) => {
                const numericOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 13)
                e.target.value = numericOnly
                setFormData((prev) => ({ ...prev, phone: numericOnly }))
              }}
              onPaste={(e) => {
                e.preventDefault()
                const pastedText = e.clipboardData.getData('text')
                const numericOnly = pastedText.replace(/[^0-9]/g, '').slice(0, 13)
                setFormData((prev) => ({ ...prev, phone: numericOnly }))
              }}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/[^0-9]/g, '').slice(0, 13)
                setFormData((prev) => ({ ...prev, phone: numericOnly }))
              }}
              placeholder="Contoh: 081234567890 (Maks 13 digit)"
              disabled={isSubmitting}
              className={cn(
                'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50',
                errors.phone ? 'border-destructive ring-2 ring-destructive/20' : ''
              )}
            />
            {errors.phone && <p className="text-[11px] text-destructive">{errors.phone}</p>}
          </div>

          {/* Alamat Lengkap */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              Alamat Lengkap
            </label>
            <textarea
              rows={2}
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
            />
          </div>

          {/* Selection of Polyclinic (for New Patients) */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Tujuan Poliklinik / Dokter Bertugas <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.polyclinic || 'Poli Umum 1'}
                onChange={(e) => setFormData({ ...formData, polyclinic: e.target.value })}
                disabled={isSubmitting}
                className="h-9 w-full rounded-lg border border-input bg-muted/20 px-2.5 py-1 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 font-semibold text-foreground cursor-pointer"
              >
                <option value="Poli Umum 1">Poli Umum 1 (dr. Raniisyana)</option>
                <option value="Poli Umum 2">Poli Umum 2 (dr. Farisi)</option>
              </select>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : isEdit ? (
                'Simpan Perubahan'
              ) : (
                'Simpan Pasien'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
