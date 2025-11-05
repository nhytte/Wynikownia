import React from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import supabase from '../lib/supabaseClient'

type Props = {
  children: React.ReactNode
}

// Wrap the app in this provider. Uses Vite environment variables:
// VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID
export default function AuthProvider({ children }: Props) {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID

  if (!domain || !clientId) {
    // Render children anyway but warn in console — ensures dev doesn't crash
    console.warn('Auth0 domain or client id not set. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID')
    return <>{children}</>
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        // Use universal login (redirect) and return to origin
        redirect_uri: window.location.origin,
        scope: 'openid profile email',
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <AuthSync />
      {children}
    </Auth0Provider>
  )
}

function AuthSync() {
  const { user, isAuthenticated, isLoading } = useAuth0()

  React.useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated || !user) return

    const userId = (user as any).sub
    const email = (user as any).email
  const name = (user as any).name || null
  const givenName = (user as any).given_name || (name ? String(name).split(' ')[0] : null)
  const familyName = (user as any).family_name || (name && String(name).includes(' ') ? String(name).split(' ').slice(1).join(' ') : null)
  const displayName = name || (user as any).nickname || null

    if (!userId) return

    ;(async () => {
      try {
        // Sync with `uzytkownicy` without overwriting user's manual edits.
        const { data: existing } = await supabase.from('uzytkownicy').select('*').eq('user_id', userId).maybeSingle()
        if (!existing) {
          const { error: insErr } = await supabase.from('uzytkownicy').insert({
            user_id: userId,
            email: email,
            nazwa_wyswietlana: displayName,
            imie: givenName,
            nazwisko: familyName,
          })
          if (insErr) console.error('Failed to insert user in Supabase:', insErr)
          else console.debug('Inserted user in Supabase:', userId)
        } else {
          const updates: any = {}
          if (email && email !== existing.email) updates.email = email
          // only fill empty fields from Auth0
          if ((!existing.imie || existing.imie.trim() === '') && givenName) updates.imie = givenName
          if ((!existing.nazwisko || existing.nazwisko.trim() === '') && familyName) updates.nazwisko = familyName
          if ((!existing.nazwa_wyswietlana || existing.nazwa_wyswietlana.trim() === '') && displayName) updates.nazwa_wyswietlana = displayName
          if (Object.keys(updates).length > 0) {
            const { error: updErr } = await supabase.from('uzytkownicy').update(updates).eq('user_id', userId)
            if (updErr) console.error('Failed to update user in Supabase:', updErr)
            else console.debug('Updated user in Supabase:', userId, Object.keys(updates))
          }
        }
      } catch (err) {
        console.error('Error syncing user to Supabase', err)
      }
    })()
  }, [isAuthenticated, isLoading, user])

  return null
}
