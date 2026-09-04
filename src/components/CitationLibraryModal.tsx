import { useState } from 'react'
import {
  citationCategoryLabels,
  citationCategoryOrder,
  citationLibrary,
  citationLibraryDisclaimer,
  contemporaryGriefReadingList,
  type CitationEntry,
} from '../lib/citationLibrary'

interface Props {
  onInsert: (text: string) => void
  onClose: () => void
}

function formatCitation(citation: CitationEntry): string {
  return `« ${citation.quote} »\n\n— ${citation.author}, ${citation.work}`
}

export default function CitationLibraryModal({ onInsert, onClose }: Props) {
  const [category, setCategory] = useState(citationCategoryOrder[0])
  const [selected, setSelected] = useState<CitationEntry | null>(null)
  const [showReadingList, setShowReadingList] = useState(false)

  const entries = citationLibrary.filter((c) => c.categories.includes(category))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-lg border border-line bg-panel">
        <aside className="w-64 shrink-0 overflow-y-auto border-r border-line bg-panel-2 p-2">
          {citationCategoryOrder.map((c) => (
            <button
              key={c}
              onClick={() => {
                setCategory(c)
                setSelected(null)
                setShowReadingList(false)
              }}
              className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ${
                c === category && !showReadingList
                  ? 'bg-gold text-ink'
                  : 'text-muted hover:bg-panel hover:text-fg'
              }`}
            >
              {citationCategoryLabels[c]}
            </button>
          ))}
          <button
            onClick={() => setShowReadingList(true)}
            className={`mt-2 block w-full rounded-md border border-line px-3 py-2 text-left text-sm ${
              showReadingList ? 'bg-gold text-ink' : 'text-muted hover:bg-panel hover:text-fg'
            }`}
          >
            📚 Lectures conseillées (sous droits)
          </button>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="font-display text-lg text-fg">
              {showReadingList ? 'Lectures conseillées' : citationCategoryLabels[category]}
            </h3>
            <button onClick={onClose} className="text-muted hover:text-fg">
              ✕
            </button>
          </div>
          <p className="border-b border-line bg-panel-2 px-4 py-2 text-xs text-muted">
            {citationLibraryDisclaimer}
          </p>

          {showReadingList ? (
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-sm text-muted">
                Ouvrages de référence sur le deuil, pour votre culture professionnelle. Toujours
                sous droits d'auteur : à lire et à vous approprier, jamais à citer intégralement
                sans avoir acquis l'ouvrage.
              </p>
              <ul className="space-y-2">
                {contemporaryGriefReadingList.map((book) => (
                  <li
                    key={book.title}
                    className="rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-fg"
                  >
                    <span className="font-display">{book.title}</span>
                    <span className="text-muted"> — {book.author}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              <ul className="w-64 shrink-0 overflow-y-auto border-r border-line p-2">
                {entries.length === 0 && (
                  <li className="px-3 py-2 text-sm text-muted">
                    Aucune citation dans cette catégorie pour l'instant.
                  </li>
                )}
                {entries.map((citation) => (
                  <li key={citation.id}>
                    <button
                      onClick={() => setSelected(citation)}
                      className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ${
                        selected?.id === citation.id
                          ? 'bg-panel-2 text-gold'
                          : 'text-muted hover:bg-panel-2 hover:text-fg'
                      }`}
                    >
                      <span className="block">{citation.work}</span>
                      <span className="block text-xs text-muted">{citation.author}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex flex-1 flex-col overflow-hidden p-4">
                {selected ? (
                  <>
                    <div className="mb-2">
                      <p className="font-display text-base text-fg">{selected.work}</p>
                      <p className="text-xs text-muted">
                        {selected.author} ({selected.authorDates})
                      </p>
                    </div>
                    <p className="mb-3 rounded-md border border-gold-dim/40 bg-panel-2 px-3 py-2 text-xs text-gold">
                      💡 {selected.note}
                    </p>
                    <div className="flex-1 overflow-y-auto whitespace-pre-wrap rounded-md border border-line bg-panel-2 p-4 font-display text-sm text-fg">
                      « {selected.quote} »
                    </div>
                    <button
                      onClick={() => onInsert(formatCitation(selected))}
                      className="mt-3 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim"
                    >
                      + Insérer dans le texte de l'étape
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    Sélectionnez une citation à gauche pour la prévisualiser.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
