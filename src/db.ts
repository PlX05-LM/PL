import Dexie, { type Table } from 'dexie'
import type { Ceremony, Photo, Track } from './types'

class CeremoniaDB extends Dexie {
  ceremonies!: Table<Ceremony, string>
  tracks!: Table<Track, string>
  photos!: Table<Photo, string>

  constructor() {
    super('ceremonia')
    this.version(1).stores({
      ceremonies: 'id, title, date, updatedAt',
      tracks: 'id, name, createdAt',
      photos: 'id, name, createdAt',
    })
  }
}

export const db = new CeremoniaDB()

export function objectUrlFor(blob: Blob): string {
  return URL.createObjectURL(blob)
}
