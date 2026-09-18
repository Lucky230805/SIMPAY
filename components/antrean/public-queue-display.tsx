'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  Tv,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  HeartPulse,
  Activity,
  Stethoscope,
  Megaphone,
  UserCheck,
  Building2,
  BellRing,
  Users,
} from 'lucide-react'
import { getPublicQueueDisplay, PublicQueueItem } from '@/app/antrean/actions'
import { cn } from '@/lib/utils'
import { formatQueueLabel } from '@/lib/patient-utils'

function getFormattedQueueLabel(polyclinic: string | null, queueNumber: number): string {
  return formatQueueLabel(polyclinic, queueNumber)
}

function playChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // Note 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now)
    gain1.gain.setValueAtTime(0.3, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.3)

    // Note 2: E5 (659.25 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(659.25, now + 0.15)
    gain2.gain.setValueAtTime(0.3, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.5)
  } catch (e) {
    // Audio synthesis fallback
  }
}

function numberToIndonesianWords(n: number): string {
  if (n === 0) return 'nol'
  const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
  if (n < 12) return units[n]
  if (n < 20) return `${units[n - 10]} belas`
  if (n < 100) {
    const tens = Math.floor(n / 10)
    const rest = n % 10
    return `${units[tens]} puluh ${rest > 0 ? units[rest] : ''}`.trim()
  }
  if (n < 200) {
    const rest = n % 100
    return `seratus ${rest > 0 ? numberToIndonesianWords(rest) : ''}`.trim()
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100)
    const rest = n % 100
    return `${units[hundreds]} ratus ${rest > 0 ? numberToIndonesianWords(rest) : ''}`.trim()
  }
  return String(n)
}

function formatQueueNumberForSpeech(queueNumberLabel: string, rawQueueNumber?: number): string {
  const parts = queueNumberLabel.split('-')
  let prefix = ''
  let numStr = ''
  if (parts.length === 2) {
    prefix = parts[0].trim()
    numStr = parts[1].trim()
  } else {
    numStr = queueNumberLabel.trim()
  }

  const num = rawQueueNumber !== undefined ? rawQueueNumber : parseInt(numStr, 10)
  const spokenNum = !isNaN(num) ? numberToIndonesianWords(num) : numStr.replace(/^0+/, '')

  if (prefix) {
    return `${prefix}, ${spokenNum}`
  }
  return spokenNum
}

export function PublicQueueDisplay() {
  const [queues, setQueues] = useState<PublicQueueItem[]>([])
  const [syncStatus, setSyncStatus] = useState<'live' | 'syncing' | 'error'>('syncing')
  const [selectedPolyclinic, setSelectedPolyclinic] = useState<string>('ALL')
  const [isAudioActivated, setIsAudioActivated] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>('')

  const announcedQueueIdsRef = useRef<Set<number>>(new Set())

  // Initialize clock
  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Speech Announcement Handler
  const speakQueueCall = useCallback(
    (queueNumberLabel: string, polyclinicName: string, rawQueueNumber?: number) => {
      if (isMuted || !isAudioActivated) return

      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          playChime()

          setTimeout(() => {
            const spokenQueue = formatQueueNumberForSpeech(queueNumberLabel, rawQueueNumber)
            const phrase = `Nomor antrean ${spokenQueue}, silakan menuju ${polyclinicName || 'Poliklinik'}.`
            const utterance = new SpeechSynthesisUtterance(phrase)
            utterance.lang = 'id-ID'
            utterance.rate = 0.85

            // Select Indonesian TTS voice if available
            const voices = window.speechSynthesis.getVoices()
            const idVoice = voices.find(
              (v) => v.lang.toLowerCase().includes('id-id') || v.lang.toLowerCase().includes('id')
            )
            if (idVoice) {
              utterance.voice = idVoice
            }

            window.speechSynthesis.speak(utterance)
          }, 450)
        }
      } catch (e) {
        console.warn('Speech synthesis unavailable:', e)
      }
    },
    [isMuted, isAudioActivated]
  )

  // Fetch Queue Data & Process Audio Announcements
  const fetchData = useCallback(async () => {
    setSyncStatus('syncing')
    try {
      const data = await getPublicQueueDisplay()
      setQueues(data)
      setSyncStatus('live')

      // Detect active queue entries in DALAM_PEMERIKSAAN
      const activeCalls = data.filter((q) => q.status === 'DALAM_PEMERIKSAAN')

      // Process new unannounced active calls sequentially
      activeCalls.forEach((q) => {
        if (!announcedQueueIdsRef.current.has(q.id)) {
          announcedQueueIdsRef.current.add(q.id)
          const label = getFormattedQueueLabel(q.polyclinic, q.queueNumber)
          speakQueueCall(label, q.polyclinic || 'Poli Umum', q.queueNumber)
        }
      })
    } catch (err) {
      console.error('Failed fetching queue display data:', err)
      setSyncStatus('error')
    }
  }, [speakQueueCall])

  // Polling loop (3 seconds)
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Derive unique polyclinics list
  const polyclinics = Array.from(
    new Set(queues.map((q) => q.polyclinic).filter(Boolean) as string[])
  ).sort()

  // Filtered Queue Sets
  const filteredQueues =
    selectedPolyclinic === 'ALL'
      ? queues
      : queues.filter((q) => q.polyclinic === selectedPolyclinic)

  const activeQueue = filteredQueues.find((q) => q.status === 'DALAM_PEMERIKSAAN') || null
  const waitingQueues = filteredQueues.filter((q) => q.status === 'MENUNGGU')
  const recentCalls = filteredQueues
    .filter((q) => q.status === 'MENUNGGU_OBAT_DAN_BAYAR' || q.status === 'SELESAI')
    .slice(0, 6)

  const handleActivateAudio = () => {
    setIsAudioActivated(true)
    playChime()
  }

  const handleReannounce = () => {
    if (activeQueue) {
      const label = getFormattedQueueLabel(activeQueue.polyclinic, activeQueue.queueNumber)
      speakQueueCall(label, activeQueue.polyclinic || 'Poli Umum', activeQueue.queueNumber)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none overflow-x-hidden">
      {/* INITIAL AUDIO ACTIVATION OVERLAY */}
      {!isAudioActivated && (
        <div className="fixed inset-0 z-50 bg-teal-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-300 border-2 border-emerald-400/40 flex items-center justify-center mb-6 shadow-2xl animate-bounce">
            <Tv className="w-10 h-10" />
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> DISPLAY TV KLINIK
          </span>
          <h2 className="text-3xl font-extrabold text-white mb-3">Aktifkan Layar Panggilan Antrean Pasien</h2>
          <p className="text-base text-teal-100/80 max-w-lg mb-8 leading-relaxed">
            Klik tombol di bawah untuk menyalakan izin panggilan suara otomatis dan nada panggil di layar TV ruang tunggu klinik.
          </p>
          <button
            onClick={handleActivateAudio}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-teal-950 font-black rounded-2xl text-base transition-all transform hover:scale-105 shadow-xl flex items-center gap-3 border-2 border-emerald-300"
          >
            <Play className="w-5 h-5 fill-teal-950" /> MULAI DISPLAY & PANGGILAN SUARA
          </button>
        </div>
      )}

      {/* TOP CLINIC DISPLAY HEADER */}
      <header className="px-6 py-4 bg-teal-900 text-white shadow-xl border-b-4 border-emerald-500 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-teal-950 flex items-center justify-center font-black text-2xl shadow-lg border-2 border-emerald-300 shrink-0">
            <HeartPulse className="w-7 h-7 text-teal-950 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                KLINIK PRAKTEK DOKTER UMUM
              </h1>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-[11px] font-extrabold tracking-wider uppercase">
                KLINIK UMUM
              </span>
            </div>
            <p className="text-xs text-teal-100/80 font-medium flex items-center gap-2 mt-0.5">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
              Layanan Informasi Panggilan Pasien Real-Time
            </p>
          </div>
        </div>

        {/* CONTROLS & STATUS BAR */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Polyclinic Filter */}
          {polyclinics.length > 1 ? (
            <div className="flex items-center gap-2 bg-teal-950/70 border border-teal-700/60 px-3.5 py-2 rounded-xl text-white shadow-inner">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-teal-200 font-semibold">Poli:</span>
              <select
                value={selectedPolyclinic}
                onChange={(e) => setSelectedPolyclinic(e.target.value)}
                className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
              >
                <option value="ALL" className="bg-teal-900 text-white">
                  Semua Poliklinik
                </option>
                {polyclinics.map((p) => (
                  <option key={p} value={p} className="bg-teal-900 text-white">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-teal-950/70 border border-teal-700/60 px-3.5 py-2 rounded-xl text-white shadow-inner">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-teal-200 font-semibold">Poli:</span>
              <span className="text-white font-bold text-xs">Poli Umum</span>
            </div>
          )}

          {/* Sound Controls */}
          {isAudioActivated && (
            <div className="flex items-center gap-1.5 bg-teal-950/70 border border-teal-700/60 p-1.5 rounded-xl shadow-inner">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  'px-2.5 py-1.5 rounded-lg transition text-xs flex items-center gap-1.5 font-bold',
                  isMuted
                    ? 'bg-red-500/30 text-red-200 border border-red-400/40'
                    : 'bg-emerald-500 text-teal-950 font-black'
                )}
                title={isMuted ? 'Suara Dimatikan' : 'Suara Aktif'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isMuted ? 'Mute' : 'Audio On'}</span>
              </button>

              <button
                onClick={handleReannounce}
                disabled={!activeQueue}
                className="p-1.5 rounded-lg bg-teal-900 hover:bg-teal-800 text-teal-100 transition disabled:opacity-40 border border-teal-700/50"
                title="Panggil Ulang Suara"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sync Status Pill */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-950/70 border border-teal-700/60 font-semibold text-white shadow-inner">
            {syncStatus === 'live' && (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-300 font-bold">Live Sync</span>
              </>
            )}
            {syncStatus === 'syncing' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span className="text-amber-300 font-bold">Syncing...</span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-300 font-bold">Terputus</span>
              </>
            )}
          </div>

          {/* Live Clock */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono font-black text-sm tracking-wider shadow-lg">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{currentTime}</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden bg-slate-100">
        {/* HERO CALLING BOX (8 COLS) */}
        <section className="lg:col-span-8 flex flex-col">
          <div className="flex-1 bg-white rounded-3xl border-4 border-emerald-500/60 p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
            {/* CALL BADGE HEADER */}
            <div className="relative z-10 mb-6">
              <span className="px-6 py-2 rounded-full bg-emerald-600 text-white font-black text-sm uppercase tracking-widest shadow-lg border-2 border-emerald-400 flex items-center gap-2 animate-pulse">
                <BellRing className="w-4 h-4 text-white" />
                NOMOR ANTREAN SAAT INI DIPANGGIL
              </span>
            </div>

            {activeQueue ? (
              <div className="relative z-10 space-y-4 my-auto w-full">
                {/* GIANT HIGH-CONTRAST QUEUE NUMBER */}
                <div className="text-9xl sm:text-[11rem] font-black font-mono tracking-tighter text-emerald-700 drop-shadow-md leading-none py-2">
                  {getFormattedQueueLabel(activeQueue.polyclinic, activeQueue.queueNumber)}
                </div>

                <div className="space-y-2 max-w-xl mx-auto">
                  <div className="inline-block px-5 py-1.5 rounded-2xl bg-teal-100 text-teal-900 border border-teal-300 font-black text-2xl sm:text-3xl">
                    {activeQueue.polyclinic || 'Poli Umum'}
                  </div>
                  <p className="text-xl text-slate-700 font-extrabold flex items-center justify-center gap-2 pt-2">
                    <UserCheck className="w-6 h-6 text-emerald-600" />
                    Silakan Masuk ke Ruang Pemeriksaan Dokter
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative z-10 space-y-3 my-auto py-12">
                <div className="w-24 h-24 rounded-3xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center border-2 border-teal-200 shadow-inner mb-4">
                  <Activity className="w-12 h-12 text-teal-600" />
                </div>
                <div className="text-6xl font-mono font-black text-slate-300">---</div>
                <p className="text-2xl text-slate-800 font-extrabold">Belum Ada Antrean yang Dipanggil</p>
                <p className="text-base text-slate-500 font-medium max-w-md mx-auto">
                  Silakan duduk dengan nyaman di ruang tunggu. Panggilan dokter akan muncul secara otomatis di layar ini.
                </p>
              </div>
            )}

            {/* HERO FOOTER INFO */}
            <div className="relative z-10 mt-auto pt-6 border-t-2 border-slate-100 w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-600 font-semibold">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Status Panggilan:</span>
                <span
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide border',
                    activeQueue
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  )}
                >
                  {activeQueue ? 'SEDANG DIPANGGIL' : 'MENUNGGU CALL'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-slate-100 px-4 py-1.5 rounded-xl border border-slate-200">
                <Users className="w-4 h-4 text-teal-700" />
                <span>Total Antrean Hari Ini: <strong className="text-teal-900 font-black">{filteredQueues.length} Pasien</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* SIDE PANELS: WAITING LIST & RECENT CALLS (4 COLS) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          {/* WAITING QUEUE PANEL */}
          <div className="flex-1 bg-white rounded-3xl border-2 border-amber-300/80 p-5 flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Antrean Berikutnya
              </h3>
              <span className="px-3 py-1 bg-amber-500 text-white font-black text-xs rounded-full shadow-md font-mono">
                {waitingQueues.length} Pasien
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {waitingQueues.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 font-medium text-sm">
                  <Users className="w-8 h-8 mb-2 text-slate-300" />
                  Tidak ada pasien dalam daftar tunggu saat ini.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {waitingQueues.map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 bg-amber-50 border-2 border-amber-200 rounded-2xl flex flex-col justify-between space-y-1 shadow-sm hover:shadow-md transition transform hover:-translate-y-0.5"
                    >
                      <span className="text-3xl font-black font-mono text-amber-900">
                        {getFormattedQueueLabel(q.polyclinic, q.queueNumber)}
                      </span>
                      <span className="text-xs font-bold text-amber-800/80 truncate">
                        {q.polyclinic || 'Poli Umum'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RECENT CALLS HISTORY / PHARMACY */}
          {recentCalls.length > 0 && (
            <div className="bg-white rounded-3xl border-2 border-sky-300/80 p-5 shadow-xl shrink-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b-2 border-slate-100 pb-2 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" /> Terakhir Dipanggil / Farmasi
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                {recentCalls.map((q) => (
                  <span
                    key={q.id}
                    className="px-3 py-1.5 bg-sky-50 border-2 border-sky-200 text-sky-900 rounded-xl font-mono text-sm font-black shadow-sm"
                  >
                    {getFormattedQueueLabel(q.polyclinic, q.queueNumber)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* BOTTOM CLINIC ANNOUNCEMENT MARQUEE / TICKER BAR */}
      <footer className="bg-teal-900 text-white px-6 py-3 shadow-2xl border-t-4 border-emerald-500 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500 text-teal-950 font-black text-xs uppercase tracking-wider shrink-0 shadow">
          <Megaphone className="w-4 h-4 fill-teal-950" />
          <span>Informasi Pasien</span>
        </div>
        <div className="overflow-hidden whitespace-nowrap text-sm font-bold text-teal-100/90 tracking-wide flex-1">
          <p className="animate-marquee inline-block">
            🏥 Selamat datang di Klinik Praktek Dokter Umum • Mohon selalu memperhatikan nomor antrean dan mendengarkan suara panggilan • Harap persiapkan Kartu Identitas / Kartu Berobat • Silakan menuju bagian Kasir & Apotek setelah selesai konsultasi dengan Dokter • Semoga lekas sembuh!
          </p>
        </div>
      </footer>
    </div>
  )
}
