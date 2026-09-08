import { useState } from 'react'
import { AiGenerationError, generateSegmentTextAI, isAiConfigured } from '../lib/aiGeneration'
import Icon from './Icon'
import type { CeremonyType } from '../types'

interface Props {
  ceremonyType: CeremonyType
  deceasedName?: string
  segmentTitle: string
  onInsert: (text: string) => void
  onClose: () => void
}

export default function AIGenerateModal({ ceremonyType, deceasedName, segmentTitle, onInsert, onClose }: Props) {
  const [instructions, setInstructions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const configured = isAiConfigured()

  async function handleGenerate() {
    if (!instructions.trim()) return
    setGenerating(true)
    setError(null)
    try {
      const text = await generateSegmentTextAI({ ceremonyType, deceasedName, segmentTitle, instructions })
      setGeneratedText(text)
    } catch (err) {
      setError(err instanceof AiGenerationError ? err.message : 'La génération par IA a échoué.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="flex items-center gap-2 font-display text-lg text-fg">
            <Icon name="sparkle" className="h-4 w-4 text-gold" />
            Générer avec l'IA — {segmentTitle}
          </h3>
          <button onClick={onClose} className="text-muted hover:text-fg">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!configured ? (
            <p className="text-sm text-muted">
              La génération par IA n'est pas configurée. Renseignez l'adresse du service et le
              jeton d'application dans Paramètres → Génération de texte par IA.
            </p>
          ) : (
            <>
              <label className="mb-3 block text-xs text-muted">
                Mots-clés ou consignes pour cette étape
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  placeholder="Ex. : accueil chaleureux de la famille, mentionner que la cérémonie a lieu au printemps, ton sobre"
                  className="mt-1 w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-gold-dim focus:outline-none"
                  autoFocus
                />
              </label>
              <button
                onClick={handleGenerate}
                disabled={!instructions.trim() || generating}
                className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-50"
              >
                {generating ? 'Génération…' : generatedText ? 'Régénérer' : 'Générer'}
              </button>
              <p className="mt-2 text-xs text-muted">Nécessite une connexion internet.</p>

              {error && (
                <p className="mt-3 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}

              {generatedText && (
                <>
                  <textarea
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    rows={8}
                    className="mt-3 w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-fg outline-none focus:border-gold-dim"
                  />
                  <button
                    onClick={() => onInsert(generatedText)}
                    className="mt-3 rounded-md border border-gold-dim px-4 py-2 text-sm font-medium text-gold hover:bg-panel-2"
                  >
                    + Insérer dans le texte de l'étape
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
