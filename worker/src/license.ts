/**
 * Accès au service par la licence de l'agence : chaque poste Céréo envoie sa clé
 * d'activation (signée par l'éditeur), le service vérifie la signature avec la clé
 * publique, sans aucun secret partagé à recopier. Chaque licence a son propre compteur
 * de rédactions, peut être coupée à distance (révocation) et cesse de fonctionner à la
 * date de fin d'abonnement inscrite dans la clé.
 *
 *   Couper une licence :  npx wrangler kv key put --binding RATE_LIMIT "lic-revoked:<id>" 1 --remote
 */

export interface LicenseEnv {
  RATE_LIMIT: KVNamespace
  /** Clé publique (JWK, JSON) ; par défaut celle de l'éditeur, ci-dessous. */
  LICENSE_PUBLIC_KEY?: string
  /** Rédactions par IA par mois et par poste de la licence. Optionnel, défaut 150. */
  LICENSE_MONTHLY_AI_LIMIT?: string
}

export interface LicenseInfo {
  id: string
  customer: string
  seats: number
  expiresAt?: number
}

/** Clé publique de l'éditeur : la même que dans l'application (src/lib/licensing/publicKey.ts). */
const DEFAULT_PUBLIC_KEY: JsonWebKey = {
  "key_ops": [
    "verify"
  ],
  "ext": true,
  "kty": "EC",
  "x": "PrLnxM7nGXRPs3WpC5AOD6fMH-JaMJ0NmEWMmTaF5RM",
  "y": "6rLyGTiz8--pXtbSoGYFfjuKrXbmGMWl85vHpEVGeBo",
  "crv": "P-256"
}

const MAX_TOKEN_LENGTH = 2000
let cached: { source: string; key: CryptoKey } | null = null

async function publicKey(env: LicenseEnv): Promise<CryptoKey> {
  const source = env.LICENSE_PUBLIC_KEY?.trim() || ''
  if (cached && cached.source === source) return cached.key
  const jwk = source ? (JSON.parse(source) as JsonWebKey) : DEFAULT_PUBLIC_KEY
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  cached = { source, key }
  return key
}

function fromB64url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Licence valide, non expirée et non coupée ; sinon null. */
export async function verifyLicense(raw: string | null, env: LicenseEnv): Promise<LicenseInfo | null> {
  if (!raw || raw.length > MAX_TOKEN_LENGTH) return null
  try {
    const token = raw.trim().replace(/^CERE(?:O|MA)-/, '')
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return null
    const payloadBytes = fromB64url(payloadB64)
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      await publicKey(env),
      fromB64url(sigB64) as BufferSource,
      payloadBytes as BufferSource,
    )
    if (!ok) return null
    const p = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<LicenseInfo>
    if (typeof p.id !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(p.id)) return null
    if (typeof p.customer !== 'string' || typeof p.seats !== 'number' || p.seats < 1) return null
    if (p.expiresAt !== undefined && (typeof p.expiresAt !== 'number' || p.expiresAt < Date.now())) return null
    if (await env.RATE_LIMIT.get(`lic-revoked:${p.id}`)) return null
    return { id: p.id, customer: p.customer, seats: Math.min(p.seats, 100), expiresAt: p.expiresAt }
  } catch {
    return null
  }
}

/** Décompte une rédaction sur le quota mensuel de la licence ; false si épuisé. */
export async function takeLicenseQuota(lic: LicenseInfo, env: LicenseEnv): Promise<boolean> {
  const perSeat = Number(env.LICENSE_MONTHLY_AI_LIMIT ?? '150')
  const limit = perSeat * lic.seats
  const key = `lic-ai:${lic.id}:${new Date().toISOString().slice(0, 7)}`
  const used = Number((await env.RATE_LIMIT.get(key)) ?? '0')
  if (used >= limit) return false
  await env.RATE_LIMIT.put(key, String(used + 1), { expirationTtl: 40 * 86_400 })
  return true
}

/** Rend une rédaction au quota quand l'IA a échoué : l'agence ne paie que ce qui a abouti. */
export async function refundLicenseQuota(lic: LicenseInfo, env: LicenseEnv): Promise<void> {
  const key = `lic-ai:${lic.id}:${new Date().toISOString().slice(0, 7)}`
  const used = Number((await env.RATE_LIMIT.get(key)) ?? '0')
  if (used > 0) await env.RATE_LIMIT.put(key, String(used - 1), { expirationTtl: 40 * 86_400 })
}
