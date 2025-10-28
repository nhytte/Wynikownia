import './App.css'
import { Link, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/Login'
import TournamentsPage from './pages/Tournaments'
import { useAuth0 } from '@auth0/auth0-react'

function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth0()

  return (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/" style={{ fontWeight: 600, fontSize: 18, textDecoration: 'none' }}>Wynikownia</Link>
        </div>
        <div>
          {isLoading ? (
            <span>Loading...</span>
          ) : isAuthenticated ? (
            <>
              <span style={{ marginRight: 8 }}>{(user as any)?.name || (user as any)?.email}</span>
              <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>Log out</button>
            </>
          ) : (
            <Link to="/login"><button>Log in / Register</button></Link>
          )}
        </div>
        <Link to="/tournaments"><button> Tournaments </button></Link>
      </header>

      <Routes>
        <Route path="/" element={<TournamentsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
      </Routes>
    </>
  )
}

export default App
