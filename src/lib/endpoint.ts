/**
 * Adresse du service autorisée : HTTPS uniquement (HTTP seulement en local, pour le
 * développement). Empêche un lien trafiqué d'envoyer les réponses d'une famille à un
 * serveur en clair ou à une adresse farfelue.
 */
/**
 * Services autorisés, fixés à la publication (VITE_SERVICE_ORIGINS, adresses séparées par
 * des virgules). La version publiée n'accepte que le service de l'éditeur : un lien piégé
 * pointant vers un autre serveur, même en HTTPS, est refusé. Sans cette liste
 * (développement), toute adresse HTTPS est acceptée.
 */
const allowedOrigins = (import.meta.env.VITE_SERVICE_ORIGINS ?? '')
  .split(',')
  .map((o: string) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)

export function isSafeEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.username || url.password || url.search || url.hash) return false
    if (allowedOrigins.length > 0) return allowedOrigins.includes(url.origin)
    if (url.protocol === 'https:') return true
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  } catch {
    return false
  }
}
