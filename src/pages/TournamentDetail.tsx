import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import supabase from '../lib/supabaseClient'
import { useAuth0 } from '@auth0/auth0-react'
import { getLogoSrc } from '../lib/logoMap'
import { deriveProvince } from '../lib/province'
import TournamentView from '../components/TournamentView.tsx'
import ChatBox from '../components/ChatBox'
import UrgentAnnouncements from '../components/UrgentAnnouncements'

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<any | null>(null)
  const [pending, setPending] = useState<any[]>([])
  const [accepted, setAccepted] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [userTeams, setUserTeams] = useState<any[]>([])
  const [myTeamIds, setMyTeamIds] = useState<number[]>([])
  const [selectedTeam, setSelectedTeam] = useState('')
  const [loading, setLoading] = useState(false)
  const [registering, setRegistering] = useState(false)
  const { user, isAuthenticated } = useAuth0()
  const [showAllTeams, setShowAllTeams] = useState(false)
  const [edits, setEdits] = useState<Record<number, any>>({})
  // legacy add-match UI removed; inline edit/live bracket now
  const [isAdmin, setIsAdmin] = useState(false)
  const [allTeams, setAllTeams] = useState<any[]>([])
  const [teamSearch, setTeamSearch] = useState('')
  const [selectedAddTeamId, setSelectedAddTeamId] = useState<number | ''>('')
  const [generating, setGenerating] = useState(false)
  const [manageMode, setManageMode] = useState(false)
  // Liga: konfiguracja generatora
  const [leagueCycles, setLeagueCycles] = useState<number>(2)
  const [leagueStartDate, setLeagueStartDate] = useState<string>('')
  const [leagueStartTime, setLeagueStartTime] = useState<string>('')
  const [leagueIntervalDays, setLeagueIntervalDays] = useState<number>(7)
  // Admin user search (for chess individual registrations)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<any[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)

  const emailLocal = (e?: string | null) => (e && e.includes('@')) ? e.split('@')[0] : (e || '')

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
        // fetch user display info for individual tournaments
        const userIds = Array.from(new Set(zaps.map((z: any) => z.user_id).filter(Boolean)))
        const usersMap: Record<string, any> = {}
        if (userIds.length) {
          const ures = await supabase.from('uzytkownicy').select('user_id, email, nazwa_wyswietlana, imie, nazwisko').in('user_id', userIds)
          const users = (ures as any).data || []
          users.forEach((uu: any) => { usersMap[uu.user_id] = uu })
        }

        for (const z of zaps) {
          const uinfo = usersMap[z.user_id] || null
          const row = { ...z, team: z.nazwa_druzyny ? logosMap[z.nazwa_druzyny] ?? null : null, user_info: uinfo }
          if (z.status === 'Oczekujacy') pendingRows.push(row)
          else if (z.status === 'Zaakceptowany') acceptedRows.push(row)
        }
      }

      setPending(pendingRows)
      setAccepted(acceptedRows)

      // load matches for this tournament
      try {
        const { data: m } = await supabase.from('mecze').select('*').eq('turniej_id', Number(id))
        setMatches(m || [])
      } catch (e) {
        console.warn('Failed to load matches', e)
        setMatches([])
      }

      if (isAuthenticated && user && t) {
        const { data: myTeams } = await supabase.from('druzyny').select('druzyna_id, nazwa_druzyny, logo, dyscyplina').eq('owner_id', (user as any).sub).eq('dyscyplina', t.dyscyplina)
        setUserTeams(myTeams || [])

        const { data: mems } = await supabase.from('teammembers').select('druzyna_id').eq('user_id', (user as any).sub).eq('status', 'accepted')
        setMyTeamIds(mems ? mems.map((m: any) => m.druzyna_id) : [])

        // role check for admin
        try {
          const { data: roleRow } = await supabase.from('uzytkownicy').select('rola').eq('user_id', (user as any).sub).maybeSingle()
          setIsAdmin((roleRow?.rola || '') === 'Administrator')
        } catch { setIsAdmin(false) }

        // If admin and football tournament, load all teams for selection
        if (t.dyscyplina === 'Pilka nozna' && t.typ_zapisu === 'Drużynowy') {
          try {
            const { data: list } = await supabase.from('druzyny').select('druzyna_id, nazwa_druzyny, logo, dyscyplina, owner_id')
              .eq('dyscyplina', 'Pilka nozna')
            setAllTeams(list || [])
          } catch { setAllTeams([]) }
        } else {
          setAllTeams([])
        }
      } else setUserTeams([])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isOrganizer = Boolean(isAuthenticated && user && tournament && (user as any).sub === tournament.organizator_id)
  const isParticipant = Boolean(accepted.find(a => a.user_id === (user as any)?.sub)) || accepted.some(a => a.team && myTeamIds.includes(a.team.druzyna_id)) || isOrganizer

  // participants map kept for other sections; bracket edit now uses TournamentView's participants

  // const handleDecision = async (zapisId: number, decision: 'Zaakceptowany' | 'Odrzucony') => {
  //   try {
  //     const { error } = await supabase.from('zapisy').update({ status: decision }).eq('zapis_id', zapisId)
  //     if (error) throw error
  //     await fetchDetail()
  //   } catch (err) {
  //     console.error(err)
  //     alert('Nie udało się przetworzyć zgłoszenia')
  //   }
  // }

  const updateEdit = (id: number, field: string, value: any) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }))
  }

  const searchUsers = async () => {
    if (!isAuthenticated || !user) return
    setSearchingUsers(true)
    try {
      const q = userSearch.trim()
      if (!q) { setUserResults([]); return }
      // search by email or display name
      const { data: byEmail } = await supabase.from('uzytkownicy').select('user_id,email,nazwa_wyswietlana').ilike('email', `%${q}%`).limit(20)
      const { data: byName } = await supabase.from('uzytkownicy').select('user_id,email,nazwa_wyswietlana').ilike('nazwa_wyswietlana', `%${q}%`).limit(20)
      const merged = [...(byEmail || []), ...(byName || [])]
      // deduplicate by user_id
      const map: Record<string, any> = {}
      merged.forEach((u: any) => { map[u.user_id] = u })
      setUserResults(Object.values(map))
    } catch (e) {
      console.error(e)
      setUserResults([])
    } finally {
      setSearchingUsers(false)
    }
  }

  const adminAddChessParticipant = async (userId: string) => {
    if (!tournament || !isAuthenticated) return
    if (!(isOrganizer || isAdmin)) { alert('Brak uprawnień'); return }
    try {
      const payload: any = { turniej_id: tournament.turniej_id, user_id: userId, status: 'Zaakceptowany' }
      const { error } = await supabase.from('zapisy').insert(payload)
      if (error) throw error
      await fetchDetail()
    } catch (err: any) {
      const msg = (err?.message || '').toString()
      if (err?.code === '23505' || msg.includes('duplicate key value') || msg.includes('zapisy_turniej_id_user_id_key')) {
        alert('Ten użytkownik jest już zapisany do tego turnieju.')
      } else {
        console.error(err)
        alert('Nie udało się dodać uczestnika')
      }
    }
  }

  // Bulk save all edited league results without full reload
  const saveAllEdits = async () => {
    if (!tournament || !isAuthenticated || !user) return
    const isFootball = tournament.dyscyplina === 'Pilka nozna'
    const isChess = tournament.dyscyplina === 'Szachy'
    const isLeague = tournament.format_rozgrywek === 'Liga'
    // Allow bulk save for League (football) and Chess
    if (!(isLeague || isChess)) { alert('Zbiorcze zapisywanie dostępne dla Ligi i Szachów'); return }
    // Build updates array based on edits
    const updates: any[] = []
    const toClearIds: number[] = []
    for (const [idStr, e] of Object.entries(edits)) {
      const id = Number(idStr)
      const m = matches.find((x) => x.mecz_id === id)
      if (!m) continue
      const patch: any = { mecz_id: id, wprowadzony_przez_id: (user as any).sub }
      let touched = false
      if (isFootball) {
        if (e.homeScore !== undefined) { patch.wynik_1_int = e.homeScore === '' ? null : Number(e.homeScore); touched = true }
        if (e.awayScore !== undefined) { patch.wynik_2_int = e.awayScore === '' ? null : Number(e.awayScore); touched = true }
      }
      if (isChess) {
        if (e.homeScore !== undefined) { patch.wynik_1_decimal = e.homeScore === '' ? null : Number(e.homeScore); touched = true }
        if (e.awayScore !== undefined) { patch.wynik_2_decimal = e.awayScore === '' ? null : Number(e.awayScore); touched = true }
      }
      if (!touched) continue
      const bothSet = (isFootball && typeof patch.wynik_1_int === 'number' && typeof patch.wynik_2_int === 'number') || (isChess && typeof patch.wynik_1_decimal === 'number' && typeof patch.wynik_2_decimal === 'number')
      patch.status = bothSet ? 'Zakonczony' : 'Zaplanowany'
      // include not-null columns to satisfy upsert constraints
      patch.turniej_id = tournament.turniej_id
      updates.push(patch)
      toClearIds.push(id)
    }
    if (updates.length === 0) return
    try {
      const { error } = await supabase.from('mecze').upsert(updates, { onConflict: 'mecz_id' })
      if (error) throw error
      // Optimistically update local state without full refetch
      setMatches((prev) => prev.map((m) => {
        const u = updates.find((x) => x.mecz_id === m.mecz_id)
        if (!u) return m
        const next = { ...m }
        if (isFootball) {
          if ('wynik_1_int' in u) next.wynik_1_int = u.wynik_1_int
          if ('wynik_2_int' in u) next.wynik_2_int = u.wynik_2_int
        }
        if (isChess) {
          if ('wynik_1_decimal' in u) next.wynik_1_decimal = u.wynik_1_decimal
          if ('wynik_2_decimal' in u) next.wynik_2_decimal = u.wynik_2_decimal
        }
        next.status = u.status
        return next
      }))
      setEdits((prev) => {
        const cp = { ...prev }
        toClearIds.forEach((id) => { cp[id] = {} })
        return cp
      })
    } catch (err) {
      console.error(err)
      alert('Nie udało się zapisać zmian')
    }
  }

  const saveMatch = async (m: any) => {
    if (!tournament || !isAuthenticated || !user) return
    const isFootball = tournament.dyscyplina === 'Pilka nozna'
    const isChess = tournament.dyscyplina === 'Szachy'
    const e = edits[m.mecz_id] || {}
    const patch: any = { wprowadzony_przez_id: (user as any).sub }
    if (typeof e.homeId === 'number') patch.uczestnik_1_zapis_id = e.homeId
    if (typeof e.awayId === 'number') patch.uczestnik_2_zapis_id = e.awayId
    if (isFootball) {
      if (e.homeScore !== undefined) patch.wynik_1_int = e.homeScore === '' ? null : Number(e.homeScore)
      if (e.awayScore !== undefined) patch.wynik_2_int = e.awayScore === '' ? null : Number(e.awayScore)
    }
    if (isChess) {
      if (e.homeScore !== undefined) patch.wynik_1_decimal = e.homeScore === '' ? null : Number(e.homeScore)
      if (e.awayScore !== undefined) patch.wynik_2_decimal = e.awayScore === '' ? null : Number(e.awayScore)
    }
    const bothSet = (isFootball && typeof patch.wynik_1_int === 'number' && typeof patch.wynik_2_int === 'number') || (isChess && typeof patch.wynik_1_decimal === 'number' && typeof patch.wynik_2_decimal === 'number')
    patch.status = bothSet ? 'Zakonczony' : 'Zaplanowany'
    try {
      const { error } = await supabase.from('mecze').update(patch).eq('mecz_id', m.mecz_id)
      if (error) throw error
      setEdits((prev) => ({ ...prev, [m.mecz_id]: {} }))
      // auto-advance/clear chain for football brackets
      if (tournament.dyscyplina === 'Pilka nozna' && tournament.typ_zapisu === 'Drużynowy') {
        const participantsChanged = (typeof e.homeId === 'number' && e.homeId !== m.uczestnik_1_zapis_id) || (typeof e.awayId === 'number' && e.awayId !== m.uczestnik_2_zapis_id)
        let winnerId: number | null = null
        if (bothSet && isFootball) {
          const h = (typeof patch.wynik_1_int === 'number') ? patch.wynik_1_int : m.wynik_1_int
          const a = (typeof patch.wynik_2_int === 'number') ? patch.wynik_2_int : m.wynik_2_int
          if (typeof h === 'number' && typeof a === 'number' && h !== a) {
            const homeId = (typeof patch.uczestnik_1_zapis_id === 'number') ? patch.uczestnik_1_zapis_id : m.uczestnik_1_zapis_id
            const awayId = (typeof patch.uczestnik_2_zapis_id === 'number') ? patch.uczestnik_2_zapis_id : m.uczestnik_2_zapis_id
            winnerId = h > a ? homeId : awayId
          }
        }
        await propagateToParent(m, participantsChanged ? null : winnerId)
      }
      await fetchDetail()
    } catch (err) {
      console.error(err)
      alert('Nie udało się zapisać meczu')
    }
  }

  // ===== Chess (Swiss) helpers =====
  const computeChessStandings = (participants: any[], ms: any[]) => {
    const pts = new Map<number, number>()
    const nameOf = (id: number) => {
      const p = participants.find((pp) => pp.zapis_id === id)
      const full = (p?.user_info?.imie || p?.user_info?.nazwisko) ? `${p?.user_info?.imie ?? ''} ${p?.user_info?.nazwisko ?? ''}`.trim() : ''
      return String(p?.nazwa_druzyny || (full || undefined) || p?.user_info?.nazwa_wyswietlana || emailLocal(p?.user_info?.email) || p?.user_id || id)
    }
    for (const p of participants) pts.set(p.zapis_id, 0)
    for (const m of ms) {
      const a = m.uczestnik_1_zapis_id as number | null
      const b = m.uczestnik_2_zapis_id as number | null
      const s1 = typeof m.wynik_1_decimal === 'number' ? m.wynik_1_decimal : null
      const s2 = typeof m.wynik_2_decimal === 'number' ? m.wynik_2_decimal : null
      if (a && s1 != null) pts.set(a, (pts.get(a) || 0) + s1)
      if (b && s2 != null) pts.set(b, (pts.get(b) || 0) + s2)
      if (a && !b && s1 != null) pts.set(a, (pts.get(a) || 0)) // BYE already counted as s1
    }
    const rows = Array.from(pts.entries()).map(([id, points]) => ({
      position: 0,
      player: nameOf(id) as string,
      points,
    }))
    rows.sort((x, y) => (y.points - x.points) || String(x.player).localeCompare(String(y.player)))
    rows.forEach((r, i) => { r.position = i + 1 })
    return rows
  }

  const buildSwissRounds = (participants: any[], ms: any[]) => {
    const nameOf = (id: number | null) => {
      if (!id) return 'BYE'
      const p = participants.find((pp) => pp.zapis_id === id)
      const full = (p?.user_info?.imie || p?.user_info?.nazwisko) ? `${p?.user_info?.imie ?? ''} ${p?.user_info?.nazwisko ?? ''}`.trim() : ''
      return String(p?.nazwa_druzyny || (full || undefined) || p?.user_info?.nazwa_wyswietlana || emailLocal(p?.user_info?.email) || p?.user_id || id)
    }
    const byRound = new Map<number, any[]>()
    for (const m of ms) {
      const r = m.runda || 1
      if (!byRound.has(r)) byRound.set(r, [])
      byRound.get(r)!.push(m)
    }
    const rounds = Array.from(byRound.entries()).sort((a, b) => a[0] - b[0]).map(([r, list]) => ({
      round: r,
      pairings: list.sort((a, b) => (a.blok || 0) - (b.blok || 0)).map((m) => {
        const s1 = typeof m.wynik_1_decimal === 'number' ? m.wynik_1_decimal : null
        const s2 = typeof m.wynik_2_decimal === 'number' ? m.wynik_2_decimal : null
        let result: string | undefined = undefined
        if (s1 != null && s2 != null) {
          result = `${s1}-${s2}`
        }
        return { white: nameOf(m.uczestnik_1_zapis_id || null), black: nameOf(m.uczestnik_2_zapis_id || null), result }
      })
    }))
    return rounds
  }

  const generateSwissNextRound = async () => {
    if (!tournament || !isAuthenticated || !user) return
    if (!(isOrganizer || isAdmin)) { alert('Brak uprawnień'); return }
    if (tournament.dyscyplina !== 'Szachy') { alert('Dotyczy tylko szachów'); return }
    const players = accepted.map((a) => a.zapis_id)
    if (players.length < 2) { alert('Potrzeba co najmniej 2 uczestników'); return }
    // Compute current points and history
    const pts = new Map<number, number>(); players.forEach((p) => pts.set(p, 0))
    const played = new Set<string>()
    const hadBye = new Set<number>()
    for (const m of matches) {
      const a = m.uczestnik_1_zapis_id as number | null
      const b = m.uczestnik_2_zapis_id as number | null
      const s1 = typeof m.wynik_1_decimal === 'number' ? m.wynik_1_decimal : null
      const s2 = typeof m.wynik_2_decimal === 'number' ? m.wynik_2_decimal : null
      if (a && s1 != null) pts.set(a, (pts.get(a) || 0) + s1)
      if (b && s2 != null) pts.set(b, (pts.get(b) || 0) + s2)
      if (a && b) played.add([Math.min(a, b), Math.max(a, b)].join('-'))
      if (a && !b) hadBye.add(a)
      if (!a && b) hadBye.add(b)
    }
    // Group by points desc
    const groups = new Map<number, number[]>()
    players.forEach((p) => {
      const sc = pts.get(p) || 0
      const key = Math.round(sc * 2) / 2 // normalize half-points
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(p)
    })
    const sortedScores = Array.from(groups.keys()).sort((a, b) => b - a)
    const pool: number[] = []
    for (const sc of sortedScores) {
      const arr = groups.get(sc)!
      arr.sort((a, b) => a - b)
      pool.push(...arr)
    }
    const nextRound = (matches.reduce((mx, m) => Math.max(mx, m.runda || 0), 0) || 0) + 1
    const rows: any[] = []
    const used = new Set<number>()
    // If odd total, assign a BYE to the lowest available without previous bye
    if (pool.length % 2 === 1) {
      let byePlayer = pool.slice().reverse().find((p) => !hadBye.has(p)) || pool[pool.length - 1]
      used.add(byePlayer)
      rows.push({
        turniej_id: tournament.turniej_id,
        runda: nextRound,
        blok: 0,
        uczestnik_1_zapis_id: byePlayer,
        uczestnik_2_zapis_id: null,
        wynik_1_decimal: 1.0,
        wynik_2_decimal: 0.0,
        status: 'Zakonczony',
        wprowadzony_przez_id: (user as any).sub,
      })
    }
    let block = rows.length
    // Pair remaining by trying to avoid repeats
    for (let i = 0; i < pool.length; i++) {
      const a = pool[i]
      if (used.has(a)) continue
      let partnerIdx = -1
      for (let j = i + 1; j < pool.length; j++) {
        const b = pool[j]
        if (used.has(b)) continue
        const key = [Math.min(a, b), Math.max(a, b)].join('-')
        if (!played.has(key)) { partnerIdx = j; break }
      }
      if (partnerIdx === -1) {
        // fallback: take next available
        partnerIdx = pool.findIndex((b, idx) => idx > i && !used.has(b))
        if (partnerIdx === -1) break
      }
      const b = pool[partnerIdx]
      used.add(a); used.add(b)
      rows.push({
        turniej_id: tournament.turniej_id,
        runda: nextRound,
        blok: block++,
        uczestnik_1_zapis_id: a,
        uczestnik_2_zapis_id: b,
        status: 'Zaplanowany',
        wprowadzony_przez_id: (user as any).sub,
      })
    }
    if (rows.length === 0) { alert('Brak par do dodania'); return }
    try {
      const { error } = await supabase.from('mecze').insert(rows)
      if (error) throw error
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się wygenerować rundy Swiss')
    }
  }

  const resetChessRounds = async () => {
    if (!tournament || !isAuthenticated || !user) return
    if (!(isOrganizer || isAdmin)) { alert('Brak uprawnień'); return }
    if (tournament.dyscyplina !== 'Szachy') { alert('Dotyczy tylko szachów'); return }
    const ok = confirm('Usunąć wszystkie rundy i wyniki w tym turnieju szachowym?')
    if (!ok) return
    try {
      const { error } = await supabase.from('mecze').delete().eq('turniej_id', tournament.turniej_id)
      if (error) throw error
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się zresetować rund')
    }
  }

  const propagateToParent = async (childMatch: any, winnerId: number | null) => {
    if (!childMatch || typeof childMatch.runda !== 'number' || typeof childMatch.blok !== 'number') return
    const parentRound = childMatch.runda + 1
    const parentBlock = Math.floor(childMatch.blok / 2)
    const sideField = (childMatch.blok % 2 === 0) ? 'uczestnik_1_zapis_id' : 'uczestnik_2_zapis_id'
    const { data: parent, error: perr } = await supabase
      .from('mecze')
      .select('*')
      .eq('turniej_id', tournament!.turniej_id)
      .eq('runda', parentRound)
      .eq('blok', parentBlock)
      .maybeSingle()
    if (perr || !parent) return
    const currentAssigned = parent[sideField]
    const patch: any = { [sideField]: winnerId, wynik_1_int: null, wynik_2_int: null, wynik_1_decimal: null, wynik_2_decimal: null, status: 'Zaplanowany' }
    const changed = currentAssigned !== winnerId
    if (changed) {
      await supabase.from('mecze').update(patch).eq('mecz_id', parent.mecz_id)
      // Continue clearing upwards since branch changed
      await propagateToParent(parent, null)
    }
  }

  // addMatch manual creation removed with legacy UI

  // Helpers for bracket logic
  const nextPowerOfTwo = (n: number) => {
    let p = 1; while (p < n) p <<= 1; return p
  }

  const generateBracket = async () => {
    if (!tournament || !isAuthenticated || !user) return
    if (!(isOrganizer || isAdmin)) { alert('Brak uprawnień'); return }
    if (tournament.dyscyplina !== 'Pilka nozna' || tournament.typ_zapisu !== 'Drużynowy') { alert('Drabinka dotyczy turniejów drużynowych w piłce nożnej'); return }
    const cap = Math.max(2, Number(tournament.max_uczestnikow || 2))
    const teamIds: number[] = accepted.map((a) => a.zapis_id)
    if (teamIds.length < 2) { alert('Potrzeba co najmniej 2 zaakceptowanych drużyn'); return }
    const size = Math.min(nextPowerOfTwo(teamIds.length), cap)
    const slots: Array<number | null> = [...teamIds.slice(0, size)]
    while (slots.length < size) slots.push(null)
    const rounds = Math.log2(size)
    const rows: any[] = []
    const propagateAfter: Array<{ runda: number; blok: number; winnerId: number }> = []
    // Round 1
    for (let i = 0; i < size / 2; i++) {
      const a = slots[i * 2] ?? null
      const b = slots[i * 2 + 1] ?? null
      const base: any = {
        turniej_id: tournament.turniej_id,
        runda: 1,
        blok: i,
        uczestnik_1_zapis_id: a,
        uczestnik_2_zapis_id: b,
        status: 'Zaplanowany',
        wprowadzony_przez_id: (user as any).sub,
      }
      // BYE auto-finish and note for propagation
      if ((a && !b) || (b && !a)) {
        base.status = 'Zakonczony'
        base.wynik_1_int = a && !b ? 1 : 0
        base.wynik_2_int = b && !a ? 1 : 0
        const winnerId = a && !b ? (a as number) : (b as number)
        propagateAfter.push({ runda: 1, blok: i, winnerId })
      }
      rows.push(base)
    }
    // Higher rounds placeholders
    for (let r = 2; r <= rounds; r++) {
      const blocks = size / Math.pow(2, r)
      for (let b = 0; b < blocks; b++) {
        rows.push({
          turniej_id: tournament.turniej_id,
          runda: r,
          blok: b,
          uczestnik_1_zapis_id: null,
          uczestnik_2_zapis_id: null,
          status: 'Zaplanowany',
          wprowadzony_przez_id: (user as any).sub,
        })
      }
    }
    try {
      setGenerating(true)
      // rebuild
      await supabase.from('mecze').delete().eq('turniej_id', tournament.turniej_id)
      if (rows.length) {
        const { error } = await supabase.from('mecze').insert(rows)
        if (error) throw error
      }
      // propagate BYE winners after insert
      for (const p of propagateAfter) {
        await propagateToParent({ runda: p.runda, blok: p.blok }, p.winnerId)
      }
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się wygenerować drabinki')
    } finally {
      setGenerating(false)
    }
  }

  const getAllowedTeamsForMatch = (m: any): number[] => {
    if (!m) return []
    const r = (m.runda || 1)
    if (r === 1) {
      const taken = new Set<number>()
      matches.filter((mm) => (mm.runda || 1) === 1 && mm.mecz_id !== m.mecz_id).forEach((mm) => {
        if (typeof mm.uczestnik_1_zapis_id === 'number') taken.add(mm.uczestnik_1_zapis_id)
        if (typeof mm.uczestnik_2_zapis_id === 'number') taken.add(mm.uczestnik_2_zapis_id)
      })
      return accepted.map((a) => a.zapis_id).filter((id) => !taken.has(id))
    }
    const block = (m.blok || 0)
    const childA = matches.find((mm) => (mm.runda || 1) === r - 1 && (mm.blok || 0) === (block * 2))
    const childB = matches.find((mm) => (mm.runda || 1) === r - 1 && (mm.blok || 0) === (block * 2 + 1))
    const opts = new Set<number>()
    const pushIf = (id?: number | null) => { if (typeof id === 'number') opts.add(id) }
    if (childA) { pushIf(childA.uczestnik_1_zapis_id); pushIf(childA.uczestnik_2_zapis_id) }
    if (childB) { pushIf(childB.uczestnik_1_zapis_id); pushIf(childB.uczestnik_2_zapis_id) }
    return Array.from(opts)
  }

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const randomizeRound1 = async () => {
    if (!tournament) return
    if (!(isOrganizer || isAdmin)) { alert('Brak uprawnień'); return }
    if (tournament.dyscyplina !== 'Pilka nozna' || tournament.typ_zapisu !== 'Drużynowy') { alert('Losowanie dotyczy turniejów drużynowych w piłce nożnej'); return }
    const round1 = matches.filter((m) => (m.runda || 1) === 1).sort((a, b) => (a.blok || 0) - (b.blok || 0))
    if (round1.length === 0) { alert('Najpierw wygeneruj drabinkę'); return }
    const ids = shuffle(accepted.map((a) => a.zapis_id))
    const updates: any[] = []
    const propagateAfter: Array<{ runda: number; blok: number; winnerId: number }> = []
    for (let i = 0; i < round1.length; i++) {
      const m = round1[i]
      const homeId = ids[i * 2] ?? null
      const awayId = ids[i * 2 + 1] ?? null
      const patch: any = {
        uczestnik_1_zapis_id: homeId,
        uczestnik_2_zapis_id: awayId,
        wynik_1_int: null,
        wynik_2_int: null,
        status: homeId && awayId ? 'Zaplanowany' : 'Zakonczony',
      }
      // BYE auto-advance score
      if ((homeId && !awayId) || (awayId && !homeId)) {
        patch.wynik_1_int = homeId && !awayId ? 1 : 0
        patch.wynik_2_int = awayId && !homeId ? 1 : 0
        const winnerId = homeId && !awayId ? (homeId as number) : (awayId as number)
        propagateAfter.push({ runda: (m.runda || 1), blok: (m.blok || 0), winnerId })
      }
      updates.push({ id: m.mecz_id, patch })
    }
    try {
      await Promise.all(updates.map((u) => supabase.from('mecze').update(u.patch).eq('mecz_id', u.id)))
      for (const p of propagateAfter) {
        await propagateToParent({ runda: p.runda, blok: p.blok }, p.winnerId)
      }
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się wylosować par rundy 1')
    }
  }

  // LEAGUE helpers
  const generateLeagueFixtures = async () => {
    if (!tournament || !isAuthenticated || !user) return
    if (!(isOrganizer || isAdmin)) { alert('Brak uprawnień'); return }
    if (tournament.dyscyplina !== 'Pilka nozna' || tournament.typ_zapisu !== 'Drużynowy' || tournament.format_rozgrywek !== 'Liga') { alert('Dotyczy tylko ligi piłkarskiej'); return }
    if (matches.length > 0) { alert('Terminarz już istnieje'); return }
    const ids = accepted.map((a) => a.zapis_id)
    if (ids.length < 2) { alert('Potrzeba co najmniej 2 drużyn'); return }
    const teams: Array<number | null> = [...ids]
    if (teams.length % 2 === 1) teams.push(null) // BYE
    const n = teams.length
    const rounds = n - 1 // kolejki w jednym cyklu
    const half = n / 2
    const totalCycles = Math.max(1, Math.min(leagueCycles || 1, 3))
    const rows: any[] = []
    // bazowa data i interwał
    let baseDate: Date | null = null
    if (leagueStartDate) {
      const t = (leagueStartTime && leagueStartTime.length) ? leagueStartTime : '00:00'
      baseDate = new Date(`${leagueStartDate}T${t}`)
    }
    for (let cycle = 0; cycle < totalCycles; cycle++) {
      const arr = [...teams]
      for (let r = 0; r < rounds; r++) {
        const globalRound = cycle * rounds + (r + 1)
        for (let i = 0; i < half; i++) {
          const a = arr[i]
          const b = arr[n - 1 - i]
          if (a == null || b == null) continue
          const homeFirst = (r + i) % 2 === 0
          const swap = (cycle % 2 === 1) // w parzystym cyklu odwróć H/A
          const home = swap ? (homeFirst ? b : a) : (homeFirst ? a : b)
          const away = swap ? (homeFirst ? a : b) : (homeFirst ? b : a)
          const row: any = {
            turniej_id: tournament.turniej_id,
            runda: globalRound,
            blok: i,
            uczestnik_1_zapis_id: home,
            uczestnik_2_zapis_id: away,
            status: 'Zaplanowany',
            wprowadzony_przez_id: (user as any).sub,
          }
          if (baseDate) {
            const d = new Date(baseDate)
            d.setDate(d.getDate() + (globalRound - 1) * Math.max(1, leagueIntervalDays || 7))
            const yyyy = d.getFullYear()
            const mm = String(d.getMonth() + 1).padStart(2, '0')
            const dd = String(d.getDate()).padStart(2, '0')
            const hh = String(d.getHours()).padStart(2, '0')
            const mi = String(d.getMinutes()).padStart(2, '0')
            row.data_meczu = `${yyyy}-${mm}-${dd}T${hh}:${mi}`
          }
          rows.push(row)
        }
        // rotacja (metoda kółkowa) z pierwszym stałym
        const fixed = arr[0]
        const rest = arr.slice(1)
        rest.unshift(rest.pop() as any)
        arr.splice(0, arr.length, fixed, ...rest)
      }
    }
    try {
      const { error } = await supabase.from('mecze').insert(rows)
      if (error) throw error
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się wygenerować terminarza')
    }
  }

  const resetLeagueResults = async () => {
    if (!tournament || !isAuthenticated || !user) return
    if (!(isOrganizer || isAdmin)) { alert('Brak uprawnień'); return }
    if (!(tournament.dyscyplina === 'Pilka nozna' && tournament.typ_zapisu === 'Drużynowy' && tournament.format_rozgrywek === 'Liga')) { alert('Dotyczy tylko ligi piłkarskiej'); return }
    const ok = confirm('Na pewno zresetować wszystkie wyniki w tym terminarzu? Daty i pary zostaną zachowane.')
    if (!ok) return
    try {
      const { error } = await supabase.from('mecze')
        .update({ wynik_1_int: null, wynik_2_int: null, wynik_1_decimal: null, wynik_2_decimal: null, status: 'Zaplanowany' })
        .eq('turniej_id', tournament.turniej_id)
      if (error) throw error
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się zresetować wyników')
    }
  }

  const resetLeagueSchedule = async () => {
    if (!tournament || !isAuthenticated || !user) return
    if (!(isOrganizer || isAdmin)) { alert('Brak uprawnień'); return }
    if (!(tournament.dyscyplina === 'Pilka nozna' && tournament.typ_zapisu === 'Drużynowy' && tournament.format_rozgrywek === 'Liga')) { alert('Dotyczy tylko ligi piłkarskiej'); return }
    const ok = confirm('Usunąć cały terminarz tej ligi? Spowoduje to usunięcie wszystkich meczów i wyników.')
    if (!ok) return
    try {
      const { error } = await supabase.from('mecze')
        .delete()
        .eq('turniej_id', tournament.turniej_id)
      if (error) throw error
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się usunąć terminarza')
    }
  }

  const combineDateTimeLocal = (date: string, time?: string) => {
    // Keep local semantics without timezone conversion; store as 'YYYY-MM-DDTHH:mm'
    if (!date) return null
    const t = (time && time.length) ? time : '00:00'
    return `${date}T${t}`
  }

  const setRoundDate = async (round: number, date: string, time?: string) => {
    if (!tournament || !(isOrganizer || isAdmin)) return
    const value = combineDateTimeLocal(date, time)
    try {
      const { error } = await supabase.from('mecze')
        .update({ data_meczu: value })
        .eq('turniej_id', tournament.turniej_id)
        .eq('runda', round)
      if (error) throw error
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się ustawić daty kolejki')
    }
  }

  const clearRoundDate = async (round: number) => {
    if (!tournament || !(isOrganizer || isAdmin)) return
    try {
      const { error } = await supabase.from('mecze')
        .update({ data_meczu: null })
        .eq('turniej_id', tournament.turniej_id)
        .eq('runda', round)
      if (error) throw error
      await fetchDetail()
    } catch (e) {
      console.error(e)
      alert('Nie udało się wyczyścić dat kolejki')
    }
  }

  const addTeamAsAdmin = async () => {
    if (!tournament || !isAuthenticated || !user) return
    if (!isAdmin) { alert('Tylko administrator może dodać drużynę'); return }
    if (tournament.dyscyplina !== 'Pilka nozna' || tournament.typ_zapisu !== 'Drużynowy') { alert('Dodawanie drużyny dotyczy tylko turniejów drużynowych w piłce nożnej'); return }
    if (!selectedAddTeamId) { alert('Wybierz drużynę'); return }

    const team = allTeams.find((t) => t.druzyna_id === Number(selectedAddTeamId))
    if (!team) { alert('Nie znaleziono drużyny'); return }

    // Respect capacity
    if (tournament.max_uczestnikow && accepted.length >= Number(tournament.max_uczestnikow)) { alert('Limit drużyn został osiągnięty'); return }

    try {
      const insertRow = {
        turniej_id: tournament.turniej_id,
        user_id: team.owner_id, // właściciel drużyny
        nazwa_druzyny: team.nazwa_druzyny,
        status: 'Zaakceptowany' as const,
      }
      const { error } = await supabase.from('zapisy').insert(insertRow as any)
      if (error) throw error
      setSelectedAddTeamId('')
      await fetchDetail()
    } catch (err: any) {
      console.error(err)
      const msg = (err?.message || '').toString()
      if (err?.code === '23505' || msg.includes('duplicate key value') || msg.includes('zapisy_turniej_id_user_id_key')) {
        alert('Właściciel tej drużyny ma już zgłoszenie do tego turnieju (unikalność po użytkowniku).')
      } else {
        alert('Nie udało się dodać drużyny')
      }
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

  const descriptionText = (tournament.opis || tournament.dodatkowy_opis || tournament.description || '').toString()

  // build props for TournamentView (football paths). For swiss we need server-provided data.
  const tvParticipants = accepted.map((a) => {
    const full = (a.user_info?.imie || a.user_info?.nazwisko) ? `${a.user_info?.imie ?? ''} ${a.user_info?.nazwisko ?? ''}`.trim() : ''
    return { id: a.zapis_id, name: a.nazwa_druzyny || (full || undefined) || a.user_info?.nazwa_wyswietlana || emailLocal(a.user_info?.email) || a.user_id }
  })
  const tvMatches = matches.map((m) => ({
    id: m.mecz_id,
    homeId: m.uczestnik_1_zapis_id,
    awayId: m.uczestnik_2_zapis_id,
    homeScore: tournament?.dyscyplina === 'Szachy'
      ? (typeof m.wynik_1_decimal === 'number' ? m.wynik_1_decimal : null)
      : (typeof m.wynik_1_int === 'number' ? m.wynik_1_int : null),
    awayScore: tournament?.dyscyplina === 'Szachy'
      ? (typeof m.wynik_2_decimal === 'number' ? m.wynik_2_decimal : null)
      : (typeof m.wynik_2_int === 'number' ? m.wynik_2_int : null),
    round: (m as any).runda || undefined,
    date: m.data_meczu || undefined,
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#081018', color: '#e6edf3', padding: 24, boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0 }}>{tournament.nazwa}</h1>
          <div style={{ color: '#9fb3c8', marginTop: 6 }}>{tournament.dyscyplina}</div>
        </header>

        <UrgentAnnouncements contextId={Number(id)} contextType="turniej" canPost={isOrganizer} />

        {/* Detail grid: left image, right meta + register */}
        <section className="detail-grid">
          <div className="detail-image">
            {/* Tournament image or fallback */}
            <img src={(tournament.zdjecie && tournament.zdjecie.length) ? tournament.zdjecie : '/src/img/lawka.jpeg'} alt={tournament.nazwa} />
          </div>

          <div className="detail-right">
            <div className="meta-cards">
              <div className="meta-card">
                <h4><img src="/src/img/calender.svg" alt="Data"/>Data</h4>
                <div className="meta-value">{formattedDate}</div>
                <div className="meta-sub">{timeRange}</div>
              </div>
              <div className="meta-card">
                <h4><img src="/src/img/team.svg" alt="Drużyny"/>Drużyny</h4>
                <div className="meta-value">{accepted.length} / {tournament.max_uczestnikow || '—'}</div>
                <div className="meta-sub">wolnych miejsc: {Math.max(0, (tournament.max_uczestnikow || 0) - accepted.length)}</div>
              </div>
              <div className="meta-card">
                <h4><img src="/src/img/location.svg" alt="Lokalizacja"/>Lokalizacja</h4>
                <div className="meta-value">{tournament.lokalizacja || '—'}</div>
                {tournament.dokladne_miejsce && <div className="meta-sub">{tournament.dokladne_miejsce}</div>}
                <div className="meta-sub">Województwo: {provinceDisplay || '—'}</div>
              </div>
            </div>

            <div className="register-area">
              {/* Registration UI (keeps existing logic) */}
              <div style={{ marginBottom: 10 }}>
                {isAuthenticated ? (
                  isIndividual ? (
                    <div>
                      <button className="register-btn" onClick={handleRegisterTeam} disabled={registering}>{registering ? 'Rejestrowanie…' : 'Zapisz się'}</button>
                      {(isOrganizer || isAdmin) && (
                        <div style={{ marginTop: 12, padding: 10, background: '#061012', borderRadius: 6 }}>
                          <div style={{ fontWeight: 600, marginBottom: 6 }}>Dodaj uczestnika (admin)</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Szukaj po emailu lub nazwie" style={{ padding: 8, minWidth: 240, background: '#071013', color: '#e6edf3', border: '1px solid #28363c' }} />
                            <button onClick={searchUsers} disabled={searchingUsers || !userSearch.trim()} style={{ padding: '8px 12px', background: '#0ea5e9', color: '#001024', border: 'none', borderRadius: 6 }}>{searchingUsers ? 'Szukam…' : 'Szukaj'}</button>
                          </div>
                          {userResults.length > 0 && (
                            <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto', borderTop: '1px solid #102028' }}>
                              {userResults.map((u: any) => {
                                const already = accepted.some((a) => a.user_id === u.user_id)
                                return (
                                  <div key={u.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #0f1a20' }}>
                                    <div>
                                      <div>{u.nazwa_wyswietlana || '—'}</div>
                                      <div style={{ fontSize: 12, color: '#9fb3c8' }}>{u.email}</div>
                                    </div>
                                    <button disabled={already} onClick={() => adminAddChessParticipant(u.user_id)} style={{ padding: '6px 10px', background: already ? '#334155' : '#22c55e', color: already ? '#94a3b8' : '#001024', border: 'none', borderRadius: 6 }}>{already ? 'Dodano' : 'Dodaj'}</button>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    userTeams.length > 0 ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} style={{ padding: 8, background: '#071013', color: '#e6edf3', border: '1px solid #28363c' }}>
                          <option value="">Wybierz drużynę…</option>
                          {userTeams.map((t: any) => <option key={t.druzyna_id} value={t.nazwa_druzyny}>{t.nazwa_druzyny}</option>)}
                        </select>
                        <button className="register-btn" onClick={handleRegisterTeam} disabled={registering}>{registering ? 'Rejestrowanie…' : 'Zarejestruj drużynę'}</button>
                      </div>
                    ) : <div>Nie masz drużyn w tej dyscyplinie.</div>
                  )
                ) : (
                  <div>Zaloguj się, aby się zapisać.</div>
                )}

                {tournament.data_zamkniecia_zapisow && <div style={{ marginTop: 10, color: '#9fb3c8' }}>Rejestracja zamyka się: {new Date(tournament.data_zamkniecia_zapisow).toLocaleString()}</div>}
              </div>
            </div>
          </div>
        </section>

        {(isAdmin && tournament.dyscyplina === 'Pilka nozna' && tournament.typ_zapisu === 'Drużynowy') && (
          <section style={{ marginTop: 16, background: '#0b1112', padding: 16, borderRadius: 8 }}>
            <h3 style={{ marginTop: 0 }}>Dodaj dowolną drużynę (Admin)</h3>
            <div style={{ color: '#9fb3c8', marginBottom: 8, fontSize: 14 }}>Możesz dodać drużynę bez procesu zgłoszeń. Zapis zostanie od razu zaakceptowany.</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input placeholder="Szukaj…" value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} style={{ padding: 8, background: '#071013', color: '#e6edf3', border: '1px solid #28363c', minWidth: 220 }} />
              <select value={selectedAddTeamId} onChange={(e) => setSelectedAddTeamId(e.target.value ? Number(e.target.value) : '')} style={{ padding: 8, background: '#071013', color: '#e6edf3', border: '1px solid #28363c', minWidth: 260 }}>
                <option value="">Wybierz drużynę…</option>
                {(() => {
                  const existingOwners = new Set<string>(([...accepted, ...pending] as any[]).map((z) => z.user_id))
                  const filtered = allTeams
                    .filter((t) => !teamSearch || (t.nazwa_druzyny || '').toLowerCase().includes(teamSearch.toLowerCase()))
                    .filter((t) => !existingOwners.has(t.owner_id))
                    .slice(0, 200)
                  return filtered.map((t) => (
                    <option key={t.druzyna_id} value={t.druzyna_id}>{t.nazwa_druzyny}</option>
                  ))
                })()}
              </select>
              <button onClick={addTeamAsAdmin} style={{ padding: '8px 12px', background: '#2ecc71', border: 'none', borderRadius: 6 }}>Dodaj drużynę</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#9fb3c8' }}>Ukryto drużyny, których właściciel ma już zgłoszenie do tego turnieju.</div>
          </section>
        )}

        {/* Opis turnieju */}
        <section>
            <div className="description-panel" style={{ marginTop: 12 }}>
              <h3 style={{ marginTop: 0, textAlign: 'center' }}>Opis turnieju</h3>
              <div style={{ color: '#cfe6ea', textAlign: 'center', whiteSpace: 'pre-line' }}>{descriptionText || 'Brak opisu'}</div>
            </div>
          </section>

        <section style={{ marginTop: 16, background: 'var(--navy)', padding: 16, borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>{isIndividual ? 'Zarejestrowani uczestnicy' : 'Zarejestrowane drużyny'}</h3>
          {isIndividual ? (
            <div>
              {(showAllTeams ? accepted : accepted.slice(0, 6)).map((entry) => {
                const label = (() => {
                  const full = (entry.user_info?.imie || entry.user_info?.nazwisko) ? `${entry.user_info?.imie ?? ''} ${entry.user_info?.nazwisko ?? ''}`.trim() : ''
                  return (full || undefined) || entry.user_info?.nazwa_wyswietlana || emailLocal(entry.user_info?.email) || entry.user_id
                })()
                return (
                  <div key={entry.zapis_id} style={{ padding: '6px 0', borderBottom: '1px solid #10181d' }}>
                    {label}
                  </div>
                )
              })}
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


        {/* Tournament view: league table / bracket / swiss */}
        <section style={{ marginTop: 16, background: 'var(--navy)', padding: 16, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Wyniki i przebieg</h3>
            {(isOrganizer || isAdmin) && (
              <div style={{ display: 'flex', gap: 8 }}>
                {(tournament.dyscyplina === 'Pilka nozna' && tournament.typ_zapisu === 'Drużynowy' && tournament.format_rozgrywek === 'Pucharowy') && (
                  <button onClick={generateBracket} disabled={generating} style={{ padding: '6px 10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 6 }}>
                    {generating ? 'Generowanie…' : (matches.length ? 'Przebuduj drabinkę' : 'Wygeneruj drabinkę')}
                  </button>
                )}
                {(tournament.dyscyplina === 'Pilka nozna' && tournament.typ_zapisu === 'Drużynowy' && tournament.format_rozgrywek === 'Pucharowy') && (
                  <button onClick={randomizeRound1} style={{ padding: '6px 10px', background: '#22c55e', color: '#001024', border: 'none', borderRadius: 6 }}>Losuj drabinkę (1. runda)</button>
                )}
                {(tournament.dyscyplina === 'Pilka nozna' && tournament.typ_zapisu === 'Drużynowy' && tournament.format_rozgrywek === 'Liga' && matches.length === 0) && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Cykl:
                      <select value={leagueCycles} onChange={(e) => setLeagueCycles(Number(e.target.value))} style={{ padding: 6, background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                        <option value={1}>1x (każdy z każdym)</option>
                        <option value={2}>2x (mecz i rewanż)</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Start:
                      <input type="date" value={leagueStartDate} onChange={(e) => setLeagueStartDate(e.target.value)} style={{ padding: 6, background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 6 }} />
                      <input type="time" value={leagueStartTime} onChange={(e) => setLeagueStartTime(e.target.value)} style={{ padding: 6, background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 6 }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Co:
                      <input type="number" min={1} value={leagueIntervalDays} onChange={(e) => setLeagueIntervalDays(Number(e.target.value) || 7)} style={{ width: 70, padding: 6, background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 6 }} /> dni
                    </label>
                    <button onClick={generateLeagueFixtures} style={{ padding: '6px 10px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 6 }}>Wygeneruj terminarz (Liga)</button>
                  </div>
                )}
                {(tournament.dyscyplina === 'Pilka nozna' && tournament.typ_zapisu === 'Drużynowy' && tournament.format_rozgrywek === 'Liga' && matches.length > 0 && manageMode) && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={resetLeagueResults} style={{ padding: '6px 10px', background: '#334155', color: '#fff', border: 'none', borderRadius: 6 }}>Reset wyników</button>
                    <button onClick={resetLeagueSchedule} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6 }}>Reset terminarza</button>
                  </div>
                )}
                {(tournament.dyscyplina === 'Szachy') && (
                  <>
                    <button onClick={generateSwissNextRound} style={{ padding: '6px 10px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6 }}>Dodaj rundę (Swiss)</button>
                    <button onClick={resetChessRounds} style={{ padding: '6px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6 }}>Reset rund (Szachy)</button>
                  </>
                )}
                {manageMode && (tournament.format_rozgrywek === 'Liga' || tournament.dyscyplina === 'Szachy') && (
                  <button
                    onClick={saveAllEdits}
                    disabled={Object.keys(edits).length === 0 || !Object.values(edits).some((e: any) => e && (('homeScore' in e) || ('awayScore' in e)))}
                    style={{ padding: '6px 10px', background: '#22c55e', color: '#001024', border: 'none', borderRadius: 6 }}
                  >Zapisz wszystkie</button>
                )}
                <button onClick={() => setManageMode((m) => !m)} style={{ padding: '6px 10px', background: manageMode ? '#334155' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6 }}>
                  {manageMode ? 'Zakończ edycję' : 'Zarządzaj'}</button>
              </div>
            )}
          </div>
            

          {(() => {
            const tType = tournament.dyscyplina === 'Szachy'
              ? 'SWISS_SYSTEM'
              : (tournament.format_rozgrywek === 'Pucharowy' ? 'KNOCKOUT' : 'LEAGUE')
            const swissData = tournament.dyscyplina === 'Szachy'
              ? {
                  standings: computeChessStandings(accepted, matches),
                  rounds: buildSwissRounds(accepted, matches)
                }
              : undefined
            return (
              <TournamentView
                tournamentType={tType as any}
                participants={tvParticipants as any}
                matches={tvMatches as any}
                swiss={swissData as any}
                emptyMessage={isIndividual ? 'Parowania pojawią się po rozpoczęciu rund' : 'Tabela/Drabinka pojawi się po rozpoczęciu meczów'}
                editable={manageMode && (tType === 'KNOCKOUT' || tType === 'LEAGUE' || tType === 'SWISS_SYSTEM')}
                edits={edits}
                onEditChange={(id, field, value) => updateEdit(id, field, value)}
                onSaveMatch={(mm) => {
                  const m = matches.find((x) => x.mecz_id === mm.id)
                  if (m) saveMatch(m)
                }}
                getAllowedTeamsForMatch={(mm: any) => getAllowedTeamsForMatch(matches.find((x) => x.mecz_id === mm.id) || mm)}
                onBulkSetRoundDate={(round, date, time) => setRoundDate(round, date, time)}
                onBulkClearRoundDate={(round) => clearRoundDate(round)}
              />
            )
          })()}
        </section>

        {/* Chat Section */}
        <section style={{ marginTop: 16 }}>
          <ChatBox contextType="turniej" contextId={Number(id)} canWrite={isParticipant} title="Czat turniejowy" />
        </section>
      </div>
    </div>
  )
}
