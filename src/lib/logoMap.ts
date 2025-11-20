const MAP: Record<string, string> = {}

export function getLogoSrc(logoId: string | null | undefined) {
  if (!logoId) return null
  // if looks like a URL, return as-is
  if (typeof logoId === 'string' && (logoId.startsWith('http://') || logoId.startsWith('https://') || logoId.startsWith('/')))
    return logoId
  return MAP[logoId] ?? null
}

export default MAP
