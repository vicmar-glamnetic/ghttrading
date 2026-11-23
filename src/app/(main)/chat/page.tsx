'use client'
import Link from 'next/link'
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Avatar } from '@/components/ui/Avatar'
import { MessageCircle, Users, Send, Search, ChevronLeft, Plus, X, ImagePlus, Loader2 } from 'lucide-react'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { uploadToBlob, validateImage, friendlyUploadError } from '@/lib/upload'
import { markRoomSeen, isRoomUnseen, SEEN_EVENT } from '@/lib/chatSeen'

interface Lite { id: string; name: string | null; image: string | null; username: string | null }
interface RoomMsg { id: string; content: string; image?: string | null; createdAt: string; author: Lite }
interface DM { id: string; content: string; image?: string | null; createdAt: string; senderId: string; sender: Lite }
interface Convo { id: string; other: Lite; lastMessage: { content: string; createdAt: string; senderId: string } | null; unread: boolean }

type Tab = 'room' | 'dm'

function ago(iso: string) {
  const d = new Date(iso); const m = Math.round((Date.now() - d.getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60); if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

/* ================= Shared: message box with a photo button ================= */
function Composer({ placeholder, onSend }: { placeholder: string; onSend: (content: string, image: string | null) => Promise<boolean> }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // The photo uploads as soon as it's picked, so Send is instant.
  async function pick(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) { setError(invalid); return }
    setError('')
    setUploading(true)
    try { setImage((await uploadToBlob(file)).url) }
    catch (e) { setError(friendlyUploadError(e)) }
    finally { setUploading(false) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const t = text.trim()
    if ((!t && !image) || sending || uploading) return
    setSending(true)
    try {
      if (await onSend(t, image)) { setText(''); setImage(null); setError('') }
      else setError('Message not sent. Try again.')
    } finally { setSending(false) }
  }

  return (
    <div className="border-t border-line">
      {(image || uploading || error) && (
        <div className="flex items-center gap-2 px-3 pt-2">
          {uploading && <span className="grid h-14 w-14 place-items-center rounded-lg bg-sunken border border-line"><Loader2 className="h-4 w-4 animate-spin text-ink3" /></span>}
          {image && (
            <span className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob upload preview */}
              <img src={image} alt="" className="h-14 w-14 rounded-lg object-cover border border-line" />
              <button type="button" onClick={() => setImage(null)} aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/80 text-white">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}
      <form onSubmit={submit} className="flex items-center gap-2 p-3">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => pick(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Add a photo" title="Add a photo"
          className="shrink-0 grid place-items-center w-10 h-10 rounded-full text-ink3 hover:text-yellow-500 hover:bg-elevated disabled:opacity-50 transition-colors">
          <ImagePlus className="w-5 h-5" />
        </button>
        <input value={text} onChange={e => setText(e.target.value)} placeholder={placeholder}
          className="flex-1 min-w-0 bg-sunken border border-line rounded-full px-4 py-2 text-sm text-ink outline-none focus:border-yellow-500/40 placeholder-ink3" />
        <button type="submit" disabled={sending || uploading || (!text.trim() && !image)} aria-label="Send"
          className="shrink-0 grid place-items-center w-10 h-10 rounded-full bg-yellow-500 text-black disabled:opacity-50">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}

/** A photo in a message bubble; tap to view full size. */
function MessagePhoto({ src, onOpen }: { src: string; onOpen: (src: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(src)} className="block overflow-hidden rounded-xl cursor-zoom-in">
      {/* eslint-disable-next-line @next/next/no-img-element -- Blob upload */}
      <img src={src} alt="Photo" loading="lazy" className="max-h-64 w-auto max-w-full object-cover" />
    </button>
  )
}

/* ================= Chat room (community or coach room) ================= */
function RoomChat({ meId, room }: { meId: string; room: string }) {
  const [messages, setMessages] = useState<RoomMsg[]>([])
  const [zoom, setZoom] = useState<string | null>(null)
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
    const catchUp = () => {
      if (document.hidden || !lastAt.current) return
      fetch(`/api/chat/room?${q}&since=${encodeURIComponent(lastAt.current)}`).then(r => r.json()).then(d => { if (Array.isArray(d)) merge(d) })
    }
    const id = setInterval(catchUp, 4000)
    document.addEventListener('visibilitychange', catchUp)
    return () => { alive = false; clearInterval(id); document.removeEventListener('visibilitychange', catchUp) }
  }, [merge, room])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send(content: string, image: string | null) {
    const res = await fetch('/api/chat/room', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, image, room }) })
    if (!res.ok) return false
    merge([await res.json()])
    return true
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && <p className="text-center text-sm text-ink3 py-8">No messages yet — say hi 👋</p>}
        {messages.map(m => {
          const mine = m.author.id === meId
          return (
            <div key={m.id} className={`msg-in flex gap-2 ${mine ? 'mine flex-row-reverse' : ''}`}>
              <Link href={`/profile/${m.author.id}`} className="shrink-0 self-start" aria-label={`${m.author.name || 'Trader'}'s profile`}>
                <Avatar src={m.author.image} name={m.author.name} size="xs" />
              </Link>
              <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className="flex items-center gap-1.5">
                  {!mine && <Link href={`/profile/${m.author.id}`} className="text-xs font-semibold text-ink hover:text-yellow-500 transition-colors">{m.author.name || 'Trader'}</Link>}
                  <span className="text-[10px] text-ink3">{ago(m.createdAt)}</span>
                </div>
                {m.image && <div className="mt-0.5"><MessagePhoto src={m.image} onOpen={setZoom} /></div>}
                {m.content && (
                  <div className={`mt-0.5 rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${mine ? 'bg-yellow-500 text-black' : 'bg-elevated text-ink'}`}>
                    {m.content}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottom} />
      </div>
      <Composer placeholder="Message the community…" onSend={send} />
      {zoom && <ImageLightbox images={[zoom]} startIndex={0} onClose={() => setZoom(null)} />}
    </div>
  )
}

/* ================= Direct messages ================= */
function DMs({ meId, initialUserId }: { meId: string; initialUserId?: string | null }) {
  const [convos, setConvos] = useState<Convo[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [other, setOther] = useState<Lite | null>(null)
  const [msgs, setMsgs] = useState<DM[]>([])
  const [zoom, setZoom] = useState<string | null>(null)
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
    const id = setInterval(() => { if (!document.hidden) loadConvos() }, 8000)
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
      if (document.hidden || !lastAt.current) return
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
    }, 4000)
    return () => { alive = false; clearInterval(id) }
  }, [activeId, loadConvos])

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function send(content: string, image: string | null) {
    if (!activeId) return false
    const res = await fetch(`/api/chat/conversations/${activeId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, image }) })
    if (!res.ok) return false
    const m: DM = await res.json()
    setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
    lastAt.current = m.createdAt
    loadConvos()
    return true
  }

  const openWith = useCallback(async (userId: string) => {
    const res = await fetch('/api/chat/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) })
    if (res.ok) { const { id } = await res.json(); setShowNew(false); setActiveId(id) }
  }, [])

  // Deep-link: /chat?dm=<coachId> opens (or creates) that DM directly — used by
  // the "Message coach" button on the Education 1-on-1 coaching cards.
  useEffect(() => {
    if (!initialUserId) return
    let alive = true
    fetch('/api/chat/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: initialUserId }) })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d?.id) setActiveId(d.id) })
      .catch(() => {})
    return () => { alive = false }
  }, [initialUserId])

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
              {other ? (
                <Link href={`/profile/${other.id}`} className="flex min-w-0 items-center gap-2 group">
                  <Avatar src={other.image} name={other.name} size="sm" />
                  <span className="text-sm font-bold text-ink truncate group-hover:text-yellow-500 transition-colors">{other.name || 'Conversation'}</span>
                </Link>
              ) : (
                <span className="text-sm font-bold text-ink truncate">Conversation</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {msgs.map(m => {
                const mine = m.senderId === meId
                return (
                  <div key={m.id} className={`msg-in flex ${mine ? 'mine justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
                      {m.image && <MessagePhoto src={m.image} onOpen={setZoom} />}
                      <div className={`rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap ${mine ? 'bg-yellow-500 text-black' : 'bg-elevated text-ink'}`}>
                        {m.content}
                        <span className={`block text-[10px] ${m.content ? 'mt-0.5' : ''} ${mine ? 'text-black/60' : 'text-ink3'}`}>{ago(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottom} />
            </div>
            <Composer key={activeId} placeholder="Write a message…" onSend={send} />
          </>
        )}
      </div>

      {showNew && <NewMessage meId={meId} onClose={() => setShowNew(false)} onPick={openWith} />}
      {zoom && <ImageLightbox images={[zoom]} startIndex={0} onClose={() => setZoom(null)} />}
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
function ChatPageInner() {
  const { data: session } = useSession()
  const meId = session?.user?.id || ''
  // Deep-link support: /chat?room=coach:<id> opens that room directly (used by
  // the coach's "new message in your room" notification).
  const params = useSearchParams()
  const initialRoom = params.get('room')
  const initialDm = params.get('dm')
  const [tab, setTab] = useState<Tab>(initialDm ? 'dm' : 'room')
  const [coaches, setCoaches] = useState<Lite[]>([])
  const [room, setRoom] = useState(initialRoom || 'community')
  const [activity, setActivity] = useState<Record<string, string>>({})
  const [dmUnread, setDmUnread] = useState(0)
  // Bumped when a room is marked read, to recompute the dots below.
  const [seenTick, setSeenTick] = useState(0)

  useEffect(() => {
    fetch('/api/chat/coaches').then(r => r.json()).then(d => { if (Array.isArray(d)) setCoaches(d) }).catch(() => {})
  }, [])

  // Which rooms have messages I haven't seen, and how many DM threads are
  // unread. Polled faster than the nav's 45s — this is the page you sit on.
  useEffect(() => {
    const poll = () => {
      if (document.hidden) return
      fetch('/api/chat/unread').then(r => r.json()).then(d => {
        setActivity(d.rooms || {})
        setDmUnread(d.count || 0)
      }).catch(() => {})
    }
    poll()
    const id = setInterval(poll, 15000)
    document.addEventListener('visibilitychange', poll)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', poll) }
  }, [])

  useEffect(() => {
    const bump = () => setSeenTick(t => t + 1)
    window.addEventListener(SEEN_EVENT, bump)
    return () => window.removeEventListener(SEEN_EVENT, bump)
  }, [])

  // The room on screen is being read right now — keep it marked, including as
  // new messages land in it, so its own tab never dots at the reader.
  useEffect(() => {
    if (tab === 'room') markRoomSeen(room)
  }, [tab, room, activity])

  const rooms = [
    { id: 'community', name: 'Community' },
    // A coach always sees their own room (the coaches list excludes self).
    ...(session?.user?.role === 'coach' && meId ? [{ id: `coach:${meId}`, name: 'My Room' }] : []),
    ...coaches.map(c => ({ id: `coach:${c.id}`, name: `${c.name?.split(' ')[0] || 'Coach'}'s Room` })),
  ].map(r => ({ ...r, unseen: isRoomUnseen(r.id, activity[r.id]) }))

  // seenTick isn't read directly — it re-runs isRoomUnseen after a room is marked.
  void seenTick
  const roomsUnseen = tab !== 'room' && rooms.some(r => r.unseen)

  return (
    // -mb-28 cancels the mobile bottom padding the main layout adds for the fixed
    // bottom nav, so the chat can own the full height and pin its input just above it.
    <div className="space-y-3 -mb-28 lg:mb-0">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Chat</h1>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('room')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'room' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
          <Users className="w-4 h-4" /> Rooms
          {roomsUnseen && (
            <span aria-label="New room messages" className="w-2 h-2 rounded-full bg-yellow-500" />
          )}
        </button>
        <button onClick={() => setTab('dm')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'dm' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
          <MessageCircle className="w-4 h-4" /> Messages
          {dmUnread > 0 && (
            <span className="min-w-4 h-4 px-1 grid place-items-center rounded-full bg-yellow-500 text-black text-[10px] font-black">
              {dmUnread > 9 ? '9+' : dmUnread}
            </span>
          )}
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-line overflow-hidden min-h-[320px] h-[calc(100dvh-15rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] lg:h-[calc(100vh-14rem)]">
        {meId && (tab === 'room' ? (
          <div className="flex flex-col h-full">
            {/* room selector */}
            <div className="flex gap-2 overflow-x-auto p-2 border-b border-line shrink-0 scrollbar-none">
              {rooms.map(r => (
                <button key={r.id} onClick={() => setRoom(r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${room === r.id ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'}`}>
                  {r.name}
                  {r.unseen && (
                    <span aria-label="New messages" title="New messages" className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0">
              <RoomChat key={room} meId={meId} room={room} />
            </div>
          </div>
        ) : <DMs meId={meId} initialUserId={initialDm} />)}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  )
}
