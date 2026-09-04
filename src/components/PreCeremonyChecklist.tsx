import { useState } from 'react'
import { preCeremonyChecklistItems } from '../lib/preCeremonyChecklist'

interface Props {
  onClose: () => void
}

export default function PreCeremonyChecklist({ onClose }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const doneCount = Object.values(checked).filter(Boolean).length

  function toggle(i: number) {
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="font-display text-lg text-fg">Check-list avant le direct</h3>
          <button onClick={onClose} className="text-muted hover:text-fg">
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <p className="mb-4 text-sm text-muted">
            {doneCount}/{preCeremonyChecklistItems.length} vérifié(s) — purement indicatif, rien n'est
            enregistré ni requis pour démarrer.
          </p>
          <ul className="space-y-2">
            {preCeremonyChecklistItems.map((item, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-panel-2 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={!!checked[i]}
                    onChange={() => toggle(i)}
                    className="mt-0.5 h-4 w-4 accent-gold"
                  />
                  <span className={`text-sm ${checked[i] ? 'text-muted line-through' : 'text-fg'}`}>
                    {item}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end border-t border-line px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
