import React, { useMemo, useState } from 'react'
import { computeTable } from '../lib/footballTable'
import type { Participant as FootParticipant, Match as FootMatch } from '../lib/footballTable'

export type TournamentType = 'GROUP_STAGE' | 'LEAGUE' | 'KNOCKOUT' | 'SWISS_SYSTEM'

export type Participant = { id: string | number; name: string; logo?: string | null }

// For football-like formats
export type Match = FootMatch

// For swiss system
export type SwissStanding = {
  position: number
  title?: string | null
  player: string
  rating?: number | null
  points: number
  tiebreaks?: Record<string, number | string>
}
export type SwissPairing = { white: string; black: string; result?: string }
export type SwissRound = { round: number; pairings: SwissPairing[] }

export type Phase = {
  type: TournamentType
  participants?: Participant[]
  matches?: Match[]
  swiss?: { standings: SwissStanding[]; rounds: SwissRound[] }
  label?: string
}

export type TournamentViewProps = {
  tournamentType?: TournamentType
  participants?: Participant[]
  matches?: Match[]
  swiss?: { standings: SwissStanding[]; rounds: SwissRound[] }
  phases?: Phase[]
  loading?: boolean
  emptyMessage?: string
  // Editing support (used for KNOCKOUT)
  editable?: boolean
  edits?: Record<number, any>
  onEditChange?: (matchId: number, field: 'homeId' | 'awayId' | 'homeScore' | 'awayScore', value: any) => void
  onSaveMatch?: (match: Match) => void
  getAllowedTeamsForMatch?: (match: Match) => Array<string | number>
  // League bulk schedule controls
  onBulkSetRoundDate?: (round: number, date: string, time?: string) => void
  onBulkClearRoundDate?: (round: number) => void
}

const ScrollBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ overflowX: 'auto', overflowY: 'hidden', maxWidth: '100%', border: '1px solid #e5e7eb', borderRadius: 8 }}>
    <div style={{ minWidth: 720, padding: 8 }}>{children}</div>
  </div>
)

const Loading: React.FC = () => <div style={{ padding: 12 }}>Ładowanie…</div>
const Empty: React.FC<{ msg?: string }> = ({ msg }) => <div style={{ padding: 12 }}>{msg || 'Turniej jeszcze się nie rozpoczął.'}</div>

const LeagueTable: React.FC<{ participants: Participant[]; matches: Match[] }> = ({ participants, matches }) => {
  const table = useMemo(() => computeTable(participants as FootParticipant[], matches), [participants, matches])
  return (
    <ScrollBox>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 8 }}>Miejsce</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Nazwa Drużyny</th>
            <th style={{ padding: 8 }}>M</th>
            <th style={{ padding: 8 }}>Pkt</th>
            <th style={{ padding: 8 }}>Z</th>
            <th style={{ padding: 8 }}>R</th>
            <th style={{ padding: 8 }}>P</th>
            <th style={{ padding: 8 }}>Bramki</th>
            <th style={{ padding: 8 }}>Bilans</th>
          </tr>
        </thead>
        <tbody>
          {table.map((r, idx) => (
            <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{idx + 1}</td>
              <td style={{ padding: 8 }}>{r.name}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{r.M}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{r.Pkt}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{r.Z}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{r.R}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{r.P}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{r.GF}:{r.GA}</td>
              <td style={{ padding: 8, textAlign: 'center' }}>{r.GD > 0 ? `+${r.GD}` : r.GD}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollBox>
  )
}

const KnockoutBracket: React.FC<{
  participants: Participant[]
  matches: Match[]
  editable?: boolean
  edits?: Record<number, any>
  onEditChange?: (matchId: number, field: 'homeId' | 'awayId' | 'homeScore' | 'awayScore', value: any) => void
  onSaveMatch?: (match: Match) => void
  getAllowedTeamsForMatch?: (match: Match) => Array<string | number>
}> = ({ participants, matches, editable, edits, onEditChange, onSaveMatch, getAllowedTeamsForMatch }) => {
  // Expect matches to contain round numbers; fallback to single column
  const byRound = useMemo(() => {
    const m = new Map<number, Match[]>()
    for (const match of matches) {
      // @ts-ignore
      const r: number = typeof match.round === 'number' ? match.round : 1
      if (!m.has(r)) m.set(r, [])
      m.get(r)!.push(match)
    }
    const arr = Array.from(m.entries()).sort((a, b) => a[0] - b[0])
    return arr
  }, [matches])

  const nameOf = (id: any) => participants.find((p) => p.id === id)?.name || 'BYE'

  return (
    <ScrollBox>
      <div style={{ display: 'flex', gap: 24, padding: 8 }}>
        {byRound.length === 0 ? (
          <Empty msg="Brak danych drabinki" />
        ) : (
          byRound.map(([round, list]) => (
            <div key={round}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Runda {round}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {list.map((m, i) => {
                  const e = edits?.[m.id as number] || {}
                  const homeId = e.homeId ?? m.homeId
                  const awayId = e.awayId ?? m.awayId
                  const homeScore = e.homeScore ?? m.homeScore
                  const awayScore = e.awayScore ?? m.awayScore
                  const allowed = (getAllowedTeamsForMatch ? getAllowedTeamsForMatch(m) : participants.map((p) => p.id))
                  return (
                    <div key={i} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, minWidth: 260 }}>
                      {!editable ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{nameOf(m.homeId)}</span>
                            <span>{typeof m.homeScore === 'number' ? m.homeScore : '-'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{nameOf(m.awayId)}</span>
                            <span>{typeof m.awayScore === 'number' ? m.awayScore : '-'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            <select value={homeId ?? ''} onChange={(ev) => onEditChange?.(m.id as number, 'homeId', ev.target.value ? (isNaN(Number(ev.target.value)) ? ev.target.value : Number(ev.target.value)) : null)} style={{ padding: 6, background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                              <option value="">Wybierz…</option>
                              {allowed.map((id) => (
                                <option key={String(id)} value={String(id)}>{nameOf(id)}</option>
                              ))}
                            </select>
                            <input type="number" step={1} value={homeScore ?? ''} onChange={(ev) => onEditChange?.(m.id as number, 'homeScore', ev.target.value)} style={{ padding: 6, background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 6 }} />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, alignItems: 'center' }}>
                            <select value={awayId ?? ''} onChange={(ev) => onEditChange?.(m.id as number, 'awayId', ev.target.value ? (isNaN(Number(ev.target.value)) ? ev.target.value : Number(ev.target.value)) : null)} style={{ padding: 6, background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                              <option value="">Wybierz…</option>
                              {allowed.map((id) => (
                                <option key={String(id)} value={String(id)}>{nameOf(id)}</option>
                              ))}
                            </select>
                            <input type="number" step={1} value={awayScore ?? ''} onChange={(ev) => onEditChange?.(m.id as number, 'awayScore', ev.target.value)} style={{ padding: 6, background: '#fff', color: '#111', border: '1px solid #e5e7eb', borderRadius: 6 }} />
                          </div>
                          <div style={{ marginTop: 8, textAlign: 'right' }}>
                            <button onClick={() => onSaveMatch?.(m)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>Zapisz</button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollBox>
  )
}

const SwissView: React.FC<{ standings?: SwissStanding[]; rounds?: SwissRound[] }> = ({ standings, rounds }) => {
  const [active, setActive] = useState(standings && standings.length ? 1 : (rounds && rounds.length ? rounds[0].round : 1))
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Ranking</div>
        <ScrollBox>
          {!standings || standings.length === 0 ? (
            <Empty msg="Brak danych rankingu" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Miejsce</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Tytuł</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Gracz</th>
                  <th style={{ padding: 8 }}>Ranking</th>
                  <th style={{ padding: 8 }}>Punkty</th>
                  {/* dynamic tiebreaks */}
                  {standings[0]?.tiebreaks && Object.keys(standings[0].tiebreaks).map((k) => (
                    <th key={k} style={{ padding: 8 }}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.player} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{s.position}</td>
                    <td style={{ padding: 8 }}>{s.title || ''}</td>
                    <td style={{ padding: 8 }}>{s.player}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>{s.rating ?? ''}</td>
                    <td style={{ padding: 8, textAlign: 'center' }}>{s.points}</td>
                    {s.tiebreaks && Object.keys(s.tiebreaks).map((k) => (
                      <td key={k} style={{ padding: 8, textAlign: 'center' }}>{String(s.tiebreaks![k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollBox>
      </div>

      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>Rundy:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(rounds || []).map((r) => (
              <button key={r.round} onClick={() => setActive(r.round)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: active === r.round ? '#eef2ff' : '#fff' }}>Runda {r.round}</button>
            ))}
          </div>
        </div>
        <ScrollBox>
          {!rounds || rounds.length === 0 ? (
            <Empty msg="Brak danych rund" />
          ) : (
            (rounds.find((r) => r.round === active)?.pairings || []).length === 0 ? (
              <Empty msg="Brak parowań dla tej rundy" />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8 }}>Para</th>
                    <th style={{ padding: 8 }}>Wynik</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.find((r) => r.round === active)!.pairings.map((p, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: 8 }}>{p.white} vs {p.black}</td>
                      <td style={{ padding: 8, textAlign: 'center' }}>{p.result || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </ScrollBox>
      </div>
    </div>
  )
}

const ChessRounds: React.FC<{
  participants: Participant[]
  matches: Match[]
  editable?: boolean
  edits?: Record<number, any>
  onEditChange?: (matchId: number, field: 'homeScore' | 'awayScore', value: any) => void
  onSaveMatch?: (match: Match) => void
}> = ({ participants, matches, editable, edits, onEditChange, onSaveMatch }) => {
  const byRound = useMemo(() => {
    const m = new Map<number, Match[]>()
    for (const match of matches) {
      // @ts-ignore
      const r: number = typeof match.round === 'number' ? match.round : 1
      if (!m.has(r)) m.set(r, [])
      m.get(r)!.push(match)
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0])
  }, [matches])
  const nameOf = (id: any) => participants.find((p) => p.id === id)?.name || (id == null ? 'BYE' : String(id))
  const setResultCombo = (mid: number, val: string) => {
    if (val === '1-0') { onEditChange?.(mid, 'homeScore', 1.0); onEditChange?.(mid, 'awayScore', 0.0) }
    else if (val === '0-1') { onEditChange?.(mid, 'homeScore', 0.0); onEditChange?.(mid, 'awayScore', 1.0) }
    else if (val === '0.5-0.5') { onEditChange?.(mid, 'homeScore', 0.5); onEditChange?.(mid, 'awayScore', 0.5) }
    else { onEditChange?.(mid, 'homeScore', ''); onEditChange?.(mid, 'awayScore', '') }
  }
  const currentCombo = (m: Match, e: any) => {
    const h = e?.homeScore ?? m.homeScore
    const a = e?.awayScore ?? m.awayScore
    if (h === 1 && a === 0) return '1-0'
    if (h === 0 && a === 1) return '0-1'
    if ((h === 0.5 && a === 0.5) || (Number(h) === 0.5 && Number(a) === 0.5)) return '0.5-0.5'
    return ''
  }
  return (
    <ScrollBox>
      {byRound.length === 0 ? (
        <Empty msg="Brak rund" />
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {byRound.map(([round, list]) => (
            <div key={round}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Runda {round}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {list.map((m, i) => {
                  const e = edits?.[m.id as number] || {}
                  const isBye = m.awayId == null || m.homeId == null
                  return (
                    <div key={i} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, minWidth: 420, display: 'grid', gridTemplateColumns: '1fr max-content 1fr max-content', alignItems: 'center', gap: 8 }}>
                      <div style={{ textAlign: 'right' }}>{nameOf(m.homeId)}</div>
                      {editable && !isBye ? (
                        <select value={currentCombo(m, e)} onChange={(ev) => setResultCombo(m.id as number, ev.target.value)} style={{ padding: 6, border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', color: '#111' }}>
                          <option value="">— wybierz wynik —</option>
                          <option value="1-0">1 - 0</option>
                          <option value="0.5-0.5">0.5 - 0.5</option>
                          <option value="0-1">0 - 1</option>
                        </select>
                      ) : (
                        <div style={{ padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, textAlign: 'center' }}>
                          {typeof m.homeScore === 'number' && typeof m.awayScore === 'number' ? `${m.homeScore}-${m.awayScore}` : (isBye ? 'BYE' : '')}
                        </div>
                      )}
                      <div>{nameOf(m.awayId)}</div>
                      {editable && !isBye && (
                        <div style={{ textAlign: 'right' }}>
                          <button onClick={() => onSaveMatch?.(m)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>Zapisz</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollBox>
  )
}

const LeagueFixtures: React.FC<{
  participants: Participant[]
  matches: Match[]
  editable?: boolean
  edits?: Record<number, any>
  onEditChange?: (matchId: number, field: 'homeScore' | 'awayScore', value: any) => void
  onSaveMatch?: (match: Match) => void
  onBulkSetRoundDate?: (round: number, date: string, time?: string) => void
  onBulkClearRoundDate?: (round: number) => void
}> = ({ participants, matches, editable, edits, onEditChange, onSaveMatch, onBulkSetRoundDate, onBulkClearRoundDate }) => {
  const byRound = useMemo(() => {
    const m = new Map<number, Match[]>()
    for (const match of matches) {
      // @ts-ignore
      const r: number = typeof match.round === 'number' ? match.round : 1
      if (!m.has(r)) m.set(r, [])
      m.get(r)!.push(match)
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0])
  }, [matches])

  const nameOf = (id: any) => participants.find((p) => p.id === id)?.name || '—'

  return (
    <ScrollBox>
      {byRound.length === 0 ? (
        <Empty msg="Brak terminarza" />
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {byRound.map(([round, list]) => (
            <div key={round}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>Kolejka {round}</div>
                {editable && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="date" id={`round-date-${round}`} style={{ padding: 6 }} />
                    <input type="time" id={`round-time-${round}`} style={{ padding: 6 }} />
                    <button onClick={() => {
                      const d = (document.getElementById(`round-date-${round}`) as HTMLInputElement)?.value
                      const t = (document.getElementById(`round-time-${round}`) as HTMLInputElement)?.value
                      if (!d) return
                      onBulkSetRoundDate?.(round, d, t || undefined)
                    }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>Ustaw dla kolejki</button>
                    <button onClick={() => onBulkClearRoundDate?.(round)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>Wyczyść daty</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {list.filter((mm) => mm.homeId != null && mm.awayId != null).map((m, i) => {
                  const e = edits?.[m.id as number] || {}
                  const homeScore = e.homeScore ?? m.homeScore
                  const awayScore = e.awayScore ?? m.awayScore
                  return (
                    <div key={i} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, minWidth: 420, display: 'grid', gridTemplateColumns: '1fr max-content max-content max-content 1fr', alignItems: 'center', gap: 8 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div>{nameOf(m.homeId)}</div>
                        {/* @ts-ignore */}
                        {'date' in m && (m as any).date ? <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date((m as any).date).toLocaleString()}</div> : null}
                      </div>
                      {editable ? (
                        <input type="number" step={1} value={homeScore ?? ''} onChange={(ev) => onEditChange?.(m.id as number, 'homeScore', ev.target.value)} style={{ width: 44, padding: 6, border: '1px solid #e5e7eb', borderRadius: 6, textAlign: 'center', background: '#fff', color: '#111' }} />
                      ) : (
                  <div style={{ width: 44, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, textAlign: 'center' }}>{typeof m.homeScore === 'number' ? m.homeScore : ''}</div>
                      )}
                 <div style={{ minWidth: 10, textAlign: 'center' }}>:</div>
                      {editable ? (
                        <input type="number" step={1} value={awayScore ?? ''} onChange={(ev) => onEditChange?.(m.id as number, 'awayScore', ev.target.value)} style={{ width: 44, padding: 6, border: '1px solid #e5e7eb', borderRadius: 6, textAlign: 'center', background: '#fff', color: '#111' }} />
                      ) : (
                  <div style={{ width: 44, padding: '6px 8px', border: '1px solid #e5e7eb', borderRadius: 6, textAlign: 'center' }}>{typeof m.awayScore === 'number' ? m.awayScore : ''}</div>
                      )}
                      <div style={{ textAlign: 'left' }}>
                        <div>{nameOf(m.awayId)}</div>
                      </div>
                      {editable && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
                          <button onClick={() => onSaveMatch?.(m)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb' }}>Zapisz</button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {/* Pauzy (BYE) przy nieparzystej liczbie drużyn */}
                {participants.length % 2 === 1 && (() => {
                  const present = new Set<any>()
                  const visible = list.filter((mm) => mm.homeId != null && mm.awayId != null)
                  visible.forEach((mm) => { present.add(mm.homeId); present.add(mm.awayId) })
                  const resting = participants.filter((p) => !present.has(p.id))
                  if (resting.length === 0) return null
                  return (
                    <div style={{ padding: 8, border: '1px dashed #e5e7eb', borderRadius: 6, background: '#f9fafb' }}>
                      <span style={{ color: '#6b7280' }}>Pauzuje:</span> {resting.map((r) => r.name).join(', ')}
                    </div>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollBox>
  )
}

export default function TournamentView(props: TournamentViewProps) {
  const { tournamentType, participants = [], matches = [], swiss, phases, loading, emptyMessage, editable, edits, onEditChange, onSaveMatch, getAllowedTeamsForMatch, onBulkSetRoundDate, onBulkClearRoundDate } = props

  if (loading) return <Loading />

  // Mixed phases via tabs
  if (phases && phases.length > 0) {
    const [activeIdx, setActiveIdx] = useState(0)
    const active = phases[activeIdx]
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {phases.map((ph, i) => (
            <button key={i} onClick={() => setActiveIdx(i)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: activeIdx === i ? '#eef2ff' : '#fff' }}>{ph.label || ph.type}</button>
          ))}
        </div>
        <PhaseRenderer phase={active} emptyMessage={emptyMessage} />
      </div>
    )
  }

  return <PhaseRenderer phase={{ type: tournamentType || 'LEAGUE', participants, matches, swiss }} emptyMessage={emptyMessage} editable={editable} edits={edits} onEditChange={onEditChange} onSaveMatch={onSaveMatch} getAllowedTeamsForMatch={getAllowedTeamsForMatch} onBulkSetRoundDate={onBulkSetRoundDate} onBulkClearRoundDate={onBulkClearRoundDate} />
}

const PhaseRenderer: React.FC<{ phase: Phase; emptyMessage?: string; editable?: boolean; edits?: Record<number, any>; onEditChange?: TournamentViewProps['onEditChange']; onSaveMatch?: TournamentViewProps['onSaveMatch']; getAllowedTeamsForMatch?: TournamentViewProps['getAllowedTeamsForMatch']; onBulkSetRoundDate?: TournamentViewProps['onBulkSetRoundDate']; onBulkClearRoundDate?: TournamentViewProps['onBulkClearRoundDate'] }> = ({ phase, emptyMessage, editable, edits, onEditChange, onSaveMatch, getAllowedTeamsForMatch, onBulkSetRoundDate, onBulkClearRoundDate }) => {
  const { type, participants = [], matches = [], swiss } = phase
  if ((type === 'LEAGUE' || type === 'GROUP_STAGE') && participants.length > 0) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <LeagueTable participants={participants} matches={matches} />
        <div>
          <div style={{ fontWeight: 700, margin: '8px 0' }}>Terminarz</div>
          <LeagueFixtures
            participants={participants}
            matches={matches}
            editable={editable}
            edits={edits}
            onEditChange={(id, field, value) => onEditChange?.(id, field, value)}
            onSaveMatch={onSaveMatch}
            onBulkSetRoundDate={onBulkSetRoundDate}
            onBulkClearRoundDate={onBulkClearRoundDate}
          />
          {/* Bulk per-round controls are rendered within matchday sections via callbacks */}
          {false && onBulkSetRoundDate && onBulkClearRoundDate}
        </div>
      </div>
    )
  }
  if (type === 'KNOCKOUT' && participants.length > 0) {
    return <KnockoutBracket participants={participants} matches={matches} editable={editable} edits={edits} onEditChange={onEditChange} onSaveMatch={onSaveMatch} getAllowedTeamsForMatch={getAllowedTeamsForMatch} />
  }
  if (type === 'SWISS_SYSTEM') {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <SwissView standings={swiss?.standings} rounds={swiss?.rounds} />
        <div>
          <div style={{ fontWeight: 700, margin: '8px 0' }}>Rundy (edycja)</div>
          <ChessRounds participants={participants} matches={matches} editable={editable} edits={edits} onEditChange={(id, field, value) => onEditChange?.(id, field, value)} onSaveMatch={onSaveMatch} />
        </div>
      </div>
    )
  }
  return <Empty msg={emptyMessage} />
}
