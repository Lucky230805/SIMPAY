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
  Video,
  X,
  Settings,
  Info,
  Smartphone,
  ShieldAlert,
  Sparkle,
  Plus,
  Trash2,
  ListOrdered,
  Maximize,
  Minimize,
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

function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId) return ''
  const trimmed = urlOrId.trim()
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = trimmed.match(regExp)
  if (match && match[2] && match[2].length === 11) {
    return match[2]
  }
  if (trimmed.length === 11) {
    return trimmed
  }
  return ''
}

function parseYouTubeInput(input: string): { type: 'playlist' | 'video'; playlistId?: string; videoId?: string } {
  const trimmed = input.trim()
  const listMatch = trimmed.match(/[?&]list=([^#&?]+)/)
  if (listMatch && listMatch[1]) {
    return { type: 'playlist', playlistId: listMatch[1] }
  }
  const videoId = extractYouTubeId(trimmed)
  return { type: 'video', videoId: videoId || '5qap5aO4i9A' }
}

function buildYouTubeEmbedSrc(videoUrls: string[]): string {
  const activeUrls = videoUrls.filter((u) => u.trim() !== '')
  if (activeUrls.length === 0) {
    return 'https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1&mute=1&enablejsapi=1&loop=1&playlist=5qap5aO4i9A&controls=1&rel=0&modestbranding=1'
  }

  // Check if first URL is a full YouTube Playlist URL (list=PL...)
  const firstParsed = parseYouTubeInput(activeUrls[0])
  if (firstParsed.type === 'playlist' && firstParsed.playlistId) {
    return `https://www.youtube.com/embed/videoseries?list=${firstParsed.playlistId}&autoplay=1&mute=1&enablejsapi=1&loop=1&controls=1&rel=0&modestbranding=1`
  }

  // Collect all valid video IDs
  const validIds: string[] = []
  activeUrls.forEach((url) => {
    const p = parseYouTubeInput(url)
    if (p.type === 'video' && p.videoId) {
      validIds.push(p.videoId)
    }
  })

  if (validIds.length === 0) {
    return 'https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1&mute=1&enablejsapi=1&loop=1&playlist=5qap5aO4i9A&controls=1&rel=0&modestbranding=1'
  }

  const firstId = validIds[0]
  const playlistParam = validIds.join(',')
  return `https://www.youtube.com/embed/${firstId}?playlist=${playlistParam}&autoplay=1&mute=1&enablejsapi=1&loop=1&controls=1&rel=0&modestbranding=1`
}

const DEFAULT_PLAYLIST = [
  'https://www.youtube.com/watch?v=5qap5aO4i9A',
  'https://www.youtube.com/watch?v=lTRiuFIWV54',
]

export function PublicQueueDisplay() {
  const [queues, setQueues] = useState<PublicQueueItem[]>([])
  const [syncStatus, setSyncStatus] = useState<'live' | 'syncing' | 'error'>('syncing')
  const [selectedPolyclinic, setSelectedPolyclinic] = useState<string>('ALL')
  const [isAudioActivated, setIsAudioActivated] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [currentDateStr, setCurrentDateStr] = useState<string>('')

  // Multi-Video Playlist & Audio Ducking State
  const [videoList, setVideoList] = useState<string[]>(DEFAULT_PLAYLIST)
  const [inputVideoList, setInputVideoList] = useState<string[]>(DEFAULT_PLAYLIST)
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState<boolean>(false)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)

  // YouTube Audio Ducking (Volume Control)
  const [youtubeNormalVolume, setYoutubeNormalVolume] = useState<number>(100)
  const [youtubeDuckLevel, setYoutubeDuckLevel] = useState<number>(10) // 10% volume during call, 0% = mute
  const [isDucked, setIsDucked] = useState<boolean>(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const duckTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-hide admin control toolbar when mouse is idle
  const [showAdminControls, setShowAdminControls] = useState<boolean>(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseMove = useCallback(() => {
    setShowAdminControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowAdminControls(false)
    }, 3500)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [handleMouseMove])

  const announcedQueueIdsRef = useRef<Set<number>>(new Set())

  // Send postMessage command to YouTube iframe API
  const sendYouTubeCommand = useCallback((func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            event: 'command',
            func: func,
            args: args,
          }),
          '*'
        )
      } catch (e) {
        console.warn('YouTube postMessage error:', e)
      }
    }
  }, [])

  // Apply YouTube iframe volume/mute state
  const applyYouTubeVolume = useCallback(
    (vol: number) => {
      if (vol <= 0) {
        sendYouTubeCommand('setVolume', [0])
        sendYouTubeCommand('mute', [])
      } else {
        sendYouTubeCommand('unMute', [])
        sendYouTubeCommand('setVolume', [vol])
      }
    },
    [sendYouTubeCommand]
  )

  // Sync YouTube iframe volume state automatically
  useEffect(() => {
    if (!isAudioActivated) return
    if (isMuted) {
      applyYouTubeVolume(0)
    } else {
      if (isDucked) {
        applyYouTubeVolume(youtubeDuckLevel)
      } else {
        applyYouTubeVolume(youtubeNormalVolume)
      }
    }
  }, [isMuted, isAudioActivated, isDucked, youtubeNormalVolume, youtubeDuckLevel, applyYouTubeVolume])

  // Handle Fullscreen Toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true)
        }).catch((e) => {
          console.warn('Fullscreen request denied:', e)
        })
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false)
        })
      }
    }
  }, [])

  // Listen to browser fullscreenchange event
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // Load playlist and volume preferences from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPlaylist = localStorage.getItem('simpay_display_youtube_playlist')
      if (savedPlaylist) {
        try {
          const parsed = JSON.parse(savedPlaylist)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setVideoList(parsed)
            setInputVideoList(parsed)
          }
        } catch (e) { }
      }

      const savedVol = localStorage.getItem('simpay_display_youtube_volume')
      if (savedVol !== null) {
        const num = parseInt(savedVol, 10)
        if (!isNaN(num) && num >= 0 && num <= 100) setYoutubeNormalVolume(num)
      }

      const savedDuck = localStorage.getItem('simpay_display_youtube_duck_level')
      if (savedDuck !== null) {
        const num = parseInt(savedDuck, 10)
        if (!isNaN(num) && num >= 0 && num <= 100) setYoutubeDuckLevel(num)
      }
    }
  }, [])

  // Save playlist & volume settings
  const handleSaveSettings = () => {
    const filtered = inputVideoList.filter((url) => url.trim() !== '')
    const toSave = filtered.length > 0 ? filtered : DEFAULT_PLAYLIST
    setVideoList(toSave)
    setInputVideoList(toSave)
    if (typeof window !== 'undefined') {
      localStorage.setItem('simpay_display_youtube_playlist', JSON.stringify(toSave))
      localStorage.setItem('simpay_display_youtube_volume', String(youtubeNormalVolume))
      localStorage.setItem('simpay_display_youtube_duck_level', String(youtubeDuckLevel))
    }
    setIsYoutubeModalOpen(false)
  }

  const handleAddVideoInput = () => {
    setInputVideoList((prev) => [...prev, ''])
  }

  const handleUpdateVideoInput = (index: number, val: string) => {
    setInputVideoList((prev) => {
      const updated = [...prev]
      updated[index] = val
      return updated
    })
  }

  const handleRemoveVideoInput = (index: number) => {
    setInputVideoList((prev) => prev.filter((_, i) => i !== index))
  }

  // Initialize clock & date
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      )
      setCurrentDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Duck YouTube Audio (Lower volume during queue calls)
  const duckYouTubeAudio = useCallback(() => {
    if (duckTimeoutRef.current) {
      clearTimeout(duckTimeoutRef.current)
    }
    setIsDucked(true)
    if (!isMuted && isAudioActivated) {
      applyYouTubeVolume(youtubeDuckLevel)
    }
  }, [isMuted, isAudioActivated, youtubeDuckLevel, applyYouTubeVolume])

  // Restore YouTube Audio (Return to normal volume after queue call ends)
  const restoreYouTubeAudio = useCallback(() => {
    if (duckTimeoutRef.current) {
      clearTimeout(duckTimeoutRef.current)
      duckTimeoutRef.current = null
    }
    setIsDucked(false)
    if (!isMuted && isAudioActivated) {
      applyYouTubeVolume(youtubeNormalVolume)
    }
  }, [isMuted, isAudioActivated, youtubeNormalVolume, applyYouTubeVolume])

  // Speech Announcement Handler with YouTube Volume Ducking
  const speakQueueCall = useCallback(
    (queueNumberLabel: string, polyclinicName: string, rawQueueNumber?: number) => {
      if (isMuted || !isAudioActivated) return

      // Duck YouTube audio immediately when announcement starts
      duckYouTubeAudio()

      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel()
          playChime()

          // Fallback safety timeout: restore YouTube volume after 10s if TTS events fail
          if (duckTimeoutRef.current) clearTimeout(duckTimeoutRef.current)
          duckTimeoutRef.current = setTimeout(() => {
            restoreYouTubeAudio()
          }, 10000)

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

            utterance.onend = () => {
              restoreYouTubeAudio()
            }

            utterance.onerror = () => {
              restoreYouTubeAudio()
            }

            window.speechSynthesis.speak(utterance)
          }, 450)
        } else {
          // Fallback if speechSynthesis is unsupported: restore volume after chime (~2.5s)
          if (duckTimeoutRef.current) clearTimeout(duckTimeoutRef.current)
          duckTimeoutRef.current = setTimeout(() => {
            restoreYouTubeAudio()
          }, 2500)
        }
      } catch (e) {
        console.warn('Speech synthesis unavailable:', e)
        restoreYouTubeAudio()
      }
    },
    [isMuted, isAudioActivated, duckYouTubeAudio, restoreYouTubeAudio]
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
    .slice(0, 4)

  const handleActivateAudio = () => {
    setIsAudioActivated(true)
    playChime()
    // Unmute & set YouTube volume
    applyYouTubeVolume(youtubeNormalVolume)
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => { })
    }
  }

  const handleReannounce = () => {
    if (activeQueue) {
      const label = getFormattedQueueLabel(activeQueue.polyclinic, activeQueue.queueNumber)
      speakQueueCall(label, activeQueue.polyclinic || 'Poli Umum', activeQueue.queueNumber)
    }
  }

  // Test ducking & announcement live
  const handleTestCallDucking = () => {
    speakQueueCall('A-01', 'Poli Umum', 1)
  }

  const embedSrcUrl = buildYouTubeEmbedSrc(videoList)

  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-br from-emerald-950 via-[#022c22] to-teal-950 text-white flex flex-col font-sans select-none overflow-x-hidden',
        !showAdminControls && 'cursor-none'
      )}
      onMouseMove={handleMouseMove}
    >
      {/* INITIAL AUDIO ACTIVATION OVERLAY */}
      {!isAudioActivated && (
        <div className="fixed inset-0 z-50 bg-emerald-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50 flex items-center justify-center mb-6 shadow-2xl animate-bounce">
            <Tv className="w-10 h-10" />
          </div>
          <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" /> DISPLAY TV RUANG TUNGGU
          </span>
          <h2 className="text-3xl font-extrabold text-white mb-3">Aktifkan Layar Panggilan Antrean Pasien</h2>
          <p className="text-base text-emerald-100/90 max-w-lg mb-8 leading-relaxed">
            Klik tombol di bawah untuk menyalakan pemutaran video YouTube, mode layar penuh (fullscreen), dan panggilan suara otomatis di TV ruang tunggu.
          </p>
          <button
            onClick={handleActivateAudio}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-base transition-all transform hover:scale-105 shadow-xl flex items-center gap-3 border-2 border-emerald-400"
          >
            <Play className="w-5 h-5 fill-white" /> MULAI DISPLAY & PANGGILAN SUARA
          </button>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <header
        className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 border-b-4 border-emerald-800 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-2xl relative"
        onMouseEnter={() => setShowAdminControls(true)}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white text-emerald-600 flex items-center justify-center font-black text-xl shadow-md shrink-0 border border-emerald-100">
            <HeartPulse className="w-7 h-7 text-emerald-600 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              KLINIK PRAKTEK DOKTER UMUM
            </h1>
            <p className="text-xs text-emerald-100 italic font-medium">
              Layanan Informasi Panggilan Antrean Pasien Real Time
            </p>
          </div>
        </div>

        {/* CONTROLS & DATE BADGE */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Admin Control Buttons Toolbar (Auto-hides on idle mouse) */}
          <div
            className={cn(
              'flex flex-wrap items-center gap-2.5 transition-all duration-500 transform',
              showAdminControls
                ? 'opacity-100 scale-100 pointer-events-auto translate-y-0'
                : 'opacity-0 scale-95 pointer-events-none -translate-y-1'
            )}
          >
            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 bg-emerald-800/60 hover:bg-emerald-800 border border-emerald-300/40 px-3 py-1.5 rounded-xl text-white transition font-bold shadow-inner"
              title={isFullscreen ? 'Keluar Layar Penuh (ESC / F11)' : 'Tampilkan Layar Penuh (F11)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-emerald-200" /> : <Maximize className="w-4 h-4 text-emerald-200" />}
              <span>{isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh (F11)'}</span>
            </button>

            {/* Change YouTube Playlist & Audio Settings Button */}
            <button
              onClick={() => setIsYoutubeModalOpen(true)}
              className="flex items-center gap-1.5 bg-emerald-800/60 hover:bg-emerald-800 border border-emerald-300/40 px-3 py-1.5 rounded-xl text-white transition font-bold shadow-inner"
              title="Kelola Playlist & Pengaturan Suara YouTube"
            >
              <Video className="w-4 h-4 text-emerald-200" />
              <span>Playlist & Suara</span>
            </button>

            {/* Sound Controls */}
            {isAudioActivated && (
              <div className="flex items-center gap-1.5 bg-emerald-800/60 border border-emerald-300/40 p-1 rounded-xl shadow-inner">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition text-xs flex items-center gap-1 font-bold',
                    isMuted
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                      : 'bg-white text-emerald-700 font-black'
                  )}
                  title={isMuted ? 'Suara Dimatikan' : 'Suara Aktif'}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-700" />}
                  <span>{isMuted ? 'Mute' : 'Audio On'}</span>
                </button>

                <button
                  onClick={handleReannounce}
                  disabled={!activeQueue}
                  className="p-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition disabled:opacity-40 border border-emerald-400/30"
                  title="Panggil Ulang Suara"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Live Sync Status */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800/60 border border-emerald-300/40 text-white font-bold shadow-inner">
              {syncStatus === 'live' && (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300"></span>
                  </span>
                  <span className="text-emerald-200 font-bold text-[11px]">Live</span>
                </>
              )}
              {syncStatus === 'syncing' && (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-300 animate-spin" />
                  <span className="text-amber-300 font-bold text-[11px]">Sync...</span>
                </>
              )}
            </div>
          </div>

          {/* Date & Time Badge (Always Visible to Patients) */}
          <div className="bg-emerald-800/80 border border-emerald-400/50 px-4 py-1.5 rounded-xl text-emerald-100 font-mono font-black text-xs flex items-center gap-2 shadow-lg">
            <Clock className="w-3.5 h-3.5 text-emerald-300" />
            <span>{currentDateStr} | {currentTime}</span>
          </div>

          {/* Toggle Control Button (Discreet Gear Icon for Staff) */}
          <button
            onClick={() => setShowAdminControls((prev) => !prev)}
            className={cn(
              'p-2 rounded-xl border transition shadow-lg flex items-center justify-center',
              showAdminControls
                ? 'bg-white text-emerald-700 border-white'
                : 'bg-emerald-800/60 text-emerald-200 hover:bg-emerald-800 border-emerald-400/40 opacity-70 hover:opacity-100'
            )}
            title="Tampilkan / Sembunyikan Kontrol Admin TV"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        {/* LEFT COLUMN: MULTI-VIDEO YOUTUBE EMBED PLAYER & GUIDELINES (8 COLS) */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          {/* YOUTUBE EMBED CONTAINER */}
          <div className="flex-1 bg-black rounded-2xl border-4 border-emerald-500 shadow-2xl shadow-emerald-950/60 overflow-hidden relative min-h-[320px] sm:min-h-[420px] flex items-center justify-center group">
            <iframe
              ref={iframeRef}
              key={embedSrcUrl}
              src={embedSrcUrl}
              title="YouTube Playlist Video Ruang Tunggu"
              className="w-full h-full absolute inset-0 border-0 rounded-2xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />

            {/* AUDIO DUCKING OVERLAY BADGE */}
            {isDucked && (
              <div className="absolute top-4 left-4 z-20 bg-emerald-950/90 border-2 border-amber-400/80 px-3.5 py-1.5 rounded-xl text-amber-300 text-xs font-black flex items-center gap-2 shadow-2xl backdrop-blur-md animate-pulse">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Suara Video Mengecil ({youtubeDuckLevel}%) — Pemanggilan Antrean...</span>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: CALL DISPLAY & QUEUE HISTORY (4 COLS) */}
        <section className="lg:col-span-4 flex flex-col gap-5">
          {/* CARD 1: NOMOR PANGGILAN SAAT INI (DOMINANT & MUCH LARGER) */}
          <div className="flex-[2.5] bg-emerald-900/60 rounded-3xl border-4 border-emerald-500 shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 px-6 py-4 border-b-4 border-emerald-700 text-center shadow-md">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-widest text-white flex items-center justify-center gap-2.5">
                <BellRing className="w-5 h-5 text-emerald-100 animate-pulse" />
                NOMOR PANGGILAN
              </h2>
            </div>

            {/* Main Called Queue Box */}
            <div className="flex-1 p-6 sm:p-8 flex flex-col items-center justify-center text-center bg-white text-slate-900 min-h-[300px]">
              {activeQueue ? (
                <div className="space-y-4 w-full flex flex-col items-center justify-center my-auto">
                  <div className="text-7xl sm:text-8xl xl:text-9xl font-black font-mono tracking-tight text-emerald-600 drop-shadow-md py-1">
                    {getFormattedQueueLabel(activeQueue.polyclinic, activeQueue.queueNumber)}
                  </div>
                  <div className="inline-block px-6 py-2 rounded-xl bg-emerald-50 text-emerald-800 border-2 border-emerald-300 font-black text-base sm:text-xl shadow-sm">
                    {activeQueue.polyclinic || 'Poli Umum'}
                  </div>
                  <p className="text-sm sm:text-base text-slate-700 font-extrabold tracking-wide pt-1">
                    Silakan Masuk ke Ruang Dokter
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-8 flex flex-col items-center justify-center my-auto">
                  <div className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                    BELUM ADA PANGGILAN
                  </div>
                  <div className="flex justify-center gap-2.5 py-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/30 animate-pulse" />
                    <span className="w-4 h-4 rounded-full bg-emerald-500/30 animate-pulse [animation-delay:200ms]" />
                    <span className="w-4 h-4 rounded-full bg-emerald-500/30 animate-pulse [animation-delay:400ms]" />
                  </div>
                  <p className="text-sm text-slate-500 font-bold">
                    Menunggu panggilan dokter...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: RIWAYAT ANTREAN TERAKHIR (COMPACT & SECONDARY) */}
          <div className="flex-1 bg-emerald-900/60 rounded-2xl border-4 border-emerald-600/60 shadow-xl overflow-hidden flex flex-col min-h-[180px]">
            {/* Header */}
            <div className="bg-emerald-800/90 px-4 py-2.5 border-b-2 border-emerald-700 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-100 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-300" />
                RIWAYAT ANTREAN TERAKHIR
              </h3>
            </div>

            {/* List Items */}
            <div className="p-3 space-y-2 flex-1 overflow-y-auto">
              {recentCalls.length > 0 ? (
                recentCalls.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-2.5 bg-white text-slate-900 rounded-xl flex items-center justify-between border border-emerald-100 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                        {idx + 1}
                      </div>
                      <span className="text-base font-black font-mono text-emerald-800">
                        {getFormattedQueueLabel(q.polyclinic, q.queueNumber)}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                      {q.polyclinic || 'PENDAFTARAN'}
                    </span>
                  </div>
                ))
              ) : (
                [1, 2, 3].map((num) => (
                  <div
                    key={num}
                    className="p-2.5 bg-white/95 text-slate-900 rounded-xl flex items-center justify-between border border-slate-200 opacity-90"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                        {num}
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-400">
                        ---
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                      BELUM ADA RIWAYAT
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      {/* BOTTOM RUNNING TICKER BAR */}
      <footer className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white px-6 py-2.5 border-t-4 border-emerald-800 flex items-center gap-4 shrink-0 shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white text-emerald-700 font-black text-xs uppercase tracking-wider shrink-0 shadow">
          <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>INFORMASI</span>
        </div>
        <div className="overflow-hidden whitespace-nowrap text-xs sm:text-sm font-bold text-white tracking-wide flex-1">
          <p className="animate-marquee inline-block">
            🏥 Selamat Datang di Klinik Praktik Dokter Umum • Silakan mendaftar di bagian Administrasi • Mohon perhatikan antrean dan tunggu panggilan • Setelah pemeriksaan, silakan menuju Kasir dan Apotek • Terima kasih atas kunjungan Anda, semoga lekas sembuh 🏥          </p>
        </div>
      </footer>

      {/* MULTI-VIDEO PLAYLIST & AUDIO SETTINGS MODAL */}
      {isYoutubeModalOpen && (
        <div className="fixed inset-0 z-50 bg-emerald-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-emerald-900 border-2 border-emerald-500 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-emerald-700 pb-3 shrink-0">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ListOrdered className="w-5 h-5 text-emerald-300" />
                Pengaturan Playlist & Suara YouTube
              </h3>
              <button
                onClick={() => setIsYoutubeModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* YOUTUBE DUCKING & VOLUME CONTROLS */}
            <div className="bg-emerald-950/80 p-3.5 rounded-xl border border-emerald-700/60 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-emerald-300" />
                  Mode Suara Video saat Panggilan Antrean:
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setYoutubeDuckLevel(10)}
                  className={cn(
                    'p-2 rounded-lg border text-xs font-bold transition flex flex-col items-center justify-center gap-1',
                    youtubeDuckLevel === 10
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-emerald-900 text-emerald-200 border-emerald-700 hover:bg-emerald-800'
                  )}
                >
                  <span>🔉 Mengecilkan Suara (10%)</span>
                  <span className="text-[10px] opacity-80 font-normal">(Rekomendasi)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setYoutubeDuckLevel(0)}
                  className={cn(
                    'p-2 rounded-lg border text-xs font-bold transition flex flex-col items-center justify-center gap-1',
                    youtubeDuckLevel === 0
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-emerald-900 text-emerald-200 border-emerald-700 hover:bg-emerald-800'
                  )}
                >
                  <span>🔇 Bisukan Suara (0% / Mute)</span>
                  <span className="text-[10px] opacity-80 font-normal">(Hilang Total)</span>
                </button>
              </div>

              {/* TEST CALL DUCKING BUTTON */}
              <button
                type="button"
                onClick={handleTestCallDucking}
                className="w-full py-1.5 bg-emerald-800 hover:bg-emerald-700 border border-emerald-500/50 text-amber-300 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow"
              >
                <Megaphone className="w-3.5 h-3.5 text-amber-300" /> Uji Coba Panggilan & Ducking Suara
              </button>
            </div>

            <p className="text-xs text-emerald-100/90 leading-relaxed shrink-0">
              Masukkan **link video YouTube** atau **Link Playlist YouTube**. Semua video diputar berurutan (*playlist loop*).
            </p>

            {/* List of Video URLs Inputs */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {inputVideoList.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-emerald-950/80 p-2 rounded-xl border border-emerald-700/60">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleUpdateVideoInput(idx, e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 bg-emerald-900/80 border border-emerald-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-400 font-mono"
                  />
                  {inputVideoList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVideoInput(idx)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition"
                      title="Hapus Video Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddVideoInput}
                className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 border border-emerald-600/60 text-emerald-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Tambah Video Lain ke Playlist
              </button>
            </div>

            {/* Presets */}
            <div className="text-[11px] text-emerald-100 bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-700/60 space-y-1.5 shrink-0">
              <p className="font-bold text-white">Preset Rekomendasi:</p>
              <button
                type="button"
                onClick={() =>
                  setInputVideoList([
                    'https://www.youtube.com/watch?v=5qap5aO4i9A',
                    'https://www.youtube.com/watch?v=lTRiuFIWV54',
                  ])
                }
                className="text-emerald-300 hover:underline block text-left font-medium"
              >
                • Preset 2 Video: Relaksasi Alam & Musik Ruang Tunggu
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-emerald-700 shrink-0">
              <button
                type="button"
                onClick={() => setIsYoutubeModalOpen(false)}
                className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 text-xs font-semibold rounded-xl border border-emerald-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl border border-emerald-400 shadow-md"
              >
                Simpan & Putar Playlist ({inputVideoList.filter((u) => u.trim() !== '').length} Video)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

