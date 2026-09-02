import type { Ceremony, Track } from '../types'

/** Musiques utilisées par la cérémonie, dans l'ordre du déroulé. */
export function collectCeremonyTracks(ceremony: Ceremony, tracks: Track[]): Track[] {
  const byId = new Map(tracks.map((t) => [t.id, t]))
  const orderedIds = [
    ...ceremony.segments.map((s) => s.trackId),
    ceremony.slideshow.trackId,
  ].filter((id): id is string => !!id)

  const seen = new Set<string>()
  const result: Track[] = []
  for (const id of orderedIds) {
    if (seen.has(id)) continue
    const track = byId.get(id)
    if (!track) continue
    seen.add(id)
    result.push(track)
  }
  return result
}
