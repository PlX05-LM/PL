export interface LicensePayload {
  customer: string
  seats: number
  issuedAt: number
  id: string
}

export interface LicenseRecord {
  id: 'current'
  token: string
  customer: string
  seats: number
  activatedAt: number
}

export interface AccountRecord {
  id: string
  username: string
  passwordSaltHex: string
  passwordHashHex: string
  createdAt: number
}
