/**
 * Informations sur l'éditeur de Céréo, reprises dans les mentions légales, la politique de
 * confidentialité, les conditions générales et le contrat de sous-traitance.
 *
 * À COMPLÉTER une fois la société créée : tant qu'un champ commence par « [ », il
 * s'affiche tel quel, entre crochets, pour qu'on le repère.
 * Passer `draft` à false seulement après relecture des textes par un juriste.
 */
export const editor = {
  draft: true,
  /** Nom commercial du logiciel. */
  product: 'Céréo',
  companyName: '[Raison sociale]',
  legalForm: '[Forme juridique et capital, ex. SAS au capital de 1 000 €]',
  address: '[Adresse du siège]',
  registration: '[RCS ou RM, ville et numéro]',
  siret: '[SIRET]',
  vat: '[N° de TVA intracommunautaire]',
  publisher: '[Nom du directeur de la publication]',
  /** Adresse de contact : demandes d'essai, support, exercice des droits RGPD. */
  email: '',
  phone: '[Téléphone]',
  /** Date de la dernière mise à jour des textes juridiques. */
  updatedAt: '17 novembre 2026',
} as const

/** Un champ encore à compléter. */
export function isPlaceholder(value: string): boolean {
  return !value || value.startsWith('[')
}

export function contactEmail(): string | null {
  return isPlaceholder(editor.email) ? null : editor.email
}
