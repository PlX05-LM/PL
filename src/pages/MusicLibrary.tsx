import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { formatDuration } from '../lib/audioDuration'
import { isBuiltInTrackId } from '../lib/appSettings'
import type { BuiltInLibraryProgress } from '../lib/royaltyFreeMusic'
import AudioTrimModal from '../components/AudioTrimModal'
import type { Track } from '../types'

export default function MusicLibrary() {
  const allTracks = useLiveQuery(() => db.tracks.orderBy('name').toArray(), []) ?? []
  const tracks = allTracks.filter((t) => isBuiltInTrackId(t.id))
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [builtInProgress, setBuiltInProgress] = useState<BuiltInLibraryProgress | null>(null)
  const [trimmingTrack, setTrimmingTrack] = useState<Track | null>(null)
  const hasBuiltInLibrary = tracks.length > 0

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

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="mb-8">
        <h2 className="font-display text-3xl text-fg">Musique libre de droit</h2>
        <p className="mt-1 text-sm text-muted">
          Les musiques que vous importez pour une cérémonie se gèrent désormais directement
          depuis cette cérémonie, dans l'éditeur — elles ne sont plus mélangées avec celles des
          autres cérémonies. Cette page ne concerne que la bibliothèque commune ci-dessous.
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-gold-dim/40 bg-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg text-fg">Bibliothèque libre de droit</h3>
            <p className="mt-1 text-sm text-muted">
              20 compositions originales pensées pour les temps forts d'une cérémonie
              (entrée, recueillement, hommage, sortie) — créées pour Céréma, 100 % libres
              de droit, utilisables sans restriction dans un cadre professionnel. Partagée par
              toutes les cérémonies.
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
          Bibliothèque non encore installée.
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
              <span className="flex-1 text-sm text-fg">{t.name}</span>
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
