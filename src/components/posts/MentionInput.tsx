'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar } from '@/components/ui/Avatar'

interface Suggestion { id: string; name: string | null; image: string | null; username: string | null }

type Props = {
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  className?: string
  wrapperClassName?: string
  placeholder?: string
  rows?: number
  autoFocus?: boolean
  disabled?: boolean
}

// The "@partial" right before the caret, if the caret is in one.
const TYPING_RE = /(^|\s)@([\p{L}\p{N}_.-]{1,30})$/u

/**
 * A text input/textarea that suggests members while you type "@name" and
 * inserts "@username" when one is picked (arrow keys + Enter/Tab, or tap).
 */
export function MentionInput({ value, onChange, multiline, className, wrapperClassName, ...rest }: Props) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const [query, setQuery] = useState<{ text: string; start: number } | null>(null)
  const [items, setItems] = useState<Suggestion[]>([])
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null)

  function detect(text: string, caret: number) {
    const m = text.slice(0, caret).match(TYPING_RE)
    setQuery(m ? { text: m[2], start: caret - m[2].length - 1 } : null)
    if (!m) setItems([])
  }

  useEffect(() => {
    if (!query) return // the list only shows while a query is open
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(query.text)}`, { signal: ctrl.signal })
        .then(r => r.ok ? r.json() : [])
        .then((d: Suggestion[]) => { setItems(Array.isArray(d) ? d.filter(u => u.username).slice(0, 6) : []); setActive(0) })
        .catch(() => {})
    }, 150)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [query])

  function pick(u: Suggestion) {
    if (!query || !u.username) return
    const el = ref.current
    const caret = el?.selectionStart ?? value.length
    const insert = `@${u.username} `
    const next = value.slice(0, query.start) + insert + value.slice(caret)
    onChange(next)
    setQuery(null)
    setItems([])
    const pos = query.start + insert.length
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos, pos) })
  }

  const open = query !== null && items.length > 0

  // The list is drawn in a portal with fixed positioning, so cards with
  // overflow-hidden (posts, modals) can't clip it. It opens below the box,
  // or above it when there isn't room below.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const width = Math.min(256, window.innerWidth - 16)
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
      const below = window.innerHeight - r.bottom
      setPos(below < 260 && r.top > below
        ? { left, width, bottom: window.innerHeight - r.top + 4 }
        : { left, width, top: r.bottom + 4 })
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place) }
  }, [open])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % items.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + items.length) % items.length) }
    else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(items[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); setQuery(null) }
  }

  const common = {
    ref,
    value,
    className,
    onKeyDown,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value)
      detect(e.target.value, e.target.selectionStart ?? e.target.value.length)
    },
    onClick: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => detect(e.currentTarget.value, e.currentTarget.selectionStart ?? 0),
    onBlur: () => setTimeout(() => setQuery(null), 150), // let a tap on a suggestion land first
    ...rest,
  }

  return (
    <div className={`relative ${wrapperClassName ?? ''}`}>
      {multiline ? <textarea {...common} /> : <input {...common} />}
      {open && pos && createPortal(
        <ul role="listbox" style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
          className="z-[300] bg-elevated border border-line rounded-xl shadow-2xl overflow-hidden">
          {items.map((u, i) => (
            <li key={u.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={e => { e.preventDefault(); pick(u) }} onMouseEnter={() => setActive(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${i === active ? 'bg-yellow-500/10' : ''}`}>
                <Avatar src={u.image} name={u.name} size="xs" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink truncate">{u.name || u.username}</span>
                  <span className="block text-[11px] text-ink3 truncate">@{u.username}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  )
}
