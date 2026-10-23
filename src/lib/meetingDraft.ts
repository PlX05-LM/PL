import type { Ceremony, CeremonySegment } from '../types'
import { createEmptyBiography } from '../types'
import { newId } from './ids'
import { composeBiographyDraft, hasAnyBiographyContent } from './biographyComposer'
import { answer, answerList } from './meetingGuide'

/**
 * Premier déroulé construit à partir de la rencontre avec la famille : le maître de
 * cérémonie arrive en conception avec une trame déjà posée (musiques choisies, prises de
 * parole, gestes, ébauche de l'hommage), qu'il n'a plus qu'à affiner.
 */
export function buildDraftSegments(c: Ceremony): CeremonySegment[] {
  const seg = (title: string, estimatedDuration: number, extra: Partial<CeremonySegment> = {}): CeremonySegment => ({
    id: newId(),
    title,
    script: '',
    estimatedDuration,
    ...extra,
  })
  const music = (label: string, id: string) => {
    const title = answer(c, id)
    return title ? `${label} prévue : ${title}` : `${label} à choisir avec la famille.`
  }

  const name = c.deceasedName.trim()
  const bio = c.biography ?? createEmptyBiography()
  const segments: CeremonySegment[] = [
    seg("Entrée des proches", 3, { notes: music("Musique d'entrée", 'musicEntry') }),
    seg("Mot d'accueil", 2),
    seg(name ? `Hommage à ${name}` : 'Hommage', 8, {
      script: hasAnyBiographyContent(bio) ? composeBiographyDraft(c.deceasedName, bio) : '',
      notes: answer(c, 'sensitive') ? `À aborder avec délicatesse : ${answer(c, 'sensitive')}` : undefined,
    }),
  ]

  if (answer(c, 'slideshow') !== 'non') {
    segments.push(
      seg('Une vie en images', 4, {
        screen: answer(c, 'slideshow') === 'une' ? 'fixe' : 'diaporama',
      }),
    )
  }

  for (const line of answer(c, 'speakers').split('\n')) {
    const speaker = line.trim()
    if (speaker) segments.push(seg(`Prise de parole — ${speaker.split(/\s+[—–-]\s+/)[0]}`, 3, { notes: speaker }))
  }

  if (answer(c, 'readings')) segments.push(seg('Lecture', 3, { notes: answer(c, 'readings') }))

  segments.push(seg('Recueillement', 4, { notes: music('Musique de recueillement', 'musicMeditation') }))

  const gestures = answerList(c, 'gestures')
  if (gestures.length > 0) {
    segments.push(
      seg(gestures.length === 1 ? gestures[0] : 'Gestes symboliques', 6, {
        notes: [gestures.join(', '), answer(c, 'gesturesDetail')].filter(Boolean).join('\n'),
      }),
    )
  }

  segments.push(seg('Mot de fin et remerciements', 2))
  segments.push(seg('Sortie', 3, { notes: music('Musique de sortie', 'musicExit') }))
  return segments
}
