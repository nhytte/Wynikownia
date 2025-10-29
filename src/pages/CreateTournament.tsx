import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import supabase from '../lib/supabaseClient'

export default function CreateTournament() {
  const { isAuthenticated, user } = useAuth0()
  const navigate = useNavigate()
  const [nazwa, setNazwa] = useState('')
  const [dyscyplina, setDyscyplina] = useState('Pilka nozna')
  const [typZapisu, setTypZapisu] = useState('Indywidualny')
  const [lokalizacja, setLokalizacja] = useState('')
  const [dataRozp, setDataRozp] = useState('')
  const [opis, setOpis] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated || !user) return navigate('/login')
    if (!nazwa.trim()) { setMessage('Podaj nazwę turnieju'); return }
    setLoading(true)
    try {
      const payload = {
        sugerowany_przez_user_id: (user as any).sub,
        sugerowana_nazwa: nazwa,
        sugerowana_dyscyplina: dyscyplina,
        sugerowana_lokalizacja: lokalizacja,
        sugerowana_data_rozpoczecia: dataRozp ? new Date(dataRozp) : null,
        dodatkowy_opis: opis,
        status: 'Nowa'
      }
      const { error } = await supabase.from('propozycjeturniejow').insert(payload)
      if (error) {
        console.warn('Insert proposal failed', error)
        setMessage('Nie udało się wysłać propozycji (brak uprawnień lub błąd).')
      } else {
        setMessage('Propozycja została wysłana. Zostanie rozpatrzona przez administratora.')
        // redirect back to tournaments after a short delay
        setTimeout(() => navigate('/tournaments'), 1200)
      }
    } catch (e) {
      console.error(e)
      setMessage('Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
      <h2>Zaproponuj turniej</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Nazwa turnieju
          <input value={nazwa} onChange={(e) => setNazwa(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Dyscyplina
          <select value={dyscyplina} onChange={(e) => setDyscyplina(e.target.value)} style={{ width: '100%', padding: 8 }}>
            <option value="Pilka nozna">Piłka nożna</option>
            <option value="Szachy">Szachy</option>
          </select>
        </label>

        <label>
          Typ zapisu
          <select value={typZapisu} onChange={(e) => setTypZapisu(e.target.value)} style={{ width: '100%', padding: 8 }}>
            <option value="Indywidualny">Indywidualny</option>
            <option value="Drużynowy">Drużynowy</option>
          </select>
        </label>

        <label>
          Lokalizacja
          <input value={lokalizacja} onChange={(e) => setLokalizacja(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Data rozpoczęcia
          <input type="datetime-local" value={dataRozp} onChange={(e) => setDataRozp(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Dodatkowy opis
          <textarea value={opis} onChange={(e) => setOpis(e.target.value)} rows={4} style={{ width: '100%', padding: 8 }} />
        </label>

        <div>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Wysyłanie…' : 'Zaproponuj turniej'}</button>
        </div>
      </form>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  )
}
