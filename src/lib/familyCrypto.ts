/**
 * Chiffrement du lien famille (AES-GCM 256). La clé ne voyage que dans la partie « # »
 * du lien : le service ne reçoit jamais que des données illisibles.
 */

export function toB64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromB64url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function importFamilyKey(key: string) {
  return crypto.subtle.importKey('raw', fromB64url(key), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

/** Chiffre un contenu binaire : vecteur d'initialisation (12 octets) suivi du chiffré. */
export async function encryptBytes(key: CryptoKey, data: BufferSource): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data))
  const out = new Uint8Array(12 + cipher.byteLength)
  out.set(iv, 0)
  out.set(cipher, 12)
  return out
}

export async function decryptBytes(key: CryptoKey, data: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.subarray(0, 12) }, key, data.subarray(12))
}
