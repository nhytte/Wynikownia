import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import supabase from '../lib/supabaseClient'
import { deriveProvince } from '../lib/province'
import { Link } from 'react-router-dom'
import { emailLocal } from '../lib/displayName'
import { getAppBaseUrl } from '../lib/url'

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth0()
  const [saving, setSaving] = useState(false)
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
      const { data: u } = await supabase.from('uzytkownicy').select('imie, nazwisko, nazwa_wyswietlana, email').eq('user_id', uid).maybeSingle()
      if (u) setProfile({ imie: u.imie ?? '', nazwisko: u.nazwisko ?? '', nazwa_wyswietlana: u.nazwa_wyswietlana ?? '' })

      const { data: owned } = await supabase.from('druzyny').select('*').eq('owner_id', uid)
      setOwnedTeams((owned as any[]) || [])

  // memberships
  const { data: mems } = await supabase.from('teammembers').select('*').eq('user_id', uid).eq('status', 'accepted')
      const teamIds = (mems as any[] || []).map((m) => m.druzyna_id)
      let memberTeams: any[] = []
      if (teamIds.length) {
        const { data: mts } = await supabase.from('druzyny').select('*').in('druzyna_id', teamIds)
        memberTeams = (mts as any[]) || []
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
    <div style={{ padding: 20, maxWidth: 960, margin: '0 auto' }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
        <div style={{ width: 72, height: 72, borderRadius: 12, background: '#071013', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          { (user as any)?.picture ? <img src={(user as any).picture} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: 48, height: 48, background: '#152026' }} /> }
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{profile?.nazwa_wyswietlana || ((profile?.imie || profile?.nazwisko) ? `${profile?.imie ?? ''} ${profile?.nazwisko ?? ''}`.trim() : '') || emailLocal((user as any)?.email)}</h2>
        </div>
        <div>
          <button onClick={() => logout({ logoutParams: { returnTo: getAppBaseUrl() } })} style={{ padding: '8px 12px' }}>Wyloguj</button>
        </div>
      </header>

      <section style={{ marginBottom: 18 }}>
        <h3>Twoje dane</h3>
        <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Imię</span>
            <input value={profile?.imie ?? ''} onChange={(e) => setProfile((p: any) => ({ ...(p || {}), imie: e.target.value }))} style={{ padding: 8 }} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Nazwisko</span>
            <input value={profile?.nazwisko ?? ''} onChange={(e) => setProfile((p: any) => ({ ...(p || {}), nazwisko: e.target.value }))} style={{ padding: 8 }} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>Nazwa wyświetlana</span>
            <input value={profile?.nazwa_wyswietlana ?? ''} onChange={(e) => setProfile((p: any) => ({ ...(p || {}), nazwa_wyswietlana: e.target.value }))} style={{ padding: 8 }} />
          </label>
          <div>
            <button disabled={saving} onClick={async () => {
              if (!user) return
              setSaving(true)
              try {
                const uid = (user as any).sub
                const payload: any = {
                  imie: profile?.imie ?? null,
                  nazwisko: profile?.nazwisko ?? null,
                  nazwa_wyswietlana: profile?.nazwa_wyswietlana ?? null,
                }
                const { error } = await supabase.from('uzytkownicy').update(payload).eq('user_id', uid)
                if (error) throw error
                alert('Zapisano')
              } catch (e) {
                console.error(e)
                alert('Nie udało się zapisać danych')
              } finally {
                setSaving(false)
              }
            }}>Zapisz</button>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 18 }}>
        <h3>Drużyny, do których należysz</h3>
        {combinedTeams.length === 0 ? <div>Brak drużyn</div> : (
          <div style={{ display: 'grid', gap: 8 }}>
            {combinedTeams.map((t: any) => (
              <div key={t.druzyna_id} style={{ padding: 12, borderRadius: 8, background: '#f7f7f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#213547' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, textAlign: 'left' }}>{t.nazwa_druzyny}{t.owner_id === (user as any).sub ? ' — Właściciel' : ''}</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 13, color: '#555' }}>{t.wojewodztwo || ''}{t.wojewodztwo ? ', ' : ''}{t.dyscyplina || ''}</div>
                  <div style={{ marginTop: 6, fontWeight: 700 }}>{t.liczba_czlonkow ?? '-'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3>Turnieje</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setTab('zapisane')} style={{ padding: '6px 10px', background: tab === 'zapisane' ? '#2563eb' : '#f3f4f6', color: tab === 'zapisane' ? '#fff' : '#111', border: 'none', borderRadius: 6 }}>Zapisane</button>
          <button onClick={() => setTab('rozegrane')} style={{ padding: '6px 10px', background: tab === 'rozegrane' ? '#2563eb' : '#f3f4f6', color: tab === 'rozegrane' ? '#fff' : '#111', border: 'none', borderRadius: 6 }}>Rozegrane</button>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {(tab === 'zapisane' ? zapisane : rozegrane).length === 0 ? <div>Brak turniejów</div> : (tab === 'zapisane' ? zapisane : rozegrane).map((z: any) => {
            const t = z.turnieje
            const start = t?.data_rozpoczecia ? new Date(t.data_rozpoczecia) : null
            const dateStr = start ? start.toLocaleDateString('pl-PL') : ''
            const prov = deriveProvince(`${t?.wojewodztwo ?? ''} ${t?.lokalizacja ?? ''}`)
            return (
              <div key={z.zapis_id || z.turniej_id} style={{ padding: 12, borderRadius: 8, background: '#f7f7f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#213547' }}>
                <div style={{ fontWeight: 700, textAlign: 'left' }}>{t?.nazwa}</div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: 13, color: '#555' }}>{prov ? `${prov}, ${dateStr}` : dateStr}</div>
                  <div style={{ marginTop: 8 }}>
                    <Link to={`/tournaments/${t?.turniej_id}`}><button style={{ padding: '6px 10px' }}>Szczegóły</button></Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
