import { useEffect, useState } from 'react'
import {
  actionLabels,
  actionOrder,
  defaultKeymap,
  keyDisplayName,
  normalizeKey,
  type Keymap,
  type RemoteAction,
} from '../lib/remoteControl'

interface Props {
  keymap: Keymap
  onChange: (next: Keymap) => void
  onClose: () => void
}

export default function RemoteControlSettings({ keymap, onChange, onClose }: Props) {
  const [listeningFor, setListeningFor] = useState<RemoteAction | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  useEffect(() => {
    if (!listeningFor) return
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault()
      if (e.key === 'Escape') {
        setListeningFor(null)
        setConflict(null)
        return
      }
      const key = normalizeKey(e.key)
      const usedBy = actionOrder.find(
        (a) => a !== listeningFor && normalizeKey(keymap[a]) === key,
      )
      if (usedBy) {
        setConflict(
          `Déjà utilisée pour « ${actionLabels[usedBy]} ». Choisissez une autre touche, ou Échap pour annuler.`,
        )
        return
      }
      onChange({ ...keymap, [listeningFor as RemoteAction]: e.key })
      setListeningFor(null)
      setConflict(null)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [listeningFor, keymap, onChange])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="font-display text-lg text-fg">Clavier & télécommande</h3>
          <button onClick={onClose} className="text-muted hover:text-fg">
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          <p className="mb-4 text-sm text-muted">
            Fonctionne avec le clavier ou toute télécommande de présentation
            Bluetooth/USB (elle envoie des touches clavier standard). Sans effet
            pendant que vous modifiez le texte du prompteur.
          </p>
          <ul className="space-y-2">
            {actionOrder.map((action) => (
              <li
                key={action}
                className="flex items-center justify-between rounded-md border border-line bg-panel-2 px-3 py-2"
              >
                <span className="text-sm text-fg">{actionLabels[action]}</span>
                <button
                  onClick={() => {
                    setConflict(null)
                    setListeningFor(action)
                  }}
                  className={`min-w-20 rounded-md border px-3 py-1.5 text-xs font-mono ${
                    listeningFor === action
                      ? 'border-gold bg-gold text-ink'
                      : 'border-gold-dim text-gold hover:bg-panel'
                  }`}
                >
                  {listeningFor === action ? 'Appuyez…' : keyDisplayName(keymap[action])}
                </button>
              </li>
            ))}
          </ul>
          {conflict && <p className="mt-3 text-xs text-danger">{conflict}</p>}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <button
            onClick={() => {
              onChange({ ...defaultKeymap })
              setListeningFor(null)
              setConflict(null)
            }}
            className="text-xs text-muted hover:text-fg"
          >
            Réinitialiser les valeurs par défaut
          </button>
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
