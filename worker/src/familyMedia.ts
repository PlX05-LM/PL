/**
 * Fichiers déposés par la famille via son lien (photos, vidéos, documents). Chaque fichier
 * est chiffré dans le téléphone (même clé que le reste du lien, jamais transmise au
 * service) puis découpé en morceaux de 20 Mo au plus, stockés à côté de l'espace famille
 * et effacés avec lui : à l'expiration du lien, ou dès que l'agence le ferme.
 *
 *   PUT    /family/<id>/media/<fichier>/<n>   dépose le morceau n (famille)
 *   GET    /family/<id>/media/<fichier>/<n>   relit le morceau n (agence, famille)
 *   DELETE /family/<id>/media/<fichier>       retire un fichier (famille, agence)
 */
import { readBytesCapped } from './secret'

interface MediaEnv {
  RATE_LIMIT: KVNamespace
}

interface Quota {
  bytes: number
  chunks: number
}

const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/
/** Un morceau : 20 Mo de contenu, plus l'en-tête de chiffrement. KV accepte 25 Mo. */
export const MAX_CHUNK_BYTES = 20 * 1024 * 1024 + 64
/** Une vidéo de 300 Mo au plus. */
const MAX_CHUNKS_PER_FILE = 15
/**
 * Quotas d'un lien : de quoi recevoir un album complet et quelques vidéos, sans qu'un
 * lien détourné puisse remplir l'espace de stockage du service (1 Go dans l'offre gratuite).
 */
const MAX_LINK_BYTES = 600 * 1024 * 1024
const MAX_LINK_CHUNKS = 800

const chunkKey = (id: string, file: string, n: number) => `famm:${id}:${file}:${n}`
const quotaKey = (id: string) => `famq:${id}`

type Json = (data: unknown, status: number) => Response

export async function handleFamilyMedia(
  request: Request,
  env: MediaEnv,
  id: string,
  file: string,
  chunk: string | undefined,
  expiresAt: number | null,
  headers: Record<string, string>,
  json: Json,
): Promise<Response> {
  if (!ID_PATTERN.test(id) || !ID_PATTERN.test(file)) return json({ error: 'Lien invalide.' }, 404)
  if (!expiresAt || expiresAt <= Date.now()) return json({ error: 'Ce lien a expiré ou a été fermé.' }, 404)
  const n = chunk === undefined ? -1 : Number(chunk)
  const ttl = Math.max(60, Math.ceil((expiresAt - Date.now()) / 1000))

  if (request.method === 'DELETE' && chunk === undefined) {
    await Promise.all(Array.from({ length: MAX_CHUNKS_PER_FILE }, (_, i) => env.RATE_LIMIT.delete(chunkKey(id, file, i))))
    return json({ ok: true }, 200)
  }
  if (!Number.isInteger(n) || n < 0 || n >= MAX_CHUNKS_PER_FILE) return json({ error: 'Morceau invalide.' }, 404)

  if (request.method === 'GET') {
    const data = await env.RATE_LIMIT.get(chunkKey(id, file, n), 'arrayBuffer')
    if (!data) return json({ error: 'Fichier introuvable.' }, 404)
    return new Response(data, {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    })
  }

  if (request.method === 'PUT') {
    const body = await readBytesCapped(request, MAX_CHUNK_BYTES)
    if (body === null) return json({ error: 'Morceau trop volumineux.' }, 413)
    if (body.byteLength < 29) return json({ error: 'Contenu chiffré attendu.' }, 400)
    const quota = (await env.RATE_LIMIT.get<Quota>(quotaKey(id), 'json')) ?? { bytes: 0, chunks: 0 }
    if (quota.bytes + body.byteLength > MAX_LINK_BYTES || quota.chunks + 1 > MAX_LINK_CHUNKS) {
      return json({ error: 'Espace du lien plein : contactez l’agence pour transmettre les autres fichiers.' }, 413)
    }
    await env.RATE_LIMIT.put(chunkKey(id, file, n), body, { expirationTtl: ttl })
    await env.RATE_LIMIT.put(
      quotaKey(id),
      JSON.stringify({ bytes: quota.bytes + body.byteLength, chunks: quota.chunks + 1 }),
      { expirationTtl: ttl },
    )
    return json({ ok: true }, 200)
  }

  return json({ error: 'Méthode non autorisée.' }, 405)
}

/** Efface tous les fichiers d'un lien (fermeture par l'agence). */
export async function deleteAllFamilyMedia(env: MediaEnv, id: string): Promise<void> {
  let cursor: string | undefined
  do {
    const page = await env.RATE_LIMIT.list({ prefix: `famm:${id}:`, cursor })
    await Promise.all(page.keys.map((k) => env.RATE_LIMIT.delete(k.name)))
    cursor = page.list_complete ? undefined : page.cursor
  } while (cursor)
  await env.RATE_LIMIT.delete(quotaKey(id))
}
