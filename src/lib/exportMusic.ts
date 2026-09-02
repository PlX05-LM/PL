import JSZip from 'jszip'
import type { Ceremony, Track } from '../types'
import { extensionForTrack } from './audioExt'
import { collectCeremonyTracks } from './ceremonyTracks'
import { toSafeFilename } from './filename'

function safeZipEntryName(name: string) {
  // Accents are fine inside zip entries (unlike the outer download filename);
  // only forbidden filesystem characters need stripping here.
  return name.replace(/[\\/:*?"<>|]/g, '').trim() || 'musique'
}

export async function exportCeremonyMusicZip(ceremony: Ceremony, tracks: Track[]) {
  const ordered = collectCeremonyTracks(ceremony, tracks)
  if (ordered.length === 0) return false

  const zip = new JSZip()
  ordered.forEach((track, i) => {
    const originalName = (track.blob as File).name
    const ext = extensionForTrack(track.mimeType, originalName)
    const prefix = String(i + 1).padStart(2, '0')
    zip.file(`${prefix} - ${safeZipEntryName(track.name)}.${ext}`, track.blob)
  })

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeTitle = toSafeFilename(ceremony.title) || 'ceremonie'
  a.download = `Musiques - ${safeTitle} - ${ceremony.date}.zip`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return true
}
