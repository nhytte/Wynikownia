import { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'
import { useAuth0 } from '@auth0/auth0-react'
import './UrgentAnnouncements.css'

interface Announcement {
  wiadomosc_id: number
  tresc: string
  created_at: string
}

interface UrgentAnnouncementsProps {
  contextId: number
  contextType: 'turniej' | 'druzyna'
  canPost: boolean
}

export default function UrgentAnnouncements({ contextId, contextType, canPost }: UrgentAnnouncementsProps) {
  const { user } = useAuth0()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [isSending, setIsSending] = useState(false)

  const msgType = contextType === 'turniej' ? 'turniej_pilne' : 'druzyna_pilne'
  const label = contextType === 'turniej' ? 'Ogłoszenia organizatora' : 'Ogłoszenia kapitana'

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from('wiadomosci')
        .select('wiadomosc_id, tresc, created_at')
        .eq('typ', msgType)
        .eq('cel_id', contextId)
        .order('created_at', { ascending: false })
      
      if (data) setAnnouncements(data)
    }

    fetchAnnouncements()

    const channel = supabase
      .channel(`urgent:${contextType}:${contextId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'wiadomosci', 
        filter: `typ=eq.${msgType} AND cel_id=eq.${contextId}` 
      }, (payload) => {
        setAnnouncements(prev => [payload.new as Announcement, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [contextId, contextType, msgType])

  const handleSend = async () => {
    if (!newAnnouncement.trim() || !user) return
    setIsSending(true)
    
    const { error } = await supabase.from('wiadomosci').insert({
      user_id: (user as any).sub,
      tresc: newAnnouncement.trim(),
      typ: msgType,
      cel_id: contextId
    })

    if (!error) {
      setNewAnnouncement('')
      alert('Wysłano pilną wiadomość.')
    } else {
      console.error(error)
      alert('Błąd wysyłania.')
    }
    setIsSending(false)
  }

  return (
    <div className="urgent-wrapper">
      <div className="urgent-trigger" onClick={() => setIsOpen(!isOpen)}>
        <div className="urgent-icon-box">
          <span className="material-symbols-outlined">campaign</span>
          {announcements.length > 0 && <span className="urgent-badge">{announcements.length}</span>}
        </div>
        <div className="urgent-label">{label}</div>
      </div>

      {isOpen && (
        <div className="urgent-dropdown panel">
          <div className="urgent-header">
            <h3>Ważne komunikaty ({announcements.length})</h3>
            <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="urgent-list">
            {announcements.length === 0 ? (
              <div className="urgent-empty">Brak ogłoszeń</div>
            ) : (
              announcements.map(a => (
                <div key={a.wiadomosc_id} className="urgent-item">
                  <div className="urgent-date">{new Date(a.created_at).toLocaleString()}</div>
                  <div className="urgent-text">{a.tresc}</div>
                </div>
              ))
            )}
          </div>

          {canPost && (
            <div className="urgent-admin-area">
              <h4>Wyślij pilną wiadomość</h4>
              <textarea 
                value={newAnnouncement}
                onChange={e => setNewAnnouncement(e.target.value)}
                placeholder="Wpisz treść ogłoszenia..."
                rows={3}
              />
              <button 
                className="td-btn td-danger" 
                onClick={handleSend}
                disabled={isSending}
              >
                {isSending ? 'Wysyłanie...' : 'Wyślij do wszystkich'}
              </button>
              <small>Wiadomość trafi do powiadomień wszystkich członków.</small>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
