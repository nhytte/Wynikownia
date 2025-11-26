import './App.css'
import { soccer, chess, logo } from './lib/remoteImages'
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
import NotificationBox from './components/NotificationBox'
import { useAuth0 } from '@auth0/auth0-react'
import supabase from './lib/supabaseClient'
import { emailLocal } from './lib/displayName'
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=sports_soccer" />

function App() {
  const { isAuthenticated, isLoading, user } = useAuth0()
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('Pilka nozna')
  const [userFullName, setUserFullName] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!isAuthenticated || !user) { setUserFullName(null); return }
      try {
        const uid = (user as any).sub
        const { data } = await supabase.from('uzytkownicy').select('imie, nazwisko, nazwa_wyswietlana, email').eq('user_id', uid).single()
        const full = ((data?.imie || '') + ' ' + (data?.nazwisko || '')).trim()
        setUserFullName(data?.nazwa_wyswietlana || (full.length ? full : null) || null)
      } catch (e) {
        setUserFullName(null)
      }
    }
    fetchProfile()
  }, [isAuthenticated, user])

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="topbar-left">
          <Link to="/" className="brand"><img src={logo} alt="Wynikownia" style={{ height: 36 }} /> <span style={{ marginLeft:8, color: 'white', fontWeight:700 }}>Wynikownia</span></Link>
        </div>

        <div className="topbar-center">
          <input 
            className="search" 
            placeholder="Szukaj turniejów..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="topbar-right">
          <NotificationBox />
          
          <div className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
            <input 
              className="search mobile-search" 
              placeholder="Szukaj turniejów..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isLoading ? (
              <span className="small-muted">Loading...</span>
            ) : isAuthenticated ? (
              <>
                <Link to="/create-team" onClick={() => setIsMenuOpen(false)}><button className="ghost">Stwórz drużynę</button></Link>
                <Link to="/teams" onClick={() => setIsMenuOpen(false)}><button className="ghost">Znajdź drużynę</button></Link>
                <Link to="/profile" onClick={() => setIsMenuOpen(false)}><button className="ghost">{userFullName || (user as any)?.name || emailLocal((user as any)?.email)}</button></Link>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsMenuOpen(false)}><button className="primary">Zaloguj się</button></Link>
            )}
          </div>

          <button className="hamburger-btn" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menu">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>

      </header>

      <div className="category-bar">
          <div className="category-inner">
            <button className={selectedDiscipline === 'Pilka nozna' ? 'category-btn category-selected' : 'category-btn'} onClick={() => setSelectedDiscipline('Pilka nozna')}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><img src={soccer} alt="piłka" style={{ width:18, height:18, borderRadius:4, objectFit:'cover' }} />Piłka nożna</span>
            </button>
            <button className={selectedDiscipline === 'Szachy' ? 'category-btn category-selected' : 'category-btn'} onClick={() => setSelectedDiscipline('Szachy')}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><img src={chess} alt="szachy" style={{ width:18, height:18, borderRadius:4, objectFit:'cover' }} />Szachy</span>
            </button>
          </div>
        </div>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<TournamentsPage discipline={selectedDiscipline} setDiscipline={setSelectedDiscipline} searchQuery={searchQuery} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/tournaments" element={<TournamentsPage discipline={selectedDiscipline} setDiscipline={setSelectedDiscipline} searchQuery={searchQuery} />} />
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
