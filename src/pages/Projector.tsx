import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { SlideshowConfig } from '../types'
import {
  channelNameFor,
  type PhotoDisplayMode,
  type ProjectorMessage,
  type ProjectorPhoto,
} from '../lib/projectorChannel'
import { loadPreferredSink, setAudioSink } from '../lib/audioOutput'

interface Slide {
  id: string
  url: string
}

export default function Projector() {
  const { id } = useParams<{ id: string }>()
  const [config, setConfig] = useState<SlideshowConfig | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [index, setIndex] = useState(0)
  const [black, setBlack] = useState(false)
  const [connected, setConnected] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [mode, setMode] = useState<PhotoDisplayMode>('diaporama')
  const [fixedUrl, setFixedUrl] = useState<string | null>(null)
  const urlsRef = useRef<string[]>([])
  const fixedUrlRef = useRef<string | null>(null)
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Vidéo (diaporama monté par la famille, film souvenir...) ---
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoUrlRef = useRef<string | null>(null)
  const videoIdRef = useRef<string | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const blockedRef = useRef(false)
  const videoSoundRef = useRef({ withSound: true, volume: 1 })

  useEffect(() => {
    if (!id) return
    const channel = new BroadcastChannel(channelNameFor(id))
    channel.onmessage = (ev: MessageEvent<ProjectorMessage>) => {
      const msg = ev.data
      if (msg.type === 'state') {
        setConnected(true)
        setConfig(msg.config)
        setIndex(msg.index)
        setMode(msg.mode)
        // rebuild object URLs only when the photo set actually changed
        urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
        const next = msg.photos.map((p: ProjectorPhoto) => ({
          id: p.id,
          url: URL.createObjectURL(p.blob),
        }))
        urlsRef.current = next.map((s) => s.url)
        setSlides(next)

        if (fixedUrlRef.current) URL.revokeObjectURL(fixedUrlRef.current)
        const nextFixedUrl = msg.fixedPhoto ? URL.createObjectURL(msg.fixedPhoto.blob) : null
        fixedUrlRef.current = nextFixedUrl
        setFixedUrl(nextFixedUrl)
      } else if (msg.type === 'black') {
        setBlack(msg.on)
      } else if (msg.type === 'video') {
        const current = videoIdRef.current
        const nextId = msg.video?.id ?? null
        videoSoundRef.current = { withSound: msg.withSound, volume: msg.volume }
        const el = videoRef.current
        if (el) {
          el.muted = !msg.withSound
          el.volume = msg.volume
        }
        if (nextId === current) return
        videoIdRef.current = nextId
        blockedRef.current = false
        if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
        const nextUrl = msg.video ? URL.createObjectURL(msg.video.blob) : null
        videoUrlRef.current = nextUrl
        setVideoUrl(nextUrl)
      } else if (msg.type === 'videoVolume') {
        videoSoundRef.current.volume = msg.volume
        if (videoRef.current) videoRef.current.volume = msg.volume
      } else if (msg.type === 'videoCmd') {
        const el = videoRef.current
        if (!el) return
        if (msg.cmd === 'play') {
          blockedRef.current = false
          el.play().catch(() => {
            // Lecture avec son refusée par le navigateur (aucun clic sur cette fenêtre) :
            // la régie l'affiche, il suffit d'un clic sur l'écran de projection.
            blockedRef.current = true
            reportVideoStatus()
          })
        } else if (msg.cmd === 'pause') {
          el.pause()
        } else if (msg.cmd === 'seek') {
          el.currentTime = Math.max(0, msg.time)
          reportVideoStatus()
        }
      }
    }
    channelRef.current = channel
    channel.postMessage({ type: 'ready' } satisfies ProjectorMessage)
    return () => {
      channel.close()
      channelRef.current = null
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      if (fixedUrlRef.current) URL.revokeObjectURL(fixedUrlRef.current)
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function reportVideoStatus() {
    const el = videoRef.current
    const videoId = videoIdRef.current
    if (!el || !videoId || !channelRef.current) return
    channelRef.current.postMessage({
      type: 'videoStatus',
      videoId,
      currentTime: el.currentTime,
      duration: Number.isFinite(el.duration) ? el.duration : 0,
      playing: !el.paused && !el.ended,
      ended: el.ended,
      blocked: blockedRef.current,
    } satisfies ProjectorMessage)
  }

  // Le son de la vidéo sort sur la même enceinte que la musique de la régie, quand le
  // navigateur permet de choisir la sortie audio.
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.muted = !videoSoundRef.current.withSound
    el.volume = videoSoundRef.current.volume
    const sink = loadPreferredSink()
    if (sink) setAudioSink(el, sink).catch(() => {})
  }, [videoUrl])

  // Sécurité : une vidéo ne continue jamais à jouer quand on bascule sur les photos.
  useEffect(() => {
    if (mode !== 'video') videoRef.current?.pause()
  }, [mode])

  useEffect(() => {
    document.title = 'Diaporama — Projection'
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }

  function bumpControlsVisibility() {
    setShowControls(true)
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000)
  }

  useEffect(() => {
    bumpControlsVisibility()
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const transitionMs = (config?.transitionDuration ?? 1) * 1000

  return (
    <div
      className={`fixed inset-0 h-screen w-screen overflow-hidden bg-black ${
        showControls ? '' : 'cursor-none'
      }`}
      onMouseMove={bumpControlsVisibility}
      onDoubleClick={toggleFullscreen}
    >
      {!connected && (
        <div className="flex h-full w-full items-center justify-center text-lg text-zinc-500">
          En attente de la régie…
        </div>
      )}

      {connected && mode === 'fixe' && !fixedUrl && (
        <div className="flex h-full w-full items-center justify-center text-lg text-zinc-500">
          Aucune photo fixe définie pour cette cérémonie.
        </div>
      )}

      <button
        onClick={toggleFullscreen}
        className={`absolute bottom-4 right-4 z-10 rounded-md border border-white/20 bg-black/60 px-3 py-2 text-xs text-white/80 backdrop-blur transition-opacity hover:opacity-100 ${
          showControls ? 'opacity-70' : 'pointer-events-none opacity-0'
        }`}
      >
        {isFullscreen ? '⤢ Quitter le plein écran' : '⛶ Plein écran'}
      </button>

      {connected && mode === 'fixe' && fixedUrl && (
        <div className="absolute inset-0">
          <div
            className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl brightness-50"
            style={{ backgroundImage: `url(${fixedUrl})` }}
          />
          <img src={fixedUrl} alt="" className="relative h-full w-full object-contain" />
        </div>
      )}

      {connected && mode === 'diaporama' &&
        slides.map((s, i) => (
          <div
            key={s.id}
            className="absolute inset-0"
            style={{
              opacity: i === index ? 1 : 0,
              transition: `opacity ${transitionMs}ms ease-in-out`,
              zIndex: i === index ? 1 : 0,
            }}
          >
            <div
              className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl brightness-50"
              style={{ backgroundImage: `url(${s.url})` }}
            />
            <img
              src={s.url}
              alt=""
              className={`relative h-full w-full object-contain ${
                config?.kenBurns && i === index ? 'kenburns' : ''
              }`}
              style={
                config?.kenBurns
                  ? { animationDuration: `${(config.slideDuration + config.transitionDuration) * 1.05}s` }
                  : undefined
              }
            />
          </div>
        ))}

      {/* Vidéo projetée telle quelle : format d'origine conservé, bandes noires si besoin. */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-700"
        style={{
          opacity: connected && mode === 'video' && videoUrl ? 1 : 0,
          zIndex: connected && mode === 'video' ? 2 : -1,
        }}
      >
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            playsInline
            preload="auto"
            className="h-full w-full object-contain"
            onLoadedMetadata={reportVideoStatus}
            onTimeUpdate={reportVideoStatus}
            onPlay={reportVideoStatus}
            onPause={reportVideoStatus}
            onEnded={reportVideoStatus}
            onSeeked={reportVideoStatus}
          />
        )}
      </div>

      <div
        className="pointer-events-none absolute inset-0 bg-black transition-opacity duration-500"
        style={{ opacity: black ? 1 : 0, zIndex: 5 }}
      />
    </div>
  )
}
