import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import supabase from '../lib/supabaseClient'
import { Link } from 'react-router-dom'
import './NotificationBox.css'

interface Notification {
  powiadomienie_id: number
  user_id: string
  tresc: string
  typ: string
  link: string | null
  przeczytane: boolean
  created_at: string
}

export default function NotificationBox() {
  const { isAuthenticated, user } = useAuth0()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  // State for guest tooltip
  const [showGuestInfo, setShowGuestInfo] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const fetchNotifications = async () => {
      const uid = (user as any).sub
      const { data, error } = await supabase
        .from('powiadomienia')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.przeczytane).length)
      }
    }

    fetchNotifications()

    // Optional: Subscribe to realtime changes
    const channel = supabase
      .channel('public:powiadomienia')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'powiadomienia', filter: `user_id=eq.${(user as any).sub}` }, (payload) => {
        const newNotif = payload.new as Notification
        setNotifications(prev => [newNotif, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated, user])

  const markAsRead = async (id: number) => {
    const { error } = await supabase
      .from('powiadomienia')
      .update({ przeczytane: true })
      .eq('powiadomienie_id', id)

    if (!error) {
      setNotifications(prev => prev.map(n => n.powiadomienie_id === id ? { ...n, przeczytane: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleNotificationClick = (n: Notification) => {
    if (!n.przeczytane) {
      markAsRead(n.powiadomienie_id)
    }
    setIsOpen(false)
  }

  // Placeholder SVG icon (Bell)
  const BellIcon = ({ color }: { color: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16ZM16 17H8V11C8 8.52 9.51 6.5 12 6.5C14.49 6.5 16 8.52 16 11V17Z" fill={color}/>
    </svg>
  )

  if (!isAuthenticated) {
    return (
      <div className="notification-wrapper">
        <div 
          className="notification-trigger guest-trigger" 
          onClick={() => setShowGuestInfo(!showGuestInfo)}
          title="Powiadomienia"
        >
          {/* Placeholder icon for guest - Blue */}
          <BellIcon color="#3b82f6" />
        </div>
        
        {showGuestInfo && (
          <div className="notification-dropdown guest-dropdown">
            <div className="notification-content-simple">
              Hej, zapraszamy do korzystania z naszej strony :)
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="notification-wrapper">
      <div 
        className={`notification-trigger user-trigger ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {/* Placeholder icon for user - Green normally, Red if unread */}
        <BellIcon color={unreadCount > 0 ? "#ef4444" : "#10b981"} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </div>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            Witaj w systemie powiadomień
          </div>
          {notifications.length === 0 ? (
            <div className="notification-empty">Brak powiadomień</div>
          ) : (
            notifications.map(n => (
              <div key={n.powiadomienie_id} className={`notification-item ${n.przeczytane ? 'read' : 'unread'}`}>
                <div className="notification-content">
                  <p>{n.tresc}</p>
                  <small>{new Date(n.created_at).toLocaleString()}</small>
                </div>
                {n.link ? (
                  <Link to={n.link} onClick={() => handleNotificationClick(n)} className="notification-link">
                    Zobacz
                  </Link>
                ) : (
                  !n.przeczytane && <button onClick={() => markAsRead(n.powiadomienie_id)} className="mark-read-btn">OK</button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
