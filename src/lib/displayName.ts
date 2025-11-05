export const emailLocal = (e?: string | null): string => {
  if (!e) return ''
  const at = e.indexOf('@')
  return at > 0 ? e.slice(0, at) : e
}

export type BasicUser = {
  nazwa_wyswietlana?: string | null
  email?: string | null
  user_id?: string | null
}

export const displayNameForUser = (u?: BasicUser | null, fallbackId?: string | number): string => {
  return (
    (u?.nazwa_wyswietlana && String(u.nazwa_wyswietlana)) ||
    emailLocal(u?.email) ||
    (u?.user_id ? String(u.user_id) : (fallbackId != null ? String(fallbackId) : ''))
  )
}
