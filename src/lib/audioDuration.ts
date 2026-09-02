/**
 * Certains MP3 mal encodés (bitrate variable sans en-tête correct — très
 * fréquent sur les fichiers issus de convertisseurs "YouTube vers MP3")
 * déclenchent un bug connu de Chrome : `audio.duration` reste égal à
 * Infinity au lieu de la vraie durée. Le contournement documenté consiste
 * à chercher très loin dans le morceau une fois, ce qui force le navigateur
 * à recalculer la durée réelle.
 */
export function resolveAudioDuration(audio: HTMLAudioElement): Promise<number> {
  return new Promise((resolve) => {
    if (Number.isFinite(audio.duration)) {
      resolve(audio.duration)
      return
    }

    let settled = false
    const finish = (value: number) => {
      if (settled) return
      settled = true
      audio.removeEventListener('durationchange', onDurationChange)
      clearTimeout(timer)
      audio.currentTime = 0
      resolve(value)
    }
    const onDurationChange = () => {
      if (Number.isFinite(audio.duration)) finish(audio.duration)
    }
    audio.addEventListener('durationchange', onDurationChange)
    audio.currentTime = 1e101
    // Filet de sécurité si le contournement ne se déclenche pas.
    const timer = setTimeout(() => finish(NaN), 2000)
  })
}

export function formatDuration(sec?: number) {
  if (!sec || !Number.isFinite(sec)) return '--:--'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
