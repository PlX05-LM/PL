import { db } from '../db'
import { isBuiltInTrackId } from './appSettings'

const FLAG_KEY = 'cerema-media-ownership-migrated-v1'

/**
 * Avant l'introduction du cloisonnement des photos/musiques importées par cérémonie,
 * toutes les photos et pistes personnalisées étaient partagées entre toutes les
 * cérémonies. Pour ne pas casser les cérémonies déjà préparées, on rattache ici
 * rétroactivement chaque photo/piste sans propriétaire à la première cérémonie qui la
 * référence encore. Les pistes de la bibliothèque libre de droit restent partagées.
 */
export async function migrateMediaOwnership(): Promise<void> {
  if (localStorage.getItem(FLAG_KEY)) return

  const ceremonies = await db.ceremonies.toArray()

  for (const ceremony of ceremonies) {
    const photoIds = ceremony.slideshow?.photoIds ?? []
    for (const photoId of photoIds) {
      const photo = await db.photos.get(photoId)
      if (photo && !photo.ceremonyId) {
        await db.photos.update(photoId, { ceremonyId: ceremony.id })
      }
    }

    const trackIds = [
      ceremony.slideshow?.trackId,
      ...ceremony.segments.map((s) => s.trackId),
    ].filter((t): t is string => Boolean(t))

    for (const trackId of trackIds) {
      if (isBuiltInTrackId(trackId)) continue
      const track = await db.tracks.get(trackId)
      if (track && !track.ceremonyId) {
        await db.tracks.update(trackId, { ceremonyId: ceremony.id })
      }
    }
  }

  localStorage.setItem(FLAG_KEY, '1')
}

const NATURE_CLEANUP_FLAG_KEY = 'cerema-nature-library-removed-v1'

/**
 * La bibliothèque de photos nature générées a été retirée de l'application. Sur les
 * postes où elle avait déjà été utilisée, on supprime ici les photos générées
 * (préfixe `builtin-nature-`) et on nettoie les références qui subsisteraient dans les
 * diaporamas des cérémonies existantes, pour éviter des vignettes cassées.
 */
export async function removeNaturePhotoLibrary(): Promise<void> {
  if (localStorage.getItem(NATURE_CLEANUP_FLAG_KEY)) return

  const isNaturePhotoId = (id: string) => id.startsWith('builtin-nature-')

  const ceremonies = await db.ceremonies.toArray()
  for (const ceremony of ceremonies) {
    const photoIds = ceremony.slideshow?.photoIds ?? []
    const filtered = photoIds.filter((pid) => !isNaturePhotoId(pid))
    const fixedPhotoId =
      ceremony.slideshow?.fixedPhotoId && isNaturePhotoId(ceremony.slideshow.fixedPhotoId)
        ? undefined
        : ceremony.slideshow?.fixedPhotoId
    if (filtered.length !== photoIds.length || fixedPhotoId !== ceremony.slideshow?.fixedPhotoId) {
      await db.ceremonies.update(ceremony.id, {
        slideshow: { ...ceremony.slideshow, photoIds: filtered, fixedPhotoId },
      })
    }
  }

  const naturePhotoIds = (await db.photos.toArray())
    .filter((p) => isNaturePhotoId(p.id))
    .map((p) => p.id)
  if (naturePhotoIds.length > 0) {
    await db.photos.bulkDelete(naturePhotoIds)
  }

  localStorage.setItem(NATURE_CLEANUP_FLAG_KEY, '1')
}
