import logo1 from '../assets/logos/logo1.svg'
import logo2 from '../assets/logos/logo2.svg'
import logo3 from '../assets/logos/logo3.svg'

const MAP: Record<string, string> = {
  logo1,
  logo2,
  logo3,
}

export function getLogoSrc(logoId: string | null | undefined) {
  if (!logoId) return null
  // if looks like a URL, return as-is
  if (typeof logoId === 'string' && (logoId.startsWith('http://') || logoId.startsWith('https://') || logoId.startsWith('/')))
    return logoId
  return MAP[logoId] ?? null
}

export default MAP
