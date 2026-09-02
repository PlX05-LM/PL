const extensionByMime: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
}

export function extensionForTrack(mimeType: string, originalName?: string): string {
  const fromOriginal = originalName?.match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromOriginal) return fromOriginal.toLowerCase()
  return extensionByMime[mimeType] ?? 'mp3'
}
