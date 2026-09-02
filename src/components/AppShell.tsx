import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Cérémonies', icon: '🕊️', end: true },
  { to: '/musique', label: 'Musiques', icon: '♪' },
  { to: '/photos', label: 'Photothèque', icon: '⌘' },
]

export default function AppShell() {
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
        <div className="border-t border-line p-4 text-xs text-muted">
          Fonctionne hors-ligne · données stockées sur cet appareil
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
