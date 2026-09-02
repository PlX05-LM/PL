import { useState } from 'react'
import { categoryLabels, categoryOrder, textLibrary, type TextEntry } from '../lib/textLibrary'

interface Props {
  onInsert: (text: string) => void
  onClose: () => void
}

export default function TextLibraryModal({ onInsert, onClose }: Props) {
  const [category, setCategory] = useState(categoryOrder[0])
  const [selected, setSelected] = useState<TextEntry | null>(null)

  const entries = textLibrary.filter((t) => t.category === category)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="flex h-[80vh] w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-panel">
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-line bg-panel-2 p-2">
          {categoryOrder.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c)
                setSelected(null)
              }}
              className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ${
                c === category ? 'bg-gold text-ink' : 'text-muted hover:bg-panel hover:text-fg'
              }`}
            >
              {categoryLabels[c]}
            </button>
          ))}
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="font-display text-lg text-fg">{categoryLabels[category]}</h3>
            <button onClick={onClose} className="text-muted hover:text-fg">
              ✕
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <ul className="w-56 shrink-0 overflow-y-auto border-r border-line p-2">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    onClick={() => setSelected(entry)}
                    className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ${
                      selected?.id === entry.id
                        ? 'bg-panel-2 text-gold'
                        : 'text-muted hover:bg-panel-2 hover:text-fg'
                    }`}
                  >
                    {entry.title}
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-1 flex-col overflow-hidden p-4">
              {selected ? (
                <>
                  <div className="flex-1 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-panel-2 p-4 text-sm text-fg">
                    {selected.body}
                  </div>
                  <button
                    onClick={() => onInsert(selected.body)}
                    className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim"
                  >
                    + Insérer dans le texte de l'étape
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted">Sélectionnez un texte à gauche pour le prévisualiser.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
