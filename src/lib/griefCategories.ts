/** Catégorisation par situation de deuil, partagée par les bibliothèques de poèmes et de citations. */
export type GriefCategory =
  | 'deuil-general'
  | 'mort-jeune'
  | 'deuil-perinatal'
  | 'mort-accidentelle-brutale'
  | 'apres-suicide'
  | 'vieillesse-paix'
  | 'amour-separation'
  | 'classiques'

export const griefCategoryLabels: Record<GriefCategory, string> = {
  'deuil-general': 'Deuil / hommage général',
  'mort-jeune': "Mort d'un enfant ou d'une personne jeune",
  'deuil-perinatal': 'Deuil périnatal / enfant mort-né',
  'mort-accidentelle-brutale': 'Mort brutale ou accidentelle',
  'apres-suicide': 'Après un suicide (délicatesse requise)',
  'vieillesse-paix': 'Grand âge / mort paisible',
  'amour-separation': "Séparation, perte d'un être aimé",
  classiques: 'Grands classiques',
}

export const griefCategoryOrder: GriefCategory[] = [
  'deuil-general',
  'mort-jeune',
  'deuil-perinatal',
  'mort-accidentelle-brutale',
  'apres-suicide',
  'vieillesse-paix',
  'amour-separation',
  'classiques',
]
