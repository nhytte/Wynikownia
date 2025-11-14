import { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { Link } from 'react-router-dom'

type Team = {
  druzyna_id: number
  nazwa_druzyny: string
  logo: string | null
  opis: string | null
  wojewodztwo: string | null
  dyscyplina: string | null
  owner_id: string | null
  created_at: string | null
  liczba_czlonkow?: number | null
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  // owners removed: we don't display Owner/Utworzono in the search results
  const [loading, setLoading] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [filterDyscyplina, setFilterDyscyplina] = useState('')
  const [filterWoj, setFilterWoj] = useState('')

  const fetchTeams = async () => {
    setLoading(true)
    try {
      let query = supabase.from('druzyny').select('*')
      if (filterName.trim()) query = query.ilike('nazwa_druzyny', `%${filterName}%`)
      if (filterDyscyplina) query = query.eq('dyscyplina', filterDyscyplina)
      if (filterWoj) query = query.eq('wojewodztwo', filterWoj)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      const rows = (data as Team[]) || []
      setTeams(rows)
    } catch (err) {
      console.error('Fetch teams error', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterName, filterDyscyplina, filterWoj])

  return (
    <div className="page-content">
      <h1 className="section-title">Znajdź drużynę</h1>

      <div className="filters-center">
        <input className="search" placeholder="Szukaj drużyny..." value={filterName} onChange={(e) => setFilterName(e.target.value)} />

        <div style={{ marginTop: 8, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div className="advanced-filters">
            <select value={filterWoj} onChange={(e) => setFilterWoj(e.target.value)}>
              <option value="">Województwo</option>
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

            <select value={filterDyscyplina} onChange={(e) => setFilterDyscyplina(e.target.value)}>
              <option value="">Dyscyplina</option>
              <option value="Pilka nozna">Piłka nożna</option>
              <option value="Szachy">Szachy</option>
            </select>

            <button className="ghost" onClick={() => { setFilterName(''); setFilterDyscyplina(''); setFilterWoj('') }}>Wyczyść</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 18 }}>Ładowanie...</div>
      ) : (
        <div className="teams-list" style={{ marginTop: 18 }}>
          {teams.map((t) => (
            <Link to={`/teams/${t.druzyna_id}`} key={t.druzyna_id} className="team-card">
              <div className="team-content">
                <div className="team-left">
                  <div className="team-icon">
                    {(() => {
                      const src = (function getSrc() {
                        if (!t.logo) return null
                        if (t.logo.startsWith('http') || t.logo.startsWith('/')) return t.logo
                        const map: Record<string, string> = {
                          logo1: '/src/assets/logos/logo1.svg',
                          logo2: '/src/assets/logos/logo2.svg',
                          logo3: '/src/assets/logos/logo3.svg',
                        }
                        return map[t.logo] ?? null
                      })()
                      return src ? <img src={src} alt="logo" style={{ width: 56, height: 56, objectFit: 'contain' }} /> : <div style={{ width: 56, height: 56 }} />
                    })()}
                  </div>
                  <div className="team-name">{t.nazwa_druzyny}</div>
                </div>

                <div className="team-center">
                  <div className="team-prov">{t.wojewodztwo || ''}</div>
                </div>

                <div className="team-right">
                  <div className="team-discipline">{t.dyscyplina || ''}</div>
                  <div className="team-count">{(t.liczba_czlonkow ?? 0) + (t.dyscyplina === 'Pilka nozna' ? '/16' : '')}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
