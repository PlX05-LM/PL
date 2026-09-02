export type RemoteAction =
  | 'nextSegment'
  | 'prevSegment'
  | 'toggleMusic'
  | 'fadeOutMusic'
  | 'nextSlide'
  | 'prevSlide'
  | 'toggleSlideshow'
  | 'toggleBlackout'
  | 'toggleAutoScroll'
  | 'startChrono'

export const actionOrder: RemoteAction[] = [
  'nextSegment',
  'prevSegment',
  'toggleMusic',
  'fadeOutMusic',
  'nextSlide',
  'prevSlide',
  'toggleSlideshow',
  'toggleBlackout',
  'toggleAutoScroll',
  'startChrono',
]

export const actionLabels: Record<RemoteAction, string> = {
  nextSegment: 'Étape suivante',
  prevSegment: 'Étape précédente',
  toggleMusic: 'Lecture / pause de la musique',
  fadeOutMusic: 'Fondu de sortie de la musique',
  nextSlide: 'Photo suivante',
  prevSlide: 'Photo précédente',
  toggleSlideshow: 'Lecture / pause du diaporama',
  toggleBlackout: "Écran noir (bascule)",
  toggleAutoScroll: 'Défilement auto du prompteur (bascule)',
  startChrono: 'Démarrer le chronomètre',
}

export type Keymap = Record<RemoteAction, string>

// Correspond aux touches envoyées par la plupart des télécommandes de
// présentation (clickers) du commerce : flèches gauche/droite ou
// PageUp/PageDown pour avancer/reculer, et souvent une touche libre
// mappable sur B/F comme sur PowerPoint.
export const defaultKeymap: Keymap = {
  nextSegment: 'ArrowRight',
  prevSegment: 'ArrowLeft',
  toggleMusic: ' ',
  fadeOutMusic: 'f',
  nextSlide: 'ArrowDown',
  prevSlide: 'ArrowUp',
  toggleSlideshow: 'p',
  toggleBlackout: 'b',
  toggleAutoScroll: 'a',
  startChrono: 's',
}

const STORAGE_KEY = 'cerema-remote-keymap-v1'

export function loadKeymap(): Keymap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultKeymap }
    const parsed = JSON.parse(raw) as Partial<Keymap>
    return { ...defaultKeymap, ...parsed }
  } catch {
    return { ...defaultKeymap }
  }
}

export function saveKeymap(map: Keymap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // stockage indisponible (navigation privée, quota...) : la préférence
    // reste simplement valable pour la session en cours.
  }
}

const keyDisplayNames: Record<string, string> = {
  ' ': 'Espace',
  ArrowRight: '→',
  ArrowLeft: '←',
  ArrowUp: '↑',
  ArrowDown: '↓',
  PageUp: 'Page préc.',
  PageDown: 'Page suiv.',
  Escape: 'Échap',
  Enter: 'Entrée',
  Tab: 'Tab',
}

export function keyDisplayName(key: string): string {
  return keyDisplayNames[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

/** Normalise une touche de keydown pour la comparaison (insensible à la casse pour les lettres). */
export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key
}
