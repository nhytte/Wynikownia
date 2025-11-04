import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { useAuth0 } from '@auth0/auth0-react'
import { getLogoSrc } from '../lib/logoMap'
import { deriveProvince } from '../lib/province'

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<any | null>(null)
  const [pending, setPending] = useState<any[]>([])
  const [accepted, setAccepted] = useState<any[]>([])
  const [userTeams, setUserTeams] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const { user, isAuthenticated } = useAuth0()
  const [showAllTeams, setShowAllTeams] = useState(false)

  useEffect(() => { fetchDetail() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [id, isAuthenticated])

  async function fetchDetail() {
    if (!id) return
    setLoading(true)
    try {
      const { data: t, error: tErr } = await supabase.from('turnieje').select('*').eq('turniej_id', Number(id)).maybeSingle()
      if (tErr) throw tErr
      if (!t) { setTournament(null); return }
      setTournament(t)

      const { data: zaps } = await supabase.from('zapisy').select('*').eq('turniej_id', Number(id))
      const pendingRows: any[] = []
      const acceptedRows: any[] = []

      if (zaps && zaps.length) {
        const names = Array.from(new Set(zaps.filter((z: any) => z.nazwa_druzyny).map((z: any) => z.nazwa_druzyny)))
        const logosMap: Record<string, any> = {}
        if (names.length) {
          const res = await supabase.from('druzyny').select('druzyna_id, nazwa_druzyny, logo, dyscyplina').in('nazwa_druzyny', names)
          const teams = (res as any).data || []
          teams.forEach((tt: any) => { logosMap[tt.nazwa_druzyny] = tt })
        }

        for (const z of zaps) {
          const row = { ...z, team: z.nazwa_druzyny ? logosMap[z.nazwa_druzyny] ?? null : null }
          if (z.status === 'Oczekujacy') pendingRows.push(row)
          else if (z.status === 'Zaakceptowany') acceptedRows.push(row)
        }
      }

      setPending(pendingRows)
      setAccepted(acceptedRows)

      if (isAuthenticated && user && t) {
        const { data: myTeams } = await supabase.from('druzyny').select('druzyna_id, nazwa_druzyny, logo, dyscyplina').eq('owner_id', (user as any).sub).eq('dyscyplina', t.dyscyplina)
        setUserTeams(myTeams || [])
      } else setUserTeams([])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isOrganizer = Boolean(isAuthenticated && user && tournament && (user as any).sub === tournament.organizator_id)

  const handleDecision = async (zapisId: number, decision: 'Zaakceptowany' | 'Odrzucony') => {
    try {
      const { error } = await supabase.from('zapisy').update({ status: decision }).eq('zapis_id', zapisId)
      if (error) throw error
      await fetchDetail()
    } catch (err) {
      console.error(err)
      alert('Nie udało się przetworzyć zgłoszenia')
    }
  }

  const handleRegisterTeam = async () => {
    if (!tournament) return
    if (!isAuthenticated || !user) { alert('Zaloguj się aby zarejestrować'); return }

    const isIndividual = tournament.typ_zapisu === 'Indywidualny' || tournament.dyscyplina === 'Szachy'

    // Common checks
    if (tournament.data_zamkniecia_zapisow) {
      const deadline = new Date(tournament.data_zamkniecia_zapisow).getTime()
      if (Date.now() > deadline) { alert('Rejestracja została zamknięta'); return }
    }

    setRegistering(true)
    try {
      // check if this user already has a registration for this tournament
      const { data: existing, error: existingErr } = await supabase
        .from('zapisy')
        .select('*')
        .eq('turniej_id', tournament.turniej_id)
        .eq('user_id', (user as any).sub)
        .maybeSingle()
      if (existingErr) {
        console.error('Error checking existing registration', existingErr)
        alert('Błąd podczas sprawdzania istniejącej rejestracji')
        setRegistering(false)
        return
      }
      if (existing) {
        alert(`Masz już rejestrację dla tego turnieju (status: ${existing.status}).`)
        setRegistering(false)
        return
      }

      if (isIndividual) {
        // Individual registration: insert as pending for organizer approval
        const { error } = await supabase.from('zapisy').insert({ turniej_id: tournament.turniej_id, user_id: (user as any).sub, status: 'Oczekujacy' })
        if (error) throw error
        await fetchDetail()
        alert('Twoja rejestracja została wysłana i oczekuje na akceptację organizatora')
        return
      }

      // Team registration flow
      if (tournament.typ_zapisu !== 'Drużynowy') { alert('Ten turniej nie przyjmuje drużyn'); return }
      if (!selectedTeam) { alert('Wybierz drużynę'); return }
      const owned = userTeams.find((t: any) => t.nazwa_druzyny === selectedTeam)
      if (!owned) { alert('Wybrana drużyna nie jest Twoja lub jest innej dyscypliny'); return }

      if (tournament.max_uczestnikow && accepted.length >= Number(tournament.max_uczestnikow)) { alert('Limit drużyn został osiągnięty'); return }

      const { error } = await supabase.from('zapisy').insert({ turniej_id: tournament.turniej_id, user_id: (user as any).sub, nazwa_druzyny: selectedTeam, status: 'Oczekujacy' })
      if (error) throw error
      await fetchDetail()
      alert('Twoja prośba o rejestrację została wysłana')
      setSelectedTeam('')
    } catch (err: any) {
      console.error(err)
      const msg = (err?.message || '').toString()
      if (err?.code === '23505' || msg.includes('duplicate key value') || msg.includes('zapisy_turniej_id_user_id_key')) {
        alert('Wygląda na to, że masz już rejestrację dla tego turnieju (duplikat).')
      } else {
        alert('Błąd podczas rejestracji')
      }
    } finally {
      setRegistering(false)
    }
  }

  if (loading) return <div style={{ padding: 20, color: '#fff', background: '#07090a' }}>Ładowanie…</div>
  if (!tournament) return <div style={{ padding: 20, color: '#fff', background: '#07090a' }}>Turniej nie znaleziony</div>

  const formattedDate = new Date(tournament.data_rozpoczecia).toLocaleDateString('pl-PL', { month: 'long', day: 'numeric', year: 'numeric' })
  const timeRange = `${tournament.czas_rozpoczecia || '—'} — ${tournament.czas_zakonczenia || '—'}`
  const provinceDisplay = deriveProvince(`${tournament.wojewodztwo ?? ''} ${tournament.lokalizacja ?? ''}`)
  const isIndividual = tournament.typ_zapisu === 'Indywidualny' || tournament.dyscyplina === 'Szachy'

  return (
    <div style={{ minHeight: '100vh', background: '#081018', color: '#e6edf3', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0 }}>{tournament.nazwa}</h1>
          <div style={{ color: '#9fb3c8', marginTop: 6 }}>{tournament.dyscyplina}</div>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#0d1315', padding: 16, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Data</h3>
            <div style={{ fontSize: 16 }}>{formattedDate}</div>
            <div style={{ marginTop: 8, color: '#c9d9e6' }}>{timeRange}</div>
          </div>

          <div style={{ background: '#0d1315', padding: 16, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Lokalizacja</h3>
            <div style={{ fontSize: 16 }}>{tournament.lokalizacja}</div>
              {tournament.szczegolowa_lokalizacja && <div style={{ marginTop: 8, color: '#c9d9e6' }}>{tournament.szczegolowa_lokalizacja}</div>}
              {tournament.dokladne_miejsce && <div style={{ marginTop: 6, color: '#9fb3c8' }}>{tournament.dokladne_miejsce}</div>}
              <div style={{ marginTop: 8, color: '#c9d9e6' }}><strong>Województwo:</strong> {provinceDisplay || '—'}</div>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div style={{ background: '#0b1112', padding: 16, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>{isIndividual ? 'Uczestnicy' : 'Drużyny'}</h3>
            <div style={{ fontSize: 16 }}>{accepted.length}/{tournament.max_uczestnikow || '—'}</div>

            <div style={{ marginTop: 12 }}>
              {isAuthenticated ? (
                isIndividual ? (
                  <button onClick={handleRegisterTeam} disabled={registering} style={{ padding: '8px 12px', background: '#2b8cff', color: '#001024', border: 'none', borderRadius: 6 }}>
                    {registering ? 'Rejestrowanie…' : 'Zapisz się'}
                  </button>
                ) : (
                  userTeams.length > 0 ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} style={{ padding: 8, background: '#071013', color: '#e6edf3', border: '1px solid #28363c' }}>
                        <option value="">Wybierz drużynę…</option>
                        {userTeams.map((t: any) => <option key={t.druzyna_id} value={t.nazwa_druzyny}>{t.nazwa_druzyny}</option>)}
                      </select>
                      <button onClick={handleRegisterTeam} disabled={registering} style={{ padding: '8px 12px', background: '#2b8cff', color: '#001024', border: 'none', borderRadius: 6 }}>{registering ? 'Rejestrowanie…' : 'Zarejestruj drużynę'}</button>
                    </div>
                  ) : <div>Nie masz drużyn w tej dyscyplinie.</div>
                )
              ) : (
                <div>Zaloguj się, aby się zapisać.</div>
              )}

              {tournament.data_zamkniecia_zapisow && <div style={{ marginTop: 10, color: '#9fb3c8' }}>Rejestracja zamyka się: {new Date(tournament.data_zamkniecia_zapisow).toLocaleString()}</div>}
            </div>
          </div>

          <div style={{ background: '#0b1112', padding: 16, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Opis turnieju</h3>
            <div style={{ whiteSpace: 'pre-wrap', color: '#e6edf3' }}>{tournament.opis_turnieju || 'Brak opisu'}</div>

            <div style={{ marginTop: 12 }}><strong>Format:</strong> <span style={{ color: '#c9d9e6' }}>{tournament.format_rozgrywek || '—'}</span></div>
            {tournament.dlugosc_meczy && <div style={{ marginTop: 6 }}><strong>Długość meczy:</strong> <span style={{ color: '#c9d9e6' }}>{tournament.dlugosc_meczy}</span></div>}

            {isOrganizer && (
              <div style={{ marginTop: 14, padding: 12, background: '#061012', borderRadius: 6 }}>
                <h4 style={{ margin: '0 0 8px 0' }}>Prośby o zapis (widoczne tylko dla właściciela)</h4>
                {pending.length === 0 ? <div>Brak oczekujących zgłoszeń</div> : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {pending.map((p) => (
                      <div key={p.zapis_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 44, height: 44, background: '#071013', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {p.team?.logo ? <img src={getLogoSrc(p.team.logo) || undefined} alt="logo" style={{ width: 40, height: 40, objectFit: 'contain' }} /> : <div style={{ width: 40, height: 40, background: '#152026' }} />}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.nazwa_druzyny ?? p.user_id}</div>
                            <div style={{ fontSize: 12, color: '#9fb3c8' }}>{p.user_id}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleDecision(p.zapis_id, 'Zaakceptowany')} style={{ padding: '6px 8px', background: '#2ecc71', border: 'none', borderRadius: 6 }}>Akceptuj</button>
                          <button onClick={() => handleDecision(p.zapis_id, 'Odrzucony')} style={{ padding: '6px 8px', background: '#e74c3c', border: 'none', borderRadius: 6 }}>Odrzuć</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section style={{ marginTop: 16, background: '#0b1112', padding: 16, borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>{isIndividual ? 'Zarejestrowani uczestnicy' : 'Zarejestrowane drużyny'}</h3>
          {isIndividual ? (
            <div>
              {(showAllTeams ? accepted : accepted.slice(0, 6)).map((entry) => (
                <div key={entry.zapis_id} style={{ padding: '6px 0', borderBottom: '1px solid #10181d' }}>
                  {entry.user_id}
                </div>
              ))}
              {accepted.length > 6 && (
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => setShowAllTeams(!showAllTeams)} style={{ padding: '8px 12px', background: '#2b8cff', color: '#001024', border: 'none', borderRadius: 6 }}>
                    {showAllTeams ? 'Pokaż mniej' : 'Pokaż wszystkich'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginTop: 12 }}>
                {(showAllTeams ? accepted : accepted.slice(0, 6)).map((entry) => (
                  <div key={entry.zapis_id} style={{ textAlign: 'center' }}>
                    {entry.team?.logo ? <img src={getLogoSrc(entry.team.logo) || undefined} alt={entry.nazwa_druzyny} style={{ width: 80, height: 80, objectFit: 'contain' }} /> : <div style={{ width: 80, height: 80, background: '#071013' }} />}
                    <div style={{ marginTop: 8 }}>{entry.nazwa_druzyny}</div>
                  </div>
                ))}
              </div>
              {accepted.length > 6 && <div style={{ marginTop: 12 }}><button onClick={() => setShowAllTeams(!showAllTeams)} style={{ padding: '8px 12px', background: '#2b8cff', color: '#001024', border: 'none', borderRadius: 6 }}>{showAllTeams ? 'Pokaż mniej' : 'Pokaż wszystkie drużyny'}</button></div>}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
