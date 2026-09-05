import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { newId } from '../lib/ids'
import { useDebouncedCallback } from '../lib/useDebouncedEffect'
import { collectCeremonyTracks } from '../lib/ceremonyTracks'
import { isBuiltInTrackId, loadAppSettings } from '../lib/appSettings'
import { formatDuration, resolveAudioDuration } from '../lib/audioDuration'
import TextLibraryModal from '../components/TextLibraryModal'
import PoemLibraryModal from '../components/PoemLibraryModal'
import CitationLibraryModal from '../components/CitationLibraryModal'
import AudioTrimModal from '../components/AudioTrimModal'
import type {
  Ceremony,
  CeremonySegment,
  CeremonyType,
  Photo,
  Track,
  TransitionType,
} from '../types'
import { createEmptySegment } from '../types'

const typeOptions: { value: CeremonyType; label: string }[] = [
  { value: 'obseques', label: 'Obsèques' },
  { value: 'creation', label: 'Crémation' },
  { value: 'inhumation', label: 'Inhumation' },
  { value: 'hommage', label: 'Hommage / recueillement' },
  { value: 'autre', label: 'Autre' },
]

const transitionOptions: { value: TransitionType; label: string }[] = [
  { value: 'fade', label: 'Fondu enchaîné' },
  { value: 'dissolve', label: 'Dissolution' },
  { value: 'slide', label: 'Glissement' },
  { value: 'cut', label: 'Cut sec' },
]

function inputClass() {
  return 'w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-gold-dim focus:outline-none'
}

export default function CeremonyEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ceremony = useLiveQuery(() => (id ? db.ceremonies.get(id) : undefined), [id])
  const allTracks = useLiveQuery(() => db.tracks.orderBy('name').toArray(), []) ?? []
  const allPhotos = useLiveQuery(() => db.photos.orderBy('createdAt').toArray(), []) ?? []
  const appSettings = useMemo(() => loadAppSettings(), [])

  // Une piste/photo importée n'appartient qu'à la cérémonie pour laquelle elle a été
  // ajoutée — seule la bibliothèque libre de droit est partagée entre toutes les cérémonies.
  const tracks = useMemo(
    () => allTracks.filter((t) => isBuiltInTrackId(t.id) || t.ceremonyId === id),
    [allTracks, id],
  )
  const photos = useMemo(
    () => allPhotos.filter((p) => p.ceremonyId === id),
    [allPhotos, id],
  )
  const ownTracks = useMemo(() => tracks.filter((t) => !isBuiltInTrackId(t.id)), [tracks])

  // Filtré uniquement pour les sélecteurs (affectation d'un morceau) — les
  // pistes déjà affectées restent résolues normalement (export PDF/ZIP,
  // lecture) même si la bibliothèque libre de droit est masquée.
  const selectableTracks = useMemo(
    () => (appSettings.hideBuiltInLibrary ? tracks.filter((t) => !isBuiltInTrackId(t.id)) : tracks),
    [tracks, appSettings.hideBuiltInLibrary],
  )

  const [draft, setDraft] = useState<Ceremony | null>(null)

  useEffect(() => {
    if (ceremony) setDraft(ceremony)
  }, [ceremony?.id])

  // keep in sync if changed elsewhere but avoid clobbering active typing
  useEffect(() => {
    if (ceremony && draft && ceremony.updatedAt > draft.updatedAt) {
      setDraft(ceremony)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony?.updatedAt])

  const persist = useDebouncedCallback((next: Ceremony) => {
    db.ceremonies.put({ ...next, updatedAt: Date.now() })
  }, 350)

  function update(patch: Partial<Ceremony>) {
    if (!draft) return
    const next = { ...draft, ...patch, updatedAt: Date.now() }
    setDraft(next)
    persist(next)
  }

  function updateSegment(segId: string, patch: Partial<CeremonySegment>) {
    if (!draft) return
    const segments = draft.segments.map((s) => (s.id === segId ? { ...s, ...patch } : s))
    update({ segments })
  }

  function addSegment() {
    if (!draft) return
    const segments = [...draft.segments, createEmptySegment(newId(), draft.segments.length + 1)]
    update({ segments })
  }

  const [deletedSegment, setDeletedSegment] = useState<{
    segment: CeremonySegment
    index: number
  } | null>(null)
  const deletedSegmentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (deletedSegmentTimerRef.current) clearTimeout(deletedSegmentTimerRef.current)
    }
  }, [])

  function removeSegment(segId: string) {
    if (!draft) return
    const index = draft.segments.findIndex((s) => s.id === segId)
    if (index === -1) return
    const segment = draft.segments[index]
    update({ segments: draft.segments.filter((s) => s.id !== segId) })

    if (deletedSegmentTimerRef.current) clearTimeout(deletedSegmentTimerRef.current)
    setDeletedSegment({ segment, index })
    deletedSegmentTimerRef.current = setTimeout(() => setDeletedSegment(null), 8000)
  }

  function undoRemoveSegment() {
    if (!draft || !deletedSegment) return
    const segments = [...draft.segments]
    segments.splice(deletedSegment.index, 0, deletedSegment.segment)
    update({ segments })
    if (deletedSegmentTimerRef.current) clearTimeout(deletedSegmentTimerRef.current)
    setDeletedSegment(null)
  }

  function moveSegment(index: number, dir: -1 | 1) {
    if (!draft) return
    const segments = [...draft.segments]
    const target = index + dir
    if (target < 0 || target >= segments.length) return
    ;[segments[index], segments[target]] = [segments[target], segments[index]]
    update({ segments })
  }

  const [textLibraryForSegment, setTextLibraryForSegment] = useState<string | null>(null)
  const [poemLibraryForSegment, setPoemLibraryForSegment] = useState<string | null>(null)
  const [citationLibraryForSegment, setCitationLibraryForSegment] = useState<string | null>(null)

  function insertText(segId: string, text: string) {
    if (!draft) return
    const segment = draft.segments.find((s) => s.id === segId)
    if (!segment) return
    const script = segment.script.trim() ? `${segment.script}\n\n${text}` : text
    updateSegment(segId, { script })
    setTextLibraryForSegment(null)
    setPoemLibraryForSegment(null)
    setCitationLibraryForSegment(null)
  }

  function togglePhoto(photoId: string) {
    if (!draft) return
    const has = draft.slideshow.photoIds.includes(photoId)
    const photoIds = has
      ? draft.slideshow.photoIds.filter((p) => p !== photoId)
      : [...draft.slideshow.photoIds, photoId]
    update({ slideshow: { ...draft.slideshow, photoIds } })
  }

  function moveSelectedPhoto(index: number, dir: -1 | 1) {
    if (!draft) return
    const photoIds = [...draft.slideshow.photoIds]
    const target = index + dir
    if (target < 0 || target >= photoIds.length) return
    ;[photoIds[index], photoIds[target]] = [photoIds[target], photoIds[index]]
    update({ slideshow: { ...draft.slideshow, photoIds } })
  }

  function toggleFixedPhoto(photoId: string) {
    if (!draft) return
    const fixedPhotoId = draft.slideshow.fixedPhotoId === photoId ? undefined : photoId
    update({ slideshow: { ...draft.slideshow, fixedPhotoId } })
  }

  const [importingPhotos, setImportingPhotos] = useState(false)

  async function handleImportPhotos(files: FileList | null) {
    if (!files || files.length === 0 || !draft) return
    setImportingPhotos(true)
    let i = 0
    for (const file of Array.from(files)) {
      const photo: Photo = {
        id: newId(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        blob: file,
        mimeType: file.type || 'image/jpeg',
        createdAt: Date.now() + i,
        ceremonyId: draft.id,
      }
      await db.photos.add(photo)
      i += 1
    }
    setImportingPhotos(false)
  }

  async function removePhoto(photo: Photo) {
    if (!confirm(`Supprimer "${photo.name}" ?`)) return
    if (draft?.slideshow.photoIds.includes(photo.id)) togglePhoto(photo.id)
    await db.photos.delete(photo.id)
  }

  const [importingTracks, setImportingTracks] = useState(false)

  async function handleImportTracks(files: FileList | null) {
    if (!files || files.length === 0 || !draft) return
    setImportingTracks(true)
    for (const file of Array.from(files)) {
      const duration = await new Promise<number | undefined>((resolve) => {
        const url = URL.createObjectURL(file)
        const audio = new Audio(url)
        audio.addEventListener('loadedmetadata', async () => {
          const d = await resolveAudioDuration(audio)
          resolve(Number.isFinite(d) ? d : undefined)
          URL.revokeObjectURL(url)
        })
        audio.addEventListener('error', () => {
          resolve(undefined)
          URL.revokeObjectURL(url)
        })
      })
      const track: Track = {
        id: newId(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        blob: file,
        mimeType: file.type || 'audio/mpeg',
        duration,
        createdAt: Date.now(),
        ceremonyId: draft.id,
      }
      await db.tracks.add(track)
    }
    setImportingTracks(false)
  }

  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  function toggleTrackPreview(track: Track) {
    if (playingTrackId === track.id) {
      previewAudioRef.current?.pause()
      setPlayingTrackId(null)
      return
    }
    previewAudioRef.current?.pause()
    const audio = new Audio(URL.createObjectURL(track.blob))
    audio.play()
    audio.onended = () => setPlayingTrackId(null)
    previewAudioRef.current = audio
    setPlayingTrackId(track.id)
  }

  async function removeTrack(track: Track) {
    if (!confirm(`Supprimer "${track.name}" ?`)) return
    if (playingTrackId === track.id) previewAudioRef.current?.pause()
    if (draft?.slideshow.trackId === track.id) {
      update({ slideshow: { ...draft.slideshow, trackId: undefined } })
    }
    draft?.segments
      .filter((s) => s.trackId === track.id)
      .forEach((s) => updateSegment(s.id, { trackId: undefined }))
    await db.tracks.delete(track.id)
  }

  const [trimmingTrack, setTrimmingTrack] = useState<Track | null>(null)

  useEffect(() => {
    return () => {
      previewAudioRef.current?.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalMinutes = useMemo(
    () => draft?.segments.reduce((sum, s) => sum + (s.estimatedDuration || 0), 0) ?? 0,
    [draft?.segments],
  )

  const [exportingMusic, setExportingMusic] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const usedTracks = useMemo(
    () => (draft ? collectCeremonyTracks(draft, tracks) : []),
    [draft, tracks],
  )

  async function handleExportPdf() {
    if (!draft) return
    setExportingPdf(true)
    try {
      const { exportCeremonyPdf } = await import('../lib/exportPdf')
      exportCeremonyPdf(draft, tracks)
    } finally {
      setExportingPdf(false)
    }
  }

  async function handleExportMusic() {
    if (!draft) return
    setExportingMusic(true)
    try {
      const { exportCeremonyMusicZip } = await import('../lib/exportMusic')
      const ok = await exportCeremonyMusicZip(draft, tracks)
      if (!ok) alert('Aucune musique n\'est encore associée à cette cérémonie.')
    } finally {
      setExportingMusic(false)
    }
  }

  if (!draft) {
    return <div className="p-10 text-muted">Chargement…</div>
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="text-sm text-muted hover:text-fg">
          ← Retour aux cérémonies
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/ceremonies/${draft.id}/biographie`)}
            className="rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-gold-dim hover:text-fg"
            title="Recueillir les informations biographiques et préparer l'éloge"
          >
            📝 Biographie
          </button>
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-gold-dim hover:text-fg disabled:opacity-40"
            title="Exporter le déroulé complet en PDF (à imprimer ou partager)"
          >
            {exportingPdf ? 'Génération…' : '📄 Exporter en PDF'}
          </button>
          <button
            onClick={handleExportMusic}
            disabled={exportingMusic || usedTracks.length === 0}
            className="rounded-md border border-line px-3 py-2 text-sm text-muted hover:border-gold-dim hover:text-fg disabled:opacity-40"
            title="Exporter les musiques de la cérémonie dans un fichier ZIP (pour la sono du lieu)"
          >
            {exportingMusic ? 'Préparation du ZIP…' : `🎵 Exporter la musique (${usedTracks.length})`}
          </button>
          <button
            onClick={() => navigate(`/ceremonies/${draft.id}/live`)}
            className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim"
          >
            ▶ Démarrer la régie live
          </button>
        </div>
      </div>

      <input
        value={draft.title}
        onChange={(e) => update({ title: e.target.value })}
        className="w-full border-none bg-transparent font-display text-3xl text-fg outline-none placeholder:text-muted"
        placeholder="Titre de la cérémonie"
      />

      <section className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-line bg-panel p-5">
        <Field label="Nom du défunt">
          <input
            value={draft.deceasedName}
            onChange={(e) => update({ deceasedName: e.target.value })}
            className={inputClass()}
          />
        </Field>
        <Field label="Type de cérémonie">
          <select
            value={draft.ceremonyType}
            onChange={(e) => update({ ceremonyType: e.target.value as CeremonyType })}
            className={inputClass()}
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => update({ date: e.target.value })}
            className={inputClass()}
          />
        </Field>
        <Field label="Heure">
          <input
            type="time"
            value={draft.time}
            onChange={(e) => update({ time: e.target.value })}
            className={inputClass()}
          />
        </Field>
        <Field label="Lieu">
          <input
            value={draft.location}
            onChange={(e) => update({ location: e.target.value })}
            className={inputClass()}
            placeholder="Crématorium, salle omniculte…"
          />
        </Field>
        <Field label="Contact famille">
          <input
            value={draft.familyContact ?? ''}
            onChange={(e) => update({ familyContact: e.target.value })}
            className={inputClass()}
          />
        </Field>
        <Field label="Officiant / maître de cérémonie">
          <input
            value={draft.officiant ?? ''}
            onChange={(e) => update({ officiant: e.target.value })}
            className={inputClass()}
          />
        </Field>
        <Field label="Notes internes">
          <input
            value={draft.notes}
            onChange={(e) => update({ notes: e.target.value })}
            className={inputClass()}
          />
        </Field>
      </section>

      <section className="mt-8 rounded-lg border border-line bg-panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg text-fg">Musiques de cette cérémonie</h3>
            <p className="mt-1 text-xs text-muted">
              Propres à {draft.title || 'cette cérémonie'} : elles n'apparaîtront pas dans les
              autres cérémonies. La bibliothèque libre de droit reste disponible partout.
            </p>
          </div>
          <label className="shrink-0 cursor-pointer whitespace-nowrap rounded-md border border-line px-3 py-2 text-xs text-muted hover:border-gold-dim hover:text-gold">
            {importingTracks ? 'Import…' : '+ Importer des musiques'}
            <input
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(e) => handleImportTracks(e.target.files)}
            />
          </label>
        </div>
        {ownTracks.length > 0 && (
          <ul className="divide-y divide-line rounded-md border border-line bg-panel-2">
            {ownTracks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                <button
                  onClick={() => toggleTrackPreview(t)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-dim text-xs text-gold hover:bg-panel"
                >
                  {playingTrackId === t.id ? '❚❚' : '▶'}
                </button>
                <span className="flex-1 truncate text-sm text-fg">{t.name}</span>
                <span className="text-xs text-muted">{formatDuration(t.duration)}</span>
                <button
                  onClick={() => {
                    if (playingTrackId === t.id) {
                      previewAudioRef.current?.pause()
                      setPlayingTrackId(null)
                    }
                    setTrimmingTrack(t)
                  }}
                  title="Couper les passages indésirables"
                  className="text-xs text-muted hover:text-fg"
                >
                  ✂️ Couper
                </button>
                <button
                  onClick={() => removeTrack(t)}
                  className="text-xs text-muted hover:text-danger"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-xl text-fg">Déroulé de la cérémonie</h3>
          <span className="text-xs text-muted">Durée estimée : {totalMinutes} min</span>
        </div>
        <div className="space-y-3">
          {draft.segments.map((seg, i) => (
            <div key={seg.id} className="rounded-lg border border-line bg-panel p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => moveSegment(i, -1)}
                    disabled={i === 0}
                    className="text-muted hover:text-gold disabled:opacity-30"
                    title="Monter"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveSegment(i, 1)}
                    disabled={i === draft.segments.length - 1}
                    className="text-muted hover:text-gold disabled:opacity-30"
                    title="Descendre"
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">#{i + 1}</span>
                    <input
                      value={seg.title}
                      onChange={(e) => updateSegment(seg.id, { title: e.target.value })}
                      className="flex-1 rounded-md border border-line bg-panel-2 px-2 py-1 text-sm font-medium text-fg outline-none focus:border-gold-dim"
                    />
                    <input
                      type="number"
                      min={0}
                      value={seg.estimatedDuration}
                      onChange={(e) =>
                        updateSegment(seg.id, { estimatedDuration: Number(e.target.value) })
                      }
                      className="w-16 rounded-md border border-line bg-panel-2 px-2 py-1 text-right text-sm text-fg outline-none focus:border-gold-dim"
                    />
                    <span className="text-xs text-muted">min</span>
                    <select
                      value={seg.trackId ?? ''}
                      onChange={(e) =>
                        updateSegment(seg.id, { trackId: e.target.value || undefined })
                      }
                      className="rounded-md border border-line bg-panel-2 px-2 py-1 text-xs text-fg outline-none focus:border-gold-dim"
                    >
                      <option value="">🎵 Aucune musique</option>
                      {selectableTracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          🎵 {t.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeSegment(seg.id)}
                      className="text-xs text-muted hover:text-danger"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="flex items-start gap-2">
                    <textarea
                      value={seg.script}
                      onChange={(e) => updateSegment(seg.id, { script: e.target.value })}
                      placeholder="Texte à lire pendant cette étape (affiché en direct dans le prompteur)…"
                      rows={3}
                      className="w-full resize-y rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-muted focus:border-gold-dim"
                    />
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        onClick={() => setTextLibraryForSegment(seg.id)}
                        title="Insérer un texte-type (ouverture, transition, hommage, clôture, pensées, repères religieux)"
                        className="whitespace-nowrap rounded-md border border-line px-2 py-1.5 text-xs text-muted hover:border-gold-dim hover:text-gold"
                      >
                        📖 Texte-type
                      </button>
                      <button
                        onClick={() => setPoemLibraryForSegment(seg.id)}
                        title="Insérer un poème (classés par situation de deuil)"
                        className="whitespace-nowrap rounded-md border border-line px-2 py-1.5 text-xs text-muted hover:border-gold-dim hover:text-gold"
                      >
                        📜 Poème
                      </button>
                      <button
                        onClick={() => setCitationLibraryForSegment(seg.id)}
                        title="Insérer une citation de livre (classées par situation de deuil)"
                        className="whitespace-nowrap rounded-md border border-line px-2 py-1.5 text-xs text-muted hover:border-gold-dim hover:text-gold"
                      >
                        💬 Citation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={addSegment}
            className="w-full rounded-lg border border-dashed border-line py-3 text-sm text-muted hover:border-gold-dim hover:text-gold"
          >
            + Ajouter une étape
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h3 className="mb-3 font-display text-xl text-fg">Diaporama photo</h3>
        <div className="rounded-lg border border-line bg-panel p-5">
          <div className="grid grid-cols-3 gap-4">
            <Field label="Transition">
              <select
                value={draft.slideshow.transition}
                onChange={(e) =>
                  update({
                    slideshow: { ...draft.slideshow, transition: e.target.value as TransitionType },
                  })
                }
                className={inputClass()}
              >
                {transitionOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Durée par photo (s)">
              <input
                type="number"
                min={1}
                value={draft.slideshow.slideDuration}
                onChange={(e) =>
                  update({
                    slideshow: { ...draft.slideshow, slideDuration: Number(e.target.value) },
                  })
                }
                className={inputClass()}
              />
            </Field>
            <Field label="Durée de transition (s)">
              <input
                type="number"
                min={0.2}
                step={0.1}
                value={draft.slideshow.transitionDuration}
                onChange={(e) =>
                  update({
                    slideshow: {
                      ...draft.slideshow,
                      transitionDuration: Number(e.target.value),
                    },
                  })
                }
                className={inputClass()}
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center gap-6 text-sm">
            <label className="flex items-center gap-2 text-fg">
              <input
                type="checkbox"
                checked={draft.slideshow.kenBurns}
                onChange={(e) =>
                  update({ slideshow: { ...draft.slideshow, kenBurns: e.target.checked } })
                }
              />
              Effet de zoom lent (Ken Burns)
            </label>
            <label className="flex items-center gap-2 text-fg">
              <input
                type="checkbox"
                checked={draft.slideshow.loop}
                onChange={(e) =>
                  update({ slideshow: { ...draft.slideshow, loop: e.target.checked } })
                }
              />
              Lecture en boucle
            </label>
            <label className="flex items-center gap-2 text-fg" title="Pratique si la famille n'a pas de préférence particulière sur l'ordre des photos.">
              <input
                type="checkbox"
                checked={draft.slideshow.shuffle ?? false}
                onChange={(e) =>
                  update({ slideshow: { ...draft.slideshow, shuffle: e.target.checked } })
                }
              />
              Ordre aléatoire
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted">Musique de fond</span>
              <select
                value={draft.slideshow.trackId ?? ''}
                onChange={(e) =>
                  update({
                    slideshow: { ...draft.slideshow, trackId: e.target.value || undefined },
                  })
                }
                className="rounded-md border border-line bg-panel-2 px-2 py-1 text-xs text-fg outline-none focus:border-gold-dim"
              >
                <option value="">Aucune</option>
                {selectableTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">
                  {draft.slideshow.photoIds.length} photo(s) sélectionnée(s) — propres à{' '}
                  {draft.title || 'cette cérémonie'}
                </p>
                <p className="mt-1 text-xs text-muted">
                  📌 Marquez une photo comme « photo fixe » pour l'afficher seule, sans
                  diaporama — utile en introduction ou si la famille demande d'y revenir en
                  cours de cérémonie. Bascule disponible dans le panneau Diaporama de la régie
                  live.
                </p>
              </div>
              <label className="shrink-0 cursor-pointer whitespace-nowrap rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:border-gold-dim hover:text-gold">
                {importingPhotos ? 'Import…' : '+ Importer des photos'}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImportPhotos(e.target.files)}
                />
              </label>
            </div>

            {draft.slideshow.photoIds.length > 0 && (
              <div className="mb-4 rounded-md border border-line bg-panel-2 p-3">
                <p className="mb-2 text-xs text-muted">
                  Ordre du diaporama — corrigez avec les flèches plutôt que de tout resélectionner
                  en cas d'erreur de clic.
                </p>
                <ul className="space-y-1">
                  {draft.slideshow.photoIds.map((pid, i) => {
                    const p = photos.find((ph) => ph.id === pid)
                    if (!p) return null
                    return (
                      <li
                        key={pid}
                        className="flex items-center gap-2 rounded-md bg-panel px-2 py-1.5"
                      >
                        <span className="w-5 shrink-0 text-center text-xs text-muted">{i + 1}</span>
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-line">
                          <PhotoThumb blob={p.blob} />
                        </div>
                        <span className="flex-1 truncate text-sm text-fg">{p.name}</span>
                        <button
                          onClick={() => moveSelectedPhoto(i, -1)}
                          disabled={i === 0}
                          className="text-muted hover:text-gold disabled:opacity-30"
                          title="Monter"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveSelectedPhoto(i, 1)}
                          disabled={i === draft.slideshow.photoIds.length - 1}
                          className="text-muted hover:text-gold disabled:opacity-30"
                          title="Descendre"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => togglePhoto(pid)}
                          className="text-xs text-muted hover:text-danger"
                          title="Retirer du diaporama"
                        >
                          ✕
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {photos.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-muted">
                Aucune photo importée pour cette cérémonie pour l'instant.
              </p>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {photos.map((p) => {
                  const selected = draft.slideshow.photoIds.includes(p.id)
                  const isFixed = draft.slideshow.fixedPhotoId === p.id
                  return (
                    <div key={p.id} className="group relative">
                      <button
                        onClick={() => togglePhoto(p.id)}
                        className={`relative aspect-square w-full overflow-hidden rounded-md border-2 ${
                          isFixed ? 'border-sky-400' : selected ? 'border-gold' : 'border-transparent'
                        }`}
                      >
                        <PhotoThumb blob={p.blob} />
                        {selected && (
                          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] text-ink">
                            {draft.slideshow.photoIds.indexOf(p.id) + 1}
                          </span>
                        )}
                        {isFixed && (
                          <span
                            className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-400 text-[10px]"
                            title="Photo fixe de cette cérémonie"
                          >
                            📌
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => removePhoto(p)}
                        className="absolute left-1 top-1 hidden rounded-full bg-ink/80 px-1.5 py-0.5 text-xs text-danger group-hover:block"
                        title="Supprimer cette photo"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => toggleFixedPhoto(p.id)}
                        className={`absolute bottom-1 right-1 hidden rounded-full bg-ink/80 px-1.5 py-0.5 text-xs group-hover:block ${
                          isFixed ? 'text-sky-400' : 'text-muted hover:text-fg'
                        }`}
                        title={isFixed ? 'Retirer comme photo fixe' : 'Définir comme photo fixe'}
                      >
                        📌
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {trimmingTrack && <AudioTrimModal track={trimmingTrack} onClose={() => setTrimmingTrack(null)} />}

      {textLibraryForSegment && (
        <TextLibraryModal
          onInsert={(text) => insertText(textLibraryForSegment, text)}
          onClose={() => setTextLibraryForSegment(null)}
        />
      )}

      {poemLibraryForSegment && (
        <PoemLibraryModal
          onInsert={(text) => insertText(poemLibraryForSegment, text)}
          onClose={() => setPoemLibraryForSegment(null)}
        />
      )}

      {citationLibraryForSegment && (
        <CitationLibraryModal
          onInsert={(text) => insertText(citationLibraryForSegment, text)}
          onClose={() => setCitationLibraryForSegment(null)}
        />
      )}

      {deletedSegment && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-gold-dim bg-panel px-4 py-3 shadow-lg">
          <span className="text-sm text-fg">
            Étape « {deletedSegment.segment.title || 'Sans titre'} » supprimée
          </span>
          <button
            onClick={undoRemoveSegment}
            className="shrink-0 rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-dim"
          >
            ↺ Annuler
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  )
}

function PhotoThumb({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (!url) return null
  return <img src={url} alt="" className="h-full w-full object-cover" />
}
