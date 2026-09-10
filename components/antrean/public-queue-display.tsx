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
} from 'lucide-react'
import { getPublicQueueDisplay, PublicQueueItem } from '@/app/antrean/actions'
import { cn } from '@/lib/utils'

function getFormattedQueueLabel(polyclinic: string | null, queueNumber: number): string {
  if (!polyclinic) return String(queueNumber).padStart(3, '0')
  const prefix = polyclinic.trim().split(/\s+/).pop()?.charAt(0).toUpperCase() ?? 'A'
  return `${prefix}-${String(queueNumber).padStart(3, '0')}`
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

export function PublicQueueDisplay() {
  const [queues, setQueues] = useState<PublicQueueItem[]>([])
  const [syncStatus, setSyncStatus] = useState<'live' | 'syncing' | 'error'>('syncing')
  const [selectedPolyclinic, setSelectedPolyclinic] = useState<string>('ALL')
  const [isAudioActivated, setIsAudioActivated] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>('')

  const announcedQueueIdsRef = useRef<Set<number>>(new Set())
  const speechSupportedRef = useRef<boolean>(true)

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
    (queueNumberLabel: string, polyclinicName: string) => {
      if (isMuted || !isAudioActivated) return

      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          playChime()

          setTimeout(() => {
            const cleanNumber = queueNumberLabel.replace('-', ' ')
            const phrase = `Nomor antrean ${cleanNumber}, silakan menuju ${polyclinicName || 'Poliklinik'}.`
            const utterance = new SpeechSynthesisUtterance(phrase)
            utterance.lang = 'id-ID'
            utterance.rate = 0.85
            window.speechSynthesis.speak(utterance)
          }, 400)
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
          speakQueueCall(label, q.polyclinic || 'Poli Umum')
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
      speakQueueCall(label, activeQueue.polyclinic || 'Poli Umum')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* INITIAL AUDIO ACTIVATION OVERLAY */}
      {!isAudioActivated && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-4">
            <Tv className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Panggilan Suara Layar Antrean TV</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Klik tombol di bawah satu kali untuk mengaktifkan izin panggilan suara otomatis dan nada panggil di layar TV ini.
          </p>
          <button
            onClick={handleActivateAudio}
            className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-white" /> Mulai Layar &amp; Panggilan Suara
          </button>
        </div>
      )}

      {/* TOP TV HEADER */}
      <header className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center font-black text-xl">
            SIM
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              ANTREAN POLIKLINIK KLINIK <Sparkles className="w-4 h-4 text-emerald-400" />
            </h1>
            <p className="text-xs text-slate-400">Layanan Informasi Panggilan Pasien Real-Time</p>
          </div>
        </div>

        {/* CONTROLS & STATUS BAR */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Polyclinic Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-slate-400 font-semibold">Poli:</span>
            <select
              value={selectedPolyclinic}
              onChange={(e) => setSelectedPolyclinic(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
            >
              <option value="ALL" className="bg-slate-900 text-white">
                Semua Poliklinik
              </option>
              {polyclinics.map((p) => (
                <option key={p} value={p} className="bg-slate-900 text-white">
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Sound Controls */}
          {isAudioActivated && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={cn(
                  'p-1.5 rounded transition text-xs flex items-center gap-1 font-semibold',
                  isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-emerald-400'
                )}
                title={isMuted ? 'Suara Dimatikan' : 'Suara Aktif'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={handleReannounce}
                disabled={!activeQueue}
                className="p-1.5 rounded bg-slate-800 text-slate-200 hover:text-white transition disabled:opacity-40"
                title="Panggil Ulang"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Sync Status Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-medium">
            {syncStatus === 'live' && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 font-semibold">Live Sync</span>
              </>
            )}
            {syncStatus === 'syncing' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-400 font-semibold">Sync...</span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 font-semibold">Terputus</span>
              </>
            )}
          </div>

          {/* Live Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono font-bold text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime}</span>
          </div>
        </div>
      </header>

      {/* MAIN TV CONTENT */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* HERO BOX: ACTIVE CALL (8 COLS) */}
        <section className="lg:col-span-8 flex flex-col">
          <div className="flex-1 bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl border-2 border-emerald-500/40 p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
            {/* Pulsing Background Glow */}
            <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />

            <div className="mb-4">
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                NOMOR ANTREAN SAAT INI DIPANGGIL
              </span>
            </div>

            {activeQueue ? (
              <div className="space-y-4 my-auto">
                <div className="text-8xl sm:text-9xl font-black font-mono tracking-tighter text-white drop-shadow-[0_10px_35px_rgba(16,185,129,0.3)]">
                  {getFormattedQueueLabel(activeQueue.polyclinic, activeQueue.queueNumber)}
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-300 tracking-tight">
                    {activeQueue.polyclinic || 'Poli Umum'}
                  </h2>
                  <p className="text-sm text-slate-400">Silakan Masuk ke Ruang Pemeriksaan Dokter</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 my-auto py-12">
                <div className="text-6xl font-mono font-bold text-slate-700">---</div>
                <p className="text-base text-slate-400 font-medium">Belum Ada Antrean yang Dipanggil</p>
                <p className="text-xs text-slate-500">Silakan menunggu panggilan dokter di ruang tunggu</p>
              </div>
            )}

            <div className="mt-auto pt-6 border-t border-slate-800/80 w-full flex items-center justify-between text-xs text-slate-400">
              <span>Status: <strong className="text-emerald-400 font-semibold">{activeQueue ? 'SEDANG DIPANGGIL' : 'MENUNGGU CALL'}</strong></span>
              <span>Total Antrean Hari Ini: <strong className="text-white font-bold">{filteredQueues.length} Pasien</strong></span>
            </div>
          </div>
        </section>

        {/* SIDE PANELS: WAITING LIST & RECENT CALLS (4 COLS) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          {/* WAITING QUEUE GRID */}
          <div className="flex-1 bg-slate-900/80 rounded-2xl border border-slate-800 p-5 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Antrean Berikutnya
              </h3>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded font-mono font-bold text-xs">
                {waitingQueues.length} Pasien
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {waitingQueues.length === 0 ? (
                <div className="h-full flex items-center justify-center p-6 text-center text-slate-500 text-xs">
                  Tidak ada pasien dalam daftar tunggu antrean.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
                  {waitingQueues.map((q) => (
                    <div
                      key={q.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col justify-between space-y-1 hover:border-slate-700 transition"
                    >
                      <span className="text-xl font-bold font-mono text-amber-300">
                        {getFormattedQueueLabel(q.polyclinic, q.queueNumber)}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {q.polyclinic || 'Poli Umum'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RECENT CALLS HISTORY */}
          {recentCalls.length > 0 && (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 shrink-0">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" /> Terakhir Dipanggil
              </h4>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {recentCalls.map((q) => (
                  <span
                    key={q.id}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-lg font-mono text-xs font-semibold"
                  >
                    {getFormattedQueueLabel(q.polyclinic, q.queueNumber)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
