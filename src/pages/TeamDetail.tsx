import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { emailLocal } from '../lib/displayName'
import { useAuth0 } from '@auth0/auth0-react'
import UrgentAnnouncements from '../components/UrgentAnnouncements'
import { TeamLogo } from '../components/TeamLogos'

import ChatBox from '../components/ChatBox'

import { getLogoSrc } from '../lib/logoMap'
import { ensureUserExists } from '../lib/ensureUser'

type Team = {
  druzyna_id: number
  nazwa_druzyny: string
  logo: string | null
  logo_color?: string | null
  logo_fill_color?: string | null
  opis: string | null
  wojewodztwo: string | null
  dyscyplina: string | null
  owner_id: string | null
  created_at: string | null
}

const LOGO_OPTIONS = [
  { id: 'cat1', label: 'Kot 1' },
  { id: 'cat2', label: 'Kot 2' },
  { id: 'donkey', label: 'Osioł' },
  { id: 'duck', label: 'Kaczka' },
  { id: 'octopus', label: 'Ośmiornica' },
  { id: 'tree', label: 'Drzewo' },
  { id: 'turtle', label: 'Żółw' },
  { id: 'unicorn', label: 'Jednorożec' },
  { id: 'bear', label: 'Niedźwiedź' },
  { id: 'dragon', label: 'Smok' },
]

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

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false)
  
  // Field editing states
  const [editingDesc, setEditingDesc] = useState(false)
  const [tempDesc, setTempDesc] = useState('')

  const [editingProv, setEditingProv] = useState(false)
  const [tempProv, setTempProv] = useState('')

  const [editingLogo, setEditingLogo] = useState(false)
  const [tempLogo, setTempLogo] = useState<string | null>(null)
  const [tempLogoColor, setTempLogoColor] = useState('#ffffff')
  const [tempLogoFillColor, setTempLogoFillColor] = useState('#000000')
  const [viewMode, setViewMode] = useState<'home' | 'chat' | 'results'>('home')
  const [hasUnread, setHasUnread] = useState(false)
  const [myPendingRequest, setMyPendingRequest] = useState<any | null>(null)
  const [teamMatches, setTeamMatches] = useState<any[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)

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

      // Check if current user has a pending request (regardless of being owner)
      if (user) {
        const { data: myReq } = await supabase.from('teammembers')
          .select('*')
          .eq('druzyna_id', Number(id))
          .eq('user_id', (user as any).sub)
          .eq('status', 'pending')
          .maybeSingle()
        setMyPendingRequest(myReq)
      } else {
        setMyPendingRequest(null)
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
    
    // Ensure user exists in DB before joining
    const userOk = await ensureUserExists(user)
    if (!userOk) {
      alert('Błąd synchronizacji użytkownika. Spróbuj ponownie.')
      return
    }

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
      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          alert('Już wysłałeś prośbę lub jesteś w tej drużynie.')
          return
        }
        throw error
      }
      alert('Wysłano prośbę do właściciela drużyny')
      await fetchDetail()
    } catch (err) {
      console.error(err)
      alert('Nie udało się wysłać prośby')
    }
  }

  const handleCancelRequest = async () => {
    if (!myPendingRequest) return
    if (!confirm('Anulować prośbę o dołączenie?')) return
    try {
      const { error } = await supabase.from('teammembers').delete().eq('member_id', myPendingRequest.member_id)
      if (error) throw error
      alert('Prośba została anulowana')
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się anulować prośby')
    }
  }

  const handleSaveDescription = async () => {
    try {
      const { error } = await supabase.from('druzyny').update({ opis: tempDesc }).eq('druzyna_id', Number(id))
      if (error) throw error
      setTeam((t) => (t ? { ...t, opis: tempDesc } : t))
      setEditingDesc(false)
    } catch (e) {
      console.error(e)
      alert('Aktualizacja opisu nie powiodła się')
    }
  }

  const handleSaveProvince = async () => {
    try {
      const { error } = await supabase.from('druzyny').update({ wojewodztwo: tempProv }).eq('druzyna_id', Number(id))
      if (error) throw error
      setTeam((t) => (t ? { ...t, wojewodztwo: tempProv } : t))
      setEditingProv(false)
    } catch (e) {
      console.error(e)
      alert('Aktualizacja województwa nie powiodła się')
    }
  }

  const handleSaveLogo = async () => {
    try {
      const { error } = await supabase.from('druzyny').update({ 
        logo: tempLogo,
        logo_color: tempLogoColor,
        logo_fill_color: tempLogoFillColor
      }).eq('druzyna_id', Number(id))
      if (error) throw error
      setTeam((t) => (t ? { ...t, logo: tempLogo, logo_color: tempLogoColor, logo_fill_color: tempLogoFillColor } : t))
      setEditingLogo(false)
    } catch (e) {
      console.error(e)
      alert('Aktualizacja logo nie powiodła się')
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

  const EditButton = ({ onClick }: { onClick: () => void }) => (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        background: '#fff',
        color: '#000',
        border: 'none',
        borderRadius: '50%',
        width: 32,
        height: 32,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 10
      }}
      title="Edytuj"
    >
      ✏️
    </button>
  )

  const fetchTeamMatches = async () => {
    if (!team) return
    setMatchesLoading(true)
    try {
      const { data: zaps } = await supabase.from('zapisy').select('zapis_id, turniej_id, turnieje(nazwa)').eq('nazwa_druzyny', team.nazwa_druzyny)
      if (!zaps || zaps.length === 0) {
        setTeamMatches([])
        return
      }
      const zids = zaps.map(z => z.zapis_id)
      
      const { data: ms } = await supabase.from('mecze')
        .select('*')
        .or(`uczestnik_1_zapis_id.in.(${zids.join(',')}),uczestnik_2_zapis_id.in.(${zids.join(',')})`)
        .order('mecz_id', { ascending: false }) // fallback sort, we'll sort by date in JS if needed
      
      // Enrich matches with tournament name and opponent name
      // We need to fetch opponent names. This is tricky because we only have zapis_id.
      // We can fetch all involved zapisy.
      const allZapisIds = new Set<number>()
      ms?.forEach(m => {
        if (m.uczestnik_1_zapis_id) allZapisIds.add(m.uczestnik_1_zapis_id)
        if (m.uczestnik_2_zapis_id) allZapisIds.add(m.uczestnik_2_zapis_id)
      })
      
      const { data: oppZaps } = await supabase.from('zapisy').select('zapis_id, nazwa_druzyny, user_id, uzytkownicy(nazwa_wyswietlana)').in('zapis_id', Array.from(allZapisIds))
      const oppMap = new Map<number, string>()
      oppZaps?.forEach((z: any) => {
        const name = z.nazwa_druzyny || z.uzytkownicy?.nazwa_wyswietlana || 'Uczestnik'
        oppMap.set(z.zapis_id, name)
      })

      const enriched = (ms || []).map(m => {
        const z = zaps.find(x => x.turniej_id === m.turniej_id)
        const myZapisId = zids.includes(m.uczestnik_1_zapis_id) ? m.uczestnik_1_zapis_id : m.uczestnik_2_zapis_id
        const oppZapisId = m.uczestnik_1_zapis_id === myZapisId ? m.uczestnik_2_zapis_id : m.uczestnik_1_zapis_id
        const oppName = oppZapisId ? (oppMap.get(oppZapisId) || 'Nieznany') : 'BYE'
        
        return { 
          ...m, 
          tournament_name: (z?.turnieje as any)?.nazwa || 'Turniej',
          opponent_name: oppName,
          is_home: m.uczestnik_1_zapis_id === myZapisId
        }
      })
      
      setTeamMatches(enriched)
    } catch (e) {
      console.error(e)
    } finally {
      setMatchesLoading(false)
    }
  }

  useEffect(() => {
    if (viewMode === 'results') {
      fetchTeamMatches()
    }
  }, [viewMode, team])

  useEffect(() => {
    if (viewMode === 'chat' && !isMember) {
      setViewMode('home')
    }
  }, [viewMode, isMember])

  if (loading) return <div style={{ padding: 20 }}>Ładowanie…</div>
  if (!team) return <div style={{ padding: 20 }}>Drużyna nie znaleziona</div>

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: 'Lora, serif' }}>{team.nazwa_druzyny}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => setViewMode('home')}
            style={{
              padding: '8px 16px',
              background: viewMode === 'home' ? '#0ea5e9' : '#1e293b',
              color: viewMode === 'home' ? '#001024' : '#94a3b8',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Home
          </button>
          {isMember && (
            <button 
              onClick={() => {
                setViewMode('chat')
                setHasUnread(false)
              }}
              style={{
                padding: '8px 16px',
                background: viewMode === 'chat' ? '#0ea5e9' : '#1e293b',
                color: viewMode === 'chat' ? '#001024' : '#94a3b8',
                border: 'none',
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              Chat
              {hasUnread && viewMode !== 'chat' && (
                <span style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 10,
                  fontWeight: 'bold'
                }}>New</span>
              )}
            </button>
          )}
          <button 
            onClick={() => setViewMode('results')}
            style={{
              padding: '8px 16px',
              background: viewMode === 'results' ? '#0ea5e9' : '#1e293b',
              color: viewMode === 'results' ? '#001024' : '#94a3b8',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Wyniki
          </button>
        </div>
      </div>

      {viewMode === 'results' && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Wyniki i mecze</h2>
          {matchesLoading ? (
            <div>Ładowanie meczów...</div>
          ) : teamMatches.length === 0 ? (
            <div>Brak rozegranych lub zaplanowanych meczów.</div>
          ) : (
            <div>
              {(Object.entries(teamMatches.reduce((acc, m) => {
                const tName = m.tournament_name
                if (!acc[tName]) acc[tName] = []
                acc[tName].push(m)
                return acc
              }, {} as Record<string, any[]>)) as [string, any[]][]).map(([tName, ms]) => {
                const upcoming = ms.filter((m: any) => m.status === 'Zaplanowany')
                const finished = ms.filter((m: any) => m.status === 'Zakonczony')
                
                return (
                  <div key={tName} style={{ marginBottom: 24, background: '#0f172a', padding: 16, borderRadius: 8 }}>
                    <h3 style={{ marginTop: 0, borderBottom: '1px solid #334155', paddingBottom: 8 }}>{tName}</h3>
                    
                    {upcoming.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ color: '#94a3b8', marginBottom: 8 }}>Nadchodzące</h4>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {upcoming.map((m: any) => (
                            <div key={m.mecz_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: 10, borderRadius: 6 }}>
                              <div style={{ fontWeight: 600 }}>vs {m.opponent_name}</div>
                              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                {m.data_meczu ? new Date(m.data_meczu).toLocaleString() : 'Data nieustalona'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {finished.length > 0 && (
                      <div>
                        <h4 style={{ color: '#94a3b8', marginBottom: 8 }}>Ostatnie wyniki</h4>
                        <div style={{ display: 'grid', gap: 8 }}>
                          {finished.map((m: any) => {
                            const myScore = m.is_home ? m.wynik_1_int ?? m.wynik_1_decimal : m.wynik_2_int ?? m.wynik_2_decimal
                            const oppScore = m.is_home ? m.wynik_2_int ?? m.wynik_2_decimal : m.wynik_1_int ?? m.wynik_1_decimal
                            const win = myScore > oppScore
                            const draw = myScore == oppScore
                            const color = win ? '#22c55e' : (draw ? '#94a3b8' : '#ef4444')
                            
                            return (
                              <div key={m.mecz_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: 10, borderRadius: 6, borderLeft: `4px solid ${color}` }}>
                                <div style={{ fontWeight: 600 }}>vs {m.opponent_name}</div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>
                                  {myScore} : {oppScore}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {viewMode === 'home' && (
        <>
          {(isMember || (isAuthenticated && (user as any).sub === team?.owner_id)) && (
            <UrgentAnnouncements 
              contextId={Number(id)} 
              contextType="druzyna" 
              canPost={isAuthenticated && (user as any).sub === team?.owner_id} 
            />
          )}

          <div className="panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ width: 220, height: 220, background: team.logo_color || '#0b1116', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  <TeamLogo 
                    type={team.logo} 
                    color={team.logo_fill_color || '#000000'} 
                    style={{ width: 180, height: 180 }} 
                    fallbackSrc={getLogoSrc(team.logo || '') || undefined}
                  />
                  {isEditing && <EditButton onClick={() => {
                    setTempLogo(team.logo || LOGO_OPTIONS[0].id)
                    setTempLogoColor(team.logo_color || '#ffffff')
                    setTempLogoFillColor(team.logo_fill_color || '#000000')
                    setEditingLogo(true)
                  }} />}
                </div>
              </div>

              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center',
                position: 'relative', 
                border: isEditing ? '1px dashed rgba(255,255,255,0.3)' : '1px solid transparent',
                borderRadius: 8,
                padding: 12
              }}>
                {editingDesc ? (
                  <div style={{ width: '100%' }}>
                    <textarea 
                      value={tempDesc} 
                      onChange={(e) => setTempDesc(e.target.value)}
                      rows={5}
                      style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc', background: '#fff', color: '#000' }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={handleSaveDescription} style={{ padding: '4px 12px', background: '#22C55E', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Zapisz</button>
                      <button onClick={() => setEditingDesc(false)} style={{ padding: '4px 12px', background: '#666', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Anuluj</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ color: 'var(--muted)', fontSize: 16, whiteSpace: 'pre-wrap', textAlign: 'center', margin: 0 }}>{team.opis || 'Brak opisu'}</p>
                    {isEditing && <EditButton onClick={() => {
                      setTempDesc(team.opis || '')
                      setEditingDesc(true)
                    }} />}
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1, background: '#0f172a', padding: 14, borderRadius: 8, position: 'relative', textAlign: 'center' }}>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Województwo</div>
                {editingProv ? (
                  <div style={{ marginTop: 4 }}>
                    <select 
                      value={tempProv} 
                      onChange={(e) => setTempProv(e.target.value)}
                      style={{ width: '100%', padding: 4, borderRadius: 4, color: '#000' }}
                    >
                      <option value="">-- Wybierz --</option>
                      <option value="Dolnośląskie">Dolnośląskie</option>
                      <option value="Kujawsko-pomorskie">Kujawsko-pomorskie</option>
                      <option value="Lubelskie">Lubelskie</option>
                      <option value="Lubuskie">Lubuskie</option>
                      <option value="Łódzkie">Łódzkie</option>
                      <option value="Małopolskie">Małopolskie</option>
                      <option value="Mazowieckie">Mazowieckie</option>
                      <option value="Opolskie">Opolskie</option>
                      <option value="Podkarpackie">Podkarpackie</option>
                      <option value="Podlaskie">Podlaskie</option>
                      <option value="Pomorskie">Pomorskie</option>
                      <option value="Śląskie">Śląskie</option>
                      <option value="Świętokrzyskie">Świętokrzyskie</option>
                      <option value="Warmińsko-mazurskie">Warmińsko-mazurskie</option>
                      <option value="Wielkopolskie">Wielkopolskie</option>
                      <option value="Zachodniopomorskie">Zachodniopomorskie</option>
                    </select>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'center' }}>
                      <button onClick={handleSaveProvince} style={{ fontSize: 12, padding: '2px 8px', background: '#22C55E', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>OK</button>
                      <button onClick={() => setEditingProv(false)} style={{ fontSize: 12, padding: '2px 8px', background: '#666', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>X</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ color: '#fff', fontWeight: 700 }}>{team.wojewodztwo || '—'}</div>
                    {isEditing && <EditButton onClick={() => {
                      setTempProv(team.wojewodztwo || '')
                      setEditingProv(true)
                    }} />}
                  </>
                )}
              </div>

              <div style={{ flex: 1, background: '#0f172a', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Dyscyplina</div>
                <div style={{ color: '#fff', fontWeight: 700 }}>{team.dyscyplina || '—'}</div>
              </div>

              <div style={{ flex: 1, background: '#0f172a', padding: 14, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Liczba osób</div>
                <div style={{ color: '#fff', fontWeight: 700 }}>{members.length}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                {isAuthenticated && (user as any).sub === team?.owner_id ? (
                  <>
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
                      } catch (e) { console.error(e); alert('Usuwanie drużyny nie powiodła się') }
                    }}>Usuń drużynę</button>

                    <button className={`td-btn ${isEditing ? 'td-ghost' : 'td-edit'}`} onClick={() => {
                      setIsEditing(!isEditing)
                      // Reset editing states when toggling off
                      if (isEditing) {
                        setEditingDesc(false)
                        setEditingProv(false)
                        setEditingLogo(false)
                      }
                    }}>
                      {isEditing ? 'Zakończ edycję' : 'Edytuj'}
                    </button>
                  </>
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
                ) : myPendingRequest ? (
                  <button className="td-btn td-danger" onClick={handleCancelRequest}>Anuluj prośbę</button>
                ) : (
                  <button className="td-btn td-blue" onClick={handleJoin}>Dołącz do drużyny</button>
                )}
              </div>
            </div>
          </div>

      {/* Logo Edit Modal */}
      {editingLogo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', color: '#000', padding: 20, borderRadius: 12, width: 'min(500px, 90vw)', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Edytuj logo</h3>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {LOGO_OPTIONS.map((lo) => (
                <button key={lo.id} type="button" onClick={() => setTempLogo(lo.id)} style={{ border: lo.id === tempLogo ? '2px solid #007acc' : '1px solid #ddd', padding: 4, background: tempLogoColor, borderRadius: 6, transition: 'background 0.2s', cursor: 'pointer' }}>
                  <TeamLogo type={lo.id} color={tempLogoFillColor} style={{ width: 60, height: 60 }} />
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
              <label>
                Kolor tła
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <input 
                    type="color" 
                    value={tempLogoColor} 
                    onChange={(e) => setTempLogoColor(e.target.value)} 
                    style={{ width: 50, height: 40, padding: 0, border: 'none', cursor: 'pointer' }} 
                  />
                </div>
              </label>

              <label>
                Kolor ikony
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <input 
                    type="color" 
                    value={tempLogoFillColor} 
                    onChange={(e) => setTempLogoFillColor(e.target.value)} 
                    style={{ width: 50, height: 40, padding: 0, border: 'none', cursor: 'pointer' }} 
                  />
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setEditingLogo(false)} style={{ padding: '8px 16px', background: '#666', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Anuluj</button>
              <button onClick={handleSaveLogo} style={{ padding: '8px 16px', background: '#22C55E', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Zapisz</button>
            </div>
          </div>
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
      </>
      )}

      {isMember && (
        <div style={{ marginTop: 20, display: viewMode === 'chat' ? 'block' : 'none' }}>
          <ChatBox 
            contextType="druzyna" 
            contextId={Number(id)} 
            canWrite={true} 
            title="Czat drużynowy"
            isActive={viewMode === 'chat'}
            onMessageReceived={() => {
              if (viewMode !== 'chat') setHasUnread(true)
            }}
          />
        </div>
      )}
    </div>
  )
}
