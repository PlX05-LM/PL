import type { Ceremony } from '../types'

/** Les trois modules de Céréo, dans l'ordre où un dossier les traverse. */
export type DossierStage = 1 | 2 | 3

export const stageLabels: Record<DossierStage, string> = {
  1: 'Rencontre',
  2: 'Conception',
  3: 'Régie',
}

/**
 * Étape où en est un dossier. Une cérémonie créée avant les modules (déroulé déjà
 * commencé, sans rencontre) est considérée en conception.
 */
export function dossierStage(c: Ceremony): DossierStage {
  if (c.readyForLiveAt) return 3
  if (c.meeting?.completedAt || c.segments.length > 0) return 2
  return 1
}

/** Écran à ouvrir pour reprendre un dossier là où il en est. */
export function stagePath(c: Ceremony, stage: DossierStage = dossierStage(c)): string {
  if (stage === 1) return `/ceremonies/${c.id}/rencontre`
  if (stage === 2) return `/ceremonies/${c.id}`
  return `/ceremonies/${c.id}/live`
}

/** Date et heure de la cérémonie en millisecondes (NaN si la date est invalide). */
export function ceremonyTimestamp(c: Ceremony): number {
  return new Date(`${c.date}T${c.time || '00:00'}`).getTime()
}

export function isToday(c: Ceremony): boolean {
  return c.date === new Date().toLocaleDateString('sv-SE')
}
