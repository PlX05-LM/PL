# Céréo — service IA (proxy Cloudflare Worker)

Ce dossier contient le petit service qui permet à Céréo de générer des textes
par IA (ébauche biographique, texte d'une étape de cérémonie) : un « worker »
Cloudflare qui reçoit les requêtes de l'application, appelle l'API Claude
(Anthropic) avec une clé API gardée secrète côté serveur, et renvoie le texte
généré. L'application elle-même reste 100% locale — ce service n'est utilisé
que si vous choisissez d'activer la génération par IA, et seulement quand
l'appareil est en ligne (voir « Comportement hors-ligne » dans le README
principal).

**Vous seul(e) contrôlez ce service** : c'est votre compte Cloudflare, votre
clé API Anthropic, donc votre facturation. Rien n'est géré par un tiers.

## Pourquoi un serveur, et pas juste une clé API dans l'application ?

L'application est un site statique (GitHub Pages) : tout son code est
public et lisible par n'importe qui. Une clé API collée directement dans ce
code serait immédiatement récupérable et utilisable par n'importe qui,
à vos frais. Le worker sert d'intermédiaire : la clé Anthropic n'existe que
sur Cloudflare, jamais dans le navigateur ni dans le dépôt.

## Déploiement (une fois)

Prérequis : un compte Cloudflare (gratuit — l'usage de ce worker reste très
en dessous du palier payant) et une clé API sur [console.anthropic.com](https://console.anthropic.com).

```bash
cd worker
npm install

# Connecte ce terminal à votre compte Cloudflare (ouvre une page web)
npx wrangler login

# Crée l'espace de stockage utilisé pour limiter les abus (comptage de
# requêtes par adresse IP). La commande affiche un id à copier.
npx wrangler kv namespace create RATE_LIMIT
```

Collez l'`id` renvoyé dans `wrangler.toml`, à la place de
`REMPLACER_PAR_L_ID_RENVOYE_PAR_WRANGLER`.

```bash
# Clé API Anthropic (jamais écrite dans un fichier du dépôt)
npx wrangler secret put ANTHROPIC_API_KEY

# Jeton d'application : une chaîne que VOUS choisissez, longue et aléatoire
# (ex. générée avec `openssl rand -hex 32`). Le même jeton doit être collé
# dans les Paramètres de l'application Céréo sur chaque poste — c'est ce
# qui empêche n'importe qui de découvrir l'URL du service et de l'utiliser
# à vos frais.
npx wrangler secret put APP_TOKEN

# Déploiement
npm run deploy
```

La commande affiche une URL du type `https://cereo-ai-proxy.<votre-compte>.workers.dev`
— c'est l'« adresse du service IA » à coller dans les Paramètres de
l'application, avec le jeton choisi ci-dessus.

## Coûts

Deux factures séparées, toutes deux sous votre compte :
- **Cloudflare Workers** : gratuit jusqu'à 100 000 requêtes/jour, largement
  suffisant pour cet usage.
- **API Anthropic** : facturée à l'usage réel (au token). Une ébauche
  biographique ou un texte d'étape coûte l'équivalent de quelques centimes.
  Pensez à intégrer ce coût dans le prix de votre prestation si vous le
  répercutez à vos clients.

## Protection contre les abus

Deux garde-fous sont en place :
- **Jeton d'application** (`APP_TOKEN`) : toute requête sans le bon jeton est
  rejetée avant d'atteindre l'API Anthropic.
- **Limite de requêtes par adresse IP** (`RATE_LIMIT_PER_HOUR`, 30/heure par
  défaut) : réglable dans `wrangler.toml` (section `[vars]`, à ajouter si
  besoin) ou via `npx wrangler secret put RATE_LIMIT_PER_HOUR`.

Ces garde-fous limitent l'exposition mais ne remplacent pas une vraie
authentification par utilisateur — à surveiller si l'usage grandit
(consultez le tableau de bord Cloudflare et la page d'usage Anthropic
régulièrement).

## Origines autorisées (CORS)

Par défaut, seules ces origines peuvent appeler le service depuis un
navigateur : `https://plx05-lm.github.io` et les serveurs de développement
locaux (`localhost:5173`, `4173`, `4321`). Pour ajouter un domaine (marque
blanche, domaine personnalisé…), définissez la variable `ALLOWED_ORIGINS`
(liste séparée par des virgules) dans `wrangler.toml` ou via
`npx wrangler secret put ALLOWED_ORIGINS`.

## Développement local

```bash
npm run dev
```

Crée un fichier `.dev.vars` (jamais commité, voir `.gitignore`) avec :

```
ANTHROPIC_API_KEY=sk-ant-...
APP_TOKEN=un-jeton-de-test
```

## Mettre à jour le service après une modification

```bash
npm run deploy
```

L'URL ne change pas — rien à reconfigurer côté application.
