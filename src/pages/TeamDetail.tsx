import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { emailLocal } from '../lib/displayName'
import { useAuth0 } from '@auth0/auth0-react'
import { getLogoSrc } from '../lib/logoMap'
import UrgentAnnouncements from '../components/UrgentAnnouncements'

import ChatBox from '../components/ChatBox'

type Team = {
  druzyna_id: number
  nazwa_druzyny: string
  logo: string | null
  opis: string | null
  wojewodztwo: string | null
  dyscyplina: string | null
  owner_id: string | null
  created_at: string | null
}

export default function TeamDetail() {
  const { id } = useParams<{ id: string }>()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [pendingMembers, setPendingMembers] = useState<any[]>([])
  const [currentSignups, setCurrentSignups] = useState<any[]>([])
  const [pastSignups, setPastSignups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated } = useAuth0()
  const navigate = useNavigate()

  const fetchDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data: teamData, error } = await supabase.from('druzyny').select('*').eq('druzyna_id', Number(id)).single()
      if (error) throw error
      setTeam(teamData as Team)

      // owner display name not currently used in UI

      // members (accepted)
      const { data: membersData } = await supabase.from('teammembers').select('*, uzytkownicy(nazwa_wyswietlana, imie, nazwisko, email)').eq('druzyna_id', Number(id)).eq('status', 'accepted')
      setMembers((membersData as any[]) || [])

      // pending join requests (only if owner)
      if (user && (user as any).sub === teamData.owner_id) {
        const { data: pendingData } = await supabase.from('teammembers').select('*, uzytkownicy(nazwa_wyswietlana, imie, nazwisko, email)').eq('druzyna_id', Number(id)).eq('status', 'pending')
        setPendingMembers((pendingData as any[]) || [])
      } else {
        setPendingMembers([])
      }

      // signups to tournaments: look into Zapisy table filtering by team? If Zapisy stores team info, adapt. We'll fetch Zapisy where nazwa_druzyny matches as a fallback.
      const { data: current } = await supabase.from('zapisy').select('*, turnieje(*)').eq('status', 'Zaakceptowany').eq('nazwa_druzyny', teamData?.nazwa_druzyny)
      setCurrentSignups((current as any[]) || [])

      const { data: past } = await supabase.from('zapisy').select('*, turnieje(*)').neq('status', 'Zaakceptowany').eq('nazwa_druzyny', teamData?.nazwa_druzyny)
      setPastSignups((past as any[]) || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthenticated])

  const currentUserId = (user as any)?.sub
  const isMember = Boolean(members.find((m) => (m.user_id && m.user_id === currentUserId) || (m.uzytkownicy && m.uzytkownicy.user_id === currentUserId)))

  const handleJoin = async () => {
    if (!isAuthenticated || !user) return navigate('/login')
    try {
      const uid = (user as any).sub
      // fetch team discipline
      const { data: teamRow } = await supabase.from('druzyny').select('druzyna_id, dyscyplina').eq('druzyna_id', Number(id)).single()
      const discipline = teamRow?.dyscyplina

      // get all teams in this discipline
      const { data: sameDisciplineTeams } = await supabase.from('druzyny').select('druzyna_id').eq('dyscyplina', discipline)
      const teamIds = (sameDisciplineTeams as any[] || []).map((t) => t.druzyna_id)

      // 1) check pending requests for this user in same discipline
      if (teamIds.length) {
        const { data: pending } = await supabase.from('teammembers').select('*').eq('user_id', uid).eq('status', 'pending').in('druzyna_id', teamIds)
        if (pending && (pending as any[]).length > 0) {
          alert('Masz już oczekującą prośbę do drużyny w tej samej dyscyplinie.')
          return
        }

        // 2) check accepted membership in same discipline
        const { data: accepted } = await supabase.from('teammembers').select('*').eq('user_id', uid).eq('status', 'accepted').in('druzyna_id', teamIds)
        if (accepted && (accepted as any[]).length > 0) {
          alert('Jesteś już członkiem innej drużyny w tej dyscyplinie.')
          return
        }
      }

      // finally insert a pending request for this team
      const payload = {
        druzyna_id: Number(id),
        user_id: uid,
        role: null,
        status: 'pending'
      }
      const { error } = await supabase.from('teammembers').insert(payload)
      if (error) throw error
      alert('Wysłano prośbę do właściciela drużyny')
    } catch (err) {
      console.error(err)
      alert('Nie udało się wysłać prośby')
    }
  }

  const handleEditDescription = async () => {
    if (!isAuthenticated || !user) return navigate('/login')
    const newDesc = prompt('Edytuj opis drużyny', team?.opis || '')
    if (newDesc === null) return
    try {
      const { error } = await supabase.from('druzyny').update({ opis: newDesc }).eq('druzyna_id', Number(id))
      if (error) throw error
      setTeam((t) => (t ? { ...t, opis: newDesc } : t))
      alert('Opis został zaktualizowany')
    } catch (e) {
      console.error(e)
      alert('Aktualizacja opisu nie powiodła się')
    }
  }

  const handleAcceptMember = async (memberId: number) => {
    try {
      const { error } = await supabase.from('teammembers').update({ status: 'accepted' }).eq('member_id', memberId)
      if (error) throw error
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się zaakceptować członka')
    }
  }

  const handleRejectMember = async (memberId: number) => {
    if (!confirm('Odrzucić prośbę?')) return
    try {
      const { error } = await supabase.from('teammembers').delete().eq('member_id', memberId)
      if (error) throw error
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się odrzucić prośby')
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Ładowanie…</div>
  if (!team) return <div style={{ padding: 20 }}>Drużyna nie znaleziona</div>

  return (
    <div className="page-content">
      <h1 style={{ textAlign: 'center', fontFamily: 'Lora, serif' }}>{team.nazwa_druzyny}</h1>

      {(isMember || (isAuthenticated && (user as any).sub === team?.owner_id)) && (
        <UrgentAnnouncements 
          contextId={Number(id)} 
          contextType="druzyna" 
          canPost={isAuthenticated && (user as any).sub === team?.owner_id} 
        />
      )}

      <div className="panel" style={{ padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {team.logo ? (
              (() => {
                const src = getLogoSrc(team.logo)
                return src ? <img src={src} alt="logo" style={{ width: 220, height: 220, objectFit: 'contain', borderRadius: 12 }} /> : <div style={{ width: 220, height: 220, background: '#0b1116', borderRadius: 12 }} />
              })()
            ) : (
              <div style={{ width: 220, height: 220, background: '#0b1116', borderRadius: 12 }} />
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 16 }}>{team.opis || 'Brak opisu'}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 18, alignItems: 'center', textAlign: 'center' }}>
          <div style={{ background: '#0f172a', padding: 14, borderRadius: 8 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Województwo</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{team.wojewodztwo || '—'}</div>
          </div>

          <div style={{ background: '#0f172a', padding: 14, borderRadius: 8 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Dyscyplina</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{team.dyscyplina || '—'}</div>
          </div>

          <div style={{ background: '#0f172a', padding: 14, borderRadius: 8 }}>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Liczba osób</div>
            <div style={{ color: '#fff', fontWeight: 700 }}>{members.length}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {isAuthenticated && (user as any).sub === team?.owner_id ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="td-btn td-danger" onClick={async () => {
                  if (!confirm('Na pewno chcesz usunąć tę drużynę? Ta operacja usunie również wszystkie powiązane zgłoszenia i członkostwa.')) return
                  try {
                    await supabase.from('teammembers').delete().eq('druzyna_id', Number(id))
                  } catch (e) { console.warn('Could not delete team members', e) }
                  try {
                    const { error } = await supabase.from('druzyny').delete().eq('druzyna_id', Number(id))
                    if (error) throw error
                    alert('Drużyna została usunięta')
                    navigate('/teams')
                  } catch (e) { console.error(e); alert('Usuwanie drużyny nie powiodło się') }
                }}>Usuń drużynę</button>

                <button className="td-btn td-edit" onClick={handleEditDescription}>Edytuj opis</button>
              </div>
            ) : isMember ? (
              <button className="td-btn td-danger" onClick={async () => {
                if (!confirm('Na pewno chcesz opuścić tę drużynę?')) return
                try {
                  const uid = (user as any).sub
                  const { error } = await supabase.from('teammembers').delete().eq('druzyna_id', Number(id)).eq('user_id', uid)
                  if (error) throw error
                  alert('Opuściłeś drużynę')
                  await fetchDetail()
                } catch (e) { console.error(e); alert('Nie udało się opuścić drużyny') }
              }}>Opuść drużynę</button>
            ) : (
              <button className="td-btn td-blue" onClick={handleJoin}>Dołącz do drużyny</button>
            )}
          </div>
        </div>
      </div>

      {/* Sekcja Czat Drużynowy */}
      {isMember && (
        <div style={{ marginTop: 20 }}>
          <ChatBox 
            contextType="druzyna" 
            contextId={Number(id)} 
            canWrite={true} 
            title="Czat drużynowy"
          />
        </div>
      )}

      {/* Pending Requests Section (Owner Only) */}
      {isAuthenticated && (user as any).sub === team?.owner_id && pendingMembers.length > 0 && (
        <div className="panel" style={{ marginBottom: 20, border: '1px solid #eab308' }}>
          <h3 style={{ marginTop: 0, color: '#eab308' }}>Oczekujące prośby o dołączenie</h3>
          <div className="teams-list" style={{ marginTop: 8 }}>
            {pendingMembers.map((m) => (
              <div key={m.member_id} className="team-row">
                <div className="team-left">
                  <div className="team-icon">⏳</div>
                  <div>
                    <div className="team-name">{m.uzytkownicy?.nazwa_wyswietlana || ((m.uzytkownicy?.imie || m.uzytkownicy?.nazwisko) ? `${m.uzytkownicy?.imie ?? ''} ${m.uzytkownicy?.nazwisko ?? ''}`.trim() : '') || emailLocal(m.uzytkownicy?.email) || m.user_id}</div>
                    <div className="team-prov">Oczekuje na akceptację</div>
                  </div>
                </div>
                <div className="team-right" style={{ display: 'flex', gap: 8 }}>
                  <button className="td-btn td-blue" onClick={() => handleAcceptMember(m.member_id)}>Akceptuj</button>
                  <button className="td-btn td-danger" onClick={() => handleRejectMember(m.member_id)}>Odrzuć</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Aktualni zawodnicy</h3>
        <div className="teams-list" style={{ marginTop: 8 }}>
          {members.map((m) => (
            <div key={m.member_id} className="team-row">
              <div className="team-left">
                <div className="team-icon">👤</div>
                <div>
                  <div className="team-name">{m.uzytkownicy?.nazwa_wyswietlana || ((m.uzytkownicy?.imie || m.uzytkownicy?.nazwisko) ? `${m.uzytkownicy?.imie ?? ''} ${m.uzytkownicy?.nazwisko ?? ''}`.trim() : '') || emailLocal(m.uzytkownicy?.email) || m.user_id}</div>
                  <div className="team-prov">{m.role || ''}</div>
                </div>
              </div>
              <div className="team-right">
                {isAuthenticated && (user as any).sub === team?.owner_id ? (
                  <button className="td-btn td-ghost" onClick={async () => {
                    if (!confirm('Na pewno usunąć tego użytkownika z drużyny?')) return
                    try {
                      const { error } = await supabase.from('teammembers').delete().eq('member_id', m.member_id)
                      if (error) throw error
                      await fetchDetail()
                    } catch (e) { console.error(e); alert('Nie udało się usunąć użytkownika') }
                  }}>Usuń</button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Aktualne zapisy do turniejów</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {currentSignups.map((s, idx) => (
            <div key={idx} className="tournament-row">
              <div style={{ textAlign: 'left' }}>
                <Link to={`/tournaments/${s.turnieje?.turniej_id ?? s.turniej_id}`} className="tournament-left">{s.turnieje?.nazwa || s.turniej_id}</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Poprzednie zapisy</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          {pastSignups.map((s, idx) => (
            <div key={idx} className="tournament-row">
              <div style={{ textAlign: 'left' }}>
                <Link to={`/tournaments/${s.turnieje?.turniej_id ?? s.turniej_id}`} className="tournament-left">{s.turnieje?.nazwa || s.turniej_id}</Link>
                <div className="tournament-mid">— status: {s.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {isAuthenticated && (user as any).sub === team?.owner_id && (
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Prośby o dołączenie</h3>
          {pendingRequests.length === 0 ? (
            <div style={{ padding: 8, color: 'var(--muted)' }}>Brak oczekujących wniosków</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {pendingRequests.map((r) => (
                <div key={r.member_id} className="team-row">
                  <div className="team-left">
                    <div className="team-icon">👤</div>
                    <div>
                      <div className="team-name">{r.uzytkownicy?.nazwa_wyswietlana || ((r.uzytkownicy?.imie || r.uzytkownicy?.nazwisko) ? `${r.uzytkownicy?.imie ?? ''} ${r.uzytkownicy?.nazwisko ?? ''}`.trim() : '') || emailLocal(r.uzytkownicy?.email) || r.user_id}</div>
                      <div className="team-prov">{r.requested_at ? new Date(r.requested_at).toLocaleString('pl-PL') : ''}</div>
                    </div>
                  </div>
                  <div className="team-right" style={{ display: 'flex', gap: 8 }}>
                    <button className="td-btn td-edit" onClick={() => decideRequest(r.member_id, 'accepted')}>Akceptuj</button>
                    <button className="td-btn td-danger" onClick={() => decideRequest(r.member_id, 'rejected')}>Odrzuć</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
