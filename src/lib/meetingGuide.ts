import type { Biography, Ceremony, MeetingAnswers } from '../types'
import { createEmptyBiography } from '../types'

/**
 * Trame de la rencontre avec la famille (module 1) : dix rubriques, dans l'ordre d'un
 * entretien qui commence par le plus doux. Un champ qui existe déjà dans la fiche de la
 * cérémonie ou dans la biographie y est enregistré directement (`bind`) — la famille ne
 * répète rien, et l'ébauche d'éloge profite de tout ce qui a été dit.
 */

type CeremonyKey = 'deceasedName' | 'date' | 'time' | 'location' | 'familyContact' | 'officiant' | 'ceremonyType'
type BiographyKey =
  | 'gender'
  | 'birthDate'
  | 'birthPlace'
  | 'career'
  | 'volunteering'
  | 'passions'
  | 'symbolicObject'
  | 'proudestOf'
  | 'sayings'
  | 'lovedOnesView'

export type MeetingBinding = { to: 'ceremony'; key: CeremonyKey } | { to: 'biography'; key: BiographyKey }

interface BaseField {
  id: string
  label: string
  /** Conseil d'entretien affiché au maître de cérémonie. */
  tip?: string
  bind?: MeetingBinding
}

export type MeetingField =
  | (BaseField & { type: 'text' | 'area' | 'date' | 'time'; placeholder?: string })
  /** Un seul choix ; `options` = [valeur enregistrée, libellé]. */
  | (BaseField & { type: 'choice'; options: [string, string][] })
  /** Plusieurs choix possibles. */
  | (BaseField & { type: 'chips'; options: string[] })

export interface MeetingSection {
  id: string
  title: string
  subtitle: string
  fields: MeetingField[]
}

const yesNo: [string, string][] = [
  ['oui', 'Oui'],
  ['non', 'Non'],
]

export const meetingSections: MeetingSection[] = [
  {
    id: 'dossier',
    title: 'Le dossier',
    subtitle: 'Identité du défunt et informations pratiques de la cérémonie.',
    fields: [
      { id: 'deceasedName', type: 'text', label: 'Nom et prénom(s)', placeholder: 'Jeanne Martin', bind: { to: 'ceremony', key: 'deceasedName' } },
      {
        id: 'gender',
        type: 'choice',
        label: 'Le défunt est',
        options: [
          ['femme', 'Une femme'],
          ['homme', 'Un homme'],
          ['non-precise', 'Non précisé'],
        ],
        bind: { to: 'biography', key: 'gender' },
        tip: 'Sert aux accords grammaticaux de l’ébauche d’éloge.',
      },
      { id: 'nickname', type: 'text', label: "Surnom, nom d'usage", placeholder: '« Mamie Jeanne »' },
      { id: 'birthDate', type: 'text', label: 'Date de naissance', placeholder: '12 mars 1941', bind: { to: 'biography', key: 'birthDate' } },
      { id: 'birthPlace', type: 'text', label: 'Lieu de naissance', placeholder: 'Nantes', bind: { to: 'biography', key: 'birthPlace' } },
      { id: 'death', type: 'text', label: 'Date et lieu du décès', placeholder: '[date], [lieu]' },
      {
        id: 'ceremonyType',
        type: 'choice',
        label: "Type d'obsèques",
        options: [
          ['creation', 'Crémation'],
          ['inhumation', 'Inhumation'],
          ['obseques', 'Obsèques'],
          ['hommage', 'Hommage / recueillement'],
          ['autre', 'Autre'],
        ],
        bind: { to: 'ceremony', key: 'ceremonyType' },
      },
      { id: 'date', type: 'date', label: 'Date de la cérémonie', bind: { to: 'ceremony', key: 'date' } },
      { id: 'time', type: 'time', label: 'Heure', bind: { to: 'ceremony', key: 'time' } },
      { id: 'location', type: 'text', label: 'Lieu', placeholder: 'Crématorium, salle, cimetière…', bind: { to: 'ceremony', key: 'location' } },
      { id: 'familyContact', type: 'text', label: 'Référent de la famille', placeholder: 'Sophie, sa fille · téléphone · e-mail', bind: { to: 'ceremony', key: 'familyContact' } },
      { id: 'officiant', type: 'text', label: 'Maître de cérémonie', bind: { to: 'ceremony', key: 'officiant' } },
      { id: 'advisor', type: 'text', label: 'Conseiller funéraire en charge du dossier', placeholder: '[Prénom Nom]' },
    ],
  },
  {
    id: 'vie',
    title: 'Sa vie',
    subtitle: "Le parcours, de l'enfance aux dernières années.",
    fields: [
      {
        id: 'childhood',
        type: 'area',
        label: 'Origines et enfance',
        placeholder: 'Où a-t-il/elle grandi ? Dans quelle famille ? Un souvenir d’enfance ?',
        tip: "Commencez par l'enfance : c'est souvent la question la plus douce pour ouvrir l'entretien.",
      },
      { id: 'career', type: 'area', label: 'Métier et parcours professionnel', placeholder: 'Ses métiers, sa fierté, ses collègues…', bind: { to: 'biography', key: 'career' } },
      {
        id: 'family',
        type: 'area',
        label: 'Famille et entourage',
        placeholder: 'Conjoint, enfants, petits-enfants, frères et sœurs, amis proches…',
        tip: 'Faites épeler les prénoms : ils seront prononcés le jour J et une erreur blesse.',
      },
      { id: 'places', type: 'area', label: 'Lieux de vie importants', placeholder: 'Une maison, une région, un village de vacances…' },
      { id: 'volunteering', type: 'area', label: 'Engagements', placeholder: 'Associations, bénévolat, sport, vie de quartier…', bind: { to: 'biography', key: 'volunteering' } },
    ],
  },
  {
    id: 'portrait',
    title: 'Son portrait',
    subtitle: 'Le caractère, les passions, ce qui le/la rendait unique.',
    fields: [
      {
        id: 'threeWords',
        type: 'chips',
        label: 'Trois mots pour le/la décrire',
        options: ['Généreux·se', 'Discret·ète', 'Drôle', 'Courageux·se', 'Exigeant·e', 'Bon vivant', 'Curieux·se', 'Fidèle', 'Têtu·e', 'Doux·ce', 'Travailleur·se', 'Sensible'],
        tip: 'Faites choisir trois mots, puis demandez un exemple concret pour chacun : c’est la matière de votre hommage.',
      },
      { id: 'passions', type: 'area', label: 'Passions et loisirs', placeholder: 'Jardin, cuisine, voyages, lecture, musique…', bind: { to: 'biography', key: 'passions' } },
      { id: 'humor', type: 'area', label: 'Ce qui le/la faisait rire, ses expressions', placeholder: 'Ses mots à lui/elle, ses manies, son humour…' },
      { id: 'symbolicObject', type: 'text', label: 'Un objet qui le/la représente', placeholder: 'Son tablier, son appareil photo, sa bicyclette…', bind: { to: 'biography', key: 'symbolicObject' } },
      { id: 'proudestOf', type: 'text', label: 'Ce dont il/elle était fier(ère)', bind: { to: 'biography', key: 'proudestOf' } },
    ],
  },
  {
    id: 'souvenirs',
    title: 'Souvenirs',
    subtitle: "Les anecdotes et ce qu'il/elle laisse derrière lui/elle.",
    fields: [
      {
        id: 'anecdotes',
        type: 'area',
        label: 'Anecdotes racontées par la famille',
        placeholder: 'Laissez la famille raconter librement…',
        tip: 'Relancez simplement : « Et ensuite ? », « Qu’a-t-il/elle dit à ce moment-là ? »',
      },
      { id: 'sharedMemory', type: 'area', label: 'Un souvenir partagé tous ensemble', placeholder: 'Une fête, un voyage, un repas de famille…' },
      { id: 'legacy', type: 'area', label: "Ce qu'il/elle a transmis", placeholder: 'Des valeurs, un savoir-faire, une recette, une façon de vivre…' },
      { id: 'sayings', type: 'text', label: "Une phrase qu'il/elle disait souvent", placeholder: '« … »', bind: { to: 'biography', key: 'sayings' } },
      { id: 'lovedOnesView', type: 'area', label: 'Ce que ses proches diraient de lui/elle', bind: { to: 'biography', key: 'lovedOnesView' } },
    ],
  },
  {
    id: 'ton',
    title: 'Le ton',
    subtitle: 'Le sens de la cérémonie et les sujets sensibles.',
    fields: [
      {
        id: 'spirituality',
        type: 'choice',
        label: 'Dimension spirituelle',
        options: [
          ['laique', 'Strictement laïque'],
          ['spirituelle', 'Spirituelle sans religion'],
          ['religieuse', 'Lecture religieuse souhaitée'],
          ['priere', 'Prière dite par un proche'],
        ],
      },
      { id: 'tone', type: 'chips', label: 'Ton souhaité', options: ['Sobre', 'Chaleureux', 'Lumineux', "Avec une touche d'humour", 'Solennel'] },
      {
        id: 'sensitive',
        type: 'area',
        label: 'Sujets à aborder avec délicatesse',
        placeholder: 'Circonstances du décès, maladie, tensions familiales…',
        tip: "Note réservée au maître de cérémonie : elle n'apparaît dans aucun document remis à la famille.",
      },
      { id: 'avoid', type: 'area', label: 'Ce que la famille ne veut surtout pas', placeholder: 'Une musique, un mot, une personne à ne pas citer…' },
    ],
  },
  {
    id: 'paroles',
    title: 'Prises de parole',
    subtitle: 'Qui parlera, sous quelle forme, et avec quel soutien.',
    fields: [
      {
        id: 'speakers',
        type: 'area',
        label: 'Intervenants (un par ligne)',
        placeholder: 'Thomas, petit-fils — texte personnel — 3 min\nSophie, sa fille — poème',
        tip: 'Chaque ligne devient une prise de parole dans le déroulé.',
      },
      {
        id: 'support',
        type: 'chips',
        label: 'Accompagnement',
        options: ["Aide à l'écriture", 'Le maître de cérémonie lit à sa place si besoin', 'Texte transmis à l’avance'],
        tip: "Proposez toujours le relais : un proche submergé par l'émotion doit savoir qu'il peut vous confier son texte.",
      },
      { id: 'readings', type: 'area', label: 'Lectures choisies', placeholder: 'Poèmes, extraits de livres, textes écrits par le défunt…' },
    ],
  },
  {
    id: 'musiques',
    title: 'Musiques',
    subtitle: 'Les moments musicaux et les goûts du défunt.',
    fields: [
      { id: 'musicEntry', type: 'text', label: "Musique d'entrée", placeholder: '[titre, artiste]' },
      { id: 'musicMeditation', type: 'text', label: 'Musique de recueillement', placeholder: '[titre, artiste]' },
      { id: 'musicExit', type: 'text', label: 'Musique de sortie', placeholder: '[titre, artiste]' },
      { id: 'musicLoved', type: 'area', label: "Musiques qu'il/elle aimait", placeholder: 'Artistes, chansons, styles, une chanson liée à un souvenir…' },
      { id: 'musicAvoid', type: 'text', label: 'Musiques à éviter', placeholder: '[titre ou style]' },
      { id: 'musicFormat', type: 'chips', label: 'Format', options: ['Fichier fourni par la famille', "Plateforme d'écoute", 'Musicien en direct'] },
    ],
  },
  {
    id: 'photos',
    title: 'Photos et supports',
    subtitle: 'Diaporama, photo principale et vidéos.',
    fields: [
      {
        id: 'slideshow',
        type: 'choice',
        label: 'Diaporama',
        options: [
          ['oui', 'Oui'],
          ['non', 'Non'],
          ['une', 'Une seule photo'],
        ],
      },
      { id: 'mainPhoto', type: 'text', label: 'Photo principale (près du cercueil ou de l’urne)', placeholder: '[à choisir]' },
      { id: 'photoCount', type: 'text', label: 'Nombre de photos souhaité', placeholder: '[n]' },
      { id: 'photoDelivery', type: 'chips', label: 'Envoi des photos', options: ['Clé USB', 'Par e-mail', 'Remises sur place'] },
      { id: 'video', type: 'area', label: 'Vidéo ou enregistrement à diffuser', placeholder: 'Un message vocal, un film de famille…' },
    ],
  },
  {
    id: 'gestes',
    title: 'Gestes symboliques',
    subtitle: 'Les gestes qui permettront à chacun de dire au revoir.',
    fields: [
      {
        id: 'gestures',
        type: 'chips',
        label: 'Gestes souhaités',
        options: ['Dépôt de fleurs', 'Bougies', 'Pétales', 'Recueillement devant le cercueil', 'Minute de silence', 'Objets déposés', "Livre d'or"],
      },
      { id: 'gesturesDetail', type: 'area', label: 'Détail du déroulement', placeholder: 'Qui commence, dans quel ordre, sur quelle musique…' },
    ],
  },
  {
    id: 'options',
    title: 'Options et accords',
    subtitle: 'Retransmission, droit à l’image, besoins particuliers.',
    fields: [
      { id: 'streaming', type: 'choice', label: 'Retransmission en direct pour les absents', options: yesNo },
      {
        id: 'imageConsent',
        type: 'choice',
        label: 'Accord pour filmer et photographier',
        options: [
          ['accorde', 'Accordé'],
          ['refuse', 'Refusé'],
          ['a-confirmer', 'À confirmer'],
        ],
      },
      { id: 'attendees', type: 'text', label: 'Nombre de personnes attendues', placeholder: '[n]' },
      { id: 'needs', type: 'chips', label: 'Besoins particuliers', options: ['Accès fauteuil roulant', 'Personnes malentendantes', 'Traduction', 'Enfants présents'] },
    ],
  },
]

export type FieldValue = string | string[]

/** Valeur actuelle d'un champ, où qu'elle soit enregistrée. */
export function readField(c: Ceremony, field: MeetingField): FieldValue {
  if (field.bind?.to === 'ceremony') return String(c[field.bind.key] ?? '')
  if (field.bind?.to === 'biography') return String((c.biography ?? createEmptyBiography())[field.bind.key] ?? '')
  const v = c.meeting?.answers[field.id]
  if (field.type === 'chips') return Array.isArray(v) ? v : []
  return typeof v === 'string' ? v : ''
}

/** Copie de la cérémonie avec la nouvelle valeur du champ, rangée au bon endroit. */
export function writeField(c: Ceremony, field: MeetingField, value: FieldValue): Ceremony {
  if (field.bind?.to === 'ceremony') return { ...c, [field.bind.key]: value }
  if (field.bind?.to === 'biography') {
    const biography: Biography = { ...(c.biography ?? createEmptyBiography()), [field.bind.key]: value }
    return { ...c, biography }
  }
  const answers: MeetingAnswers = { ...(c.meeting?.answers ?? {}), [field.id]: value }
  return { ...c, meeting: { ...c.meeting, answers } }
}

function isFilled(c: Ceremony, field: MeetingField): boolean {
  const v = readField(c, field)
  if (Array.isArray(v)) return v.length > 0
  // « Non précisé » reste une valeur par défaut, pas une réponse.
  if (field.bind?.key === 'gender') return v !== '' && v !== 'non-precise'
  return v.trim() !== ''
}

export type SectionStatus = 'todo' | 'partial' | 'done'

export function sectionStatus(c: Ceremony, section: MeetingSection): SectionStatus {
  const filled = section.fields.filter((f) => isFilled(c, f)).length
  if (filled === 0) return 'todo'
  return filled === section.fields.length ? 'done' : 'partial'
}

/** Part des champs renseignés, en pourcentage. */
export function meetingProgress(c: Ceremony): number {
  const fields = meetingSections.flatMap((s) => s.fields)
  return Math.round((fields.filter((f) => isFilled(c, f)).length / fields.length) * 100)
}

/** Réponse texte libre de la rencontre (chaîne vide si absente). */
export function answer(c: Ceremony, id: string): string {
  const v = c.meeting?.answers[id]
  return typeof v === 'string' ? v.trim() : ''
}

export function answerList(c: Ceremony, id: string): string[] {
  const v = c.meeting?.answers[id]
  return Array.isArray(v) ? v : []
}
