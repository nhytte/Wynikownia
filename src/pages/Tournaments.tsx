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
  wojewodztwo?: string | null
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
  // organizers removed: no longer display organizer on cards
  const [registeredCounts, setRegisteredCounts] = useState<Record<number, number>>({})
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('Pilka nozna')
  const [selectedWoj, setSelectedWoj] = useState<string>('All')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'upcoming' | 'ongoing' | 'finished'>('all')

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

  const rows = (data as Tournament[]) || []
  setTournaments(rows)

      // no organizer fetch — organizer not shown on tournament cards

      // Fetch accepted registrations counts per tournament
      try {
        const ids = rows.map((r) => r.turniej_id)
        if (ids.length > 0) {
          const { data: zapisyData, error: zapisyError } = await supabase
            .from('zapisy')
            .select('turniej_id')
            .in('turniej_id', ids)
            .eq('status', 'Zaakceptowany')

          if (!mounted) return
          if (zapisyError) {
            console.warn('Failed to load zapisy counts', zapisyError)
          } else if (zapisyData) {
            const map: Record<number, number> = {}
            ;(zapisyData as any[]).forEach((z) => {
              const id = z.turniej_id as number
              map[id] = (map[id] || 0) + 1
            })
            setRegisteredCounts(map)
          }
        }
      } catch (e) {
        console.warn('Error while loading registration counts', e)
      }

  setLoading(false)
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) return <div style={{ padding: 20 }}>Loading tournaments…</div>
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>
  // New UI: discipline tabs, filters, and grid of tournaments in rows of 3

  const now = new Date()
  const withMeta = (tournaments || []).map((t) => {
    const start = t.data_rozpoczecia ? new Date(t.data_rozpoczecia) : null
    // try to read optional end date fields if present
    // @ts-ignore
    const endRaw = (t as any).data_zakonczenia || (t as any).czas_zakonczenia || null
    const end = endRaw ? new Date(endRaw) : null

    let status: 'upcoming' | 'ongoing' | 'finished' = 'upcoming'
    if (start && start > now) status = 'upcoming'
    else if (start && ((end && start <= now && now < end) || (!end && start <= now && start.toDateString() === now.toDateString()))) status = 'ongoing'
    else status = 'finished'

    const registered = registeredCounts[t.turniej_id] || 0
    return { t, start, status, registered }
  })

  const disciplines = ['Pilka nozna', 'Szachy']

  const filtered = withMeta
    .filter((w) => w.t.dyscyplina === selectedDiscipline)
  .filter((w) => {
      if (selectedWoj === 'All') return true
      // try to derive a clean province name from data
      const text = (w.t.wojewodztwo ?? w.t.lokalizacja ?? '').toString()
      const province = (() => {
        const provinces = ['Dolnośląskie','Kujawsko-pomorskie','Lubelskie','Lubuskie','Łódzkie','Małopolskie','Mazowieckie','Opolskie','Podkarpackie','Podlaskie','Pomorskie','Śląskie','Świętokrzyskie','Warmińsko-mazurskie','Wielkopolskie','Zachodniopomorskie']
        // direct match
        for (const p of provinces) {
          if (text.toLowerCase().includes(p.toLowerCase())) return p
        }
        // try city -> province mapping for common cities
        const cityMap: Record<string,string> = {
          gdynia: 'Pomorskie', gdansk: 'Pomorskie', sopot: 'Pomorskie',
          warszawa: 'Mazowieckie', krakow: 'Małopolskie', kraków: 'Małopolskie',
          wroclaw: 'Dolnośląskie', wrocław: 'Dolnośląskie', poznan: 'Wielkopolskie', poznań: 'Wielkopolskie',
          szczecin: 'Zachodniopomorskie', lublin: 'Lubelskie', bialystok: 'Podlaskie', białystok: 'Podlaskie',
          rzeszow: 'Podkarpackie', rzeszów: 'Podkarpackie', opole: 'Opolskie', kielce: 'Świętokrzyskie',
          olsztyn: 'Warmińsko-mazurskie', katowice: 'Śląskie', lodz: 'Łódzkie', łódź: 'Łódzkie',
          torun: 'Kujawsko-pomorskie', toruń: 'Kujawsko-pomorskie', gorzow: 'Lubuskie', gorzów: 'Lubuskie', zielona: 'Lubuskie'
        }
        const lower = text.toLowerCase()
        for (const city of Object.keys(cityMap)) {
          if (lower.includes(city)) return cityMap[city]
        }
        return ''
      })()
      return province ? province === selectedWoj : false
    })
    .filter((w) => selectedStatus === 'all' ? true : w.status === selectedStatus)
    .sort((a, b) => b.registered - a.registered)

  const renderCard = (item: any) => {
    const { t, start, registered } = item
    const max = t.max_uczestnikow || 0
    const day = (() => {
      if (!start) return '-'
      const monthNames = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']
      const m = monthNames[start.getMonth()]
      const d = start.getDate()
      const y = start.getFullYear()
      return `${m} ${d}, ${y}`
    })()
    const statusLabel = item.status === 'upcoming' ? 'Otwarte' : item.status === 'ongoing' ? 'Na żywo' : 'Zakończone'
    const provinceDisplay = (() => {
      const text = (t.wojewodztwo ?? t.lokalizacja ?? '').toString()
      const provinces = ['Dolnośląskie','Kujawsko-pomorskie','Lubelskie','Lubuskie','Łódzkie','Małopolskie','Mazowieckie','Opolskie','Podkarpackie','Podlaskie','Pomorskie','Śląskie','Świętokrzyskie','Warmińsko-mazurskie','Wielkopolskie','Zachodniopomorskie']
      for (const p of provinces) if (text.toLowerCase().includes(p.toLowerCase())) return p
      const cityMap: Record<string,string> = {
        gdynia: 'Pomorskie', gdansk: 'Pomorskie', sopot: 'Pomorskie',
        warszawa: 'Mazowieckie', krakow: 'Małopolskie', kraków: 'Małopolskie',
        wroclaw: 'Dolnośląskie', wrocław: 'Dolnośląskie', poznan: 'Wielkopolskie', poznań: 'Wielkopolskie',
        szczecin: 'Zachodniopomorskie', lublin: 'Lubelskie', bialystok: 'Podlaskie', białystok: 'Podlaskie',
        rzeszow: 'Podkarpackie', rzeszów: 'Podkarpackie', opole: 'Opolskie', kielce: 'Świętokrzyskie',
        olsztyn: 'Warmińsko-mazurskie', katowice: 'Śląskie', lodz: 'Łódzkie', łódź: 'Łódzkie',
        torun: 'Kujawsko-pomorskie', toruń: 'Kujawsko-pomorskie', gorzow: 'Lubuskie', gorzów: 'Lubuskie', zielona: 'Lubuskie'
      }
      const lower = text.toLowerCase()
      for (const city of Object.keys(cityMap)) if (lower.includes(city)) return cityMap[city]
      return (text || '-')
    })()

    return (
      <article key={t.turniej_id} style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.03)', color: '#213547' }}>
  <div style={{ width: '100%', height: 120, background: '#f3f3f3', borderRadius: 6, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Grafika</div>
        <h3 style={{ margin: '0 0 6px' }}><Link to={`/tournaments/${t.turniej_id}`}>{t.nazwa}</Link></h3>
          <div style={{ fontSize: 13, color: '#555', display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <div><strong>Dzień:</strong> {day}</div>
              <div><strong>Rejestracja:</strong> {`${registered}/${max || '-'}`}</div>
              <div><strong>Województwo:</strong> {provinceDisplay}</div>
            </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ padding: '6px 10px', borderRadius: 6, background: item.status === 'ongoing' ? '#e6fffa' : item.status === 'finished' ? '#f3f3f3' : '#eef2ff', color: '#111', fontWeight: 600 }}>{statusLabel}</div>
        </div>
      </article>
    )
  }

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

      {/* Discipline tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {disciplines.map((d) => (
          <button key={d} onClick={() => setSelectedDiscipline(d)} style={{ padding: '8px 12px', borderRadius: 6, background: selectedDiscipline === d ? '#2563eb' : '#f3f4f6', color: selectedDiscipline === d ? '#fff' : '#111', border: 'none' }}>{d}</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label>
          Województwo:
          <select value={selectedWoj} onChange={(e) => setSelectedWoj(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="All">All</option>
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
        </label>

        <label>
          Status:
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value as any)} style={{ marginLeft: 8 }}>
            <option value="all">All</option>
            <option value="upcoming">Nadchodzące</option>
            <option value="ongoing">W trakcie</option>
            <option value="finished">Zakończone</option>
          </select>
        </label>
      </div>

      {/* Grid: 3 columns */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {filtered.length === 0 ? <div>Brak turniejów dla wybranych filtrów.</div> : filtered.map(renderCard)}
      </div>
    </div>
  )
}