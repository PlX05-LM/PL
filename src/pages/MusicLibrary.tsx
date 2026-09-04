import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { newId } from '../lib/ids'
import { formatDuration, resolveAudioDuration } from '../lib/audioDuration'
import type { BuiltInLibraryProgress } from '../lib/royaltyFreeMusic'
import AudioTrimModal from '../components/AudioTrimModal'
import type { Track } from '../types'

async function readDuration(blob: Blob): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.addEventListener('loadedmetadata', async () => {
      const duration = await resolveAudioDuration(audio)
      resolve(Number.isFinite(duration) ? duration : undefined)
      URL.revokeObjectURL(url)
    })
    audio.addEventListener('error', () => {
      resolve(undefined)
      URL.revokeObjectURL(url)
    })
  })
}

export default function MusicLibrary() {
  const tracks = useLiveQuery(() => db.tracks.orderBy('name').toArray(), []) ?? []
  const fileInput = useRef<HTMLInputElement>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [importing, setImporting] = useState(false)
  const [builtInProgress, setBuiltInProgress] = useState<BuiltInLibraryProgress | null>(null)
  const [trimmingTrack, setTrimmingTrack] = useState<Track | null>(null)
  const hasBuiltInLibrary = tracks.some((t) => t.id.startsWith('builtin-'))

  async function handleImportBuiltInLibrary() {
    setBuiltInProgress({ index: 0, total: 20, title: '' })
    try {
      const { importBuiltInLibrary } = await import('../lib/royaltyFreeMusic')
      await importBuiltInLibrary((p) => setBuiltInProgress(p))
    } finally {
      setBuiltInProgress(null)
    }
  }

  async function handleRegenerateBuiltInLibrary() {
    setBuiltInProgress({ index: 0, total: 20, title: '' })
    try {
      const { regenerateBuiltInLibrary } = await import('../lib/royaltyFreeMusic')
      await regenerateBuiltInLibrary((p) => setBuiltInProgress(p))
    } finally {
      setBuiltInProgress(null)
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setImporting(true)
    for (const file of Array.from(files)) {
      const duration = await readDuration(file)
      const track: Track = {
        id: newId(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        blob: file,
        mimeType: file.type || 'audio/mpeg',
        duration,
        createdAt: Date.now(),
      }
      await db.tracks.add(track)
    }
    setImporting(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  function togglePlay(track: Track) {
    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }
    const url = URL.createObjectURL(track.blob)
    if (audioRef.current) {
      audioRef.current.pause()
    }
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => setPlayingId(null)
    audioRef.current = audio
    setPlayingId(track.id)
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  async function rename(track: Track, name: string) {
    await db.tracks.update(track.id, { name })
  }

  async function remove(track: Track) {
    if (!confirm(`Supprimer "${track.name}" de la bibliothèque ?`)) return
    if (playingId === track.id) audioRef.current?.pause()
    await db.tracks.delete(track.id)
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl text-fg">Bibliothèque musicale</h2>
          <p className="mt-1 text-sm text-muted">
            Importez vos musiques (MP3, WAV, M4A…) pour les assigner aux étapes de vos cérémonies.
          </p>
        </div>
        <label className="cursor-pointer rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim">
          {importing ? 'Import…' : '+ Importer des musiques'}
          <input
            ref={fileInput}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      <div className="mb-8 rounded-lg border border-gold-dim/40 bg-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg text-fg">Bibliothèque libre de droit</h3>
            <p className="mt-1 text-sm text-muted">
              20 compositions originales pensées pour les temps forts d'une cérémonie
              (entrée, recueillement, hommage, sortie) — créées pour Céréma, 100 % libres
              de droit, utilisables sans restriction dans un cadre professionnel.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <button
              onClick={hasBuiltInLibrary ? handleRegenerateBuiltInLibrary : handleImportBuiltInLibrary}
              disabled={!!builtInProgress}
              className="rounded-md border border-gold-dim px-4 py-2 text-sm font-medium text-gold hover:bg-panel-2 disabled:opacity-50"
            >
              {builtInProgress
                ? `Génération… ${builtInProgress.index}/${builtInProgress.total}`
                : hasBuiltInLibrary
                  ? '🔄 Régénérer les sonorités'
                  : '+ Ajouter les 20 musiques'}
            </button>
            {hasBuiltInLibrary && !builtInProgress && (
              <p className="mt-1 text-xs text-muted">
                Remplace l'audio des 20 pistes (mêmes noms, mêmes affectations).
              </p>
            )}
          </div>
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-12 text-center text-muted">
          Aucune musique importée pour le moment.
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
          {tracks.map((t) => (
            <li key={t.id} className="flex items-center gap-4 px-4 py-3">
              <button
                onClick={() => togglePlay(t)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-dim text-gold hover:bg-panel-2"
              >
                {playingId === t.id ? '❚❚' : '▶'}
              </button>
              <input
                defaultValue={t.name}
                onBlur={(e) => rename(t, e.target.value)}
                className="flex-1 bg-transparent text-sm text-fg outline-none focus:underline"
              />
              {t.license && (
                <span
                  title={t.license}
                  className="rounded-full border border-gold-dim px-2 py-0.5 text-[10px] text-gold"
                >
                  Libre de droit
                </span>
              )}
              <span className="text-xs text-muted">{formatDuration(t.duration)}</span>
              <button
                onClick={() => {
                  if (playingId === t.id) {
                    audioRef.current?.pause()
                    setPlayingId(null)
                  }
                  setTrimmingTrack(t)
                }}
                title="Analyser la forme d'onde et couper les passages indésirables (intro bruitée, etc.)"
                className="text-xs text-muted hover:text-fg"
              >
                ✂️ Couper
              </button>
              <button
                onClick={() => remove(t)}
                className="text-xs text-muted hover:text-danger"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      {trimmingTrack && (
        <AudioTrimModal track={trimmingTrack} onClose={() => setTrimmingTrack(null)} />
      )}
    </div>
  )
}
