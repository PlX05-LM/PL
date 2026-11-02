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
