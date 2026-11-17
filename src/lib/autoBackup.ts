import { buildFullBackup, markBackupDone } from './backup'

/**
 * Sauvegarde automatique : une fois par jour, une copie complète est écrite dans un dossier
 * choisi par l'agence (disque, clé USB, dossier synchronisé OneDrive / Google Drive / Dropbox).
 * Les 10 dernières sont gardées. Fonctionne sur Chrome et Edge (ordinateur) ; ailleurs, un
 * rappel invite à télécharger la sauvegarde.
 */

interface DirHandle {
  name: string
  queryPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(opts: { mode: 'readwrite' }): Promise<PermissionState>
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }>
  removeEntry(name: string): Promise<void>
  keys(): AsyncIterableIterator<string>
}

const DB = 'cereo-auto-backup'
const STORE = 'kv'
const EVERY_MS = 20 * 3_600_000
const KEEP = 10
const PREFIX = 'Cereo-sauvegarde-'

export type AutoBackupState = 'unsupported' | 'off' | 'needs-permission' | 'on'

function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(STORE)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const req = run(open.result.transaction(STORE, mode).objectStore(STORE))
      req.onsuccess = () => resolve(req.result as T)
      req.onerror = () => reject(req.error)
    }
  })
}

const getHandle = () => idb<DirHandle | undefined>('readonly', (s) => s.get('dir')).catch(() => undefined)

export function isAutoBackupSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function autoBackupState(): Promise<{ state: AutoBackupState; folder?: string }> {
  if (!isAutoBackupSupported()) return { state: 'unsupported' }
  const handle = await getHandle()
  if (!handle) return { state: 'off' }
  const permission = await handle.queryPermission({ mode: 'readwrite' }).catch(() => 'denied' as PermissionState)
  return { state: permission === 'granted' ? 'on' : 'needs-permission', folder: handle.name }
}

/** Choix du dossier (à appeler depuis un clic), puis première sauvegarde immédiate. */
export async function chooseBackupFolder(): Promise<string> {
  const picker = (window as unknown as { showDirectoryPicker(o: { mode: 'readwrite'; id?: string }): Promise<DirHandle> }).showDirectoryPicker
  const handle = await picker({ mode: 'readwrite', id: 'cereo-sauvegardes' })
  await idb('readwrite', (s) => s.put(handle, 'dir'))
  await runAutoBackup(true)
  return handle.name
}

export async function stopAutoBackup() {
  await idb('readwrite', (s) => s.delete('dir'))
}

/** Redonne l'accès au dossier après un redémarrage du navigateur (à appeler depuis un clic). */
export async function resumeAutoBackup(): Promise<boolean> {
  const handle = await getHandle()
  if (!handle) return false
  const ok = (await handle.requestPermission({ mode: 'readwrite' })) === 'granted'
  if (ok) await runAutoBackup(true)
  return ok
}

let running = false

/** Écrit une sauvegarde si la dernière date de plus de 20 heures (ou si `force`). */
export async function runAutoBackup(force = false): Promise<boolean> {
  if (running) return false
  const handle = await getHandle()
  if (!handle || (await handle.queryPermission({ mode: 'readwrite' }).catch(() => 'denied')) !== 'granted') return false
  const last = Number((await idb<number | undefined>('readonly', (s) => s.get('last')).catch(() => 0)) ?? 0)
  if (!force && Date.now() - last < EVERY_MS) return false
  running = true
  try {
    const { blob } = await buildFullBackup()
    const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', 'h')
    const file = await handle.getFileHandle(`${PREFIX}${stamp}.zip`, { create: true })
    const out = await file.createWritable()
    await out.write(blob)
    await out.close()
    const now = Date.now()
    await idb('readwrite', (s) => s.put(now, 'last'))
    markBackupDone(now)
    // Garde les 10 plus récentes (le nom contient la date : l'ordre alphabétique suffit).
    const names: string[] = []
    for await (const name of handle.keys()) if (name.startsWith(PREFIX) && name.endsWith('.zip')) names.push(name)
    names.sort()
    for (const old of names.slice(0, Math.max(0, names.length - KEEP))) await handle.removeEntry(old).catch(() => {})
    return true
  } finally {
    running = false
  }
}

/**
 * Demande au navigateur de ne jamais effacer de lui-même les données de Céréo (sinon, un
 * disque presque plein ou un nettoyage automatique peut les supprimer).
 */
export async function protectStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
