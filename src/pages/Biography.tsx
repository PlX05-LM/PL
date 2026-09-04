import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { newId } from '../lib/ids'
import { useDebouncedCallback } from '../lib/useDebouncedEffect'
import { composeBiographyDraft, hasAnyBiographyContent } from '../lib/biographyComposer'
import { createEmptyBiography, type Biography, type BiographyChild } from '../types'

const inputClass =
  'w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm text-fg placeholder:text-muted focus:border-gold-dim focus:outline-none'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export default function Biography() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const ceremony = useLiveQuery(() => (id ? db.ceremonies.get(id) : undefined), [id])

  const [bio, setBio] = useState<Biography | null>(null)
  const [draftText, setDraftText] = useState('')
  const [targetSegmentId, setTargetSegmentId] = useState('')
  const [copied, setCopied] = useState(false)
  const [inserted, setInserted] = useState(false)

  useEffect(() => {
    if (ceremony && !bio) {
      setBio(ceremony.biography ?? createEmptyBiography())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony?.id])

  useEffect(() => {
    if (ceremony && ceremony.segments.length > 0 && !targetSegmentId) {
      const hommage = ceremony.segments.find((s) => /hommage|biographie/i.test(s.title))
      setTargetSegmentId((hommage ?? ceremony.segments[0]).id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremony?.id, ceremony?.segments.length])

  const persist = useDebouncedCallback((next: Biography) => {
    if (!ceremony) return
    db.ceremonies.put({ ...ceremony, biography: next, updatedAt: Date.now() })
  }, 350)

  function update(patch: Partial<Biography>) {
    if (!bio) return
    const next = { ...bio, ...patch }
    setBio(next)
    persist(next)
  }

  function addChild() {
    if (!bio) return
    const children: BiographyChild[] = [...bio.children, { id: newId(), name: '', birthDate: '' }]
    update({ children })
  }

  function updateChild(childId: string, patch: Partial<BiographyChild>) {
    if (!bio) return
    update({ children: bio.children.map((c) => (c.id === childId ? { ...c, ...patch } : c)) })
  }

  function removeChild(childId: string) {
    if (!bio) return
    update({ children: bio.children.filter((c) => c.id !== childId) })
  }

  function addAnecdote() {
    if (!bio) return
    update({ anecdotes: [...bio.anecdotes, ''] })
  }

  function updateAnecdote(index: number, value: string) {
    if (!bio) return
    const anecdotes = [...bio.anecdotes]
    anecdotes[index] = value
    update({ anecdotes })
  }

  function removeAnecdote(index: number) {
    if (!bio) return
    update({ anecdotes: bio.anecdotes.filter((_, i) => i !== index) })
  }

  function handleGenerate() {
    if (!bio || !ceremony) return
    setDraftText(composeBiographyDraft(ceremony.deceasedName, bio))
    setCopied(false)
    setInserted(false)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(draftText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert("Impossible de copier automatiquement : sélectionnez le texte et copiez-le manuellement.")
    }
  }

  async function handleInsert() {
    if (!ceremony || !targetSegmentId || !draftText.trim()) return
    const segments = ceremony.segments.map((s) =>
      s.id === targetSegmentId
        ? { ...s, script: s.script.trim() ? `${s.script}\n\n${draftText}` : draftText }
        : s,
    )
    await db.ceremonies.put({ ...ceremony, segments, updatedAt: Date.now() })
    setInserted(true)
    setTimeout(() => setInserted(false), 2000)
  }

  const canGenerate = useMemo(() => (bio ? hasAnyBiographyContent(bio) : false), [bio])

  if (!ceremony || !bio) {
    return <div className="p-10 text-muted">Chargement…</div>
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8 pb-24">
      <button
        onClick={() => navigate(`/ceremonies/${ceremony.id}`)}
        className="mb-6 text-sm text-muted hover:text-fg"
      >
        ← Retour à la cérémonie
      </button>

      <h2 className="font-display text-3xl text-fg">Biographie</h2>
      <p className="mt-1 text-sm text-muted">
        Recueillez auprès de la famille les informations sur {ceremony.deceasedName || 'le défunt'}{' '}
        pour préparer l'éloge. Une ébauche de texte pourra être générée à partir de ce que vous
        remplissez ci-dessous — à relire et personnaliser, elle ne remplace pas vos propres mots.
      </p>

      <section className="mt-6 space-y-4 rounded-lg border border-line bg-panel p-5">
        <h3 className="font-display text-lg text-fg">État civil</h3>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Genre (pour l'accord des phrases)">
            <select
              value={bio.gender}
              onChange={(e) => update({ gender: e.target.value as Biography['gender'] })}
              className={inputClass}
            >
              <option value="non-precise">Non précisé</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </Field>
          <Field label="Date de naissance">
            <input
              type="date"
              value={bio.birthDate ?? ''}
              onChange={(e) => update({ birthDate: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Lieu de naissance">
            <input
              value={bio.birthPlace ?? ''}
              onChange={(e) => update({ birthPlace: e.target.value })}
              placeholder="Ville, région…"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Frères et sœurs">
          <textarea
            value={bio.siblings ?? ''}
            onChange={(e) => update({ siblings: e.target.value })}
            rows={2}
            placeholder="Ex. : deux frères, Paul et Jacques, et une sœur, Marie"
            className={inputClass}
          />
        </Field>
        <Field label="Scolarité / formation">
          <textarea
            value={bio.education ?? ''}
            onChange={(e) => update({ education: e.target.value })}
            rows={2}
            placeholder="Parcours scolaire, études, apprentissage…"
            className={inputClass}
          />
        </Field>
      </section>

      <section className="mt-6 space-y-4 rounded-lg border border-line bg-panel p-5">
        <h3 className="font-display text-lg text-fg">Vie professionnelle</h3>
        <Field label="Métier, parcours professionnel">
          <textarea
            value={bio.career ?? ''}
            onChange={(e) => update({ career: e.target.value })}
            rows={3}
            placeholder="Ex. : a travaillé comme institutrice pendant trente ans à…"
            className={inputClass}
          />
        </Field>
      </section>

      <section className="mt-6 space-y-4 rounded-lg border border-line bg-panel p-5">
        <h3 className="font-display text-lg text-fg">Conjoint(e) et enfants</h3>
        <Field label="Rencontre avec l'époux/l'épouse">
          <textarea
            value={bio.metSpouse ?? ''}
            onChange={(e) => update({ metSpouse: e.target.value })}
            rows={2}
            placeholder="Comment, où et quand ils/elles se sont rencontré(e)s…"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nom de l'époux/l'épouse">
            <input
              value={bio.spouseName ?? ''}
              onChange={(e) => update({ spouseName: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Date de mariage">
            <input
              type="date"
              value={bio.weddingDate ?? ''}
              onChange={(e) => update({ weddingDate: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={bio.hasChildren}
            onChange={(e) => update({ hasChildren: e.target.checked })}
            className="h-4 w-4 accent-gold"
          />
          <span className="text-sm text-fg">A eu des enfants</span>
        </label>

        {bio.hasChildren && (
          <div className="space-y-2">
            {bio.children.map((child) => (
              <div key={child.id} className="flex items-center gap-2">
                <input
                  value={child.name}
                  onChange={(e) => updateChild(child.id, { name: e.target.value })}
                  placeholder="Prénom"
                  className={inputClass}
                />
                <input
                  type="date"
                  value={child.birthDate ?? ''}
                  onChange={(e) => updateChild(child.id, { birthDate: e.target.value })}
                  className={inputClass}
                />
                <button
                  onClick={() => removeChild(child.id)}
                  className="shrink-0 text-xs text-muted hover:text-danger"
                >
                  Supprimer
                </button>
              </div>
            ))}
            <button
              onClick={addChild}
              className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:border-gold-dim hover:text-gold"
            >
              + Ajouter un enfant
            </button>
          </div>
        )}
      </section>

      <section className="mt-6 space-y-4 rounded-lg border border-line bg-panel p-5">
        <h3 className="font-display text-lg text-fg">Passions et souvenirs</h3>
        <Field label="Passions, loisirs">
          <textarea
            value={bio.passions ?? ''}
            onChange={(e) => update({ passions: e.target.value })}
            rows={2}
            placeholder="Ex. : le jardinage, la pêche, les voyages, la musique…"
            className={inputClass}
          />
        </Field>

        <div>
          <span className="mb-1 block text-xs text-muted">Anecdotes</span>
          <div className="space-y-2">
            {bio.anecdotes.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <textarea
                  value={a}
                  onChange={(e) => updateAnecdote(i, e.target.value)}
                  rows={2}
                  placeholder="Un souvenir, une habitude, une phrase qui lui ressemblait…"
                  className={inputClass}
                />
                <button
                  onClick={() => removeAnecdote(i)}
                  className="shrink-0 text-xs text-muted hover:text-danger"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addAnecdote}
            className="mt-2 rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:border-gold-dim hover:text-gold"
          >
            + Ajouter une anecdote
          </button>
        </div>

        <Field label="Autres informations" hint="Tout ce qui ne trouve pas sa place ailleurs.">
          <textarea
            value={bio.notes ?? ''}
            onChange={(e) => update({ notes: e.target.value })}
            rows={3}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="mt-6 rounded-lg border border-gold-dim/50 bg-panel p-5">
        <h3 className="mb-1 font-display text-lg text-fg">Ébauche d'éloge</h3>
        <p className="mb-3 text-xs text-muted">
          Un premier jet assemblé à partir des informations ci-dessus (pas d'IA, juste un montage
          de phrases) — à relire, réécrire et personnaliser avant utilisation. Rien n'est
          automatiquement inséré dans le déroulé.
        </p>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="mb-3 rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-50"
          title={canGenerate ? undefined : 'Renseignez au moins une information ci-dessus.'}
        >
          ✨ Générer / régénérer l'ébauche
        </button>

        {draftText && (
          <>
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              rows={10}
              className={`${inputClass} font-display`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopy}
                className="rounded-md border border-line px-3 py-1.5 text-xs text-muted hover:border-gold-dim hover:text-fg"
              >
                {copied ? '✓ Copié' : '📋 Copier le texte'}
              </button>
              {ceremony.segments.length > 0 && (
                <>
                  <select
                    value={targetSegmentId}
                    onChange={(e) => setTargetSegmentId(e.target.value)}
                    className="rounded-md border border-line bg-panel-2 px-2 py-1.5 text-xs text-fg"
                  >
                    {ceremony.segments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleInsert}
                    className="rounded-md border border-gold-dim px-3 py-1.5 text-xs font-medium text-gold hover:bg-panel-2"
                  >
                    {inserted ? '✓ Inséré' : "+ Insérer dans cette étape"}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
