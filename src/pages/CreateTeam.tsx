import { useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import { TeamLogo } from '../components/TeamLogos.tsx'
import { soccer } from '../lib/remoteImages'
import { ensureUserExists } from '../lib/ensureUser'

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

export default function CreateTeamPage() {
  const [nazwa, setNazwa] = useState('')
  const [logo, setLogo] = useState(LOGO_OPTIONS[0].id)
  const [logoColor, setLogoColor] = useState('#ffffff') // Background color
  const [logoFillColor, setLogoFillColor] = useState('#000000') // SVG fill color
  const [opis, setOpis] = useState('')
  const [wojewodztwo, setWojewodztwo] = useState('')
  const [dyscyplina, setDyscyplina] = useState('Pilka nozna')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const { user, isAuthenticated } = useAuth0()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    if (!isAuthenticated || !user) {
      // guard: require login before creating a team
      navigate('/login')
      return
    }

    // Ensure user exists in DB
    const userOk = await ensureUserExists(user)
    if (!userOk) {
      setMessage('Błąd synchronizacji użytkownika. Spróbuj ponownie.')
      return
    }

    if (!nazwa.trim()) {
      setMessage('Podaj nazwę drużyny')
      return
    }
    setLoading(true)

    // Try to insert into `Druzyny` table if it exists, otherwise just show success locally
    try {
      // Prevent creating a team in a discipline if the user is already in a team
      if (isAuthenticated && user) {
        const uid = (user as any).sub
        // 1) check if user is already owner of a team in this discipline
        const { data: ownedSame, error: ownedErr } = await supabase.from('druzyny').select('druzyna_id').eq('owner_id', uid).eq('dyscyplina', dyscyplina)
        if (ownedErr) console.warn('Owner check failed', ownedErr)
        if (ownedSame && (ownedSame as any[]).length > 0) {
          setMessage('Nie możesz utworzyć drużyny w tej dyscyplinie — jesteś już właścicielem drużyny w tej kategorii.')
          setLoading(false)
          return
        }

        // 2) check if user is member of any team in this discipline
        const { data: sameDisciplineTeams } = await supabase.from('druzyny').select('druzyna_id').eq('dyscyplina', dyscyplina)
        const teamIds = (sameDisciplineTeams as any[] || []).map((t) => t.druzyna_id)
        if (teamIds.length) {
          const { data: memberRows } = await supabase.from('teammembers').select('member_id').eq('user_id', uid).eq('status', 'accepted').in('druzyna_id', teamIds)
          if (memberRows && (memberRows as any[]).length > 0) {
            setMessage('Nie możesz utworzyć drużyny w tej dyscyplinie — jesteś już członkiem drużyny w tej kategorii.')
            setLoading(false)
            return
          }
        }
      }

        const payload = {
        nazwa_druzyny: nazwa,
        logo: logo,
        logo_color: logoColor,
        logo_fill_color: logoFillColor,
        opis: opis,
        wojewodztwo: wojewodztwo,
        dyscyplina: dyscyplina,
        owner_id: isAuthenticated && user ? (user as any).sub : null,
      }

      const { data: inserted, error } = await supabase.from('druzyny').insert(payload).select('*')
      if (error || !inserted || inserted.length === 0) {
        // If table doesn't exist or insertion fails, just show a friendly message
        console.warn('Insert Druzyny failed:', error)
        setMessage('Drużyna utworzona lokalnie. (Brak uprawnień do zapisu lub tabela nie istnieje)')
      } else {
        const teamRow = (inserted as any[])[0]
        setMessage('Drużyna została utworzona.')
        // make owner a member automatically
        try {
          if (isAuthenticated && user) {
            const memberPayload = {
              druzyna_id: teamRow.druzyna_id,
              user_id: (user as any).sub,
              role: 'owner',
              status: 'accepted',
            }
            const { error: mErr } = await supabase.from('teammembers').insert(memberPayload)
            if (mErr) console.warn('Failed to insert owner as member:', mErr)
          }
        } catch (e) {
          console.warn('Owner member insert error', e)
        }
      }
    } catch (err) {
      console.error(err)
      setMessage('Wystąpił błąd podczas tworzenia drużyny')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: '0 auto', textAlign: 'left' }}>
      <h2>Załóż swoją drużynę</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Nazwa drużyny
          <input value={nazwa} onChange={(e) => setNazwa(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Logo (wybierz gotowe)
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {LOGO_OPTIONS.map((lo) => (
              <button key={lo.id} type="button" onClick={() => setLogo(lo.id)} style={{ border: lo.id === logo ? '2px solid #007acc' : '1px solid #ddd', padding: 4, background: logoColor, borderRadius: 6, transition: 'background 0.2s' }}>
                <TeamLogo type={lo.id} color={logoFillColor} style={{ width: 80, height: 80 }} />
              </button>
            ))}
          </div>
        </label>

        <div className="form-row-2">
          <label>
            Kolor tła logo
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <input 
                type="color" 
                value={logoColor} 
                onChange={(e) => setLogoColor(e.target.value)} 
                style={{ width: 50, height: 40, padding: 0, border: 'none', cursor: 'pointer' }} 
              />
              <span style={{ fontSize: 14, color: '#666' }}>{logoColor}</span>
            </div>
          </label>

          <label>
            Kolor ikony
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <input 
                type="color" 
                value={logoFillColor} 
                onChange={(e) => setLogoFillColor(e.target.value)} 
                style={{ width: 50, height: 40, padding: 0, border: 'none', cursor: 'pointer' }} 
              />
              <span style={{ fontSize: 14, color: '#666' }}>{logoFillColor}</span>
            </div>
          </label>
        </div>

        <label>
          Opis drużyny
          <textarea value={opis} onChange={(e) => setOpis(e.target.value)} rows={4} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Województwo
          <select value={wojewodztwo} onChange={(e) => setWojewodztwo(e.target.value)} style={{ width: '100%', padding: 8 }}>
            <option value="">-- Wybierz województwo --</option>
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
          Dyscyplina
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setDyscyplina('Pilka nozna')}
              style={{
                border: dyscyplina === 'Pilka nozna' ? '2px solid #007acc' : '1px solid #ddd',
                borderRadius: 8,
                padding: 8,
                background: dyscyplina === 'Pilka nozna' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: 100
              }}
            >
              <img src={soccer} alt="Piłka nożna" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 4 }} />
              <span style={{ fontSize: 14, color: 'white' }}>Piłka nożna</span>
            </button>
          </div>
        </label>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button type="submit" disabled={loading} style={{ padding: '10px 15px', background: '#22C55E', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            {loading ? 'Tworzenie…' : 'Załóż drużynę'}
          </button>
        </div>
      </form>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  )
}
