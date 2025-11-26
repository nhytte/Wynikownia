import React, { useState, useEffect } from 'react'
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
  const [wojewodztwo, setWojewodztwo] = useState('')
  const [szczegolowa_lokalizacja, setSzczegolowaLokalizacja] = useState('')
  const [dokladne_miejsce, setDokladneMiejsce] = useState('')
  const [dataRozp, setDataRozp] = useState('')
  const [czasRozp, setCzasRozp] = useState('')
  const [czasZak, setCzasZak] = useState('')
  const [dataZamkniecia, setDataZamkniecia] = useState('')
  const [opis, setOpis] = useState('')
  const [dlugoscMeczy, setDlugoscMeczy] = useState('')
  const [maxUczestnikow, setMaxUczestnikow] = useState('')
  const [formatRozgrywek, setFormatRozgrywek] = useState('Pucharowy')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const randomize = () => {
    // pools
    const names = [
      'Puchar Jesieni', 'Letnia Liga', 'Turniej Mikołajkowy', 'Grand Prix Miasta', 'Weekendowy Puchar',
      'Open Cup', 'Liga Orlik', 'Mistrzostwa Szkolne', 'Turniej Amatorski', 'Puchar Wojewódzki'
    ]
    const cities = ['Warszawa', 'Kraków', 'Gdańsk', 'Poznań', 'Wrocław', 'Łódź', 'Lublin', 'Szczecin', 'Białystok', 'Katowice', 'Rzeszów', 'Bydgoszcz']
    const voivodes = [
      'Dolnośląskie','Kujawsko-pomorskie','Lubelskie','Lubuskie','Łódzkie','Małopolskie','Mazowieckie','Opolskie','Podkarpackie','Podlaskie','Pomorskie','Śląskie','Świętokrzyskie','Warmińsko-mazurskie','Wielkopolskie','Zachodniopomorskie'
    ]
    const footballDur = ['2x10 min','2x12 min','2x15 min','2x20 min','1x30 min']
    const chessDur = ['10+0','15+10','25+5','90+30']
  const formats = ['Pucharowy','Liga']
    const rand = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)]
    const rndInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

    // discipline
    const d = Math.random() < 0.5 ? 'Pilka nozna' : 'Szachy'
    setDyscyplina(d)

    // base name with suffix
    const base = rand(names)
    const suffix = ` ${new Date().getFullYear()} #${rndInt(1, 999)}`
    setNazwa(`${base}${suffix}`)

    // location
    const city = rand(cities)
    setLokalizacja(city)
    setWojewodztwo(rand(voivodes))
    setSzczegolowaLokalizacja(`${city}, ul. Sportowa ${rndInt(1, 200)}`)
    setDokladneMiejsce(Math.random() < 0.5 ? 'Hala sportowa' : 'Boisko szkolne')

    // date/time: start in next 7-40 days; close registration 2-5 days earlier
    const start = new Date()
    start.setDate(start.getDate() + rndInt(7, 40))
    const pad = (n: number) => String(n).padStart(2, '0')
    const y = start.getFullYear()
    const m = pad(start.getMonth() + 1)
    const dDay = pad(start.getDate())
    setDataRozp(`${y}-${m}-${dDay}`)
    // time between 09:00-20:00
    const hrStart = rndInt(9, 18)
    const minStart = [0, 15, 30, 45][rndInt(0, 3)]
    setCzasRozp(`${pad(hrStart)}:${pad(minStart)}`)
    const hrEnd = Math.min(21, hrStart + rndInt(1, 4))
    const minEnd = [0, 15, 30, 45][rndInt(0, 3)]
    setCzasZak(`${pad(hrEnd)}:${pad(minEnd)}`)
    const close = new Date(start)
    close.setDate(start.getDate() - rndInt(2, 5))
    close.setHours(hrStart, minStart, 0, 0)
    const cy = close.getFullYear(); const cm = pad(close.getMonth() + 1); const cd = pad(close.getDate()); const ch = pad(close.getHours()); const cmin = pad(close.getMinutes())
    setDataZamkniecia(`${cy}-${cm}-${cd}T${ch}:${cmin}`)

    // format & length & capacity
  const fmt = rand(formats)
  // For football use selected format, for chess we will ignore and send null
  setFormatRozgrywek(fmt)
    if (d === 'Pilka nozna') {
      setTypZapisu('Drużynowy')
      setDlugoscMeczy(rand(footballDur))
      setMaxUczestnikow(String(rndInt(4, 16) * 2)) // 8..32 even
    } else {
      setTypZapisu('Indywidualny')
      setDlugoscMeczy(rand(chessDur))
      setMaxUczestnikow(String(rndInt(16, 100)))
    }

    // description
    setOpis(
      d === 'Pilka nozna'
  ? 'Amatorski turniej piłki nożnej. Zasady fair play, brak ostrych wślizgów, mecze w systemie ' + fmt + '.'
  : 'Otwarty turniej szachowy. Ranking nieobowiązkowy, tempo gry: ' + (d === 'Szachy' ? chessDur[0] : '') + '. System: ' + fmt + '.'
    )
  }

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
        sugerowana_wojewodztwo: wojewodztwo || null,
        sugerowana_lokalizacja: lokalizacja,
        sugerowana_szczegolowa_lokalizacja: szczegolowa_lokalizacja,
        sugerowane_dokladne_miejsce: dokladne_miejsce,
          // ensure chess proposals are individual-only
          sugerowany_typ_zapisu: dyscyplina === 'Szachy' ? 'Indywidualny' : typZapisu,
        // send raw local strings so Postgres TIMESTAMP stores exactly user's local date/time (no timezone shift)
        sugerowana_data_rozpoczecia: dataRozp || null, // YYYY-MM-DD
        sugerowany_czas_rozpoczecia: czasRozp,
        sugerowany_czas_zakonczenia: czasZak,
        sugerowana_data_zamkniecia_zapisow: dataZamkniecia || null, // YYYY-MM-DDTHH:mm (local)
        dodatkowy_opis: opis,
  sugerowany_format_rozgrywek: dyscyplina === 'Szachy' ? null : formatRozgrywek,
        sugerowana_dlugosc_meczy: dlugoscMeczy,
        sugerowany_max_uczestnikow: maxUczestnikow ? parseInt(maxUczestnikow) : null,
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

  // When discipline changes, adjust defaults/labels and allowed max
  useEffect(() => {
    if (dyscyplina === 'Szachy') {
      // chess: participants (up to 100)
      setTypZapisu('Indywidualny')
      // set default max participants to 100 if empty or higher than 100
      if (!maxUczestnikow || Number(maxUczestnikow) > 100) setMaxUczestnikow('100')
    } else if (dyscyplina === 'Pilka nozna') {
      // football: teams (max 32)
      if (typZapisu !== 'Drużynowy') setTypZapisu('Drużynowy')
      if (!maxUczestnikow || Number(maxUczestnikow) > 32) setMaxUczestnikow('32')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dyscyplina])

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
            <option value="Drużynowy" disabled={dyscyplina === 'Szachy'}>Drużynowy{dyscyplina === 'Szachy' ? ' (niedostępny dla Szachów)' : ''}</option>
          </select>
        </label>

        <label>
          Lokalizacja (miejscowość)
          <input value={lokalizacja} onChange={(e) => setLokalizacja(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Województwo
          <select value={wojewodztwo} onChange={(e) => setWojewodztwo(e.target.value)} style={{ width: '100%', padding: 8 }}>
            <option value="">-- wybierz --</option>
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
          Szczegółowa lokalizacja (adres)
          <input value={szczegolowa_lokalizacja} onChange={(e) => setSzczegolowaLokalizacja(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Dokładne miejsce (np. boisko szkolne, hala sportowa)
          <input value={dokladne_miejsce} onChange={(e) => setDokladneMiejsce(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Data rozpoczęcia
          <input type="date" value={dataRozp} onChange={(e) => setDataRozp(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        <div className="form-row-2">
          <label>
            Godzina rozpoczęcia
            <input type="time" value={czasRozp} onChange={(e) => setCzasRozp(e.target.value)} style={{ width: '100%', padding: 8 }} />
          </label>

          <label>
            Godzina zakończenia
            <input type="time" value={czasZak} onChange={(e) => setCzasZak(e.target.value)} style={{ width: '100%', padding: 8 }} />
          </label>
        </div>

        <label>
          Data zamknięcia zapisów
          <input type="datetime-local" value={dataZamkniecia} onChange={(e) => setDataZamkniecia(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </label>

        {dyscyplina !== 'Szachy' && (
          <label>
            Format rozgrywek
            <select value={formatRozgrywek} onChange={(e) => setFormatRozgrywek(e.target.value)} style={{ width: '100%', padding: 8 }}>
              <option value="Pucharowy">Pucharowy</option>
              <option value="Liga">Liga</option>
            </select>
          </label>
        )}

        <label>
          {dyscyplina === 'Szachy' ? 'Maksymalna liczba uczestników' : 'Maksymalna liczba drużyn'}
          <input
            type="number"
            value={maxUczestnikow}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, '')
              let num = raw === '' ? '' : String(Number(raw))
              if (num !== '') {
                const n = Number(num)
                const max = dyscyplina === 'Szachy' ? 100 : 32
                const min = 2
                if (n > max) num = String(max)
                if (n < min) num = String(min)
              }
              setMaxUczestnikow(num as string)
            }}
            style={{ width: '100%', padding: 8 }}
            min={2}
            max={dyscyplina === 'Szachy' ? 100 : 32}
          />
        </label>

        <label>
          Długość meczy
          <input value={dlugoscMeczy} onChange={(e) => setDlugoscMeczy(e.target.value)} placeholder="np. 2x15 min" style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Opis turnieju
          <textarea value={opis} onChange={(e) => setOpis(e.target.value)} rows={6} style={{ width: '100%', padding: 8 }} 
            placeholder="Szczegółowy opis turnieju, zasady, wymagania, system rozgrywek..." />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={randomize} style={{ padding: '8px 12px', background: '#0ea5e9', color: '#001024', border: 'none', borderRadius: 6 }}>Wypełnij losowo</button>
          <button type="submit" disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Wysyłanie…' : 'Zaproponuj turniej'}</button>
        </div>
      </form>
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  )
}
