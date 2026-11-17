import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'

const WEEK = 7 * 86_400_000

/** Rappel sur l'accueil quand les dossiers n'ont pas été sauvegardés depuis une semaine. */
export default function BackupReminder() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [{ lastBackupAt }, { autoBackupState }] = await Promise.all([import('../lib/backup'), import('../lib/autoBackup')])
      if ((await db.ceremonies.count()) === 0) return
      const auto = await autoBackupState()
      const last = lastBackupAt()
      let text: string | null = null
      if (auto.state === 'needs-permission') text = 'La sauvegarde automatique attend votre autorisation.'
      else if (!last) text = "Vos dossiers n'ont encore jamais été sauvegardés."
      else if (Date.now() - last > WEEK) text = `Dernière sauvegarde il y a ${Math.floor((Date.now() - last) / 86_400_000)} jours.`
      if (alive) setMessage(text)
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!message) return null
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-dim/60 bg-panel px-5 py-3 text-sm">
      <p className="text-fg">
        {message} Un ordinateur en panne ou un navigateur vidé, et tout est perdu.
      </p>
      <Link to="/sauvegarde" className="font-medium text-gold hover:text-fg">
        Sauvegarder
      </Link>
    </div>
  )
}
