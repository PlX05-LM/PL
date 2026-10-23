import { Link } from 'react-router-dom'
import type { Ceremony } from '../types'
import { dossierStage, stageLabels, stagePath, type DossierStage } from '../lib/dossierStage'

const stages: DossierStage[] = [1, 2, 3]

/**
 * Avancement d'un dossier dans les trois modules. Avec `current`, l'écran affiché est mis
 * en avant et chaque étape mène à son module ; sans, c'est un simple indicateur (listes).
 */
export default function DossierSteps({ ceremony, current }: { ceremony: Ceremony; current?: DossierStage }) {
  const reached = dossierStage(ceremony)

  return (
    <div className="flex items-center gap-1.5" aria-label={`Étape : ${stageLabels[reached]}`}>
      {stages.map((s) => {
        const active = current ? s === current : s === reached
        const done = s < reached
        const cls = `whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          active
            ? 'bg-gold text-ink'
            : done
              ? 'border border-gold-dim/60 text-gold'
              : 'border border-line text-muted'
        }`
        const label = `${s} ${stageLabels[s]}${done && !active ? ' ✓' : ''}`
        return current && !active ? (
          <Link key={s} to={stagePath(ceremony, s)} className={`${cls} hover:border-gold-dim hover:text-fg`}>
            {label}
          </Link>
        ) : (
          <span key={s} className={cls} aria-current={active ? 'step' : undefined}>
            {label}
          </span>
        )
      })}
    </div>
  )
}
