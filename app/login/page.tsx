'use client'

import { useState, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loginAction } from './actions'
import {
  Activity,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Stethoscope,
  ClipboardList,
  Syringe,
  Pill,
  BriefcaseMedical,
  HeartPulse,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPath = searchParams.get('from') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)

    startTransition(async () => {
      const res = await loginAction(formData)
      if (!res.success) {
        setError(res.error || 'Login gagal')
      } else {
        router.push(fromPath)
        router.refresh()
      }
    })
  }

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-emerald-100 p-8 z-10 relative">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-700/20 mb-3">
          <Activity className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">SIMPAY</h1>
        <p className="text-xs font-medium text-slate-500 mt-1">
          Sistem Informasi Manajemen Pelayanan, Antrean, dan Layanan Medis
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-700 mt-3">
          <span>Otentikasi Peran (DOKTER or PERAWAT)</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@simpay.local"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
              title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-slate-500" />
              ) : (
                <Eye className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 mt-2"
        >
          {isPending ? (
            <span>Memproses Login...</span>
          ) : (
            <>
              <span>Masuk</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#45a081] flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-emerald-700 selection:text-white">
      {/* Scattered Medical Line Art Icons matching User Reference */}

      {/* Top Right Stethoscope */}
      <div className="absolute top-6 right-6 text-white/40 pointer-events-none select-none transform rotate-45">
        <Stethoscope className="w-16 h-16 stroke-[1.25]" />
      </div>

      {/* Upper-Middle Left Medical Clipboard */}
      <div className="absolute top-1/3 left-1/4 -translate-x-12 text-white/45 pointer-events-none select-none">
        <ClipboardList className="w-20 h-20 stroke-[1.25]" />
      </div>

      {/* Middle Left Stethoscope & Medicine */}
      <div className="absolute top-1/2 left-10 -translate-y-16 text-white/40 pointer-events-none select-none">
        <Stethoscope className="w-24 h-24 stroke-[1.25] transform -rotate-30" />
      </div>

      <div className="absolute top-1/2 left-28 translate-y-6 text-white/45 pointer-events-none select-none">
        <Pill className="w-10 h-10 stroke-[1.25] transform rotate-12" />
      </div>

      <div className="absolute top-1/2 left-8 translate-y-16 text-white/45 pointer-events-none select-none">
        <Syringe className="w-20 h-20 stroke-[1.25] transform -rotate-45" />
      </div>

      {/* Center Left Heart Pulse with Stethoscope */}
      <div className="absolute bottom-1/3 left-1/3 text-white/45 pointer-events-none select-none">
        <HeartPulse className="w-24 h-24 stroke-[1.25]" />
        <Stethoscope className="w-16 h-16 stroke-[1.25] absolute -bottom-6 -right-6 transform rotate-45" />
      </div>

      {/* Center Right Medical Bag (BriefcaseMedical) */}
      <div className="absolute top-1/2 right-1/3 translate-x-12 text-white/45 pointer-events-none select-none">
        <BriefcaseMedical className="w-20 h-20 stroke-[1.25]" />
      </div>

      {/* Middle Right Stethoscopes */}
      <div className="absolute top-1/2 right-20 -translate-y-10 text-white/40 pointer-events-none select-none">
        <Stethoscope className="w-16 h-16 stroke-[1.25] transform rotate-12" />
      </div>

      <div className="absolute top-1/2 right-10 translate-y-10 text-white/40 pointer-events-none select-none">
        <Stethoscope className="w-12 h-12 stroke-[1.25] transform -rotate-12" />
      </div>

      {/* Bottom Left Medical Clipboard */}
      <div className="absolute bottom-10 left-16 text-white/45 pointer-events-none select-none">
        <ClipboardList className="w-20 h-20 stroke-[1.25]" />
      </div>

      {/* Bottom Center Heart Pulse */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/45 pointer-events-none select-none">
        <HeartPulse className="w-16 h-16 stroke-[1.25]" />
      </div>

      {/* Additional Subtle Floating Medical Icons */}
      <div className="absolute top-12 left-16 text-white/30 pointer-events-none select-none">
        <BriefcaseMedical className="w-14 h-14 stroke-[1.25]" />
      </div>

      <div className="absolute bottom-20 right-16 text-white/35 pointer-events-none select-none">
        <Syringe className="w-16 h-16 stroke-[1.25] transform rotate-45" />
      </div>

      <Suspense fallback={
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 z-10 text-center">
          <Activity className="w-8 h-8 text-emerald-600 animate-pulse mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">Memuat Halaman Login...</p>
        </div>
      }>
        <LoginFormContent />
      </Suspense>

      {/* Footer info */}
      <p className="text-xs text-white/90 font-medium z-10 mt-6 bg-emerald-800/40 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
        SIMPAY Clinic Management System · Authorization Guard Active
      </p>
    </div>
  )
}
