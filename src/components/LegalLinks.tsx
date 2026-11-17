import { Link } from 'react-router-dom'

const legalPages = [
  ['confidentialite', 'Confidentialité'],
  ['mentions-legales', 'Mentions légales'],
  ['conditions', 'Conditions générales'],
  ['sous-traitance', 'Contrat de sous-traitance'],
] as const

/** Liens vers les textes juridiques, accessibles sans licence. */
export default function LegalLinks({ className = '' }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted ${className}`}>
      {legalPages.map(([slug, label]) => (
        <Link key={slug} to={`/legal/${slug}`} className="hover:text-fg">
          {label}
        </Link>
      ))}
    </nav>
  )
}
