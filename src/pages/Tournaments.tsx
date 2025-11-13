import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import lawka from '../img/lawka.jpeg'
import pilka from '../img/pilka.jpg'
import puchar from '../img/puchar.jpg'
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

type Props = {
  discipline?: string
  setDiscipline?: (d: string) => void
}

export default function TournamentsPage(props: Props) {
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // organizers removed: no longer display organizer on cards
  const [registeredCounts, setRegisteredCounts] = useState<Record<number, number>>({})
  const selectedDiscipline = props.discipline ?? 'Pilka nozna'
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

  // disciplines handled in navbar

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

    const imgForStatus = item.status === 'ongoing' ? pilka : item.status === 'finished' ? puchar : lawka

    return (
      <article key={t.turniej_id} className="card-panel">
        <div className="card-media"><img src={imgForStatus} alt="miniatura" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} /></div>

        <div className="card-content">
          <div className="card-left">
            <h3 style={{ margin: 0 }}><Link to={`/tournaments/${t.turniej_id}`}>{t.nazwa}</Link></h3>
            <div className="meta" style={{ marginTop: 6 }}>
              <div style={{ color: '#9CA3AF', padding: '5px 0' }}>Dzień: {day}</div>
              <div style={{ color: '#6B7280', padding: '5px 0' }}>Rejestracja: {`${registered}/${max || '-'}`}</div>
              <div style={{ color: 'var(--morski)', padding: '5px 0' }}>Województwo: {provinceDisplay}</div>
            </div>
          </div>

          <div className="card-right">
            <Link to={`/tournaments/${t.turniej_id}`} className="badge" style={{ background: item.status === 'ongoing' ? 'var(--accent-red)' : item.status === 'finished' ? 'rgba(255,255,255,0.06)' : 'var(--accent-green)', color: item.status === 'finished' ? 'var(--muted)' : item.status === 'ongoing' ? '#fff' : '#042018', fontWeight: 600 }}>{statusLabel}</Link>
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="page-section">
      {/* Filters (province + status) centered — discipline buttons moved into navbar */}
      <div className="filters-center" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="province-block">Województwo:&nbsp;
            <select value={selectedWoj} onChange={(e) => setSelectedWoj(e.target.value)} style={{ marginLeft: 8, borderRadius: 6, padding: '6px 8px', background: '#fff', color: '#000', border: '1px solid rgba(0,0,0,0.06)' }}>
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
          </div>

          <div>
            <button className={selectedStatus === 'all' ? 'status-btn status-active' : 'status-btn'} onClick={() => setSelectedStatus('all')}>Wszystkie</button>
            <button className={selectedStatus === 'upcoming' ? 'status-btn status-active' : 'status-btn'} onClick={() => setSelectedStatus('upcoming')} style={{ marginLeft: 8 }}>Nadchodzące</button>
            <button className={selectedStatus === 'ongoing' ? 'status-btn status-active' : 'status-btn'} onClick={() => setSelectedStatus('ongoing')} style={{ marginLeft: 8 }}>W trakcie</button>
            <button className={selectedStatus === 'finished' ? 'status-btn status-active' : 'status-btn'} onClick={() => setSelectedStatus('finished')} style={{ marginLeft: 8 }}>Zakończone</button>
          </div>
        </div>
      </div>

      {/* Title centered below filters */}
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <h2 className="section-title">Turnieje</h2>
      </div>

      {/* Grid: grouped by status when 'all' selected */}
      {selectedStatus === 'all' ? (
        <>
          <h3 className="group-title">Nadchodzące</h3>
          <div className="cards-grid">{withMeta.filter((w)=>{
            const text = ((w.t.wojewodztwo ?? w.t.lokalizacja) || '').toString()
            const matchesWoj = selectedWoj === 'All' ? true : text.toLowerCase().includes(selectedWoj.toLowerCase())
            return w.status === 'upcoming' && w.t.dyscyplina === selectedDiscipline && matchesWoj
          }).map(renderCard)}</div>
          
          {/* Create block that spans full width (3 columns) - always visible */}
          <h2 className="section-title">Stwórz swój turniej</h2>
          <h3 className="group-title">Chcesz zorganizować turniej? Daj swoją propozycje.</h3>
          <div className="cards-grid" style={{ marginTop: 18 }}>
              <div className="create-block" style={{ gridColumn: '1 / -1' }}>
                <div className="hero-create">
                  <img src="/src/img/szatnia.jpg" alt="Create Tournament" />
                  <div className="hero-inner">
                    <p style={{ margin: '20px', color: 'var(--muted)' }}>Masz pomysł na własne rozgrywki? Zorganizuj turniej dla swojej społeczności! Wypełnij krótki formularz, a my pomożemy Ci to zrealizować. Po poprawnym wypełnieniu i akceptacji przez administratora, Twój turniej zostanie opublikowany i wszyscy będą mogli się do niego zapisać.</p>
                    <div style={{ marginTop: 12 }}>
                      <Link to="/create-tournament" style={{ display: 'inline-block', background: 'var(--accent-blue)', color: '#fff', padding: '10px 14px', margin: '10px 0 20px', borderRadius: 20, textDecoration: 'none' }}>Stwórz turniej</Link>
                    </div>
                  </div>
                </div>
              </div>
          </div>

          <h3 className="group-title">W trakcie</h3>
          <div className="cards-grid">{withMeta.filter((w)=>{
            const text = ((w.t.wojewodztwo ?? w.t.lokalizacja) || '').toString()
            const matchesWoj = selectedWoj === 'All' ? true : text.toLowerCase().includes(selectedWoj.toLowerCase())
            return w.status === 'ongoing' && w.t.dyscyplina === selectedDiscipline && matchesWoj
          }).map(renderCard)}</div>

          <h3 className="group-title">Zakończone</h3>
          <div className="cards-grid">{withMeta.filter((w)=>{
            const text = ((w.t.wojewodztwo ?? w.t.lokalizacja) || '').toString()
            const matchesWoj = selectedWoj === 'All' ? true : text.toLowerCase().includes(selectedWoj.toLowerCase())
            return w.status === 'finished' && w.t.dyscyplina === selectedDiscipline && matchesWoj
          }).map(renderCard)}</div>
        </>
      ) : (
        <>
          <h3 className="group-title">{selectedStatus === 'upcoming' ? 'Nadchodzące' : selectedStatus === 'ongoing' ? 'W trakcie' : 'Zakończone'}</h3>
            <div className="cards-grid">{filtered.length === 0 ? <div>Brak turniejów dla wybranych filtrów.</div> : filtered.map(renderCard)}</div>

            {/* Always show the create block after the selected-status block */}
            <h2 className="section-title">Stwórz swój turniej</h2>
            <h3 className="group-title">Chcesz zorganizować turniej? Daj swoją propozycje.</h3>
            <div className="cards-grid" style={{ marginTop: 18 }}>
                <div className="create-block" style={{ gridColumn: '1 / -1' }}>
                  <div className="hero-create">
                    <img src="/src/img/szatnia.jpg" alt="Create Tournament" />
                    <div className="hero-inner">
                      <p style={{ margin: '20px', color: 'var(--muted)' }}>Masz pomysł na własne rozgrywki? Zorganizuj turniej dla swojej społeczności! Wypełnij krótki formularz, a my pomożemy Ci to zrealizować. Po poprawnym wypełnieniu i akceptacji przez administratora, Twój turniej zostanie opublikowany i wszyscy będą mogli się do niego zapisać.</p>
                      <div style={{ marginTop: 12 }}>
                        <Link to="/create-tournament" style={{ display: 'inline-block', background: 'var(--accent-blue)', color: '#fff', padding: '10px 14px', margin: '10px 0 20px', borderRadius: 20, textDecoration: 'none' }}>Stwórz turniej</Link>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
        </>
      )}
    </div>
  )
}

