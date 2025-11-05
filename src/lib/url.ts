export const getBasePath = (): string => {
  // Vite exposes BASE_URL, which equals '/' in dev and '/repo/' on GitHub Pages
  const base = (import.meta as any).env.BASE_URL as string | undefined
  if (!base) return '/'
  return base.startsWith('/') ? base : `/${base}`
}

export const getAppBaseUrl = (): string => {
  const origin = window.location.origin
  const basePath = getBasePath()
  // Ensure trailing slash is preserved for GH Pages project site
  return origin + basePath
}
