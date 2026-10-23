import type { Biography, Ceremony } from '../types'
import { createEmptyBiography } from '../types'
import {
  agree,
  deElided,
  disjunctive,
  ensureSentence,
  formatDate,
  joinWithAnd,
  objectPronoun,
  pronounCap,
  pronounLow,
} from './biographyComposer'
import { answer, answerList, meetingSections, readField, traitForms } from './meetingGuide'

/**
 * Rédaction des textes de la cérémonie à partir des notes prises pendant la rencontre :
 * les notes sont des fragments (« institutrice pendant 30 ans à Rezé »), jamais des
 * phrases. Chaque fragment est donc posé dans une tournure qui l'accueille tel quel
 * (après deux-points, en apposition…) plutôt que greffé derrière un sujet, ce qui
 * produirait des phrases bancales.
 *
 * Le tirage des formulations est déterministe (graine = dossier) : l'aperçu montré
 * pendant l'entretien est exactement le texte créé à la validation.
 */

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function seededRandom(seedText: string): () => number {
  let h = 1779033703
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353)
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Ctx {
  name: string
  /** Prénom ou surnom pour les passages plus intimes ; à défaut, le nom complet. */
  short: string
  g: Biography['gender']
  bio: Biography
  pick: <T>(options: T[]) => T
  c: Ceremony
}

function context(c: Ceremony, variant = 0): Ctx {
  const rand = seededRandom(`${c.id}:${variant}`)
  const name = c.deceasedName.trim() || 'le défunt'
  const nickname = answer(c, 'nickname').replace(/[«»"]/g, '').trim()
  return {
    name,
    short: nickname || name,
    g: (c.biography ?? createEmptyBiography()).gender,
    bio: c.biography ?? createEmptyBiography(),
    pick: (options) => options[Math.floor(rand() * options.length)],
    c,
  }
}

/** Fragment de notes rendu lisible après deux-points : ponctuation finale garantie. */
function frag(text: string): string {
  return ensureSentence(text.trim().replace(/\s*\n+\s*/g, ' ; '))
}

function traits(c: Ceremony, g: Biography['gender']): string[] {
  return answerList(c, 'threeWords').map((label) => {
    const forms = traitForms[label]
    if (!forms) return label.toLowerCase()
    return agree(g, forms[0], forms[1])
  })
}

function hasTone(c: Ceremony, tone: string): boolean {
  return answerList(c, 'tone').includes(tone)
}

// --- Éloge ----------------------------------------------------------------

export function writeEulogy(c: Ceremony, variant = 0): string {
  const x = context(c, variant)
  const { g, bio, pick } = x
  const P = pronounCap(g)
  const p = pronounLow(g)
  const paragraphs: string[] = []

  // Ouverture : qui il/elle était, d'où il/elle venait.
  const opening: string[] = []
  const nickname = answer(c, 'nickname').replace(/[«»"]/g, '').trim()
  const birth = [bio.birthDate ? `le ${formatDate(bio.birthDate)}` : '', bio.birthPlace ? `à ${bio.birthPlace.trim()}` : '']
    .filter(Boolean)
    .join(' ')
  const nameWithNick = nickname ? `${x.name}, que beaucoup appelaient « ${nickname} »,` : x.name
  if (birth) {
    opening.push(
      `${nameWithNick} ${pick([agree(g, 'est né', 'est née'), 'a vu le jour', `est ${agree(g, 'venu', 'venue')} au monde`])} ${birth}.`,
    )
  } else if (nickname) {
    opening.push(`Pour beaucoup d'entre vous, ${x.name}, c'était tout simplement « ${nickname} ».`)
  }
  if (answer(c, 'childhood')) {
    opening.push(
      pick([
        `De son enfance, sa famille garde ces images : ${frag(answer(c, 'childhood'))}`,
        `Ses proches racontent ainsi ses premières années : ${frag(answer(c, 'childhood'))}`,
        `Tout commence là : ${frag(answer(c, 'childhood'))}`,
      ]),
    )
  }
  if (opening.length) paragraphs.push(opening.join(' '))

  // Le parcours : métier, engagements, lieux.
  const path: string[] = []
  if (bio.career?.trim()) {
    path.push(
      pick([
        `Sa vie professionnelle, d'abord : ${frag(bio.career)}`,
        `Il y a eu le travail, auquel ${p} a tant donné : ${frag(bio.career)}`,
        `Côté métier, ses proches retiennent ceci : ${frag(bio.career)}`,
      ]),
    )
  }
  if (bio.volunteering?.trim()) {
    path.push(
      pick([
        `Au-delà du travail, ${p} savait donner de son temps : ${frag(bio.volunteering)}`,
        `${P} s'engageait aussi pour les autres : ${frag(bio.volunteering)}`,
      ]),
    )
  }
  if (answer(c, 'places')) {
    path.push(
      pick([
        `Certains lieux ont compté plus que d'autres dans sa vie : ${frag(answer(c, 'places'))}`,
        `Sa vie s'est aussi écrite dans des lieux qui lui étaient chers : ${frag(answer(c, 'places'))}`,
      ]),
    )
  }
  if (path.length) paragraphs.push(path.join(' '))

  // La famille.
  if (answer(c, 'family')) {
    paragraphs.push(
      pick([
        `Et puis il y avait sa famille, qui comptait plus que tout : ${frag(answer(c, 'family'))}`,
        `Au cœur de sa vie, il y avait les siens : ${frag(answer(c, 'family'))}`,
      ]),
    )
  }

  // Le portrait : caractère, passions, humour, objet, fierté.
  const portrait: string[] = []
  const t = traits(c, g)
  if (t.length) {
    portrait.push(
      pick([
        `Si l'on demande à ses proches de ${objectPronoun(g)} décrire, les mêmes mots reviennent : ${joinWithAnd(t)}.`,
        `${P} était ${joinWithAnd(t)}. Ceux qui ${objectPronoun(g)} connaissaient le savent.`,
        `${joinWithAnd(t).replace(/^./, (m) => m.toUpperCase())} : c'est ainsi que sa famille ${objectPronoun(g)} décrit.`,
      ]),
    )
  }
  if (bio.passions?.trim()) {
    portrait.push(
      pick([
        `Ses passions tenaient une grande place dans sa vie : ${frag(bio.passions)}`,
        `On ne peut pas parler ${deElided(disjunctive(g))} sans évoquer ce qu'${p} aimait : ${frag(bio.passions)}`,
      ]),
    )
  }
  if (answer(c, 'humor')) {
    portrait.push(
      pick([
        `Et ses proches sourient encore en se rappelant ce qui ${objectPronoun(g)} faisait rire, ses mots à ${disjunctive(g)} : ${frag(answer(c, 'humor'))}`,
        `Il y avait aussi son humour, ses expressions, que personne n'a oubliés : ${frag(answer(c, 'humor'))}`,
      ]),
    )
  }
  if (bio.symbolicObject?.trim()) {
    portrait.push(
      pick([
        `${P} restera ${agree(g, 'associé', 'associée')}, dans la mémoire des siens, à ${bio.symbolicObject.trim().replace(/[.]$/, '')}.`,
        `Il suffira longtemps d'un détail pour ${objectPronoun(g)} retrouver : ${frag(bio.symbolicObject)}`,
      ]),
    )
  }
  if (bio.proudestOf?.trim()) {
    portrait.push(
      pick([
        `Sa plus grande fierté ? ${frag(bio.proudestOf).replace(/^./, (m) => m.toUpperCase())}`,
        `${P} était ${agree(g, 'fier', 'fière')} ${deElided(bio.proudestOf.trim().replace(/[.]$/, ''))}.`,
      ]),
    )
  }
  if (portrait.length) paragraphs.push(portrait.join(' '))

  // Les souvenirs racontés par la famille.
  const anecdotes = answer(c, 'anecdotes')
    .split(/\n\s*\n|\n/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => ensureSentence(a.replace(/^./, (m) => m.toUpperCase())))
  const bioAnecdotes = bio.anecdotes.map((a) => a.trim()).filter(Boolean).map(ensureSentence)
  const allAnecdotes = [...anecdotes, ...bioAnecdotes.filter((a) => !anecdotes.includes(a))]
  if (allAnecdotes.length) {
    paragraphs.push(
      `${pick([
        "Ses proches m'ont confié quelques souvenirs, parmi tant d'autres.",
        `Ceux qui l'ont ${agree(g, 'connu', 'connue')} aiment raconter.`,
        `Quelques souvenirs, pour ${objectPronoun(g)} faire revivre un instant.`,
      ])}\n\n${allAnecdotes.join('\n\n')}`,
    )
  }
  if (answer(c, 'sharedMemory')) {
    paragraphs.push(
      pick([
        `Un souvenir, surtout, rassemble toute la famille : ${frag(answer(c, 'sharedMemory'))}`,
        `S'il fallait n'en garder qu'un, ce serait celui-ci, partagé par tous : ${frag(answer(c, 'sharedMemory'))}`,
      ]),
    )
  }

  // Ce qu'il/elle laisse.
  const legacy: string[] = []
  if (answer(c, 'legacy')) {
    legacy.push(
      pick([
        `Ce qu'${p} vous a transmis, vous le portez désormais : ${frag(answer(c, 'legacy'))}`,
        `${P} laisse derrière ${disjunctive(g)} bien plus qu'un souvenir : ${frag(answer(c, 'legacy'))}`,
      ]),
    )
  }
  if (bio.lovedOnesView?.trim()) {
    legacy.push(`Ses proches le disent avec leurs mots : ${frag(bio.lovedOnesView)}`)
  }
  if (legacy.length) paragraphs.push(legacy.join(' '))

  // Clôture.
  const saying = bio.sayings?.trim().replace(/^[«"\s]+|[»"\s]+$/g, '')
  if (saying) {
    paragraphs.push(
      pick([
        `${P} disait souvent : « ${saying} ». Aujourd'hui, ces mots résonnent un peu autrement.`,
        `« ${saying} » : combien de fois l'avez-vous entendu${g === 'femme' ? 'e' : ''} le dire ? Gardons ces mots avec nous.`,
      ]),
    )
  }
  paragraphs.push(
    pick([
      `Nous n'oublierons pas ${x.short}.`,
      `Nous garderons ${deElided(disjunctive(g))} tout ce qu'${p} nous a donné.`,
      `${x.short} ne nous quitte pas tout à fait : ${p} demeure dans chacun de ces souvenirs.`,
    ]),
  )

  return paragraphs.join('\n\n')
}

// --- Textes courts du maître de cérémonie --------------------------------

export function writeWelcome(c: Ceremony, variant = 0): string {
  const x = context(c, variant)
  const { g, pick } = x
  const nickname = answer(c, 'nickname').replace(/[«»"]/g, '').trim()
  const lines: string[] = [
    pick([
      `Mesdames, messieurs, chère famille, chers amis, nous sommes réunis aujourd'hui pour rendre hommage à ${x.name}${nickname ? `, que beaucoup d'entre vous appelaient « ${nickname} »` : ''}.`,
      `Chère famille, chers amis, bienvenue. Merci d'être venus si nombreux dire au revoir à ${x.name}${nickname ? `, « ${nickname} » pour les intimes` : ''}.`,
    ]),
  ]
  if (hasTone(c, "Avec une touche d'humour")) {
    lines.push(
      `Il y aura des larmes, sans doute, mais aussi quelques sourires : ${x.short} l'aurait ${pick(['voulu', 'souhaité'])} ainsi.`,
    )
  } else if (hasTone(c, 'Lumineux') || hasTone(c, 'Chaleureux')) {
    lines.push(`Sa famille a souhaité que ce moment lui ressemble : chaleureux, tourné vers la vie qu'${pronounLow(g)} a menée.`)
  } else {
    lines.push(`Prenons ensemble ce temps pour nous souvenir ${deElided(disjunctive(g))}, et pour entourer ceux qui ${objectPronoun(g)} pleurent.`)
  }
  const spirit = answer(c, 'spirituality')
  if (spirit === 'spirituelle') lines.push("Chacun pourra, à sa manière et selon ce qu'il croit, lui adresser ses pensées.")
  if (spirit === 'laique') lines.push('Cette cérémonie est un moment de mémoire et de partage, ouvert à chacun.')
  return lines.join(' ')
}

export function writeSpeakerIntro(c: Ceremony, speakerLine: string, variant = 0): string {
  const x = context(c, variant)
  const who = speakerLine.split(/\s+[—–-]\s+/)[0].trim()
  return x.pick([
    `J'invite maintenant ${who} à nous rejoindre.`,
    `${who} a souhaité prendre la parole. Je l'invite à s'avancer.`,
    `C'est maintenant au tour de ${who}, qui a souhaité dire quelques mots.`,
  ])
}

const gestureAnnouncements: Record<string, (x: Ctx) => string> = {
  'Dépôt de fleurs': (x) =>
    `Je vous invite, à votre rythme, à venir déposer une fleur près ${deElided(disjunctive(x.g))}, en commençant par sa famille.`,
  Bougies: () => 'Je vous invite à venir allumer une bougie, en pensée pour celles et ceux que nous aimons.',
  Pétales: (x) => `Je vous invite à venir déposer quelques pétales, en signe d'au revoir à ${x.short}.`,
  'Recueillement devant le cercueil': () =>
    'Ceux qui le souhaitent peuvent maintenant venir se recueillir un instant, en commençant par la famille.',
  'Minute de silence': (x) => `Je vous propose une minute de silence, pour penser à ${x.short}, chacun à sa manière.`,
  'Objets déposés': () => 'Ceux qui ont apporté un objet, un mot, un souvenir peuvent venir le déposer maintenant.',
  "Livre d'or": () => "À la sortie, un livre d'or vous attend : chaque mot laissé sera remis à la famille.",
}

export function writeGestures(c: Ceremony, variant = 0): string {
  const x = context(c, variant)
  return answerList(c, 'gestures')
    .map((gesture) => gestureAnnouncements[gesture]?.(x))
    .filter(Boolean)
    .join('\n\n')
}

export function writeClosing(c: Ceremony, variant = 0): string {
  const x = context(c, variant)
  const { g, pick } = x
  const saying = x.bio.sayings?.trim().replace(/^[«"\s]+|[»"\s]+$/g, '')
  const lines = [
    pick([
      `Au nom de la famille de ${x.name}, je vous remercie de votre présence et de votre soutien.`,
      `La famille de ${x.name} vous remercie d'être venus, et de tout ce que vous lui avez témoigné.`,
    ]),
  ]
  if (saying) lines.push(`Comme ${pronounLow(g)} le disait si souvent : « ${saying} ».`)
  lines.push(
    pick([
      `Continuons de porter ${x.short} en nous.`,
      'Gardons son souvenir dans nos cœurs, et prenons soin les uns des autres.',
    ]),
  )
  return lines.join(' ')
}

// --- Consigne pour la rédaction par IA -----------------------------------

/**
 * Notes de l'entretien mises en forme pour la rédaction de l'éloge par IA, avec les
 * consignes de ton et, surtout, les sujets à ne pas aborder — jamais transmis comme
 * une information à utiliser.
 */
export function eulogyAiInstructions(c: Ceremony): string {
  const g = (c.biography ?? createEmptyBiography()).gender
  const genderText =
    g === 'femme' ? 'une femme (accords au féminin)' : g === 'homme' ? 'un homme (accords au masculin)' : 'genre non précisé (formulations neutres)'
  const excluded = new Set(['sensitive', 'avoid', 'tone', 'spirituality', 'deceasedName', 'gender', 'date', 'time', 'location', 'familyContact', 'officiant', 'advisor', 'ceremonyType'])
  const notes: string[] = []
  for (const section of meetingSections) {
    if (!['dossier', 'vie', 'portrait', 'souvenirs'].includes(section.id)) continue
    for (const field of section.fields) {
      if (excluded.has(field.id)) continue
      const v = readField(c, field)
      const text = Array.isArray(v) ? v.map((l) => traitForms[l] ? agree(g, ...traitForms[l]) : l).join(', ') : v.trim()
      if (text) notes.push(`- ${field.label} : ${text}`)
    }
  }
  const tone = answerList(c, 'tone')
  const header = [
    "Rédige l'éloge funèbre principal (environ 5 à 7 minutes de lecture à voix haute), à partir des notes ci-dessous prises par le maître de cérémonie pendant l'entretien avec la famille. Ces notes sont des fragments : mets-les en phrases fluides, dans un texte construit (ouverture, parcours, portrait, souvenirs, ce qu'il/elle laisse, mot final).",
    `Le défunt est ${genderText}.`,
    tone.length ? `Ton souhaité par la famille : ${tone.join(', ')}.` : '',
    answer(c, 'spirituality') ? `Dimension spirituelle : ${answer(c, 'spirituality')}.` : '',
    answer(c, 'sensitive') || answer(c, 'avoid')
      ? `IMPÉRATIF — ne rien évoquer de ce qui suit, ni directement ni par allusion : ${[answer(c, 'sensitive'), answer(c, 'avoid')].filter(Boolean).join(' ; ')}`
      : '',
  ].filter(Boolean)
  return `${header.join('\n')}\n\nNotes de l'entretien :\n${notes.join('\n')}`
}
