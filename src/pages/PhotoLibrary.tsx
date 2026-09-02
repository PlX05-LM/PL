import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { newId } from '../lib/ids'
import type { Photo } from '../types'

export default function PhotoLibrary() {
  const photos = useLiveQuery(() => db.photos.orderBy('createdAt').toArray(), []) ?? []
  const fileInput = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setImporting(true)
    let i = 0
    for (const file of Array.from(files)) {
      const photo: Photo = {
        id: newId(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        blob: file,
        mimeType: file.type || 'image/jpeg',
        createdAt: Date.now() + i,
      }
      await db.photos.add(photo)
      i += 1
    }
    setImporting(false)
    if (fileInput.current) fileInput.current.value = ''
  }

  async function remove(photo: Photo) {
    if (!confirm(`Supprimer "${photo.name}" de la photothèque ?`)) return
    await db.photos.delete(photo.id)
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="font-display text-3xl text-fg">Photothèque</h2>
          <p className="mt-1 text-sm text-muted">
            Importez les photos qui composeront le diaporama de la cérémonie.
          </p>
        </div>
        <label className="cursor-pointer rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim">
          {importing ? 'Import…' : '+ Importer des photos'}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {photos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-12 text-center text-muted">
          Aucune photo importée pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              <div className="aspect-square overflow-hidden rounded-lg border border-line bg-panel-2">
                <PhotoThumb blob={p.blob} />
              </div>
              <p className="mt-1 truncate text-xs text-muted">{p.name}</p>
              <button
                onClick={() => remove(p)}
                className="absolute right-1 top-1 hidden rounded-full bg-ink/80 px-2 py-0.5 text-xs text-danger group-hover:block"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
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
