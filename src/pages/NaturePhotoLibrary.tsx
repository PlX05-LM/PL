import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, objectUrlFor } from '../db'
import { isBuiltInPhotoId } from '../lib/appSettings'
import {
  importNatureLibrary,
  natureThemeLabels,
  natureThemeOrder,
  regenerateNatureLibrary,
  type NatureLibraryProgress,
  type NatureTheme,
} from '../lib/naturePhotoLibrary'
import type { Photo } from '../types'

function ThumbUrl({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = objectUrlFor(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  if (!url) return null
  return <img src={url} alt="" className="h-full w-full object-cover" />
}

export default function NaturePhotoLibrary() {
  const allPhotos = useLiveQuery(() => db.photos.toArray(), []) ?? []
  const photos = allPhotos.filter((p) => isBuiltInPhotoId(p.id))
  const [progress, setProgress] = useState<NatureLibraryProgress | null>(null)
  const hasLibrary = photos.length > 0
  const [activeTheme, setActiveTheme] = useState<NatureTheme>('ciel')

  async function handleImport() {
    setProgress({ index: 0, total: 24, title: '' })
    try {
      await importNatureLibrary((p) => setProgress(p))
    } finally {
      setProgress(null)
    }
  }

  async function handleRegenerate() {
    setProgress({ index: 0, total: 24, title: '' })
    try {
      await regenerateNatureLibrary((p) => setProgress(p))
    } finally {
      setProgress(null)
    }
  }

  const themedPhotos = photos.filter((p: Photo) => p.id.startsWith(`builtin-nature-${activeTheme}`))

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="mb-8">
        <h2 className="font-display text-3xl text-fg">Photos nature</h2>
        <p className="mt-1 text-sm text-muted">
          Pour les familles qui n'ont pas de photo du défunt, ou qui préfèrent ne pas en
          diffuser : des visuels apaisants générés pour Céréma (pas des photographies —
          aucune question de droits), classés par thème. Ils apparaissent automatiquement
          dans le diaporama de chaque cérémonie, à côté des photos importées.
        </p>
      </div>

      <div className="mb-8 rounded-lg border border-gold-dim/40 bg-panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg text-fg">Bibliothèque nature</h3>
            <p className="mt-1 text-sm text-muted">
              24 visuels — ciel, mer, forêt, montagne, terre &amp; champs, lumière — 100 %
              générés, libres de droit, partagés par toutes les cérémonies.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <button
              onClick={hasLibrary ? handleRegenerate : handleImport}
              disabled={!!progress}
              className="rounded-md border border-gold-dim px-4 py-2 text-sm font-medium text-gold hover:bg-panel-2 disabled:opacity-50"
            >
              {progress
                ? `Génération… ${progress.index}/${progress.total}`
                : hasLibrary
                  ? '🔄 Régénérer les visuels'
                  : '+ Générer la bibliothèque'}
            </button>
          </div>
        </div>
      </div>

      {hasLibrary && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {natureThemeOrder.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTheme(t)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  activeTheme === t
                    ? 'border-gold bg-gold text-ink'
                    : 'border-line text-muted hover:border-gold-dim hover:text-fg'
                }`}
              >
                {natureThemeLabels[t]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {themedPhotos.map((p) => (
              <div key={p.id} className="aspect-video overflow-hidden rounded-md border border-line">
                <ThumbUrl blob={p.blob} />
              </div>
            ))}
          </div>
        </>
      )}

      {!hasLibrary && !progress && (
        <div className="rounded-lg border border-dashed border-line p-12 text-center text-muted">
          Bibliothèque non encore générée.
        </div>
      )}
    </div>
  )
}
