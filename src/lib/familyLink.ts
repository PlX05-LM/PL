import type { Ceremony, FamilyInvite, MeetingAnswers } from '../types'
import { loadAppSettings } from './appSettings'
import { meetingSections, readField, writeField, type FieldValue, type MeetingField, type MeetingSection } from './meetingGuide'

/**
 * Lien famille : la famille remplit elle-même les rubriques de la rencontre depuis son
 * téléphone, via un lien temporaire. Le contenu est chiffré dans le navigateur
 * (AES-GCM 256) avec une clé qui ne voyage que dans la partie « # » du lien : le service
 * en ligne ne stocke qu'un bloc illisible, effacé automatiquement à l'expiration.
 */

export interface FamilyPayload {
  v: 1
  deceasedName: string
  answers: MeetingAnswers
  /** Prénoms (et liens) des proches qui ont participé. */
  contributors: string[]
  /** La famille a indiqué avoir terminé. */
  finishedAt?: number
  updatedAt: number
}

// --- Ce que voit la famille ------------------------------------------------

/** Champs réservés à l'agence : organisation de la cérémonie et notes du maître de cérémonie. */
const hiddenFromFamily = new Set(['deceasedName', 'ceremonyType', 'date', 'time', 'location', 'officiant', 'advisor', 'sensitive'])

const familyLabels: Record<string, string> = {
  familyContact: 'Votre nom, votre lien avec le défunt et un moyen de vous joindre',
  avoid: 'Ce que vous ne souhaitez surtout pas',
}

/** Conseils adressés à la famille (ceux de la trame sont destinés au maître de cérémonie). */
const familyTips: Record<string, string> = {
  childhood: 'Écrivez comme vous parleriez : quelques mots suffisent, nous mettrons en forme.',
  family: 'Merci de bien orthographier les prénoms : ils seront prononcés pendant la cérémonie.',
  threeWords: 'Choisissez les mots qui lui ressemblent le plus.',
  anecdotes: 'Un souvenir par ligne. Les petites histoires du quotidien sont souvent les plus belles.',
  speakers: 'Une personne par ligne : prénom, lien avec le défunt, et ce qu’elle souhaite faire (texte, poème, musique…).',
  avoid: 'Ces indications restent entre vous et le maître de cérémonie.',
}

export interface FamilyField {
  field: MeetingField
  label: string
  tip?: string
}

export interface FamilySection {
  section: MeetingSection
  fields: FamilyField[]
}

export const familySections: FamilySection[] = meetingSections
  .map((section) => ({
    section,
    fields: section.fields
      .filter((f) => !hiddenFromFamily.has(f.id))
      .map((field) => ({ field, label: familyLabels[field.id] ?? field.label, tip: familyTips[field.id] })),
  }))
  .filter((s) => s.fields.length > 0)

const familyFields = familySections.flatMap((s) => s.fields.map((f) => f.field))

function isEmpty(field: MeetingField, v: FieldValue | undefined): boolean {
  if (v === undefined) return true
  if (Array.isArray(v)) return v.length === 0
  if (field.id === 'gender') return v === '' || v === 'non-precise'
  return v.trim() === ''
}

/** Ce que l'agence a déjà noté, pour que la famille complète plutôt que recommencer. */
export function initialPayload(c: Ceremony): FamilyPayload {
  const answers: MeetingAnswers = {}
  for (const f of familyFields) {
    const v = readField(c, f)
    if (!isEmpty(f, v)) answers[f.id] = v
  }
  return { v: 1, deceasedName: c.deceasedName.trim(), answers, contributors: [], updatedAt: Date.now() }
}

/** Nombre de champs que la famille a renseignés. */
export function countAnswers(p: FamilyPayload): number {
  return familyFields.filter((f) => !isEmpty(f, p.answers[f.id])).length
}

/**
 * Reporte les réponses de la famille dans le dossier, sans jamais perdre ce que l'agence
 * a noté : un champ vide est rempli, des choix multiples sont réunis, un texte que la
 * famille a complété remplace la note d'origine, et un texte différent est ajouté à la
 * suite, signalé comme venant de la famille.
 */
export function importFamilyAnswers(c: Ceremony, p: FamilyPayload): { ceremony: Ceremony; changed: number } {
  let next = c
  let changed = 0
  for (const f of familyFields) {
    const theirs = p.answers[f.id]
    if (isEmpty(f, theirs)) continue
    const ours = readField(next, f)
    let merged: FieldValue | null = null
    if (f.type === 'chips' && Array.isArray(theirs)) {
      const union = [...new Set([...(Array.isArray(ours) ? ours : []), ...theirs])]
      if (union.length !== (Array.isArray(ours) ? ours.length : 0)) merged = union
    } else if (typeof theirs === 'string') {
      const t = theirs.trim()
      if (isEmpty(f, ours)) merged = t
      else if (f.type === 'area' || f.type === 'text') {
        const current = String(ours).trim()
        // La famille a complété la note de l'agence : sa version, plus riche, la remplace.
        if (t.includes(current)) merged = t === current ? null : t
        else if (!current.includes(t)) merged = `${current}${f.type === 'area' ? '\n' : ' '}— Famille : ${t}`
      }
    }
    if (merged !== null) {
      next = writeField(next, f, merged)
      changed++
    }
  }
  return { ceremony: next, changed }
}

// --- Chiffrement -----------------------------------------------------------

function toB64url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(text: string): Uint8Array<ArrayBuffer> {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function importKey(key: string) {
  return crypto.subtle.importKey('raw', fromB64url(key), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encrypt(payload: FamilyPayload, key: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await importKey(key), new TextEncoder().encode(JSON.stringify(payload)))
  return { iv: toB64url(iv), data: toB64url(new Uint8Array(data)) }
}

async function decrypt(record: { iv: string; data: string }, key: string): Promise<FamilyPayload> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64url(record.iv) }, await importKey(key), fromB64url(record.data))
  return JSON.parse(new TextDecoder().decode(plain)) as FamilyPayload
}

// --- Service en ligne ------------------------------------------------------

export class FamilyLinkError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'FamilyLinkError'
    this.status = status
  }
}

async function call(endpoint: string, id: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  if (!navigator.onLine) throw new FamilyLinkError('Pas de connexion internet.')
  let response: Response
  try {
    response = await fetch(`${endpoint.replace(/\/+$/, '')}/family/${id}`, init)
  } catch {
    throw new FamilyLinkError('Impossible de joindre le service. Vérifiez la connexion internet.')
  }
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new FamilyLinkError(typeof body.error === 'string' ? body.error : `Erreur du service (${response.status}).`, response.status)
  }
  return body
}

export interface RemoteState {
  payload: FamilyPayload
  updatedAt: number
  expiresAt: number
}

export async function fetchFamily(endpoint: string, id: string, key: string): Promise<RemoteState> {
  const record = await call(endpoint, id)
  try {
    return {
      payload: await decrypt(record as { iv: string; data: string }, key),
      updatedAt: Number(record.updatedAt),
      expiresAt: Number(record.expiresAt),
    }
  } catch {
    throw new FamilyLinkError('Ce lien est incomplet : vérifiez qu’il a été copié en entier.')
  }
}

export async function saveFamily(endpoint: string, id: string, key: string, payload: FamilyPayload): Promise<void> {
  await call(endpoint, id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(await encrypt(payload, key)),
  })
}

/** Durées proposées pour l'accès de la famille, en jours. */
export const inviteDurations = [3, 7, 14] as const

/** Crée l'espace famille d'une cérémonie (service configuré dans Paramètres). */
export async function createInvite(c: Ceremony, days: number): Promise<FamilyInvite> {
  const settings = loadAppSettings()
  const endpoint = settings.aiEndpointUrl.trim().replace(/\/+$/, '')
  if (!endpoint || !settings.aiAppToken.trim()) {
    throw new FamilyLinkError(
      'Le lien famille passe par le service en ligne de Céréo : renseignez son adresse et son jeton dans Paramètres.',
    )
  }
  const id = toB64url(crypto.getRandomValues(new Uint8Array(16)))
  const key = toB64url(crypto.getRandomValues(new Uint8Array(32)))
  const body = await call(endpoint, id, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-App-Token': settings.aiAppToken.trim() },
    body: JSON.stringify({ ...(await encrypt(initialPayload(c), key)), ttlDays: days }),
  })
  const initialUpdatedAt = Number(body.updatedAt)
  return { id, key, endpoint, createdAt: Date.now(), expiresAt: Number(body.expiresAt), initialUpdatedAt, importedUpdatedAt: initialUpdatedAt }
}

export async function closeInvite(invite: FamilyInvite): Promise<void> {
  const settings = loadAppSettings()
  await call(invite.endpoint, invite.id, { method: 'DELETE', headers: { 'X-App-Token': settings.aiAppToken.trim() } })
}

/** Lien à envoyer : tout ce qui suit « # » reste dans le téléphone, jamais sur un serveur. */
export function inviteUrl(invite: FamilyInvite): string {
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/famille/${invite.id}/${invite.key}?s=${encodeURIComponent(invite.endpoint)}`
}
