type SinkCapableElement = HTMLMediaElement & {
  setSinkId?: (sinkId: string) => Promise<void>
  sinkId?: string
}

/**
 * Le choix de la sortie audio (setSinkId) n'est disponible que sur les
 * navigateurs basés sur Chromium (Chrome, Edge, navigateurs Android...).
 * Safari (donc iPad) ne l'implémente pas : on masque le sélecteur plutôt
 * que d'afficher un contrôle qui ne ferait rien.
 */
export function isAudioOutputSelectionSupported(): boolean {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return false
  const proto = window.HTMLMediaElement?.prototype as SinkCapableElement | undefined
  return typeof proto?.setSinkId === 'function'
}

export async function listAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'audiooutput')
}

/**
 * Les libellés des périphériques (nom de l'enceinte Bluetooth, etc.) restent
 * vides tant qu'aucune permission média n'a été accordée à la page, même
 * pour une simple sortie audio. On déclenche donc une brève demande de micro
 * (jamais utilisée) uniquement pour débloquer ces libellés, à la demande de
 * l'utilisateur plutôt qu'au chargement de la page.
 */
export async function unlockDeviceLabels(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    return true
  } catch {
    return false
  }
}

export async function setAudioSink(audio: HTMLAudioElement, deviceId: string): Promise<void> {
  const el = audio as SinkCapableElement
  if (el.setSinkId) await el.setSinkId(deviceId)
}

const STORAGE_KEY = 'cerema-audio-output-v1'

export function loadPreferredSink(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function savePreferredSink(deviceId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, deviceId)
  } catch {
    // stockage indisponible : la préférence ne vaudra que pour cette session.
  }
}
