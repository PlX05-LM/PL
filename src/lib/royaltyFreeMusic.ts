import { db } from '../db'
import { audioBufferToWavBlob } from './wavEncode'
import type { Track } from '../types'

export const BUILT_IN_LICENSE =
  'Composition originale générée pour Céréma — libre de droit, usage professionnel autorisé sans restriction.'

const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10]
const DORIAN = [0, 2, 3, 5, 7, 9, 10]
const MAJOR = [0, 2, 4, 5, 7, 9, 11]

type Voicing =
  | 'organ'
  | 'strings'
  | 'choir'
  | 'piano-pad'
  | 'cello-drone'
  | 'harp'
  | 'piano-melody'
  | 'flute'
  | 'bell'
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
  // Recueillement — plus sobres et lentes. Un instrument différent par piste :
  // voix, violoncelle seul, orgue doux, piano feutré, carillon dans le silence.
  { slug: 'recueillement', title: 'Recueillement', mood: 'recueillement', rootMidi: 57, scale: NATURAL_MINOR, degrees: [0, 3, 6, 2], chordSeconds: 10, loops: 3, voicing: 'choir' },
  { slug: 'silence-habite', title: 'Silence habité', mood: 'recueillement', rootMidi: 50, scale: DORIAN, degrees: [0, 4, 3, 0], chordSeconds: 9, loops: 3, voicing: 'cello-drone' },
  { slug: 'instant-suspendu', title: 'Instant suspendu', mood: 'recueillement', rootMidi: 52, scale: NATURAL_MINOR, degrees: [0, 5, 2, 6], chordSeconds: 10, loops: 3, voicing: 'organ' },
  { slug: 'meditation-douce', title: 'Méditation douce', mood: 'recueillement', rootMidi: 55, scale: DORIAN, degrees: [0, 3, 4, 0], chordSeconds: 9, loops: 3, voicing: 'piano-pad' },
  { slug: 'dans-le-silence', title: 'Dans le silence', mood: 'recueillement', rootMidi: 48, scale: NATURAL_MINOR, degrees: [0, 6, 3, 4], chordSeconds: 10, loops: 3, voicing: 'bell' },

  // Entrée — allure de marche lente. Orgue processionnel, cordes, harpe, piano, violoncelle.
  { slug: 'arrivee-silencieuse', title: 'Arrivée silencieuse', mood: 'entree', rootMidi: 57, scale: DORIAN, degrees: [0, 3, 4, 0], chordSeconds: 7, loops: 4, voicing: 'organ' },
  { slug: 'premiers-pas', title: 'Premiers pas', mood: 'entree', rootMidi: 48, scale: NATURAL_MINOR, degrees: [0, 5, 3, 4], chordSeconds: 7, loops: 4, voicing: 'strings' },
  { slug: 'seuil-de-lumiere', title: 'Seuil de lumière', mood: 'entree', rootMidi: 52, scale: DORIAN, degrees: [0, 4, 3, 0], chordSeconds: 7, loops: 4, voicing: 'harp' },
  { slug: 'accueil-paisible', title: 'Accueil paisible', mood: 'entree', rootMidi: 55, scale: NATURAL_MINOR, degrees: [0, 3, 6, 2], chordSeconds: 8, loops: 3, voicing: 'piano-pad' },
  { slug: 'vers-le-recueillement', title: 'Vers le recueillement', mood: 'entree', rootMidi: 45, scale: DORIAN, degrees: [0, 3, 4, 0], chordSeconds: 8, loops: 3, voicing: 'cello-drone' },

  // Hommage / diaporama — plus mélodique et chaleureux : mélodie de piano,
  // cordes, harpe, voix, flûte.
  { slug: 'souvenirs', title: 'Souvenirs', mood: 'hommage', rootMidi: 53, scale: MAJOR, degrees: [0, 5, 3, 4], chordSeconds: 7, loops: 4, voicing: 'piano-melody' },
  { slug: 'fil-de-memoire', title: 'Fil de mémoire', mood: 'hommage', rootMidi: 48, scale: MAJOR, degrees: [0, 4, 5, 3], chordSeconds: 7, loops: 4, voicing: 'strings' },
  { slug: 'hommage-tendre', title: 'Hommage tendre', mood: 'hommage', rootMidi: 50, scale: DORIAN, degrees: [0, 5, 3, 4], chordSeconds: 8, loops: 3, voicing: 'harp' },
  { slug: 'lumiere-du-souvenir', title: 'Lumière du souvenir', mood: 'hommage', rootMidi: 55, scale: MAJOR, degrees: [0, 5, 3, 4], chordSeconds: 7, loops: 4, voicing: 'choir' },
  { slug: 'portrait-dune-vie', title: "Portrait d'une vie", mood: 'hommage', rootMidi: 57, scale: DORIAN, degrees: [0, 4, 5, 3], chordSeconds: 8, loops: 3, voicing: 'flute' },

  // Sortie — résolution douce : cordes, orgue, harpe, piano, voix.
  { slug: 'vers-la-lumiere', title: 'Vers la lumière', mood: 'sortie', rootMidi: 52, scale: MAJOR, degrees: [0, 5, 3, 4], chordSeconds: 8, loops: 3, voicing: 'strings' },
  { slug: 'dernier-adieu', title: 'Dernier adieu', mood: 'sortie', rootMidi: 57, scale: NATURAL_MINOR, degrees: [0, 3, 6, 0], chordSeconds: 9, loops: 3, voicing: 'organ' },
  { slug: 'envol-paisible', title: 'Envol paisible', mood: 'sortie', rootMidi: 48, scale: MAJOR, degrees: [0, 5, 3, 4], chordSeconds: 8, loops: 3, voicing: 'harp' },
  { slug: 'chemin-apaise', title: 'Chemin apaisé', mood: 'sortie', rootMidi: 50, scale: DORIAN, degrees: [0, 4, 3, 0], chordSeconds: 8, loops: 3, voicing: 'piano-pad' },
  { slug: 'au-revoir', title: 'Au revoir', mood: 'sortie', rootMidi: 55, scale: NATURAL_MINOR, degrees: [0, 3, 4, 0], chordSeconds: 9, loops: 3, voicing: 'choir' },
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

/**
 * Vibrato : LFO de fréquence `rateHz` modulant un AudioParam en cents
 * (typiquement `.detune`), avec une profondeur qui monte progressivement à
 * partir de `delaySeconds` — un instrument tenu (voix, cordes, violoncelle)
 * ajoute son vibrato après l'attaque de la note, jamais dès l'onset.
 */
function addVibrato(
  ctx: OfflineAudioContext,
  target: AudioParam,
  start: number,
  stop: number,
  rateHz: number,
  depthCents: number,
  delaySeconds: number,
) {
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = rateHz
  const depth = ctx.createGain()
  depth.gain.setValueAtTime(0, start)
  depth.gain.setValueAtTime(0, start + delaySeconds)
  depth.gain.linearRampToValueAtTime(depthCents, start + delaySeconds + 0.6)
  lfo.connect(depth)
  depth.connect(target)
  lfo.start(start)
  lfo.stop(stop)
}

/** Orgue : synthèse additive statique (fondamentale + harmoniques 2/3/4 en registres), façon orgue liturgique. */
function playOrgan(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  midiNotes: number[],
  start: number,
  chordSeconds: number,
) {
  const attack = Math.min(1.2, chordSeconds * 0.2)
  const release = Math.min(1.5, chordSeconds * 0.25)
  const stop = start + chordSeconds + release
  const peak = 0.09 / midiNotes.length

  for (const midi of midiNotes) {
    const freq = midiToFreq(midi)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + attack)
    gain.gain.setValueAtTime(peak, start + chordSeconds)
    gain.gain.linearRampToValueAtTime(0, stop)
    for (const dest of destinations) gain.connect(dest)

    for (const [harmonic, level] of [[1, 1], [2, 0.5], [3, 0.28], [4, 0.16]] as const) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq * harmonic
      const partial = ctx.createGain()
      partial.gain.value = level
      osc.connect(partial)
      partial.connect(gain)
      osc.start(start)
      osc.stop(stop + 0.1)
      if (harmonic === 1) addVibrato(ctx, osc.detune, start, stop + 0.1, 4.5, 4, 0.4)
    }
  }
}

/** Cordes : ensemble de dents de scie légèrement désaccordées (chœur), swell lent, vibrato commun. */
function playStrings(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  midiNotes: number[],
  start: number,
  chordSeconds: number,
) {
  const attack = Math.min(1.8, chordSeconds * 0.3)
  const release = Math.min(2, chordSeconds * 0.3)
  const stop = start + chordSeconds + release
  const peak = 0.085 / midiNotes.length

  for (const midi of midiNotes) {
    const freq = midiToFreq(midi)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 2200
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + attack)
    gain.gain.setValueAtTime(peak, start + chordSeconds)
    gain.gain.linearRampToValueAtTime(0, stop)
    filter.connect(gain)
    for (const dest of destinations) gain.connect(dest)

    for (const detune of [-11, -4, 0, 4, 11]) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.detune.value = detune
      const voiceGain = ctx.createGain()
      voiceGain.gain.value = 0.35
      osc.connect(voiceGain)
      voiceGain.connect(filter)
      osc.start(start)
      osc.stop(stop + 0.1)
      addVibrato(ctx, osc.detune, start, stop + 0.1, 5.5, 6, 0.5)
    }
  }
}

/** Voix (pad choral) : source riche en harmoniques filtrée par deux formants approximatifs d'une voyelle ouverte. */
function playChoir(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  midiNotes: number[],
  start: number,
  chordSeconds: number,
) {
  const attack = Math.min(2, chordSeconds * 0.35)
  const release = Math.min(2, chordSeconds * 0.3)
  const stop = start + chordSeconds + release
  const peak = 0.075 / midiNotes.length

  for (const midi of midiNotes) {
    const freq = midiToFreq(midi)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + attack)
    gain.gain.setValueAtTime(peak, start + chordSeconds)
    gain.gain.linearRampToValueAtTime(0, stop)
    for (const dest of destinations) gain.connect(dest)

    const source = ctx.createOscillator()
    source.type = 'sawtooth'
    source.frequency.value = freq
    addVibrato(ctx, source.detune, start, stop + 0.1, 5, 8, 0.6)

    for (const [formantFreq, q, level] of [[600, 6, 1], [1100, 8, 0.6]] as const) {
      const bandpass = ctx.createBiquadFilter()
      bandpass.type = 'bandpass'
      bandpass.frequency.value = formantFreq
      bandpass.Q.value = q
      const formantGain = ctx.createGain()
      formantGain.gain.value = level
      source.connect(bandpass)
      bandpass.connect(formantGain)
      formantGain.connect(gain)
    }
    source.start(start)
    source.stop(stop + 0.1)
  }
}

/** Piano (accord tenu) : frappe percussive puis décroissance en deux temps, façon pédale de sustain. */
function playPianoPad(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  midiNotes: number[],
  start: number,
  chordSeconds: number,
) {
  const stop = start + chordSeconds + 1.5
  const peak = 0.12 / midiNotes.length

  for (const midi of midiNotes) {
    const freq = midiToFreq(midi)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(Math.max(peak * 0.35, 0.001), start + 1)
    gain.gain.exponentialRampToValueAtTime(0.0005, stop)
    for (const dest of destinations) gain.connect(dest)

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    osc.connect(gain)
    osc.start(start)
    osc.stop(stop + 0.1)

    const overtone = ctx.createOscillator()
    overtone.type = 'sine'
    overtone.frequency.value = freq * 2
    const overtoneGain = ctx.createGain()
    overtoneGain.gain.setValueAtTime(0.18, start)
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, start + 0.6)
    overtone.connect(overtoneGain)
    overtoneGain.connect(gain)
    overtone.start(start)
    overtone.stop(start + 0.7)
  }
}

/** Violoncelle seul : une seule note grave tenue, dent de scie filtrée, vibrato qui arrive après l'attaque. */
function playCelloDrone(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  rootMidi: number,
  start: number,
  chordSeconds: number,
) {
  const freq = midiToFreq(rootMidi - 12)
  const attack = Math.min(1.6, chordSeconds * 0.3)
  const release = Math.min(2, chordSeconds * 0.3)
  const stop = start + chordSeconds + release
  const peak = 0.11

  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1100
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + attack)
  gain.gain.setValueAtTime(peak, start + chordSeconds)
  gain.gain.linearRampToValueAtTime(0, stop)
  filter.connect(gain)
  for (const dest of destinations) gain.connect(dest)

  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.value = freq
  osc.connect(filter)
  osc.start(start)
  osc.stop(stop + 0.1)
  addVibrato(ctx, osc.detune, start, stop + 0.1, 5, 18, attack + 0.3)
}

/** Harpe : arpège pincé, attaque brillante puis filtre passe-bas qui referme le timbre en s'éteignant. */
function playHarpPluck(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  midiNotes: number[],
  start: number,
  chordSeconds: number,
) {
  const pattern = [0, 1, 2, 1]
  const steps = 4
  const stepDuration = chordSeconds / steps
  const decay = Math.min(stepDuration * 3, 3)

  for (let i = 0; i < steps; i++) {
    const noteIndex = pattern[i % pattern.length]
    const midi = midiNotes[noteIndex] + 12
    const freq = midiToFreq(midi)
    const noteStart = start + i * stepDuration

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.Q.value = 0.6
    filter.frequency.setValueAtTime(5200, noteStart)
    filter.frequency.exponentialRampToValueAtTime(700, noteStart + decay)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(0.13, noteStart + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + decay)
    filter.connect(gain)
    for (const dest of destinations) gain.connect(dest)

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    osc.connect(filter)
    osc.start(noteStart)
    osc.stop(noteStart + decay + 0.1)
  }
}

/** Génère une courte phrase mélodique dans la gamme autour d'un degré, pour les instruments monophoniques. */
function noteAtDegree(scale: number[], rootMidi: number, degree: number): number {
  const len = scale.length
  const octave = Math.floor(degree / len)
  const idx = ((degree % len) + len) % len
  return rootMidi + scale[idx] + octave * 12 + 12
}

/** Piano (mélodie) : petite phrase mélodique autour du degré de l'accord, pincement + timbre piano. */
function playPianoMelody(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  scale: number[],
  rootMidi: number,
  degree: number,
  start: number,
  chordSeconds: number,
) {
  const motif = [degree, degree + 2, degree + 1, degree]
  const stepDuration = chordSeconds / motif.length

  motif.forEach((d, i) => {
    const freq = midiToFreq(noteAtDegree(scale, rootMidi, d))
    const noteStart = start + i * stepDuration
    const decay = Math.min(stepDuration * 2.2, 2.2)

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(0.14, noteStart + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, noteStart + decay)
    for (const dest of destinations) gain.connect(dest)

    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    osc.connect(gain)
    osc.start(noteStart)
    osc.stop(noteStart + decay + 0.1)

    const overtone = ctx.createOscillator()
    overtone.type = 'sine'
    overtone.frequency.value = freq * 2
    const overtoneGain = ctx.createGain()
    overtoneGain.gain.setValueAtTime(0.12, noteStart)
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4)
    overtone.connect(overtoneGain)
    overtoneGain.connect(gain)
    overtone.start(noteStart)
    overtone.stop(noteStart + 0.5)
  })
}

/** Flûte : ligne mélodique legato, sinusoïde + léger souffle filtré, vibrato tardif. */
function playFlute(
  ctx: OfflineAudioContext,
  destinations: AudioNode[],
  scale: number[],
  rootMidi: number,
  degree: number,
  start: number,
  chordSeconds: number,
) {
  const phrase = [degree, degree + 1, degree]
  const stepDuration = chordSeconds / phrase.length

  phrase.forEach((d, i) => {
    const freq = midiToFreq(noteAtDegree(scale, rootMidi, d))
    const noteStart = start + i * stepDuration
    const noteLen = stepDuration * 0.95
    const attack = Math.min(0.25, noteLen * 0.3)
    const release = Math.min(0.3, noteLen * 0.3)
    const noteStop = noteStart + noteLen

    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, noteStart)
    gain.gain.linearRampToValueAtTime(0.09, noteStart + attack)
    gain.gain.setValueAtTime(0.09, noteStop - release)
    gain.gain.linearRampToValueAtTime(0, noteStop)
    for (const dest of destinations) gain.connect(dest)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    osc.connect(gain)
    addVibrato(ctx, osc.detune, noteStart, noteStop + 0.1, 4.8, 12, attack)
    osc.start(noteStart)
    osc.stop(noteStop + 0.1)

    // Souffle : bruit filtré autour de la fondamentale, à très faible niveau.
    const noiseBuffer = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * noteLen)), ctx.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let s = 0; s < noiseData.length; s++) noiseData[s] = Math.random() * 2 - 1
    const noiseSource = ctx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    const breathFilter = ctx.createBiquadFilter()
    breathFilter.type = 'bandpass'
    breathFilter.frequency.value = freq
    breathFilter.Q.value = 3
    const breathGain = ctx.createGain()
    breathGain.gain.value = 0.015
    noiseSource.connect(breathFilter)
    breathFilter.connect(breathGain)
    breathGain.connect(gain)
    noiseSource.start(noteStart)
  })
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
      switch (spec.voicing) {
        case 'organ':
          playOrgan(ctx, destinations, chordMidis, t, spec.chordSeconds)
          break
        case 'strings':
          playStrings(ctx, destinations, chordMidis, t, spec.chordSeconds)
          break
        case 'choir':
          playChoir(ctx, destinations, chordMidis, t, spec.chordSeconds)
          break
        case 'piano-pad':
          playPianoPad(ctx, destinations, chordMidis, t, spec.chordSeconds)
          break
        case 'cello-drone':
          playCelloDrone(ctx, destinations, spec.rootMidi, t, spec.chordSeconds)
          break
        case 'harp':
          playHarpPluck(ctx, destinations, chordMidis, t, spec.chordSeconds)
          break
        case 'piano-melody':
          playPianoMelody(ctx, destinations, spec.scale, spec.rootMidi, degree, t, spec.chordSeconds)
          break
        case 'flute':
          playFlute(ctx, destinations, spec.scale, spec.rootMidi, degree, t, spec.chordSeconds)
          break
        case 'bell':
          playBell(ctx, destinations, chordMidis, t, spec.chordSeconds)
          break
      }
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

async function buildTrack(spec: TrackSpec): Promise<Track> {
  const buffer = await renderTrack(spec)
  const blob = audioBufferToWavBlob(buffer)
  return {
    id: builtInTrackId(spec.slug),
    name: spec.title,
    artist: 'Céréma',
    blob,
    mimeType: 'audio/wav',
    duration: buffer.duration,
    createdAt: Date.now(),
    license: BUILT_IN_LICENSE,
  }
}

/** Génère (si besoin) et ajoute les 20 pistes de la bibliothèque libre de droit. Idempotent. */
export async function importBuiltInLibrary(
  onProgress?: (p: BuiltInLibraryProgress) => void,
): Promise<number> {
  let added = 0
  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i]
    onProgress?.({ index: i + 1, total: SPECS.length, title: spec.title })
    const existing = await db.tracks.get(builtInTrackId(spec.slug))
    if (existing) continue

    await db.tracks.add(await buildTrack(spec))
    added += 1
    await new Promise((r) => setTimeout(r, 0))
  }
  return added
}

/**
 * Régénère l'audio des 20 pistes en place (même identifiants, donc les
 * affectations déjà faites dans les cérémonies restent valides) — utile pour
 * profiter d'une nouvelle version des sonorités sans tout réimporter à la main.
 */
export async function regenerateBuiltInLibrary(
  onProgress?: (p: BuiltInLibraryProgress) => void,
): Promise<number> {
  let updated = 0
  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i]
    onProgress?.({ index: i + 1, total: SPECS.length, title: spec.title })
    await db.tracks.put(await buildTrack(spec))
    updated += 1
    await new Promise((r) => setTimeout(r, 0))
  }
  return updated
}

export function builtInLibrarySpecs() {
  return SPECS.map((s) => ({ slug: s.slug, title: s.title, mood: s.mood }))
}
