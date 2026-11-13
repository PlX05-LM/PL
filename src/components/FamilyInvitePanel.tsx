import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import type { Ceremony } from '../types'
import { db } from '../db'
import { newId } from '../lib/ids'
import { isAiConfigured } from '../lib/aiGeneration'
import { downloadFile, formatSize, type FamilyMediaItem } from '../lib/familyMedia'
import { familyTextSegment } from '../lib/meetingDraft'
import { isImageSizeSafe } from '../lib/imageSize'
import { mimeTypeForVideo, probeVideo } from '../lib/videoImport'
import { ServiceRequiredNote } from './Unavailable'
import {
  closeInvite,
  countAnswers,
  createInvite,
  fetchFamily,
  FamilyLinkError,
  importFamilyAnswers,
  inviteDurations,
  inviteUrl,
  type RemoteState,
} from '../lib/familyLink'

function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatAgo(ts: number) {
  const minutes = Math.round((Date.now() - ts) / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return `le ${new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
}

/** Toujours disponible, même sans service en ligne : le questionnaire à imprimer. */
function PaperAndPhotos({ ceremonyId }: { ceremonyId: string }) {
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      <Link
        to={`/ceremonies/${ceremonyId}/questionnaire`}
        className="flex min-h-11 items-center justify-center rounded-md border border-line px-3 text-sm text-muted transition-colors hover:border-gold-dim hover:text-fg"
      >
        Version papier à imprimer
      </Link>
      <p className="text-xs leading-relaxed text-muted">
        La famille peut aussi envoyer depuis son téléphone des photos, des vidéos, des documents et des textes.
      </p>
    </div>
  )
}

const buttonClass =
  'min-h-11 rounded-md border border-line px-3 text-sm text-muted transition-colors hover:border-gold-dim hover:text-fg disabled:opacity-40'

/**
 * Module 1 : la famille reçoit un lien personnel et temporaire pour remplir elle-même la
 * rencontre depuis son téléphone ; ses réponses arrivent ici, à importer dans le dossier.
 */
export default function FamilyInvitePanel({ ceremony, onChange }: { ceremony: Ceremony; onChange: (next: Ceremony) => void }) {
  const invite = ceremony.familyInvite
  const active = invite && !invite.closedAt && invite.expiresAt > Date.now() ? invite : undefined

  const [days, setDays] = useState<number>(7)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remote, setRemote] = useState<RemoteState | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const serviceReady = useMemo(() => isAiConfigured(), [])

  const refresh = useCallback(async () => {
    if (!active) return
    try {
      setRemote(await fetchFamily(active.endpoint, active.id, active.key))
      setError(null)
    } catch (err) {
      setError(err instanceof FamilyLinkError ? err.message : 'Impossible de lire les réponses de la famille.')
    }
  }, [active?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Les réponses arrivent pendant que l'agence travaille : on relit régulièrement.
  useEffect(() => {
    if (!active) return
    refresh()
    const timer = setInterval(refresh, 60000)
    return () => clearInterval(timer)
  }, [active?.id, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      const created = await createInvite(ceremony, days)
      onChange({ ...ceremony, familyInvite: created })
    } catch (err) {
      setError(err instanceof FamilyLinkError ? err.message : 'La création du lien a échoué.')
    } finally {
      setBusy(false)
    }
  }

  async function handleClose() {
    if (!active || !confirm("Fermer l'accès de la famille ? Le lien ne fonctionnera plus et ses réponses seront effacées du service en ligne (celles déjà importées restent dans le dossier).")) return
    setBusy(true)
    try {
      await closeInvite(active)
    } catch {
      // Hors-ligne ou déjà expiré : l'espace sera de toute façon effacé à l'expiration.
    }
    onChange({ ...ceremony, familyInvite: { ...active, closedAt: Date.now() } })
    setRemote(null)
    setBusy(false)
  }

  async function handleImport() {
    if (!active || !remote || importing) return
    setImporting(true)
    setNotice(null)
    const done: string[] = []
    try {
      // 1. Réponses du formulaire.
      const { ceremony: withAnswers, changed } = importFamilyAnswers(ceremony, remote.payload)
      let next = withAnswers
      if (changed) done.push(`${changed} rubrique${changed > 1 ? 's' : ''} complétée${changed > 1 ? 's' : ''}`)

      // 2. Textes écrits par les proches : gardés avec la rencontre, et ajoutés au déroulé
      //    s'il existe déjà (sinon ils y entreront à la validation de la rencontre).
      const knownTexts = new Set((next.meeting?.familyTexts ?? []).map((t) => t.id))
      const newTexts = remote.payload.texts.filter((t) => !knownTexts.has(t.id))
      if (newTexts.length) {
        const records = newTexts.map(({ id, title, body, by }) => ({ id, title, body, by }))
        next = {
          ...next,
          meeting: { answers: next.meeting?.answers ?? {}, ...next.meeting, familyTexts: [...(next.meeting?.familyTexts ?? []), ...records] },
          segments: next.segments.length ? [...next.segments, ...records.map(familyTextSegment)] : next.segments,
        }
        done.push(`${newTexts.length} texte${newTexts.length > 1 ? 's' : ''}`)
      }

      // 3. Photos et vidéos : récupérées, déchiffrées et ajoutées à la cérémonie.
      const imported = new Set(active.importedMediaIds ?? [])
      const toImport = remote.payload.media.filter((m) => m.kind !== 'document' && !imported.has(m.id))
      let photos = 0
      let videos = 0
      for (const [i, item] of toImport.entries()) {
        setProgress(`Récupération ${i + 1} / ${toImport.length} : « ${item.name} »`)
        try {
          const blob = await downloadFile(active.endpoint, active.id, active.key, item)
          if (item.kind === 'photo') {
            if (!(await isImageSizeSafe(blob))) continue
            await db.photos.add({ id: newId(), name: item.name.replace(/\.[^.]+$/, ''), blob, mimeType: 'image/jpeg', createdAt: Date.now() + i, ceremonyId: ceremony.id })
            photos++
          } else {
            const file = new File([blob], item.name, { type: item.type })
            const probe = await probeVideo(file).catch(() => undefined)
            await db.videos.add({
              id: newId(),
              name: item.name.replace(/\.[^.]+$/, ''),
              blob: file,
              mimeType: mimeTypeForVideo(file),
              ...probe,
              createdAt: Date.now() + i,
              ceremonyId: ceremony.id,
            })
            videos++
          }
          imported.add(item.id)
        } catch {
          // Fichier retiré entre-temps ou réseau coupé : il sera repris au prochain import.
        }
      }
      if (photos) done.push(`${photos} photo${photos > 1 ? 's' : ''}`)
      if (videos) done.push(`${videos} vidéo${videos > 1 ? 's' : ''}`)

      onChange({ ...next, familyInvite: { ...active, importedUpdatedAt: remote.updatedAt, importedMediaIds: [...imported] } })
      const missing = toImport.length - photos - videos
      setNotice(
        (done.length ? `Ajouté au dossier : ${done.join(', ')}.` : 'Rien de nouveau à importer.') +
          (missing > 0 ? ` ${missing} fichier${missing > 1 ? 's' : ''} n'a pas pu être récupéré : relancez l'import.` : ''),
      )
    } finally {
      setProgress(null)
      setImporting(false)
    }
  }

  async function saveDocument(item: FamilyMediaItem) {
    if (!active) return
    try {
      const blob = await downloadFile(active.endpoint, active.id, active.key, item)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      setError(`« ${item.name} » n'a pas pu être récupéré.`)
    }
  }

  if (!active) {
    return (
      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Lien famille</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Envoyez à la famille un lien personnel : elle remplit depuis son téléphone, à son rythme, ce qu'elle
          souhaite. Ses réponses arrivent ici. Contenu chiffré, effacé automatiquement à l'expiration.
        </p>
        {!serviceReady ? (
          <div className="mt-3">
            <ServiceRequiredNote feature="Le lien famille" />
          </div>
        ) : (
          <>
        <label className="mt-3 flex items-center justify-between gap-2 text-sm text-fg">
          Valable
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="min-h-11 rounded-md border border-line bg-panel-2 px-2 text-sm text-fg"
          >
            {inviteDurations.map((d) => (
              <option key={d} value={d}>
                {d} jours
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleCreate}
          disabled={busy}
          className="mt-3 min-h-11 w-full rounded-md border border-gold-dim px-3 text-sm font-medium text-gold hover:bg-panel-2 disabled:opacity-60"
        >
          {busy ? 'Création…' : 'Créer le lien famille'}
        </button>
        {error && <p className="mt-2 text-xs leading-relaxed text-danger">{error}</p>}
          </>
        )}
        <PaperAndPhotos ceremonyId={ceremony.id} />
      </section>
    )
  }

  const url = inviteUrl(active)
  const name = ceremony.deceasedName.trim()
  const message = `Bonjour, voici le lien pour nous confier vos souvenirs et vos souhaits pour l'hommage${
    name ? ` à ${name}` : ''
  }. Remplissez ce que vous souhaitez, à votre rythme, et partagez-le avec vos proches si vous le voulez. Lien confidentiel, valable jusqu'au ${formatDay(active.expiresAt)} : ${url}`
  const answered = remote ? countAnswers(remote.payload) : 0
  const importedMedia = new Set(active.importedMediaIds ?? [])
  const knownTexts = new Set((ceremony.meeting?.familyTexts ?? []).map((t) => t.id))
  const pendingMedia = remote ? remote.payload.media.filter((m) => m.kind !== 'document' && !importedMedia.has(m.id)) : []
  const pendingTexts = remote ? remote.payload.texts.filter((t) => !knownTexts.has(t.id)) : []
  const documents = remote ? remote.payload.media.filter((m) => m.kind === 'document') : []
  const hasNew = Boolean(remote && (remote.updatedAt > (active.importedUpdatedAt ?? 0) || pendingMedia.length || pendingTexts.length))
  const count = (kind: FamilyMediaItem['kind']) => remote?.payload.media.filter((m) => m.kind === kind).length ?? 0
  const shared = [
    [count('photo'), 'photo'],
    [count('video'), 'vidéo'],
    [remote?.payload.texts.length ?? 0, 'texte'],
    [count('document'), 'document'],
  ]
    .filter(([n]) => (n as number) > 0)
    .map(([n, label]) => `${n} ${label}${(n as number) > 1 ? 's' : ''}`)

  async function toggleQr() {
    if (qr) return setQr(null)
    setQr(await QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#0f1115', light: '#ffffff' } }))
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Copie impossible : sélectionnez le lien et copiez-le manuellement.')
    }
  }

  return (
    <section className="rounded-lg border border-gold-dim/50 bg-panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Lien famille</h2>
        <span className="text-xs text-muted">jusqu'au {formatDay(active.expiresAt)}</span>
      </div>

      <input
        readOnly
        value={url}
        aria-label="Lien à envoyer à la famille"
        onFocus={(e) => e.target.select()}
        className="mt-3 w-full truncate rounded-md border border-line bg-panel-2 px-2 py-2 text-xs text-muted"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={handleCopy} className={buttonClass}>
          {copied ? 'Copié ✓' : 'Copier'}
        </button>
        <a href={`sms:?&body=${encodeURIComponent(message)}`} className={`${buttonClass} flex items-center justify-center`}>
          SMS
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(`Hommage${name ? ` à ${name}` : ''}`)}&body=${encodeURIComponent(message)}`}
          className={`${buttonClass} flex items-center justify-center`}
        >
          E-mail
        </a>
        <button type="button" onClick={toggleQr} aria-expanded={Boolean(qr)} className={buttonClass}>
          {qr ? 'Masquer le QR code' : 'QR code'}
        </button>
      </div>
      {qr && (
        <figure className="mt-3 flex flex-col items-center gap-2 rounded-md bg-white p-3">
          <img src={qr} alt="QR code du lien famille" className="h-48 w-48" />
          <figcaption className="text-center text-xs text-ink">À scanner avec l'appareil photo du téléphone</figcaption>
        </figure>
      )}

      <div className="mt-4 rounded-md bg-panel-2 p-3 text-sm">
        {!remote ? (
          <p className="text-muted">{error ?? 'Lecture des réponses…'}</p>
        ) : remote.updatedAt <= active.initialUpdatedAt ? (
          <p className="text-muted">La famille n'a pas encore répondu.</p>
        ) : (
          <>
            <p className="text-fg">
              {answered} réponse{answered > 1 ? 's' : ''}
              {shared.length > 0 && ` · ${shared.join(', ')}`}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Dernière saisie {formatAgo(remote.updatedAt)}
              {remote.payload.contributors.length > 0 && ` · par ${remote.payload.contributors.join(', ')}`}
            </p>
            {remote.payload.finishedAt && <p className="mt-1 text-xs font-medium text-gold">La famille a indiqué avoir terminé ✓</p>}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleImport}
        disabled={!hasNew || importing}
        className="mt-3 min-h-11 w-full rounded-md bg-gold px-3 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-40"
      >
        {importing ? 'Import en cours…' : hasNew ? 'Importer les envois de la famille' : 'Tout est importé'}
      </button>
      {progress && (
        <p className="mt-2 text-xs text-gold" aria-live="polite">
          {progress}
        </p>
      )}
      {notice && <p className="mt-2 text-xs text-gold">{notice}</p>}
      {documents.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Documents reçus</p>
          <ul className="space-y-1">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-fg" title={d.name}>
                  {d.name} <span className="text-muted">({formatSize(d.size)})</span>
                </span>
                <button type="button" onClick={() => saveDocument(d)} className="shrink-0 text-gold hover:text-fg">
                  Télécharger
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 text-xs leading-relaxed text-muted">
        L'import complète le dossier sans rien effacer : photos et vidéos rejoignent la cérémonie, les textes deviennent
        des étapes du déroulé, et une réponse différente de la vôtre est ajoutée à la suite.
      </p>

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={refresh} className={`${buttonClass} flex-1`}>
          Actualiser
        </button>
        <button type="button" onClick={handleClose} disabled={busy} className={`${buttonClass} flex-1 hover:border-danger hover:text-danger`}>
          Fermer l'accès
        </button>
      </div>
      <PaperAndPhotos ceremonyId={ceremony.id} />
    </section>
  )
}
