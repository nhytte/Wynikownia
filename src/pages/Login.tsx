import React, { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

export default function LoginPage() {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Submit handler: we redirect to Auth0 Universal Login and prefill the email
  // Note: For security, the password is NOT sent from the SPA to Auth0 here.
  // The Universal Login will prompt for the password. If you want an embedded
  // username/password flow (Resource Owner Password Grant), we can add it but
  // it requires tenant/client config and has security caveats.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await loginWithRedirect({ authorizationParams: { login_hint: email } })
  }

  const handleGoogle = async () => {
    await loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Authentication</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : isAuthenticated ? (
        <div>
          <p>Signed in as: {(user as any)?.name || (user as any)?.email}</p>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log out</button>
        </div>
      ) : (
        <div>
          <p>Sign in or register using Auth0 Universal Login.</p>

          <form onSubmit={handleSubmit} style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ padding: 8, width: 300 }}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="(will be asked on Universal Login)"
                style={{ padding: 8, width: 300 }}
              />
            </div>

            <div>
              <button type="submit">Continue to login</button>
              <button
                type="button"
                onClick={async () => await loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } })}
                style={{ marginLeft: 8 }}
              >
                Register
              </button>
            </div>
          </form>

          <div style={{ marginTop: 8 }}>
            <p>Or use social login:</p>
            <button onClick={handleGoogle}>Continue with Google</button>
          </div>
        </div>
      )}
    </div>
  )
}
