import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  channelNameFor,
  type PhotoDisplayMode,
  type ProjectorMessage,
  type VideoStatus,
} from '../lib/projectorChannel'
import type { VideoSound } from '../types'
import { useDebouncedCallback } from '../lib/useDebouncedEffect'
import { resolveAudioDuration } from '../lib/audioDuration'
import { computePace, paceLabel } from '../lib/pace'
import { loadKeymap, normalizeKey, saveKeymap, type Keymap, type RemoteAction } from '../lib/remoteControl'
import RemoteControlSettings from '../components/RemoteControlSettings'
import PreCeremonyChecklist from '../components/PreCeremonyChecklist'
import {
  detectAudioOutputCapability,
  isApplePlatform,
  listAudioOutputDevices,
  loadPreferredSink,
  onWirelessPlaybackTargetChange,
  savePreferredSink,
  setAudioSink,
  showAirPlayPicker,
  unlockDeviceLabels,
} from '../lib/audioOutput'
import { isBuiltInTrackId, loadAppSettings } from '../lib/appSettings'
import Icon from '../components/Icon'

/** Mélange déterministe (même graine → même ordre) : stable pour une cérémonie donnée. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) >>> 0
  const rand = () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    return h / 4294967296
  }
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

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
  const videos =
    useLiveQuery(
      () => (id ? db.videos.where('ceremonyId').equals(id).sortBy('createdAt') : []),
      [id],
    ) ?? []

  const appSettings = useMemo(() => loadAppSettings(), [])

  const [segmentIndex, setSegmentIndex] = useState(0)
  const [fontSize, setFontSize] = useState(appSettings.defaultFontSize)
  const [autoScroll, setAutoScroll] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(appSettings.defaultScrollSpeed) // px/s
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const [manualTrackId, setManualTrackId] = useState<string>('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  // Piste réellement chargée dans le lecteur (peut différer de celle affichée).
  const loadedTrackIdRef = useRef<string | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)

  const audioOutputCapability = useMemo(() => detectAudioOutputCapability(), [])
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedSinkId, setSelectedSinkId] = useState<string>(() => loadPreferredSink() ?? '')
  const [detectingDevices, setDetectingDevices] = useState(false)
  const [airplayActive, setAirplayActive] = useState(false)

  const [slideIndex, setSlideIndex] = useState(0)
  const [slidesPlaying, setSlidesPlaying] = useState(false)
  const [blackout, setBlackout] = useState(false)
  const [photoMode, setPhotoMode] = useState<PhotoDisplayMode>('diaporama')
  const channelRef = useRef<BroadcastChannel | null>(null)
  // Affichage à retrouver quand la vidéo s'arrête (diaporama ou photo fixe).
  const modeBeforeVideoRef = useRef<'diaporama' | 'fixe'>('diaporama')

  const [videoChoiceId, setVideoChoiceId] = useState<string>('')
  const [videoSound, setVideoSound] = useState<VideoSound>('video')
  const [videoVolume, setVideoVolume] = useState(1)
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null)
  const lastSentVideoKeyRef = useRef<string>('')
  const projectorWindowRef = useRef<Window | null>(null)

  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const [liveStateHydrated, setLiveStateHydrated] = useState(false)
  // Après une reprise, on ne réapplique pas l'écran prévu pour l'étape : on garde ce
  // qui était affiché au moment de la coupure.
  const resumedFromStateRef = useRef(false)
  const [resumed, setResumed] = useState(false)

  const [keymap, setKeymap] = useState<Keymap>(() => loadKeymap())
  const [showRemoteSettings, setShowRemoteSettings] = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)

  const [musicTab, setMusicTab] = useState<'player' | 'library'>('player')

  // Onglets de la colonne de droite, mémorisés d'une cérémonie à l'autre.
  type PanelTab = 'musique' | 'diaporama' | 'fixe' | 'video'
  const [panelTab, setPanelTab] = useState<PanelTab>(() => {
    try {
      const saved = localStorage.getItem('cereo-live-panel-tab')
      if (saved === 'musique' || saved === 'diaporama' || saved === 'fixe' || saved === 'video') {
        return saved
      }
    } catch {
      // stockage indisponible : onglet par défaut
    }
    return 'musique'
  })
  function selectPanelTab(tab: PanelTab) {
    setPanelTab(tab)
    try {
      localStorage.setItem('cereo-live-panel-tab', tab)
    } catch {
      // préférence non mémorisée, sans conséquence
    }
  }
  const [musicSearch, setMusicSearch] = useState('')

  const segments = ceremony?.segments ?? []
  const currentSegment = segments[segmentIndex]

  const pace = useMemo(
    () => (startedAt !== null ? computePace(segments, segmentIndex, elapsed) : null),
    [segments, segmentIndex, elapsed, startedAt],
  )

  const selectableTracks = useMemo(() => {
    // Une piste importée n'appartient qu'à la cérémonie pour laquelle elle a été ajoutée.
    const ownOrBuiltIn = tracks.filter((t) => isBuiltInTrackId(t.id) || t.ceremonyId === id)
    return appSettings.hideBuiltInLibrary
      ? ownOrBuiltIn.filter((t) => !isBuiltInTrackId(t.id))
      : ownOrBuiltIn
  }, [tracks, appSettings.hideBuiltInLibrary, id])

  const libraryTracks = useMemo(() => {
    const q = musicSearch.trim().toLowerCase()
    return [...selectableTracks]
      .filter((t) => t.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [selectableTracks, musicSearch])

  const slidePhotos = useMemo(() => {
    if (!ceremony) return []
    const byId = new Map(allPhotos.map((p) => [p.id, p]))
    const ordered = ceremony.slideshow.photoIds
      .map((pid) => byId.get(pid))
      .filter(Boolean) as typeof allPhotos
    // Ordre stable (déterministe par cérémonie) plutôt que remélangé à chaque rendu ou
    // rechargement, pour ne pas désorienter la régie en plein direct.
    return ceremony.slideshow.shuffle ? seededShuffle(ordered, ceremony.id) : ordered
  }, [ceremony, allPhotos])

  // Photos de la cérémonie, toutes disponibles comme photo fixe (pas seulement celles
  // retenues pour le diaporama).
  const ceremonyPhotos = useMemo(
    () => allPhotos.filter((p) => p.ceremonyId === id).sort((a, b) => a.createdAt - b.createdAt),
    [allPhotos, id],
  )

  // Photo fixe choisie en direct ; à défaut, celle définie pour la cérémonie.
  const [liveFixedPhotoId, setLiveFixedPhotoId] = useState<string | undefined>(undefined)
  // Cadenas : l'écran reste sur la photo fixe quoi qu'il arrive (fausse manipulation,
  // touche de télécommande, changement d'étape...) tant qu'on ne l'a pas déverrouillé.
  const [screenLocked, setScreenLocked] = useState(false)
  const [lockNudge, setLockNudge] = useState(0)
  /** Renvoie true (et signale le cadenas) si l'écran est verrouillé. */
  function screenIsLocked() {
    if (!screenLockedRef.current) return false
    setLockNudge((n) => n + 1)
    return true
  }
  const screenLockedRef = useRef(false)
  const [lockFlash, setLockFlash] = useState(false)
  useEffect(() => {
    if (lockNudge === 0) return
    setLockFlash(true)
    const t = setTimeout(() => setLockFlash(false), 1200)
    return () => clearTimeout(t)
  }, [lockNudge])
  useEffect(() => {
    screenLockedRef.current = screenLocked
  }, [screenLocked])
  const fixedPhoto = useMemo(() => {
    const fixedPhotoId = liveFixedPhotoId ?? ceremony?.slideshow.fixedPhotoId
    return fixedPhotoId ? allPhotos.find((p) => p.id === fixedPhotoId) ?? null : null
  }, [liveFixedPhotoId, ceremony, allPhotos])

  // --- Reprise après rechargement/plantage : on restaure l'état une seule fois au chargement ---
  useEffect(() => {
    if (!ceremony || liveStateHydrated) return
    const ls = ceremony.liveState
    if (ls) {
      setSegmentIndex(ls.segmentIndex)
      setStartedAt(ls.startedAt)
      setSlideIndex(ls.slideIndex)
      setBlackout(ls.blackout)
      setPhotoMode(ls.photoMode ?? 'diaporama')
      setLiveFixedPhotoId(ls.fixedPhotoId)
      if (ls.screenLocked && ls.photoMode === 'fixe') setScreenLocked(true)
      if (ls.startedAt !== null) {
        setResumed(true)
        resumedFromStateRef.current = true
      }
    }
    setLiveStateHydrated(true)
  }, [ceremony, liveStateHydrated])

  const persistLiveState = useDebouncedCallback(
    (
      id: string,
      state: {
        segmentIndex: number
        startedAt: number | null
        slideIndex: number
        blackout: boolean
        photoMode: 'diaporama' | 'fixe'
        fixedPhotoId?: string
        screenLocked?: boolean
      },
    ) => {
      db.ceremonies.update(id, { liveState: state, updatedAt: Date.now() })
    },
    400,
  )

  useEffect(() => {
    if (!liveStateHydrated || !id) return
    // La vidéo n'est jamais relancée automatiquement après une reprise : on mémorise
    // l'affichage photo qui la précédait.
    const persistedMode = photoMode === 'video' ? modeBeforeVideoRef.current : photoMode
    persistLiveState(id, {
      segmentIndex,
      startedAt,
      slideIndex,
      blackout,
      photoMode: persistedMode,
      fixedPhotoId: liveFixedPhotoId,
      screenLocked,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    liveStateHydrated,
    id,
    segmentIndex,
    startedAt,
    slideIndex,
    blackout,
    photoMode,
    liveFixedPhotoId,
    screenLocked,
  ])

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
    const el = promptRef.current
    if (!el) return
    let raf: number
    let last = performance.now()
    // scrollTop est un entier côté DOM : à faible vitesse, l'incrément par image
    // (ex. ~0.46px à 28px/s) est perdu par arrondi si on relit el.scrollTop à
    // chaque image. On accumule donc la position réelle nous-mêmes, en float.
    let pos = el.scrollTop
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      pos += scrollSpeed * dt
      el.scrollTop = pos
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // Le textarea est remonté (key sur l'id de l'étape) à chaque changement
    // d'étape : il faut relire promptRef.current à ce moment-là, sinon la boucle
    // continue de défiler l'ancien nœud DOM déjà démonté.
  }, [autoScroll, scrollSpeed, segmentIndex])

  useEffect(() => {
    if (promptRef.current) promptRef.current.scrollTop = 0
  }, [segmentIndex])

  // --- Audio player ---
  const activeTrackId = manualTrackId || currentSegment?.trackId || ''
  const activeTrack = tracks.find((t) => t.id === activeTrackId)

  function ensureAudioElement(): HTMLAudioElement {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      onWirelessPlaybackTargetChange(audioRef.current, setAirplayActive)
    }
    return audioRef.current
  }

  function loadTrack(trackId: string) {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    const url = URL.createObjectURL(track.blob)
    audioUrlRef.current = url
    const audio = ensureAudioElement()
    audio.src = url
    loadedTrackIdRef.current = trackId
    setAudioError(null)
    setProgress(0)
    setDuration(track.duration ?? 0)
    audio.volume = volume
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => {
      setIsPlaying(false)
      setAudioError(
        `« ${track.name} » ne peut pas être lue par ce navigateur. Convertissez-la en MP3 et réimportez-la.`,
      )
    }
    audio.ontimeupdate = () => setProgress(audio.currentTime)
    audio.onloadedmetadata = () => {
      resolveAudioDuration(audio).then(setDuration)
    }
    if (audioOutputCapability === 'sink-select' && selectedSinkId) {
      setAudioSink(audio, selectedSinkId).catch(() => {})
    }
    setManualTrackId(trackId)
  }

  function startPlayback() {
    const audio = audioRef.current
    if (!audio) return
    setIsPlaying(true)
    audio.play().catch((err: unknown) => {
      setIsPlaying(false)
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setAudioError('Le navigateur a bloqué la lecture : touchez ▶ une nouvelle fois.')
      } else if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setAudioError('Lecture impossible : ce fichier audio n’est pas lisible par ce navigateur. Convertissez-le en MP3 et réimportez-le.')
      }
    })
  }

  function loadAndPlayTrack(trackId: string) {
    loadTrack(trackId)
    startPlayback()
  }

  // En changeant d'étape sans musique en cours, le lecteur propose la musique de l'étape.
  useEffect(() => {
    if (!isPlaying) setManualTrackId('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex])

  // --- Sortie audio (enceinte Bluetooth, système son de la salle, AirPlay...) ---
  useEffect(() => {
    if (audioOutputCapability !== 'sink-select') return
    listAudioOutputDevices().then(setAudioDevices).catch(() => {})
  }, [audioOutputCapability])

  async function detectAudioDevices() {
    setDetectingDevices(true)
    try {
      await unlockDeviceLabels()
      const devices = await listAudioOutputDevices()
      setAudioDevices(devices)
    } finally {
      setDetectingDevices(false)
    }
  }

  async function selectAudioOutput(deviceId: string) {
    setSelectedSinkId(deviceId)
    savePreferredSink(deviceId)
    if (audioRef.current) {
      await setAudioSink(audioRef.current, deviceId).catch(() => {})
    }
  }

  function openAirPlayPicker() {
    showAirPlayPicker(ensureAudioElement())
  }

  function togglePlay() {
    const audio = audioRef.current
    // La musique affichée (celle de l'étape) n'est pas encore chargée : on la charge.
    if (!audio || (activeTrackId && loadedTrackIdRef.current !== activeTrackId)) {
      if (activeTrackId) loadAndPlayTrack(activeTrackId)
      return
    }
    if (audio.paused) {
      startPlayback()
    } else {
      audio.pause()
      setIsPlaying(false)
    }
  }

  function fadeOut() {
    const audio = audioRef.current
    if (!audio) return
    const startVol = audio.volume
    const tickMs = 100
    const steps = Math.max(1, Math.round((appSettings.defaultFadeOutSeconds * 1000) / tickMs))
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
    }, tickMs)
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
      mode: photoMode,
      fixedPhoto: fixedPhoto ? { id: fixedPhoto.id, blob: fixedPhoto.blob } : null,
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

  // --- Vidéo : chargée à l'avance sur l'écran de projection, pilotée depuis la régie ---
  const activeVideo = videos.find((v) => v.id === videoChoiceId) ?? null

  function sendVideoToProjector(force = false) {
    if (!channelRef.current) return
    const key = `${activeVideo?.id ?? ''}|${videoSound}`
    if (!force && key === lastSentVideoKeyRef.current) return
    lastSentVideoKeyRef.current = key
    channelRef.current.postMessage({
      type: 'video',
      video: activeVideo ? { id: activeVideo.id, blob: activeVideo.blob } : null,
      withSound: videoSound === 'video',
      volume: videoVolume,
    } satisfies ProjectorMessage)
  }
  const sendVideoToProjectorRef = useRef(sendVideoToProjector)
  useEffect(() => {
    sendVideoToProjectorRef.current = sendVideoToProjector
  })

  useEffect(() => {
    sendVideoToProjector()
    if (videoStatus && videoStatus.videoId !== activeVideo?.id) setVideoStatus(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVideo?.id, videoSound])

  useEffect(() => {
    channelRef.current?.postMessage({ type: 'videoVolume', volume: videoVolume } satisfies ProjectorMessage)
  }, [videoVolume])

  const videoIsPlaying = Boolean(videoStatus?.playing && videoStatus.videoId === activeVideo?.id)

  // À chaque étape, on prépare la vidéo qui lui est assignée — sans jamais interrompre
  // une vidéo en cours de lecture, et sans la lancer : c'est la régie qui décide.
  useEffect(() => {
    if (videoIsPlaying) return
    const seg = segments[segmentIndex]
    if (seg?.videoId && videos.some((v) => v.id === seg.videoId)) {
      setVideoChoiceId(seg.videoId)
      setVideoSound(seg.videoSound ?? 'video')
    } else if (!videoChoiceId && videos.length > 0) {
      setVideoChoiceId(videos[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex, videos.length])

  // --- Écran prévu pour chaque étape (diaporama ou photo fixe), appliqué en y arrivant ---
  const appliedSegmentRef = useRef<number | null>(null)
  useEffect(() => {
    if (!liveStateHydrated || !ceremony) return
    if (appliedSegmentRef.current === segmentIndex) return
    const isFirst = appliedSegmentRef.current === null
    appliedSegmentRef.current = segmentIndex
    if (isFirst && resumedFromStateRef.current) return
    applySegmentScreen(segments[segmentIndex])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex, liveStateHydrated, ceremony?.id])

  function applySegmentScreen(seg: (typeof segments)[number] | undefined) {
    if (!seg?.screen) return
    // Écran verrouillé : l'étape change, l'écran non (sans alerte, c'est voulu).
    if (screenLockedRef.current) return
    if (seg.screen === 'fixe' && seg.fixedPhotoId) setLiveFixedPhotoId(seg.fixedPhotoId)
    // Une vidéo en cours n'est jamais coupée par un changement d'étape.
    if (photoMode === 'video') return
    if (seg.screen === 'fixe') {
      if (seg.fixedPhotoId || ceremony?.slideshow.fixedPhotoId || liveFixedPhotoId) {
        setPhotoMode('fixe')
      }
    } else {
      setPhotoMode('diaporama')
    }
  }

  function leaveVideoIfShown() {
    if (photoMode !== 'video') return
    sendVideoCmd({ cmd: 'pause' })
    sendVideoCmd({ cmd: 'seek', time: 0 })
  }

  function showSlideshow() {
    if (screenIsLocked()) return
    leaveVideoIfShown()
    setBlackout(false)
    setPhotoMode('diaporama')
  }

  function showFixedPhoto(photoId?: string) {
    if (screenIsLocked()) return
    if (photoId) setLiveFixedPhotoId(photoId)
    leaveVideoIfShown()
    setBlackout(false)
    setPhotoMode('fixe')
  }

  function sendVideoCmd(msg: { cmd: 'play' } | { cmd: 'pause' } | { cmd: 'seek'; time: number }) {
    channelRef.current?.postMessage({ type: 'videoCmd', ...msg } satisfies ProjectorMessage)
  }

  function returnFromVideo() {
    setPhotoMode((m) => (m === 'video' ? modeBeforeVideoRef.current : m))
  }

  function playVideo() {
    if (screenIsLocked()) return
    if (!activeVideo) return
    setPhotoMode((m) => {
      if (m !== 'video') modeBeforeVideoRef.current = m
      return 'video'
    })
    setBlackout(false)
    setSlidesPlaying(false)
    if (videoSound === 'video') {
      // La bande-son de la vidéo prend le relais : la musique en cours s'efface en douceur.
      if (isPlaying) fadeOut()
    } else if (!isPlaying && activeTrackId) {
      // Vidéo muette : la musique de l'étape l'accompagne.
      togglePlay()
    }
    if (videoStatus?.ended) sendVideoCmd({ cmd: 'seek', time: 0 })
    sendVideoCmd({ cmd: 'play' })
  }

  function pauseVideo() {
    sendVideoCmd({ cmd: 'pause' })
  }

  function stopVideo() {
    if (screenIsLocked()) return
    sendVideoCmd({ cmd: 'pause' })
    sendVideoCmd({ cmd: 'seek', time: 0 })
    returnFromVideo()
  }

  // Un bouton de la régie touché volontairement passe toujours : il lève le cadenas
  // sans rien demander. Le cadenas ne protège que des changements involontaires
  // (changement d'étape, touche de télécommande).
  function releaseLock() {
    screenLockedRef.current = false
    setScreenLocked(false)
  }
  function byHand(action: () => void) {
    return () => {
      releaseLock()
      action()
    }
  }
  function startSlideshowByHand() {
    releaseLock()
    if (photoMode !== 'diaporama') {
      showSlideshow()
      setSlidesPlaying(true)
    } else {
      toggleSlideshowPlaying()
    }
  }
  /** Changer de photo fixe à la main : permis même verrouillé, le verrou reste en place. */
  function pickFixedPhotoByHand(photoId: string) {
    setLiveFixedPhotoId(photoId)
  }

  function lockScreen() {
    if (photoMode !== 'fixe' || !fixedPhoto) return
    setBlackout(false)
    setScreenLocked(true)
  }

  function unlockScreen() {
    releaseLock()
  }

  function toggleVideoPlaying() {
    if (videoIsPlaying) pauseVideo()
    else playVideo()
  }

  // Fin de la vidéo : retour automatique à l'affichage précédent (diaporama ou photo fixe).
  useEffect(() => {
    if (videoStatus?.ended) returnFromVideo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoStatus?.ended])

  useEffect(() => {
    if (!id) return
    const channel = new BroadcastChannel(channelNameFor(id))
    channel.onmessage = (ev: MessageEvent<ProjectorMessage>) => {
      const msg = ev.data
      if (msg.type === 'ready') {
        sendProjectorStateRef.current()
        sendVideoToProjectorRef.current(true)
      } else if (msg.type === 'videoStatus') {
        const { type: _type, ...status } = msg
        setVideoStatus(status)
      }
    }
    channelRef.current = channel
    return () => channel.close()
  }, [id])

  useEffect(() => {
    sendProjectorState()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony?.slideshow, slidePhotos, slideIndex, slidesPlaying, photoMode, fixedPhoto])

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

  // --- Actions pilotables au clavier / à la télécommande ---
  function goToNextSegment() {
    setSegmentIndex((i) => Math.min(segments.length - 1, i + 1))
  }
  function goToPrevSegment() {
    setSegmentIndex((i) => Math.max(0, i - 1))
  }
  function goToNextSlide() {
    setSlideIndex((i) => Math.min(slidePhotos.length - 1, i + 1))
  }
  function goToPrevSlide() {
    setSlideIndex((i) => Math.max(0, i - 1))
  }
  function toggleSlideshowPlaying() {
    setSlidesPlaying((p) => !p)
  }
  function togglePhotoModeState() {
    if (screenIsLocked()) return
    if (photoMode === 'video') {
      stopVideo()
      return
    }
    if (photoMode === 'diaporama' && !fixedPhoto) return
    setPhotoMode((m) => (m === 'diaporama' ? 'fixe' : 'diaporama'))
  }
  function toggleBlackoutState() {
    if (screenIsLocked()) return
    setBlackout((b) => !b)
  }
  function toggleAutoScrollState() {
    setAutoScroll((a) => !a)
  }
  function startChronoIfNeeded() {
    setStartedAt((s) => s ?? Date.now())
  }

  const remoteActions: Record<RemoteAction, () => void> = {
    nextSegment: goToNextSegment,
    prevSegment: goToPrevSegment,
    toggleMusic: togglePlay,
    fadeOutMusic: fadeOut,
    nextSlide: goToNextSlide,
    prevSlide: goToPrevSlide,
    toggleSlideshow: toggleSlideshowPlaying,
    togglePhotoMode: togglePhotoModeState,
    toggleBlackout: toggleBlackoutState,
    toggleAutoScroll: toggleAutoScrollState,
    startChrono: startChronoIfNeeded,
    toggleVideo: toggleVideoPlaying,
  }

  // Refs toujours à jour pour le gestionnaire clavier ci-dessous, qui n'est
  // branché qu'une fois : sans elles, il resterait figé sur les fonctions et
  // le keymap du tout premier rendu (même bug que la synchro projection).
  const remoteActionsRef = useRef(remoteActions)
  useEffect(() => {
    remoteActionsRef.current = remoteActions
  })
  const keymapRef = useRef(keymap)
  useEffect(() => {
    keymapRef.current = keymap
  }, [keymap])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      const key = normalizeKey(e.key)
      const entries = Object.entries(keymapRef.current) as [RemoteAction, string][]
      const match = entries.find(([, boundKey]) => normalizeKey(boundKey) === key)
      if (match) {
        e.preventDefault()
        remoteActionsRef.current[match[0]]()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function updateKeymap(next: Keymap) {
    setKeymap(next)
    saveKeymap(next)
  }

  if (!ceremony) {
    return <div className="p-10 text-muted">Chargement…</div>
  }

  const totalEstimated = segments.reduce((s, seg) => s + seg.estimatedDuration * 60, 0)

  const panelTabs: {
    key: PanelTab
    label: string
    icon: 'music' | 'film' | 'pin' | 'video'
    onAir: boolean
    dotClass: string
  }[] = [
    { key: 'musique', label: 'Musique', icon: 'music', onAir: isPlaying, dotClass: 'bg-gold' },
    {
      key: 'diaporama',
      label: 'Diaporama',
      icon: 'film',
      onAir: photoMode === 'diaporama' && !blackout,
      dotClass: 'bg-gold',
    },
    {
      key: 'fixe',
      label: 'Photo fixe',
      icon: 'pin',
      onAir: photoMode === 'fixe' && !blackout,
      dotClass: 'bg-sky-400',
    },
    {
      key: 'video',
      label: 'Vidéo',
      icon: 'video',
      onAir: photoMode === 'video' && !blackout,
      dotClass: 'bg-sky-400',
    },
  ]
  const onScreenLabel = blackout
    ? 'Écran noir'
    : photoMode === 'fixe'
      ? 'Photo fixe'
      : photoMode === 'video'
        ? 'Vidéo'
        : 'Diaporama'

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
          {appSettings.showPaceIndicator && pace && (
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
              onClick={startChronoIfNeeded}
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
            className="flex items-center gap-1.5 rounded-md border border-gold-dim px-3 py-1.5 text-sm text-gold hover:bg-panel-2"
          >
            <Icon name="monitor" className="h-4 w-4" />
            Ouvrir la projection
          </button>
          <button
            onClick={() => setShowRemoteSettings(true)}
            title="Configurer le clavier ou une télécommande de présentation pour piloter la régie sans toucher l'écran"
            className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:border-gold-dim hover:text-fg"
          >
            <Icon name="keyboard" className="h-4 w-4" />
            Télécommande
          </button>
          {appSettings.enablePreCeremonyChecklist && (
            <button
              onClick={() => setShowChecklist(true)}
              title="Repasser en revue les points techniques usuels avant de démarrer"
              className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm text-muted hover:border-gold-dim hover:text-fg"
            >
              Check-list
            </button>
          )}
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
                  {seg.trackId && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <Icon name="music" className="h-3 w-3" />
                      Musique assignée
                    </div>
                  )}
                  {seg.videoId && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <Icon name="video" className="h-3 w-3" />
                      Vidéo assignée
                    </div>
                  )}
                  {seg.screen && (
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                      <Icon name={seg.screen === 'fixe' ? 'pin' : 'film'} className="h-3 w-3" />
                      {seg.screen === 'fixe' ? 'Photo fixe' : 'Diaporama'}
                    </div>
                  )}
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
            {appSettings.showTeleprompter && (
              <div className="ml-auto flex items-center gap-3">
                <label className="flex items-center gap-1 text-muted">
                  <input type="checkbox" checked={autoScroll} onChange={toggleAutoScrollState} />
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
            )}
          </div>
          <div className="flex-1 overflow-hidden px-10 py-8">
            {appSettings.showTeleprompter ? (
              <textarea
                ref={promptRef}
                key={currentSegment?.id ?? 'none'}
                defaultValue={currentSegment?.script ?? ''}
                onChange={(e) => updateScript(e.target.value)}
                placeholder="Aucun texte pour cette étape…"
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
                className="h-full w-full resize-none border-none bg-transparent text-fg outline-none scrollbar-thin placeholder:text-muted"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted">
                Prompteur masqué — réactivable dans Paramètres.
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-line bg-panel px-4 py-2 text-xs">
            <div className="flex gap-2">
              <button
                onClick={goToPrevSegment}
                disabled={segmentIndex === 0}
                className="rounded-md border border-line px-3 py-1 text-muted hover:text-fg disabled:opacity-30"
              >
                ← Étape précédente
              </button>
              <button
                onClick={goToNextSegment}
                disabled={segmentIndex >= segments.length - 1}
                className="rounded-md border border-line px-3 py-1 text-muted hover:text-fg disabled:opacity-30"
              >
                Étape suivante →
              </button>
            </div>
          </div>
        </section>

        {/* Musique + diaporama */}
        <aside className="flex flex-col overflow-hidden border-l border-line bg-panel">
          <nav className="grid shrink-0 grid-cols-4 border-b border-line">
            {panelTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => selectPanelTab(tab.key)}
                title={tab.onAir ? `${tab.label} — en cours` : tab.label}
                className={`relative flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] transition-colors ${
                  panelTab === tab.key
                    ? 'bg-panel-2 text-gold'
                    : 'text-muted hover:bg-panel-2 hover:text-fg'
                }`}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                {tab.label}
                {tab.onAir && (
                  <span
                    className={`absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full ${tab.dotClass}`}
                  />
                )}
                {panelTab === tab.key && (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-gold" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-4">
            {panelTab === 'musique' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-wide text-muted">Musique</h2>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setMusicTab('player')}
                      className={`rounded px-2 py-0.5 text-[11px] ${
                        musicTab === 'player' ? 'bg-panel-2 text-gold' : 'text-muted hover:text-fg'
                      }`}
                    >
                      Lecteur
                    </button>
                    <button
                      onClick={() => setMusicTab('library')}
                      className={`rounded px-2 py-0.5 text-[11px] ${
                        musicTab === 'library' ? 'bg-panel-2 text-gold' : 'text-muted hover:text-fg'
                      }`}
                    >
                      Bibliothèque ({selectableTracks.length})
                    </button>
                  </div>
                </div>

                {musicTab === 'library' && (
                  <div>
                    <input
                      value={musicSearch}
                      onChange={(e) => setMusicSearch(e.target.value)}
                      placeholder="Rechercher une musique…"
                      className="mb-2 w-full rounded-md border border-line bg-panel-2 px-2 py-1.5 text-sm text-fg outline-none focus:border-gold-dim"
                    />
                    <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                      {libraryTracks.length === 0 && (
                        <p className="py-4 text-center text-xs text-muted">Aucune musique trouvée.</p>
                      )}
                      {libraryTracks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => loadAndPlayTrack(t.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors ${
                            activeTrackId === t.id
                              ? 'border-gold-dim bg-panel-2 text-gold'
                              : 'border-line text-fg hover:bg-panel-2'
                          }`}
                        >
                          <span className="truncate">
                            {activeTrackId === t.id && isPlaying ? '▶ ' : ''}
                            {t.name}
                          </span>
                          <span className="shrink-0 font-mono text-muted">{formatClock(t.duration ?? NaN)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {musicTab === 'player' && (
                  <>
                    <select
                      value={activeTrackId}
                      onChange={(e) => loadTrack(e.target.value)}
                      className="w-full rounded-md border border-line bg-panel-2 px-2 py-2 text-sm text-fg outline-none focus:border-gold-dim"
                    >
                      <option value="">— Choisir une musique —</option>
                      {selectableTracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {activeTrack && (
                  <div className="mt-3 rounded-md border border-line bg-panel-2 p-3">
                    <p className="mb-2 truncate text-sm text-fg">{activeTrack.name}</p>
                    {audioError && (
                      <p className="mb-2 rounded-md border border-danger px-2 py-1.5 text-[11px] text-danger">
                        {audioError}
                      </p>
                    )}
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
                {audioOutputCapability === 'sink-select' && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-muted">Sortie audio</span>
                      <button
                        onClick={detectAudioDevices}
                        disabled={detectingDevices}
                        className="flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-xs text-muted hover:text-fg disabled:opacity-50"
                      >
                        {detectingDevices ? (
                          '…'
                        ) : (
                          <>
                            <Icon name="refresh" className="h-3 w-3" />
                            Détecter
                          </>
                        )}
                      </button>
                    </div>
                    <select
                      value={selectedSinkId}
                      onChange={(e) => selectAudioOutput(e.target.value)}
                      className="w-full rounded-md border border-line bg-panel-2 px-2 py-1 text-xs text-fg outline-none focus:border-gold-dim"
                    >
                      <option value="">Par défaut</option>
                      {audioDevices.map((d, i) => (
                        <option key={d.deviceId || i} value={d.deviceId}>
                          {d.label || `Sortie ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[10px] text-muted">
                      Enceinte Bluetooth, TV, système son… « Détecter » demande une
                      autorisation micro (jamais utilisée) pour afficher les noms.
                    </p>
                  </div>
                )}
                {audioOutputCapability === 'airplay' && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-muted">Sortie audio</span>
                      {airplayActive && <span className="text-[10px] text-gold">● Connecté</span>}
                    </div>
                    <button
                      onClick={openAirPlayPicker}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-gold-dim px-2 py-1.5 text-xs text-gold hover:bg-panel"
                    >
                      <Icon name="wireless" className="h-3.5 w-3.5" />
                      AirPlay / Bluetooth…
                    </button>
                    <p className="mt-1 text-[10px] text-muted">
                      {isApplePlatform()
                        ? "Ouvre le sélecteur système d'iPhone/iPad : enceintes AirPlay et Bluetooth déjà appairées."
                        : "Ouvre le sélecteur système du navigateur pour choisir la sortie audio (AirPlay, Bluetooth)."}
                    </p>
                  </div>
                )}
                  </>
                )}
              </div>
            )}
            {panelTab === 'diaporama' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-wide text-muted">Diaporama</h2>
                  <span className="flex items-center gap-2 text-xs text-muted">
                    {photoMode === 'diaporama' && (
                      <span className="rounded-full border border-gold px-2 py-0.5 text-[10px] text-gold">
                        À l'écran
                      </span>
                    )}
                    {slidePhotos.length > 0 ? `${slideIndex + 1}/${slidePhotos.length}` : '0/0'}
                  </span>
                </div>

                {photoMode !== 'diaporama' && (
                  <button
                    onClick={byHand(showSlideshow)}
                    className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-gold-dim px-2 py-1.5 text-xs font-medium text-gold hover:bg-panel-2"
                  >
                    <Icon name="film" className="h-3.5 w-3.5" />
                    Revenir au diaporama
                  </button>
                )}

                {slidePhotos[slideIndex] && (
                  <div
                    className={`mb-2 aspect-video overflow-hidden rounded-md border bg-black ${
                      photoMode === 'diaporama' ? 'border-gold' : 'border-line opacity-60'
                    }`}
                  >
                    <PhotoPreview blob={slidePhotos[slideIndex].blob} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevSlide}
                    className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-fg"
                  >
                    ⏮
                  </button>
                  <button
                    onClick={startSlideshowByHand}
                    className="flex-1 rounded-md border border-gold-dim px-2 py-1 text-xs text-gold hover:bg-panel-2"
                  >
                    {slidesPlaying && photoMode === 'diaporama' ? 'Pause diaporama' : 'Lancer diaporama'}
                  </button>
                  <button
                    onClick={goToNextSlide}
                    className="rounded-md border border-line px-2 py-1 text-xs text-muted hover:text-fg"
                  >
                    ⏭
                  </button>
                </div>
              </div>
            )}
            {panelTab === 'fixe' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-wide text-muted">Photo fixe</h2>
                  {photoMode === 'fixe' && (
                    <span className="rounded-full border border-sky-400 px-2 py-0.5 text-[10px] text-sky-400">
                      À l'écran
                    </span>
                  )}
                </div>

                {ceremonyPhotos.length === 0 ? (
                  <p className="text-xs text-muted">
                    Aucune photo importée pour cette cérémonie.
                  </p>
                ) : (
                  <>
                    <div
                      className={`mb-2 aspect-video overflow-hidden rounded-md border bg-black ${
                        photoMode === 'fixe' ? 'border-sky-400' : 'border-line'
                      }`}
                    >
                      {fixedPhoto ? (
                        <PhotoPreview blob={fixedPhoto.blob} />
                      ) : (
                        <p className="flex h-full items-center justify-center px-3 text-center text-[11px] text-muted">
                          Choisissez une photo ci-dessous
                        </p>
                      )}
                    </div>

                    {currentSegment?.screen === 'fixe' && currentSegment.fixedPhotoId && (
                      <p className="mb-1 text-[10px] text-muted">
                        Photo prévue pour l'étape « {currentSegment.title} » :{' '}
                        {currentSegment.fixedPhotoId === fixedPhoto?.id ? 'sélectionnée' : (
                          <button
                            onClick={() => currentSegment.fixedPhotoId && pickFixedPhotoByHand(currentSegment.fixedPhotoId)}
                            className="text-sky-400 underline"
                          >
                            la reprendre
                          </button>
                        )}
                      </p>
                    )}

                    <div className="mb-2 grid max-h-40 grid-cols-4 gap-1 overflow-y-auto">
                      {ceremonyPhotos.map((p) => {
                        const isCurrent = fixedPhoto?.id === p.id
                        return (
                          <button
                            key={p.id}
                            onClick={() =>
                          pickFixedPhotoByHand(p.id)
                        }
                            title={
                              photoMode === 'fixe'
                                ? 'Afficher cette photo à l’écran'
                                : 'Choisir comme photo fixe (sans l’afficher)'
                            }
                            className={`aspect-square overflow-hidden rounded border-2 ${
                              isCurrent ? 'border-sky-400' : 'border-transparent hover:border-line'
                            }`}
                          >
                            <PhotoPreview blob={p.blob} cover />
                          </button>
                        )
                      })}
                    </div>

                    {photoMode === 'fixe' && fixedPhoto && (
                      <button
                        onClick={screenLocked ? unlockScreen : lockScreen}
                        className={`mb-2 flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium ${
                          screenLocked
                            ? 'border-gold bg-gold/10 text-gold'
                            : 'border-line text-muted hover:border-gold-dim hover:text-fg'
                        }`}
                      >
                        <Icon name={screenLocked ? 'lock' : 'unlock'} className="h-3.5 w-3.5" />
                        {screenLocked
                          ? 'Écran verrouillé — déverrouiller'
                          : 'Verrouiller l’écran sur cette photo'}
                      </button>
                    )}
                    <button
                      onClick={byHand(() => (photoMode === 'fixe' ? showSlideshow() : showFixedPhoto()))}
                      disabled={photoMode !== 'fixe' && !fixedPhoto}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                        photoMode === 'fixe'
                          ? 'border-line text-muted hover:text-fg'
                          : 'border-sky-400 text-sky-400 hover:bg-panel-2'
                      }`}
                    >
                      <Icon name="pin" className="h-3.5 w-3.5" />
                      {photoMode === 'fixe' ? 'Masquer la photo fixe' : 'Afficher la photo fixe'}
                    </button>
                    <p className="mt-1 text-[10px] text-muted">
                      {photoMode === 'fixe'
                        ? 'Touchez une vignette pour changer la photo à l’écran.'
                        : 'Touchez une vignette pour la préparer, puis affichez-la.'}
                    </p>
                  </>
                )}
              </div>
            )}
            {panelTab === 'video' && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-wide text-muted">Vidéo</h2>
                  {photoMode === 'video' && (
                    <span className="rounded-full border border-sky-400 px-2 py-0.5 text-[10px] text-sky-400">
                      À l'écran
                    </span>
                  )}
                </div>

                {videos.length === 0 ? (
                  <p className="text-xs text-muted">
                    Aucune vidéo pour cette cérémonie. Importez-la dans l'éditeur de la cérémonie
                    (ex. diaporama monté par la famille).
                  </p>
                ) : (
                  <>
                    <select
                      value={videoChoiceId}
                      onChange={(e) => setVideoChoiceId(e.target.value)}
                      disabled={videoIsPlaying}
                      className="mb-2 w-full rounded-md border border-line bg-panel-2 px-2 py-1.5 text-xs text-fg outline-none focus:border-gold-dim disabled:opacity-60"
                    >
                      {videos.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>

                    <div className="mb-2 grid grid-cols-2 gap-1 rounded-md border border-line p-0.5 text-[11px]">
                      {(
                        [
                          ['video', 'Son de la vidéo'],
                          ['music', 'Musique de l’étape'],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          onClick={() => setVideoSound(value)}
                          className={`rounded px-2 py-1 ${
                            videoSound === value ? 'bg-panel-2 text-gold' : 'text-muted hover:text-fg'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {activeVideo && (
                      <VideoProgress
                        status={videoStatus?.videoId === activeVideo.id ? videoStatus : null}
                        fallbackDuration={activeVideo.duration}
                        onSeek={(time) => sendVideoCmd({ cmd: 'seek', time })}
                      />
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={byHand(toggleVideoPlaying)}
                        disabled={!activeVideo}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-sky-400 px-2 py-1.5 text-xs font-medium text-sky-400 hover:bg-panel-2 disabled:opacity-40"
                      >
                        <Icon name="video" className="h-3.5 w-3.5" />
                        {videoIsPlaying
                          ? 'Pause vidéo'
                          : photoMode === 'video' && videoStatus && videoStatus.currentTime > 0
                            ? 'Reprendre la vidéo'
                            : 'Lancer la vidéo'}
                      </button>
                      {photoMode === 'video' && (
                        <button
                          onClick={byHand(stopVideo)}
                          title="Arrête la vidéo et revient au diaporama ou à la photo fixe"
                          className="rounded-md border border-line px-2 py-1.5 text-xs text-muted hover:text-fg"
                        >
                          Arrêter
                        </button>
                      )}
                    </div>

                    {videoSound === 'video' && (
                      <label className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                        Volume
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={videoVolume}
                          onChange={(e) => setVideoVolume(Number(e.target.value))}
                          className="flex-1 accent-sky-400"
                        />
                      </label>
                    )}

                    {videoStatus?.blocked && (
                      <p className="mt-2 rounded-md border border-danger px-2 py-1.5 text-[11px] text-danger">
                        Le navigateur bloque le son sur l'écran de projection : cliquez une fois sur
                        cette fenêtre (ou passez-la en plein écran), puis relancez.
                      </p>
                    )}
                    {photoMode === 'video' && !videoStatus && (
                      <p className="mt-2 text-[11px] text-muted">
                        Ouvrez la projection pour diffuser la vidéo.
                      </p>
                    )}
                    <p className="mt-2 text-[10px] text-muted">
                      {videoSound === 'video'
                        ? 'La musique en cours s’efface quand la vidéo démarre.'
                        : 'Vidéo sans son, accompagnée par la musique de l’étape.'}{' '}
                      À la fin, retour automatique au diaporama.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-line p-3">
            <p className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted">
              À l’écran
              <span className="flex items-center gap-1.5 normal-case tracking-normal text-fg">
                {screenLocked && <Icon name="lock" className="h-3 w-3 text-gold" />}
                {onScreenLabel}
              </span>
            </p>
            {screenLocked && (
              <button
                onClick={unlockScreen}
                className={`mb-2 flex w-full items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                  lockFlash ? 'border-gold bg-gold text-ink' : 'border-gold text-gold hover:bg-panel-2'
                }`}
              >
                <Icon name="lock" className="h-3.5 w-3.5" />
                {lockFlash ? 'Écran verrouillé' : 'Déverrouiller l’écran'}
              </button>
            )}
            <button
              onClick={byHand(toggleBlackoutState)}
              className={`w-full rounded-md border px-2 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
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

      {showRemoteSettings && (
        <RemoteControlSettings
          keymap={keymap}
          onChange={updateKeymap}
          onClose={() => setShowRemoteSettings(false)}
        />
      )}
      {showChecklist && <PreCeremonyChecklist onClose={() => setShowChecklist(false)} />}
    </div>
  )
}

function PhotoPreview({ blob, cover = false }: { blob: Blob; cover?: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (!url) return null
  return (
    <img src={url} alt="" className={`h-full w-full ${cover ? 'object-cover' : 'object-contain'}`} />
  )
}

function VideoProgress({
  status,
  fallbackDuration,
  onSeek,
}: {
  status: VideoStatus | null
  fallbackDuration?: number
  onSeek: (time: number) => void
}) {
  const duration = status?.duration || fallbackDuration || 0
  const current = status?.currentTime ?? 0
  return (
    <div>
      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.5}
        value={Math.min(current, duration || 1)}
        disabled={!status || !duration}
        onChange={(e) => onSeek(Number(e.target.value))}
        className="w-full accent-sky-400 disabled:opacity-40"
      />
      <div className="flex justify-between font-mono text-[10px] text-muted">
        <span>{formatClock(current)}</span>
        <span>{duration ? `-${formatClock(Math.max(0, duration - current))}` : '--:--'}</span>
      </div>
    </div>
  )
}
