import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { useAuth0 } from '@auth0/auth0-react'
import { getLogoSrc } from '../lib/logoMap'

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<any | null>(null)
  const [pending, setPending] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { user, isAuthenticated } = useAuth0()

  const fetchDetail = async () => {
    if (!id) return
    setLoading(true)
    try {
      const { data: t, error } = await supabase.from('turnieje').select('*').eq('turniej_id', Number(id)).single()
      if (error) throw error
      setTournament(t)

      // fetch pending zapisy for this tournament
      const { data: zaps, error: zErr } = await supabase.from('zapisy').select('*').eq('turniej_id', Number(id)).eq('status', 'Oczekujacy')
      if (zErr) throw zErr
      const enriched: any[] = []
      for (const z of (zaps as any[] || [])) {
        let team: any = null
        if (z.nazwa_druzyny) {
          const { data: d } = await supabase.from('druzyny').select('*').eq('nazwa_druzyny', z.nazwa_druzyny).maybeSingle()
          team = d
        }
        enriched.push({ ...z, team })
      }
      setPending(enriched)
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

  const handleDecision = async (zapisId: number, decision: 'Zaakceptowany' | 'Odrzucony') => {
    try {
      const { error } = await supabase.from('zapisy').update({ status: decision }).eq('zapis_id', zapisId)
      if (error) throw error
      fetchDetail()
    } catch (err) {
      console.error(err)
      alert('Nie udało się przetworzyć zgłoszenia')
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Ładowanie…</div>
  if (!tournament) return <div style={{ padding: 20 }}>Turniej nie znaleziony</div>

  const isOrganizer = isAuthenticated && user && (user as any).sub === tournament.organizator_id

  return (
    <div style={{ padding: 20 }}>
      <h2>{tournament.nazwa}</h2>
      <p><strong>Dyscyplina:</strong> {tournament.dyscyplina}</p>
      <p><strong>Data:</strong> {new Date(tournament.data_rozpoczecia).toLocaleString()}</p>
      <p><strong>Lokalizacja:</strong> {tournament.lokalizacja}</p>

      <h3>Wnioski / prośby o zapis</h3>
      {pending.length === 0 ? (
        <p>Brak oczekujących zgłoszeń</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ padding: 8, textAlign: 'left' }}>Zespół / Użytkownik</th>
              <th style={{ padding: 8 }}>Logo</th>
              <th style={{ padding: 8 }}>Akcje</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((p) => (
              <tr key={p.zapis_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8 }}>{p.nazwa_druzyny ?? p.user_id}</td>
                <td style={{ padding: 8 }}>
                  {p.team?.logo ? (() => {
                    const src = getLogoSrc(p.team.logo)
                    return src ? <img src={src} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain' }} /> : <div style={{ width: 48, height: 48, background: '#f7f7f7' }} />
                  })() : <div style={{ width: 48, height: 48, background: '#f7f7f7' }} />}
                </td>
                <td style={{ padding: 8 }}>
                  {isOrganizer ? (
                    <>
                      <button onClick={() => handleDecision(p.zapis_id, 'Zaakceptowany')} style={{ marginRight: 8 }}>Akceptuj</button>
                      <button onClick={() => handleDecision(p.zapis_id, 'Odrzucony')}>Odrzuć</button>
                    </>
                  ) : (<span>Brak uprawnień</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
