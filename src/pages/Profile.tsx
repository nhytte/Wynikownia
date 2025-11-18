import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import supabase from '../lib/supabaseClient'
import { deriveProvince } from '../lib/province'
import { emailLocal } from '../lib/displayName'
import { getAppBaseUrl } from '../lib/url'
import { TeamLogo } from '../components/TeamLogos'
import { getLogoSrc } from '../lib/logoMap'

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth0()
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [profile, setProfile] = useState<{ imie?: string; nazwisko?: string; nazwa_wyswietlana?: string } | null>(null)
  const [ownedTeams, setOwnedTeams] = useState<any[]>([])
  const [memberOf, setMemberOf] = useState<any[]>([])
  const [played, setPlayed] = useState<any[]>([])
  const [tab, setTab] = useState<'rozegrane' | 'zapisane'>('zapisane')

  const fetchData = async () => {
    if (!isAuthenticated || !user) return
    
    const uid = (user as any).sub
    try {
      // fetch profile data
      const { data: u } = await supabase.from('uzytkownicy').select('imie, nazwisko, nazwa_wyswietlana, email, rola').eq('user_id', uid).maybeSingle()
      if (u) {
        setProfile({ imie: u.imie ?? '', nazwisko: u.nazwisko ?? '', nazwa_wyswietlana: u.nazwa_wyswietlana ?? '' })
        setIsAdmin((u.rola || '') === 'Administrator')
      }

      const { data: owned } = await supabase.from('druzyny').select('*, teammembers(status)').eq('owner_id', uid)
      const ownedWithCount = (owned as any[] || []).map(t => ({
        ...t,
        liczba_czlonkow: t.teammembers 
          ? t.teammembers.filter((m: any) => m.status === 'accepted').length 
          : 0
      }))
      setOwnedTeams(ownedWithCount)

      // memberships
      const { data: mems } = await supabase.from('teammembers').select('*').eq('user_id', uid).eq('status', 'accepted')
      const teamIds = (mems as any[] || []).map((m) => m.druzyna_id)
      let memberTeams: any[] = []
      if (teamIds.length) {
        const { data: mts } = await supabase.from('druzyny').select('*, teammembers(status)').in('druzyna_id', teamIds)
        memberTeams = (mts as any[] || []).map(t => ({
          ...t,
          liczba_czlonkow: t.teammembers 
            ? t.teammembers.filter((m: any) => m.status === 'accepted').length 
            : 0
        }))
      }
      setMemberOf(memberTeams)

      // played tournaments
  const { data: z } = await supabase.from('zapisy').select('*, turnieje(*)').eq('user_id', uid)
      setPlayed((z as any[]) || [])

      // no incoming team requests here — those are handled on the tournament/team pages
    } catch (err) {
      console.error(err)
    } finally {
      // finished
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  // no team-request decision handler in profile (handled per-team or tournament)

  if (!isAuthenticated) return <div style={{ padding: 20 }}>Zaloguj się, aby zobaczyć profil</div>

  // combine owned + member teams (unique)
  const combinedTeams = (() => {
    const map: Record<number, any> = {}
    for (const t of [...ownedTeams, ...memberOf]) map[t.druzyna_id] = t
    return Object.values(map)
  })()

  const now = new Date()
  const rozegrane = (played || []).filter((z) => {
    const start = z.turnieje?.data_rozpoczecia ? new Date(z.turnieje.data_rozpoczecia) : null
    return start ? start < now : false
  })
  const zapisane = (played || []).filter((z) => {
    const start = z.turnieje?.data_rozpoczecia ? new Date(z.turnieje.data_rozpoczecia) : null
    return start ? start >= now : false
  })

  return (
    <div className="page-content profile-page">
      <h1 className="profile-title">Profil użytkownika</h1>

      <div className="profile-card">
        <div className="profile-inner">
          <div className="avatar-circle">
            { (user as any)?.picture ? <img src={(user as any).picture} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : <span>{(profile?.nazwa_wyswietlana || '').charAt(0).toUpperCase()}</span> }
          </div>
          <div className="display-name">{profile?.nazwa_wyswietlana || ((profile?.imie || profile?.nazwisko) ? `${profile?.imie ?? ''} ${profile?.nazwisko ?? ''}`.trim() : '') || emailLocal((user as any)?.email)}</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
            <button className="logout-btn" onClick={() => logout({ logoutParams: { returnTo: getAppBaseUrl() } })}>Wyloguj</button>
            {isAdmin && (
              <Link to="/admin"><button className="ghost" style={{ background: '#000', color: '#fff' }}>Panel Admina</button></Link>
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Drużyny, do których należysz</h3>
        {combinedTeams.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)' }}>Brak drużyn</div> : (
          <div className="teams-list">
            {combinedTeams.map((t: any) => (
              <Link key={t.druzyna_id} to={`/teams/${t.druzyna_id}`} className="team-row" style={{ textDecoration: 'none' }}>
                <div className="team-left">
                  <div className="team-icon" style={{ background: t.logo_color || 'transparent', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <TeamLogo 
                      type={t.logo} 
                      color={t.logo_fill_color || '#000000'} 
                      style={{ width: 32, height: 32 }} 
                      fallbackSrc={getLogoSrc(t.logo || '') || undefined}
                    />
                  </div>
                  <div>
                    <div className="team-name">{t.nazwa_druzyny}{t.owner_id === (user as any).sub ? ' — Właściciel' : ''}</div>
                    <div className="team-prov">{t.wojewodztwo || ''}{t.wojewodztwo ? ', ' : ''}{t.dyscyplina || ''}</div>
                  </div>
                </div>
                <div className="team-right">
                  <div className="team-count">{(t.liczba_czlonkow ?? 0) + (t.dyscyplina === 'Pilka nozna' ? '/16' : '')}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Turnieje</h3>
        <div className="tabs">
          <button className={tab === 'zapisane' ? 'tab-pill active' : 'tab-pill'} onClick={() => setTab('zapisane')}>Zapisane</button>
          <button className={tab === 'rozegrane' ? 'tab-pill active' : 'tab-pill'} onClick={() => setTab('rozegrane')}>Rozegrane</button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {(tab === 'zapisane' ? zapisane : rozegrane).length === 0 ? <div style={{ textAlign: 'center', color: 'var(--muted)' }}>Brak turniejów</div> : (tab === 'zapisane' ? zapisane : rozegrane).map((z: any) => {
            const t = z.turnieje
            const start = t?.data_rozpoczecia ? new Date(t.data_rozpoczecia) : null
            const dateStr = start ? start.toLocaleDateString('pl-PL') : ''
            const prov = deriveProvince(`${t?.wojewodztwo ?? ''} ${t?.lokalizacja ?? ''}`)
            return (
              <Link key={z.zapis_id || z.turniej_id} to={`/tournaments/${t?.turniej_id || z.turniej_id}`} className="tournament-row" style={{ textDecoration: 'none' }}>
                <div className="tournament-left">{t?.nazwa}</div>
                <div className="tournament-mid">{prov || ''}</div>
                <div className="date-pill">{dateStr}</div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
