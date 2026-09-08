import type { Biography, CeremonyType } from '../types'
import { loadAppSettings } from './appSettings'

export type AiErrorCause = 'not-configured' | 'offline' | 'network' | 'server'

export class AiGenerationError extends Error {
  cause2: AiErrorCause
  constructor(message: string, cause: AiErrorCause) {
    super(message)
    this.name = 'AiGenerationError'
    this.cause2 = cause
  }
}

export function isAiConfigured(settings = loadAppSettings()): boolean {
  return Boolean(settings.aiEndpointUrl.trim() && settings.aiAppToken.trim())
}

async function callWorker(path: string, body: unknown): Promise<string> {
  const settings = loadAppSettings()
  if (!isAiConfigured(settings)) {
    throw new AiGenerationError(
      "La génération par IA n'est pas configurée. Renseignez l'adresse du service et le jeton d'application dans Paramètres.",
      'not-configured',
    )
  }
  if (!navigator.onLine) {
    throw new AiGenerationError(
      'Pas de connexion internet — la génération par IA en a besoin. Le générateur local (sans IA) reste disponible.',
      'offline',
    )
  }

  const endpoint = settings.aiEndpointUrl.trim().replace(/\/+$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25000)

  let response: Response
  try {
    response = await fetch(`${endpoint}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-App-Token': settings.aiAppToken.trim() },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    throw new AiGenerationError(
      "Impossible de joindre le service de génération IA — vérifiez la connexion internet et l'adresse configurée.",
      'network',
    )
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    let message = `Le service de génération IA a renvoyé une erreur (${response.status}).`
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      // corps de réponse non-JSON : on garde le message générique.
    }
    throw new AiGenerationError(message, 'server')
  }

  const data = (await response.json()) as { text?: string }
  if (!data.text?.trim()) {
    throw new AiGenerationError('Le service de génération IA a renvoyé une réponse vide.', 'server')
  }
  return data.text.trim()
}

export async function generateBiographyDraftAI(deceasedName: string, bio: Biography): Promise<string> {
  return callWorker('/generate-biography', { deceasedName, bio })
}

export async function generateSegmentTextAI(params: {
  ceremonyType: CeremonyType
  deceasedName?: string
  segmentTitle: string
  instructions: string
}): Promise<string> {
  return callWorker('/generate-segment', params)
}
