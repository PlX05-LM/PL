/**
 * Fichiers et textes que la famille dépose via son lien : photos, vidéos, documents, textes
 * écrits (discours, poème, message). Les fichiers sont chiffrés dans le téléphone puis
 * envoyés en morceaux de 20 Mo ; la liste de ce qui a été déposé voyage, chiffrée elle
 * aussi, avec les réponses du formulaire.
 */
import { isSafeEndpoint } from './endpoint'
import { decryptBytes, encryptBytes, importFamilyKey } from './familyCrypto'
import { isImageSizeSafe } from './imageSize'

export type FamilyMediaKind = 'photo' | 'video' | 'document'

export interface FamilyMediaItem {
  id: string
  kind: FamilyMediaKind
  name: string
  type: string
  size: number
  chunks: number
  /** Qui l'a déposé (prénom et lien saisis au début du formulaire). */
  by: string
  addedAt: number
}

export interface FamilyText {
  id: string
  title: string
  body: string
  by: string
  addedAt: number
}

const CHUNK_BYTES = 20 * 1024 * 1024
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
const MAX_PHOTO_SOURCE_BYTES = 60 * 1024 * 1024
/** Photos réduites dans le téléphone : nettes à l'écran, rapides à envoyer. */
const PHOTO_LONG_SIDE = 2560
const MAX_ITEMS = 400

const DOCUMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  txt: 'text/plain',
  rtf: 'application/rtf',
}
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_TYPES)
  .map((e) => `.${e}`)
  .concat(Object.values(DOCUMENT_TYPES))
  .join(',')

export class FamilyMediaError extends Error {}

const newId = () => {
  const b = crypto.getRandomValues(new Uint8Array(16))
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// --- Validation de ce qui revient du service ----------------------------------

const ID = /^[A-Za-z0-9_-]{22}$/
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)

export function sanitizeMedia(raw: unknown): FamilyMediaItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === 'object')
    .filter((m) => typeof m.id === 'string' && ID.test(m.id) && ['photo', 'video', 'document'].includes(m.kind as string))
    .slice(0, MAX_ITEMS)
    .map((m) => ({
      id: m.id as string,
      kind: m.kind as FamilyMediaKind,
      name: str(m.name, 200) || 'Sans nom',
      type: /^[a-z]+\/[a-z0-9.+-]{1,80}$/i.test(str(m.type, 100)) ? str(m.type, 100) : 'application/octet-stream',
      size: num(m.size),
      chunks: Math.min(15, Math.max(1, Math.floor(num(m.chunks)))),
      by: str(m.by, 80),
      addedAt: num(m.addedAt),
    }))
}

export function sanitizeTexts(raw: unknown): FamilyText[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t): t is Record<string, unknown> => Boolean(t) && typeof t === 'object')
    .filter((t) => typeof t.id === 'string' && ID.test(t.id) && typeof t.body === 'string' && t.body.trim() !== '')
    .slice(0, 100)
    .map((t) => ({
      id: t.id as string,
      title: str(t.title, 200),
      body: str(t.body, 20_000),
      by: str(t.by, 80),
      addedAt: num(t.addedAt),
    }))
}

export function newFamilyText(title: string, body: string, by: string): FamilyText {
  return { id: newId(), title: title.trim().slice(0, 200), body: body.trim().slice(0, 20_000), by, addedAt: Date.now() }
}

// --- Préparation dans le téléphone --------------------------------------------

/** Photo réduite à 2560 px (orientation de l'appareil respectée), en JPEG. */
async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, PHOTO_LONG_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    canvas.width = canvas.height = 0
    if (!blob) throw new Error('encode')
    return blob
  } finally {
    bitmap.close()
  }
}

export interface PreparedFile {
  kind: FamilyMediaKind
  blob: Blob
  name: string
  type: string
}

/** Vérifie et prépare un fichier choisi par la famille ; message clair s'il est refusé. */
export async function prepareFile(file: File, wanted: FamilyMediaKind): Promise<PreparedFile> {
  const name = file.name.slice(0, 200)
  if (wanted === 'photo') {
    if (!file.type.startsWith('image/') || file.type.includes('svg')) throw new FamilyMediaError(`« ${name} » n'est pas une photo.`)
    if (file.size > MAX_PHOTO_SOURCE_BYTES || !(await isImageSizeSafe(file))) {
      throw new FamilyMediaError(`« ${name} » est trop volumineuse.`)
    }
    try {
      return { kind: 'photo', blob: await shrinkPhoto(file), name: name.replace(/\.[^.]+$/, '') + '.jpg', type: 'image/jpeg' }
    } catch {
      // Format que ce téléphone ne sait pas ouvrir (HEIC…) : envoyé tel quel, comme document.
      return { kind: 'document', blob: file, name, type: file.type || 'application/octet-stream' }
    }
  }
  if (wanted === 'video') {
    if (!file.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(name)) {
      throw new FamilyMediaError(`« ${name} » n'est pas une vidéo.`)
    }
    if (file.size > MAX_VIDEO_BYTES) {
      throw new FamilyMediaError(`« ${name} » dépasse 300 Mo : transmettez-la à l'agence autrement (clé USB, lien de téléchargement).`)
    }
    return { kind: 'video', blob: file, name, type: file.type || 'video/mp4' }
  }
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (!DOCUMENT_TYPES[ext]) throw new FamilyMediaError(`« ${name} » : formats acceptés PDF, Word, OpenDocument, RTF ou texte.`)
  if (file.size > MAX_DOCUMENT_BYTES) throw new FamilyMediaError(`« ${name} » dépasse 20 Mo.`)
  return { kind: 'document', blob: file, name, type: DOCUMENT_TYPES[ext] }
}

// --- Envoi et récupération ----------------------------------------------------

function mediaUrl(endpoint: string, linkId: string, fileId: string, chunk?: number) {
  if (!isSafeEndpoint(endpoint) || !ID.test(linkId) || !ID.test(fileId)) throw new FamilyMediaError('Lien invalide.')
  return `${endpoint.replace(/\/+$/, '')}/family/${linkId}/media/${fileId}${chunk === undefined ? '' : `/${chunk}`}`
}

async function check(response: Response) {
  if (response.ok) return
  const body = (await response.json().catch(() => ({}))) as { error?: unknown }
  throw new FamilyMediaError(typeof body.error === 'string' ? body.error : `Erreur du service (${response.status}).`)
}

/** Chiffre et envoie un fichier, morceau par morceau. */
export async function uploadFile(
  endpoint: string,
  linkId: string,
  key: string,
  prepared: PreparedFile,
  by: string,
  onProgress?: (fraction: number) => void,
): Promise<FamilyMediaItem> {
  if (!navigator.onLine) throw new FamilyMediaError('Pas de connexion internet.')
  const cryptoKey = await importFamilyKey(key)
  const id = newId()
  const chunks = Math.max(1, Math.ceil(prepared.blob.size / CHUNK_BYTES))
  for (let n = 0; n < chunks; n++) {
    const part = await prepared.blob.slice(n * CHUNK_BYTES, (n + 1) * CHUNK_BYTES).arrayBuffer()
    const body = await encryptBytes(cryptoKey, part)
    let response: Response
    try {
      response = await fetch(mediaUrl(endpoint, linkId, id, n), { method: 'PUT', body })
    } catch {
      throw new FamilyMediaError("L'envoi a été interrompu : vérifiez la connexion et réessayez.")
    }
    await check(response)
    onProgress?.((n + 1) / chunks)
  }
  return { id, kind: prepared.kind, name: prepared.name, type: prepared.type, size: prepared.blob.size, chunks, by, addedAt: Date.now() }
}

/** Récupère et déchiffre un fichier déposé par la famille. */
export async function downloadFile(endpoint: string, linkId: string, key: string, item: FamilyMediaItem): Promise<Blob> {
  const cryptoKey = await importFamilyKey(key)
  const parts: ArrayBuffer[] = []
  for (let n = 0; n < item.chunks; n++) {
    const response = await fetch(mediaUrl(endpoint, linkId, item.id, n))
    await check(response)
    parts.push(await decryptBytes(cryptoKey, new Uint8Array(await response.arrayBuffer())))
  }
  return new Blob(parts, { type: item.type })
}

export async function deleteFile(endpoint: string, linkId: string, fileId: string): Promise<void> {
  await check(await fetch(mediaUrl(endpoint, linkId, fileId), { method: 'DELETE' }))
}

export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} Mo`
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`
}
