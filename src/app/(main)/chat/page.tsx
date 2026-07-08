'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { MessageCircle, Users, Send, Search, ChevronLeft, Plus, X } from 'lucide-react'

interface Lite { id: string; name: string | null; image: string | null; username: string | null }
interface RoomMsg { id: string; content: string; createdAt: string; author: Lite }
interface DM { id: string; content: string; createdAt: string; senderId: string; sender: Lite }
interface Convo { id: string; other: Lite; lastMessage: { content: string; createdAt: string; senderId: string } | null; unread: boolean }

type Tab = 'room' | 'dm'

function ago(iso: string) {
  const d = new Date(iso); const m = Math.round((Date.now() - d.getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60); if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

/* ================= Chat room (community or coach room) ================= */
function RoomChat({ meId, room }: { meId: string; room: string }) {
  const [messages, setMessages] = useState<RoomMsg[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const lastAt = useRef<string | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  const merge = useCallback((incoming: RoomMsg[]) => {
    if (!incoming.length) return
    setMessages(prev => {
      const ids = new Set(prev.map(m => m.id))
      const fresh = incoming.filter(m => !ids.has(m.id))
      if (!fresh.length) return prev
      lastAt.current = fresh[fresh.length - 1].createdAt
      return [...prev, ...fresh]
    })
  }, [])

  useEffect(() => {
    let alive = true
    const q = `room=${encodeURIComponent(room)}`
    fetch(`/api/chat/room?${q}`).then(r => r.json()).then((d: RoomMsg[]) => {
      if (!alive || !Array.isArray(d)) return
      setMessages(d)
      if (d.length) lastAt.current = d[d.length - 1].createdAt
    })
    const id = setInterval(() => {
      if (!lastAt.current) return
      fetch(`/api/chat/room?${q}&since=${encodeURIComponent(lastAt.current)}`).then(r => r.json()).then(d => { if (Array.isArray(d)) merge(d) })
    }, 3000)
    return () => { alive = false; clearInterval(id) }
  }, [merge, room])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const t = text.trim(); if (!t || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/chat/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: t, room }) })
      if (res.ok) { setText(''); merge([await res.json()]) }
    } finally { setSending(false) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && <p className="text-center text-sm text-ink3 py-8">No messages yet — say hi 👋</p>}
        {messages.map(m => {
          const mine = m.author.id === meId
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              <Avatar src={m.author.image} name={m.author.name} size="xs" />
              <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="flex items-center gap-1.5">
                  {!mine && <span className="text-xs font-semibold text-ink">{m.author.name || 'Trader'}</span>}
                  <span className="text-[10px] text-ink3">{ago(m.createdAt)}</span>
                </div>
                <div className={`mt-0.5 rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${mine ? 'bg-yellow-500 text-black' : 'bg-elevated text-ink'}`}>
                  {m.content}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-line">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Message the community…"
          className="flex-1 bg-sunken border border-line rounded-full px-4 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3" />
        <button type="submit" disabled={sending || !text.trim()} className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-yellow-500 text-black disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

/* ================= Direct messages ================= */
function DMs({ meId }: { meId: string }) {
  const [convos, setConvos] = useState<Convo[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [other, setOther] = useState<Lite | null>(null)
  const [msgs, setMsgs] = useState<DM[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [coaches, setCoaches] = useState<Lite[]>([])
  const lastAt = useRef<string | null>(null)
  const bottom = useRef<HTMLDivElement>(null)

  const loadConvos = useCallback(() => {
    fetch('/api/chat/conversations').then(r => r.json()).then(d => { if (Array.isArray(d)) setConvos(d) })
  }, [])

  useEffect(() => {
    fetch('/api/chat/coaches').then(r => r.json()).then(d => { if (Array.isArray(d)) setCoaches(d) }).catch(() => {})
  }, [])

  useEffect(() => {
    loadConvos()
    const id = setInterval(loadConvos, 5000)
    return () => clearInterval(id)
  }, [loadConvos])

  // load + poll active thread
  useEffect(() => {
    if (!activeId) return
    let alive = true
    lastAt.current = null
    fetch(`/api/chat/conversations/${activeId}`).then(r => r.json()).then(d => {
      if (!alive) return
      setMsgs(d.messages ?? [])
      setOther(d.other ?? null)
      const last = d.messages?.[d.messages.length - 1]
      if (last) lastAt.current = last.createdAt
      loadConvos()
    })
    const id = setInterval(() => {
      if (!lastAt.current) return
      fetch(`/api/chat/conversations/${activeId}?since=${encodeURIComponent(lastAt.current)}`).then(r => r.json()).then(d => {
        const incoming: DM[] = d.messages ?? []
        if (incoming.length) {
          setMsgs(prev => {
            const ids = new Set(prev.map(m => m.id))
            const fresh = incoming.filter(m => !ids.has(m.id))
            if (!fresh.length) return prev
            lastAt.current = fresh[fresh.length - 1].createdAt
            return [...prev, ...fresh]
          })
        }
      })
    }, 3000)
    return () => { alive = false; clearInterval(id) }
  }, [activeId, loadConvos])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const t = text.trim(); if (!t || sending || !activeId) return
    setSending(true)
    try {
      const res = await fetch(`/api/chat/conversations/${activeId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: t }) })
      if (res.ok) {
        const m: DM = await res.json()
        setText('')
        setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
        lastAt.current = m.createdAt
        loadConvos()
      }
    } finally { setSending(false) }
  }

  async function openWith(userId: string) {
    const res = await fetch('/api/chat/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    if (res.ok) { const { id } = await res.json(); setShowNew(false); setActiveId(id) }
  }

  return (
    <div className="flex h-full">
      {/* conversation list */}
      <div className={`w-full sm:w-64 shrink-0 border-r border-line flex-col ${activeId ? 'hidden sm:flex' : 'flex'}`}>
        <div className="flex items-center justify-between p-3 border-b border-line">
          <span className="text-sm font-bold text-ink">Messages</span>
          <button onClick={() => setShowNew(true)} className="p-1.5 rounded-lg text-ink3 hover:text-yellow-500 hover:bg-elevated" title="New message">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Chat with a coach */}
        {coaches.length > 0 && (
          <div className="p-3 border-b border-line">
            <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-2">Chat with a coach</p>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {coaches.map(c => (
                <button key={c.id} onClick={() => openWith(c.id)} className="flex flex-col items-center gap-1 shrink-0 w-14 group">
                  <span className="relative">
                    <Avatar src={c.image} name={c.name} size="md" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-yellow-500 border-2 border-surface grid place-items-center">
                      <span className="text-[7px] font-black text-black">C</span>
                    </span>
                  </span>
                  <span className="text-[10px] text-ink2 truncate w-full text-center group-hover:text-ink">{c.name?.split(' ')[0] || 'Coach'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {convos.length === 0 ? (
            <p className="text-center text-xs text-ink3 p-6">No conversations yet.</p>
          ) : convos.map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full flex items-center gap-2.5 p-3 text-left border-b border-line hover:bg-elevated transition-colors ${activeId === c.id ? 'bg-elevated' : ''}`}>
              <Avatar src={c.other.image} name={c.other.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className={`text-sm truncate ${c.unread ? 'font-bold text-ink' : 'font-medium text-ink2'}`}>{c.other.name || 'Trader'}</p>
                <p className="text-xs text-ink3 truncate">{c.lastMessage ? (c.lastMessage.senderId === meId ? 'You: ' : '') + c.lastMessage.content : 'New conversation'}</p>
              </div>
              {c.unread && <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* thread */}
      <div className={`flex-1 flex-col min-w-0 ${activeId ? 'flex' : 'hidden sm:flex'}`}>
        {!activeId ? (
          <div className="flex-1 grid place-items-center text-sm text-ink3">Select a conversation</div>
        ) : (
          <>
            <div className="flex items-center gap-2 p-3 border-b border-line">
              <button onClick={() => setActiveId(null)} className="sm:hidden p-1 text-ink3"><ChevronLeft className="w-5 h-5" /></button>
              {other && <Avatar src={other.image} name={other.name} size="sm" />}
              <span className="text-sm font-bold text-ink truncate">{other?.name || 'Conversation'}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {msgs.map(m => {
                const mine = m.senderId === meId
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${mine ? 'bg-yellow-500 text-black' : 'bg-elevated text-ink'}`}>
                      {m.content}
                      <span className={`block text-[10px] mt-0.5 ${mine ? 'text-black/60' : 'text-ink3'}`}>{ago(m.createdAt)}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={bottom} />
            </div>
            <form onSubmit={send} className="flex items-center gap-2 p-3 border-t border-line">
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Write a message…"
                className="flex-1 bg-sunken border border-line rounded-full px-4 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3" />
              <button type="submit" disabled={sending || !text.trim()} className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-yellow-500 text-black disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>

      {showNew && <NewMessage meId={meId} onClose={() => setShowNew(false)} onPick={openWith} />}
    </div>
  )
}

function NewMessage({ meId, onClose, onPick }: { meId: string; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Lite[]>([])

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(q || 'a')}`).then(r => r.json()).then(d => {
        if (Array.isArray(d)) setResults(d.filter((u: Lite) => u.id !== meId).slice(0, 12))
      }).catch(() => {})
    }, 200)
    return () => clearTimeout(t)
  }, [q, meId])

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl border border-line max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 className="font-bold text-ink">New message</h2>
          <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search className="w-4 h-4 text-ink3 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="Search traders…"
              className="w-full bg-sunken border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-2">
          {results.map(u => (
            <button key={u.id} onClick={() => onPick(u.id)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-elevated transition-colors">
              <Avatar src={u.image} name={u.name} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink truncate">{u.name || 'Trader'}</p>
                <p className="text-xs text-ink3 truncate">@{u.username || 'trader'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ================= page ================= */
export default function ChatPage() {
  const { data: session } = useSession()
  const meId = session?.user?.id || ''
  const [tab, setTab] = useState<Tab>('room')
  const [coaches, setCoaches] = useState<Lite[]>([])
  const [room, setRoom] = useState('community')

  useEffect(() => {
    fetch('/api/chat/coaches').then(r => r.json()).then(d => { if (Array.isArray(d)) setCoaches(d) }).catch(() => {})
  }, [])

  const rooms = [
    { id: 'community', name: 'Community' },
    ...coaches.map(c => ({ id: `coach:${c.id}`, name: `${c.name?.split(' ')[0] || 'Coach'}'s Room` })),
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Chat</h1>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('room')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'room' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
          <Users className="w-4 h-4" /> Rooms
        </button>
        <button onClick={() => setTab('dm')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'dm' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
          <MessageCircle className="w-4 h-4" /> Messages
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-line overflow-hidden h-[calc(100vh-14rem)] min-h-[420px]">
        {meId && (tab === 'room' ? (
          <div className="flex flex-col h-full">
            {/* room selector */}
            <div className="flex gap-2 overflow-x-auto p-2 border-b border-line shrink-0 scrollbar-none">
              {rooms.map(r => (
                <button key={r.id} onClick={() => setRoom(r.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${room === r.id ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
                  {r.name}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              <RoomChat key={room} meId={meId} room={room} />
            </div>
          </div>
        ) : <DMs meId={meId} />)}
      </div>
    </div>
  )
}
