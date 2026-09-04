// Préférences d'application, par appareil (comme le clavier de la
// télécommande ou la sortie audio) : stockées en localStorage, jamais dans
// les données de cérémonie ni dans la sauvegarde/export ZIP.

export interface AppSettings {
  showTeleprompter: boolean
  showPaceIndicator: boolean
  defaultFontSize: number
  defaultScrollSpeed: number
  hideBuiltInLibrary: boolean
  defaultFadeOutSeconds: number
}

export const defaultAppSettings: AppSettings = {
  showTeleprompter: true,
  showPaceIndicator: true,
  defaultFontSize: 40,
  defaultScrollSpeed: 28,
  hideBuiltInLibrary: false,
  defaultFadeOutSeconds: 2,
}

const STORAGE_KEY = 'cerema-app-settings-v1'

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultAppSettings }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...defaultAppSettings, ...parsed }
  } catch {
    return { ...defaultAppSettings }
  }
}

export function saveAppSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // stockage indisponible : les réglages ne vaudront que pour cette session.
  }
}

export function isBuiltInTrackId(id: string): boolean {
  return id.startsWith('builtin-')
}
