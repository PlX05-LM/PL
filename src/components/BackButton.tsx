import { useNavigate } from 'react-router-dom'
import Icon from './Icon'

interface BackButtonProps {
  /** Écran à ouvrir si l'on arrive directement sur cette page (aucun écran précédent dans l'appli). */
  fallback: string
  label?: string
  className?: string
}

/** Vrai retour arrière : revient à l'écran précédemment consulté, sinon à l'écran parent. */
export default function BackButton({ fallback, label = 'Retour', className = '' }: BackButtonProps) {
  const navigate = useNavigate()

  function goBack() {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className={`group inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg ${className}`}
    >
      <Icon
        name="arrow-left"
        className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5"
      />
      {label}
    </button>
  )
}
