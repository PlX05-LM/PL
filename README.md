# Céréma — logiciel de régie pour maîtres de cérémonie

Application web (PC et tablette) pensée pour les maîtres de cérémonie du funéraire : elle permet de préparer le déroulé d'une cérémonie, d'y associer musiques et photos, puis de la piloter en direct le jour J.

## Fonctionnalités

- **Cérémonies** : fiche défunt/famille, type de cérémonie, date/lieu, et un déroulé (timeline) découpé en étapes avec un texte à lire pour chacune.
- **Bibliothèque musicale** : import de fichiers audio (MP3, WAV, M4A…), prévisualisation, assignation d'un morceau par étape. Inclut 20 compositions originales libres de droit, réparties en 9 sonorités bien distinctes (orgue, cordes, voix, violoncelle seul, harpe, piano, flûte, carillon) pour éviter que les morceaux ne se ressemblent.
- **Découpe audio** : forme d'onde visuelle de chaque musique importée, avec des repères à glisser pour ne garder que le passage souhaité — utile pour retirer une introduction bruitée ou une fin inadaptée avant de jouer le morceau en cérémonie. Écoute de l'extrait sélectionné avant validation.
- **Photothèque & diaporama** : import de photos, sélection et ordre pour le diaporama, réglages de transition (fondu, dissolution, glissement, cut), durée par photo, effet Ken Burns, lecture en boucle.
- **Régie live** : écran plein cadre pour le jour de la cérémonie — déroulé cliquable, prompteur (défilement automatique réglable, taille de texte, texte modifiable en direct), lecteur audio avec fondu de sortie et choix de la sortie audio (enceinte Bluetooth, système son de la salle, AirPlay), contrôle du diaporama, chronomètre, compteur d'avance/retard sur le déroulé prévu. Le sélecteur de sortie audio s'adapte automatiquement à l'appareil : menu déroulant direct sur Chrome/Edge/Android, bouton AirPlay natif sur iPhone/iPad/Safari. Un onglet « Bibliothèque » dans le panneau Musique permet de parcourir et rechercher toutes les musiques disponibles, et de lancer directement un morceau en un clic sans quitter la régie.
- **Textes-types** : bibliothèque de textes prêts à l'emploi (ouverture, transitions, hommage, clôture, pensées laïques, repères pour lectures religieuses) à insérer dans une étape.
- **Clavier & télécommande** : pilotage de la régie (étapes, musique, diaporama, écran noir) au clavier ou avec une télécommande de présentation Bluetooth/USB, avec réassignation libre des touches par utilisateur.
- **Écran de projection** : une fenêtre séparée à envoyer sur un second écran/vidéoprojecteur, synchronisée en temps réel avec la régie via `BroadcastChannel`.
- **Fonctionne hors-ligne** : toutes les données (cérémonies, musiques, photos) sont stockées localement dans le navigateur (IndexedDB) — aucune connexion internet requise le jour de la cérémonie.
- **Sauvegarde** : export/import d'une sauvegarde complète (ZIP) de toutes les cérémonies, musiques et photos, à conserver ailleurs que sur l'appareil.
- **Application installable (PWA)** : à installer sur l'écran d'accueil d'une tablette ou d'un PC comme une vraie application, avec mise en cache de l'appli pour un chargement garanti même sans réseau.
- **Accès protégé par licence** : l'application est verrouillée tant qu'une clé d'activation valide n'a pas été saisie ; chaque poste choisit ensuite son identifiant et son mot de passe (plusieurs identifiants possibles par licence, selon le nombre de postes vendus). Voir « Licences et activation » ci-dessous.
- **Paramètres** : afficher/masquer le prompteur et le compteur d'avance/retard en régie, taille de texte et vitesse de défilement par défaut, masquer la bibliothèque libre de droit dans les sélecteurs de musique, durée du fondu de sortie, check-list technique avant le direct (désactivée par défaut, activable au besoin), informations de licence et changement de mot de passe.

## Démarrer en développement

```bash
npm install
npm run dev
```

## Build de production

```bash
npm run build
npm run preview
```

## Déploiement (GitHub Pages)

Un workflow GitHub Actions (`.github/workflows/deploy-pages.yml`) construit et publie
automatiquement l'application sur GitHub Pages à chaque push. L'appli est servie sous
`/PL/` (nom du dépôt) : la variable d'environnement `GITHUB_PAGES=true` bascule le
`base` Vite en conséquence lors du build.

Si Pages n'est pas encore activé sur le dépôt, une seule manipulation ponctuelle est
nécessaire : Settings → Pages → Build and deployment → Source → **GitHub Actions**.

## Licences et activation

L'application est verrouillée par une clé d'activation cryptographiquement
signée (ECDSA P-256) — pas de serveur, pas d'abonnement à héberger : la
vérification se fait entièrement dans le navigateur du client, hors-ligne
comme le reste de l'app.

Pour vendre une licence à un client :

```bash
node scripts/generate-license-key.mjs "Pompes Funèbres Dupont" 3
```

(nom du client, puis nombre de postes/identifiants inclus dans la licence —
1 par défaut). La première exécution génère une paire de clés :
- `license-private-key.json` — la clé privée, créée à la racine du projet et
  **jamais committée** (dans `.gitignore`). C'est elle qui permet de signer
  de nouvelles clés d'activation : à conserver précieusement, en dehors du
  dépôt (elle n'a été communiquée qu'une fois, lors de la création).
- la clé publique correspondante, intégrée dans
  `src/lib/licensing/publicKey.ts` et committée normalement — elle ne permet
  que de *vérifier* une clé, jamais d'en fabriquer.

Le script affiche ensuite la clé d'activation à transmettre au client. Celui-ci
la saisit une fois dans l'application, puis choisit son identifiant et son mot
de passe (stockés localement, mot de passe jamais en clair). Si la licence
inclut plusieurs postes, chaque personne de l'agence peut créer son propre
identifiant depuis l'écran de connexion, jusqu'à la limite achetée.

## Stack technique

- React + TypeScript + Vite
- Tailwind CSS v4
- Dexie.js (IndexedDB) pour le stockage local des cérémonies, musiques et photos
- React Router pour la navigation
- `BroadcastChannel` pour synchroniser la régie et l'écran de projection
- `vite-plugin-pwa` (Workbox) pour le manifeste et le service worker

## Pistes d'évolution

- Modèles de cérémonie réutilisables (trames avec étapes/durées types)
- Programme/livret imprimable pour la famille, distinct du déroulé opérationnel
- Import de trames PowerPoint/Canva pour le diaporama
- Mode multi-utilisateur avec synchronisation cloud (pour plusieurs maîtres de cérémonie dans une même agence)
- Marque blanche pour les pompes funèbres (logo, couleurs)
