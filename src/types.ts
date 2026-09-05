export type TransitionType = 'fade' | 'dissolve' | 'kenburns' | 'slide' | 'cut'

export interface Track {
  id: string
  name: string
  artist?: string
  blob: Blob
  mimeType: string
  duration?: number
  createdAt: number
  /** Renseigné pour les pistes de la bibliothèque libre de droit intégrée. */
  license?: string
  /**
   * Cérémonie à laquelle appartient cette piste importée par l'utilisateur — absent pour
   * les pistes de la bibliothèque libre de droit, qui restent partagées entre toutes les
   * cérémonies. Une piste importée n'apparaît que dans la cérémonie pour laquelle elle a
   * été ajoutée, et non dans les suivantes.
   */
  ceremonyId?: string
}

export interface Photo {
  id: string
  name: string
  blob: Blob
  mimeType: string
  createdAt: number
  /** Cérémonie à laquelle appartient cette photo — n'apparaît que dans cette cérémonie. */
  ceremonyId?: string
}

export interface SlideshowConfig {
  photoIds: string[]
  transition: TransitionType
  slideDuration: number // secondes par photo
  transitionDuration: number // secondes de transition
  kenBurns: boolean
  loop: boolean
  trackId?: string
  /**
   * Photo unique affichée à la place du diaporama (ex. en introduction, avant de
   * basculer sur le diaporama, ou à la demande de la famille en cours de cérémonie).
   */
  fixedPhotoId?: string
}

export interface CeremonySegment {
  id: string
  title: string
  script: string
  estimatedDuration: number // minutes
  trackId?: string
  notes?: string
}

export type CeremonyType = 'obseques' | 'creation' | 'inhumation' | 'hommage' | 'autre'

export interface BiographyChild {
  id: string
  name: string
  birthDate?: string
}

export interface Biography {
  gender: 'homme' | 'femme' | 'non-precise'
  birthDate?: string
  birthPlace?: string
  education?: string
  siblings?: string
  career?: string
  volunteering?: string
  metSpouse?: string
  spouseName?: string
  weddingDate?: string
  hasChildren: boolean
  children: BiographyChild[]
  grandchildren?: string
  passions?: string
  /** Trois mots ou traits qui le/la décrivaient. */
  characterTraits?: string
  /** Une phrase, une expression qu'il/elle répétait souvent. */
  sayings?: string
  /** Un objet, un lieu, une odeur, une chanson qui évoque son souvenir. */
  symbolicObject?: string
  proudestOf?: string
  guidingValue?: string
  anecdotes: string[]
  /** Comment son conjoint, ses enfants, ses amis ou collègues le/la décriraient. */
  lovedOnesView?: string
  /** Le dernier mot qu'il/elle aurait pu laisser, pour clore l'éloge. */
  legacyWish?: string
  notes?: string
}

export function createEmptyBiography(): Biography {
  return {
    gender: 'non-precise',
    hasChildren: false,
    children: [],
    anecdotes: [],
  }
}

export interface LiveState {
  segmentIndex: number
  startedAt: number | null
  slideIndex: number
  blackout: boolean
  photoMode: 'diaporama' | 'fixe'
}

export interface Ceremony {
  id: string
  title: string
  deceasedName: string
  ceremonyType: CeremonyType
  date: string // ISO date
  time: string
  location: string
  familyContact?: string
  officiant?: string
  notes: string
  segments: CeremonySegment[]
  slideshow: SlideshowConfig
  createdAt: number
  updatedAt: number
  /** Permet de reprendre la régie live là où elle en était après un rechargement/plantage. */
  liveState?: LiveState
  /** Informations biographiques recueillies auprès de la famille, pour préparer l'éloge. */
  biography?: Biography
}

export function createEmptyCeremony(id: string): Ceremony {
  const now = Date.now()
  return {
    id,
    title: 'Nouvelle cérémonie',
    deceasedName: '',
    ceremonyType: 'obseques',
    date: new Date().toISOString().slice(0, 10),
    time: '10:00',
    location: '',
    familyContact: '',
    officiant: '',
    notes: '',
    segments: [],
    slideshow: {
      photoIds: [],
      transition: 'fade',
      slideDuration: 5,
      transitionDuration: 1.2,
      kenBurns: true,
      loop: true,
    },
    createdAt: now,
    updatedAt: now,
  }
}

export function createEmptySegment(id: string, order: number): CeremonySegment {
  return {
    id,
    title: `Étape ${order}`,
    script: '',
    estimatedDuration: 5,
  }
}
