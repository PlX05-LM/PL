import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { SlideshowConfig } from '../types'
import { channelNameFor, type ProjectorMessage, type ProjectorPhoto } from '../lib/projectorChannel'

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
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    if (!id) return
    const channel = new BroadcastChannel(channelNameFor(id))
    channel.onmessage = (ev: MessageEvent<ProjectorMessage>) => {
      const msg = ev.data
      if (msg.type === 'state') {
        setConnected(true)
        setConfig(msg.config)
        setIndex(msg.index)
        // rebuild object URLs only when the photo set actually changed
        urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
        const next = msg.photos.map((p: ProjectorPhoto) => ({
          id: p.id,
          url: URL.createObjectURL(p.blob),
        }))
        urlsRef.current = next.map((s) => s.url)
        setSlides(next)
      } else if (msg.type === 'black') {
        setBlack(msg.on)
      }
    }
    channel.postMessage({ type: 'ready' } satisfies ProjectorMessage)
    return () => {
      channel.close()
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [id])

  useEffect(() => {
    document.title = 'Diaporama — Projection'
  }, [])

  const transitionMs = (config?.transitionDuration ?? 1) * 1000

  return (
    <div className="fixed inset-0 h-screen w-screen overflow-hidden bg-black">
      {!connected && (
        <div className="flex h-full w-full items-center justify-center text-lg text-zinc-500">
          En attente de la régie…
        </div>
      )}

      {connected &&
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
