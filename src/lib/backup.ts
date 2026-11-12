import JSZip from 'jszip'
import { db } from '../db'
import { extensionForTrack } from './audioExt'
import { extensionForImage } from './imageExt'
import { extensionForVideo } from './videoImport'
import { toSafeFilename } from './filename'
import { isSafeEndpoint } from './endpoint'
import { isImageSizeSafe } from './imageSize'
import type { Ceremony, Photo, Track, Video } from '../types'

const BACKUP_VERSION = 1

type TrackMeta = Omit<Track, 'blob'> & { file: string }
type PhotoMeta = Omit<Photo, 'blob'> & { file: string }
type VideoMeta = Omit<Video, 'blob'> & { file: string }

interface BackupManifest {
  version: number
  exportedAt: string
  ceremonies: Ceremony[]
  tracks: TrackMeta[]
  photos: PhotoMeta[]
  /** Absent des sauvegardes faites avant l'arrivée des vidéos. */
  videos?: VideoMeta[]
}

// --- Validation d'une sauvegarde importée ----------------------------------

/** Description de la sauvegarde (texte) : quelques Mo au plus, même pour des centaines de cérémonies. */
const MAX_MANIFEST_BYTES = 50 * 1024 * 1024
/** Un média réel (déjà compressé) ne se réduit presque pas : un taux énorme trahit une « bombe ». */
const MAX_COMPRESSION_RATIO = 100
const RATIO_CHECK_ABOVE_BYTES = 20 * 1024 * 1024
const MAX_ENTRY_BYTES = 8 * 1024 * 1024 * 1024

/** Tailles annoncées par l'archive, lues avant toute décompression. */
function entrySizes(entry: JSZip.JSZipObject): { compressed: number; uncompressed: number } {
  const data = (entry as unknown as { _data?: { compressedSize?: number; uncompressedSize?: number } })._data
  return { compressed: data?.compressedSize ?? 0, uncompressed: data?.uncompressedSize ?? 0 }
}

/**
 * Refuse une archive piégée (« bombe zip ») : quelques Mo qui se décompressent en
 * gigaoctets et figeraient l'application. Vérifié sur toutes les entrées, avant d'en
 * extraire une seule.
 */
function assertNotZipBomb(zip: JSZip) {
  zip.forEach((path, entry) => {
    if (entry.dir) return
    const { compressed, uncompressed } = entrySizes(entry)
    const limit = path === 'backup.json' ? MAX_MANIFEST_BYTES : MAX_ENTRY_BYTES
    const ratio = compressed > 0 ? uncompressed / compressed : uncompressed > 0 ? Infinity : 1
    if (uncompressed > limit || (uncompressed > RATIO_CHECK_ABOVE_BYTES && ratio > MAX_COMPRESSION_RATIO)) {
      throw new Error('Cette sauvegarde contient un fichier anormal (archive piégée ou endommagée) : elle a été refusée.')
    }
  })
}
// Un fichier de sauvegarde peut venir d'ailleurs (reçu par e-mail, clé USB…) : rien n'y est
// écrit dans l'application sans avoir été vérifié — identifiants, types de fichiers,
// structure des cérémonies.

const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
const isId = (v: unknown): v is string => typeof v === 'string' && ID_PATTERN.test(v)
const text = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/** Type de fichier accepté pour un média : la bonne famille (audio, image, vidéo), sans SVG. */
function safeMime(v: unknown, family: 'audio' | 'image' | 'video'): string | null {
  if (typeof v !== 'string' || !/^[a-z]+\/[a-z0-9.+-]{1,60}$/i.test(v)) return null
  const mime = v.toLowerCase()
  if (!mime.startsWith(`${family}/`) || mime.includes('svg')) return null
  return mime
}

function mediaMeta(raw: unknown, family: 'audio' | 'image' | 'video') {
  if (!isObj(raw) || !isId(raw.id) || typeof raw.file !== 'string') return null
  const mimeType = safeMime(raw.mimeType, family)
  if (!mimeType) return null
  return {
    id: raw.id,
    file: raw.file,
    name: text(raw.name, 300) ?? 'Sans titre',
    mimeType,
    createdAt: num(raw.createdAt) ?? Date.now(),
    ceremonyId: isId(raw.ceremonyId) ? raw.ceremonyId : undefined,
    duration: num(raw.duration),
  }
}

function sanitizeCeremony(raw: unknown): Ceremony | null {
  if (!isObj(raw) || !isId(raw.id) || !Array.isArray(raw.segments) || !isObj(raw.slideshow)) return null
  const c = raw as unknown as Ceremony
  if (typeof c.title !== 'string' || typeof c.deceasedName !== 'string') return null
  const segments = c.segments.filter((seg) => isObj(seg) && isId(seg.id) && typeof seg.title === 'string')
  // Un lien famille importé ne garde que les adresses de service sûres.
  const familyInvite =
    c.familyInvite && isObj(c.familyInvite) && typeof c.familyInvite.endpoint === 'string' && isSafeEndpoint(c.familyInvite.endpoint)
      ? c.familyInvite
      : undefined
  return { ...c, segments, familyInvite }
}

export interface BackupStats {
  ceremonies: number
  tracks: number
  photos: number
  videos: number
}

export async function getLibraryStats(): Promise<BackupStats> {
  const [ceremonies, tracks, photos, videos] = await Promise.all([
    db.ceremonies.count(),
    db.tracks.count(),
    db.photos.count(),
    db.videos.count(),
  ])
  return { ceremonies, tracks, photos, videos }
}

export async function exportFullBackup(): Promise<BackupStats> {
  const [ceremonies, tracks, photos, videos] = await Promise.all([
    db.ceremonies.toArray(),
    db.tracks.toArray(),
    db.photos.toArray(),
    db.videos.toArray(),
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
    // La sauvegarde garde la photo telle qu'affichée (retouche comprise), sans l'original.
    const { blob, originalBlob: _original, originalMimeType: _originalType, edit: _edit, ...meta } = p
    const ext = extensionForImage(p.mimeType, (blob as File).name)
    const file = `photos/${p.id}.${ext}`
    zip.file(file, blob)
    return { ...meta, file }
  })

  const videoMetas: VideoMeta[] = videos.map((v) => {
    const { blob, ...meta } = v
    const ext = extensionForVideo(v.mimeType, (blob as File).name)
    const file = `videos/${v.id}.${ext}`
    zip.file(file, blob)
    return { ...meta, file }
  })

  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    ceremonies,
    tracks: trackMetas,
    photos: photoMetas,
    videos: videoMetas,
  }
  zip.file('backup.json', JSON.stringify(manifest, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const dateStr = new Date().toISOString().slice(0, 10)
  a.download = `${toSafeFilename('Cereo-sauvegarde')}-${dateStr}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  return {
    ceremonies: ceremonies.length,
    tracks: tracks.length,
    photos: photos.length,
    videos: videos.length,
  }
}

export async function importFullBackup(file: File): Promise<BackupStats> {
  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new Error("Ce fichier n'est pas une sauvegarde Céréo valide (ZIP illisible).")
  }

  assertNotZipBomb(zip)

  const manifestEntry = zip.file('backup.json')
  if (!manifestEntry) {
    throw new Error("Ce fichier n'est pas une sauvegarde Céréo valide (backup.json introuvable).")
  }

  let manifest: BackupManifest
  try {
    manifest = JSON.parse(await manifestEntry.async('string'))
  } catch {
    throw new Error('Le contenu de la sauvegarde est corrompu et illisible.')
  }

  if (!isObj(manifest) || !manifest.version || !Array.isArray(manifest.ceremonies)) {
    throw new Error('Format de sauvegarde non reconnu.')
  }

  const list = (v: unknown) => (Array.isArray(v) ? v : [])
  const stats: BackupStats = { ceremonies: 0, tracks: 0, photos: 0, videos: 0 }

  for (const raw of list(manifest.tracks)) {
    const meta = mediaMeta(raw, 'audio')
    const entry = meta && zip.file(meta.file)
    if (!meta || !entry) continue
    const arrayBuffer = await entry.async('arraybuffer')
    const { file: _file, ...rest } = meta
    const r = raw as Record<string, unknown>
    const track: Track = {
      ...rest,
      artist: text(r.artist, 300),
      license: text(r.license, 300),
      trimStartSec: num(r.trimStartSec),
      trimEndSec: num(r.trimEndSec),
      blob: new Blob([arrayBuffer], { type: meta.mimeType }),
    }
    await db.tracks.put(track)
    stats.tracks++
  }

  for (const raw of list(manifest.photos)) {
    const meta = mediaMeta(raw, 'image')
    const entry = meta && zip.file(meta.file)
    if (!meta || !entry) continue
    const arrayBuffer = await entry.async('arraybuffer')
    const { file: _file, duration: _duration, ...rest } = meta
    const photo: Photo = { ...rest, blob: new Blob([arrayBuffer], { type: meta.mimeType }) }
    if (!(await isImageSizeSafe(photo.blob))) continue
    await db.photos.put(photo)
    stats.photos++
  }

  for (const raw of list(manifest.videos)) {
    const meta = mediaMeta(raw, 'video')
    const entry = meta && zip.file(meta.file)
    if (!meta || !entry) continue
    const arrayBuffer = await entry.async('arraybuffer')
    const { file: _file, ...rest } = meta
    const r = raw as Record<string, unknown>
    const video: Video = {
      ...rest,
      width: num(r.width),
      height: num(r.height),
      blob: new Blob([arrayBuffer], { type: meta.mimeType }),
    }
    await db.videos.put(video)
    stats.videos++
  }

  for (const raw of manifest.ceremonies) {
    const ceremony = sanitizeCeremony(raw)
    if (!ceremony) continue
    await db.ceremonies.put(ceremony)
    stats.ceremonies++
  }

  return stats
}
