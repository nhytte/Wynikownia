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
  // proposal review modal
  const [reviewing, setReviewing] = useState<any | null>(null)
  // tournament view modal
  const [viewingTournament, setViewingTournament] = useState<any | null>(null)
  // team view modal
  const [viewingTeam, setViewingTeam] = useState<any | null>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  // cache for user display names
  const [userNames, setUserNames] = useState<Record<string, string>>({})
  // filters for tournaments
  const [filterDiscipline, setFilterDiscipline] = useState<'All' | 'Pilka nozna' | 'Szachy'>('All')
  const [filterStatus, setFilterStatus] = useState<'All' | 'aktualne' | 'w_trakcie' | 'archiwalne'>('All')

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
      const rows = (data as any[]) || []
      setTournaments(rows)
      const ids = Array.from(new Set(rows.map((r: any) => r.organizator_id).filter(Boolean))) as string[]
      if (ids.length) await ensureUserNames(ids)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingTournaments(false)
    }
  }

  const loadProposals = async () => {
    setLoadingProposals(true)
    try {
      const { data } = await supabase
        .from('propozycjeturniejow')
        .select('*')
        .eq('status', 'Nowa')
        .order('created_at', { ascending: false })
      const rows = (data as any[]) || []
      setProposals(rows)
      const ids = Array.from(new Set(rows.map((r: any) => r.sugerowany_przez_user_id).filter(Boolean))) as string[]
      if (ids.length) await ensureUserNames(ids)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingProposals(false)
    }
  }

  const ensureUserNames = async (ids: string[]) => {
    const missing = ids.filter((id) => !(id in userNames))
    if (missing.length === 0) return
    try {
      const { data, error } = await supabase
        .from('uzytkownicy')
        .select('user_id, nazwa_wyswietlana, email')
        .in('user_id', missing)
      if (error) throw error
      const map: Record<string, string> = {}
      ;(data as any[] || []).forEach((u) => {
        map[u.user_id] = u.nazwa_wyswietlana || u.email || u.user_id
      })
      setUserNames((prev) => ({ ...prev, ...map }))
    } catch (e) {
      console.warn('Could not resolve user names', e)
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

  const openTeamDetails = async (team: any) => {
    setViewingTeam(team)
    setLoadingMembers(true)
    try {
      const { data, error } = await supabase
        .from('teammembers')
        .select('user_id, status, role, requested_at, responded_at')
        .eq('druzyna_id', team.druzyna_id)
      if (error) throw error
      const rows = (data as any[]) || []
      setTeamMembers(rows)
      const ids = Array.from(new Set(rows.map((r) => r.user_id))) as string[]
      if (ids.length) await ensureUserNames(ids)
    } catch (e) {
      console.error('Failed to load team members', e)
      setTeamMembers([])
    } finally {
      setLoadingMembers(false)
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
        // respect the suggested type, but force individual for chess if not provided
        typ_zapisu: p.sugerowany_typ_zapisu || (p.sugerowana_dyscyplina === 'Szachy' ? 'Indywidualny' : 'Drużynowy'),
        lokalizacja: p.sugerowana_lokalizacja,
        wojewodztwo: p.sugerowana_wojewodztwo || null,
        szczegolowa_lokalizacja: p.sugerowana_szczegolowa_lokalizacja,
        dokladne_miejsce: p.sugerowane_dokladne_miejsce,
        data_rozpoczecia: p.sugerowana_data_rozpoczecia,
        czas_rozpoczecia: p.sugerowany_czas_rozpoczecia,
        czas_zakonczenia: p.sugerowany_czas_zakonczenia,
        data_zamkniecia_zapisow: p.sugerowana_data_zamkniecia_zapisow,
        opis_turnieju: p.dodatkowy_opis,
        format_rozgrywek: p.sugerowany_format_rozgrywek,
        dlugosc_meczy: p.sugerowana_dlugosc_meczy,
        max_uczestnikow: p.sugerowany_max_uczestnikow,
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
                      <button onClick={() => openTeamDetails(t)} style={{ marginRight: 8 }}>Przejrzyj</button>
                      <button onClick={() => deleteTeam(t.druzyna_id)} style={{ background: '#c62828', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 4 }}>Usuń</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {viewingTeam && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', color: '#111', width: 'min(900px, 96vw)', maxHeight: '90vh', overflow: 'auto', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Szczegóły drużyny</h3>
              <button onClick={() => setViewingTeam(null)} style={{ padding: '6px 10px' }}>Zamknij</button>
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>Nazwa</div>
                <div>{viewingTeam.nazwa_druzyny || '-'}</div>

                <div style={{ fontWeight: 600 }}>Dyscyplina</div>
                <div>{viewingTeam.dyscyplina || '-'}</div>

                <div style={{ fontWeight: 600 }}>Województwo</div>
                <div>{viewingTeam.wojewodztwo || '-'}</div>

                <div style={{ fontWeight: 600 }}>Właściciel</div>
                <div>{(userNames[viewingTeam.owner_id] || '-') + (viewingTeam.owner_id ? ` (${viewingTeam.owner_id})` : '')}</div>

                <div style={{ fontWeight: 600 }}>Utworzono</div>
                <div>{viewingTeam.created_at ? new Date(viewingTeam.created_at).toLocaleString('pl-PL') : '-'}</div>

                <div style={{ fontWeight: 600 }}>Opis</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{viewingTeam.opis || '-'}</div>
              </div>

              <div style={{ marginTop: 8 }}>
                <h4 style={{ margin: '8px 0' }}>Członkowie</h4>
                {loadingMembers ? (
                  <div>Ładowanie członków…</div>
                ) : teamMembers.length === 0 ? (
                  <div>Brak członków</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: 8 }}>Użytkownik</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Rola</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((m) => (
                        <tr key={m.user_id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: 8 }}>{(userNames[m.user_id] || m.user_id) + ` (${m.user_id})`}</td>
                          <td style={{ padding: 8 }}>{m.role || '-'}</td>
                          <td style={{ padding: 8 }}>{m.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {viewingTournament && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', color: '#111', width: 'min(900px, 96vw)', maxHeight: '90vh', overflow: 'auto', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Szczegóły turnieju</h3>
              <button onClick={() => setViewingTournament(null)} style={{ padding: '6px 10px' }}>Zamknij</button>
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>Nazwa</div>
                <div>{viewingTournament.nazwa || '-'}</div>

                <div style={{ fontWeight: 600 }}>Dyscyplina</div>
                <div>{viewingTournament.dyscyplina || '-'}</div>

                <div style={{ fontWeight: 600 }}>Typ zapisu</div>
                <div>{viewingTournament.typ_zapisu || '-'}</div>

                <div style={{ fontWeight: 600 }}>Województwo</div>
                <div>{viewingTournament.wojewodztwo || '-'}</div>

                <div style={{ fontWeight: 600 }}>Lokalizacja (miejscowość)</div>
                <div>{viewingTournament.lokalizacja || '-'}</div>

                <div style={{ fontWeight: 600 }}>Szczegółowa lokalizacja</div>
                <div>{viewingTournament.szczegolowa_lokalizacja || '-'}</div>

                <div style={{ fontWeight: 600 }}>Dokładne miejsce</div>
                <div>{viewingTournament.dokladne_miejsce || '-'}</div>

                <div style={{ fontWeight: 600 }}>Data rozpoczęcia</div>
                <div>{viewingTournament.data_rozpoczecia ? new Date(viewingTournament.data_rozpoczecia).toLocaleDateString('pl-PL') : '-'}</div>

                <div style={{ fontWeight: 600 }}>Godzina rozpoczęcia</div>
                <div>{viewingTournament.czas_rozpoczecia || '-'}</div>

                <div style={{ fontWeight: 600 }}>Godzina zakończenia</div>
                <div>{viewingTournament.czas_zakonczenia || '-'}</div>

                <div style={{ fontWeight: 600 }}>Data zamknięcia zapisów</div>
                <div>{viewingTournament.data_zamkniecia_zapisow ? new Date(viewingTournament.data_zamkniecia_zapisow).toLocaleString('pl-PL') : '-'}</div>

                <div style={{ fontWeight: 600 }}>Format rozgrywek</div>
                <div>{viewingTournament.format_rozgrywek || '-'}</div>

                <div style={{ fontWeight: 600 }}>Długość meczy</div>
                <div>{viewingTournament.dlugosc_meczy || '-'}</div>

                <div style={{ fontWeight: 600 }}>Maksymalna liczba</div>
                <div>{viewingTournament.max_uczestnikow ?? '-'}</div>

                <div style={{ fontWeight: 600 }}>Organizator</div>
                <div>{(userNames[viewingTournament.organizator_id] || '-') + (viewingTournament.organizator_id ? ` (${viewingTournament.organizator_id})` : '')}</div>

                <div style={{ fontWeight: 600 }}>Opis</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{viewingTournament.opis_turnieju || '-'}</div>
              </div>
            </div>
          </div>
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
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0 16px' }}>
            <label>
              Dyscyplina:
              <select value={filterDiscipline} onChange={(e) => setFilterDiscipline(e.target.value as any)} style={{ marginLeft: 8 }}>
                <option value="All">Wszystkie</option>
                <option value="Pilka nozna">Piłka nożna</option>
                <option value="Szachy">Szachy</option>
              </select>
            </label>
            <label>
              Status:
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} style={{ marginLeft: 8 }}>
                <option value="All">Wszystkie</option>
                <option value="aktualne">Aktualne</option>
                <option value="w_trakcie">W trakcie</option>
                <option value="archiwalne">Archiwalne</option>
              </select>
            </label>
          </div>
              {loadingProposals ? <p>Ładowanie propozycji…</p> : proposals && proposals.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  <h4>Propozycje turniejów</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: 8 }}>Nazwa</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Dyscyplina</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Województwo</th>
                        <th style={{ padding: 8 }}>Status</th>
                        <th style={{ padding: 8 }}>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposals.map((p) => (
                        <tr key={p.propozycja_id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: 8 }}>{p.sugerowana_nazwa}</td>
                          <td style={{ padding: 8 }}>{p.sugerowana_dyscyplina}</td>
                          <td style={{ padding: 8 }}>{p.sugerowana_wojewodztwo || '-'}</td>
                          <td style={{ padding: 8 }}>{p.status}</td>
                          <td style={{ padding: 8 }}>
                            <button onClick={() => setReviewing(p)}>Przejrzyj</button>
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
                {(() => {
                  const now = new Date()
                  const filtered = (tournaments || []).filter((t: any) => {
                    if (filterDiscipline !== 'All' && t.dyscyplina !== filterDiscipline) return false
                    if (filterStatus === 'All') return true
                    const start = t.data_rozpoczecia ? new Date(t.data_rozpoczecia) : null
                    if (!start) return false
                    const sameDay = start.toDateString() === now.toDateString()
                    let st: 'aktualne' | 'w_trakcie' | 'archiwalne'
                    if (start > now) st = 'aktualne'
                    else if (sameDay) st = 'w_trakcie'
                    else st = 'archiwalne'
                    return st === filterStatus
                  })
                  return filtered.map((t: any) => (
                  <tr key={t.turniej_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{t.nazwa}</td>
                    <td style={{ padding: 8 }}>{t.dyscyplina}</td>
                    <td style={{ padding: 8 }}>{t.data_rozpoczecia ? new Date(t.data_rozpoczecia).toLocaleString() : ''}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => setViewingTournament(t)} style={{ marginRight: 8 }}>Przejrzyj</button>
                      <button onClick={() => deleteTournament(t.turniej_id)} style={{ background: '#c62828', color: 'white', border: 'none', padding: '6px 8px', borderRadius: 4 }}>Usuń</button>
                    </td>
                  </tr>
                  ))
                })()}
              </tbody>
            </table>
          )}
        </div>
      )}
      {reviewing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#fff', color: '#111', width: 'min(860px, 96vw)', maxHeight: '90vh', overflow: 'auto', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Przejrzyj propozycję turnieju</h3>
              <button onClick={() => setReviewing(null)} style={{ padding: '6px 10px' }}>Zamknij</button>
            </div>
            <div style={{ padding: 16, display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 10 }}>
                <div style={{ fontWeight: 600 }}>Nazwa</div>
                <div>{reviewing.sugerowana_nazwa || '-'}</div>

                <div style={{ fontWeight: 600 }}>Dyscyplina</div>
                <div>{reviewing.sugerowana_dyscyplina || '-'}</div>

                <div style={{ fontWeight: 600 }}>Typ zapisu</div>
                <div>{reviewing.sugerowany_typ_zapisu || (reviewing.sugerowana_dyscyplina === 'Szachy' ? 'Indywidualny' : 'Drużynowy')}</div>

                <div style={{ fontWeight: 600 }}>Województwo</div>
                <div>{reviewing.sugerowana_wojewodztwo || '-'}</div>

                <div style={{ fontWeight: 600 }}>Lokalizacja (miejscowość)</div>
                <div>{reviewing.sugerowana_lokalizacja || '-'}</div>

                <div style={{ fontWeight: 600 }}>Szczegółowa lokalizacja</div>
                <div>{reviewing.sugerowana_szczegolowa_lokalizacja || '-'}</div>

                <div style={{ fontWeight: 600 }}>Dokładne miejsce</div>
                <div>{reviewing.sugerowane_dokladne_miejsce || '-'}</div>

                <div style={{ fontWeight: 600 }}>Data rozpoczęcia</div>
                <div>{reviewing.sugerowana_data_rozpoczecia ? new Date(reviewing.sugerowana_data_rozpoczecia).toLocaleDateString('pl-PL') : '-'}</div>

                <div style={{ fontWeight: 600 }}>Godzina rozpoczęcia</div>
                <div>{reviewing.sugerowany_czas_rozpoczecia || '-'}</div>

                <div style={{ fontWeight: 600 }}>Godzina zakończenia</div>
                <div>{reviewing.sugerowany_czas_zakonczenia || '-'}</div>

                <div style={{ fontWeight: 600 }}>Data zamknięcia zapisów</div>
                <div>{reviewing.sugerowana_data_zamkniecia_zapisow ? new Date(reviewing.sugerowana_data_zamkniecia_zapisow).toLocaleString('pl-PL') : '-'}</div>

                <div style={{ fontWeight: 600 }}>Format rozgrywek</div>
                <div>{reviewing.sugerowany_format_rozgrywek || '-'}</div>

                <div style={{ fontWeight: 600 }}>Długość meczy</div>
                <div>{reviewing.sugerowana_dlugosc_meczy || '-'}</div>

                <div style={{ fontWeight: 600 }}>{reviewing.sugerowana_dyscyplina === 'Szachy' ? 'Maks. uczestników' : 'Maks. drużyn'}</div>
                <div>{reviewing.sugerowany_max_uczestnikow ?? '-'}</div>

                <div style={{ fontWeight: 600 }}>Opis</div>
                <div style={{ whiteSpace: 'pre-wrap' }}>{reviewing.dodatkowy_opis || '-'}</div>

                <div style={{ fontWeight: 600 }}>Zgłaszający</div>
                <div>{(userNames[reviewing.sugerowany_przez_user_id] || '-') + (reviewing.sugerowany_przez_user_id ? ` (${reviewing.sugerowany_przez_user_id})` : '')}</div>

                <div style={{ fontWeight: 600 }}>Data zgłoszenia</div>
                <div>{reviewing.created_at ? new Date(reviewing.created_at).toLocaleString('pl-PL') : '-'}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button onClick={() => rejectProposal(reviewing.propozycja_id)} style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6 }}>Odrzuć</button>
                <button onClick={() => approveProposal(reviewing.propozycja_id)} style={{ background: '#2ecc71', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6 }}>Akceptuj</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
