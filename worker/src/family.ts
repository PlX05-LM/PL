/**
 * Lien famille : un espace temporaire où la famille remplit elle-même les rubriques de la
 * rencontre depuis son téléphone. Le contenu est chiffré dans le navigateur (AES-GCM, clé
 * placée dans la partie « # » du lien, jamais envoyée au serveur) : ce service ne stocke
 * qu'un bloc illisible, effacé automatiquement à l'expiration du lien.
 *
 *   POST   /family/<id>   (jeton d'application) crée l'espace, avec son contenu initial
 *   GET    /family/<id>   lit le contenu chiffré (famille et agence)
 *   PUT    /family/<id>   enregistre le contenu chiffré (famille)
 *   DELETE /family/<id>   (jeton d'application) ferme l'accès avant l'expiration
 */

interface FamilyEnv {
  APP_TOKEN: string
  RATE_LIMIT: KVNamespace
}

interface FamilyRecord {
  iv: string
  data: string
  expiresAt: number
  updatedAt: number
}

const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/
const MAX_PAYLOAD_CHARS = 400_000
const MAX_TTL_DAYS = 30
const key = (id: string) => `fam:${id}`

type Json = (data: unknown, status: number) => Response

function isEncryptedBody(b: unknown): b is { iv: string; data: string } {
  const body = b as { iv?: unknown; data?: unknown }
  return typeof body?.iv === 'string' && typeof body?.data === 'string' && body.iv.length <= 64
}

async function readBody(request: Request, json: Json): Promise<{ iv: string; data: string; ttlDays?: number } | Response> {
  const text = await request.text()
  if (text.length > MAX_PAYLOAD_CHARS) return json({ error: 'Contenu trop volumineux.' }, 413)
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'Contenu illisible.' }, 400)
  }
  if (!isEncryptedBody(body)) return json({ error: 'Contenu chiffré attendu.' }, 400)
  return body as { iv: string; data: string; ttlDays?: number }
}

async function put(env: FamilyEnv, id: string, record: FamilyRecord) {
  // KV impose au moins 60 s de durée de vie restante.
  const ttl = Math.max(60, Math.ceil((record.expiresAt - Date.now()) / 1000))
  await env.RATE_LIMIT.put(key(id), JSON.stringify(record), { expirationTtl: ttl })
}

export async function handleFamily(request: Request, env: FamilyEnv, id: string, json: Json): Promise<Response> {
  if (!ID_PATTERN.test(id)) return json({ error: 'Lien invalide.' }, 404)
  const hasAppToken = Boolean(env.APP_TOKEN) && request.headers.get('X-App-Token') === env.APP_TOKEN
  const existing = await env.RATE_LIMIT.get<FamilyRecord>(key(id), 'json')
  const alive = existing && existing.expiresAt > Date.now() ? existing : null

  switch (request.method) {
    case 'POST': {
      if (!hasAppToken) return json({ error: "Jeton d'application invalide." }, 401)
      if (existing) return json({ error: 'Ce lien existe déjà.' }, 409)
      const body = await readBody(request, json)
      if (body instanceof Response) return body
      const days = Math.min(MAX_TTL_DAYS, Math.max(1, Number(body.ttlDays) || 7))
      const record: FamilyRecord = { iv: body.iv, data: body.data, expiresAt: Date.now() + days * 86_400_000, updatedAt: Date.now() }
      await put(env, id, record)
      return json({ expiresAt: record.expiresAt, updatedAt: record.updatedAt }, 201)
    }
    case 'GET': {
      if (!alive) return json({ error: 'Ce lien a expiré ou a été fermé.' }, 404)
      return json(alive, 200)
    }
    case 'PUT': {
      if (!alive) return json({ error: 'Ce lien a expiré ou a été fermé.' }, 404)
      const body = await readBody(request, json)
      if (body instanceof Response) return body
      const record: FamilyRecord = { iv: body.iv, data: body.data, expiresAt: alive.expiresAt, updatedAt: Date.now() }
      await put(env, id, record)
      return json({ updatedAt: record.updatedAt, expiresAt: record.expiresAt }, 200)
    }
    case 'DELETE': {
      if (!hasAppToken) return json({ error: "Jeton d'application invalide." }, 401)
      await env.RATE_LIMIT.delete(key(id))
      return json({ ok: true }, 200)
    }
    default:
      return json({ error: 'Méthode non autorisée.' }, 405)
  }
}
