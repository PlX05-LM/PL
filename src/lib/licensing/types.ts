export interface LicensePayload {
  customer: string
  seats: number
  issuedAt: number
  id: string
  /** Fin de l'abonnement (ms) ; absent = licence sans date de fin. */
  expiresAt?: number
}

export interface LicenseRecord {
  id: 'current'
  token: string
  customer: string
  seats: number
  activatedAt: number
  /** Fin de l'abonnement, lue dans la clé signée. */
  expiresAt?: number
}

export interface AccountRecord {
  id: string
  username: string
  passwordSaltHex: string
  passwordHashHex: string
  /** Itérations PBKDF2 du hash ; absent = ancien réglage (100 000). */
  passwordIterations?: number
  createdAt: number
}
