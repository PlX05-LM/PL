# Céréma — logiciel de régie pour maîtres de cérémonie

Application web (PC et tablette) pensée pour les maîtres de cérémonie du funéraire : elle permet de préparer le déroulé d'une cérémonie, d'y associer musiques et photos, puis de la piloter en direct le jour J.

## Fonctionnalités

- **Cérémonies** : fiche défunt/famille, type de cérémonie, date/lieu, et un déroulé (timeline) découpé en étapes avec un texte à lire pour chacune.
- **Bibliothèque musicale** : import de fichiers audio (MP3, WAV, M4A…), prévisualisation, assignation d'un morceau par étape.
- **Photothèque & diaporama** : import de photos, sélection et ordre pour le diaporama, réglages de transition (fondu, dissolution, glissement, cut), durée par photo, effet Ken Burns, lecture en boucle.
- **Régie live** : écran plein cadre pour le jour de la cérémonie — déroulé cliquable, prompteur (défilement automatique réglable, taille de texte, texte modifiable en direct), lecteur audio avec fondu de sortie, contrôle du diaporama, chronomètre.
- **Écran de projection** : une fenêtre séparée à envoyer sur un second écran/vidéoprojecteur, synchronisée en temps réel avec la régie via `BroadcastChannel`.
- **Fonctionne hors-ligne** : toutes les données (cérémonies, musiques, photos) sont stockées localement dans le navigateur (IndexedDB) — aucune connexion internet requise le jour de la cérémonie.

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

## Stack technique

- React + TypeScript + Vite
- Tailwind CSS v4
- Dexie.js (IndexedDB) pour le stockage local des cérémonies, musiques et photos
- React Router pour la navigation
- `BroadcastChannel` pour synchroniser la régie et l'écran de projection

## Pistes d'évolution

- Export PDF du déroulé de cérémonie
- Import de trames PowerPoint/Canva pour le diaporama
- Mode multi-utilisateur avec synchronisation cloud (pour plusieurs maîtres de cérémonie dans une même agence)
- Bibliothèque de textes/citations prêts à l'emploi
- Marque blanche pour les pompes funèbres (logo, couleurs)
