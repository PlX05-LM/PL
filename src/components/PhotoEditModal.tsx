import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../db'
import type { Photo, PhotoEdit } from '../types'
import {
  centeredCrop,
  cssFilter,
  DEFAULT_EDIT,
  drawOriented,
  flipCrop,
  isIdentity,
  loadBitmap,
  renderEdited,
  rotateCrop,
  rotatedSize,
} from '../lib/photoEditor'

interface Props {
  photo: Photo
  onClose: () => void
}

type Crop = PhotoEdit['crop']
type Handle = 'move' | 'nw' | 'ne' | 'sw' | 'se'

/** Formats proposés ; la valeur est largeur / hauteur (null = libre, 0 = celui de la photo). */
const RATIOS: { label: string; value: number | null }[] = [
  { label: 'Libre', value: null },
  { label: 'Écran 16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: 'Carré', value: 1 },
  { label: 'Portrait 2:3', value: 2 / 3 },
]

const PREVIEW_MAX_W = 860
const PREVIEW_MAX_H = 520
const MIN_SIZE = 0.05

const sliderClass = 'w-full accent-[var(--color-gold)]'

export default function PhotoEditModal({ photo, onClose }: Props) {
  const source = photo.originalBlob ?? photo.blob
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState<PhotoEdit>(photo.edit ?? DEFAULT_EDIT)
  const [ratio, setRatio] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ handle: Handle; startX: number; startY: number; crop: Crop } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadBitmap(source)
      .then((b) => !cancelled && setBitmap(b))
      .catch(() => !cancelled && setError('Cette photo ne peut pas être ouverte pour la retouche.'))
    return () => {
      cancelled = true
    }
  }, [source])

  useEffect(() => () => bitmap?.close(), [bitmap])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  // Aperçu : l'image tournée et retournée, à la taille de la fenêtre.
  const oriented = useMemo(() => {
    if (!bitmap) return null
    const full = rotatedSize(bitmap.width, bitmap.height, edit.rotation)
    const scale = Math.min(1, PREVIEW_MAX_W / full.width, PREVIEW_MAX_H / full.height)
    return { canvas: drawOriented(bitmap, edit, scale), full }
  }, [bitmap, edit.rotation, edit.flipH]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const host = canvasHostRef.current
    if (!host || !oriented) return
    oriented.canvas.className = 'block max-w-full'
    host.replaceChildren(oriented.canvas)
  }, [oriented])

  useEffect(() => {
    if (oriented) oriented.canvas.style.filter = cssFilter(edit)
  }, [oriented, edit])

  function patch(p: Partial<PhotoEdit>) {
    setEdit((e) => ({ ...e, ...p }))
  }

  function chooseRatio(value: number | null) {
    setRatio(value)
    if (value && oriented) patch({ crop: centeredCrop(value, oriented.full.width, oriented.full.height) })
  }

  /** Quart de tour dans le sens voulu à l'écran, en gardant la même zone de la photo. */
  function rotate(dir: 1 | -1) {
    setEdit((e) => {
      const turn = (e.flipH ? -dir : dir) * 90
      const rotation = ((((e.rotation + turn) % 360) + 360) % 360) as PhotoEdit['rotation']
      return { ...e, rotation, crop: rotateCrop(e.crop, dir) }
    })
    setRatio((r) => (r ? 1 / r : r))
  }

  function flip() {
    setEdit((e) => ({ ...e, flipH: !e.flipH, crop: flipCrop(e.crop) }))
  }

  // --- Cadre de recadrage : déplacer ou tirer un coin ---
  function startDrag(handle: Handle, e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, crop: edit.crop }
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    const box = frameRef.current?.getBoundingClientRect()
    if (!drag || !box || !oriented) return
    const dx = (e.clientX - drag.startX) / box.width
    const dy = (e.clientY - drag.startY) / box.height
    const c = drag.crop
    let next: Crop
    if (drag.handle === 'move') {
      next = { ...c, x: Math.min(1 - c.w, Math.max(0, c.x + dx)), y: Math.min(1 - c.h, Math.max(0, c.y + dy)) }
    } else {
      const left = drag.handle === 'nw' || drag.handle === 'sw'
      const top = drag.handle === 'nw' || drag.handle === 'ne'
      // Coin opposé fixe ; le coin tiré suit la souris, dans les limites de la photo.
      const fx = left ? c.x + c.w : c.x
      const fy = top ? c.y + c.h : c.y
      let px = Math.min(1, Math.max(0, (left ? c.x : c.x + c.w) + dx))
      let py = Math.min(1, Math.max(0, (top ? c.y : c.y + c.h) + dy))
      let w = Math.max(MIN_SIZE, Math.abs(px - fx))
      let h = Math.max(MIN_SIZE, Math.abs(py - fy))
      if (ratio) {
        // Format imposé : largeur et hauteur liées, en pixels réels de la photo.
        const k = ratio * (oriented.full.height / oriented.full.width)
        if (w / h > k) w = h * k
        else h = w / k
        const maxW = left ? fx : 1 - fx
        const maxH = top ? fy : 1 - fy
        if (w > maxW) {
          w = maxW
          h = w / k
        }
        if (h > maxH) {
          h = maxH
          w = h * k
        }
      }
      px = left ? fx - w : fx
      py = top ? fy - h : fy
      next = { x: px, y: py, w: Math.min(w, 1 - px), h: Math.min(h, 1 - py) }
    }
    patch({ crop: next })
  }

  function endDrag() {
    dragRef.current = null
  }

  async function handleSave() {
    if (!bitmap) return
    setSaving(true)
    try {
      if (isIdentity(edit)) {
        await restoreOriginal()
        return
      }
      const blob = await renderEdited(bitmap, edit)
      await db.photos.update(photo.id, {
        blob,
        mimeType: 'image/jpeg',
        originalBlob: source,
        originalMimeType: photo.originalMimeType ?? photo.mimeType,
        edit,
      })
      onClose()
    } catch {
      setError("La retouche n'a pas pu être enregistrée sur cet appareil.")
      setSaving(false)
    }
  }

  async function restoreOriginal() {
    if (photo.originalBlob) {
      await db.photos.update(photo.id, {
        blob: photo.originalBlob,
        mimeType: photo.originalMimeType ?? photo.mimeType,
        originalBlob: undefined,
        originalMimeType: undefined,
        edit: undefined,
      })
    }
    onClose()
  }

  const c = edit.crop
  const handleClass = 'absolute h-4 w-4 rounded-sm border-2 border-ink bg-gold touch-none'
  const button = (active: boolean) =>
    `min-h-9 rounded-md border px-3 text-xs transition-colors ${
      active ? 'border-gold bg-gold text-ink' : 'border-line text-muted hover:border-gold-dim hover:text-fg'
    }`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Retoucher la photo">
      <div className="flex max-h-full w-full max-w-5xl flex-col overflow-y-auto rounded-lg border border-line bg-panel p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="truncate font-display text-xl text-fg">Retoucher « {photo.name} »</h2>
          <button type="button" onClick={onClose} disabled={saving} className="text-sm text-muted hover:text-fg">
            Fermer
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}

        <div className="flex min-h-[200px] items-center justify-center rounded-md bg-black p-3">
          {!bitmap && !error && <p className="text-sm text-muted">Ouverture de la photo…</p>}
          {oriented && (
            <div ref={frameRef} className="relative overflow-hidden" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
              <div ref={canvasHostRef} />
              {/* Zones retirées assombries, cadre gardé à vif. */}
              <div
                className="absolute cursor-move touch-none border-2 border-gold"
                style={{
                  left: `${c.x * 100}%`,
                  top: `${c.y * 100}%`,
                  width: `${c.w * 100}%`,
                  height: `${c.h * 100}%`,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                }}
                onPointerDown={(e) => startDrag('move', e)}
              >
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="border border-white/15" />
                  ))}
                </div>
                <span aria-hidden="true" className={`${handleClass} left-0 top-0 cursor-nwse-resize`} onPointerDown={(e) => startDrag('nw', e)} />
                <span aria-hidden="true" className={`${handleClass} right-0 top-0 cursor-nesw-resize`} onPointerDown={(e) => startDrag('ne', e)} />
                <span aria-hidden="true" className={`${handleClass} bottom-0 left-0 cursor-nesw-resize`} onPointerDown={(e) => startDrag('sw', e)} />
                <span aria-hidden="true" className={`${handleClass} bottom-0 right-0 cursor-nwse-resize`} onPointerDown={(e) => startDrag('se', e)} />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Recadrage</p>
              <div className="flex flex-wrap gap-1.5">
                {RATIOS.map((r) => (
                  <button key={r.label} type="button" onClick={() => chooseRatio(r.value)} className={button(ratio === r.value)}>
                    {r.label}
                  </button>
                ))}
                <button type="button" onClick={() => {
                    setRatio(null)
                    patch({ crop: DEFAULT_EDIT.crop })
                  }} className={button(false)}>
                  Photo entière
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted">
                Déplacez le cadre ou tirez ses coins. « Écran 16:9 » remplit l'écran de projection sans bandes noires.
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Orientation</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => rotate(-1)} className={button(false)}>
                  ↺ Pivoter à gauche
                </button>
                <button type="button" onClick={() => rotate(1)} className={button(false)}>
                  ↻ Pivoter à droite
                </button>
                <button type="button" onClick={flip} className={button(edit.flipH)}>
                  ⇋ Miroir
                </button>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">Effet</p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['none', 'Aucun'],
                    ['bw', 'Noir et blanc'],
                    ['sepia', 'Sépia'],
                  ] as const
                ).map(([value, label]) => (
                  <button key={value} type="button" onClick={() => patch({ effect: value })} className={button(edit.effect === value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {(
              [
                ['brightness', 'Luminosité', 0.5, 1.5],
                ['contrast', 'Contraste', 0.5, 1.5],
                ['saturation', 'Couleurs', 0, 2],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key} className="block text-xs text-muted">
                <span className="mb-1 flex justify-between">
                  {label}
                  <span className="tabular-nums text-fg">
                    {edit[key] === 1 ? 'normal' : `${edit[key] > 1 ? '+' : ''}${Math.round((edit[key] - 1) * 100)} %`}
                  </span>
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={0.01}
                  value={edit[key]}
                  onChange={(e) => patch({ [key]: Number(e.target.value) })}
                  onDoubleClick={() => patch({ [key]: 1 })}
                  className={sliderClass}
                />
              </label>
            ))}
            <button
              type="button"
              onClick={() => patch({ brightness: 1, contrast: 1, saturation: 1, effect: 'none' })}
              className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
            >
              Réinitialiser les réglages
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <div>
            {photo.originalBlob && (
              <button type="button" onClick={restoreOriginal} disabled={saving} className="text-sm text-muted hover:text-fg">
                Restaurer l'original
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-line px-4 text-sm text-muted hover:text-fg">
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!bitmap || saving}
              className="min-h-10 rounded-md bg-gold px-5 text-sm font-medium text-ink hover:bg-gold-dim disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
        <p className="mt-2 text-right text-xs text-muted">L'original est toujours conservé : la retouche peut être reprise ou annulée.</p>
      </div>
    </div>
  )
}
