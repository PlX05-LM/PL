import { NavLink, Outlet } from 'react-router-dom'
import { useInstallPrompt } from '../lib/useInstallPrompt'
import { clearSession, loadSession } from '../lib/licensing/store'

const navItems = [
  { to: '/', label: 'Cérémonies', icon: '🕊️', end: true },
  { to: '/musique', label: 'Musiques', icon: '♪' },
  { to: '/photos', label: 'Photothèque', icon: '⌘' },
  { to: '/sauvegarde', label: 'Sauvegarde', icon: '⤓' },
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
        <div className="border-b border-line px-5 py-6">
          <h1 className="font-display text-xl tracking-wide text-gold">Céréma</h1>
          <p className="mt-1 text-xs text-muted">Régie de cérémonies</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-panel-2 text-gold'
                    : 'text-muted hover:bg-panel-2 hover:text-fg'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          {canInstall && (
            <button
              onClick={promptInstall}
              className="mb-3 w-full rounded-md border border-gold-dim px-3 py-2 text-sm font-medium text-gold hover:bg-panel-2"
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
              <span className="truncate text-xs text-muted" title={session.username}>
                👤 {session.username}
              </span>
              <button onClick={handleLogout} className="text-xs text-muted hover:text-fg">
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
