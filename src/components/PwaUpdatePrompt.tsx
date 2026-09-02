import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'

export default function PwaUpdatePrompt() {
  const location = useLocation()
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateApp, setUpdateApp] = useState<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
      },
    })
    setUpdateApp(() => update)
  }, [])

  // Écran de projection réservé au public : jamais de bandeau technique par-dessus.
  if (location.pathname.startsWith('/projector/')) return null
  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-gold-dim bg-panel px-4 py-3 shadow-lg">
      <span className="text-sm text-fg">
        Une mise à jour de Céréma est disponible.
      </span>
      <button
        onClick={() => updateApp?.(true)}
        className="rounded-md bg-gold px-3 py-1.5 text-xs font-medium text-ink hover:bg-gold-dim"
      >
        Mettre à jour
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-xs text-muted hover:text-fg"
      >
        Plus tard
      </button>
    </div>
  )
}
