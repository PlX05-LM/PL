export interface VideoProbe {
  duration?: number
  width?: number
  height?: number
}

/**
 * Vérifie que ce navigateur sait lire la vidéo (format et codec) avant de l'enregistrer,
 * et relève sa durée et ses dimensions. Rejette si la vidéo est illisible ici : mieux vaut
 * le savoir pendant la préparation qu'en pleine cérémonie.
 */
export function probeVideo(file: Blob): Promise<VideoProbe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    let settled = false
    const done = (fn: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
      fn()
    }
    video.onloadedmetadata = () =>
      done(() =>
        resolve({
          duration: Number.isFinite(video.duration) ? video.duration : undefined,
          width: video.videoWidth || undefined,
          height: video.videoHeight || undefined,
        }),
      )
    video.onerror = () => done(() => reject(new Error('unsupported')))
    const timer = setTimeout(() => done(() => reject(new Error('timeout'))), 20000)
    video.src = url
  })
}

const extensionByMime: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-m4v': 'm4v',
  'video/ogg': 'ogv',
  'video/x-matroska': 'mkv',
}

/** Formats souvent absents de `video/*` (macOS, iPad) : listés explicitement pour le sélecteur. */
export const VIDEO_ACCEPT =
  'video/*,.mp4,.mov,.m4v,.webm,.mkv,.avi,.wmv,.flv,.mts,.m2ts,.ts,.3gp,.mpg,.mpeg,.ogv'

const mimeByExtension: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  ogv: 'video/ogg',
}

/** Type MIME fiable même quand le système n'en fournit pas (cas fréquent des .mkv). */
export function mimeTypeForVideo(file: File): string {
  if (file.type) return file.type
  const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? ''
  return mimeByExtension[ext] ?? 'video/mp4'
}

export function extensionForVideo(mimeType: string, originalName?: string): string {
  const fromOriginal = originalName?.match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromOriginal) return fromOriginal.toLowerCase()
  return extensionByMime[mimeType] ?? 'mp4'
}

/** Ex. « 1920×1080 · 16:9 » ou « Portrait 1080×1920 ». */
export function describeVideoFormat(width?: number, height?: number): string {
  if (!width || !height) return ''
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const g = gcd(width, height)
  const ratio = `${width / g}:${height / g}`
  const known = ['16:9', '4:3', '1:1', '9:16', '3:4', '21:9']
  const label = known.includes(ratio) ? ` · ${ratio}` : ''
  return height > width ? `Portrait ${width}×${height}` : `${width}×${height}${label}`
}
