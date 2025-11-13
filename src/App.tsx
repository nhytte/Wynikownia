import './App.css'
import logo from './img/logo.svg'
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
import { emailLocal } from './lib/displayName'
import { getAppBaseUrl } from './lib/url'
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=sports_soccer" />

function App() {
  const { isAuthenticated, isLoading, user, logout } = useAuth0()
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('Pilka nozna')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userFullName, setUserFullName] = useState<string | null>(null)

  useEffect(() => {
    const fetchRole = async () => {
      if (!isAuthenticated || !user) { setUserRole(null); return }
      try {
        const uid = (user as any).sub
        const { data } = await supabase.from('uzytkownicy').select('rola, imie, nazwisko, nazwa_wyswietlana, email').eq('user_id', uid).single()
        setUserRole(data?.rola ?? null)
        const full = ((data?.imie || '') + ' ' + (data?.nazwisko || '')).trim()
        setUserFullName(data?.nazwa_wyswietlana || (full.length ? full : null) || null)
      } catch (e) {
        setUserRole(null)
        setUserFullName(null)
      }
    }
    fetchRole()
  }, [isAuthenticated, user])

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-left">
          <Link to="/" className="brand"><img src={logo} alt="Wynikownia" style={{ height: 36 }} /> <span style={{ marginLeft:8, color: 'white', fontWeight:700 }}>Wynikownia</span></Link>
        </div>

        <div className="topbar-center">
          <input className="search" placeholder="Szukaj turniejów..." />
        </div>

        <div className="topbar-right">
          {isLoading ? (
            <span className="small-muted">Loading...</span>
          ) : isAuthenticated ? (
            <>
              <span className="user-name">{userFullName || (user as any)?.name || emailLocal((user as any)?.email)}</span>
              <button className="ghost" onClick={() => logout({ logoutParams: { returnTo: getAppBaseUrl() } })}>Wyloguj</button>
              <Link to="/teams"><button className="ghost">Drużyny</button></Link>
              <Link to="/profile"><button className="ghost">Profil</button></Link>
              {userRole === 'Administrator' ? <Link to="/admin"><button className="ghost">Admin</button></Link> : null}
            </>
          ) : (
            <Link to="/login"><button className="primary">Zaloguj się</button></Link>
          )}
        </div>

      </header>

      <div className="category-bar">
          <div className="category-inner">
            <button className={selectedDiscipline === 'Pilka nozna' ? 'category-btn category-selected' : 'category-btn'} onClick={() => setSelectedDiscipline('Pilka nozna')}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><img src="/src/img/soccer.svg" alt="piłka" style={{ width:18, height:18, borderRadius:4, objectFit:'cover' }} />Piłka nożna</span>
            </button>
            <button className={selectedDiscipline === 'Szachy' ? 'category-btn category-selected' : 'category-btn'} onClick={() => setSelectedDiscipline('Szachy')}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><img src="/src/img/chess.svg" alt="szachy" style={{ width:18, height:18, borderRadius:4, objectFit:'cover' }} />Szachy</span>
            </button>
          </div>
        </div>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<TournamentsPage discipline={selectedDiscipline} setDiscipline={setSelectedDiscipline} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/tournaments" element={<TournamentsPage discipline={selectedDiscipline} setDiscipline={setSelectedDiscipline} />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/create-team" element={<CreateTeamPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/create-tournament" element={<CreateTournament />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="brand-small">Wynikownia</div>
          <div className="legal">© 2025 Wynikownia. Wszelkie prawa zastrzeżone.</div>
        </div>
      </footer>
    </div>
  )
}

export default App
