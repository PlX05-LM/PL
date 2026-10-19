import type { SlideshowConfig } from '../types'

export interface ProjectorPhoto {
  id: string
  blob: Blob
}

export interface ProjectorVideo {
  id: string
  blob: Blob
}

/** Ce que montre l'écran de projection : diaporama, photo fixe ou vidéo. */
export type PhotoDisplayMode = 'diaporama' | 'fixe' | 'video'

export type VideoCommand =
  | { cmd: 'play' }
  | { cmd: 'pause' }
  | { cmd: 'seek'; time: number }

export interface VideoStatus {
  videoId: string
  currentTime: number
  duration: number
  playing: boolean
  ended: boolean
  /** Le navigateur de l'écran de projection a refusé la lecture avec son. */
  blocked: boolean
}

export type ProjectorMessage =
  | {
      type: 'state'
      config: SlideshowConfig
      photos: ProjectorPhoto[]
      index: number
      playing: boolean
      mode: PhotoDisplayMode
      fixedPhoto: ProjectorPhoto | null
    }
  | { type: 'ready' }
  | { type: 'black'; on: boolean }
  /** Vidéo chargée sur l'écran de projection (envoyée seulement quand elle change). */
  | { type: 'video'; video: ProjectorVideo | null; withSound: boolean; volume: number }
  | ({ type: 'videoCmd' } & VideoCommand)
  | { type: 'videoVolume'; volume: number }
  | ({ type: 'videoStatus' } & VideoStatus)

export function channelNameFor(ceremonyId: string) {
  return `projector-${ceremonyId}`
}
