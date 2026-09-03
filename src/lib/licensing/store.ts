import { db } from '../../db'
import { hashPassword, verifyPassword } from './crypto'
import type { AccountRecord, LicensePayload, LicenseRecord } from './types'

export async function getLicense(): Promise<LicenseRecord | undefined> {
  return db.license.get('current')
}

export async function activateLicense(token: string, payload: LicensePayload): Promise<LicenseRecord> {
  const record: LicenseRecord = {
    id: 'current',
    token,
    customer: payload.customer,
    seats: payload.seats,
    activatedAt: Date.now(),
  }
  await db.license.put(record)
  return record
}

export async function listAccounts(): Promise<AccountRecord[]> {
  return db.accounts.toArray()
}

export async function createAccount(username: string, password: string): Promise<AccountRecord> {
  const { saltHex, hashHex } = await hashPassword(password)
  const record: AccountRecord = {
    id: crypto.randomUUID(),
    username: username.trim(),
    passwordSaltHex: saltHex,
    passwordHashHex: hashHex,
    createdAt: Date.now(),
  }
  await db.accounts.put(record)
  return record
}

export async function verifyLogin(username: string, password: string): Promise<AccountRecord | null> {
  const accounts = await db.accounts.toArray()
  const account = accounts.find((a) => a.username.toLowerCase() === username.trim().toLowerCase())
  if (!account) return null
  const ok = await verifyPassword(password, account.passwordSaltHex, account.passwordHashHex)
  return ok ? account : null
}

// --- Session : quel identifiant est connecté sur cet appareil/navigateur ---
// Stockée en localStorage comme les autres préférences par appareil (sortie
// audio, clavier de la télécommande) : ce n'est pas une donnée de cérémonie,
// elle reste donc hors de la sauvegarde/export.
const SESSION_KEY = 'cerema-session-v1'

export interface Session {
  accountId: string
  username: string
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // stockage indisponible : la session ne tiendra que pour cet onglet.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // rien à faire si le stockage est indisponible.
  }
}
