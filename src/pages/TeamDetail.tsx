import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { emailLocal } from '../lib/displayName'
import { useAuth0 } from '@auth0/auth0-react'
import { getLogoSrc } from '../lib/logoMap'

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
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
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

      // fetch owner display name
      if (teamData?.owner_id) {
        try {
          const { data: ownerUser } = await supabase.from('uzytkownicy').select('user_id, nazwa_wyswietlana, email').eq('user_id', teamData.owner_id).single()
          if (ownerUser) {
            setOwnerName(ownerUser.nazwa_wyswietlana || emailLocal(ownerUser.email) || ownerUser.user_id)
          }
        } catch (e) {
          // ignore
        }
      }

      // members (accepted)
  const { data: membersData } = await supabase.from('teammembers').select('*, uzytkownicy(nazwa_wyswietlana, imie, nazwisko, email)').eq('druzyna_id', Number(id)).eq('status', 'accepted')
      setMembers((membersData as any[]) || [])

      // pending join requests for this team
      try {
  const { data: reqs } = await supabase.from('teammembers').select('*, uzytkownicy(nazwa_wyswietlana, imie, nazwisko, email)').eq('druzyna_id', Number(id)).eq('status', 'pending')
        setPendingRequests((reqs as any[]) || [])
      } catch (e) {
        setPendingRequests([])
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
  }, [id])

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

  const handleRequestDecision = async (memberId: number, decision: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase.from('teammembers').update({ status: decision, responded_at: new Date() }).eq('member_id', memberId)
      if (error) throw error
      // refresh lists
      await fetchDetail()
    } catch (err) {
      console.error(err)
      alert('Nie udało się przetworzyć żądania')
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Ładowanie…</div>
  if (!team) return <div style={{ padding: 20 }}>Drużyna nie znaleziona</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>{team.nazwa_druzyny}</h2>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ width: 160 }}>
          {team.logo ? (
            (() => {
              const src = getLogoSrc(team.logo)
              return src ? <img src={src} alt="logo" style={{ width: 160 }} /> : <div style={{ width: 160, height: 160, background: '#f0f0f0', color: '#213547' }} />
            })()
          ) : (
            <div style={{ width: 160, height: 160, background: '#f0f0f0', color: '#213547' }} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p><strong>Dyscyplina:</strong> {team.dyscyplina}</p>
          <p><strong>Województwo:</strong> {team.wojewodztwo}</p>
          <p><strong>Opis:</strong> {team.opis}</p>
          <p><strong>Właściciel:</strong> {ownerName ?? team.owner_id}</p>
          <div style={{ marginTop: 12 }}>
            <button onClick={handleJoin}>Dołącz do drużyny (wyślij prośbę)</button>
            {isAuthenticated && (user as any).sub === team?.owner_id ? (
              <button
                onClick={async () => {
                  if (!confirm('Na pewno chcesz usunąć tę drużynę? Ta operacja usunie również wszystkie powiązane zgłoszenia i członkostwa.')) return
                  try {
                    // delete related team members first
                    await supabase.from('teammembers').delete().eq('druzyna_id', Number(id))
                  } catch (e) {
                    console.warn('Could not delete team members', e)
                  }

                  try {
                    const { error } = await supabase.from('druzyny').delete().eq('druzyna_id', Number(id))
                    if (error) throw error
                    alert('Drużyna została usunięta')
                    // redirect to teams list
                    navigate('/teams')
                  } catch (e) {
                    console.error(e)
                    alert('Usuwanie drużyny nie powiodło się')
                  }
                }}
                style={{ marginLeft: 12, background: '#c62828', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 4 }}
              >
                Usuń drużynę
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: 20 }}>Aktualni zawodnicy</h3>
      <ul>
        {members.map((m) => (
          <li key={m.member_id}>
            {m.uzytkownicy?.nazwa_wyswietlana || ((m.uzytkownicy?.imie || m.uzytkownicy?.nazwisko) ? `${m.uzytkownicy?.imie ?? ''} ${m.uzytkownicy?.nazwisko ?? ''}`.trim() : '') || emailLocal(m.uzytkownicy?.email) || m.user_id}
            {isAuthenticated && (user as any).sub === team?.owner_id ? (
              <button onClick={async () => {
                if (!confirm('Na pewno usunąć tego użytkownika z drużyny?')) return
                try {
                  const { error } = await supabase.from('teammembers').delete().eq('member_id', m.member_id)
                  if (error) throw error
                  await fetchDetail()
                } catch (e) {
                  console.error(e)
                  alert('Nie udało się usunąć użytkownika')
                }
              }} style={{ marginLeft: 8 }}>Usuń</button>
            ) : null}
          </li>
        ))}
      </ul>

      <h3>Prośby o dołączenie</h3>
      {pendingRequests.length === 0 ? (
        <p>Brak oczekujących próśb</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8 }}>Użytkownik</th>
              <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map((r) => (
              <tr key={r.member_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{r.uzytkownicy?.nazwa_wyswietlana || ((r.uzytkownicy?.imie || r.uzytkownicy?.nazwisko) ? `${r.uzytkownicy?.imie ?? ''} ${r.uzytkownicy?.nazwisko ?? ''}`.trim() : '') || emailLocal(r.uzytkownicy?.email) || r.user_id}</td>
                <td style={{ padding: 8 }}>{r.uzytkownicy?.email || ''}</td>
                <td style={{ padding: 8 }}>
                  {isAuthenticated && (user as any).sub === team?.owner_id ? (
                    <>
                      <button onClick={() => handleRequestDecision(r.member_id, 'accepted')} style={{ marginRight: 8 }}>Akceptuj</button>
                      <button onClick={() => handleRequestDecision(r.member_id, 'rejected')}>Odrzuć</button>
                    </>
                  ) : (
                    <span>Brak uprawnień</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Aktualne zapisy do turniejów</h3>
      <ul>
        {currentSignups.map((s, idx) => (
          <li key={idx}>{s.turnieje?.nazwa || s.turniej_id}</li>
        ))}
      </ul>

      <h3>Poprzednie zapisy</h3>
      <ul>
        {pastSignups.map((s, idx) => (
          <li key={idx}>{s.turnieje?.nazwa || s.turniej_id} — status: {s.status}</li>
        ))}
      </ul>
    </div>
  )
}
