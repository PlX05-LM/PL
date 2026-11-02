/**
 * Adresse du service autorisée : HTTPS uniquement (HTTP seulement en local, pour le
 * développement). Empêche un lien trafiqué d'envoyer les réponses d'une famille à un
 * serveur en clair ou à une adresse farfelue.
 */
export function isSafeEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.username || url.password || url.search || url.hash) return false
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}
