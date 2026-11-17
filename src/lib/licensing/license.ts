import { PUBLIC_KEY_JWK } from './publicKey'
import { base64UrlToBytes } from './crypto'
import type { LicensePayload } from './types'

const PREFIX = 'CEREO-'

let cachedKey: CryptoKey | null = null

async function getPublicKey(): Promise<CryptoKey | null> {
  if (!PUBLIC_KEY_JWK) return null
  if (!cachedKey) {
    cachedKey = await crypto.subtle.importKey(
      'jwk',
      PUBLIC_KEY_JWK,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    )
  }
  return cachedKey
}

/**
 * Vérifie une clé d'activation : décode le payload et sa signature ECDSA, et
 * s'assure qu'elle a bien été produite par le détenteur de la clé privée
 * (scripts/generate-license-key.mjs, gardé hors du dépôt). Une clé bricolée
 * à la main dans le code ou dans les données locales échoue toujours ici.
 */
export async function verifyLicenseKey(rawKey: string): Promise<LicensePayload | null> {
  const publicKey = await getPublicKey()
  if (!publicKey) return null
  try {
    // « CEREMA- » : préfixe des premières clés, avant le renommage en Céréo (même signature).
    const key = rawKey.trim().replace(/^CEREMA-/, '').replace(new RegExp(`^${PREFIX}`), '')
    const [payloadB64, sigB64] = key.split('.')
    if (!payloadB64 || !sigB64) return null
    const payloadBytes = base64UrlToBytes(payloadB64)
    const sigBytes = base64UrlToBytes(sigB64)
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      sigBytes as BufferSource,
      payloadBytes as BufferSource,
    )
    if (!valid) return null
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as LicensePayload
    if (typeof payload.customer !== 'string' || typeof payload.seats !== 'number') return null
    if (payload.expiresAt !== undefined && typeof payload.expiresAt !== 'number') return null
    return payload
  } catch {
    return null
  }
}

/** L'abonnement inscrit dans la clé est terminé. */
export function isLicenseExpired(p: { expiresAt?: number }, now = Date.now()): boolean {
  return typeof p.expiresAt === 'number' && p.expiresAt < now
}
