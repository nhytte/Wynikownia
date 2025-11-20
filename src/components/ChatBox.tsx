import { useEffect, useState, useRef } from 'react'
import supabase from '../lib/supabaseClient'
import { useAuth0 } from '@auth0/auth0-react'
import './ChatBox.css'

interface Message {
  wiadomosc_id: number
  user_id: string
  tresc: string
  created_at: string
  uzytkownicy?: {
    imie: string | null
    nazwisko: string | null
    nazwa_wyswietlana: string | null
  }
}

interface ChatBoxProps {
  contextType: 'druzyna' | 'turniej'
  contextId: number
  canWrite: boolean
  title?: string
  onMessageReceived?: () => void
  isActive?: boolean
}

export default function ChatBox({ contextType, contextId, canWrite, title = 'Czat', onMessageReceived, isActive = false }: ChatBoxProps) {
  const { user } = useAuth0()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const lastMessageDateRef = useRef<string>(new Date(0).toISOString())
  const currentUserId = (user as any)?.sub
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const lastReadStorageKey = `chat_last_read_${contextType}_${contextId}`

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' })
    }
  }

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch current user profile for optimistic updates
  useEffect(() => {
    if (currentUserId) {
      supabase.from('uzytkownicy')
        .select('imie, nazwisko, nazwa_wyswietlana')
        .eq('user_id', currentUserId)
        .maybeSingle()
        .then(({ data }) => { if (data) setCurrentUserProfile(data) })
    }
  }, [currentUserId])

  // Update ref when messages change to keep track of latest
  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1]
      // Only update if it's a real message (positive ID)
      if (last.wiadomosc_id > 0 && new Date(last.created_at) > new Date(lastMessageDateRef.current)) {
        lastMessageDateRef.current = last.created_at
      }
    }
  }, [messages])

  // Handle read status
  useEffect(() => {
    if (messages.length === 0) return

    const lastMsg = messages[messages.length - 1]
    const lastMsgTime = new Date(lastMsg.created_at).getTime()
    const storedLastRead = localStorage.getItem(lastReadStorageKey)
    const lastReadTime = storedLastRead ? parseInt(storedLastRead, 10) : 0

    if (isActive) {
      // If active, mark as read immediately
      if (lastMsgTime > lastReadTime) {
        localStorage.setItem(lastReadStorageKey, lastMsgTime.toString())
      }
    } else {
      // If not active, check if unread
      if (lastMsgTime > lastReadTime) {
        if (onMessageReceived) onMessageReceived()
      }
    }
  }, [messages, isActive, lastReadStorageKey, onMessageReceived])

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('wiadomosci')
        .select('*, uzytkownicy(imie, nazwisko, nazwa_wyswietlana)')
        .eq('typ', contextType)
        .eq('cel_id', contextId)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data as any[])
      }
    }

    fetchMessages()

    // Realtime subscription
    const channel = supabase
      .channel(`chat:${contextType}:${contextId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'wiadomosci', 
        filter: `typ=eq.${contextType} AND cel_id=eq.${contextId}` 
      }, async (payload) => {
        // Fetch user details for the new message
        const { data: userData } = await supabase
          .from('uzytkownicy')
          .select('imie, nazwisko, nazwa_wyswietlana')
          .eq('user_id', payload.new.user_id)
          .single()
        
        const newMsg = { ...payload.new, uzytkownicy: userData } as Message
        setMessages(prev => {
          if (prev.some(m => m.wiadomosc_id === newMsg.wiadomosc_id)) return prev
          if (onMessageReceived) onMessageReceived()
          return [...prev, newMsg]
        })
        setTimeout(scrollToBottom, 100)
      })
      .subscribe()

    // Polling fallback (every 5 seconds)
    const interval = setInterval(async () => {
      const lastDate = lastMessageDateRef.current
      const { data, error } = await supabase
        .from('wiadomosci')
        .select('*, uzytkownicy(imie, nazwisko, nazwa_wyswietlana)')
        .eq('typ', contextType)
        .eq('cel_id', contextId)
        .gt('created_at', lastDate)
        .order('created_at', { ascending: true })

      if (!error && data && data.length > 0) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.wiadomosc_id))
          const uniqueNew = (data as Message[]).filter(m => !existingIds.has(m.wiadomosc_id))
          if (uniqueNew.length === 0) return prev
          if (onMessageReceived) onMessageReceived()
          return [...prev, ...uniqueNew]
        })
        setTimeout(scrollToBottom, 100)
      }
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [contextType, contextId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId) return

    const tempId = -Date.now()
    const tempMsg: Message = {
      wiadomosc_id: tempId,
      user_id: currentUserId,
      tresc: newMessage.trim(),
      created_at: new Date().toISOString(),
      uzytkownicy: currentUserProfile || {
        imie: user?.given_name || null,
        nazwisko: user?.family_name || null,
        nazwa_wyswietlana: user?.nickname || user?.name || 'Ja'
      }
    }

    // Optimistic update
    setMessages(prev => [...prev, tempMsg])
    setNewMessage('')

    const { data, error } = await supabase.from('wiadomosci').insert({
      user_id: currentUserId,
      tresc: tempMsg.tresc,
      typ: contextType,
      cel_id: contextId
    }).select().single()

    if (error) {
      console.error('Error sending message:', error)
      // Rollback
      setMessages(prev => prev.filter(m => m.wiadomosc_id !== tempId))
      setNewMessage(tempMsg.tresc)
    } else {
      // Success - replace temp with real
      setMessages(prev => {
        // Check if real message already arrived via realtime/polling
        if (prev.some(m => m.wiadomosc_id === data.wiadomosc_id)) {
           return prev.filter(m => m.wiadomosc_id !== tempId)
        }
        // Otherwise replace temp with real (preserving user info)
        return prev.map(m => m.wiadomosc_id === tempId ? { ...m, ...data } : m)
      })
    }
  }

  const getUserDisplayName = (msg: Message) => {
    const u = msg.uzytkownicy
    if (!u) return 'Użytkownik'
    if (u.imie && u.nazwisko) return `${u.imie} ${u.nazwisko}`
    return u.nazwa_wyswietlana || 'Użytkownik'
  }

  return (
    <div className="chat-container panel">
      <div className="chat-header">{title}</div>
      <div className="chat-messages" ref={chatContainerRef}>
        {messages.map((msg, index) => {
          const isMe = msg.user_id === currentUserId
          const prevMsg = messages[index - 1]
          const isSameUser = prevMsg && prevMsg.user_id === msg.user_id
          
          // Check if time difference is small (e.g. less than 5 minutes) to group
          const isCloseInTime = prevMsg && (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000)
          
          const showHeader = !isSameUser || !isCloseInTime

          return (
            <div key={msg.wiadomosc_id} className={`chat-message-row ${isMe ? 'me' : 'other'} ${!showHeader ? 'grouped' : ''}`}>
              <div className="chat-bubble">
                {showHeader && <div className="chat-author">{getUserDisplayName(msg)}</div>}
                <div className="chat-text">{msg.tresc}</div>
                <div className="chat-time">{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
          )
        })}
      </div>
      {canWrite ? (
        <form className="chat-input-area" onSubmit={handleSend}>
          <input 
            type="text" 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)} 
            placeholder="Napisz wiadomość..." 
          />
          <button type="submit" className="td-btn td-blue">Wyślij</button>
        </form>
      ) : (
        <div className="chat-disabled">Tylko uczestnicy mogą pisać</div>
      )}
    </div>
  )
}
