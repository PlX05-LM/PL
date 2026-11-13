import { useState } from 'react'
import {
  deleteFile,
  DOCUMENT_ACCEPT,
  FamilyMediaError,
  formatSize,
  newFamilyText,
  prepareFile,
  uploadFile,
  type FamilyMediaItem,
  type FamilyMediaKind,
  type FamilyText,
} from '../lib/familyMedia'
import { inputClass } from './MeetingFieldInput'

interface Props {
  endpoint: string
  linkId: string
  linkKey: string
  by: string
  media: FamilyMediaItem[]
  texts: FamilyText[]
  onAddMedia: (item: FamilyMediaItem) => void
  onAddText: (text: FamilyText) => void
  onRemove: (id: string) => void
}

const kindLabels: Record<FamilyMediaKind, string> = { photo: 'Photo', video: 'Vidéo', document: 'Document' }

const pickButton =
  'flex min-h-12 cursor-pointer items-center justify-center rounded-lg border border-gold-dim px-3 text-center text-sm font-medium text-gold'

/**
 * Étape « Photos, vidéos et textes » du formulaire famille : chaque fichier est préparé et
 * chiffré dans le téléphone, puis envoyé ; la liste montre à tous les proches ce qui a déjà
 * été partagé.
 */
export default function FamilyMediaStep({ endpoint, linkId, linkKey, by, media, texts, onAddMedia, onAddText, onRemove }: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  async function send(files: FileList | null, kind: FamilyMediaKind) {
    if (!files?.length) return
    setBusy(true)
    setErrors([])
    const problems: string[] = []
    const list = Array.from(files)
    for (const [i, file] of list.entries()) {
      const label = list.length > 1 ? `${i + 1} / ${list.length} — ` : ''
      try {
        setStatus(`${label}Préparation de « ${file.name} »…`)
        const prepared = await prepareFile(file, kind)
        const item = await uploadFile(endpoint, linkId, linkKey, prepared, by, (f) =>
          setStatus(`${label}Envoi de « ${file.name} » : ${Math.round(f * 100)} %`),
        )
        onAddMedia(item)
      } catch (e) {
        problems.push(e instanceof FamilyMediaError ? e.message : `« ${file.name} » n'a pas pu être envoyé.`)
      }
    }
    setStatus(null)
    setErrors(problems)
    setBusy(false)
  }

  async function remove(item: FamilyMediaItem) {
    onRemove(item.id)
    deleteFile(endpoint, linkId, item.id).catch(() => {})
  }

  function addText() {
    if (!body.trim()) return
    onAddText(newFamilyText(title, body, by))
    setTitle('')
    setBody('')
  }

  return (
    <div className="mt-5 space-y-5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className={`${pickButton} ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          + Photos
          <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => send(e.target.files, 'photo')} />
        </label>
        <label className={`${pickButton} ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          + Vidéo
          <input type="file" accept="video/*" className="sr-only" disabled={busy} onChange={(e) => send(e.target.files, 'video')} />
        </label>
        <label className={`${pickButton} ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          + Document
          <input type="file" accept={DOCUMENT_ACCEPT} multiple className="sr-only" disabled={busy} onChange={(e) => send(e.target.files, 'document')} />
        </label>
      </div>
      <p className="text-xs leading-relaxed text-muted">
        Photos réduites automatiquement pour l'écran. Vidéos jusqu'à 300 Mo, documents (PDF, Word…) jusqu'à 20 Mo. Tout est
        chiffré depuis ce téléphone : seule l'agence peut les voir.
      </p>
      {status && (
        <p className="rounded-md bg-panel px-3 py-2 text-sm text-gold" aria-live="polite">
          {status}
        </p>
      )}
      {errors.length > 0 && (
        <ul className="space-y-1 rounded-md border border-danger px-3 py-2 text-xs text-danger">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-line bg-panel p-4">
        <p className="mb-2 text-sm font-medium text-fg">Écrire un texte</p>
        <p className="mb-3 text-xs leading-relaxed text-muted">
          Un discours, un poème, un message à lire pendant la cérémonie : le maître de cérémonie le retrouvera dans le
          déroulé.
        </p>
        <label htmlFor="famille-texte-titre" className="sr-only">
          Titre du texte
        </label>
        <input
          id="famille-texte-titre"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre (ex. : Lettre à Mamie)"
          className={`${inputClass} mb-2`}
        />
        <label htmlFor="famille-texte" className="sr-only">
          Texte
        </label>
        <textarea
          id="famille-texte"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Votre texte…"
          className={`${inputClass} resize-y leading-relaxed`}
        />
        <button
          type="button"
          onClick={addText}
          disabled={!body.trim()}
          className="mt-2 min-h-11 w-full rounded-lg bg-gold px-4 text-sm font-semibold text-ink disabled:opacity-40"
        >
          Ajouter ce texte
        </button>
      </div>

      {(media.length > 0 || texts.length > 0) && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Déjà partagé ({media.length + texts.length})</p>
          <ul className="divide-y divide-line rounded-lg border border-line bg-panel">
            {texts.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-16 shrink-0 text-xs text-gold">Texte</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{t.title || t.body.slice(0, 40)}</span>
                  {t.by && <span className="block text-xs text-muted">par {t.by}</span>}
                </span>
                <button type="button" onClick={() => onRemove(t.id)} aria-label={`Retirer ${t.title || 'ce texte'}`} className="p-2 text-muted hover:text-danger">
                  ✕
                </button>
              </li>
            ))}
            {media.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-16 shrink-0 text-xs text-gold">{kindLabels[m.kind]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">{m.name}</span>
                  <span className="block text-xs text-muted">
                    {formatSize(m.size)}
                    {m.by && ` · par ${m.by}`}
                  </span>
                </span>
                <button type="button" onClick={() => remove(m)} aria-label={`Retirer ${m.name}`} className="p-2 text-muted hover:text-danger">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
