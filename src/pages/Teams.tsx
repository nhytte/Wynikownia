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
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [owners, setOwners] = useState<Record<string, string>>({})
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

      // fetch owner display names similar to tournaments page
      const ownerIds = Array.from(new Set(rows.map((r) => r.owner_id).filter(Boolean))) as string[]
      if (ownerIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('uzytkownicy')
          .select('user_id, nazwa_wyswietlana, email')
          .in('user_id', ownerIds)

        if (usersError) {
          console.warn('Failed to load owners', usersError)
        } else if (users) {
          const map: Record<string, string> = {}
          users.forEach((u: any) => {
            map[u.user_id] = u.nazwa_wyswietlana || u.email || u.user_id
          })
          setOwners(map)
        }
      } else {
        setOwners({})
      }
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
    <div style={{ padding: 20 }}>
      <h2>Drużyny</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <input placeholder="Filtruj po nazwie" value={filterName} onChange={(e) => setFilterName(e.target.value)} />
        <select value={filterDyscyplina} onChange={(e) => setFilterDyscyplina(e.target.value)}>
          <option value="">Wszystkie dyscypliny</option>
          <option value="Pilka nozna">Piłka nożna</option>
          <option value="Szachy">Szachy</option>
        </select>
        <select value={filterWoj} onChange={(e) => setFilterWoj(e.target.value)}>
          <option value="">Wszystkie województwa</option>
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
        <button onClick={() => { setFilterName(''); setFilterDyscyplina(''); setFilterWoj('') }}>Wyczyść</button>
      </div>

      {loading ? (
        <div>Ładowanie...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Logo</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Nazwa</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Dyscyplina</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Województwo</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Owner</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Utworzono</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.druzyna_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 8 }}>
                  {(() => {
                    const src = (function getSrc() {
                      // dynamic import of logo map would be ideal; we can try to handle common cases
                      if (!t.logo) return null
                      if (t.logo.startsWith('http') || t.logo.startsWith('/')) return t.logo
                      // else, treat as asset id like 'logo1'
                      try {
                        // require is not available in Vite TS; instead, use a small map inline
                        const map: Record<string, string> = {
                          logo1: '/src/assets/logos/logo1.svg',
                          logo2: '/src/assets/logos/logo2.svg',
                          logo3: '/src/assets/logos/logo3.svg',
                        }
                        return map[t.logo] ?? null
                      } catch (e) {
                        return null
                      }
                    })()
                    return src ? <img src={src} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain' }} /> : <div style={{ width: 48, height: 48, background: '#f7f7f7' }} />
                  })()}
                </td>
                <td style={{ padding: 8 }}>
                  <Link to={`/teams/${t.druzyna_id}`}>{t.nazwa_druzyny}</Link>
                </td>
                <td style={{ padding: 8 }}>{t.dyscyplina}</td>
                <td style={{ padding: 8 }}>{t.wojewodztwo}</td>
                <td style={{ padding: 8 }}>{owners[t.owner_id ?? ''] ?? t.owner_id}</td>
                <td style={{ padding: 8 }}>{t.created_at ? new Date(t.created_at).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
