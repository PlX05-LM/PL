import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'

/** Pendant la régie ou sur l'écran projeté, jamais de rechargement : la cérémonie passe avant. */
const isLive = (path: string) => /^\/ceremonies\/[^/]+\/live/.test(path) || path.startsWith('/projector/')
/** Formulaire famille : pas de rechargement sous les doigts d'un proche qui écrit. */
const isFamily = (path: string) => path.startsWith('/famille/')

/** Juste après l'ouverture, rien n'est encore en cours de saisie : on peut recharger. */
const STARTUP_MS = 20_000
/** Vérification régulière d'une nouvelle version, pour les postes qui restent ouverts. */
const CHECK_EVERY_MS = 30 * 60_000

/**
 * Mises à jour automatiques : une nouvelle version s'installe d'elle-même à l'ouverture de
 * Céréo, ou dès que la fenêtre passe en arrière-plan, mais jamais pendant une cérémonie.
 * Le bandeau ne reste qu'en secours, pour mettre à jour tout de suite.
 */
export default function PwaUpdatePrompt() {
  const location = useLocation()
  const [needRefresh, setNeedRefresh] = useState(false)
  const update = useRef<((reload?: boolean) => Promise<void>) | null>(null)
  const path = useRef(location.pathname)
  const openedAt = useRef(Date.now())

  useEffect(() => {
    path.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    update.current = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
        const atStartup = Date.now() - openedAt.current < STARTUP_MS && !isFamily(path.current)
        if (!isLive(path.current) && (atStartup || document.hidden)) {
          update.current?.(true)
        }
      },
      onRegisteredSW(_url, registration) {
        if (!registration) return
        const check = () => {
          if (navigator.onLine) registration.update().catch(() => {})
        }
        setInterval(check, CHECK_EVERY_MS)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') check()
        })
      },
    })
  }, [])

  // Version en attente : installée dès que la fenêtre passe en arrière-plan (rien à l'écran
  // n'est alors en cours), ou en quittant la régie.
  useEffect(() => {
    if (!needRefresh) return
    const apply = () => {
      if (!isLive(path.current)) update.current?.(true)
    }
    const onHidden = () => {
      if (document.visibilityState === 'hidden') apply()
    }
    document.addEventListener('visibilitychange', onHidden)
    return () => document.removeEventListener('visibilitychange', onHidden)
  }, [needRefresh])

  // Écran de projection réservé au public : jamais de bandeau technique par-dessus.
  if (location.pathname.startsWith('/projector/') || isFamily(location.pathname)) return null
  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-gold-dim bg-panel px-4 py-3 shadow-lg">
      <span className="text-sm text-fg">
        {isLive(location.pathname)
          ? 'Une mise à jour de Céréo s’installera après la cérémonie.'
          : 'Une mise à jour de Céréo est prête.'}
      </span>
      {!isLive(location.pathname) && (
        <button
          onClick={() => update.current?.(true)}
          className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-dim"
        >
          Mettre à jour maintenant
        </button>
      )}
    </div>
  )
}
