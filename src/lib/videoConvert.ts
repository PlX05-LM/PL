import { probeVideo, type VideoProbe } from './videoImport'
import type { ConvertMessage, ConvertRequest } from './videoConvert.worker'

export type ConvertStage = 'loading' | 'remux' | 'transcode'

export interface ConvertProgress {
  stage: ConvertStage
  /** 0 → 1, ou undefined quand l'avancement n'est pas mesurable. */
  progress?: number
}

export class VideoConvertError extends Error {
  reason: 'offline' | 'failed'
  log: string
  constructor(reason: 'offline' | 'failed', log = '') {
    super(reason)
    this.reason = reason
    this.log = log
  }
}

let worker: Worker | null = null
let nextId = 1

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./videoConvert.worker.ts', import.meta.url), { type: 'module' })
  }
  return worker
}

function runFFmpeg(
  file: File,
  args: string[],
  onMessage: (msg: ConvertMessage) => void,
): Promise<Uint8Array> {
  const w = getWorker()
  const id = nextId++
  return new Promise((resolve, reject) => {
    const listener = (e: MessageEvent<ConvertMessage>) => {
      const msg = e.data
      if (msg.id !== id) return
      if (msg.type === 'done') {
        w.removeEventListener('message', listener)
        resolve(msg.data)
      } else if (msg.type === 'error') {
        w.removeEventListener('message', listener)
        reject(new VideoConvertError(msg.message === 'load' ? 'offline' : 'failed', msg.log))
      } else {
        onMessage(msg)
      }
    }
    w.addEventListener('message', listener)
    w.postMessage({ id, file, args } satisfies ConvertRequest)
  })
}

/** Rewrap rapide : la vidéo est recopiée telle quelle, seul le son est réencodé en AAC. */
const REMUX_ARGS = [
  '-i', '{input}',
  '-map', '0:v:0', '-map', '0:a:0?',
  '-sn', '-dn',
  '-c:v', 'copy',
  '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
  '-movflags', '+faststart',
  '{output}',
]

/** Conversion complète en H.264/AAC, le format lu partout (PC, Mac, iPad, Android). */
const TRANSCODE_ARGS = [
  '-i', '{input}',
  '-map', '0:v:0', '-map', '0:a:0?',
  '-sn', '-dn',
  '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22',
  '-pix_fmt', 'yuv420p',
  '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
  '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
  '-movflags', '+faststart',
  '{output}',
]

/**
 * Convertit une vidéo que le navigateur ne sait pas lire (MKV, AVI, HEVC…) en MP4 lisible.
 * Tente d'abord un simple changement de conteneur (quelques secondes), puis une conversion
 * complète si la vidéo elle-même est dans un codec non pris en charge.
 */
export async function convertToPlayableMp4(
  file: File,
  onProgress: (p: ConvertProgress) => void,
): Promise<{ file: File; probe: VideoProbe }> {
  const outName = file.name.replace(/\.[^/.]+$/, '') + '.mp4'
  let stage: ConvertStage = 'remux'
  const forward = (msg: ConvertMessage) => {
    if (msg.type === 'loading') onProgress({ stage: 'loading' })
    else if (msg.type === 'progress') onProgress({ stage, progress: msg.progress })
  }

  onProgress({ stage: 'loading' })
  try {
    const data = await runFFmpeg(file, REMUX_ARGS, forward)
    const out = new File([data as BlobPart], outName, { type: 'video/mp4' })
    const probe = await probeVideo(out)
    return { file: out, probe }
  } catch (e) {
    if (e instanceof VideoConvertError && e.reason === 'offline') throw e
    // Codec vidéo non lisible ici (HEVC, MPEG-2…) : on passe à la conversion complète.
  }

  stage = 'transcode'
  onProgress({ stage, progress: 0 })
  const data = await runFFmpeg(file, TRANSCODE_ARGS, forward)
  const out = new File([data as BlobPart], outName, { type: 'video/mp4' })
  try {
    const probe = await probeVideo(out)
    return { file: out, probe }
  } catch {
    throw new VideoConvertError('failed')
  }
}
