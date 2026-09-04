import { useEffect, useRef, useState } from 'react'
import { db } from '../db'
import { audioBufferToWavBlob } from '../lib/wavEncode'
import { computeWaveformPeaks, decodeAudioBlob, trimAudioBuffer } from '../lib/audioEditor'
import type { Track } from '../types'

interface Props {
  track: Track
  onClose: () => void
}

const MIN_SELECTION_SECONDS = 0.2
const WAVEFORM_BINS = 900

function formatPrecise(sec: number): string {
  if (!Number.isFinite(sec)) return '0:00.0'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

export default function AudioTrimModal({ track, onClose }: Props) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null)
  const [peaks, setPeaks] = useState<Float32Array | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startSec, setStartSec] = useState(0)
  const [endSec, setEndSec] = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const startSecRef = useRef(startSec)
  const endSecRef = useRef(endSec)

  useEffect(() => {
    startSecRef.current = startSec
  }, [startSec])
  useEffect(() => {
    endSecRef.current = endSec
  }, [endSec])

  useEffect(() => {
    let cancelled = false
    decodeAudioBlob(track.blob)
      .then((buf) => {
        if (cancelled) return
        setBuffer(buf)
        setPeaks(computeWaveformPeaks(buf, WAVEFORM_BINS))
        setEndSec(buf.duration)
      })
      .catch(() => {
        if (!cancelled) setError("Impossible d'analyser ce fichier audio.")
      })
    return () => {
      cancelled = true
    }
  }, [track.blob])

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause()
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  // Dessine la forme d'onde à chaque changement de données ou de taille du conteneur.
  useEffect(() => {
    if (!peaks || !canvasRef.current) return
    const canvas = canvasRef.current
    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const barWidth = width / peaks.length
      const mid = height / 2
      ctx.fillStyle = '#c9a24b'
      for (let i = 0; i < peaks.length; i++) {
        const h = Math.max(1, peaks[i] * (height - 4))
        ctx.fillRect(i * barWidth, mid - h / 2, Math.max(1, barWidth - 0.5), h)
      }
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [peaks])

  function timeFromClientX(clientX: number): number {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || !buffer) return 0
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return ratio * buffer.duration
  }

  function startDrag(handle: 'start' | 'end') {
    return (e: React.PointerEvent) => {
      e.preventDefault()
      const onMove = (ev: PointerEvent) => {
        const t = timeFromClientX(ev.clientX)
        if (handle === 'start') {
          setStartSec(Math.min(t, endSecRef.current - MIN_SELECTION_SECONDS))
        } else {
          setEndSec(Math.max(t, startSecRef.current + MIN_SELECTION_SECONDS))
        }
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }
  }

  function togglePreview() {
    if (previewing) {
      previewAudioRef.current?.pause()
      setPreviewing(false)
      return
    }
    if (!buffer) return
    if (!previewUrlRef.current) previewUrlRef.current = URL.createObjectURL(track.blob)
    const audio = previewAudioRef.current ?? new Audio()
    previewAudioRef.current = audio
    audio.src = previewUrlRef.current
    audio.currentTime = startSec
    audio.ontimeupdate = () => {
      if (audio.currentTime >= endSec) {
        audio.pause()
        setPreviewing(false)
      }
    }
    audio.onended = () => setPreviewing(false)
    audio.play()
    setPreviewing(true)
  }

  function resetSelection() {
    if (!buffer) return
    setStartSec(0)
    setEndSec(buffer.duration)
  }

  async function handleSave() {
    if (!buffer) return
    setSaving(true)
    try {
      previewAudioRef.current?.pause()
      setPreviewing(false)
      const trimmed = trimAudioBuffer(buffer, startSec, endSec)
      const blob = audioBufferToWavBlob(trimmed)
      await db.tracks.update(track.id, { blob, mimeType: 'audio/wav', duration: trimmed.duration })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const duration = buffer?.duration ?? 0
  const startPct = duration ? (startSec / duration) * 100 : 0
  const endPct = duration ? (endSec / duration) * 100 : 100
  const hasTrim = buffer ? startSec > 0.05 || endSec < buffer.duration - 0.05 : false

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="font-display text-lg text-fg">Couper « {track.name} »</h3>
          <button onClick={onClose} className="text-muted hover:text-fg">
            ✕
          </button>
        </div>

        <div className="p-4">
          <p className="mb-3 text-sm text-muted">
            Faites glisser les repères pour ne garder que le passage souhaité — utile pour retirer une
            introduction bruitée ou une fin inadaptée avant de jouer le morceau en cérémonie.
          </p>

          {error && <p className="py-8 text-center text-sm text-danger">{error}</p>}

          {!error && !buffer && (
            <p className="py-8 text-center text-sm text-muted">Analyse du fichier audio…</p>
          )}

          {buffer && peaks && (
            <>
              <div
                ref={containerRef}
                className="relative h-32 select-none overflow-hidden rounded-md border border-line bg-panel-2"
              >
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
                {/* Zones grisées : ce qui sera coupé */}
                <div
                  className="absolute inset-y-0 left-0 bg-ink/70"
                  style={{ width: `${startPct}%` }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-ink/70"
                  style={{ width: `${100 - endPct}%` }}
                />
                {/* Poignée de début */}
                <div
                  onPointerDown={startDrag('start')}
                  className="absolute inset-y-0 z-10 w-3 cursor-ew-resize touch-none"
                  style={{ left: `calc(${startPct}% - 6px)` }}
                >
                  <div className="mx-auto h-full w-0.5 bg-gold" />
                  <div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-gold" />
                </div>
                {/* Poignée de fin */}
                <div
                  onPointerDown={startDrag('end')}
                  className="absolute inset-y-0 z-10 w-3 cursor-ew-resize touch-none"
                  style={{ left: `calc(${endPct}% - 6px)` }}
                >
                  <div className="mx-auto h-full w-0.5 bg-gold" />
                  <div className="absolute -top-1 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-gold" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>
                  Début : <span className="font-mono text-fg">{formatPrecise(startSec)}</span>
                </span>
                <span>
                  Durée conservée :{' '}
                  <span className="font-mono text-gold">{formatPrecise(endSec - startSec)}</span>
                </span>
                <span>
                  Fin : <span className="font-mono text-fg">{formatPrecise(endSec)}</span>
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={togglePreview}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-dim text-gold hover:bg-panel-2"
                >
                  {previewing ? '❚❚' : '▶'}
                </button>
                <span className="text-xs text-muted">Écouter le passage conservé</span>
                <button
                  onClick={resetSelection}
                  disabled={!hasTrim}
                  className="ml-auto rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:text-fg disabled:opacity-40"
                >
                  Réinitialiser
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <p className="text-xs text-muted">
            Remplace définitivement le fichier importé (le morceau original ne sera plus récupérable).
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={onClose} className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:text-fg">
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!buffer || !hasTrim || saving}
              className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Couper et remplacer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
