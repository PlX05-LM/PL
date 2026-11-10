import type { PhotoEdit } from '../types'

/**
 * Retouche des photos du diaporama : rotation, miroir, recadrage, luminosité, contraste,
 * saturation, noir et blanc ou sépia. L'aperçu à l'écran passe par un filtre CSS ; l'image
 * enregistrée est calculée pixel par pixel avec les mêmes formules (spécification des
 * filtres CSS), pour que le résultat soit celui que l'on a vu.
 */

/** Côté le plus long de l'image enregistrée : net en 4K sans alourdir le diaporama. */
const MAX_OUTPUT_SIDE = 4096

export const DEFAULT_EDIT: PhotoEdit = {
  rotation: 0,
  flipH: false,
  crop: { x: 0, y: 0, w: 1, h: 1 },
  brightness: 1,
  contrast: 1,
  saturation: 1,
  effect: 'none',
}

export function isIdentity(e: PhotoEdit): boolean {
  const c = e.crop
  return (
    e.rotation === 0 &&
    !e.flipH &&
    c.x <= 0.0005 && c.y <= 0.0005 && c.w >= 0.999 && c.h >= 0.999 &&
    e.brightness === 1 && e.contrast === 1 && e.saturation === 1 && e.effect === 'none'
  )
}

/** Image décodée, orientation de l'appareil photo (EXIF) appliquée. */
export function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob, { imageOrientation: 'from-image' })
}

/** Dimensions après rotation. */
export function rotatedSize(width: number, height: number, rotation: PhotoEdit['rotation']) {
  return rotation % 180 === 0 ? { width, height } : { width: height, height: width }
}

/** Dessine l'image tournée et retournée sur un canevas, à l'échelle demandée. */
export function drawOriented(bitmap: ImageBitmap, edit: Pick<PhotoEdit, 'rotation' | 'flipH'>, scale: number): HTMLCanvasElement {
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const size = rotatedSize(w, h, edit.rotation)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')!
  ctx.translate(size.width / 2, size.height / 2)
  if (edit.flipH) ctx.scale(-1, 1)
  ctx.rotate((edit.rotation * Math.PI) / 180)
  ctx.drawImage(bitmap, -w / 2, -h / 2, w, h)
  return canvas
}

/** Filtre CSS équivalent, pour l'aperçu en direct. */
export function cssFilter(e: PhotoEdit): string {
  const parts = [`brightness(${e.brightness})`, `contrast(${e.contrast})`, `saturate(${e.saturation})`]
  if (e.effect === 'bw') parts.push('grayscale(1)')
  if (e.effect === 'sepia') parts.push('sepia(1)')
  return parts.join(' ')
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v)

/** Mêmes calculs que brightness → contrast → saturate → grayscale/sepia en CSS. */
function applyAdjustments(data: ImageData, e: PhotoEdit) {
  if (e.brightness === 1 && e.contrast === 1 && e.saturation === 1 && e.effect === 'none') return
  const px = data.data
  const b = e.brightness
  const c = e.contrast
  const intercept = 128 * (1 - c)
  const s = e.saturation
  // Matrice de saturation (Filter Effects, feColorMatrix « saturate »).
  const m = [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ]
  for (let i = 0; i < px.length; i += 4) {
    let r = clamp255(px[i] * b)
    let g = clamp255(px[i + 1] * b)
    let bl = clamp255(px[i + 2] * b)
    r = clamp255(r * c + intercept)
    g = clamp255(g * c + intercept)
    bl = clamp255(bl * c + intercept)
    let r2 = clamp255(m[0] * r + m[1] * g + m[2] * bl)
    let g2 = clamp255(m[3] * r + m[4] * g + m[5] * bl)
    let b2 = clamp255(m[6] * r + m[7] * g + m[8] * bl)
    if (e.effect === 'bw') {
      const y = 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2
      r2 = g2 = b2 = y
    } else if (e.effect === 'sepia') {
      const sr = 0.393 * r2 + 0.769 * g2 + 0.189 * b2
      const sg = 0.349 * r2 + 0.686 * g2 + 0.168 * b2
      const sb = 0.272 * r2 + 0.534 * g2 + 0.131 * b2
      r2 = clamp255(sr)
      g2 = clamp255(sg)
      b2 = clamp255(sb)
    }
    px[i] = r2
    px[i + 1] = g2
    px[i + 2] = b2
  }
}

/** Calcule l'image retouchée (JPEG), à partir de l'original. */
export async function renderEdited(bitmap: ImageBitmap, edit: PhotoEdit): Promise<Blob> {
  const full = rotatedSize(bitmap.width, bitmap.height, edit.rotation)
  const cropW = full.width * edit.crop.w
  const cropH = full.height * edit.crop.h
  // On réduit avant de tourner si la zone gardée dépasse la taille utile.
  const scale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(cropW, cropH))
  const oriented = drawOriented(bitmap, edit, scale)
  const sx = Math.round(edit.crop.x * oriented.width)
  const sy = Math.round(edit.crop.y * oriented.height)
  const sw = Math.max(1, Math.round(edit.crop.w * oriented.width))
  const sh = Math.max(1, Math.round(edit.crop.h * oriented.height))
  const out = document.createElement('canvas')
  out.width = sw
  out.height = sh
  const ctx = out.getContext('2d')!
  // Fond noir comme l'écran de projection (une zone transparente deviendrait noire en JPEG).
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, sw, sh)
  ctx.drawImage(oriented, sx, sy, sw, sh, 0, 0, sw, sh)
  oriented.width = oriented.height = 0
  const data = ctx.getImageData(0, 0, sw, sh)
  applyAdjustments(data, edit)
  ctx.putImageData(data, 0, 0)
  const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, 'image/jpeg', 0.92))
  out.width = out.height = 0
  if (!blob) throw new Error('encode')
  return blob
}

// --- Recadrage : rotations et formats ---------------------------------------

type Crop = PhotoEdit['crop']

/** Garde la même zone de la photo quand on la fait pivoter d'un quart de tour. */
export function rotateCrop(c: Crop, dir: 1 | -1): Crop {
  return dir === 1 ? { x: 1 - c.y - c.h, y: c.x, w: c.h, h: c.w } : { x: c.y, y: 1 - c.x - c.w, w: c.h, h: c.w }
}

export function flipCrop(c: Crop): Crop {
  return { ...c, x: 1 - c.x - c.w }
}

/** Plus grande zone centrée au format demandé (largeur / hauteur, en pixels). */
export function centeredCrop(ratio: number, imageW: number, imageH: number): Crop {
  const imageRatio = imageW / imageH
  if (ratio > imageRatio) {
    const h = imageRatio / ratio
    return { x: 0, y: (1 - h) / 2, w: 1, h }
  }
  const w = ratio / imageRatio
  return { x: (1 - w) / 2, y: 0, w, h: 1 }
}
