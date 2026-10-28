import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { createEmptyCeremony, type Ceremony } from '../types'
import { newId } from '../lib/ids'
import { loadSession } from '../lib/licensing/store'
import { ceremonyTimestamp, dossierStage, isToday, stagePath } from '../lib/dossierStage'
import DossierSteps from '../components/DossierSteps'
import Icon, { type IconName } from '../components/Icon'
import { ComingSoonCard, UnavailableBadge } from '../components/Unavailable'
import { isAiConfigured } from '../lib/aiGeneration'

/** Annoncées aux agences, pas encore disponibles. */
const comingSoon = [
  {
    title: 'Photos envoyées par la famille',
    description: 'Les proches déposent leurs photos depuis leur téléphone, via le lien famille ; le diaporama se construit sans clé USB.',
  },
  {
    title: 'Coffret souvenir numérique',
    description: "Après la cérémonie, un espace privé pour la famille : textes lus, musiques, diaporama, film de l'hommage.",
  },
  {
    title: "Livre d'or par QR code",
    description: 'Les invités laissent un message depuis leur téléphone, le jour J ; il est remis à la famille dans le coffret.',
  },
  {
    title: 'Livret souvenir imprimé',
    description: "Photos, textes et messages du livre d'or réunis dans un livret à commander pour la famille.",
  },
  {
    title: "Suivi de l'IA par agence",
    description: "Consommation de l'IA par licence, accès coupé automatiquement à la fin d'un abonnement.",
  },
]

function formatWhen(c: Ceremony) {
  const t = ceremonyTimestamp(c)
  if (Number.isNaN(t)) return 'À fixer'
  const hour = c.time ? ` · ${c.time.replace(':', ' h ')}` : ''
  if (isToday(c)) return `Aujourd'hui${hour}`
  const day = new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}${hour}`
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`
}

interface ModuleCardProps {
  step: number
  to: string
  icon: IconName
  title: string
  description: string
  status: string
  featured?: boolean
}

function ModuleCard({ step, to, icon, title, description, status, featured }: ModuleCardProps) {
  return (
    <Link
      to={to}
      className={`group flex min-h-60 flex-col gap-4 rounded-xl border border-t-4 border-t-gold p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 ${
        featured ? 'border-gold-dim/50 bg-panel-2' : 'border-line bg-panel hover:border-gold-dim'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold ${
            featured ? 'bg-gold text-ink' : 'bg-ink text-gold'
          }`}
        >
          {step}
        </span>
        <Icon name={icon} className="h-7 w-7 text-gold-dim transition-transform duration-200 group-hover:scale-110" />
      </div>
      <h2 className="font-display text-2xl leading-tight text-fg">{title}</h2>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
      <span className="mt-auto text-sm font-medium text-gold">{status}</span>
    </Link>
  )
}

export default function Home() {
  const ceremonies = useLiveQuery(() => db.ceremonies.toArray(), []) ?? ([] as Ceremony[])
  const navigate = useNavigate()
  const session = loadSession()
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    setCreating(true)
    const ceremony = createEmptyCeremony(newId())
    await db.ceremonies.add(ceremony)
    setCreating(false)
    navigate(`/ceremonies/${ceremony.id}/rencontre`)
  }

  // Dossiers à venir (ou sans date valide), du plus proche au plus lointain.
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const upcoming = ceremonies
    .filter((c) => {
      const t = ceremonyTimestamp(c)
      return Number.isNaN(t) || t >= startOfToday
    })
    .sort((a, b) => (ceremonyTimestamp(a) || Infinity) - (ceremonyTimestamp(b) || Infinity))

  const byStage = (s: number) => ceremonies.filter((c) => dossierStage(c) === s)
  const toMeet = byStage(1).length
  const inDesign = byStage(2).length
  const nextLive = upcoming.find((c) => dossierStage(c) === 3)

  const serviceReady = isAiConfigured()
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm capitalize text-muted">{today}</p>
          <h1 className="mt-1 font-display text-4xl text-fg">
            Bonjour{session ? `, ${session.username}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted">Choisissez une étape, ou reprenez un dossier en cours.</p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="min-h-12 rounded-lg bg-gold px-5 text-sm font-semibold text-ink transition-all hover:bg-gold-dim hover:shadow-lg hover:shadow-gold/20 active:scale-95 disabled:opacity-60"
        >
          + Nouveau dossier
        </button>
      </div>

      {!serviceReady && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel px-5 py-3 text-sm">
          <p className="flex flex-wrap items-center gap-2 text-muted">
            <UnavailableBadge />
            Service en ligne non configuré sur ce poste : rédaction par IA et lien famille indisponibles. Le reste
            fonctionne normalement.
          </p>
          <Link to="/parametres" className="font-medium text-gold hover:text-fg">
            Configurer
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <ModuleCard
          step={1}
          to="/rencontre"
          icon="user"
          title="Rencontre avec la famille"
          description="Prise d'informations guidée : identité, parcours, portrait, souvenirs, intervenants, musiques, gestes."
          status={toMeet ? plural(toMeet, 'rencontre à mener', 'rencontres à mener') : 'Aucune rencontre en attente'}
        />
        <ModuleCard
          step={2}
          to="/conception"
          icon="edit"
          title="Conception de la cérémonie"
          description="Les informations de la rencontre, mises au propre : textes, déroulé, musiques, photos et vidéos."
          status={inDesign ? plural(inDesign, 'cérémonie en écriture', 'cérémonies en écriture') : 'Aucune cérémonie en écriture'}
        />
        <ModuleCard
          step={3}
          to="/regie"
          icon="monitor"
          title="Régie de cérémonie"
          description="Le jour J : musiques, photos, textes et prises de parole, lancés dans l'ordre prévu."
          status={nextLive ? `Prochaine : ${nextLive.deceasedName || nextLive.title}, ${formatWhen(nextLive).toLowerCase()}` : 'Aucune cérémonie prête'}
          featured
        />
      </div>

      <section className="mt-8 overflow-hidden rounded-xl border border-line bg-panel">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Dossiers en cours</h2>
          <Link to="/dossiers" className="text-sm font-medium text-gold hover:text-fg">
            Tous les dossiers
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="border-t border-line px-6 py-8 text-center text-sm text-muted">
            Aucun dossier à venir. Commencez par une rencontre avec la famille.
          </p>
        ) : (
          <ul>
            {upcoming.slice(0, 8).map((c) => (
              <li key={c.id} className="border-t border-line">
                <Link
                  to={stagePath(c)}
                  className="grid min-h-14 grid-cols-1 items-center gap-2 px-6 py-3 transition-colors hover:bg-panel-2 md:grid-cols-[2fr_3fr_1.6fr]"
                >
                  <span className="font-medium text-fg">{c.deceasedName || c.title || 'Sans nom'}</span>
                  <DossierSteps ceremony={c} />
                  <span className="text-sm text-muted">{formatWhen(c)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Prochainement dans Céréo</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {comingSoon.map((f) => (
            <ComingSoonCard key={f.title} {...f} />
          ))}
        </div>
      </section>
    </div>
  )
}
