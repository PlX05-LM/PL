import { useEffect, useState } from 'react'
import type { AutoBackupState } from '../lib/autoBackup'

const formatAgo = (t: number) => {
  const days = Math.floor((Date.now() - t) / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  return days === 1 ? 'hier' : `il y a ${days} jours`
}

/** Réglage de la sauvegarde automatique quotidienne, et état de la protection du stockage. */
export default function AutoBackupPanel() {
  const [state, setState] = useState<AutoBackupState | null>(null)
  const [folder, setFolder] = useState<string | undefined>()
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [last, setLast] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const [{ autoBackupState, protectStorage }, { lastBackupAt }] = await Promise.all([
      import('../lib/autoBackup'),
      import('../lib/backup'),
    ])
    const s = await autoBackupState()
    setState(s.state)
    setFolder(s.folder)
    setPersisted(await protectStorage())
    setLast(lastBackupAt())
  }

  useEffect(() => {
    refresh()
  }, [])

  async function act(run: (m: typeof import('../lib/autoBackup')) => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await run(await import('../lib/autoBackup'))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError("La sauvegarde automatique n'a pas pu être réglée sur ce dossier.")
    } finally {
      setBusy(false)
      refresh()
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-line bg-panel p-5">
      <h3 className="font-display text-lg text-fg">Sauvegarde automatique</h3>
      {state === 'unsupported' ? (
        <p className="mt-1 text-sm text-muted">
          Ce navigateur ne permet pas d'écrire dans un dossier. Sur ordinateur, ouvrez Céréo avec Chrome ou Edge pour
          l'activer. En attendant, téléchargez une sauvegarde au moins une fois par semaine : Céréo vous le rappellera.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            Chaque jour, Céréo enregistre une copie complète dans un dossier de votre choix et garde les 10 dernières.
            Choisissez de préférence un dossier synchronisé (OneDrive, Google Drive, Dropbox) : vos dossiers survivent
            alors à une panne ou au vol de l'ordinateur.
          </p>
          {state === 'on' && (
            <p className="mt-3 text-sm text-gold">
              Activée dans le dossier « {folder} ».
            </p>
          )}
          {state === 'needs-permission' && (
            <p className="mt-3 text-sm text-fg">
              Le navigateur a été redémarré : autorisez de nouveau l'accès au dossier « {folder} ».
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {state === 'needs-permission' && (
              <button
                onClick={() => act((m) => m.resumeAutoBackup())}
                disabled={busy}
                className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-50"
              >
                Reprendre la sauvegarde automatique
              </button>
            )}
            <button
              onClick={() => act((m) => m.chooseBackupFolder())}
              disabled={busy}
              className={
                state === 'off'
                  ? 'rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-50'
                  : 'rounded-md border border-line px-4 py-2 text-sm text-fg hover:border-gold-dim disabled:opacity-50'
              }
            >
              {busy ? 'Sauvegarde…' : state === 'off' ? 'Choisir le dossier de sauvegarde' : 'Changer de dossier'}
            </button>
            {state === 'on' && (
              <button
                onClick={() => act((m) => m.runAutoBackup(true))}
                disabled={busy}
                className="rounded-md border border-line px-4 py-2 text-sm text-fg hover:border-gold-dim disabled:opacity-50"
              >
                Sauvegarder maintenant
              </button>
            )}
          </div>
        </>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <p className="mt-4 text-xs text-muted">
        Dernière sauvegarde : {last ? formatAgo(last) : 'aucune sur ce poste'}.{' '}
        {persisted === true
          ? 'Stockage protégé : le navigateur ne supprimera pas vos données de lui-même.'
          : persisted === false
            ? "Le navigateur n'a pas accordé la protection du stockage : les sauvegardes sont d'autant plus importantes."
            : ''}
      </p>
    </div>
  )
}
