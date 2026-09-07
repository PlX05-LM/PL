import type { Biography } from '../types'

function agree(gender: Biography['gender'], masculine: string, feminine: string): string {
  if (gender === 'homme') return masculine
  if (gender === 'femme') return feminine
  // Accord non précisé : on garde la forme masculine avec la terminaison féminine entre
  // parenthèses, comme ailleurs dans l'application (ex. bibliothèque de textes-types).
  const suffix = feminine.slice(masculine.length)
  return suffix ? `${masculine}(${suffix})` : masculine
}

function pronounCap(gender: Biography['gender']): string {
  if (gender === 'homme') return 'Il'
  if (gender === 'femme') return 'Elle'
  return 'Il/elle'
}

function pronounLow(gender: Biography['gender']): string {
  if (gender === 'homme') return 'il'
  if (gender === 'femme') return 'elle'
  return 'il/elle'
}

/** Pronom tonique, utilisé après une préposition (« à lui », jamais « à il »). */
function disjunctive(gender: Biography['gender']): string {
  if (gender === 'homme') return 'lui'
  if (gender === 'femme') return 'elle'
  return 'lui/elle'
}

/** Pronom complément d'objet direct atone (« on le/la décrivait »). */
function objectPronoun(gender: Biography['gender']): string {
  if (gender === 'homme') return 'le'
  if (gender === 'femme') return 'la'
  return 'le/la'
}

/** Élision de « de » devant une voyelle ou un h muet : « de un ami » → « d'un ami ». */
function deElided(text: string): string {
  const trimmed = text.trim()
  return /^[aeiouhàâéèêëîïôùûAEIOUHÀÂÉÈÊËÎÏÔÙÛ]/.test(trimmed) ? `d'${trimmed}` : `de ${trimmed}`
}

/** Élision de « que » devant une voyelle ou un h muet : « que il » → « qu'il ». */
function queElided(text: string): string {
  const trimmed = text.trim()
  return /^[aeiouhàâéèêëîïôùûAEIOUHÀÂÉÈÊËÎÏÔÙÛ]/.test(trimmed) ? `qu'${trimmed}` : `que ${trimmed}`
}

/** Garantit une ponctuation finale, pour les fragments libres qui terminent une phrase. */
function ensureSentence(text: string): string {
  const trimmed = text.trim()
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`
}

/** Tire une formulation au hasard parmi plusieurs — appelée à chaque génération, pour
 * qu'un clic sur « régénérer » propose une autre tournure plutôt que de répéter mot pour
 * mot le même texte. */
function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)]
}

/**
 * Assemble un premier jet d'éloge en prose à partir des informations recueillies
 * auprès de la famille. Ce n'est pas une génération par IA : un montage de phrases —
 * choisies parmi plusieurs formulations à chaque génération pour varier le style et le
 * vocabulaire — à relire et personnaliser avant de l'insérer dans le déroulé.
 */
export function composeBiographyDraft(deceasedName: string, bio: Biography): string {
  const name = deceasedName.trim() || 'Le défunt'
  const g = bio.gender
  const paragraphs: string[] = []

  // La première phrase du texte nomme le défunt ; les suivantes emploient un pronom.
  let nameUsed = false
  function subjectCap(): string {
    if (nameUsed) return pronounCap(g)
    nameUsed = true
    return name
  }

  // --- Naissance, fratrie, scolarité ---
  const birthBits: string[] = []
  if (bio.birthDate) birthBits.push(`le ${formatDate(bio.birthDate)}`)
  if (bio.birthPlace) birthBits.push(`à ${bio.birthPlace}`)
  let intro = ''
  if (birthBits.length > 0) {
    const subject = subjectCap()
    const bits = birthBits.join(' ')
    const verb = pick([
      agree(g, 'est né', 'est née'),
      'a vu le jour',
      `est ${agree(g, 'venu', 'venue')} au monde`,
    ])
    intro = `${subject} ${verb} ${bits}.`
  }
  if (bio.siblings?.trim()) {
    const subject = subjectCap()
    const lead = pick(['grandit aux côtés', 'passe son enfance aux côtés'])
    const sentence = `${subject} ${lead} ${deElided(bio.siblings)}.`
    intro = intro ? `${intro} ${sentence}` : sentence
  }
  if (bio.education?.trim()) {
    const subject = nameUsed ? pronounCap(g) : name
    nameUsed = true
    const sentence = `${subject} ${ensureSentence(bio.education)}`
    intro = intro ? `${intro} ${sentence}` : sentence
  }
  if (intro) paragraphs.push(intro)

  // --- Vie professionnelle et engagements ---
  const workBits: string[] = []
  if (bio.career?.trim()) {
    const connector = pick(['Sur le plan professionnel,', 'Dans sa vie professionnelle,', 'Côté carrière,'])
    const subject = nameUsed ? pronounLow(g) : name
    nameUsed = true
    workBits.push(`${connector} ${subject} ${ensureSentence(bio.career)}`)
  }
  if (bio.volunteering?.trim()) {
    const sentence = pick([
      `${pronounCap(g)} s'investissait par ailleurs ${ensureSentence(bio.volunteering)}`,
      `${pronounCap(g)} donnait aussi de son temps ${ensureSentence(bio.volunteering)}`,
      `En parallèle, ${pronounLow(g)} s'engageait ${ensureSentence(bio.volunteering)}`,
    ])
    workBits.push(sentence)
    nameUsed = true
  }
  if (workBits.length > 0) paragraphs.push(workBits.join(' '))

  // --- Conjoint(e), enfants, petits-enfants ---
  const familyBits: string[] = []
  if (bio.metSpouse?.trim()) familyBits.push(ensureSentence(bio.metSpouse))
  if (bio.spouseName?.trim()) {
    const weddingBit = bio.weddingDate ? ` le ${formatDate(bio.weddingDate)}` : ''
    const spouse = bio.spouseName.trim()
    const sentence = pick([
      `${pronounCap(g)} a épousé ${spouse}${weddingBit}.`,
      `${pronounCap(g)} a uni sa vie à ${spouse}${weddingBit}.`,
      `${pronounCap(g)} ${agree(g, "s'est marié", "s'est mariée")} avec ${spouse}${weddingBit}.`,
    ])
    familyBits.push(sentence)
    nameUsed = true
  }
  if (bio.hasChildren && bio.children.length > 0) {
    const names = bio.children.map((c) => {
      // Le genre de chaque enfant n'est pas demandé séparément : accord neutre.
      const b = c.birthDate ? ` (né(e) le ${formatDate(c.birthDate)})` : ''
      return `${c.name.trim()}${b}`
    })
    const verb = bio.children.length > 1 ? 'sont nés' : 'est né(e)'
    const sentence = pick([
      `De cette union ${verb} ${joinWithAnd(names)}.`,
      `Cette union donne naissance à ${joinWithAnd(names)}.`,
      `Le couple devient parents de ${joinWithAnd(names)}.`,
    ])
    familyBits.push(sentence)
  }
  if (bio.grandchildren?.trim()) {
    const gc = bio.grandchildren.trim()
    const sentence = pick([
      `${pronounCap(g)} a eu la joie de connaître ses petits-enfants : ${gc}.`,
      `${pronounCap(g)} a eu la joie de voir grandir ses petits-enfants : ${gc}.`,
      `${pronounCap(g)} profitait de chaque moment avec ses petits-enfants : ${gc}.`,
    ])
    familyBits.push(sentence)
  }
  if (familyBits.length > 0) paragraphs.push(familyBits.join(' '))

  // --- Passions ---
  if (bio.passions?.trim()) {
    const subject = nameUsed ? pronounCap(g) : subjectCap()
    const passions = bio.passions.trim()
    const sentence = pick([
      `${subject} ${agree(g, 'était passionné', 'était passionnée')} par ${passions}.`,
      `${subject} nourrissait une vraie passion pour ${passions}.`,
      `${subject} consacrait volontiers son temps libre à ses passions : ${passions}.`,
    ])
    paragraphs.push(sentence)
    nameUsed = true
  }

  // --- Portrait et personnalité ---
  const portraitBits: string[] = []
  if (bio.characterTraits?.trim()) {
    const subject = nameUsed ? pronounCap(g) : subjectCap()
    const traits = bio.characterTraits.trim()
    const sentence = pick([
      `${subject} était ${traits}.`,
      `On ${objectPronoun(g)} décrivait comme ${traits}.`,
      `Ceux qui ${objectPronoun(g)} connaissaient diront combien ${pronounLow(g)} était ${traits}.`,
    ])
    portraitBits.push(sentence)
    nameUsed = true
  }
  if (bio.sayings?.trim()) {
    const saying = bio.sayings.trim()
    portraitBits.push(
      pick([
        `${pronounCap(g)} aimait répéter : « ${saying} ».`,
        `On l'entendait souvent dire : « ${saying} ».`,
        `Une phrase qui lui ressemblait bien : « ${saying} ».`,
      ]),
    )
  }
  if (bio.symbolicObject?.trim()) {
    const obj = bio.symbolicObject.trim()
    portraitBits.push(
      pick([
        `Beaucoup penseront à ${disjunctive(g)} en repensant à ${obj}.`,
        `Un souvenir suffit à raviver sa présence : ${obj}.`,
        `${pronounCap(g)} restera ${agree(g, 'associé', 'associée')} à ${obj} dans la mémoire de ses proches.`,
      ]),
    )
  }
  if (bio.proudestOf?.trim()) {
    portraitBits.push(
      pick([
        `${pronounCap(g)} était ${agree(g, 'fier', 'fière')} ${deElided(bio.proudestOf)}.`,
        `${pronounCap(g)} tirait une grande fierté ${deElided(bio.proudestOf)}.`,
      ]),
    )
  }
  if (bio.guidingValue?.trim()) {
    const value = bio.guidingValue.trim()
    portraitBits.push(
      pick([
        `${pronounCap(g)} vivait selon un principe simple : ${value}.`,
        `Une valeur guidait chacun de ses choix : ${value}.`,
        `Rien ne comptait plus, à ses yeux, ${queElided(value)}.`,
      ]),
    )
  }
  if (portraitBits.length > 0) paragraphs.push(portraitBits.join(' '))

  // --- Anecdotes ---
  const anecdotes = bio.anecdotes.map((a) => a.trim()).filter(Boolean).map(ensureSentence)
  if (anecdotes.length > 0) {
    const lead = pick([
      "Quelques souvenirs, parmi tant d'autres :",
      `Ceux qui l'ont ${agree(g, 'connu', 'connue')} aiment raconter :`,
      'Voici quelques anecdotes qui lui ressemblent :',
    ])
    paragraphs.push(`${lead}\n\n${anecdotes.join('\n\n')}`)
  }

  // --- Le regard des proches ---
  if (bio.lovedOnesView?.trim()) {
    const lead = pick([
      "Voici le portrait qu'en dressent ses proches :",
      `Ainsi ${objectPronoun(g)} décrivent ses proches :`,
    ])
    paragraphs.push(`${lead}\n\n${ensureSentence(bio.lovedOnesView)}`)
  }

  // --- Mot de clôture ---
  if (bio.legacyWish?.trim()) {
    const wish = bio.legacyWish.trim()
    paragraphs.push(
      pick([
        `S'il fallait retenir un dernier mot de ${name}, ce serait peut-être : « ${wish} ».`,
        `Et si l'on ne devait garder qu'une phrase, ce serait celle-ci : « ${wish} ».`,
        `${name} nous laisse peut-être ces mots : « ${wish} ».`,
      ]),
    )
  }

  if (bio.notes?.trim()) {
    paragraphs.push(ensureSentence(bio.notes))
  }

  return paragraphs.join('\n\n')
}

export function hasAnyBiographyContent(bio: Biography): boolean {
  return Boolean(
    bio.birthDate ||
      bio.birthPlace ||
      bio.education?.trim() ||
      bio.siblings?.trim() ||
      bio.career?.trim() ||
      bio.volunteering?.trim() ||
      bio.metSpouse?.trim() ||
      bio.spouseName?.trim() ||
      (bio.hasChildren && bio.children.length > 0) ||
      bio.grandchildren?.trim() ||
      bio.passions?.trim() ||
      bio.characterTraits?.trim() ||
      bio.sayings?.trim() ||
      bio.symbolicObject?.trim() ||
      bio.proudestOf?.trim() ||
      bio.guidingValue?.trim() ||
      bio.anecdotes.some((a) => a.trim()) ||
      bio.lovedOnesView?.trim() ||
      bio.legacyWish?.trim() ||
      bio.notes?.trim(),
  )
}
