// Utilitaires cryptographiques partagés entre l'application (navigateur) et
// le script vendeur scripts/generate-license-key.mjs (Node) : les deux
// environnements exposent la même Web Crypto API (`crypto.subtle`,
// `crypto.getRandomValues`, `btoa`/`atob`), donc ce module fonctionne à
// l'identique des deux côtés sans branchement particulier.

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlToBytes(b64url: string): Uint8Array {
  const b64 = b64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(b64url.length / 4) * 4, '=')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return bytes
}

const PBKDF2_ITERATIONS = 100_000

/**
 * Dérive un hash de mot de passe (PBKDF2-SHA256) avec un sel aléatoire, ou le
 * sel fourni pour re-vérifier un mot de passe existant. Rien n'est stocké en
 * clair, même si la vérification reste locale (pas de serveur).
 */
export async function hashPassword(
  password: string,
  saltHex?: string,
): Promise<{ saltHex: string; hashHex: string }> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return { saltHex: bytesToHex(salt), hashHex: bytesToHex(new Uint8Array(bits)) }
}

export async function verifyPassword(password: string, saltHex: string, hashHex: string): Promise<boolean> {
  const { hashHex: computed } = await hashPassword(password, saltHex)
  return computed === hashHex
}
