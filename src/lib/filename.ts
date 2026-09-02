/**
 * Makes a string safe to use as a downloaded filename: strips accents
 * (some browsers/venue sound gear mishandle non-ASCII in the `download`
 * attribute, and old FAT32 USB sticks used at ceremony venues can too)
 * and forbidden filesystem characters.
 */
export function toSafeFilename(name: string): string {
  const withoutAccents = name.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return withoutAccents.replace(/[\\/:*?"<>|]/g, '').trim()
}
