import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { SlideshowConfig } from '../types'
import {
  channelNameFor,
  type PhotoDisplayMode,
  type ProjectorMessage,
  type ProjectorPhoto,
} from '../lib/projectorChannel'

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
      }
    }
    channel.postMessage({ type: 'ready' } satisfies ProjectorMessage)
    return () => {
      channel.close()
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
      if (fixedUrlRef.current) URL.revokeObjectURL(fixedUrlRef.current)
    }
  }, [id])

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

      <div
        className="pointer-events-none absolute inset-0 bg-black transition-opacity duration-500"
        style={{ opacity: black ? 1 : 0, zIndex: 5 }}
      />
    </div>
  )
}
