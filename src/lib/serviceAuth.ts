import { loadAppSettings, type AppSettings } from './appSettings'

/**
 * Accès au service en ligne de Céréo (IA, lien famille). Par défaut, c'est la licence de
 * l'agence qui ouvre l'accès : le service vérifie sa signature, compte les rédactions de
 * cette licence et peut la suspendre. Rien à configurer sur le poste. Le jeton
 * d'application des Paramètres avancés reste possible pour un service personnel.
 */
let licenceToken: string | null = null

export function setServiceLicence(token: string | null) {
  licenceToken = token
}

/** Adresse du service : celle des Paramètres avancés, sinon celle de la version publiée. */
export function serviceEndpoint(settings: AppSettings = loadAppSettings()): string {
  const custom = settings.aiEndpointUrl.trim()
  const builtIn = (import.meta.env.VITE_SERVICE_URL ?? '').trim()
  return (custom || builtIn).replace(/\/+$/, '')
}

/** En-têtes d'accès, ou null si ce poste n'a aucun moyen de s'identifier. */
export function serviceHeaders(settings: AppSettings = loadAppSettings()): Record<string, string> | null {
  const token = settings.aiAppToken.trim()
  if (token) return { 'X-App-Token': token }
  if (licenceToken) return { 'X-Licence': licenceToken }
  return null
}

export function isServiceConfigured(settings: AppSettings = loadAppSettings()): boolean {
  return Boolean(serviceEndpoint(settings) && serviceHeaders(settings))
}

/** Le service est fourni avec la licence (aucun réglage manuel en cours). */
export function usesBuiltInService(settings: AppSettings = loadAppSettings()): boolean {
  return !settings.aiEndpointUrl.trim() && !settings.aiAppToken.trim() && Boolean(import.meta.env.VITE_SERVICE_URL)
}
