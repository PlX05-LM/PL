/** Décode un blob audio (mp3/wav/m4a…) en AudioBuffer, pour analyse ou découpe. */
export async function decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer()
  const ctx = new AudioContext()
  try {
    return await ctx.decodeAudioData(arrayBuffer)
  } finally {
    ctx.close()
  }
}

/**
 * Réduit un AudioBuffer à `bins` valeurs (amplitude crête par tranche, tous
 * canaux confondus), pour dessiner une forme d'onde sans redessiner à partir
 * de millions d'échantillons individuels.
 */
export function computeWaveformPeaks(buffer: AudioBuffer, bins: number): Float32Array {
  const peaks = new Float32Array(bins)
  const channels = buffer.numberOfChannels
  const length = buffer.length
  const samplesPerBin = Math.max(1, Math.floor(length / bins))
  for (let b = 0; b < bins; b++) {
    let max = 0
    const start = b * samplesPerBin
    const end = Math.min(length, start + samplesPerBin)
    for (let c = 0; c < channels; c++) {
      const data = buffer.getChannelData(c)
      for (let i = start; i < end; i++) {
        const v = Math.abs(data[i])
        if (v > max) max = v
      }
    }
    peaks[b] = max
  }
  return peaks
}

/** Extrait la portion [startSec, endSec] d'un AudioBuffer dans un nouveau buffer. */
export function trimAudioBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const sampleRate = buffer.sampleRate
  const startSample = Math.max(0, Math.min(buffer.length, Math.floor(startSec * sampleRate)))
  const endSample = Math.max(startSample + 1, Math.min(buffer.length, Math.ceil(endSec * sampleRate)))
  const length = endSample - startSample

  // OfflineAudioContext sert ici uniquement de fabrique d'AudioBuffer (aucun
  // rendu déclenché) : plus léger qu'un AudioContext temps réel pour ce besoin.
  const factory = new OfflineAudioContext(buffer.numberOfChannels, length, sampleRate)
  const trimmed = factory.createBuffer(buffer.numberOfChannels, length, sampleRate)
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    trimmed.copyToChannel(buffer.getChannelData(c).subarray(startSample, endSample), c)
  }
  return trimmed
}
