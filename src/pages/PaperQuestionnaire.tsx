import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { familySections } from '../lib/familyLink'
import BackButton from '../components/BackButton'

const lineCount = { area: 5, text: 1, date: 1, time: 1 } as const

/**
 * Version papier du questionnaire famille, pour les familles qui préfèrent écrire à la
 * main : mêmes rubriques que le lien famille, avec des lignes à remplir et des cases à
 * cocher. Fonctionne sans connexion.
 */
export default function PaperQuestionnaire() {
  const { id } = useParams<{ id: string }>()
  const ceremony = useLiveQuery(() => (id ? db.ceremonies.get(id) : undefined), [id])
  const name = ceremony?.deceasedName.trim()

  return (
    <div className="min-h-full bg-white text-[#1a1a1a] print:min-h-0">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4 print:hidden">
        <BackButton fallback={id ? `/ceremonies/${id}/rencontre` : '/'} className="!text-[#555] hover:!text-black" />
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 rounded-md bg-[#1a1a1a] px-5 text-sm font-medium text-white"
        >
          Imprimer
        </button>
      </div>

      <article className="mx-auto max-w-3xl px-6 pb-12 font-sans print:px-0 print:pb-0">
        <header className="border-b border-[#ccc] pb-4">
          <h1 className="font-display text-3xl">Pour l'hommage{name ? ` à ${name}` : ''}</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#444]">
            Ce questionnaire aide le maître de cérémonie à préparer une cérémonie qui lui ressemble. Remplissez
            seulement ce que vous souhaitez : quelques mots suffisent. Rendez-le à l'agence quand vous le pourrez.
          </p>
          <p className="mt-3 text-sm">
            Rempli par : <span className="inline-block w-72 border-b border-[#999] align-bottom">&nbsp;</span>
          </p>
        </header>

        {familySections.map(({ section, fields }) => (
          <section key={section.id} className="mt-6">
            <h2 className="break-after-avoid font-display text-xl">{section.title}</h2>
            <p className="text-xs text-[#666]">{section.subtitle}</p>
            <div className="mt-3 space-y-4">
              {fields.map(({ field, label, tip }) => (
                <div key={field.id} className="break-inside-avoid">
                  <p className="text-sm font-semibold">{label}</p>
                  {tip && <p className="text-xs italic text-[#666]">{tip}</p>}
                  {field.type === 'chips' || field.type === 'choice' ? (
                    <p className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                      {(field.type === 'chips' ? field.options : field.options.map(([, l]) => l)).map((o) => (
                        <span key={o} className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-3.5 w-3.5 border border-[#555]" aria-hidden="true" />
                          {o}
                        </span>
                      ))}
                    </p>
                  ) : (
                    Array.from({ length: lineCount[field.type] }, (_, i) => (
                      <div key={i} className="h-7 border-b border-[#bbb]" />
                    ))
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <footer className="mt-10 border-t border-[#ccc] pt-3 text-xs text-[#666]">
          Ces informations restent confidentielles et ne servent qu'à la préparation de la cérémonie.
        </footer>
      </article>
    </div>
  )
}
