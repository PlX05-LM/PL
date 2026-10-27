import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { Ceremony } from '../types'
import { useDebouncedCallback } from '../lib/useDebouncedEffect'
import {
  meetingProgress,
  meetingSections,
  readField,
  sectionStatus,
  writeField,
  type FieldValue,
  type MeetingField,
  type SectionStatus,
} from '../lib/meetingGuide'
import { buildDraftSegments } from '../lib/meetingDraft'
import { eulogyAiInstructions, writeEulogy } from '../lib/ceremonyWriter'
import { AiGenerationError, generateSegmentTextAI, isAiConfigured } from '../lib/aiGeneration'
import BackButton from '../components/BackButton'
import DossierSteps from '../components/DossierSteps'
import MeetingFieldInput from '../components/MeetingFieldInput'
import FamilyInvitePanel from '../components/FamilyInvitePanel'

const statusLabels: Record<SectionStatus, string> = {
  todo: 'À faire',
  partial: 'En partie',
  done: 'Complété',
}

export default function Meeting() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ceremony = useLiveQuery(() => (id ? db.ceremonies.get(id) : undefined), [id])
  const [draft, setDraft] = useState<Ceremony | null>(null)
  const [sectionIdx, setSectionIdx] = useState(0)
  const [writing, setWriting] = useState(false)
  const [showEulogy, setShowEulogy] = useState(false)
  const aiReady = useMemo(() => isAiConfigured(), [])

  useEffect(() => {
    if (ceremony && ceremony.id === id) setDraft(ceremony)
    else setDraft(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony?.id, id])

  const persist = useDebouncedCallback((next: Ceremony) => {
    db.ceremonies.put({ ...next, updatedAt: Date.now() })
  }, 350)

  function setField(field: MeetingField, value: FieldValue) {
    if (!draft) return
    const next = writeField(draft, field, value)
    // Le titre suit le nom tant que personne ne l'a personnalisé.
    if (field.bind?.key === 'deceasedName' && /^(Nouvelle cérémonie|Hommage à .*)$/.test(draft.title) && typeof value === 'string') {
      next.title = value.trim() ? `Hommage à ${value.trim()}` : 'Nouvelle cérémonie'
    }
    next.updatedAt = Date.now()
    setDraft(next)
    persist(next)
  }

  function applyCeremony(next: Ceremony) {
    const stamped = { ...next, updatedAt: Date.now() }
    setDraft(stamped)
    persist(stamped)
  }

  const preview = useMemo(() => (draft ? buildDraftSegments(draft) : []), [draft])
  const eulogy = useMemo(() => (draft ? writeEulogy(draft) : ''), [draft])
  // Environ 130 mots par minute pour un texte lu posément à voix haute.
  const eulogyMinutes = Math.max(1, Math.round(eulogy.split(/\s+/).filter(Boolean).length / 130))

  if (!draft || draft.id !== id) {
    return <div className="p-10 text-muted">Chargement…</div>
  }

  const section = meetingSections[sectionIdx]
  const progress = meetingProgress(draft)
  const isLast = sectionIdx === meetingSections.length - 1
  const hasSegments = draft.segments.length > 0

  async function handleValidate() {
    if (!draft || writing) return
    let segments = hasSegments ? draft.segments : buildDraftSegments(draft)

    // Avec l'IA configurée et du réseau, l'éloge est rédigé par l'IA ; sinon (ou en cas
    // d'échec), le texte du générateur local, déjà en place, est conservé.
    if (!hasSegments && aiReady) {
      setWriting(true)
      try {
        const text = await generateSegmentTextAI({
          ceremonyType: draft.ceremonyType,
          deceasedName: draft.deceasedName,
          segmentTitle: 'Éloge funèbre',
          instructions: eulogyAiInstructions(draft),
        })
        segments = segments.map((s) => (s.title.startsWith('Hommage') ? { ...s, script: text } : s))
      } catch (err) {
        const reason = err instanceof AiGenerationError ? err.message : 'La rédaction par IA a échoué.'
        alert(`${reason}\n\nL'éloge a été rédigé avec le générateur local : il est prêt à relire dans la conception.`)
      } finally {
        setWriting(false)
      }
    }

    const next: Ceremony = {
      ...draft,
      meeting: { answers: draft.meeting?.answers ?? {}, completedAt: Date.now() },
      segments,
      updatedAt: Date.now(),
    }
    // Remplace aussi l'enregistrement différé en attente : il ne doit pas réécrire
    // l'ancienne version en quittant l'écran.
    setDraft(next)
    persist(next)
    await db.ceremonies.put(next)
    navigate(`/ceremonies/${next.id}`)
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-panel px-6 py-4">
        <div className="flex items-center gap-4">
          <BackButton fallback="/rencontre" />
          <div>
            <p className="font-display text-lg text-fg">{draft.deceasedName ? `Dossier ${draft.deceasedName}` : 'Nouveau dossier'}</p>
            <p className="text-xs text-muted">Rencontre avec la famille · enregistrée au fil de la saisie</p>
          </div>
        </div>
        <DossierSteps ceremony={draft} current={1} />
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[230px_minmax(0,1fr)_280px]">
        <nav aria-label="Trame de l'entretien" className="space-y-1">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted">Trame de l'entretien</p>
          {meetingSections.map((s, i) => {
            const active = i === sectionIdx
            const status = sectionStatus(draft, s)
            return (
              <button
                key={s.id}
                type="button"
                aria-current={active ? 'step' : undefined}
                onClick={() => setSectionIdx(i)}
                className={`flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  active ? 'bg-panel-2 text-fg' : 'text-muted hover:bg-panel hover:text-fg'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    active
                      ? 'bg-gold text-ink'
                      : status === 'done'
                        ? 'bg-gold/20 text-gold'
                        : status === 'partial'
                          ? 'border border-gold-dim text-fg'
                          : 'border border-line'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm">{s.title}</span>
                  <span className="block text-xs text-muted">{active ? 'En cours' : statusLabels[status]}</span>
                </span>
              </button>
            )
          })}
        </nav>

        <main className="min-w-0 space-y-4">
          <div>
            <p className="text-xs text-muted">
              Rubrique {sectionIdx + 1} sur {meetingSections.length}
            </p>
            <h1 className="mt-1 font-display text-3xl text-fg">{section.title}</h1>
            <p className="mt-1 text-sm text-muted">{section.subtitle}</p>
          </div>

          {section.fields.map((f) => (
            <MeetingFieldInput key={f.id} field={f} value={readField(draft, f)} onChange={(v) => setField(f, v)} />
          ))}

          <div className="flex items-center justify-between pt-2">
            {sectionIdx > 0 ? (
              <button
                type="button"
                onClick={() => setSectionIdx(sectionIdx - 1)}
                className="min-h-11 rounded-md border border-line px-4 text-sm text-muted hover:border-gold-dim hover:text-fg"
              >
                Rubrique précédente
              </button>
            ) : (
              <span />
            )}
            {isLast ? (
              <button
                type="button"
                onClick={handleValidate}
                disabled={writing}
                className="min-h-11 rounded-md bg-gold px-5 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-60"
              >
                {writing ? "Rédaction de l'éloge…" : 'Valider la rencontre'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSectionIdx(sectionIdx + 1)}
                className="min-h-11 rounded-md bg-gold px-5 text-sm font-medium text-ink hover:bg-gold-dim"
              >
                Rubrique suivante
              </button>
            )}
          </div>
        </main>

        <aside className="space-y-4">
          <section className="rounded-lg border border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Avancement</h2>
              <span className="text-sm font-semibold text-gold">{progress} %</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-2">
              <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              {hasSegments ? 'Déroulé' : 'Déroulé en construction'}
            </h2>
            <p className="mt-1 text-xs text-muted">
              {hasSegments
                ? 'Ce dossier a déjà un déroulé : la rencontre ne le modifie pas.'
                : 'Brouillon tiré de l’entretien, créé à la validation.'}
            </p>
            <ol className="mt-3 space-y-1.5">
              {(hasSegments ? draft.segments : preview).map((s, i) => (
                <li key={s.id} className="flex gap-2 text-sm">
                  <span className="w-5 shrink-0 text-right text-xs leading-5 text-muted">{i + 1}.</span>
                  <span className="text-fg">{s.title}</span>
                </li>
              ))}
            </ol>
          </section>

          {!hasSegments && (
            <section className="rounded-lg border border-line bg-panel p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Éloge en construction</h2>
                <span className="text-xs text-muted">≈ {eulogyMinutes} min</span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {aiReady
                  ? "Rédigé à partir de vos notes. À la validation, l'IA en écrit une version plus libre ; ce texte reste la solution de secours hors-ligne."
                  : 'Rédigé à partir de vos notes, sans connexion. Il sera dans le déroulé, prêt à relire.'}
              </p>
              <button
                type="button"
                onClick={() => setShowEulogy(!showEulogy)}
                aria-expanded={showEulogy}
                className="mt-3 text-sm font-medium text-gold hover:text-fg"
              >
                {showEulogy ? "Masquer l'éloge" : "Lire l'éloge"}
              </button>
              {showEulogy && (
                <div className="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1 font-display text-[15px] leading-relaxed text-fg">
                  {eulogy.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
            </section>
          )}

          <FamilyInvitePanel ceremony={draft} onChange={applyCeremony} />

          <section className="rounded-lg border border-line bg-panel p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Avant de partir</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Relisez le résumé avec la famille et faites épeler les prénoms. La validation rédige tous les textes
              du déroulé et ouvre la conception.
            </p>
            <button
              type="button"
              onClick={handleValidate}
              disabled={writing}
              className="mt-3 min-h-11 w-full rounded-md border border-gold-dim px-3 text-sm font-medium text-gold hover:bg-panel-2 disabled:opacity-60"
            >
              {writing
                ? "Rédaction de l'éloge…"
                : draft.meeting?.completedAt
                  ? 'Revenir à la conception'
                  : 'Valider et passer à la conception'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  )
}
