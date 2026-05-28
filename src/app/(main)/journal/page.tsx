'use client'
import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Plus, Trash2, Edit3, X, Check, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDistanceToNow } from 'date-fns'

interface JournalEntry {
  id: string
  title: string | null
  content: string
  mood: string | null
  createdAt: string
  updatedAt: string
}

const moods = [
  { value: 'bullish',   label: '📈 Bullish'   },
  { value: 'bearish',   label: '📉 Bearish'   },
  { value: 'neutral',   label: '😐 Neutral'   },
  { value: 'satisfied', label: '😊 Satisfied' },
  { value: 'frustrated',label: '😤 Frustrated'},
  { value: 'analyzing', label: '🤔 Analyzing' },
]

function moodLabel(value: string | null) {
  return moods.find(m => m.value === value)?.label ?? null
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<JournalEntry | null>(null)
  const [mode, setMode] = useState<'view' | 'edit' | 'new'>('view')

  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mobileShowEditor, setMobileShowEditor] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/journal')
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openNew() {
    setSelected(null)
    setTitle('')
    setContent('')
    setMood('')
    setMode('new')
    setMobileShowEditor(true)
  }

  function openEntry(entry: JournalEntry) {
    setSelected(entry)
    setMode('view')
    setMobileShowEditor(true)
  }

  function startEdit(entry: JournalEntry) {
    setTitle(entry.title ?? '')
    setContent(entry.content)
    setMood(entry.mood ?? '')
    setMode('edit')
  }

  async function handleSave() {
    if (!content.trim()) return
    setSaving(true)
    try {
      if (mode === 'new') {
        const res = await fetch('/api/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || null, content, mood: mood || null }),
        })
        const created = await res.json()
        setEntries(e => [created, ...e])
        setSelected(created)
        setMode('view')
      } else if (mode === 'edit' && selected) {
        const res = await fetch(`/api/journal/${selected.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title || null, content, mood: mood || null }),
        })
        const updated = await res.json()
        setEntries(e => e.map(x => x.id === updated.id ? updated : x))
        setSelected(updated)
        setMode('view')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entry: JournalEntry) {
    setDeleting(true)
    try {
      await fetch(`/api/journal/${entry.id}`, { method: 'DELETE' })
      setEntries(e => e.filter(x => x.id !== entry.id))
      setSelected(null)
      setMode('view')
      setMobileShowEditor(false)
    } finally {
      setDeleting(false)
    }
  }

  function cancelEdit() {
    if (mode === 'new') {
      setMode('view')
      setMobileShowEditor(false)
    } else {
      setMode('view')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-yellow-500" />
          <h1 className="font-bold text-[#f0f0f8] text-lg">My Journal</h1>
        </div>
        <Button variant="gold" size="sm" onClick={openNew} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" /> New Entry
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-10rem)]">
        {/* Entry list */}
        <div className={`flex flex-col w-full lg:w-72 shrink-0 bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden ${mobileShowEditor ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b border-[#2a2a3a]">
            <p className="text-xs text-[#5a5a72]">{entries.length} {entries.length === 1 ? 'entry' : 'entries'} · visible only to you</p>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[1,2,3].map(i => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-3/4 bg-[#2a2a3a] rounded" />
                    <div className="h-2 w-1/2 bg-[#2a2a3a] rounded" />
                  </div>
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen className="w-8 h-8 text-[#2a2a3a] mx-auto mb-2" />
                <p className="text-xs text-[#5a5a72]">No entries yet</p>
                <button onClick={openNew} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                  Write your first entry →
                </button>
              </div>
            ) : (
              entries.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => openEntry(entry)}
                  className={`w-full text-left p-3 border-b border-[#2a2a3a] hover:bg-[#1e1e2c] transition-colors ${selected?.id === entry.id ? 'bg-[#1e1e2c] border-l-2 border-l-yellow-500' : ''}`}
                >
                  <p className="text-sm font-semibold text-[#f0f0f8] truncate">
                    {entry.title || 'Untitled'}
                  </p>
                  <p className="text-xs text-[#5a5a72] truncate mt-0.5">{entry.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[#3a3a4a]">
                      {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                    </span>
                    {entry.mood && (
                      <span className="text-[10px] text-[#5a5a72]">{moodLabel(entry.mood)}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor / Viewer */}
        <div className={`flex-1 bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden flex flex-col ${mobileShowEditor ? 'flex' : 'hidden lg:flex'}`}>
          {/* Mobile back button */}
          <div className="lg:hidden flex items-center gap-2 p-3 border-b border-[#2a2a3a]">
            <button onClick={() => setMobileShowEditor(false)} className="flex items-center gap-1.5 text-xs text-[#9090a8] hover:text-[#f0f0f8] transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> All entries
            </button>
          </div>

          {(mode === 'new' || mode === 'edit') ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 border-b border-[#2a2a3a] flex items-center justify-between gap-3">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Entry title (optional)"
                  className="flex-1 bg-transparent text-[#f0f0f8] font-semibold text-lg outline-none placeholder-[#3a3a4a]"
                />
                <div className="flex gap-1.5">
                  <Button variant="secondary" size="sm" onClick={cancelEdit} className="text-xs gap-1">
                    <X className="w-3 h-3" /> Cancel
                  </Button>
                  <Button variant="gold" size="sm" onClick={handleSave} loading={saving} className="text-xs gap-1">
                    <Check className="w-3 h-3" /> Save
                  </Button>
                </div>
              </div>
              {/* Mood picker */}
              <div className="px-4 py-2 border-b border-[#2a2a3a] flex gap-2 flex-wrap">
                {moods.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setMood(mood === m.value ? '' : m.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${mood === m.value ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400' : 'border-[#2a2a3a] text-[#5a5a72] hover:border-[#3a3a4a] hover:text-[#9090a8]'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your thoughts, trade notes, reflections…"
                className="flex-1 bg-transparent text-[#f0f0f8] text-sm outline-none resize-none p-4 placeholder-[#3a3a4a] leading-relaxed"
              />
            </div>
          ) : selected ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 border-b border-[#2a2a3a] flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-[#f0f0f8] text-lg">{selected.title || 'Untitled'}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#5a5a72]">
                      {new Date(selected.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    {selected.mood && <span className="text-xs text-[#9090a8]">· {moodLabel(selected.mood)}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => startEdit(selected)} className="p-1.5 rounded-lg text-[#5a5a72] hover:text-yellow-500 hover:bg-[#2a2a3a] transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(selected)} disabled={deleting} className="p-1.5 rounded-lg text-[#5a5a72] hover:text-red-400 hover:bg-[#2a2a3a] transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <p className="text-sm text-[#f0f0f8] leading-relaxed whitespace-pre-wrap">{selected.content}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-[#2a2a3a] mx-auto mb-3" />
                <p className="text-[#5a5a72] text-sm">Select an entry or create a new one</p>
                <button onClick={openNew} className="mt-3 text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                  + New entry
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
