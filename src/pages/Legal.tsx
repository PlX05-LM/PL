import { Link, useParams } from 'react-router-dom'
import { editor } from '../legal/editor'
import { legalTexts } from '../legal/texts'
import LegalLinks from '../components/LegalLinks'

/** Textes juridiques, publics : lisibles par les familles comme par les prospects. */
export default function Legal() {
  const { page = '' } = useParams()
  const text = legalTexts[page]

  return (
    <div className="min-h-screen bg-ink px-4 py-10 text-fg">
      <article className="mx-auto max-w-2xl">
        <Link to="/" className="font-display text-xl text-gold">
          {editor.product}
        </Link>
        {editor.draft && (
          <p className="mt-4 rounded-md border border-gold-dim/60 bg-panel px-3 py-2 text-xs text-muted">
            Projet de texte, en cours de relecture juridique.
          </p>
        )}
        {!text ? (
          <p className="mt-8 text-muted">Page introuvable.</p>
        ) : (
          <>
            <h1 className="mt-6 font-display text-3xl leading-tight">{text.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{text.intro}</p>
            {text.sections.map((s) => (
              <section key={s.title} className="mt-8">
                <h2 className="text-lg font-semibold">{s.title}</h2>
                {s.blocks.map((b, i) =>
                  Array.isArray(b) ? (
                    <ul key={i} className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg/90">
                      {b.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i} className="mt-3 text-sm leading-relaxed text-fg/90">
                      {b}
                    </p>
                  ),
                )}
              </section>
            ))}
            <p className="mt-10 text-xs text-muted">Dernière mise à jour : {editor.updatedAt}.</p>
          </>
        )}
        <LegalLinks className="mt-6 border-t border-line pt-4" />
      </article>
    </div>
  )
}
