import { useEffect, useRef, useState } from 'react'
import type { BackupStats } from '../lib/backup'

export default function Backup() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [stats, setStats] = useState<BackupStats | null>(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  async function refreshStats() {
    const { getLibraryStats } = await import('../lib/backup')
    setStats(await getLibraryStats())
  }

  useEffect(() => {
    refreshStats()
  }, [])

  async function handleExport() {
    setExporting(true)
    setMessage(null)
    try {
      const { exportFullBackup } = await import('../lib/backup')
      const result = await exportFullBackup()
      setMessage({
        kind: 'success',
        text: `Sauvegarde téléchargée : ${result.ceremonies} cérémonie(s), ${result.tracks} musique(s), ${result.photos} photo(s).`,
      })
    } catch (err) {
      setMessage({ kind: 'error', text: `Échec de la sauvegarde : ${(err as Error).message}` })
    } finally {
      setExporting(false)
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    if (
      !confirm(
        "Restaurer cette sauvegarde ajoutera ses cérémonies, musiques et photos à votre bibliothèque actuelle (rien n'est supprimé). Continuer ?",
      )
    ) {
      if (fileInput.current) fileInput.current.value = ''
      return
    }
    setImporting(true)
    setMessage(null)
    try {
      const { importFullBackup } = await import('../lib/backup')
      const result = await importFullBackup(file)
      setMessage({
        kind: 'success',
        text: `Sauvegarde restaurée : ${result.ceremonies} cérémonie(s), ${result.tracks} musique(s), ${result.photos} photo(s).`,
      })
      await refreshStats()
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
    } finally {
      setImporting(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h2 className="font-display text-3xl text-fg">Sauvegarde</h2>
      <p className="mt-1 text-sm text-muted">
        Toutes vos données (cérémonies, musiques, photos) sont stockées uniquement sur cet
        appareil, dans ce navigateur. Si l'appareil est perdu, cassé ou que son stockage est
        effacé, tout disparaît. Téléchargez régulièrement une sauvegarde et conservez-la ailleurs
        (cloud, clé USB, ordinateur) — pas seulement sur cette tablette.
      </p>

      {stats && (
        <p className="mt-4 text-sm text-muted">
          Actuellement sur cet appareil : <strong className="text-fg">{stats.ceremonies}</strong>{' '}
          cérémonie(s), <strong className="text-fg">{stats.tracks}</strong> musique(s),{' '}
          <strong className="text-fg">{stats.photos}</strong> photo(s).
        </p>
      )}

      {message && (
        <div
          className={`mt-4 rounded-md border px-4 py-3 text-sm ${
            message.kind === 'success'
              ? 'border-gold-dim text-gold'
              : 'border-danger text-danger'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h3 className="font-display text-lg text-fg">Télécharger une sauvegarde complète</h3>
        <p className="mt-1 text-sm text-muted">
          Génère un fichier ZIP unique contenant l'intégralité de vos cérémonies, musiques et
          photos.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-50"
        >
          {exporting ? 'Préparation…' : '⬇ Télécharger la sauvegarde'}
        </button>
      </div>

      <div className="mt-6 rounded-lg border border-line bg-panel p-5">
        <h3 className="font-display text-lg text-fg">Restaurer depuis une sauvegarde</h3>
        <p className="mt-1 text-sm text-muted">
          Sélectionnez un fichier de sauvegarde Céréma (.zip). Son contenu sera ajouté à votre
          bibliothèque actuelle, sans rien supprimer.
        </p>
        <label className="mt-3 inline-block cursor-pointer rounded-md border border-gold-dim px-4 py-2 text-sm font-medium text-gold hover:bg-panel-2">
          {importing ? 'Restauration…' : '⬆ Choisir un fichier de sauvegarde'}
          <input
            ref={fileInput}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            disabled={importing}
            onChange={(e) => handleImport(e.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  )
}
