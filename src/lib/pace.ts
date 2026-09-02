import type { CeremonySegment } from '../types'

export type PaceTone = 'ontime' | 'behind' | 'ahead'

export interface PaceStatus {
  tone: PaceTone
  minutes: number
}

const TOLERANCE_SEC = 30

/**
 * Compare le temps écoulé à la fenêtre [début, fin] attendue pour l'étape en
 * cours (cumul des durées estimées des étapes précédentes / y compris
 * celle-ci). Ne signale un retard qu'une fois le budget de l'étape en cours
 * dépassé, et une avance que si on est encore avant le début attendu de
 * l'étape — pour ne pas hurler "retard" dès la première seconde de chaque étape.
 */
export function computePace(
  segments: CeremonySegment[],
  segmentIndex: number,
  elapsedSec: number,
): PaceStatus | null {
  if (segments.length === 0 || !segments[segmentIndex]) return null

  let floor = 0
  for (let i = 0; i < segmentIndex; i++) floor += segments[i].estimatedDuration * 60
  const ceiling = floor + segments[segmentIndex].estimatedDuration * 60

  if (elapsedSec > ceiling + TOLERANCE_SEC) {
    return { tone: 'behind', minutes: Math.max(1, Math.round((elapsedSec - ceiling) / 60)) }
  }
  if (elapsedSec < floor - TOLERANCE_SEC) {
    return { tone: 'ahead', minutes: Math.max(1, Math.round((floor - elapsedSec) / 60)) }
  }
  return { tone: 'ontime', minutes: 0 }
}

export function paceLabel(pace: PaceStatus): string {
  if (pace.tone === 'behind') return `${pace.minutes} min de retard`
  if (pace.tone === 'ahead') return `${pace.minutes} min d'avance`
  return 'À l’heure'
}
