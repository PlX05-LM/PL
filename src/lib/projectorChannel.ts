import type { SlideshowConfig } from '../types'

export interface ProjectorPhoto {
  id: string
  blob: Blob
}

export type PhotoDisplayMode = 'diaporama' | 'fixe'

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

export function channelNameFor(ceremonyId: string) {
  return `projector-${ceremonyId}`
}
