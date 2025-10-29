import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import supabase from '../lib/supabaseClient'
import { Link } from 'react-router-dom'

export default function ProfilePage() {
  const { user, isAuthenticated } = useAuth0()
  const [ownedTeams, setOwnedTeams] = useState<any[]>([])
  const [memberOf, setMemberOf] = useState<any[]>([])
  const [played, setPlayed] = useState<any[]>([])

  const fetchData = async () => {
    if (!isAuthenticated || !user) return
    
    const uid = (user as any).sub
    try {
      const { data: owned } = await supabase.from('druzyny').select('*').eq('owner_id', uid)
      setOwnedTeams((owned as any[]) || [])

  // memberships
  const { data: mems } = await supabase.from('teammembers').select('*').eq('user_id', uid).eq('status', 'accepted')
      const teamIds = (mems as any[] || []).map((m) => m.druzyna_id)
      let memberTeams: any[] = []
      if (teamIds.length) {
        const { data: mts } = await supabase.from('druzyny').select('*').in('druzyna_id', teamIds)
        memberTeams = (mts as any[]) || []
      }
      setMemberOf(memberTeams)

      // played tournaments
  const { data: z } = await supabase.from('zapisy').select('*, turnieje(*)').eq('user_id', uid)
      setPlayed((z as any[]) || [])

      // no incoming team requests here — those are handled on the tournament/team pages
    } catch (err) {
      console.error(err)
    } finally {
      // finished
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user])

  // no team-request decision handler in profile (handled per-team or tournament)

  if (!isAuthenticated) return <div style={{ padding: 20 }}>Zaloguj się, aby zobaczyć profil</div>

  return (
    <div style={{ padding: 20 }}>
      <h2>Profil użytkownika</h2>
      <p>{(user as any)?.name || (user as any)?.email}</p>

      <h3>Twoje drużyny (właściciel)</h3>
      <ul>
        {ownedTeams.map((t) => (
          <li key={t.druzyna_id}><Link to={`/teams/${t.druzyna_id}`}>{t.nazwa_druzyny}</Link></li>
        ))}
      </ul>

      <h3>Drużyny, których jesteś członkiem</h3>
      <ul>
        {memberOf.map((t) => (
          <li key={t.druzyna_id}><Link to={`/teams/${t.druzyna_id}`}>{t.nazwa_druzyny}</Link></li>
        ))}
      </ul>

      <h3>Rozegrane / zapisane turnieje</h3>
      <ul>
        {played.map((z, idx) => (
          <li key={idx}>{z.turnieje?.nazwa || z.turniej_id} — status: {z.status}</li>
        ))}
      </ul>

      {/* incoming requests moved to team/tournament pages */}
    </div>
  )
}
