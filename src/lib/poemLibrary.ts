import { griefCategoryLabels, griefCategoryOrder, type GriefCategory } from './griefCategories'

export type PoemCategory = GriefCategory

export interface PoemEntry {
  id: string
  title: string
  author: string
  authorDates: string
  categories: PoemCategory[]
  /** Extrait connu et sourcé d'un poème plus long, plutôt que le texte intégral. */
  excerpt?: boolean
  body: string
  /** Conseil d'adaptation à la situation de deuil, à l'intention du maître de cérémonie. */
  note: string
}

export const poemCategoryLabels = griefCategoryLabels
export const poemCategoryOrder = griefCategoryOrder

export const poemLibraryDisclaimer =
  "Tous ces poèmes sont dans le domaine public (auteurs décédés depuis plus de 70 ans) : vous pouvez les lire, les imprimer et les diffuser librement, y compris dans un cadre professionnel. Les catégories et notes d'adaptation sont des suggestions — à ajuster selon la sensibilité de chaque famille, en particulier pour un deuil après un suicide ou une perte périnatale."

export const poemLibrary: PoemEntry[] = [
  {
    id: 'chenier-mort-enfant',
    title: "Sur la mort d'un enfant (extrait)",
    author: 'André Chénier',
    authorDates: '1762–1794',
    categories: ['deuil-perinatal', 'mort-jeune'],
    excerpt: true,
    body: "L'innocente victime, au terrestre séjour,\nN'a vu que le printemps qui lui donna le jour.\nRien n'est resté de lui qu'un nom, un vain nuage,\nUn souvenir, un songe, une invisible image.\nAdieu, fragile enfant échappé de nos bras ;\nAdieu, dans la maison d'où l'on ne revient pas.",
    note: "Six vers, parmi les plus connus de cette élégie, sobres et sans détail clinique. Le seul poème de cette liste directement adapté à un enfant mort-né ou décédé très peu après la naissance.",
  },
  {
    id: 'hugo-demain-des-laube',
    title: "Demain, dès l'aube…",
    author: 'Victor Hugo',
    authorDates: '1802–1885',
    categories: ['mort-accidentelle-brutale', 'mort-jeune', 'deuil-general'],
    body: "Demain, dès l'aube, à l'heure où blanchit la campagne,\nJe partirai. Vois-tu, je sais que tu m'attends.\nJ'irai par la forêt, j'irai par la montagne.\nJe ne puis demeurer loin de toi plus longtemps.\n\nJe marcherai les yeux fixés sur mes pensées,\nSans rien voir au dehors, sans entendre aucun bruit,\nSeul, inconnu, le dos courbé, les mains croisées,\nTriste, et le jour pour moi sera comme la nuit.\n\nJe ne regarderai ni l'or du soir qui tombe,\nNi les voiles au loin descendant vers Harfleur,\nEt quand j'arriverai, je mettrai sur ta tombe\nUn bouquet de houx vert et de bruyère en fleur.",
    note: "Écrit pour sa fille Léopoldine, noyée accidentellement à 19 ans. Poème de recueillement sur une tombe, sobre et intemporel : convient à un décès accidentel ou à toute personne partie trop tôt.",
  },
  {
    id: 'hugo-elle-avait-pris-ce-pli',
    title: 'Elle avait pris ce pli… (extrait)',
    author: 'Victor Hugo',
    authorDates: '1802–1885',
    categories: ['mort-jeune'],
    excerpt: true,
    body: "Elle avait pris ce pli dans son âge enfantin\nDe venir dans ma chambre un peu chaque matin ;\nJe l'attendais ainsi qu'un rayon qu'on espère ;\nElle entrait et disait : « Bonjour, mon petit père » ;\nPrenait ma plume, ouvrait mes livres, s'asseyait\nSur mon lit, dérangeait mes papiers, et riait,\nPuis soudain s'en allait comme un oiseau qui passe.\nAlors, je reprenais, la tête un peu moins lasse,\nMon œuvre interrompue, et, tout en écrivant,\nParmi mes manuscrits je rencontrais souvent\nQuelque arabesque folle et qu'elle avait tracée,\nEt mainte page blanche entre ses mains froissée\nOù, je ne sais comment, venaient mes plus doux vers.\nElle aimait Dieu, les fleurs, les astres, les prés verts,\nEt c'était un esprit avant d'être une femme.\nSon regard reflétait la clarté de son âme.\nElle me consultait sur tout à tous moments.",
    note: "Extrait (le poème complet compte 26 alexandrins) : Hugo se souvient des matins de son enfant. Convient à l'évocation tendre d'un enfant ou d'un(e) adolescent(e), plutôt en milieu de cérémonie qu'en clôture.",
  },
  {
    id: 'ronsard-comme-on-voit-sur-la-branche',
    title: 'Comme on voit sur la branche (Sur la mort de Marie)',
    author: 'Pierre de Ronsard',
    authorDates: '1524–1585',
    categories: ['mort-jeune', 'classiques'],
    body: "Comme on voit sur la branche au mois de mai la rose\nEn sa belle jeunesse, en sa première fleur,\nRendre le ciel jaloux de sa vive couleur,\nQuand l'Aube de ses pleurs au point du jour l'arrose ;\n\nLa grâce dans sa feuille, et l'amour se repose,\nEmbaumant les jardins et les arbres d'odeur ;\nMais battue ou de pluie ou d'excessive ardeur,\nLanguissante elle meurt, feuille à feuille déclose :\n\nAinsi, en ta première et jeune nouveauté,\nQuand la terre et le ciel honoraient ta beauté,\nLa Parque t'a tuée, et cendre tu reposes.\n\nPour obsèques reçois mes larmes et mes pleurs,\nCe vase plein de lait, ce panier plein de fleurs,\nAfin que vif et mort ton corps ne soit que roses.",
    note: "Sonnet écrit pour la mort d'une jeune femme. L'un des plus beaux textes classiques sur une mort précoce ; à réserver à une personne jeune, en particulier une femme ou une jeune fille.",
  },
  {
    id: 'sully-prudhomme-vase-brise',
    title: 'Le vase brisé',
    author: 'Sully Prudhomme',
    authorDates: '1839–1907',
    categories: ['apres-suicide', 'amour-separation'],
    body: "Le vase où meurt cette verveine\nD'un coup d'éventail fut fêlé ;\nLe coup dut effleurer à peine :\nAucun bruit ne l'a révélé.\n\nMais la légère meurtrissure,\nMordant le cristal chaque jour,\nD'une marche invisible et sûre\nEn a fait lentement le tour.\n\nSon eau fraîche a fui goutte à goutte,\nLe suc des fleurs s'est épuisé ;\nPersonne encore ne s'en doute ;\nN'y touchez pas, il est brisé.\n\nSouvent aussi la main qu'on aime,\nEffleurant le cœur, le meurtrit ;\nPuis le cœur se fend de lui-même,\nLa fleur de son amour périt ;\nToujours intact aux yeux du monde,\nIl sent croître et pleurer tout bas\nSa blessure fine et profonde ;\nIl est brisé, n'y touchez pas.",
    note: "Une blessure invisible qui grandit en silence jusqu'à tout emporter, sans jamais nommer de cause : une image délicate, à proposer avec précaution pour un deuil après un suicide, ou pour la perte d'un être aimé.",
  },
  {
    id: 'sully-prudhomme-ici-bas',
    title: 'Ici-bas',
    author: 'Sully Prudhomme',
    authorDates: '1839–1907',
    categories: ['vieillesse-paix', 'deuil-general'],
    body: "Ici-bas tous les lilas meurent,\nTous les chants des oiseaux sont courts ;\nJe rêve aux étés qui demeurent\nToujours...\n\nIci-bas les lèvres effleurent\nSans rien laisser de leur velours ;\nJe rêve aux baisers qui demeurent\nToujours...\n\nIci-bas tous les hommes pleurent\nLeurs amitiés ou leurs amours ;\nJe rêve aux couples qui demeurent\nToujours...",
    note: "Texte bref et musical sur l'impermanence et l'espérance d'un ailleurs où tout dure. Convient à une clôture sobre, quel que soit l'âge du défunt.",
  },
  {
    id: 'verlaine-chanson-automne',
    title: "Chanson d'automne",
    author: 'Paul Verlaine',
    authorDates: '1844–1896',
    categories: ['deuil-general', 'classiques'],
    body: "Les sanglots longs\nDes violons\nDe l'automne\nBlessent mon cœur\nD'une langueur\nMonotone.\n\nTout suffocant\nEt blême, quand\nSonne l'heure,\nJe me souviens\nDes jours anciens\nEt je pleure ;\n\nEt je m'en vais\nAu vent mauvais\nQui m'emporte\nDeçà, delà,\nPareil à la\nFeuille morte.",
    note: 'Poème bref et musical sur la mélancolie et le temps qui passe ; universel, il peut accompagner presque toutes les situations de deuil.',
  },
  {
    id: 'baudelaire-recueillement',
    title: 'Recueillement',
    author: 'Charles Baudelaire',
    authorDates: '1821–1867',
    categories: ['vieillesse-paix', 'deuil-general'],
    body: "Sois sage, ô ma Douleur, et tiens-toi plus tranquille.\nTu réclamais le Soir ; il descend ; le voici :\nUne atmosphère obscure enveloppe la ville,\nAux uns portant la paix, aux autres le souci.\n\nPendant que des mortels la multitude vile,\nSous le fouet du Plaisir, ce bourreau sans merci,\nVa cueillir des remords dans la fête servile,\nMa Douleur, donne-moi la main ; viens par ici,\n\nLoin d'eux. Vois se pencher les défuntes Années,\nSur les balcons du ciel, en robes surannées ;\nSurgir du fond des eaux le Regret souriant ;\n\nLe Soleil moribond s'endormir sous une arche,\nEt, comme un long linceul traînant à l'Orient,\nEntends, ma chère, entends la douce Nuit qui marche.",
    note: "Invite au calme face à la nuit qui vient — une image sereine et apaisée de la mort. Convient particulièrement à une personne âgée ou une mort naturelle, volontiers en clôture de cérémonie.",
  },
  {
    id: 'nerval-el-desdichado',
    title: 'El Desdichado',
    author: 'Gérard de Nerval',
    authorDates: '1808–1855',
    categories: ['apres-suicide', 'classiques'],
    body: "Je suis le Ténébreux, — le Veuf, — l'Inconsolé,\nLe Prince d'Aquitaine à la Tour abolie :\nMa seule Étoile est morte, — et mon luth constellé\nPorte le Soleil noir de la Mélancolie.\n\nDans la nuit du Tombeau, Toi qui m'as consolé,\nRends-moi le Pausilippe et la mer d'Italie,\nLa fleur qui plaisait tant à mon cœur désolé,\nEt la treille où le Pampre à la Rose s'allie.\n\nSuis-je Amour ou Phébus ?… Lusignan ou Biron ?\nMon front est rouge encor du baiser de la Reine ;\nJ'ai rêvé dans la Grotte où nage la sirène…\n\nEt j'ai deux fois vainqueur traversé l'Achéron :\nModulant tour à tour sur la lyre d'Orphée\nLes soupirs de la Sainte et les cris de la Fée.",
    note: "Sonnet dense et symbolique sur une mélancolie profonde (« le Soleil noir de la Mélancolie ») ; Nerval lui-même est mort par suicide. Texte exigeant, à réserver à une famille sensible à la poésie, et à proposer avec beaucoup de délicatesse.",
  },
  {
    id: 'scott-holland-la-mort-nest-rien',
    title: "La mort n'est rien",
    author: 'Henry Scott Holland',
    authorDates: '1847–1918',
    categories: ['deuil-general', 'vieillesse-paix', 'amour-separation'],
    body: "La mort n'est rien.\nJe suis simplement passé dans la pièce à côté.\nJe suis moi, tu es toi.\nCe que nous étions l'un pour l'autre, nous le sommes toujours.\n\nDonne-moi le nom que tu m'as toujours donné,\nParle-moi comme tu l'as toujours fait,\nN'emploie pas un ton différent,\nNe prends pas un air solennel ou triste,\nContinue à rire de ce qui nous faisait rire ensemble,\nPrie, souris, pense à moi, prie pour moi.\n\nQue mon nom soit prononcé à la maison comme il l'a toujours été,\nSans emphase d'aucune sorte, sans une trace d'ombre.\nLa vie signifie tout ce qu'elle a toujours signifié,\nElle est ce qu'elle a toujours été.\nLe fil n'est pas coupé.\n\nPourquoi serais-je hors de tes pensées,\nSimplement parce que je suis hors de ta vue ?\nJe ne suis pas loin, juste de l'autre côté du chemin.\nTu vois, tout est bien.",
    note: "Texte le plus demandé aux obsèques en France — souvent attribué par erreur à Charles Péguy, qui n'en est pas l'auteur. Il s'agit en réalité d'un extrait d'un sermon de 1910 du chanoine anglican Henry Scott Holland, dont la traduction française circule depuis les années 1990 sans traducteur identifié (de légères variantes de formulation existent selon les recueils). Registre doux et rassurant, adapté à la plupart des deuils, y compris pour des familles peu croyantes malgré son origine religieuse.",
  },
  {
    id: 'musset-tristesse',
    title: 'Tristesse',
    author: 'Alfred de Musset',
    authorDates: '1810–1857',
    categories: ['apres-suicide', 'deuil-general'],
    body: "J'ai perdu ma force et ma vie,\nEt mes amis et ma gaîté ;\nJ'ai perdu jusqu'à la fierté\nQui faisait croire à mon génie.\n\nQuand j'ai connu la Vérité,\nJ'ai cru que c'était une amie ;\nQuand je l'ai comprise et sentie,\nJ'en étais déjà dégoûté.\n\nEt pourtant elle est éternelle,\nEt ceux qui se sont passés d'elle\nIci-bas ont tout ignoré.\n\nDieu parle, il faut qu'on lui réponde.\nLe seul bien qui me reste au monde\nEst d'avoir quelquefois pleuré.",
    note: "Un constat de désillusion profonde qui se referme sur une note d'apaisement (« le seul bien... est d'avoir quelquefois pleuré »). Peut convenir, avec délicatesse, à un deuil après un suicide ou après une longue souffrance.",
  },
]
