import { NavLink, Outlet } from 'react-router-dom'
import { useInstallPrompt } from '../lib/useInstallPrompt'
import { clearSession, loadSession } from '../lib/licensing/store'

const navItems = [
  { to: '/', label: 'Cérémonies', icon: '🕊️', end: true },
  { to: '/musique', label: 'Musique libre de droit', icon: '🎵' },
  { to: '/sauvegarde', label: 'Sauvegarde', icon: '💾' },
  { to: '/parametres', label: 'Paramètres', icon: '⚙️' },
]

function handleLogout() {
  clearSession()
  window.location.reload()
}

export default function AppShell() {
  const { canInstall, showIosHint, promptInstall } = useInstallPrompt()
  const session = loadSession()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink text-fg">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
        <div className="relative border-b border-line px-5 py-6">
          <div className="pointer-events-none absolute -left-4 -top-4 h-16 w-16 rounded-full bg-gold/20 blur-2xl animate-glow-pulse" />
          <h1 className="relative font-display text-xl tracking-wide text-gold">
            <span aria-hidden className="mr-1.5">
              🕊️
            </span>
            Céréma
          </h1>
          <p className="relative mt-1 text-xs text-muted">Régie de cérémonies</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-all duration-200 ${
                  isActive
                    ? 'border-gold bg-panel-2 text-gold'
                    : 'border-transparent text-muted hover:border-gold-dim hover:bg-panel-2 hover:text-fg'
                }`
              }
            >
              <span
                aria-hidden
                className="inline-block transition-transform duration-200 group-hover:scale-125"
              >
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          {canInstall && (
            <button
              onClick={promptInstall}
              className="mb-3 w-full rounded-md border border-gold-dim px-3 py-2 text-sm font-medium text-gold transition-colors hover:bg-panel-2"
            >
              ⤓ Installer l'application
            </button>
          )}
          {showIosHint && (
            <p className="mb-3 text-xs text-muted">
              Pour l'installer : icône Partager de Safari → « Sur l'écran d'accueil ».
            </p>
          )}
          <p className="text-xs text-muted">
            Fonctionne hors-ligne · données stockées sur cet appareil
          </p>
          {session && (
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <span className="flex min-w-0 items-center gap-2" title={session.username}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/20 text-xs font-medium text-gold">
                  {session.username.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate text-xs text-muted">{session.username}</span>
              </span>
              <button
                onClick={handleLogout}
                className="shrink-0 text-xs text-muted transition-colors hover:text-fg"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
