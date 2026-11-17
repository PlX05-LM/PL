import { useEffect, useState } from 'react'
import { getVerifiedLicense } from '../lib/licensing/store'
import { contactEmail } from '../legal/editor'

const SOON = 15 * 86_400_000

/** Prévient sur l'accueil quand l'abonnement se termine dans moins de 15 jours. */
export default function LicenseNotice() {
  const [end, setEnd] = useState<number | null>(null)

  useEffect(() => {
    getVerifiedLicense().then((lic) => {
      if (lic?.expiresAt && lic.expiresAt - Date.now() < SOON) setEnd(lic.expiresAt)
    })
  }, [])

  if (!end) return null
  const day = new Date(end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  const email = contactEmail()
  return (
    <div className="mb-6 rounded-xl border border-gold-dim/60 bg-panel px-5 py-3 text-sm text-fg">
      Votre abonnement Céréo se termine le {day}. Pensez à le renouveler pour continuer à travailler sur vos dossiers
      {email ? (
        <>
          {' '}
          : <a href={`mailto:${email}`} className="text-gold underline">{email}</a>
        </>
      ) : null}
      .
    </div>
  )
}
