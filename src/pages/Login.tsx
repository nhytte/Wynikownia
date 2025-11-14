import React, { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'


export default function LoginPage() {
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)

  // We still use Auth0 Universal Login for authentication; the password field
  // is kept for the visual parity with the screenshot but is not sent directly.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await loginWithRedirect({ authorizationParams: { login_hint: email } })
  }

  const handleGoogle = async () => {
    await loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })
  }

  const handleForgotPassword = async () => {
    await loginWithRedirect({ authorizationParams: { screen_hint: 'reset_password', login_hint: email } })
  }

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>

  if (isAuthenticated) {
    return (
      <div style={{ padding: 24 }}>
        <p>Signed in as: {(user as any)?.name || (user as any)?.email}</p>
        <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log out</button>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card" role="main" aria-labelledby="login-title">
        <div className="brand-icon"><img src="src/img/logo.svg" alt="Wynikownia" style={{ width: 48, height: 48 }} /></div>
        <h2 id="login-title">Witaj ponownie</h2>
        <p className="sub">Zaloguj się do swojego konta</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <input className="login-input" type="email" placeholder="Adres E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="login-input" type="password" placeholder="Hasło" value={password} onChange={(e) => setPassword(e.target.value)} />

          <div className="login-checkbox-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Zapamiętaj mnie</span>
            </label>
            <button type="button" className="login-ghost" onClick={handleForgotPassword}>Zapomniałeś hasło?</button>
          </div>

          <button className="login-primary" type="submit">Zaloguj się</button>
        </form>

        <div style={{ marginTop: 8 }}>
          <div style={{ marginBottom: 8, color: '#6b7280' }}>kontynuuj z</div>
          <button className="login-google" onClick={handleGoogle} aria-label="Zaloguj się z Google">
            <span>Zaloguj się z Google</span>
          </button>
        </div>

        <div className="login-footer">
          Nie posiadasz konta? <a href="#" onClick={async (e) => { e.preventDefault(); await loginWithRedirect({ authorizationParams: { screen_hint: 'signup' } }) }}>Zarejestruj się</a>
        </div>
      </div>
    </div>
  )
}
