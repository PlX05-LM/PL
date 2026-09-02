import JSZip from 'jszip'
import { db } from '../db'
import { extensionForTrack } from './audioExt'
import { extensionForImage } from './imageExt'
import { toSafeFilename } from './filename'
import type { Ceremony, Photo, Track } from '../types'

const BACKUP_VERSION = 1

type TrackMeta = Omit<Track, 'blob'> & { file: string }
type PhotoMeta = Omit<Photo, 'blob'> & { file: string }

interface BackupManifest {
  version: number
  exportedAt: string
  ceremonies: Ceremony[]
  tracks: TrackMeta[]
  photos: PhotoMeta[]
}

export interface BackupStats {
  ceremonies: number
  tracks: number
  photos: number
}

export async function getLibraryStats(): Promise<BackupStats> {
  const [ceremonies, tracks, photos] = await Promise.all([
    db.ceremonies.count(),
    db.tracks.count(),
    db.photos.count(),
  ])
  return { ceremonies, tracks, photos }
}

export async function exportFullBackup(): Promise<BackupStats> {
  const [ceremonies, tracks, photos] = await Promise.all([
    db.ceremonies.toArray(),
    db.tracks.toArray(),
    db.photos.toArray(),
  ])

  const zip = new JSZip()

  const trackMetas: TrackMeta[] = tracks.map((t) => {
    const { blob, ...meta } = t
    const ext = extensionForTrack(t.mimeType, (blob as File).name)
    const file = `tracks/${t.id}.${ext}`
    zip.file(file, blob)
    return { ...meta, file }
  })

  const photoMetas: PhotoMeta[] = photos.map((p) => {
    const { blob, ...meta } = p
    const ext = extensionForImage(p.mimeType, (blob as File).name)
    const file = `photos/${p.id}.${ext}`
    zip.file(file, blob)
    return { ...meta, file }
  })

  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ceremonies,
    tracks: trackMetas,
    photos: photoMetas,
  }
  zip.file('backup.json', JSON.stringify(manifest, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dateStr = new Date().toISOString().slice(0, 10)
  a.download = `${toSafeFilename('Cerema-sauvegarde')}-${dateStr}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  return { ceremonies: ceremonies.length, tracks: tracks.length, photos: photos.length }
}

export async function importFullBackup(file: File): Promise<BackupStats> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Céréma valide (ZIP illisible).")
  }

  const manifestEntry = zip.file('backup.json')
  if (!manifestEntry) {
    throw new Error("Ce fichier n'est pas une sauvegarde Céréma valide (backup.json introuvable).")
  }

  let manifest: BackupManifest
  try {
    manifest = JSON.parse(await manifestEntry.async('string'))
  } catch {
    throw new Error('Le contenu de la sauvegarde est corrompu et illisible.')
  }

  if (!manifest.version || !Array.isArray(manifest.ceremonies)) {
    throw new Error('Format de sauvegarde non reconnu.')
  }

  for (const meta of manifest.tracks ?? []) {
    const entry = zip.file(meta.file)
    if (!entry) continue
    const arrayBuffer = await entry.async('arraybuffer')
    const { file: _file, ...rest } = meta
    const track: Track = { ...rest, blob: new Blob([arrayBuffer], { type: meta.mimeType }) }
    await db.tracks.put(track)
  }

  for (const meta of manifest.photos ?? []) {
    const entry = zip.file(meta.file)
    if (!entry) continue
    const arrayBuffer = await entry.async('arraybuffer')
    const { file: _file, ...rest } = meta
    const photo: Photo = { ...rest, blob: new Blob([arrayBuffer], { type: meta.mimeType }) }
    await db.photos.put(photo)
  }

  for (const ceremony of manifest.ceremonies) {
    await db.ceremonies.put(ceremony)
  }

  return {
    ceremonies: manifest.ceremonies.length,
    tracks: manifest.tracks?.length ?? 0,
    photos: manifest.photos?.length ?? 0,
  }
}
