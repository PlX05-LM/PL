import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// Sous GitHub Pages, l'appli est servie sous /<repo>/ et non à la racine du domaine.
const base = process.env.GITHUB_PAGES ? '/PL/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Céréma — Régie de cérémonies',
        short_name: 'Céréma',
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
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
})
