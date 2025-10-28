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
    const displayName = (user as any).name || (user as any).nickname || null

    if (!userId) return

    ;(async () => {
      try {
        // Upsert user into `Uzytkownicy`. Do not overwrite `rola` if present.
        const { error } = await supabase.from('uzytkownicy').upsert(
          {
            user_id: userId,
            email: email,
            nazwa_wyswietlana: displayName,
          },
          { onConflict: 'user_id' },
        )
        if (error) console.error('Failed to upsert user in Supabase:', error)
        else console.debug('Upserted user in Supabase:', userId)
      } catch (err) {
        console.error('Error syncing user to Supabase', err)
      }
    })()
  }, [isAuthenticated, isLoading, user])

  return null
}
