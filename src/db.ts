import Dexie, { type Table } from 'dexie'
import type { Ceremony, Photo, Track } from './types'
import type { AccountRecord, LicenseRecord } from './lib/licensing/types'

class CeremoniaDB extends Dexie {
  ceremonies!: Table<Ceremony, string>
  tracks!: Table<Track, string>
  photos!: Table<Photo, string>
  license!: Table<LicenseRecord, string>
  accounts!: Table<AccountRecord, string>

  constructor() {
    super('ceremonia')
    this.version(1).stores({
      ceremonies: 'id, title, date, updatedAt',
      tracks: 'id, name, createdAt',
      photos: 'id, name, createdAt',
    })
    this.version(2).stores({
      license: 'id',
      accounts: 'id, username',
    })
    this.version(3).stores({
      tracks: 'id, name, createdAt, ceremonyId',
      photos: 'id, name, createdAt, ceremonyId',
    })
  }
}

export const db = new CeremoniaDB()

export function objectUrlFor(blob: Blob): string {
  return URL.createObjectURL(blob)
}
