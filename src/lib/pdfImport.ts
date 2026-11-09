/**
 * Import d'un PDF dans le diaporama : chaque page devient une photo (album scanné, faire-part,
 * livret préparé par la famille…). Tout se fait dans le navigateur, sans connexion : le moteur
 * pdf.js est livré avec l'application et chargé seulement au premier PDF importé.
 */

/** Côté le plus long de l'image produite : net sur un vidéoprojecteur jusqu'en 4K. */
const TARGET_LONG_SIDE = 2560
/** Au-delà, le PDF est sans doute un document et non un album : on s'arrête là. */
export const MAX_PDF_PAGES = 200

/** Une page qui ne se rend pas en une minute ne se rendra pas : on abandonne proprement. */
const STEP_TIMEOUT_MS = 60_000

export class PdfImportError extends Error {
  reason: 'password' | 'invalid' | 'too-many-pages' | 'timeout'
  constructor(reason: PdfImportError['reason']) {
    super(reason)
    this.reason = reason
  }
}

/** Jamais d'attente sans fin : une étape bloquée devient une erreur affichée. */
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PdfImportError('timeout')), STEP_TIMEOUT_MS)
    }),
  ]).finally(() => clearTimeout(timer))
}

export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

export interface PdfPageImage {
  blob: Blob
  page: number
}

// Édition « legacy » de pdf.js : l'édition standard exige des fonctions JavaScript très
// récentes (Map.getOrInsertComputed…) absentes de nombreux navigateurs encore en service
// (iPad, Safari, Chrome pas tout à fait à jour), où l'import resterait bloqué sans message.
async function loadPdfjs() {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return pdfjs
}

/** Transforme chaque page du PDF en image JPEG, dans l'ordre, en signalant la progression. */
export async function pdfToImages(
  file: File,
  onProgress?: (page: number, total: number) => void,
): Promise<PdfPageImage[]> {
  const pdfjs = await loadPdfjs()
  const assets = `${import.meta.env.BASE_URL}pdfjs/`
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    // Sécurité : pas de formulaires XFA ; pdf.js n'exécute jamais les scripts d'un PDF.
    enableXfa: false,
    standardFontDataUrl: `${assets}standard_fonts/`,
    cMapUrl: `${assets}cmaps/`,
    cMapPacked: true,
    wasmUrl: `${assets}wasm/`,
    iccUrl: `${assets}iccs/`,
  })
  let doc
  try {
    doc = await withTimeout(task.promise)
  } catch (e) {
    await task.destroy()
    if (e instanceof PdfImportError) throw e
    if (e instanceof Error && e.name === 'PasswordException') throw new PdfImportError('password')
    throw new PdfImportError('invalid')
  }

  try {
    if (doc.numPages > MAX_PDF_PAGES) throw new PdfImportError('too-many-pages')
    const images: PdfPageImage[] = []
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress?.(n, doc.numPages)
      const page = await withTimeout(doc.getPage(n))
      const base = page.getViewport({ scale: 1 })
      const scale = TARGET_LONG_SIDE / Math.max(base.width, base.height)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new PdfImportError('invalid')
      // Fond blanc : une page transparente deviendrait noire en JPEG.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      await withTimeout(page.render({ canvas, canvasContext: ctx, viewport }).promise)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
      page.cleanup()
      canvas.width = canvas.height = 0
      if (!blob) throw new PdfImportError('invalid')
      images.push({ blob, page: n })
    }
    return images
  } catch (e) {
    throw e instanceof PdfImportError ? e : new PdfImportError('invalid')
  } finally {
    await task.destroy()
  }
}
