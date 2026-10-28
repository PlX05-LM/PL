import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import type { Ceremony } from '../types'
import { isAiConfigured } from '../lib/aiGeneration'
import { ServiceRequiredNote, UnavailableBadge } from './Unavailable'
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
      <p className="flex items-start justify-between gap-2 text-xs leading-relaxed text-muted">
        <span>Envoi des photos du diaporama par la famille, depuis son téléphone.</span>
        <UnavailableBadge label="Bientôt" />
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

  function handleImport() {
    if (!active || !remote) return
    const { ceremony: next, changed } = importFamilyAnswers(ceremony, remote.payload)
    onChange({ ...next, familyInvite: { ...active, importedUpdatedAt: remote.updatedAt } })
    setNotice(changed ? `${changed} rubrique${changed > 1 ? 's' : ''} complétée${changed > 1 ? 's' : ''} par la famille.` : 'Rien de nouveau à importer.')
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
  const hasNew = remote && remote.updatedAt > (active.importedUpdatedAt ?? 0)

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
        disabled={!hasNew}
        className="mt-3 min-h-11 w-full rounded-md bg-gold px-3 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-40"
      >
        {hasNew ? 'Importer les réponses de la famille' : 'Réponses à jour'}
      </button>
      {notice && <p className="mt-2 text-xs text-gold">{notice}</p>}
      <p className="mt-2 text-xs leading-relaxed text-muted">
        L'import complète le dossier sans rien effacer : un texte différent du vôtre est ajouté à la suite.
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
