import Anthropic from '@anthropic-ai/sdk'

export interface Env {
  ANTHROPIC_API_KEY: string
  APP_TOKEN: string
  RATE_LIMIT: KVNamespace
  /** Liste d'origines autorisées séparées par des virgules (CORS). Optionnel. */
  ALLOWED_ORIGINS?: string
  /** Requêtes maximum par adresse IP et par heure. Optionnel, défaut 30. */
  RATE_LIMIT_PER_HOUR?: string
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://plx05-lm.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:4321',
]

const MODEL = 'claude-opus-5'

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean)) ?? DEFAULT_ALLOWED_ORIGINS
  const origin = request.headers.get('Origin') ?? ''
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
    Vary: 'Origin',
  }
}

function json(data: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

async function checkRateLimit(request: Request, env: Env): Promise<boolean> {
  const limit = Number(env.RATE_LIMIT_PER_HOUR ?? '30')
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
  const hourBucket = Math.floor(Date.now() / 3_600_000)
  const key = `rl:${ip}:${hourBucket}`
  const current = Number((await env.RATE_LIMIT.get(key)) ?? '0')
  if (current >= limit) return false
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 3700 })
  return true
}

const BIOGRAPHY_SYSTEM_PROMPT = `Tu es un rédacteur professionnel spécialisé dans la rédaction d'éloges funèbres en français, pour des maîtres de cérémonie. On te fournit des informations biographiques recueillies auprès de la famille d'une personne décédée. Rédige un texte en prose, à la troisième personne, sobre, chaleureux et respectueux, destiné à être lu à voix haute pendant une cérémonie funéraire.

Règles impératives :
- N'invente JAMAIS de faits, de dates, de noms ou d'anecdotes qui ne sont pas donnés dans les informations fournies. N'utilise que ce qui t'est communiqué.
- Respecte scrupuleusement les accords grammaticaux liés au genre indiqué (masculin, féminin, ou non précisé — dans ce dernier cas, formule les phrases pour rester neutre plutôt que d'utiliser des tournures comme « il/elle »).
- N'utilise ni markdown, ni listes à puces, ni titres : uniquement du texte en paragraphes séparés par une ligne vide, prêt à être lu tel quel à voix haute.
- Reste sobre et digne : évite les formules toutes faites, les clichés et l'emphase excessive.
- Si peu d'informations sont fournies, produis un texte court plutôt que de le combler avec des généralités vides.
- Ne mentionne jamais que tu es une intelligence artificielle, et ne commente pas ta propre rédaction : réponds uniquement avec le texte de l'éloge lui-même, rien d'autre.`

const SEGMENT_SYSTEM_PROMPT = `Tu es un rédacteur professionnel spécialisé dans la rédaction de textes de cérémonies funéraires en français, pour des maîtres de cérémonie. On te donne le type de cérémonie, le titre d'une étape du déroulé, et des mots-clés ou consignes du maître de cérémonie. Rédige le texte de cette étape, prêt à être lu à voix haute pendant la cérémonie.

Règles impératives :
- N'utilise ni markdown, ni listes à puces, ni titres : uniquement du texte en paragraphes, prêt à être lu tel quel à voix haute.
- Reste sobre, digne et adapté au type de cérémonie indiqué.
- N'invente pas de détails biographiques précis (dates, noms de proches, anecdotes) qui ne sont pas donnés dans les consignes.
- Ne mentionne jamais que tu es une intelligence artificielle, et ne commente pas ta propre rédaction : réponds uniquement avec le texte lui-même, rien d'autre.`

interface BiographyChildInput {
  name?: string
  birthDate?: string
}

interface BiographyInput {
  gender?: 'homme' | 'femme' | 'non-precise'
  birthDate?: string
  birthPlace?: string
  education?: string
  siblings?: string
  career?: string
  volunteering?: string
  metSpouse?: string
  spouseName?: string
  weddingDate?: string
  hasChildren?: boolean
  children?: BiographyChildInput[]
  grandchildren?: string
  passions?: string
  characterTraits?: string
  sayings?: string
  symbolicObject?: string
  proudestOf?: string
  guidingValue?: string
  anecdotes?: string[]
  lovedOnesView?: string
  legacyWish?: string
  notes?: string
}

function genderLabel(gender?: string): string {
  if (gender === 'homme') return 'Homme'
  if (gender === 'femme') return 'Femme'
  return 'Non précisé (formuler des phrases neutres, sans « il/elle »)'
}

function buildBiographyBrief(deceasedName: string, bio: BiographyInput): string {
  const lines: string[] = []
  lines.push(`Nom du défunt : ${deceasedName || '(non précisé)'}`)
  lines.push(`Genre : ${genderLabel(bio.gender)}`)
  if (bio.birthDate) lines.push(`Date de naissance : ${bio.birthDate}`)
  if (bio.birthPlace) lines.push(`Lieu de naissance : ${bio.birthPlace}`)
  if (bio.education) lines.push(`Scolarité / formation : ${bio.education}`)
  if (bio.siblings) lines.push(`Frères et sœurs : ${bio.siblings}`)
  if (bio.career) lines.push(`Vie professionnelle : ${bio.career}`)
  if (bio.volunteering) lines.push(`Engagements / bénévolat : ${bio.volunteering}`)
  if (bio.metSpouse) lines.push(`Rencontre avec l'époux/l'épouse : ${bio.metSpouse}`)
  if (bio.spouseName) lines.push(`Époux/épouse : ${bio.spouseName}${bio.weddingDate ? ` (mariage le ${bio.weddingDate})` : ''}`)
  if (bio.hasChildren && bio.children?.length) {
    const names = bio.children.map((c) => `${c.name ?? ''}${c.birthDate ? ` (né(e) le ${c.birthDate})` : ''}`).join(', ')
    lines.push(`Enfants : ${names}`)
  }
  if (bio.grandchildren) lines.push(`Petits-enfants : ${bio.grandchildren}`)
  if (bio.passions) lines.push(`Passions, loisirs : ${bio.passions}`)
  if (bio.characterTraits) lines.push(`Traits de caractère : ${bio.characterTraits}`)
  if (bio.sayings) lines.push(`Phrase qu'il/elle répétait : « ${bio.sayings} »`)
  if (bio.symbolicObject) lines.push(`Objet/lieu/odeur associé(e) : ${bio.symbolicObject}`)
  if (bio.proudestOf) lines.push(`Ce dont il/elle était le plus fier(ère) : ${bio.proudestOf}`)
  if (bio.guidingValue) lines.push(`Valeur qui le/la guidait : ${bio.guidingValue}`)
  if (bio.anecdotes?.some((a) => a.trim())) {
    lines.push('Anecdotes :')
    for (const a of bio.anecdotes) if (a.trim()) lines.push(`- ${a.trim()}`)
  }
  if (bio.lovedOnesView) lines.push(`Regard de ses proches : ${bio.lovedOnesView}`)
  if (bio.legacyWish) lines.push(`Dernier mot souhaité : ${bio.legacyWish}`)
  if (bio.notes) lines.push(`Autres informations : ${bio.notes}`)
  return lines.join('\n')
}

async function handleGenerateBiography(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  const body = (await request.json()) as { deceasedName?: string; bio?: BiographyInput }
  if (!body.bio) return json({ error: 'Champ "bio" manquant.' }, 400, headers)

  const brief = buildBiographyBrief(body.deceasedName?.trim() || 'Le défunt', body.bio)
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3072,
    system: BIOGRAPHY_SYSTEM_PROMPT,
    output_config: { effort: 'medium' },
    messages: [{ role: 'user', content: brief }],
  })

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!textBlock) return json({ error: 'Réponse vide du modèle.' }, 502, headers)
  return json({ text: textBlock.text.trim() }, 200, headers)
}

async function handleGenerateSegment(request: Request, env: Env, headers: Record<string, string>): Promise<Response> {
  const body = (await request.json()) as {
    ceremonyType?: string
    deceasedName?: string
    segmentTitle?: string
    instructions?: string
  }
  if (!body.instructions?.trim()) return json({ error: 'Champ "instructions" manquant.' }, 400, headers)

  const brief = [
    `Type de cérémonie : ${body.ceremonyType || 'obsèques'}`,
    body.deceasedName ? `Nom du défunt : ${body.deceasedName}` : null,
    `Titre de l'étape : ${body.segmentTitle || '(sans titre)'}`,
    `Consignes / mots-clés du maître de cérémonie : ${body.instructions.trim()}`,
  ]
    .filter(Boolean)
    .join('\n')

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1536,
    system: SEGMENT_SYSTEM_PROMPT,
    output_config: { effort: 'medium' },
    messages: [{ role: 'user', content: brief }],
  })

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!textBlock) return json({ error: 'Réponse vide du modèle.' }, 502, headers)
  return json({ text: textBlock.text.trim() }, 200, headers)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(request, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Méthode non autorisée.' }, 405, headers)
    }

    const token = request.headers.get('X-App-Token')
    if (!env.APP_TOKEN || token !== env.APP_TOKEN) {
      return json({ error: 'Jeton d\'application invalide.' }, 401, headers)
    }

    const allowed = await checkRateLimit(request, env)
    if (!allowed) {
      return json({ error: 'Trop de requêtes — réessayez dans quelques minutes.' }, 429, headers)
    }

    const url = new URL(request.url)
    try {
      if (url.pathname === '/generate-biography') {
        return await handleGenerateBiography(request, env, headers)
      }
      if (url.pathname === '/generate-segment') {
        return await handleGenerateSegment(request, env, headers)
      }
      return json({ error: 'Route inconnue.' }, 404, headers)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue.'
      return json({ error: `Erreur lors de la génération : ${message}` }, 502, headers)
    }
  },
}
