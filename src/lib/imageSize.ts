/**
 * Dimensions d'une image lues dans son en-tête, sans la décoder. Une « bombe » d'image
 * (fichier de quelques Mo qui occupe des gigaoctets une fois décodé) peut figer ou faire
 * planter le navigateur à l'affichage : on la refuse avant, au vu de ses dimensions.
 */

/** Bien au-delà de toute photo normale (un appareil de 50 Mpx donne 8160 × 6120). */
export const MAX_IMAGE_PIXELS = 120_000_000

export interface ImageSize {
  width: number
  height: number
}

function readJpeg(v: DataView): ImageSize | null {
  let i = 2
  while (i + 9 < v.byteLength) {
    if (v.getUint8(i) !== 0xff) {
      i++
      continue
    }
    const marker = v.getUint8(i + 1)
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2
      continue
    }
    const length = v.getUint16(i + 2)
    // SOF0 à SOF15, sauf DHT (C4), JPG (C8) et DAC (CC) : contiennent les dimensions.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: v.getUint16(i + 5), width: v.getUint16(i + 7) }
    }
    i += 2 + length
  }
  return null
}

function readWebp(v: DataView): ImageSize | null {
  const chunk = String.fromCharCode(v.getUint8(12), v.getUint8(13), v.getUint8(14), v.getUint8(15))
  if (chunk === 'VP8X' && v.byteLength >= 30) {
    const w = 1 + (v.getUint8(24) | (v.getUint8(25) << 8) | (v.getUint8(26) << 16))
    const h = 1 + (v.getUint8(27) | (v.getUint8(28) << 8) | (v.getUint8(29) << 16))
    return { width: w, height: h }
  }
  if (chunk === 'VP8L' && v.byteLength >= 25) {
    const bits = v.getUint32(21, true)
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
  }
  if (chunk === 'VP8 ' && v.byteLength >= 30) {
    return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff }
  }
  return null
}

/** Dimensions si le format est reconnu (JPEG, PNG, GIF, WebP, BMP), sinon null. */
export async function readImageSize(blob: Blob): Promise<ImageSize | null> {
  try {
    const head = new DataView(await blob.slice(0, 256 * 1024).arrayBuffer())
    if (head.byteLength < 26) return null
    const sig = head.getUint32(0)
    if (sig === 0x89504e47) return { width: head.getUint32(16), height: head.getUint32(20) }
    if (head.getUint16(0) === 0xffd8) return readJpeg(head)
    if (sig === 0x47494638) return { width: head.getUint16(6, true), height: head.getUint16(8, true) }
    if (sig === 0x52494646 && head.getUint32(8) === 0x57454250) return readWebp(head)
    if (head.getUint16(0) === 0x424d) return { width: head.getInt32(18, true), height: Math.abs(head.getInt32(22, true)) }
    return null
  } catch {
    return null
  }
}

/** Vrai si l'image est assez raisonnable pour être décodée et affichée sans risque. */
export async function isImageSizeSafe(blob: Blob): Promise<boolean> {
  const size = await readImageSize(blob)
  if (!size) return true
  return size.width > 0 && size.height > 0 && size.width * size.height <= MAX_IMAGE_PIXELS
}
