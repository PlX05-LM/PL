type SinkCapableElement = HTMLMediaElement & {
  setSinkId?: (sinkId: string) => Promise<void>
  sinkId?: string
}

type AirplayCapableElement = HTMLMediaElement & {
  webkitShowPlaybackTargetPicker?: () => void
  webkitCurrentPlaybackTargetIsWireless?: boolean
}

export type AudioOutputCapability = 'sink-select' | 'airplay' | 'none'

/**
 * Détermine quel mécanisme de choix de sortie audio utiliser :
 * - « sink-select » : setSinkId, disponible sur les navigateurs Chromium
 *   (Chrome, Edge, y compris sur Android) — permet un choix direct dans un
 *   menu déroulant, avec la liste des périphériques.
 * - « airplay » : WebKit (Safari — iPhone/iPad/Mac, et tout navigateur sous
 *   iOS/iPadOS puisqu'Apple impose le moteur WebKit) n'implémente pas
 *   setSinkId, mais expose le sélecteur système AirPlay, qui liste aussi les
 *   enceintes Bluetooth déjà appairées.
 * - « none » : aucun des deux (navigateur trop ancien, Firefox desktop...) —
 *   on masque le contrôle plutôt que d'afficher quelque chose d'inopérant.
 */
export function detectAudioOutputCapability(): AudioOutputCapability {
  if (typeof window === 'undefined') return 'none'
  const proto = window.HTMLMediaElement?.prototype as
    | (SinkCapableElement & AirplayCapableElement)
    | undefined
  if (typeof proto?.setSinkId === 'function' && navigator.mediaDevices) {
    return 'sink-select'
  }
  if (typeof proto?.webkitShowPlaybackTargetPicker === 'function') return 'airplay'
  return 'none'
}

export function showAirPlayPicker(audio: HTMLAudioElement): void {
  const el = audio as AirplayCapableElement
  el.webkitShowPlaybackTargetPicker?.()
}

function isWirelessPlaybackTarget(audio: HTMLAudioElement): boolean {
  return Boolean((audio as AirplayCapableElement).webkitCurrentPlaybackTargetIsWireless)
}

/** S'abonne aux changements de sortie AirPlay/Bluetooth d'un élément audio. */
export function onWirelessPlaybackTargetChange(
  audio: HTMLAudioElement,
  cb: (isWireless: boolean) => void,
): () => void {
  const handler = () => cb(isWirelessPlaybackTarget(audio))
  audio.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', handler)
  return () => audio.removeEventListener('webkitcurrentplaybacktargetiswirelesschanged', handler)
}

/**
 * Détecte un appareil Apple (iPhone/iPad/iPod, et Mac tactile — l'iPadOS 13+
 * se présente comme « Macintosh » mais garde plusieurs points de contact,
 * contrairement à un vrai Mac). Sert uniquement à adapter les libellés
 * affichés ; le choix du mécanisme (sink-select/airplay) repose lui sur la
 * détection de fonctionnalité ci-dessus, plus fiable qu'un sniff de plateforme.
 */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
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
