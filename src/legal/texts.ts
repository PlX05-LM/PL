import { editor } from './editor'

/** Un paragraphe, ou une liste à puces. */
export type Block = string | string[]
export interface LegalSection {
  title: string
  blocks: Block[]
}
export interface LegalText {
  title: string
  intro: string
  sections: LegalSection[]
}

const e = editor
const company = `${e.companyName}, ${e.legalForm}, ${e.address}, ${e.registration}`
const contact = e.email || '[adresse e-mail de contact]'

export const legalTexts: Record<string, LegalText> = {
  confidentialite: {
    title: 'Politique de confidentialité',
    intro: `Comment ${e.product} protège les informations des familles et des agences. Céréo est conçu pour garder le moins de données possible : les dossiers restent sur l'ordinateur de l'agence, et ce qui passe par internet est chiffré ou effacé rapidement.`,
    sections: [
      {
        title: 'Qui est responsable de vos données',
        blocks: [
          "L'agence de pompes funèbres qui organise la cérémonie décide de ce qui est recueilli et pourquoi : elle est responsable du traitement des informations sur le défunt et ses proches.",
          `${e.companyName}, éditeur de ${e.product}, agit pour le compte de l'agence comme sous-traitant (article 28 du RGPD) pour le lien famille et la rédaction par IA. L'éditeur est responsable du traitement pour la gestion des licences et des abonnements des agences.`,
        ],
      },
      {
        title: 'Quelles données, et où elles sont conservées',
        blocks: [
          [
            "Dossiers de cérémonie (identité et parcours du défunt, noms des proches, textes, photos, vidéos, musiques) : enregistrés uniquement dans le navigateur de l'ordinateur de l'agence. L'éditeur n'y a pas accès.",
            "Lien famille : les réponses, textes, photos, vidéos et documents envoyés par les proches sont chiffrés dans le téléphone (AES-256) avant d'être envoyés. La clé de chiffrement ne figure que dans le lien remis à la famille : le service en ligne ne stocke qu'un contenu illisible, effacé dès que l'agence ferme l'accès, et au plus tard à la date d'expiration du lien (14 jours maximum).",
            "Rédaction par IA : à la demande de l'agence, les notes de l'entretien utiles au texte (prénoms, parcours, souvenirs) sont transmises au fournisseur d'IA pour rédiger une proposition, puis renvoyées à l'ordinateur de l'agence. Le service de Céréo ne les conserve pas.",
            "Données techniques : l'adresse IP sert quelques heures au plus à limiter les abus ; l'identifiant de licence et le nombre de rédactions par mois servent au décompte de l'abonnement (40 jours au plus).",
          ],
          "Céréo n'utilise aucun cookie publicitaire ni outil de mesure d'audience. Le navigateur garde seulement les préférences d'affichage de l'appareil.",
        ],
      },
      {
        title: 'Prestataires (sous-traitants ultérieurs)',
        blocks: [
          [
            "Cloudflare, Inc. (États-Unis) : service en ligne de Céréo, stockage chiffré temporaire du lien famille, limitation des abus.",
            "Anthropic, PBC (États-Unis) : rédaction des textes par intelligence artificielle, selon ses conditions commerciales, qui excluent l'utilisation de ces données pour entraîner ses modèles.",
            "GitHub, Inc. (États-Unis) : mise à disposition des fichiers de l'application. Aucune donnée de dossier n'y transite.",
          ],
          "Ces prestataires peuvent traiter des données hors de l'Union européenne. Ces transferts sont encadrés par les garanties prévues par le RGPD (décision d'adéquation EU-US Data Privacy Framework ou clauses contractuelles types de la Commission européenne).",
        ],
      },
      {
        title: 'Vos droits',
        blocks: [
          "Vous pouvez demander l'accès à vos données, leur rectification ou leur effacement, vous opposer à leur traitement ou en demander la limitation. Adressez-vous d'abord à l'agence qui organise la cérémonie : c'est elle qui détient le dossier. Vous pouvez aussi écrire à l'éditeur : " + contact + '.',
          "Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (www.cnil.fr).",
          "Toute personne peut définir des directives sur le sort de ses données après son décès (article 85 de la loi Informatique et Libertés).",
        ],
      },
      {
        title: 'Sécurité',
        blocks: [
          "Accès au logiciel par licence et mot de passe, chiffrement de bout en bout du lien famille, connexions chiffrées (HTTPS), contrôle des fichiers reçus, effacement automatique des espaces famille. L'agence reste responsable de la sécurité de ses ordinateurs et de ses sauvegardes.",
        ],
      },
    ],
  },

  'mentions-legales': {
    title: 'Mentions légales',
    intro: `Informations sur l'éditeur et l'hébergement de ${e.product}.`,
    sections: [
      {
        title: 'Éditeur',
        blocks: [[company, `SIRET : ${e.siret}`, `TVA : ${e.vat}`, `Contact : ${contact} — ${e.phone}`, `Directeur de la publication : ${e.publisher}`]],
      },
      {
        title: 'Hébergement',
        blocks: [
          [
            "Application : GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.",
            'Service en ligne (lien famille, rédaction par IA) : Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis.',
          ],
        ],
      },
      {
        title: 'Propriété intellectuelle',
        blocks: [
          `Le logiciel ${e.product}, son nom, ses textes et ses éléments graphiques sont la propriété de ${e.companyName}. Les photos, vidéos, musiques et textes importés par les agences et les familles restent la propriété de leurs auteurs.`,
        ],
      },
    ],
  },

  conditions: {
    title: "Conditions générales d'abonnement",
    intro: `Ces conditions s'appliquent à l'utilisation de ${e.product} par les professionnels du funéraire (agences, crématoriums, maîtres de cérémonie). Elles ne s'adressent pas aux particuliers.`,
    sections: [
      {
        title: '1. Objet',
        blocks: [
          `${e.companyName} met à disposition le logiciel ${e.product} pour préparer et conduire des cérémonies funéraires, ainsi qu'un service en ligne (lien famille, rédaction par IA), sous forme d'abonnement.`,
        ],
      },
      {
        title: '2. Essai et accès',
        blocks: [
          "Un essai gratuit de 30 jours peut être proposé, sans engagement. L'accès se fait par une clé d'activation personnelle, liée à l'abonnement et à un nombre de postes. La clé ne doit pas être communiquée à un tiers.",
        ],
      },
      {
        title: '3. Prix, paiement et durée',
        blocks: [
          "Les prix sont ceux de la grille tarifaire ou du devis accepté, en euros hors taxes. L'abonnement est payable d'avance, au mois ou à l'année. Il se renouvelle automatiquement et peut être résilié à tout moment, avec effet à la fin de la période payée.",
          "À la fin de l'abonnement, le logiciel ne permet plus de travailler sur les dossiers, mais l'agence peut toujours télécharger une sauvegarde complète de ses données.",
        ],
      },
      {
        title: '4. Rédaction par intelligence artificielle',
        blocks: [
          "Les textes proposés par l'IA sont des brouillons : ils peuvent contenir des erreurs ou des formulations inadaptées. L'agence les relit et reste seule responsable de ce qui est lu pendant la cérémonie. Chaque abonnement comprend un nombre de rédactions par mois, indiqué dans l'offre.",
        ],
      },
      {
        title: "5. Obligations de l'agence",
        blocks: [
          [
            "Informer les familles du traitement de leurs données et recueillir ce qui est nécessaire auprès d'elles.",
            "Disposer des droits sur les photos, vidéos et musiques qu'elle importe ou diffuse (en particulier auprès de la Sacem pour les musiques non libres de droits).",
            "Faire des sauvegardes régulières de ses dossiers, enregistrés sur ses propres ordinateurs.",
            'Présenter les prestations liées à Céréo comme facultatives sur ses devis, conformément à la réglementation funéraire.',
          ],
        ],
      },
      {
        title: '6. Disponibilité et assistance',
        blocks: [
          "Le logiciel fonctionne sans connexion internet ; le service en ligne est fourni avec une obligation de moyens et peut être interrompu pour maintenance. L'assistance est joignable à " + contact + '.',
        ],
      },
      {
        title: '7. Données personnelles',
        blocks: [
          "Pour les données des familles, l'éditeur agit comme sous-traitant de l'agence, dans les conditions du contrat de sous-traitance joint, qui fait partie de ces conditions.",
        ],
      },
      {
        title: '8. Responsabilité',
        blocks: [
          "La responsabilité de l'éditeur est limitée aux dommages directs et plafonnée aux sommes payées par l'agence au cours des 12 derniers mois. L'éditeur n'est pas responsable de la perte de données enregistrées sur les ordinateurs de l'agence.",
        ],
      },
      {
        title: '9. Droit applicable',
        blocks: ['Ces conditions sont soumises au droit français. En cas de litige, et à défaut d\'accord amiable, les tribunaux de [ville] sont compétents.'],
      },
    ],
  },

  'sous-traitance': {
    title: 'Contrat de sous-traitance des données (article 28 du RGPD)',
    intro: `Entre l'agence cliente (responsable du traitement) et ${e.companyName} (sous-traitant), pour la durée de l'abonnement à ${e.product}.`,
    sections: [
      {
        title: '1. Objet et durée',
        blocks: [
          "Le sous-traitant traite des données pour le compte de l'agence afin de fournir le lien famille (collecte chiffrée des réponses et des fichiers des proches) et la rédaction de textes par IA. Le contrat dure autant que l'abonnement.",
        ],
      },
      {
        title: '2. Données et personnes concernées',
        blocks: [
          [
            "Personnes : proches du défunt qui utilisent le lien famille ; personnes citées dans les souvenirs (le RGPD ne s'applique pas aux personnes décédées, mais leurs données sont traitées avec le même soin).",
            "Données : noms et liens de parenté, souvenirs, textes, photos, vidéos, documents ; aucune donnée bancaire ni de santé n'est demandée.",
          ],
        ],
      },
      {
        title: '3. Obligations du sous-traitant',
        blocks: [
          [
            "Ne traiter les données que sur instruction de l'agence et pour les finalités ci-dessus ; ne jamais les vendre ni les utiliser à d'autres fins.",
            'Garantir la confidentialité des personnes autorisées à intervenir sur le service.',
            "Mettre en œuvre les mesures de sécurité décrites dans la politique de confidentialité, notamment le chiffrement de bout en bout du lien famille.",
            "N'avoir recours qu'aux sous-traitants ultérieurs listés dans la politique de confidentialité, et informer l'agence de tout changement, qu'elle peut refuser en résiliant.",
            "Aider l'agence à répondre aux demandes d'exercice des droits et aux analyses d'impact éventuelles.",
            "Notifier à l'agence toute violation de données dans un délai de 48 heures après en avoir eu connaissance.",
            "Supprimer les données à la fermeture de chaque lien famille et au plus tard 14 jours après sa création ; ne conserver aucune copie à la fin du contrat.",
            "Tenir à disposition de l'agence les informations nécessaires pour démontrer le respect de ces obligations.",
          ],
        ],
      },
      {
        title: "4. Obligations de l'agence",
        blocks: [
          "Fournir les instructions, informer les familles (une information figure sur la première page du lien famille), tenir son registre des traitements et assurer la sécurité de ses propres ordinateurs.",
        ],
      },
    ],
  },
}
