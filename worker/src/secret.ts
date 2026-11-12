/** Comparaison à temps constant : la durée de la vérification ne révèle rien du jeton attendu. */
export async function sameSecret(given: string | null, expected: string | undefined): Promise<boolean> {
  if (!given || !expected) return false
  const enc = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  return crypto.subtle.timingSafeEqual(a, b)
}

/**
 * Lit le corps d'une requête sans jamais dépasser `maxBytes` en mémoire : une requête
 * envoyée par morceaux, sans taille annoncée, est coupée dès que la limite est franchie
 * au lieu d'être lue en entier. Renvoie null si elle est trop grosse.
 */
export async function readTextCapped(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0')
  if (declared > maxBytes) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const all = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    all.set(c, offset)
    offset += c.byteLength
  }
  return new TextDecoder().decode(all)
}
