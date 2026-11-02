/**
 * Worker de conversion vidéo : fait tourner FFmpeg (WebAssembly) hors du fil principal pour que
 * l'interface reste fluide pendant qu'un MKV (ou tout autre format illisible) est converti en MP4.
 *
 * Le moteur (~30 Mo) n'est chargé qu'au premier besoin, puis gardé en cache par le navigateur
 * et le service worker : les imports suivants fonctionnent aussi hors-ligne.
 */

const CORE_VERSION = '0.12.10'
const CORE_BASE = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`

/**
 * Empreintes SHA-384 des fichiers officiels du paquet npm @ffmpeg/core@0.12.10. Le moteur
 * vient d'un CDN extérieur : s'il était un jour altéré (CDN ou paquet compromis), du code
 * étranger s'exécuterait avec accès aux données de l'application. Chaque fichier est donc
 * vérifié octet par octet avant usage, et refusé au moindre écart.
 */
const CORE_INTEGRITY = {
  js: 'sha384-9KlAmgHu5wDqdgQvFhQGZOtKdCwGcMppDhM/kBkUpZ5LS7KGuAHbE+NgtJQEf84i',
  wasm: 'sha384-U1VDhkPYrM3wTCT4/vjSpSsKqG/UjljYrYCI4hBSJ02svbCkxuCi6U6u/peg5vpW',
}

/** Télécharge un fichier, vérifie son empreinte et le renvoie en URL locale (blob:). */
async function fetchVerified(url: string, integrity: string, type: string): Promise<string> {
  // Pas d'option « integrity » du navigateur : en cas d'écart, elle échoue comme une simple
  // coupure réseau. Notre propre calcul distingue un fichier altéré d'une absence de réseau.
  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const bytes = await response.arrayBuffer()
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-384', bytes))
  let binary = ''
  for (const b of digest) binary += String.fromCharCode(b)
  if (`sha384-${btoa(binary)}` !== integrity) throw new Error('integrity')
  return URL.createObjectURL(new Blob([bytes], { type }))
}

interface FFmpegCore {
  FS: {
    mkdir(path: string): void
    mount(type: unknown, opts: unknown, mountpoint: string): void
    unmount(mountpoint: string): void
    readFile(path: string): Uint8Array
    unlink(path: string): void
    rmdir(path: string): void
    filesystems: Record<string, unknown>
  }
  exec(...args: string[]): number
  ret: number
  reset(): void
  setTimeout(ms: number): void
  setLogger(fn: (data: { type: string; message: string }) => void): void
  setProgress(fn: (data: { progress: number; time: number }) => void): void
}

type CoreFactory = (opts: { mainScriptUrlOrBlob: string }) => Promise<FFmpegCore>

export type ConvertRequest = { id: number; file: File; args: string[] }
export type ConvertMessage =
  | { id: number; type: 'loading' }
  | { id: number; type: 'progress'; progress: number }
  | { id: number; type: 'done'; data: Uint8Array }
  | { id: number; type: 'error'; message: string; log: string }

let corePromise: Promise<FFmpegCore> | null = null
let currentId = 0

function loadCore(): Promise<FFmpegCore> {
  if (!corePromise) {
    corePromise = (async () => {
      const coreURL = await fetchVerified(`${CORE_BASE}/ffmpeg-core.js`, CORE_INTEGRITY.js, 'text/javascript')
      const wasmURL = await fetchVerified(`${CORE_BASE}/ffmpeg-core.wasm`, CORE_INTEGRITY.wasm, 'application/wasm')
      const mod = (await import(/* @vite-ignore */ coreURL)) as { default: CoreFactory }
      const core = await mod.default({
        // Même astuce que @ffmpeg/ffmpeg : l'URL du .wasm est passée dans le hash.
        mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL: '' }))}`,
      })
      core.setProgress(({ progress }) => {
        if (Number.isFinite(progress)) {
          self.postMessage({
            id: currentId,
            type: 'progress',
            progress: Math.max(0, Math.min(1, progress)),
          } satisfies ConvertMessage)
        }
      })
      return core
    })()
    corePromise.catch(() => {
      corePromise = null
    })
  }
  return corePromise
}

let log: string[] = []

self.onmessage = async ({ data }: MessageEvent<ConvertRequest>) => {
  const { id, file, args } = data
  currentId = id
  log = []
  const post = (msg: ConvertMessage, transfer?: Transferable[]) =>
    self.postMessage(msg, { transfer: transfer ?? [] })
  let core: FFmpegCore
  try {
    post({ id, type: 'loading' })
    core = await loadCore()
  } catch (e) {
    const refused = e instanceof Error && e.message === 'integrity'
    post({ id, type: 'error', message: refused ? 'integrity' : 'load', log: String(e) })
    return
  }
  core.setLogger(({ message }) => {
    log.push(message)
    if (log.length > 200) log.shift()
  })

  const inDir = '/in'
  const out = '/out.mp4'
  let mounted = false
  try {
    // WORKERFS lit le fichier directement depuis le disque, sans le recopier en mémoire :
    // indispensable pour les longs films souvenirs de plusieurs centaines de Mo.
    core.FS.mkdir(inDir)
    core.FS.mount(core.FS.filesystems.WORKERFS, { files: [file] }, inDir)
    mounted = true
    const input = `${inDir}/${file.name}`
    const fullArgs = args.map((a) => (a === '{input}' ? input : a === '{output}' ? out : a))
    core.setTimeout(-1)
    core.exec(...fullArgs)
    const ret = core.ret
    core.reset()
    if (ret !== 0) throw new Error(`exit ${ret}`)
    const result = core.FS.readFile(out)
    post({ id, type: 'done', data: result }, [result.buffer])
  } catch (e) {
    post({ id, type: 'error', message: String(e), log: log.slice(-30).join('\n') })
  } finally {
    try {
      core.FS.unlink(out)
    } catch {
      /* pas de fichier produit */
    }
    if (mounted) {
      try {
        core.FS.unmount(inDir)
      } catch {
        /* déjà démonté */
      }
    }
    try {
      core.FS.rmdir(inDir)
    } catch {
      /* déjà supprimé */
    }
  }
}
