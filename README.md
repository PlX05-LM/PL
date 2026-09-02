# Céréma — logiciel de régie pour maîtres de cérémonie

Application web (PC et tablette) pensée pour les maîtres de cérémonie du funéraire : elle permet de préparer le déroulé d'une cérémonie, d'y associer musiques et photos, puis de la piloter en direct le jour J.

## Fonctionnalités

- **Cérémonies** : fiche défunt/famille, type de cérémonie, date/lieu, et un déroulé (timeline) découpé en étapes avec un texte à lire pour chacune.
- **Bibliothèque musicale** : import de fichiers audio (MP3, WAV, M4A…), prévisualisation, assignation d'un morceau par étape.
- **Photothèque & diaporama** : import de photos, sélection et ordre pour le diaporama, réglages de transition (fondu, dissolution, glissement, cut), durée par photo, effet Ken Burns, lecture en boucle.
- **Régie live** : écran plein cadre pour le jour de la cérémonie — déroulé cliquable, prompteur (défilement automatique réglable, taille de texte, texte modifiable en direct), lecteur audio avec fondu de sortie, contrôle du diaporama, chronomètre, compteur d'avance/retard sur le déroulé prévu.
- **Textes-types** : bibliothèque de textes prêts à l'emploi (ouverture, transitions, hommage, clôture, pensées laïques, repères pour lectures religieuses) à insérer dans une étape.
- **Clavier & télécommande** : pilotage de la régie (étapes, musique, diaporama, écran noir) au clavier ou avec une télécommande de présentation Bluetooth/USB, avec réassignation libre des touches par utilisateur.
- **Écran de projection** : une fenêtre séparée à envoyer sur un second écran/vidéoprojecteur, synchronisée en temps réel avec la régie via `BroadcastChannel`.
- **Fonctionne hors-ligne** : toutes les données (cérémonies, musiques, photos) sont stockées localement dans le navigateur (IndexedDB) — aucune connexion internet requise le jour de la cérémonie.
- **Sauvegarde** : export/import d'une sauvegarde complète (ZIP) de toutes les cérémonies, musiques et photos, à conserver ailleurs que sur l'appareil.
- **Application installable (PWA)** : à installer sur l'écran d'accueil d'une tablette ou d'un PC comme une vraie application, avec mise en cache de l'appli pour un chargement garanti même sans réseau.

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
