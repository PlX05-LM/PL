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

/** Élision de « de » devant une voyelle ou un h muet : « de un ami » → « d'un ami ». */
function deElided(text: string): string {
  const trimmed = text.trim()
  return /^[aeiouhàâéèêëîïôùûAEIOUHÀÂÉÈÊËÎÏÔÙÛ]/.test(trimmed) ? `d'${trimmed}` : `de ${trimmed}`
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

/**
 * Assemble un premier jet d'éloge en prose à partir des informations recueillies
 * auprès de la famille. Ce n'est pas une génération par IA : un simple montage de
 * phrases, à relire et personnaliser avant de l'insérer dans le déroulé.
 */
export function composeBiographyDraft(deceasedName: string, bio: Biography): string {
  const name = deceasedName.trim() || 'Le défunt'
  const paragraphs: string[] = []

  // La première phrase du texte nomme le défunt ; les suivantes emploient un pronom.
  let nameUsed = false
  function subjectCap(): string {
    if (nameUsed) return pronounCap(bio.gender)
    nameUsed = true
    return name
  }

  // --- Naissance, fratrie, scolarité ---
  const birthBits: string[] = []
  if (bio.birthDate) birthBits.push(`le ${formatDate(bio.birthDate)}`)
  if (bio.birthPlace) birthBits.push(`à ${bio.birthPlace}`)
  let intro = ''
  if (birthBits.length > 0) {
    intro = `${subjectCap()} ${agree(bio.gender, 'est né', 'est née')} ${birthBits.join(' ')}.`
  }
  if (bio.siblings?.trim()) {
    intro = intro
      ? `${intro} ${subjectCap()} grandit aux côtés ${deElided(bio.siblings)}.`
      : `${subjectCap()} grandit aux côtés ${deElided(bio.siblings)}.`
  }
  if (bio.education?.trim()) {
    const subject = nameUsed ? pronounCap(bio.gender) : name
    nameUsed = true
    const sentence = `${subject} ${ensureSentence(bio.education)}`
    intro = intro ? `${intro} ${sentence}` : sentence
  }
  if (intro) paragraphs.push(intro)

  // --- Vie professionnelle et engagements ---
  const workBits: string[] = []
  if (bio.career?.trim()) {
    workBits.push(`Sur le plan professionnel, ${nameUsed ? pronounLow(bio.gender) : name} ${ensureSentence(bio.career)}`)
    nameUsed = true
  }
  if (bio.volunteering?.trim()) {
    workBits.push(`${pronounCap(bio.gender)} s'investissait par ailleurs ${ensureSentence(bio.volunteering)}`)
    nameUsed = true
  }
  if (workBits.length > 0) paragraphs.push(workBits.join(' '))

  // --- Conjoint(e), enfants, petits-enfants ---
  const familyBits: string[] = []
  if (bio.metSpouse?.trim()) familyBits.push(ensureSentence(bio.metSpouse))
  if (bio.spouseName?.trim()) {
    const weddingBit = bio.weddingDate ? ` le ${formatDate(bio.weddingDate)}` : ''
    familyBits.push(`${pronounCap(bio.gender)} a épousé ${bio.spouseName.trim()}${weddingBit}.`)
    nameUsed = true
  }
  if (bio.hasChildren && bio.children.length > 0) {
    const names = bio.children.map((c) => {
      // Le genre de chaque enfant n'est pas demandé séparément : accord neutre.
      const b = c.birthDate ? ` (né(e) le ${formatDate(c.birthDate)})` : ''
      return `${c.name.trim()}${b}`
    })
    const verb = bio.children.length > 1 ? 'sont nés' : 'est né(e)'
    familyBits.push(`De cette union ${verb} ${joinWithAnd(names)}.`)
  }
  if (bio.grandchildren?.trim()) {
    familyBits.push(`${pronounCap(bio.gender)} a eu la joie de connaître ses petits-enfants : ${bio.grandchildren.trim()}.`)
  }
  if (familyBits.length > 0) paragraphs.push(familyBits.join(' '))

  // --- Passions ---
  if (bio.passions?.trim()) {
    paragraphs.push(
      `${nameUsed ? pronounCap(bio.gender) : subjectCap()} ${agree(bio.gender, 'était passionné', 'était passionnée')} par ${bio.passions.trim()}.`,
    )
    nameUsed = true
  }

  // --- Portrait et personnalité ---
  const portraitBits: string[] = []
  if (bio.characterTraits?.trim()) {
    portraitBits.push(`${nameUsed ? pronounCap(bio.gender) : subjectCap()} était ${bio.characterTraits.trim()}.`)
    nameUsed = true
  }
  if (bio.sayings?.trim()) {
    portraitBits.push(`${pronounCap(bio.gender)} aimait répéter : « ${bio.sayings.trim()} ».`)
  }
  if (bio.symbolicObject?.trim()) {
    portraitBits.push(`Beaucoup penseront à ${disjunctive(bio.gender)} en repensant à ${bio.symbolicObject.trim()}.`)
  }
  if (bio.proudestOf?.trim()) {
    portraitBits.push(`${pronounCap(bio.gender)} était ${agree(bio.gender, 'fier', 'fière')} ${deElided(bio.proudestOf)}.`)
  }
  if (bio.guidingValue?.trim()) {
    portraitBits.push(`${pronounCap(bio.gender)} vivait selon un principe simple : ${bio.guidingValue.trim()}.`)
  }
  if (portraitBits.length > 0) paragraphs.push(portraitBits.join(' '))

  // --- Anecdotes ---
  const anecdotes = bio.anecdotes.map((a) => a.trim()).filter(Boolean).map(ensureSentence)
  if (anecdotes.length > 0) {
    paragraphs.push(anecdotes.join('\n\n'))
  }

  // --- Le regard des proches ---
  if (bio.lovedOnesView?.trim()) {
    paragraphs.push(ensureSentence(bio.lovedOnesView))
  }

  // --- Mot de clôture ---
  if (bio.legacyWish?.trim()) {
    paragraphs.push(`S'il fallait retenir un dernier mot de ${name}, ce serait peut-être : « ${bio.legacyWish.trim()} ».`)
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
