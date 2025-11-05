export type Participant = { id: string | number; name: string }
export type Match = {
  id?: string | number
  homeId: string | number
  awayId: string | number
  homeScore?: number | null
  awayScore?: number | null
}

export type TableRow = {
  id: string | number
  name: string
  M: number
  Z: number
  R: number
  P: number
  GF: number
  GA: number
  GD: number
  Pkt: number
}

export function computeTable(participants: Participant[], matches: Match[]): TableRow[] {
  const map: Record<string | number, TableRow> = {}
  for (const p of participants) {
    map[p.id] = { id: p.id, name: p.name, M: 0, Z: 0, R: 0, P: 0, GF: 0, GA: 0, GD: 0, Pkt: 0 }
  }
  for (const m of matches) {
    const a = map[m.homeId]
    const b = map[m.awayId]
    if (!a || !b) continue
    const hs = typeof m.homeScore === 'number' ? m.homeScore : null
    const as = typeof m.awayScore === 'number' ? m.awayScore : null
    if (hs === null || as === null) continue // not played
    a.M += 1; b.M += 1
    a.GF += hs; a.GA += as
    b.GF += as; b.GA += hs
    if (hs > as) { a.Z += 1; b.P += 1; a.Pkt += 3 }
    else if (hs < as) { b.Z += 1; a.P += 1; b.Pkt += 3 }
    else { a.R += 1; b.R += 1; a.Pkt += 1; b.Pkt += 1 }
  }
  for (const id in map) {
    const r = map[id]
    r.GD = r.GF - r.GA
  }
  const rows = Object.values(map)
  rows.sort((x, y) => {
    if (y.Pkt !== x.Pkt) return y.Pkt - x.Pkt
    if (y.GD !== x.GD) return y.GD - x.GD
    if (y.GF !== x.GF) return y.GF - x.GF
    return x.name.localeCompare(y.name)
  })
  return rows
}
