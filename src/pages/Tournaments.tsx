import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import supabase from '../lib/supabaseClient'

type Tournament = {
  turniej_id: number
  nazwa: string
  dyscyplina: string
  typ_zapisu: string
  lokalizacja?: string | null
  data_rozpoczecia: string
  organizator_id?: string | null
  max_uczestnikow?: number | null
  format_rozgrywek?: string | null
}

export default function TournamentsPage() {
  const { isAuthenticated } = useAuth0()
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [organizers, setOrganizers] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('turnieje')
        .select('*')
        .order('data_rozpoczecia', { ascending: true })

      if (!mounted) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const rows = data as Tournament[]
      setTournaments(rows)

      // Fetch organizers' display names for any organizer_id present
      const orgIds = Array.from(new Set(rows.map((r) => r.organizator_id).filter(Boolean))) as string[]
      if (orgIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('uzytkownicy')
          .select('user_id, nazwa_wyswietlana, email')
          .in('user_id', orgIds)

        if (!mounted) return
        if (usersError) {
          console.warn('Failed to load organizers', usersError)
        } else if (users) {
          const map: Record<string, string> = {}
          users.forEach((u: any) => {
            map[u.user_id] = u.nazwa_wyswietlana || u.email || u.user_id
          })
          setOrganizers(map)
        }
      }

      setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <div style={{ padding: 20 }}>Loading tournaments…</div>
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Turnieje</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAuthenticated ? (
            <>
              <a href="/create-team"><button>Stwórz swoją drużynę</button></a>
              <a href="/create-tournament"><button>Zaproponuj turniej</button></a>
            </>
          ) : (
            <div />
          )}
        </div>
      </div>
      {loading ? (
        <p>Ładowanie turniejów…</p>
      ) : !tournaments || tournaments.length === 0 ? (
        <p>Brak turniejów w bazie.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {tournaments.map((t) => (
            <article key={t.turniej_id} style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <h3 style={{ margin: '0 0 6px' }}><Link to={`/tournaments/${t.turniej_id}`}>{t.nazwa}</Link></h3>
              <div style={{ fontSize: 14, color: '#555', marginBottom: 8 }}>
                <div><strong>Dyscyplina:</strong> {t.dyscyplina}</div>
                <div><strong>Typ zapisu:</strong> {t.typ_zapisu}</div>
                <div><strong>Lokalizacja:</strong> {t.lokalizacja ?? '-'}</div>
                <div><strong>Data:</strong> {new Date(t.data_rozpoczecia).toLocaleString()}</div>
                <div><strong>Organizator:</strong> {organizers[t.organizator_id ?? ''] ?? '-'}</div>
                <div><strong>Maks. uczestników:</strong> {t.max_uczestnikow ?? '-'}</div>
                <div><strong>Format:</strong> {t.format_rozgrywek ?? '-'}</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}