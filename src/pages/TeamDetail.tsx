import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { emailLocal } from '../lib/displayName'
import { useAuth0 } from '@auth0/auth0-react'
import UrgentAnnouncements from '../components/UrgentAnnouncements'
import { TeamLogo } from '../components/TeamLogos'

import ChatBox from '../components/ChatBox'

import { getLogoSrc } from '../lib/logoMap'

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
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            position: 'relative', 
            minHeight: 100,
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
                <p style={{ color: 'var(--muted)', marginTop: 6, fontSize: 16, whiteSpace: 'pre-wrap' }}>{team.opis || 'Brak opisu'}</p>
                {isEditing && <EditButton onClick={() => {
                  setTempDesc(team.opis || '')
                  setEditingDesc(true)
                }} />}
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 18, alignItems: 'center', textAlign: 'center' }}>
          <div style={{ background: '#0f172a', padding: 14, borderRadius: 8, position: 'relative' }}>
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
    </div>
  )
}
