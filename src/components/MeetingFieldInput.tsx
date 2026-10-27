import type { FieldValue, MeetingField } from '../lib/meetingGuide'
import Icon from './Icon'

/** Un champ de la trame de la rencontre — utilisé par l'agence et par le formulaire famille. */

export const inputClass =
  'w-full rounded-md border border-line bg-panel-2 px-3 py-2.5 text-sm text-fg placeholder:text-muted focus:border-gold-dim focus:outline-none'

function chipClass(on: boolean) {
  return `min-h-11 rounded-full border px-4 text-sm transition-colors ${
    on ? 'border-gold bg-gold text-ink' : 'border-line bg-panel-2 text-fg hover:border-gold-dim'
  }`
}

export default function MeetingFieldInput({
  field,
  value,
  onChange,
  label = field.label,
  tip = field.tip,
}: {
  field: MeetingField
  value: FieldValue
  onChange: (v: FieldValue) => void
  /** Libellé et conseil adaptés au lecteur (la famille ne lit pas les conseils d'entretien). */
  label?: string
  tip?: string
}) {
  const id = `rencontre-${field.id}`
  const text = typeof value === 'string' ? value : ''

  let control: React.ReactNode
  if (field.type === 'chips') {
    const selected = Array.isArray(value) ? value : []
    control = (
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {field.options.map((o) => {
          const on = selected.includes(o)
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
              className={chipClass(on)}
            >
              {o}
            </button>
          )
        })}
      </div>
    )
  } else if (field.type === 'choice') {
    control = (
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {field.options.map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={text === v}
            onClick={() => onChange(text === v ? '' : v)}
            className={chipClass(text === v)}
          >
            {label}
          </button>
        ))}
      </div>
    )
  } else if (field.type === 'area') {
    control = (
      <textarea
        id={id}
        rows={4}
        value={text}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y leading-relaxed`}
      />
    )
  } else {
    control = (
      <input
        id={id}
        type={field.type}
        value={text}
        placeholder={field.type === 'text' ? field.placeholder : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    )
  }

  const grouped = field.type === 'chips' || field.type === 'choice'
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      {grouped ? (
        <span className="mb-2 block text-sm font-medium text-fg">{label}</span>
      ) : (
        <label htmlFor={id} className="mb-2 block text-sm font-medium text-fg">
          {label}
        </label>
      )}
      {tip && (
        <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
          <Icon name="sparkle" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dim" />
          {tip}
        </p>
      )}
      {control}
    </div>
  )
}
