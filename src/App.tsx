import './App.css'
import { useEffect, useState } from 'react'
import { Link, Routes, Route } from 'react-router-dom'
import LoginPage from './pages/Login'
import TournamentsPage from './pages/Tournaments'
import CreateTeamPage from './pages/CreateTeam'
import TeamsPage from './pages/Teams'
import TeamDetail from './pages/TeamDetail'
import ProfilePage from './pages/Profile'
import TournamentDetail from './pages/TournamentDetail'
import AdminPanel from './pages/AdminPanel'
import CreateTournament from './pages/CreateTournament'
import { useAuth0 } from '@auth0/auth0-react'
import supabase from './lib/supabaseClient'

function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth0()
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const fetchRole = async () => {
      if (!isAuthenticated || !user) { setUserRole(null); return }
      try {
        const uid = (user as any).sub
        const { data } = await supabase.from('uzytkownicy').select('rola').eq('user_id', uid).single()
        setUserRole(data?.rola ?? null)
      } catch (e) {
        setUserRole(null)
      }
    }
    fetchRole()
  }, [isAuthenticated, user])

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
  <Link to="/teams"><button> Drużyny </button></Link>
  <Link to="/profile"><button> Profil </button></Link>
  {userRole === 'Administrator' ? <Link to="/admin"><button style={{ marginLeft: 8 }}>Admin</button></Link> : null}
      </header>

      <Routes>
        <Route path="/" element={<TournamentsPage />} />
        <Route path="/login" element={<LoginPage />} />
  <Route path="/tournaments" element={<TournamentsPage />} />
  <Route path="/tournaments/:id" element={<TournamentDetail />} />
  <Route path="/create-team" element={<CreateTeamPage />} />
  <Route path="/teams" element={<TeamsPage />} />
  <Route path="/teams/:id" element={<TeamDetail />} />
  <Route path="/profile" element={<ProfilePage />} />
  <Route path="/admin" element={<AdminPanel />} />
  <Route path="/create-tournament" element={<CreateTournament />} />
      </Routes>
    </>
  )
}

export default App
