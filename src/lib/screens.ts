/**
 * Placement de la projection sur l'écran externe (Window Management API, Chrome / Edge
 * sur ordinateur) et plein écran déclenché depuis la régie (délégation du plein écran).
 * Sur les navigateurs qui ne les gèrent pas, la projection s'ouvre comme avant.
 */

export interface ScreenInfo {
  availLeft: number
  availTop: number
  availWidth: number
  availHeight: number
  isPrimary?: boolean
  label?: string
}

export interface ScreenDetails extends EventTarget {
  screens: ScreenInfo[]
  currentScreen: ScreenInfo
}

type WindowWithScreens = Window & { getScreenDetails?: () => Promise<ScreenDetails> }

export function supportsScreenPlacement(): boolean {
  return typeof (window as WindowWithScreens).getScreenDetails === 'function'
}

/** Détails des écrans sans rien demander, seulement si l'autorisation est déjà accordée. */
export async function getScreenDetailsIfGranted(): Promise<ScreenDetails | null> {
  if (!supportsScreenPlacement()) return null
  try {
    const status = await navigator.permissions.query({ name: 'window-management' as PermissionName })
    if (status.state !== 'granted') return null
    return await (window as WindowWithScreens).getScreenDetails!()
  } catch {
    return null
  }
}

/** Demande l'autorisation « Gérer les fenêtres sur tous vos écrans » si nécessaire. */
export async function requestScreenDetails(): Promise<ScreenDetails | null> {
  if (!supportsScreenPlacement()) return null
  try {
    return await (window as WindowWithScreens).getScreenDetails!()
  } catch {
    return null
  }
}

/** L'écran que voit l'assemblée : un autre que celui de la régie, de préférence non principal. */
export function pickExternalScreen(details: ScreenDetails): ScreenInfo | null {
  const others = details.screens.filter((s) => s !== details.currentScreen)
  return others.find((s) => !s.isPrimary) ?? others[0] ?? null
}

export function windowFeaturesFor(screen: ScreenInfo | null): string {
  if (!screen) return 'width=1280,height=720'
  return `left=${screen.availLeft},top=${screen.availTop},width=${screen.availWidth},height=${screen.availHeight}`
}

export const FULLSCREEN_REQUEST = 'cereo-projector-fullscreen'

/**
 * Transmet à la fenêtre de projection le droit de passer en plein écran, à partir du
 * clic fait dans la régie (sans cela, le navigateur exige un clic dans la fenêtre même).
 */
export function delegateFullscreen(target: Window): void {
  const message = { type: FULLSCREEN_REQUEST }
  try {
    target.postMessage(message, {
      targetOrigin: window.location.origin,
      delegate: 'fullscreen',
    } as WindowPostMessageOptions)
  } catch {
    target.postMessage(message, window.location.origin)
  }
}
