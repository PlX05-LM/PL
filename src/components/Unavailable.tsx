import { Link } from 'react-router-dom'

/** Pastille « Indisponible » pour une fonctionnalité annoncée mais pas encore utilisable. */
export function UnavailableBadge({ label = 'Indisponible' }: { label?: string }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
      {label}
    </span>
  )
}

/**
 * Fonctionnalité qui passe par le service en ligne de Céréo (IA, lien famille) : quand il
 * n'est pas configuré, on l'annonce comme indisponible et on dit comment l'activer.
 */
export function ServiceRequiredNote({ feature }: { feature: string }) {
  return (
    <p className="text-xs leading-relaxed text-muted">
      <UnavailableBadge /> {feature} passe par le service en ligne de Céréo, pas encore configuré sur ce poste. Pour
      l'activer :{' '}
      <Link to="/parametres" className="text-gold underline-offset-2 hover:underline">
        Paramètres → Service en ligne
      </Link>
      .
    </p>
  )
}

/** Carte d'une fonctionnalité à venir. */
export function ComingSoonCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line bg-panel/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg leading-tight text-fg">{title}</h3>
        <UnavailableBadge label="Bientôt" />
      </div>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </div>
  )
}
