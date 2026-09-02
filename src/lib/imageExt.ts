const extensionByMime: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/bmp': 'bmp',
}

export function extensionForImage(mimeType: string, originalName?: string): string {
  const fromOriginal = originalName?.match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromOriginal) return fromOriginal.toLowerCase()
  return extensionByMime[mimeType] ?? 'jpg'
}
