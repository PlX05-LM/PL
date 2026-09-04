import { griefCategoryLabels, griefCategoryOrder, type GriefCategory } from './griefCategories'

export type CitationCategory = GriefCategory

export interface CitationEntry {
  id: string
  /** Titre de l'ouvrage dont la citation est extraite. */
  work: string
  author: string
  authorDates: string
  categories: CitationCategory[]
  quote: string
  /** Conseil d'adaptation à la situation de deuil, à l'intention du maître de cérémonie. */
  note: string
}

export const citationCategoryLabels = griefCategoryLabels
export const citationCategoryOrder = griefCategoryOrder

export const citationLibraryDisclaimer =
  "Ces citations sont extraites d'ouvrages anciens (Antiquité gréco-romaine, XVIIe siècle) tombés dans le domaine public : vous pouvez les lire et les citer librement, y compris dans un cadre professionnel. La plupart des livres contemporains sur le deuil (témoignages, ouvrages de psychologie du deuil) restent protégés par le droit d'auteur pendant plusieurs décennies : voir la liste indicative en bas de bibliothèque pour vos lectures personnelles, sans citation intégrale possible dans ce logiciel."

export const citationLibrary: CitationEntry[] = [
  {
    id: 'seneque-consolation-marcia',
    work: 'Consolation à Marcia',
    author: 'Sénèque',
    authorDates: '~4 av. J.-C. – 65 apr. J.-C.',
    categories: ['deuil-general', 'mort-jeune', 'amour-separation'],
    quote:
      "La différence est grande entre tolérer sa douleur et se l'imposer. Combien il est plus convenable à la noblesse de vos sentiments de mettre fin à votre deuil, que d'attendre qu'il veuille cesser. Ne différez pas jusqu'au jour où il vous quittera malgré vous : quittez-le la première.",
    note: "Sénèque adresse ce texte à Marcia, une mère qui a perdu son fils, pour l'aider à traverser son chagrin — littéralement un livre de consolation pour un deuil. Le message (se réapproprier son deuil plutôt que le subir) convient à un accompagnement en douceur, plusieurs mois après le décès, plutôt qu'au jour des obsèques.",
  },
  {
    id: 'bossuet-oraison-henriette',
    work: "Oraison funèbre d'Henriette d'Angleterre",
    author: 'Jacques-Bénigne Bossuet',
    authorDates: '1627–1704',
    categories: ['mort-accidentelle-brutale', 'mort-jeune'],
    quote:
      "Madame se meurt, Madame est morte ! Ô nuit désastreuse ! ô nuit effroyable, où retentit tout à coup, comme un éclat de tonnerre, cette étonnante nouvelle : Madame se meurt, Madame est morte !",
    note: "Prononcée en 1670 pour une princesse morte brutalement à 26 ans. La phrase martelée traduit la sidération d'une mort soudaine et prématurée : à réserver à un décès rapide et inattendu, en ouverture de cérémonie plutôt qu'en clôture, tant elle est saisissante.",
  },
  {
    id: 'montaigne-apprendre-mourir',
    work: 'Essais (Livre I, chapitre 20)',
    author: 'Michel de Montaigne',
    authorDates: '1533–1592',
    categories: ['vieillesse-paix', 'deuil-general', 'classiques'],
    quote:
      "Que philosopher, c'est apprendre à mourir. […] Il n'y a rien de mal en la vie, pour celui qui a bien compris que la privation de la vie n'est pas mal.",
    note: "Une invitation sereine, presque philosophique, à ne pas craindre la mort. Convient à une famille en recherche d'apaisement, plutôt laïque ou agnostique, pour une mort naturelle ou survenue après une longue vie.",
  },
  {
    id: 'montaigne-la-boetie',
    work: "Essais (Livre I, chapitre 27, « De l'amitié »)",
    author: 'Michel de Montaigne',
    authorDates: '1533–1592',
    categories: ['amour-separation', 'mort-jeune', 'deuil-general'],
    quote:
      "Si on me presse de dire pourquoi je l'aimais, je sens que cela ne se peut exprimer, qu'en répondant : parce que c'était lui ; parce que c'était moi.",
    note: "Écrite après la mort soudaine, à 32 ans, de son ami Étienne de La Boétie. L'une des plus belles déclarations d'amitié de la littérature française : idéale pour l'hommage à un ami très proche ou un frère/une sœur de cœur, quel que soit l'âge du défunt.",
  },
  {
    id: 'marc-aurele-debarque',
    work: 'Pensées pour moi-même (Livre IX)',
    author: 'Marc Aurèle',
    authorDates: '121–180 apr. J.-C.',
    categories: ['vieillesse-paix'],
    quote: "Tu t'es embarqué, tu as navigué, tu as accosté : débarque !",
    note: "Une image brève et apaisante du voyage d'une vie qui s'achève normalement. Particulièrement adaptée à une personne âgée dont l'existence a été pleinement vécue, en clôture de cérémonie.",
  },
  {
    id: 'augustin-mort-monique',
    work: 'Confessions (Livre IX)',
    author: "Augustin d'Hippone",
    authorDates: '354–430',
    categories: ['deuil-general', 'amour-separation', 'vieillesse-paix'],
    quote:
      "Je lui fermais les yeux, et dans mon cœur s'amassaient les flots d'une immense tristesse qui allait s'écouler en flots de larmes ; mais au même instant, mes yeux, sur un ordre violent de mon âme, résorbaient la source de leurs pleurs jusqu'à la dessécher.\n\nJ'ai donné à peine une heure de larmes à ma mère, morte pour un temps à ses yeux.",
    note: "Augustin raconte la mort de sa mère Monique et sa propre gêne à ne pas pleurer « comme il faudrait ». Un texte précieux à citer pour rassurer une famille qui culpabilise de ne pas exprimer son chagrin de la façon attendue — chacun vit son deuil à sa manière, y compris un saint de l'Église.",
  },
  {
    id: 'pascal-roseau-pensant',
    work: 'Pensées (fragment 348)',
    author: 'Blaise Pascal',
    authorDates: '1623–1662',
    categories: ['deuil-general', 'classiques'],
    quote:
      "L'homme n'est qu'un roseau, le plus faible de la nature ; mais c'est un roseau pensant. Il ne faut pas que l'univers entier s'arme pour l'écraser : une vapeur, une goutte d'eau, suffit pour le tuer. Mais, quand l'univers l'écraserait, l'homme serait encore plus noble que ce qui le tue, parce qu'il sait qu'il meurt, et l'avantage que l'univers a sur lui, l'univers n'en sait rien.",
    note: "Sur la fragilité et la dignité humaines face à la mort. Un texte de réflexion plutôt qu'un texte de réconfort immédiat : convient à une cérémonie laïque à teneur philosophique, ou à un hommage évoquant la lucidité du défunt face à sa fin.",
  },
]

/**
 * Livres contemporains de référence sur le deuil, cités à titre indicatif pour la culture
 * professionnelle du maître de cérémonie. Toujours sous droits d'auteur : ne pas citer
 * intégralement dans une cérémonie sans en avoir acquis l'ouvrage, et jamais reproduire
 * d'extrait dans ce logiciel sans autorisation de l'auteur ou de l'éditeur.
 */
export const contemporaryGriefReadingList: { title: string; author: string }[] = [
  { title: 'Vivre le deuil au jour le jour', author: 'Christophe Fauré' },
  { title: 'La Mort intime', author: 'Marie de Hennezel' },
  { title: 'Une mort très douce', author: 'Simone de Beauvoir' },
  { title: 'A Grief Observed (Le Problème de la souffrance)', author: 'C. S. Lewis' },
  { title: "On Death and Dying (Les Derniers Instants de la vie)", author: 'Elisabeth Kübler-Ross' },
  { title: 'Parler la mort', author: 'Marie de Hennezel et Johanne de Montigny' },
]
