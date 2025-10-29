import { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useAuth0 } from '@auth0/auth0-react'
import { getLogoSrc } from '../lib/logoMap'

type Team = {
  druzyna_id: number
  nazwa_druzyny: string
  logo?: string | null
  dyscyplina?: string | null
  owner_id?: string | null
}

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth0()
  const [role, setRole] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'teams' | 'users' | 'tournaments'>('teams')

  // teams
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)

  // users
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // tournaments
  const [tournaments, setTournaments] = useState<any[]>([])
  const [loadingTournaments, setLoadingTournaments] = useState(false)
  // proposals
  const [proposals, setProposals] = useState<any[]>([])
  const [loadingProposals, setLoadingProposals] = useState(false)

  useEffect(() => {
    const fetchRole = async () => {
      if (!isAuthenticated || !user) return
      try {
        const uid = (user as any).sub
        const { data } = await supabase.from('uzytkownicy').select('rola').eq('user_id', uid).single()
        setRole(data?.rola || null)
      } catch (e) {
        setRole(null)
      }
    }
    fetchRole()
  }, [isAuthenticated, user])

  useEffect(() => {
    if (activeTab === 'teams') loadTeams()
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'tournaments') {
      loadProposals()
      loadTournaments()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const loadTeams = async () => {
    setLoadingTeams(true)
    try {
      const { data } = await supabase.from('druzyny').select('*').order('created_at', { ascending: false })
      setTeams((data as Team[]) || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTeams(false)
    }
  }

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const { data } = await supabase.from('uzytkownicy').select('user_id, nazwa_wyswietlana, email, rola, created_at').order('created_at', { ascending: false })
      setUsers((data as any[]) || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadTournaments = async () => {
    setLoadingTournaments(true)
    try {
      const { data } = await supabase.from('turnieje').select('*').order('data_rozpoczecia', { ascending: false })
      setTournaments((data as any[]) || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTournaments(false)
    }
  }

  const loadProposals = async () => {
    setLoadingProposals(true)
    try {
      const { data } = await supabase.from('propozycjeturniejow').select('*').order('created_at', { ascending: false })
      setProposals((data as any[]) || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingProposals(false)
    }
  }

  const deleteTeam = async (teamId: number) => {
    if (!confirm('Na pewno usunąć tę drużynę i wszystkie powiązane zgłoszenia?')) return
    try {
      await supabase.from('teammembers').delete().eq('druzyna_id', teamId)
    } catch (e) {
      console.warn('Could not delete teammembers', e)
    }
    try {
      await supabase.from('druzyny').delete().eq('druzyna_id', teamId)
      await loadTeams()
      alert('Drużyna usunięta')
    } catch (e) {
      console.error(e)
      alert('Usuwanie drużyny nie powiodło się')
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Usunięcie użytkownika spowoduje usunięcie zgłoszeń i członkostw. Kontynuować?')) return
    try {
      // delete teammembers for this user
      await supabase.from('teammembers').delete().eq('user_id', userId)

      // delete zapisy for this user
      await supabase.from('zapisy').delete().eq('user_id', userId)

      // set turnieje.organizator_id to null where this user was organizer
      await supabase.from('turnieje').update({ organizator_id: null }).eq('organizator_id', userId)

      // delete teams owned by this user (and their teammembers)
      const { data: owned } = await supabase.from('druzyny').select('druzyna_id').eq('owner_id', userId)
      if (owned && (owned as any[]).length) {
        for (const t of owned as any[]) {
          await supabase.from('teammembers').delete().eq('druzyna_id', t.druzyna_id)
          await supabase.from('druzyny').delete().eq('druzyna_id', t.druzyna_id)
        }
      }

      // finally delete the user row
      const { error } = await supabase.from('uzytkownicy').delete().eq('user_id', userId)
      if (error) throw error
      alert('Użytkownik usunięty')
      await loadUsers()
    } catch (e) {
      console.error(e)
      alert('Nie udało się usunąć użytkownika')
    }
  }

  const deleteTournament = async (turniejId: number) => {
    if (!confirm('Na pewno usunąć ten turniej oraz wszystkie mecze i zapisy?')) return
    try {
      await supabase.from('mecze').delete().eq('turniej_id', turniejId)
    } catch (e) {
      console.warn('Could not delete matches', e)
    }
    try {
      await supabase.from('zapisy').delete().eq('turniej_id', turniejId)
    } catch (e) {
      console.warn('Could not delete zapisy', e)
    }
    try {
      await supabase.from('turnieje').delete().eq('turniej_id', turniejId)
      alert('Turniej usunięty')
      await loadTournaments()
    } catch (e) {
      console.error(e)
      alert('Usuwanie turnieju nie powiodło się')
    }
  }

  const approveProposal = async (propoId: number) => {
    if (!confirm('Zatwierdzić tę propozycję turnieju i utworzyć turniej?')) return
    try {
      // fetch proposal
      const { data: p, error: pErr } = await supabase.from('propozycjeturniejow').select('*').eq('propozycja_id', propoId).single()
      if (pErr || !p) throw pErr || new Error('Proposal not found')

      // insert into turnieje
      const insertPayload: any = {
        nazwa: p.sugerowana_nazwa,
        dyscyplina: p.sugerowana_dyscyplina,
        typ_zapisu: 'Drużynowy', // default; proposals don't carry typ_zapisu currently
        lokalizacja: p.sugerowana_lokalizacja,
        data_rozpoczecia: p.sugerowana_data_rozpoczecia,
        organizator_id: p.sugerowany_przez_user_id
      }
      const { error: insErr } = await supabase.from('turnieje').insert(insertPayload)
      if (insErr) throw insErr

      // mark proposal as approved
      await supabase.from('propozycjeturniejow').update({ status: 'Zatwierdzona' }).eq('propozycja_id', propoId)
      alert('Propozycja zatwierdzona i turniej utworzony')
      await loadProposals()
      await loadTournaments()
    } catch (e) {
      console.error(e)
      alert('Nie udało się zatwierdzić propozycji')
    }
  }

  const rejectProposal = async (propoId: number) => {
    if (!confirm('Odrzucić tę propozycję?')) return
    try {
      const { error } = await supabase.from('propozycjeturniejow').update({ status: 'Odrzucona' }).eq('propozycja_id', propoId)
      if (error) throw error
      alert('Propozycja odrzucona')
      await loadProposals()
    } catch (e) {
      console.error(e)
      alert('Nie udało się odrzucić propozycji')
    }
  }

  if (!isAuthenticated) return <div style={{ padding: 20 }}>Musisz być zalogowany aby zobaczyć panel administratora.</div>
  if (role === null) return <div style={{ padding: 20 }}>Ładowanie uprawnień…</div>
  if (role !== 'Administrator') return <div style={{ padding: 20 }}>Brak dostępu. Panel administracyjny dostępny tylko dla Administratorów.</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>Panel administratora</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setActiveTab('teams')} style={{ fontWeight: activeTab === 'teams' ? 700 : 400 }}>Drużyny</button>
        <button onClick={() => setActiveTab('users')} style={{ fontWeight: activeTab === 'users' ? 700 : 400 }}>Użytkownicy</button>
        <button onClick={() => setActiveTab('tournaments')} style={{ fontWeight: activeTab === 'tournaments' ? 700 : 400 }}>Turnieje</button>
      </div>

      {activeTab === 'teams' && (
        <div>
          <h3>Drużyny</h3>
          {loadingTeams ? <p>Ładowanie…</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Nazwa</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Dyscyplina</th>
                  <th style={{ padding: 8 }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.druzyna_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                      {t.logo ? <img src={getLogoSrc(t.logo) ?? undefined} alt="logo" style={{ width: 36 }} /> : null}
                      {t.nazwa_druzyny}
                    </td>
                    <td style={{ padding: 8 }}>{t.dyscyplina}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => deleteTeam(t.druzyna_id)} style={{ background: '#c62828', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 4 }}>Usuń</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <h3>Użytkownicy</h3>
          {loadingUsers ? <p>Ładowanie…</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Nazwa</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>Rola</th>
                  <th style={{ padding: 8 }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{u.nazwa_wyswietlana || u.user_id}</td>
                    <td style={{ padding: 8 }}>{u.email}</td>
                    <td style={{ padding: 8 }}>{u.rola}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => deleteUser(u.user_id)} style={{ background: '#c62828', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 4 }}>Usuń</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'tournaments' && (
        <div>
          <h3>Turnieje</h3>
              {loadingProposals ? <p>Ładowanie propozycji…</p> : proposals && proposals.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <h4>Propozycje turniejów</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: 8 }}>Nazwa</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Dyscyplina</th>
                        <th style={{ padding: 8 }}>Status</th>
                        <th style={{ padding: 8 }}>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposals.map((p) => (
                        <tr key={p.propozycja_id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: 8 }}>{p.sugerowana_nazwa}</td>
                          <td style={{ padding: 8 }}>{p.sugerowana_dyscyplina}</td>
                          <td style={{ padding: 8 }}>{p.status}</td>
                          <td style={{ padding: 8 }}>
                            <button onClick={() => approveProposal(p.propozycja_id)} style={{ marginRight: 8 }}>Akceptuj</button>
                            <button onClick={() => rejectProposal(p.propozycja_id)}>Odrzuć</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {loadingTournaments ? <p>Ładowanie…</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Nazwa</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Dyscyplina</th>
                  <th style={{ padding: 8 }}>Data rozpoczęcia</th>
                  <th style={{ padding: 8 }}>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map(t => (
                  <tr key={t.turniej_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{t.nazwa}</td>
                    <td style={{ padding: 8 }}>{t.dyscyplina}</td>
                    <td style={{ padding: 8 }}>{t.data_rozpoczecia ? new Date(t.data_rozpoczecia).toLocaleString() : ''}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => deleteTournament(t.turniej_id)} style={{ background: '#c62828', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 4 }}>Usuń</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
