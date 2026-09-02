import { db } from '../db'
import { audioBufferToWavBlob } from './wavEncode'
import type { Track } from '../types'

export const BUILT_IN_LICENSE =
  'Composition originale générée pour Céréma — libre de droit, usage professionnel autorisé sans restriction.'

const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10]
const DORIAN = [0, 2, 3, 5, 7, 9, 10]
const MAJOR = [0, 2, 4, 5, 7, 9, 11]

type Voicing = 'pad-arpeggio' | 'pad-bells' | 'pad-only'
export type MoodTag = 'entree' | 'recueillement' | 'hommage' | 'sortie'

interface TrackSpec {
  slug: string
  title: string
  mood: MoodTag
  rootMidi: number
  scale: number[]
  degrees: number[]
  chordSeconds: number
  loops: number
  voicing: Voicing
}

export const moodLabels: Record<MoodTag, string> = {
  entree: 'Entrée',
  recueillement: 'Recueillement',
  hommage: 'Hommage / diaporama',
  sortie: 'Sortie',
}

const SPECS: TrackSpec[] = [
  // Recueillement — plus sobres et lentes
  { slug: 'recueillement', title: 'Recueillement', mood: 'recueillement', rootMidi: 57, scale: NATURAL_MINOR, degrees: [0, 3, 6, 2], chordSeconds: 10, loops: 3, voicing: 'pad-bells' },
  { slug: 'silence-habite', title: 'Silence habité', mood: 'recueillement', rootMidi: 50, scale: DORIAN, degrees: [0, 4, 3, 0], chordSeconds: 9, loops: 3, voicing: 'pad-only' },
  { slug: 'instant-suspendu', title: 'Instant suspendu', mood: 'recueillement', rootMidi: 52, scale: NATURAL_MINOR, degrees: [0, 5, 2, 6], chordSeconds: 10, loops: 3, voicing: 'pad-bells' },
  { slug: 'meditation-douce', title: 'Méditation douce', mood: 'recueillement', rootMidi: 55, scale: DORIAN, degrees: [0, 3, 4, 0], chordSeconds: 9, loops: 3, voicing: 'pad-only' },
  { slug: 'dans-le-silence', title: 'Dans le silence', mood: 'recueillement', rootMidi: 48, scale: NATURAL_MINOR, degrees: [0, 6, 3, 4], chordSeconds: 10, loops: 3, voicing: 'pad-bells' },

  // Entrée — allure de marche lente, arpèges
  { slug: 'arrivee-silencieuse', title: 'Arrivée silencieuse', mood: 'entree', rootMidi: 57, scale: DORIAN, degrees: [0, 3, 4, 0], chordSeconds: 7, loops: 4, voicing: 'pad-arpeggio' },
  { slug: 'premiers-pas', title: 'Premiers pas', mood: 'entree', rootMidi: 48, scale: NATURAL_MINOR, degrees: [0, 5, 3, 4], chordSeconds: 7, loops: 4, voicing: 'pad-arpeggio' },
  { slug: 'seuil-de-lumiere', title: 'Seuil de lumière', mood: 'entree', rootMidi: 52, scale: DORIAN, degrees: [0, 4, 3, 0], chordSeconds: 7, loops: 4, voicing: 'pad-arpeggio' },
  { slug: 'accueil-paisible', title: 'Accueil paisible', mood: 'entree', rootMidi: 55, scale: NATURAL_MINOR, degrees: [0, 3, 6, 2], chordSeconds: 8, loops: 3, voicing: 'pad-arpeggio' },
  { slug: 'vers-le-recueillement', title: 'Vers le recueillement', mood: 'entree', rootMidi: 45, scale: DORIAN, degrees: [0, 3, 4, 0], chordSeconds: 8, loops: 3, voicing: 'pad-arpeggio' },

  // Hommage / diaporama — plus mélodique et chaleureux
  { slug: 'souvenirs', title: 'Souvenirs', mood: 'hommage', rootMidi: 53, scale: MAJOR, degrees: [0, 5, 3, 4], chordSeconds: 7, loops: 4, voicing: 'pad-arpeggio' },
  { slug: 'fil-de-memoire', title: 'Fil de mémoire', mood: 'hommage', rootMidi: 48, scale: MAJOR, degrees: [0, 4, 5, 3], chordSeconds: 7, loops: 4, voicing: 'pad-arpeggio' },
  { slug: 'hommage-tendre', title: 'Hommage tendre', mood: 'hommage', rootMidi: 50, scale: DORIAN, degrees: [0, 5, 3, 4], chordSeconds: 8, loops: 3, voicing: 'pad-arpeggio' },
  { slug: 'lumiere-du-souvenir', title: 'Lumière du souvenir', mood: 'hommage', rootMidi: 55, scale: MAJOR, degrees: [0, 5, 3, 4], chordSeconds: 7, loops: 4, voicing: 'pad-arpeggio' },
  { slug: 'portrait-dune-vie', title: "Portrait d'une vie", mood: 'hommage', rootMidi: 57, scale: DORIAN, degrees: [0, 4, 5, 3], chordSeconds: 8, loops: 3, voicing: 'pad-arpeggio' },

  // Sortie — résolution douce
  { slug: 'vers-la-lumiere', title: 'Vers la lumière', mood: 'sortie', rootMidi: 52, scale: MAJOR, degrees: [0, 5, 3, 4], chordSeconds: 8, loops: 3, voicing: 'pad-arpeggio' },
  { slug: 'dernier-adieu', title: 'Dernier adieu', mood: 'sortie', rootMidi: 57, scale: NATURAL_MINOR, degrees: [0, 3, 6, 0], chordSeconds: 9, loops: 3, voicing: 'pad-bells' },
  { slug: 'envol-paisible', title: 'Envol paisible', mood: 'sortie', rootMidi: 48, scale: MAJOR, degrees: [0, 5, 3, 4], chordSeconds: 8, loops: 3, voicing: 'pad-arpeggio' },
  { slug: 'chemin-apaise', title: 'Chemin apaisé', mood: 'sortie', rootMidi: 50, scale: DORIAN, degrees: [0, 4, 3, 0], chordSeconds: 8, loops: 3, voicing: 'pad-arpeggio' },
  { slug: 'au-revoir', title: 'Au revoir', mood: 'sortie', rootMidi: 55, scale: NATURAL_MINOR, degrees: [0, 3, 4, 0], chordSeconds: 9, loops: 3, voicing: 'pad-bells' },
]

export function builtInTrackId(slug: string) {
  return `builtin-${slug}`
}

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function triadFromDegree(scale: number[], degree: number): number[] {
  const len = scale.length
  const noteAt = (d: number) => {
    const octave = Math.floor(d / len)
    const idx = ((d % len) + len) % len
    return scale[idx] + octave * 12
  }
  return [noteAt(degree), noteAt(degree + 2), noteAt(degree + 4)]
}

function createReverbImpulse(ctx: OfflineAudioContext, seconds: number) {
  const length = Math.floor(ctx.sampleRate * seconds)
  const impulse = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = impulse.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5)
  }
  return impulse
}

function playPad(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  midiNotes: number[],
  start: number,
  chordSeconds: number,
) {
  const attack = Math.min(2, chordSeconds * 0.25)
  const release = Math.min(2.5, chordSeconds * 0.3)
  const stop = start + chordSeconds + release
  const peak = 0.1 / midiNotes.length

  for (const midi of midiNotes) {
    const freq = midiToFreq(midi)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 1600
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + attack)
    gain.gain.setValueAtTime(peak, start + chordSeconds)
    gain.gain.linearRampToValueAtTime(0, stop)
    filter.connect(gain)
    for (const dest of destinations) gain.connect(dest)

    for (const [detune, type, mix] of [
      [0, 'sine', 1] as const,
      [6, 'triangle', 0.5] as const,
      [-6, 'triangle', 0.5] as const,
    ]) {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = freq
      osc.detune.value = detune
      const voiceGain = ctx.createGain()
      voiceGain.gain.value = mix
      osc.connect(voiceGain)
      voiceGain.connect(filter)
      osc.start(start)
      osc.stop(stop + 0.1)
    }
  }
}

function playArpeggio(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  midiNotes: number[],
  start: number,
  chordSeconds: number,
) {
  const pattern = [0, 1, 2, 1]
  const steps = 4
  const stepDuration = chordSeconds / steps
  for (let i = 0; i < steps; i++) {
    const noteIndex = pattern[i % pattern.length]
    const midi = midiNotes[noteIndex] + 12
    const freq = midiToFreq(midi)
    const noteStart = start + i * stepDuration
    const decay = Math.min(stepDuration * 2.2, 2.5)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(0.09, noteStart + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + decay)
    for (const dest of destinations) gain.connect(dest)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const overtone = ctx.createOscillator()
    overtone.type = 'sine'
    overtone.frequency.value = freq * 2
    const overtoneGain = ctx.createGain()
    overtoneGain.gain.value = 0.15
    overtone.connect(overtoneGain)
    overtoneGain.connect(gain)
    osc.connect(gain)
    osc.start(noteStart)
    osc.stop(noteStart + decay + 0.1)
    overtone.start(noteStart)
    overtone.stop(noteStart + decay + 0.1)
  }
}

function playBell(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  midiNotes: number[],
  start: number,
  chordSeconds: number,
) {
  const decay = Math.min(chordSeconds * 0.9, 6)
  for (const [midiOffset, delay, level] of [
    [0, 0, 0.08] as const,
    [midiNotes[2] - midiNotes[0] + 12, chordSeconds * 0.5, 0.05] as const,
  ]) {
    const freq = midiToFreq(midiNotes[0] + midiOffset)
    const noteStart = start + delay
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(level, noteStart + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + decay)
    for (const dest of destinations) gain.connect(dest)

    for (const mult of [1, 2.4, 3.8]) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * mult
      const partialGain = ctx.createGain()
      partialGain.gain.value = mult === 1 ? 1 : 0.2
      osc.connect(partialGain)
      partialGain.connect(gain)
      osc.start(noteStart)
      osc.stop(noteStart + decay + 0.1)
    }
  }
}

function normalize(buffer: AudioBuffer) {
  let peak = 0
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
  }
  if (peak > 0.95 && peak > 0) {
    const scale = 0.95 / peak
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c)
      for (let i = 0; i < data.length; i++) data[i] *= scale
    }
  }
}

async function renderTrack(spec: TrackSpec): Promise<AudioBuffer> {
  const sampleRate = 22050
  const totalChords = spec.degrees.length * spec.loops
  const duration = totalChords * spec.chordSeconds + 5
  const ctx = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate)

  const convolver = ctx.createConvolver()
  convolver.buffer = createReverbImpulse(ctx, 2.5)
  const wetGain = ctx.createGain()
  wetGain.gain.value = 0.3
  const master = ctx.createGain()
  master.gain.value = 0.85
  convolver.connect(wetGain)
  wetGain.connect(master)
  master.connect(ctx.destination)

  const dryGain = ctx.createGain()
  dryGain.gain.value = 0.9
  dryGain.connect(master)
  const destinations = [dryGain, convolver]

  let t = 0.5
  for (let loop = 0; loop < spec.loops; loop++) {
    for (const degree of spec.degrees) {
      const chordMidis = triadFromDegree(spec.scale, degree).map((s) => spec.rootMidi + s)
      playPad(ctx, destinations, chordMidis, t, spec.chordSeconds)
      if (spec.voicing === 'pad-arpeggio') playArpeggio(ctx, destinations, chordMidis, t, spec.chordSeconds)
      if (spec.voicing === 'pad-bells') playBell(ctx, destinations, chordMidis, t, spec.chordSeconds)
      t += spec.chordSeconds
    }
  }

  const rendered = await ctx.startRendering()
  normalize(rendered)
  return rendered
}

export interface BuiltInLibraryProgress {
  index: number
  total: number
  title: string
}

/** Génère (si besoin) et ajoute les 20 pistes de la bibliothèque libre de droit. Idempotent. */
export async function importBuiltInLibrary(
  onProgress?: (p: BuiltInLibraryProgress) => void,
): Promise<number> {
  let added = 0
  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i]
    onProgress?.({ index: i + 1, total: SPECS.length, title: spec.title })
    const id = builtInTrackId(spec.slug)
    const existing = await db.tracks.get(id)
    if (existing) continue

    const buffer = await renderTrack(spec)
    const blob = audioBufferToWavBlob(buffer)
    const track: Track = {
      id,
      name: spec.title,
      artist: 'Céréma',
      blob,
      mimeType: 'audio/wav',
      duration: buffer.duration,
      createdAt: Date.now(),
      license: BUILT_IN_LICENSE,
    }
    await db.tracks.add(track)
    added += 1
    await new Promise((r) => setTimeout(r, 0))
  }
  return added
}

export function builtInLibrarySpecs() {
  return SPECS.map((s) => ({ slug: s.slug, title: s.title, mood: s.mood }))
}
