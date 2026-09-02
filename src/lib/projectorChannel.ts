import type { SlideshowConfig } from '../types'

export interface ProjectorPhoto {
  id: string
  blob: Blob
}

export type ProjectorMessage =
  | {
      type: 'state'
      config: SlideshowConfig
      photos: ProjectorPhoto[]
      index: number
      playing: boolean
    }
  | { type: 'ready' }
  | { type: 'black'; on: boolean }

export function channelNameFor(ceremonyId: string) {
  return `projector-${ceremonyId}`
}
