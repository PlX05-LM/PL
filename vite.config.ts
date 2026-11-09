import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, type Plugin } from 'vite'
import { createReadStream, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/**
 * Politique de sécurité du contenu (CSP), ajoutée à la page publiée seulement (le serveur
 * de développement a besoin de scripts en ligne). GitHub Pages ne permet pas d'en-têtes
 * HTTP : elle passe par une balise meta. Seuls les scripts de l'application s'exécutent ;
 * les appels réseau ne partent qu'en HTTPS (service en ligne, moteur vidéo vérifié) ;
 * aucun plugin, aucune page étrangère intégrée.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self' blob:",
  "connect-src 'self' https: blob: data:",
  "img-src 'self' blob: data:",
  "media-src 'self' blob: data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "manifest-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ')

const securityHeaders = {
  name: 'cereo-security-meta',
  apply: 'build' as const,
  transformIndexHtml(html: string) {
    return html.replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
    )
  },
}

/**
 * Ressources de pdf.js (polices standard, décodeurs d'images, tables de caractères) pour
 * l'import de PDF dans le diaporama : copiées depuis le paquet au moment de la publication
 * (et servies telles quelles en développement), plutôt que versionnées dans le dépôt.
 */
const PDFJS_DIRS = ['standard_fonts', 'cmaps', 'wasm', 'iccs']
const pdfjsRoot = path.resolve('node_modules/pdfjs-dist')
function pdfjsAssets(): Plugin {
  return {
    name: 'cereo-pdfjs-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/^\/pdfjs\/([a-z_]+)\/([A-Za-z0-9._-]+)$/)
        if (!match || !PDFJS_DIRS.includes(match[1])) return next()
        const file = path.join(pdfjsRoot, match[1], match[2])
        try {
          if (!statSync(file).isFile()) return next()
        } catch {
          return next()
        }
        createReadStream(file).pipe(res)
      })
    },
    generateBundle() {
      for (const dir of PDFJS_DIRS) {
        for (const name of readdirSync(path.join(pdfjsRoot, dir))) {
          if (name.startsWith('LICENSE')) continue
          this.emitFile({ type: 'asset', fileName: `pdfjs/${dir}/${name}`, source: readFileSync(path.join(pdfjsRoot, dir, name)) })
        }
      }
    },
  }
}

// Sous GitHub Pages, l'appli est servie sous /<repo>/ et non à la racine du domaine.
const base = process.env.GITHUB_PAGES ? '/PL/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  // Le worker de conversion vidéo charge le moteur FFmpeg par import() dynamique.
  worker: { format: 'es' },
  plugins: [
    securityHeaders,
    pdfjsAssets(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Céréo — Régie de cérémonies',
        short_name: 'Céréo',
        description:
          'Préparez et pilotez vos cérémonies funéraires : déroulé, musiques, diaporama et régie live.',
        lang: 'fr',
        // Non renseignés : dérivés automatiquement de `base` par le plugin, pour
        // rester corrects que l'appli soit servie à la racine ou sous /PL/.
        display: 'standalone',
        orientation: 'any',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          // Chemins relatifs (pas de "/" initial) : résolus par rapport à
          // l'URL du manifeste lui-même, donc corrects sous n'importe quel base.
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Les musiques/photos vivent dans IndexedDB, jamais dans le cache du service worker —
        // seule la coquille de l'application (JS/CSS/HTML/icônes) est mise en cache ici.
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,webmanifest}'],
        // Les ressources de pdf.js ne sont pas préchargées (elles servent rarement) :
        // gardées en cache dès leur premier usage, pour les imports suivants hors-ligne.
        globIgnores: ['pdfjs/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        // Moteur de conversion vidéo (MKV, AVI… → MP4) : téléchargé au premier import qui en a
        // besoin, puis conservé pour que les conversions suivantes marchent aussi hors-ligne.
        runtimeCaching: [
          {
            urlPattern: /\/pdfjs\/(standard_fonts|cmaps|wasm|iccs)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfjs-assets',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@ffmpeg\/core@/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ffmpeg-core',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 4 },
            },
          },
        ],
      },
    }),
  ],
})
