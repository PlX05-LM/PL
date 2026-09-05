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
