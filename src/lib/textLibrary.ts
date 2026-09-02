export type TextCategory =
  | 'ouverture'
  | 'transition'
  | 'hommage'
  | 'cloture'
  | 'pensees'
  | 'reperes-religieux'

export interface TextEntry {
  id: string
  category: TextCategory
  title: string
  body: string
}

export const categoryLabels: Record<TextCategory, string> = {
  ouverture: "Mots d'ouverture",
  transition: 'Transitions & recueillement',
  hommage: 'Hommage',
  cloture: 'Mots de clôture',
  pensees: 'Pensées laïques',
  'reperes-religieux': 'Repères pour lectures religieuses',
}

export const categoryOrder: TextCategory[] = [
  'ouverture',
  'transition',
  'hommage',
  'cloture',
  'pensees',
  'reperes-religieux',
]

export const textLibrary: TextEntry[] = [
  {
    id: 'ouverture-sobre',
    category: 'ouverture',
    title: 'Accueil sobre',
    body: "Mesdames, messieurs, chère famille,\n\nNous voici réunis ce jour pour accompagner [prénom du défunt] dans ce dernier moment. Je vous remercie d'être présents, aussi nombreux, pour lui témoigner votre affection et votre respect.",
  },
  {
    id: 'ouverture-chaleureuse',
    category: 'ouverture',
    title: 'Accueil chaleureux',
    body: "Bonjour à toutes et à tous,\n\nMerci d'être venus si nombreux entourer la famille de [prénom du défunt] en ce moment de peine. Votre présence est un réconfort précieux pour ses proches, et je sais qu'elle aurait touché [prénom du défunt] au plus haut point.",
  },
  {
    id: 'ouverture-laique',
    category: 'ouverture',
    title: 'Accueil (cérémonie laïque)',
    body: "Chers amis, chère famille,\n\nNous sommes réunis aujourd'hui pour dire au revoir à [prénom du défunt], dans la simplicité du souvenir. Cette cérémonie lui ressemble : sobre et sincère, à l'image de la vie qu'il/elle a menée.",
  },
  {
    id: 'ouverture-deroule',
    category: 'ouverture',
    title: 'Rappel du déroulé',
    body: "Avant de commencer, permettez-moi de vous indiquer comment se déroulera cette cérémonie : nous partagerons quelques mots sur la vie de [prénom du défunt], puis un temps de recueillement, avant de nous retrouver pour [la mise en terre / la crémation / un moment convivial].",
  },
  {
    id: 'transition-silence',
    category: 'transition',
    title: 'Introduction à une minute de silence',
    body: "Je vous propose à présent de nous recueillir ensemble, en silence, pendant quelques instants, pour honorer la mémoire de [prénom du défunt] et lui adresser, chacun à sa manière, un dernier au revoir.\n\n(silence)\n\nJe vous remercie.",
  },
  {
    id: 'transition-diaporama',
    category: 'transition',
    title: 'Transition vers le diaporama',
    body: "Pour que chacun garde de [prénom du défunt] une image vivante, sa famille a souhaité partager avec vous quelques photos qui retracent des moments de sa vie. Je vous invite à les regarder avec nous.",
  },
  {
    id: 'transition-musique',
    category: 'transition',
    title: 'Invitation à une écoute musicale',
    body: "Nous allons à présent écouter [titre du morceau], un morceau qui comptait particulièrement pour [prénom du défunt] / pour sa famille. Je vous invite à l'écouter en pensant à lui/elle.",
  },
  {
    id: 'hommage-biographie',
    category: 'hommage',
    title: 'Cadre pour un hommage biographique',
    body: "[Prénom du défunt] est né(e) le [date] à [lieu].\n\n[Développer ici les grandes étapes de sa vie : famille, métier, passions, anecdotes marquantes transmises par les proches.]\n\nCeux qui l'ont connu(e) se souviendront de [qualité ou trait marquant].",
  },
  {
    id: 'hommage-prise-de-parole',
    category: 'hommage',
    title: 'Transition vers une prise de parole',
    body: "Je laisse à présent la parole à [prénom de l'intervenant], qui souhaite partager quelques mots sur [prénom du défunt].",
  },
  {
    id: 'cloture-sobre',
    category: 'cloture',
    title: 'Clôture sobre',
    body: "Nous arrivons au terme de cette cérémonie. Au nom de la famille, je vous remercie chaleureusement d'être venus accompagner [prénom du défunt] et de lui avoir témoigné, par votre présence, tant d'affection.",
  },
  {
    id: 'cloture-invitation',
    category: 'cloture',
    title: 'Invitation à se retrouver',
    body: "La famille vous invite à présent à [vous retrouver autour d'un moment convivial / la rejoindre à (lieu)] pour évoquer ensemble le souvenir de [prénom du défunt]. Merci encore à toutes et à tous.",
  },
  {
    id: 'cloture-dernier-adieu',
    category: 'cloture',
    title: 'Dernier adieu',
    body: "Il est temps à présent de dire au revoir à [prénom du défunt]. Que son souvenir reste vivant dans le cœur de celles et ceux qui l'ont aimé(e).\n\nAdieu, [prénom du défunt].",
  },
  {
    id: 'cloture-cremation',
    category: 'cloture',
    title: 'Clôture pour une crémation',
    body: "Nous allons à présent accompagner [prénom du défunt] pour ce dernier passage. Je vous remercie, au nom de sa famille, pour votre présence et votre soutien en ce jour si particulier.",
  },
  {
    id: 'pensee-memoire',
    category: 'pensees',
    title: 'Sur la mémoire',
    body: "Personne ne s'en va vraiment tant qu'il reste, quelque part, une personne pour se souvenir de son sourire.",
  },
  {
    id: 'pensee-absence',
    category: 'pensees',
    title: "Sur l'absence",
    body: "Le temps n'efface pas les absents ; il change simplement la douleur en souvenir, et le souvenir en tendresse.",
  },
  {
    id: 'pensee-vie',
    category: 'pensees',
    title: 'Sur la vie qui continue',
    body: "Ce n'est pas la durée d'une vie qui compte, mais tout ce qu'elle a donné à celles et ceux qui l'ont croisée.",
  },
  {
    id: 'pensee-deuil-partage',
    category: 'pensees',
    title: 'Sur le deuil partagé',
    body: "La peine partagée est un peu moins lourde à porter ; c'est pour cela que nous sommes réunis aujourd'hui, les uns près des autres.",
  },
  {
    id: 'reperes-catholiques',
    category: 'reperes-religieux',
    title: 'Repères catholiques',
    body: "Pense-bête de coordination avec l'officiant — pas un texte à lire tel quel, à reprendre dans un missel : Psaume 23 (« Le Seigneur est mon berger »), Livre de la Sagesse 3, 1-9, Épître de saint Paul aux Romains 14, 7-9, Évangile selon saint Jean 14, 1-6.",
  },
  {
    id: 'reperes-protestants',
    category: 'reperes-religieux',
    title: 'Repères protestants',
    body: "Pense-bête de coordination avec le pasteur : Psaume 23, Ecclésiaste 3, 1-8 (« Il y a un temps pour tout »), Épître aux Romains 8, 38-39.",
  },
  {
    id: 'reperes-juifs',
    category: 'reperes-religieux',
    title: 'Repères juifs',
    body: "Pense-bête de coordination avec l'officiant : Psaume 23, Psaume 121 (« Je lève les yeux vers les montagnes »), le Kaddish (prière des endeuillés, récitée par l'officiant).",
  },
  {
    id: 'reperes-musulmans',
    category: 'reperes-religieux',
    title: 'Repères musulmans',
    body: "Pense-bête de coordination avec l'imam : sourate Al-Fatiha, versets sur la patience et le retour à Dieu (sourate Al-Baqara). La prière funéraire (salat al-janaza) est conduite par l'imam.",
  },
  {
    id: 'reperes-bouddhistes',
    category: 'reperes-religieux',
    title: 'Repères bouddhistes',
    body: "Pense-bête de coordination avec l'officiant : lecture sur l'impermanence, récitation de sutras adaptée à la tradition (theravada/mahayana) suivie par la famille.",
  },
]
