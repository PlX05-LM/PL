import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { createEmptyCeremony, type Ceremony } from '../types'
import { newId } from '../lib/ids'
import { useNavigate } from 'react-router-dom'

const typeLabels: Record<Ceremony['ceremonyType'], string> = {
  obseques: 'Obsèques',
  creation: 'Crémation',
  inhumation: 'Inhumation',
  hommage: 'Hommage / recueillement',
  autre: 'Autre',
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function Dashboard() {
  const ceremonies =
    useLiveQuery(() => db.ceremonies.orderBy('date').reverse().toArray(), []) ??
    ([] as Ceremony[])
  const tracks = useLiveQuery(() => db.tracks.toArray(), []) ?? []
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    setCreating(true)
    const ceremony = createEmptyCeremony(newId())
    await db.ceremonies.add(ceremony)
    setCreating(false)
    navigate(`/ceremonies/${ceremony.id}`)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer définitivement cette cérémonie ?')) return
    await db.ceremonies.delete(id)
  }

  async function handleExportPdf(c: Ceremony) {
    const { exportCeremonyPdf } = await import('../lib/exportPdf')
    exportCeremonyPdf(c, tracks)
  }

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-3xl text-fg">Vos cérémonies</h2>
            {ceremonies.length > 0 && (
              <span className="animate-fade-in-up rounded-full border border-line bg-panel px-2.5 py-0.5 text-xs text-muted">
                {ceremonies.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">
            Préparez, organisez et pilotez chaque cérémonie de A à Z.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="group rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink transition-all duration-200 hover:bg-gold-dim hover:shadow-lg hover:shadow-gold/20 active:scale-95 disabled:opacity-60"
        >
          <span className="mr-1 inline-block transition-transform duration-200 group-hover:rotate-90">
            +
          </span>
          Nouvelle cérémonie
        </button>
      </div>

      {ceremonies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-12 text-center">
          <div className="animate-soft-float mb-4 text-5xl" aria-hidden>
            🕊️
          </div>
          <p className="text-muted">
            Aucune cérémonie pour le moment. Créez-en une pour commencer à
            préparer le déroulé, la musique et le diaporama.
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="mt-5 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:bg-gold-dim disabled:opacity-60"
          >
            + Créer votre première cérémonie
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {ceremonies.map((c, i) => (
            <li
              key={c.id}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              className="group animate-fade-in-up flex items-center justify-between rounded-lg border border-line bg-panel px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-gold-dim hover:shadow-lg hover:shadow-black/20"
            >
              <button
                className="flex-1 text-left"
                onClick={() => navigate(`/ceremonies/${c.id}`)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg text-fg">
                    {c.title || 'Sans titre'}
                  </span>
                  <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">
                    {typeLabels[c.ceremonyType]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {c.deceasedName ? `Pour ${c.deceasedName} · ` : ''}
                  {formatDate(c.date)} à {c.time} {c.location ? `· ${c.location}` : ''}
                </p>
              </button>
              <div className="flex items-center gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
                <button
                  onClick={() => handleExportPdf(c)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold-dim hover:text-fg"
                  title="Exporter le déroulé en PDF"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => navigate(`/ceremonies/${c.id}/live`)}
                  className="rounded-md border border-gold-dim px-3 py-1.5 text-xs font-medium text-gold transition-colors hover:bg-panel-2"
                >
                  ▶ Régie live
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="rounded-md border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-danger hover:text-danger"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
