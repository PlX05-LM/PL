import { useState } from 'react'
import {
  poemCategoryLabels,
  poemCategoryOrder,
  poemLibrary,
  poemLibraryDisclaimer,
  type PoemEntry,
} from '../lib/poemLibrary'

interface Props {
  onInsert: (text: string) => void
  onClose: () => void
}

function formatPoem(poem: PoemEntry): string {
  return `${poem.body}\n\n— ${poem.author} (${poem.authorDates})`
}

export default function PoemLibraryModal({ onInsert, onClose }: Props) {
  const [category, setCategory] = useState(poemCategoryOrder[0])
  const [selected, setSelected] = useState<PoemEntry | null>(null)

  const entries = poemLibrary.filter((p) => p.categories.includes(category))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-panel">
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-line bg-panel-2 p-2">
          {poemCategoryOrder.map((c) => (
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
              {poemCategoryLabels[c]}
            </button>
          ))}
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="font-display text-lg text-fg">{poemCategoryLabels[category]}</h3>
            <button onClick={onClose} className="text-muted hover:text-fg">
              ✕
            </button>
          </div>
          <p className="border-b border-line bg-panel-2 px-4 py-2 text-xs text-muted">
            {poemLibraryDisclaimer}
          </p>

          <div className="flex flex-1 overflow-hidden">
            <ul className="w-64 shrink-0 overflow-y-auto border-r border-line p-2">
              {entries.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">
                  Aucun poème dans cette catégorie pour l'instant.
                </li>
              )}
              {entries.map((poem) => (
                <li key={poem.id}>
                  <button
                    onClick={() => setSelected(poem)}
                    className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ${
                      selected?.id === poem.id
                        ? 'bg-panel-2 text-gold'
                        : 'text-muted hover:bg-panel-2 hover:text-fg'
                    }`}
                  >
                    <span className="block">{poem.title}</span>
                    <span className="block text-xs text-muted">{poem.author}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex flex-1 flex-col overflow-hidden p-4">
              {selected ? (
                <>
                  <div className="mb-2">
                    <p className="font-display text-base text-fg">{selected.title}</p>
                    <p className="text-xs text-muted">
                      {selected.author} ({selected.authorDates})
                      {selected.excerpt && ' · extrait'}
                    </p>
                  </div>
                  <p className="mb-3 rounded-md border border-gold-dim/40 bg-panel-2 px-3 py-2 text-xs text-gold">
                    💡 {selected.note}
                  </p>
                  <div className="flex-1 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-panel-2 p-4 font-display text-sm text-fg">
                    {selected.body}
                  </div>
                  <button
                    onClick={() => onInsert(formatPoem(selected))}
                    className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim"
                  >
                    + Insérer dans le texte de l'étape
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted">Sélectionnez un poème à gauche pour le prévisualiser.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
