import { db } from '../db'
import type { Photo } from '../types'

/**
 * Bibliothèque de visuels nature générés (pas des photographies) : pour les familles qui
 * n'ont pas de photo du défunt ou ne souhaitent pas en diffuser une. Générés par canvas,
 * exactement comme la bibliothèque musicale libre de droit — 100 % originaux, aucune
 * question de droits, utilisables sans restriction dans un cadre professionnel.
 */
export const NATURE_LICENSE =
  'Visuel généré pour Céréma — libre de droit, usage professionnel autorisé sans restriction.'

export type NatureTheme = 'ciel' | 'mer' | 'foret' | 'montagne' | 'terre' | 'lumiere'

export const natureThemeLabels: Record<NatureTheme, string> = {
  ciel: 'Ciel',
  mer: 'Mer',
  foret: 'Forêt',
  montagne: 'Montagne',
  terre: 'Terre & champs',
  lumiere: 'Lumière',
}

export const natureThemeOrder: NatureTheme[] = ['ciel', 'mer', 'foret', 'montagne', 'terre', 'lumiere']

interface NatureSpec {
  slug: string
  theme: NatureTheme
  title: string
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

const W = 1600
const H = 900

function linearSky(ctx: CanvasRenderingContext2D, w: number, h: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  stops.forEach(([o, c]) => g.addColorStop(o, c))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function glow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  inner: string,
  outer: string,
) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g.addColorStop(0, inner)
  g.addColorStop(1, outer)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
}

/** Ligne d'horizon douce et ondulée (collines, canopée de forêt, houle). */
function waveLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseY: number,
  amplitude: number,
  freq: number,
  phase: number,
  color: string,
) {
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(0, baseY)
  for (let x = 0; x <= w; x += 8) {
    const t = (x / w) * Math.PI * freq
    const y = baseY - (Math.sin(t + phase) * amplitude + Math.sin(t * 2.6 + phase * 1.4) * amplitude * 0.3)
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

/** Ligne de crêtes anguleuse (montagnes). */
function jaggedLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  baseY: number,
  amplitude: number,
  peaks: number,
  phase: number,
  color: string,
) {
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(0, baseY)
  const step = w / peaks
  for (let i = 0; i <= peaks; i++) {
    const x = i * step
    const y = baseY - Math.abs(Math.sin(i * 1.9 + phase)) * amplitude
    ctx.lineTo(x, y)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${strength})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

const SPECS: NatureSpec[] = [
  // --- Ciel ---
  {
    slug: 'ciel-aube',
    theme: 'ciel',
    title: 'Aube',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#2b3a67'],
        [0.45, '#e8927c'],
        [1, '#fbdcb0'],
      ])
      glow(ctx, w * 0.5, h * 0.72, h * 0.5, 'rgba(255,230,180,0.9)', 'rgba(255,230,180,0)')
    },
  },
  {
    slug: 'ciel-crepuscule',
    theme: 'ciel',
    title: 'Crépuscule',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#0b1230'],
        [0.5, '#3a2d5c'],
        [1, '#d97b56'],
      ])
      glow(ctx, w * 0.5, h * 0.95, h * 0.55, 'rgba(255,190,140,0.6)', 'rgba(255,190,140,0)')
    },
  },
  {
    slug: 'ciel-azur',
    theme: 'ciel',
    title: 'Azur',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#1c5fa8'],
        [1, '#bfe3f5'],
      ])
      glow(ctx, w * 0.78, h * 0.18, h * 0.28, 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0)')
    },
  },
  {
    slug: 'ciel-etoile',
    theme: 'ciel',
    title: 'Nuit étoilée',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#05070f'],
        [1, '#1c2b52'],
      ])
      glow(ctx, w * 0.28, h * 0.22, h * 0.16, 'rgba(230,235,255,0.9)', 'rgba(230,235,255,0)')
      let seed = 7
      const rand = () => {
        seed = (seed * 9301 + 49297) % 233280
        return seed / 233280
      }
      for (let i = 0; i < 140; i++) {
        const x = rand() * w
        const y = rand() * h * 0.75
        const r = rand() * 1.4 + 0.3
        ctx.globalAlpha = 0.4 + rand() * 0.6
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    },
  },

  // --- Mer ---
  {
    slug: 'mer-turquoise',
    theme: 'mer',
    title: 'Lagon turquoise',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h * 0.45, [
        [0, '#bdeafd'],
        [1, '#eaf9ff'],
      ])
      ctx.fillStyle = '#0f9aa6'
      ctx.fillRect(0, h * 0.45, w, h * 0.55)
      linearSky(ctx, w, h, [
        [0.45, '#1cb5c4'],
        [1, '#0a5b6e'],
      ])
      for (let i = 0; i < 6; i++) {
        ctx.globalAlpha = 0.12
        ctx.fillStyle = '#ffffff'
        waveLayer(ctx, w, h, h * (0.5 + i * 0.08), 6, 8, i * 1.3, ctx.fillStyle as string)
      }
      ctx.globalAlpha = 1
    },
  },
  {
    slug: 'mer-profonde',
    theme: 'mer',
    title: 'Mer profonde',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h * 0.4, [
        [0, '#7fa8c9'],
        [1, '#cfe2ef'],
      ])
      linearSky(ctx, w, h, [
        [0.4, '#1c4f77'],
        [1, '#08213a'],
      ])
    },
  },
  {
    slug: 'mer-coucher-soleil',
    theme: 'mer',
    title: 'Coucher de soleil sur l’eau',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h * 0.5, [
        [0, '#3d2c58'],
        [1, '#e8825a'],
      ])
      ctx.fillStyle = '#3a1f3d'
      ctx.fillRect(0, h * 0.5, w, h * 0.5)
      glow(ctx, w * 0.5, h * 0.5, h * 0.22, 'rgba(255,200,140,0.95)', 'rgba(255,200,140,0)')
      const g = ctx.createLinearGradient(0, h * 0.5, 0, h)
      g.addColorStop(0, 'rgba(255,190,130,0.55)')
      g.addColorStop(1, 'rgba(255,190,130,0)')
      ctx.fillStyle = g
      ctx.fillRect(w * 0.42, h * 0.5, w * 0.16, h * 0.5)
    },
  },
  {
    slug: 'mer-brume',
    theme: 'mer',
    title: 'Mer dans la brume',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#c7d3d8'],
        [0.5, '#aab9bf'],
        [1, '#7f9298'],
      ])
      waveLayer(ctx, w, h, h * 0.55, 10, 6, 0.4, 'rgba(120,140,145,0.5)')
      waveLayer(ctx, w, h, h * 0.68, 8, 5, 1.8, 'rgba(90,108,113,0.6)')
    },
  },

  // --- Forêt ---
  {
    slug: 'foret-ete',
    theme: 'foret',
    title: 'Forêt en été',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#bcdcea'],
        [1, '#e8f4ea'],
      ])
      waveLayer(ctx, w, h, h * 0.55, 26, 5, 0.2, '#9fc98a')
      waveLayer(ctx, w, h, h * 0.68, 30, 6, 2.1, '#5c9a5f')
      waveLayer(ctx, w, h, h * 0.82, 34, 7, 4.0, '#2f6b3c')
    },
  },
  {
    slug: 'foret-automne',
    theme: 'foret',
    title: 'Forêt en automne',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#f6dfb8'],
        [1, '#f3ede0'],
      ])
      waveLayer(ctx, w, h, h * 0.55, 26, 5, 0.6, '#d9a15c')
      waveLayer(ctx, w, h, h * 0.68, 30, 6, 2.5, '#b5652f')
      waveLayer(ctx, w, h, h * 0.82, 34, 7, 4.6, '#7a3a20')
    },
  },
  {
    slug: 'foret-brume',
    theme: 'foret',
    title: 'Forêt dans la brume',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#dfe6e2'],
        [1, '#c6d0c9'],
      ])
      waveLayer(ctx, w, h, h * 0.5, 22, 5, 0.3, 'rgba(150,170,158,0.55)')
      waveLayer(ctx, w, h, h * 0.66, 26, 6, 2.0, 'rgba(110,132,118,0.7)')
      waveLayer(ctx, w, h, h * 0.82, 30, 7, 3.9, 'rgba(63,84,68,0.9)')
    },
  },
  {
    slug: 'foret-sapins',
    theme: 'foret',
    title: 'Forêt de sapins',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#cfe6ea'],
        [1, '#eef7f4'],
      ])
      waveLayer(ctx, w, h, h * 0.5, 18, 10, 0.4, '#7fa596')
      waveLayer(ctx, w, h, h * 0.68, 24, 12, 2.4, '#3f6b57')
      waveLayer(ctx, w, h, h * 0.85, 28, 14, 4.7, '#1f4636')
    },
  },

  // --- Montagne ---
  {
    slug: 'montagne-aube',
    theme: 'montagne',
    title: 'Montagnes au lever du jour',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#3c4f7a'],
        [0.5, '#c9848a'],
        [1, '#f0c9a0'],
      ])
      jaggedLayer(ctx, w, h, h * 0.6, 90, 7, 0.5, '#5a5470')
      jaggedLayer(ctx, w, h, h * 0.74, 70, 9, 2.2, '#332f4a')
    },
  },
  {
    slug: 'montagne-enneigee',
    theme: 'montagne',
    title: 'Sommets enneigés',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#8fb6d9'],
        [1, '#e4eff5'],
      ])
      jaggedLayer(ctx, w, h, h * 0.58, 100, 6, 0.8, '#6b7c94')
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      for (let i = 0; i < 6; i++) {
        const x = (w / 6) * i + w * 0.06
        ctx.beginPath()
        ctx.moveTo(x, h * 0.58 - 60 - (i % 2) * 20)
        ctx.lineTo(x - 30, h * 0.58 - 10 - (i % 2) * 20)
        ctx.lineTo(x + 30, h * 0.58 - 10 - (i % 2) * 20)
        ctx.closePath()
        ctx.fill()
      }
      jaggedLayer(ctx, w, h, h * 0.74, 60, 8, 3.1, '#3d4a5e')
    },
  },
  {
    slug: 'montagne-crepuscule',
    theme: 'montagne',
    title: 'Montagnes au crépuscule',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#1a1f3d'],
        [0.6, '#5b3a58'],
        [1, '#d17a55'],
      ])
      jaggedLayer(ctx, w, h, h * 0.62, 95, 6, 0.3, '#2c2440')
      jaggedLayer(ctx, w, h, h * 0.78, 65, 8, 2.6, '#160f26')
    },
  },
  {
    slug: 'montagne-brume',
    theme: 'montagne',
    title: 'Montagnes dans la brume',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#cdd8dc'],
        [1, '#aebcc2'],
      ])
      jaggedLayer(ctx, w, h, h * 0.55, 80, 6, 0.9, 'rgba(130,148,155,0.55)')
      jaggedLayer(ctx, w, h, h * 0.7, 70, 7, 2.7, 'rgba(90,108,116,0.75)')
      jaggedLayer(ctx, w, h, h * 0.85, 55, 8, 4.4, 'rgba(58,75,82,0.95)')
    },
  },

  // --- Terre & champs ---
  {
    slug: 'terre-ble',
    theme: 'terre',
    title: 'Champ de blé',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h * 0.35, [
        [0, '#bcdcf2'],
        [1, '#eaf5fb'],
      ])
      waveLayer(ctx, w, h, h * 0.5, 12, 4, 0.3, '#e8c96a')
      waveLayer(ctx, w, h, h * 0.68, 16, 5, 1.9, '#d1a83f')
      waveLayer(ctx, w, h, h * 0.85, 20, 6, 3.6, '#a9822a')
    },
  },
  {
    slug: 'terre-collines',
    theme: 'terre',
    title: 'Collines verdoyantes',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h * 0.35, [
        [0, '#cfe7f2'],
        [1, '#eef8f2'],
      ])
      waveLayer(ctx, w, h, h * 0.5, 24, 4, 0.5, '#a9cf85')
      waveLayer(ctx, w, h, h * 0.68, 26, 5, 2.1, '#7fb264')
      waveLayer(ctx, w, h, h * 0.85, 28, 6, 3.9, '#4f8a4c')
    },
  },
  {
    slug: 'terre-desert',
    theme: 'terre',
    title: 'Dunes',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h * 0.4, [
        [0, '#f3d9ad'],
        [1, '#fbeccb'],
      ])
      waveLayer(ctx, w, h, h * 0.55, 20, 3, 0.4, '#e2b878')
      waveLayer(ctx, w, h, h * 0.72, 24, 4, 2.0, '#c99a5c')
      waveLayer(ctx, w, h, h * 0.88, 22, 4, 3.7, '#a97a44')
    },
  },
  {
    slug: 'terre-vignes',
    theme: 'terre',
    title: 'Rangs de vigne',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h * 0.35, [
        [0, '#f6ddc4'],
        [1, '#fbeee0'],
      ])
      waveLayer(ctx, w, h, h * 0.5, 14, 5, 0.6, '#c9a05a')
      waveLayer(ctx, w, h, h * 0.68, 18, 6, 2.3, '#8f6a3b')
      waveLayer(ctx, w, h, h * 0.85, 20, 7, 4.1, '#5c4526')
    },
  },

  // --- Lumière ---
  {
    slug: 'lumiere-doree',
    theme: 'lumiere',
    title: 'Lumière dorée',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#fff6df'],
        [1, '#f5c98a'],
      ])
      glow(ctx, w * 0.5, h * 0.4, h * 0.7, 'rgba(255,250,235,1)', 'rgba(245,201,138,0)')
      vignette(ctx, w, h, 0.18)
    },
  },
  {
    slug: 'lumiere-blanche',
    theme: 'lumiere',
    title: 'Lumière blanche',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#ffffff'],
        [1, '#dbe6ee'],
      ])
      glow(ctx, w * 0.5, h * 0.35, h * 0.65, 'rgba(255,255,255,1)', 'rgba(219,230,238,0)')
      vignette(ctx, w, h, 0.12)
    },
  },
  {
    slug: 'lumiere-celeste',
    theme: 'lumiere',
    title: 'Lueur céleste',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#e9e4f7'],
        [1, '#c7d9ee'],
      ])
      glow(ctx, w * 0.5, h * 0.3, h * 0.6, 'rgba(255,255,255,0.95)', 'rgba(200,215,240,0)')
      glow(ctx, w * 0.3, h * 0.7, h * 0.3, 'rgba(255,240,220,0.4)', 'rgba(255,240,220,0)')
      vignette(ctx, w, h, 0.15)
    },
  },
  {
    slug: 'lumiere-aurore',
    theme: 'lumiere',
    title: 'Aurore intérieure',
    draw: (ctx, w, h) => {
      linearSky(ctx, w, h, [
        [0, '#fbe4e0'],
        [0.5, '#f6c9c0'],
        [1, '#e9a6c7'],
      ])
      glow(ctx, w * 0.5, h * 0.5, h * 0.65, 'rgba(255,245,240,0.9)', 'rgba(233,166,199,0)')
      vignette(ctx, w, h, 0.14)
    },
  },
]

export function builtInNaturePhotoId(slug: string) {
  return `builtin-nature-${slug}`
}

function renderNatureCanvas(spec: NatureSpec): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D non disponible')
  spec.draw(ctx, W, H)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Échec de génération du visuel'))),
      'image/jpeg',
      0.92,
    )
  })
}

async function buildNaturePhoto(spec: NatureSpec): Promise<Photo> {
  const blob = await renderNatureCanvas(spec)
  return {
    id: builtInNaturePhotoId(spec.slug),
    name: spec.title,
    blob,
    mimeType: 'image/jpeg',
    createdAt: Date.now(),
  }
}

export interface NatureLibraryProgress {
  index: number
  total: number
  title: string
}

/** Génère (si besoin) et ajoute les visuels nature de la bibliothèque. Idempotent. */
export async function importNatureLibrary(
  onProgress?: (p: NatureLibraryProgress) => void,
): Promise<number> {
  let added = 0
  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i]
    onProgress?.({ index: i + 1, total: SPECS.length, title: spec.title })
    const existing = await db.photos.get(builtInNaturePhotoId(spec.slug))
    if (existing) continue
    await db.photos.add(await buildNaturePhoto(spec))
    added += 1
    await new Promise((r) => setTimeout(r, 0))
  }
  return added
}

/** Régénère les visuels en place (mêmes identifiants, donc les cérémonies qui les utilisent restent valides). */
export async function regenerateNatureLibrary(
  onProgress?: (p: NatureLibraryProgress) => void,
): Promise<number> {
  let updated = 0
  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i]
    onProgress?.({ index: i + 1, total: SPECS.length, title: spec.title })
    await db.photos.put(await buildNaturePhoto(spec))
    updated += 1
    await new Promise((r) => setTimeout(r, 0))
  }
  return updated
}

export function natureLibrarySpecs() {
  return SPECS.map((s) => ({ slug: s.slug, theme: s.theme, title: s.title }))
}

export function natureIdsForTheme(theme: NatureTheme): string[] {
  return SPECS.filter((s) => s.theme === theme).map((s) => builtInNaturePhotoId(s.slug))
}
