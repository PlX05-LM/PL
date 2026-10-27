import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import type { MeetingAnswers } from '../types'
import { fetchFamily, FamilyLinkError, familySections, saveFamily, type FamilyPayload } from '../lib/familyLink'
import type { FieldValue } from '../lib/meetingGuide'
import MeetingFieldInput, { inputClass } from '../components/MeetingFieldInput'
import Icon from '../components/Icon'

type SaveState = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

const nameKey = (id: string) => `cereo-famille-nom-${id}`

function readName(id: string): string {
  try {
    return localStorage.getItem(nameKey(id)) ?? ''
  } catch {
    return ''
  }
}

/**
 * Formulaire ouvert par la famille depuis le lien reçu (téléphone, sans compte ni
 * licence). Les réponses s'enregistrent au fil de la saisie, chiffrées ; plusieurs proches
 * peuvent remplir le même lien : chacun n'envoie que les rubriques qu'il a modifiées.
 */
export default function FamilyForm() {
  const { id = '', key = '' } = useParams<{ id: string; key: string }>()
  const [params] = useSearchParams()
  const endpoint = params.get('s') ?? ''

  const [loadError, setLoadError] = useState<string | null>(null)
  const [base, setBase] = useState<FamilyPayload | null>(null)
  const [expiresAt, setExpiresAt] = useState(0)
  const [answers, setAnswers] = useState<MeetingAnswers>({})
  const [name, setName] = useState(() => readName(id))
  const [nameConfirmed, setNameConfirmed] = useState(() => readName(id) !== '')
  const [step, setStep] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [finished, setFinished] = useState(false)

  const answersRef = useRef(answers)
  answersRef.current = answers
  // Version de chaque rubrique modifiée et pas encore envoyée.
  const dirty = useRef(new Map<string, number>())
  const saving = useRef(false)
  const finishRequested = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!endpoint) {
      setLoadError('Ce lien est incomplet : vérifiez qu’il a été copié en entier.')
      return
    }
    fetchFamily(endpoint, id, key)
      .then((state) => {
        setBase(state.payload)
        setAnswers(state.payload.answers)
        setExpiresAt(state.expiresAt)
      })
      .catch((err) => setLoadError(err instanceof FamilyLinkError ? err.message : 'Ce lien ne peut pas être ouvert.'))
  }, [endpoint, id, key])

  const flush = useCallback(async () => {
    if (saving.current || (dirty.current.size === 0 && !finishRequested.current)) return
    saving.current = true
    setSaveState('saving')
    const sent = new Map(dirty.current)
    try {
      // Relit la dernière version pour ne pas écraser ce qu'un autre proche a écrit.
      const remote = await fetchFamily(endpoint, id, key)
      const merged: MeetingAnswers = { ...remote.payload.answers }
      for (const fieldId of sent.keys()) merged[fieldId] = answersRef.current[fieldId]
      const who = name.trim()
      const payload: FamilyPayload = {
        ...remote.payload,
        answers: merged,
        contributors: who && !remote.payload.contributors.includes(who) ? [...remote.payload.contributors, who] : remote.payload.contributors,
        finishedAt: finishRequested.current ? Date.now() : remote.payload.finishedAt,
        updatedAt: Date.now(),
      }
      await saveFamily(endpoint, id, key, payload)
      for (const [fieldId, version] of sent) {
        if (dirty.current.get(fieldId) === version) dirty.current.delete(fieldId)
      }
      // Ce que les autres proches ont saisi entre-temps apparaît aussi ici.
      setAnswers((current) => {
        const next = { ...merged }
        for (const fieldId of dirty.current.keys()) next[fieldId] = current[fieldId]
        return next
      })
      if (finishRequested.current) {
        finishRequested.current = false
        setFinished(true)
      }
      setSaveState('saved')
    } catch (err) {
      setSaveState(navigator.onLine ? 'error' : 'offline')
      if (err instanceof FamilyLinkError && err.status === 404) setLoadError(err.message)
    } finally {
      saving.current = false
      if (dirty.current.size > 0) schedule(4000)
    }
  }, [endpoint, id, key, name]) // eslint-disable-line react-hooks/exhaustive-deps

  function schedule(delay = 2500) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => flush(), delay)
  }

  useEffect(() => {
    const onOnline = () => flush()
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flush])

  function setValue(fieldId: string, value: FieldValue) {
    setAnswers((a) => ({ ...a, [fieldId]: value }))
    dirty.current.set(fieldId, (dirty.current.get(fieldId) ?? 0) + 1)
    setSaveState('idle')
    schedule()
  }

  function confirmName() {
    try {
      localStorage.setItem(nameKey(id), name.trim())
    } catch {
      // stockage indisponible : le prénom sera redemandé à la prochaine visite.
    }
    setNameConfirmed(true)
  }

  function goTo(next: number) {
    setStep(next)
    window.scrollTo({ top: 0 })
  }

  function finish() {
    finishRequested.current = true
    flush()
  }

  const deceased = base?.deceasedName || 'votre proche'
  const until = expiresAt ? new Date(expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : ''

  const shell = (children: React.ReactNode) => (
    <div className="min-h-full bg-ink">
      <div className="mx-auto max-w-xl px-4 pb-16 pt-6">
        <p className="flex items-center gap-2 font-display text-lg text-gold">
          <Icon name="flame" className="h-5 w-5" />
          Céréo
        </p>
        {children}
      </div>
    </div>
  )

  if (loadError) {
    return shell(
      <div className="mt-10 rounded-xl border border-line bg-panel p-6 text-center">
        <h1 className="font-display text-2xl text-fg">Lien indisponible</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{loadError}</p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          N'hésitez pas à contacter l'agence funéraire, qui pourra vous envoyer un nouveau lien.
        </p>
      </div>,
    )
  }

  if (!base) return shell(<p className="mt-10 text-center text-muted">Ouverture…</p>)

  if (finished) {
    return shell(
      <div className="mt-10 rounded-xl border border-line bg-panel p-6 text-center">
        <h1 className="font-display text-2xl text-fg">Merci</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Vos réponses ont bien été transmises au maître de cérémonie. Elles l'aideront à préparer un hommage
          fidèle à {deceased}.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Vous pouvez revenir les compléter{until ? ` jusqu'au ${until}` : ''} avec le même lien.
        </p>
        <button
          type="button"
          onClick={() => setFinished(false)}
          className="mt-5 min-h-12 rounded-lg border border-gold-dim px-5 text-sm font-medium text-gold"
        >
          Revenir au formulaire
        </button>
      </div>,
    )
  }

  if (!nameConfirmed) {
    return shell(
      <div className="mt-8 space-y-5">
        <div>
          <h1 className="font-display text-3xl leading-tight text-fg">Pour l'hommage à {deceased}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Ce formulaire aide le maître de cérémonie à préparer une cérémonie qui lui ressemble. Remplissez
            seulement ce que vous souhaitez, à votre rythme : quelques mots suffisent, tout est enregistré au fur
            et à mesure. Vous pouvez aussi transmettre ce lien à d'autres proches.
          </p>
          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-gold-dim" />
            Vos réponses sont chiffrées et ne sont lisibles que par l'agence. Elles sont effacées
            automatiquement{until ? ` après le ${until}` : ''}.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <label htmlFor="famille-nom" className="mb-2 block text-sm font-medium text-fg">
            Qui remplit ce formulaire ?
          </label>
          <input
            id="famille-nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. : Sophie, sa fille"
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={confirmName}
          className="min-h-12 w-full rounded-lg bg-gold px-5 text-base font-semibold text-ink"
        >
          Commencer
        </button>
      </div>,
    )
  }

  const current = familySections[step]
  const isLast = step === familySections.length - 1
  const saveLabel: Record<SaveState, string> = {
    idle: '',
    saving: 'Enregistrement…',
    saved: 'Enregistré ✓',
    offline: 'Hors connexion : vos réponses partiront au retour du réseau',
    error: 'Enregistrement impossible pour le moment, nouvel essai en cours…',
  }

  return shell(
    <div className="mt-4">
      <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-ink/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <label className="sr-only" htmlFor="famille-etape">
            Rubrique
          </label>
          <select
            id="famille-etape"
            value={step}
            onChange={(e) => goTo(Number(e.target.value))}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-line bg-panel px-2 text-sm text-fg"
          >
            {familySections.map((s, i) => (
              <option key={s.section.id} value={i}>
                {i + 1}. {s.section.title}
              </option>
            ))}
          </select>
          <span className="shrink-0 text-xs text-muted">
            {step + 1} / {familySections.length}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-panel-2">
          <div className="h-full bg-gold transition-all" style={{ width: `${((step + 1) / familySections.length) * 100}%` }} />
        </div>
        <p className="mt-1 h-4 text-xs text-muted" aria-live="polite">
          {saveLabel[saveState]}
        </p>
      </div>

      <h1 className="mt-5 font-display text-3xl text-fg">{current.section.title}</h1>
      <p className="mt-1 text-sm text-muted">{current.section.subtitle}</p>

      <div className="mt-5 space-y-4">
        {current.fields.map(({ field, label, tip }) => (
          <MeetingFieldInput
            key={field.id}
            field={field}
            label={label}
            tip={tip}
            value={answers[field.id] ?? (field.type === 'chips' ? [] : '')}
            onChange={(v) => setValue(field.id, v)}
          />
        ))}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            className="min-h-12 flex-1 rounded-lg border border-line px-4 text-sm text-muted"
          >
            Précédent
          </button>
        )}
        {isLast ? (
          <button type="button" onClick={finish} className="min-h-12 flex-1 rounded-lg bg-gold px-4 text-base font-semibold text-ink">
            J'ai terminé
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goTo(step + 1)}
            className="min-h-12 flex-1 rounded-lg bg-gold px-4 text-base font-semibold text-ink"
          >
            Suivant
          </button>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        Rien n'est obligatoire. Vous pouvez passer une rubrique et y revenir plus tard.
      </p>
    </div>,
  )
}
