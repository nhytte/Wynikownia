import React, { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

export default function LoginPage() {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0()
  const [email, setEmail] = useState('')

  // Submit handler: we redirect to Auth0 Universal Login and prefill the email
  // The Universal Login will prompt for the password if needed. We keep the
  // SPA free of embedded password handling for better security.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await loginWithRedirect({ authorizationParams: { login_hint: email } })
  }

  const handleGoogle = async () => {
    await loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })
  }

  const handleForgotPassword = async () => {
    // Redirect to Auth0 Universal Login password reset screen
    await loginWithRedirect({ authorizationParams: { screen_hint: 'reset_password', login_hint: email } })
  }
  return (
    <div style={{ padding: 24 }}>
      <h2>Witaj — zaloguj się</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : isAuthenticated ? (
        <div>
          <p>Signed in as: {(user as any)?.name || (user as any)?.email}</p>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log out</button>
        </div>
      ) : (
        <div>
          <p>Zaloguj się przy użyciu swojego adresu e-mail lub konta Google.</p>

          <form onSubmit={handleSubmit} style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Adres e-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: 8, width: 300 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button type="submit">Zaloguj</button>
              <button type="button" onClick={handleForgotPassword} style={{ marginLeft: 8 }}>Zapomniałem hasła</button>
            </div>
          </form>

          <div style={{ marginTop: 8 }}>
            <p>Lub zaloguj się społecznościowo:</p>
            <button onClick={handleGoogle}>Zaloguj z Google</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <span>Nie posiadasz konta? </span>
            <a href="#" onClick={async (e) => { e.preventDefault(); await loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } }) }}>Zarejestruj się</a>
          </div>
        </div>
      )}
    </div>
  )
}
