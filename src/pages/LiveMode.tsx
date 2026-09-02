import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { channelNameFor, type ProjectorMessage } from '../lib/projectorChannel'
import { useDebouncedCallback } from '../lib/useDebouncedEffect'
import { resolveAudioDuration } from '../lib/audioDuration'
import { computePace, paceLabel } from '../lib/pace'

function formatClock(sec: number) {
  if (!Number.isFinite(sec)) return '--:--'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function LiveMode() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ceremony = useLiveQuery(() => (id ? db.ceremonies.get(id) : undefined), [id])
  const tracks = useLiveQuery(() => db.tracks.toArray(), []) ?? []
  const allPhotos = useLiveQuery(() => db.photos.toArray(), []) ?? []

  const [segmentIndex, setSegmentIndex] = useState(0)
  const [fontSize, setFontSize] = useState(40)
  const [autoScroll, setAutoScroll] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(28) // px/s
  const promptRef = useRef<HTMLDivElement>(null)

  const [manualTrackId, setManualTrackId] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const [slideIndex, setSlideIndex] = useState(0)
  const [slidesPlaying, setSlidesPlaying] = useState(false)
  const [blackout, setBlackout] = useState(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const projectorWindowRef = useRef<Window | null>(null)

  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const [liveStateHydrated, setLiveStateHydrated] = useState(false)
  const [resumed, setResumed] = useState(false)

  const segments = ceremony?.segments ?? []
  const currentSegment = segments[segmentIndex]

  const pace = useMemo(
    () => (startedAt !== null ? computePace(segments, segmentIndex, elapsed) : null),
    [segments, segmentIndex, elapsed, startedAt],
  )

  const slidePhotos = useMemo(() => {
    if (!ceremony) return []
    const byId = new Map(allPhotos.map((p) => [p.id, p]))
    return ceremony.slideshow.photoIds.map((pid) => byId.get(pid)).filter(Boolean) as typeof allPhotos
  }, [ceremony, allPhotos])

  // --- Reprise après rechargement/plantage : on restaure l'état une seule fois au chargement ---
  useEffect(() => {
    if (!ceremony || liveStateHydrated) return
    const ls = ceremony.liveState
    if (ls) {
      setSegmentIndex(ls.segmentIndex)
      setStartedAt(ls.startedAt)
      setSlideIndex(ls.slideIndex)
      setBlackout(ls.blackout)
      if (ls.startedAt !== null) setResumed(true)
    }
    setLiveStateHydrated(true)
  }, [ceremony, liveStateHydrated])

  const persistLiveState = useDebouncedCallback(
    (id: string, state: { segmentIndex: number; startedAt: number | null; slideIndex: number; blackout: boolean }) => {
      db.ceremonies.update(id, { liveState: state, updatedAt: Date.now() })
    },
    400,
  )

  useEffect(() => {
    if (!liveStateHydrated || !id) return
    persistLiveState(id, { segmentIndex, startedAt, slideIndex, blackout })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveStateHydrated, id, segmentIndex, startedAt, slideIndex, blackout])

  // --- Elapsed time chrono ---
  useEffect(() => {
    if (startedAt === null) return
    // Calcul immédiat pour éviter un flash à 00:00 avant le premier tick — utile
    // en particulier juste après une reprise, où startedAt vient d'être restauré.
    setElapsed((Date.now() - startedAt) / 1000)
    const t = setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500)
    return () => clearInterval(t)
  }, [startedAt])

  // --- Script editing (debounced save) ---
  const persistScript = useDebouncedCallback((segId: string, script: string) => {
    if (!ceremony) return
    const segmentsNext = ceremony.segments.map((s) => (s.id === segId ? { ...s, script } : s))
    db.ceremonies.update(ceremony.id, { segments: segmentsNext, updatedAt: Date.now() })
  }, 400)

  function updateScript(text: string) {
    if (!currentSegment) return
    persistScript(currentSegment.id, text)
  }

  // --- Teleprompter auto-scroll ---
  useEffect(() => {
    if (!autoScroll) return
    let raf: number
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      const el = promptRef.current
      if (el) {
        el.scrollTop += scrollSpeed * dt
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [autoScroll, scrollSpeed])

  useEffect(() => {
    if (promptRef.current) promptRef.current.scrollTop = 0
  }, [segmentIndex])

  // --- Audio player ---
  const activeTrackId = manualTrackId || currentSegment?.trackId || ''
  const activeTrack = tracks.find((t) => t.id === activeTrackId)

  function loadTrack(trackId: string) {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    const url = URL.createObjectURL(track.blob)
    audioUrlRef.current = url
    if (!audioRef.current) audioRef.current = new Audio()
    const audio = audioRef.current
    audio.src = url
    audio.volume = volume
    audio.onended = () => setIsPlaying(false)
    audio.ontimeupdate = () => setProgress(audio.currentTime)
    audio.onloadedmetadata = () => {
      resolveAudioDuration(audio).then(setDuration)
    }
    setManualTrackId(trackId)
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play()
      setIsPlaying(true)
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  function fadeOut() {
    const audio = audioRef.current
    if (!audio) return
    const startVol = audio.volume
    const steps = 20
    let i = 0
    const t = setInterval(() => {
      i += 1
      audio.volume = Math.max(0, startVol * (1 - i / steps))
      if (i >= steps) {
        clearInterval(t)
        audio.pause()
        audio.volume = volume
        setIsPlaying(false)
      }
    }, 100)
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  // --- Slideshow autoplay ---
  useEffect(() => {
    if (!slidesPlaying || !ceremony || slidePhotos.length === 0) return
    const ms = (ceremony.slideshow.slideDuration + ceremony.slideshow.transitionDuration) * 1000
    const t = setInterval(() => {
      setSlideIndex((i) => {
        const next = i + 1
        if (next >= slidePhotos.length) {
          return ceremony.slideshow.loop ? 0 : i
        }
        return next
      })
    }, ms)
    return () => clearInterval(t)
  }, [slidesPlaying, ceremony, slidePhotos.length])

  // --- Projector sync ---
  function sendProjectorState() {
    if (!ceremony || !channelRef.current) return
    channelRef.current.postMessage({
      type: 'state',
      config: ceremony.slideshow,
      photos: slidePhotos.map((p) => ({ id: p.id, blob: p.blob })),
      index: slideIndex,
      playing: slidesPlaying,
    } satisfies ProjectorMessage)
  }

  // Le gestionnaire de messages du BroadcastChannel n'est branché qu'une fois (voir
  // effet ci-dessous) : il doit passer par cette ref pour toujours appeler la version
  // la plus à jour de sendProjectorState, sinon il resterait figé sur le rendu initial
  // (où la cérémonie n'est pas encore chargée) et ne répondrait jamais au signal "ready"
  // envoyé par la fenêtre de projection à son ouverture.
  const sendProjectorStateRef = useRef(sendProjectorState)
  useEffect(() => {
    sendProjectorStateRef.current = sendProjectorState
  })

  useEffect(() => {
    if (!id) return
    const channel = new BroadcastChannel(channelNameFor(id))
    channel.onmessage = (ev: MessageEvent<ProjectorMessage>) => {
      if (ev.data.type === 'ready') sendProjectorStateRef.current()
    }
    channelRef.current = channel
    return () => channel.close()
  }, [id])

  useEffect(() => {
    sendProjectorState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony?.slideshow, slidePhotos, slideIndex, slidesPlaying])

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'black', on: blackout } satisfies ProjectorMessage)
  }, [blackout])

  function openProjector() {
    if (!id) return
    // Avec HashRouter, l'URL de la route est après le #, pas un chemin absolu :
    // ça reste correct que l'appli soit servie à la racine d'un domaine ou
    // sous un sous-chemin (ex. GitHub Pages).
    const w = window.open(
      `${import.meta.env.BASE_URL}#/projector/${id}`,
      'ceremonia-projector',
      'width=1280,height=720',
    )
    projectorWindowRef.current = w
    setTimeout(sendProjectorState, 500)
  }

  if (!ceremony) {
    return <div className="p-10 text-muted">Chargement…</div>
  }

  const totalEstimated = segments.reduce((s, seg) => s + seg.estimatedDuration * 60, 0)

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-ink text-fg">
      <header className="flex items-center justify-between border-b border-line bg-panel px-5 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/ceremonies/${id}`)} className="text-sm text-muted hover:text-fg">
            ← Quitter la régie
          </button>
          <h1 className="font-display text-lg text-fg">{ceremony.title}</h1>
          {resumed && (
            <span className="flex items-center gap-2 rounded-full border border-gold-dim px-3 py-1 text-xs text-gold">
              Reprise de la cérémonie en cours
              <button onClick={() => setResumed(false)} className="text-muted hover:text-fg">
                ✕
              </button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono text-sm text-muted">
            {formatClock(elapsed)} / {formatClock(totalEstimated)}
          </div>
          {pace && (
            <span
              title="Compare le temps écoulé à la durée prévue des étapes déjà passées"
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                pace.tone === 'behind'
                  ? 'border-danger text-danger'
                  : pace.tone === 'ahead'
                    ? 'border-gold-dim text-gold'
                    : 'border-line text-muted'
              }`}
            >
              {paceLabel(pace)}
            </span>
          )}
          {startedAt === null ? (
            <button
              onClick={() => setStartedAt(Date.now())}
              className="rounded-md bg-gold px-3 py-1.5 text-sm font-medium text-ink hover:bg-gold-dim"
            >
              Démarrer le chrono
            </button>
          ) : (
            <button
              onClick={() => setStartedAt(null)}
              className="rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:text-fg"
            >
              Réinitialiser
            </button>
          )}
          <button
            onClick={openProjector}
            title="Ouvre une fenêtre à faire glisser sur l'écran externe (TV/vidéoprojecteur branché en HDMI, ou via un cast Chromecast/AirPlay), puis à passer en plein écran depuis cette fenêtre."
            className="rounded-md border border-gold-dim px-3 py-1.5 text-sm text-gold hover:bg-panel-2"
          >
            🖥 Ouvrir la projection
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-[260px_1fr_320px] overflow-hidden">
        {/* Déroulé */}
        <aside className="overflow-y-auto border-r border-line bg-panel p-3">
          <h2 className="mb-2 px-2 text-xs uppercase tracking-wide text-muted">Déroulé</h2>
          <ul className="space-y-1">
            {segments.map((seg, i) => (
              <li key={seg.id}>
                <button
                  onClick={() => setSegmentIndex(i)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                    i === segmentIndex ? 'bg-panel-2 text-gold' : 'text-muted hover:bg-panel-2 hover:text-fg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{seg.title}</span>
                    <span className="text-xs">{seg.estimatedDuration}m</span>
                  </div>
                  {seg.trackId && <div className="mt-0.5 text-xs text-muted">🎵 assignée</div>}
                </button>
              </li>
            ))}
            {segments.length === 0 && (
              <p className="px-2 text-sm text-muted">Aucune étape définie.</p>
            )}
          </ul>
        </aside>

        {/* Téléprompteur */}
        <section className="flex flex-col overflow-hidden bg-black">
          <div className="flex items-center gap-4 border-b border-line bg-panel px-4 py-2 text-sm">
            <span className="text-muted">{currentSegment?.title ?? 'Aucune étape'}</span>
            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-1 text-muted">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                Défilement auto
              </label>
              <span className="text-muted">Vitesse</span>
              <input
                type="range"
                min={5}
                max={100}
                value={scrollSpeed}
                onChange={(e) => setScrollSpeed(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-muted">Taille</span>
              <input
                type="range"
                min={20}
                max={80}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
          <div ref={promptRef} className="flex-1 overflow-y-auto px-10 py-8 scrollbar-thin">
            <textarea
              key={currentSegment?.id ?? 'none'}
              defaultValue={currentSegment?.script ?? ''}
              onChange={(e) => updateScript(e.target.value)}
              placeholder="Aucun texte pour cette étape…"
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
              className="min-h-[60vh] w-full resize-none border-none bg-transparent text-fg outline-none placeholder:text-muted"
            />
          </div>
          <div className="flex items-center justify-between border-t border-line bg-panel px-4 py-2 text-xs">
            <div className="flex gap-2">
              <button
                onClick={() => setSegmentIndex((i) => Math.max(0, i - 1))}
                disabled={segmentIndex === 0}
                className="rounded-md border border-line px-3 py-1 text-muted hover:text-fg disabled:opacity-30"
              >
                ← Étape précédente
              </button>
              <button
                onClick={() => setSegmentIndex((i) => Math.min(segments.length - 1, i + 1))}
                disabled={segmentIndex >= segments.length - 1}
                className="rounded-md border border-line px-3 py-1 text-muted hover:text-fg disabled:opacity-30"
              >
                Étape suivante →
              </button>
            </div>
          </div>
        </section>

        {/* Musique + diaporama */}
        <aside className="flex flex-col gap-6 overflow-y-auto border-l border-line bg-panel p-4">
          <div>
            <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">Musique</h2>
            <select
              value={activeTrackId}
              onChange={(e) => loadTrack(e.target.value)}
              className="w-full rounded-md border border-line bg-panel-2 px-2 py-2 text-sm text-fg outline-none focus:border-gold-dim"
            >
              <option value="">— Choisir une musique —</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            {activeTrack && (
              <div className="mt-3 rounded-md border border-line bg-panel-2 p-3">
                <p className="mb-2 truncate text-sm text-fg">{activeTrack.name}</p>
                <div className="mb-2 flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-dim text-gold hover:bg-panel"
                  >
                    {isPlaying ? '❚❚' : '▶'}
                  </button>
                  <span className="font-mono text-xs text-muted">
                    {formatClock(progress)} / {formatClock(duration || 0)}
                  </span>
                  <button
                    onClick={fadeOut}
                    className="ml-auto rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-fg"
                  >
                    Fondu ↘
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setVolume(v)
                    if (audioRef.current) audioRef.current.volume = v
                  }}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wide text-muted">Diaporama</h2>
              <span className="text-xs text-muted">
                {slidePhotos.length > 0 ? `${slideIndex + 1}/${slidePhotos.length}` : '0/0'}
              </span>
            </div>
            {slidePhotos[slideIndex] && (
              <div className="mb-2 aspect-video overflow-hidden rounded-md border border-line bg-black">
                <PhotoPreview blob={slidePhotos[slideIndex].blob} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-fg"
              >
                ⏮
              </button>
              <button
                onClick={() => setSlidesPlaying((p) => !p)}
                className="flex-1 rounded-md border border-gold-dim px-2 py-1 text-xs text-gold hover:bg-panel-2"
              >
                {slidesPlaying ? 'Pause diaporama' : 'Lancer diaporama'}
              </button>
              <button
                onClick={() =>
                  setSlideIndex((i) => Math.min(slidePhotos.length - 1, i + 1))
                }
                className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-fg"
              >
                ⏭
              </button>
            </div>
            <button
              onClick={() => setBlackout((b) => !b)}
              className={`mt-2 w-full rounded-md border px-2 py-1 text-xs ${
                blackout
                  ? 'border-danger text-danger'
                  : 'border-line text-muted hover:text-fg'
              }`}
            >
              {blackout ? 'Rétablir la projection' : 'Écran noir'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function PhotoPreview({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (!url) return null
  return <img src={url} alt="" className="h-full w-full object-contain" />
}
