'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  GraduationCap, Plus, Trash2, X, ChevronUp, ChevronDown, Loader2, ExternalLink,
  Eye, EyeOff, ArrowLeft, CheckCircle2,
} from 'lucide-react'
import { formatDuration, formatTotalDuration, youtubeThumb, LEVEL_LABEL } from '@/lib/courses'

const LEVELS = ['beginner', 'intermediate', 'advanced'] as const
const inputCls = 'w-full rounded-lg bg-sunken border border-line px-3 py-2 text-sm text-ink placeholder:text-ink3 outline-none focus:border-yellow-500/50'

interface AdminCourse {
  id: string
  slug: string
  title: string
  description: string
  level: string
  published: boolean
  order: number
  _count: { lessons: number; enrollments: number }
}
interface AdminLesson {
  id: string
  section: string
  title: string
  youtubeId: string
  educator: string | null
  summary: string | null
  durationSec: number | null
  order: number
}
interface Lookup {
  youtubeId: string
  title: string
  educator: string
  durationSec: number | null
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/courses')
    setCourses(res.ok ? await res.json() : [])
    setLoading(false)
  }, [])

  // Initial fetch. The rule wants no setState in effects; there's no data hook
  // in this app to fetch through, and load() only sets state after its await.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function togglePublished(c: AdminCourse) {
    setCourses(prev => prev.map(x => x.id === c.id ? { ...x, published: !x.published } : x))
    await fetch(`/api/admin/courses/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !c.published }),
    }).catch(() => load())
  }

  async function removeCourse(c: AdminCourse) {
    const warning = c._count.enrollments > 0
      ? `Delete "${c.title}"? ${c._count.enrollments} member(s) are enrolled — their progress is deleted too. This cannot be undone.`
      : `Delete "${c.title}" and its ${c._count.lessons} lesson(s)? This cannot be undone.`
    if (!confirm(warning)) return
    setCourses(prev => prev.filter(x => x.id !== c.id))
    await fetch(`/api/admin/courses/${c.id}`, { method: 'DELETE' })
  }

  return (
    <div className="space-y-4">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-ink3 hover:text-ink transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Admin
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h1 className="font-bold text-ink text-lg leading-tight">Courses</h1>
            <p className="text-xs text-ink3">Paste a YouTube link — we verify it and pull the real title.</p>
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-3 py-2 transition-colors">
          <Plus className="w-3.5 h-3.5" /> New course
        </button>
      </div>

      {showNew && <NewCourseForm onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load() }} />}

      {loading ? (
        <p className="text-center text-ink3 text-sm py-10">Loading…</p>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="text-sm text-ink2">No courses yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(c => (
            <div key={c.id} className="rounded-2xl border border-line bg-surface overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-bold text-ink truncate">{c.title}</h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">{LEVEL_LABEL[c.level] ?? c.level}</span>
                    {!c.published && (
                      <span className="text-[9px] font-bold uppercase text-amber-400 bg-amber-400/10 rounded-full px-1.5 py-0.5">Draft</span>
                    )}
                  </div>
                  <p className="text-xs text-ink3 mt-0.5">
                    {c._count.lessons} lesson{c._count.lessons === 1 ? '' : 's'} · {c._count.enrollments} enrolled · /courses/{c.slug}
                  </p>
                </div>

                <button onClick={() => togglePublished(c)} title={c.published ? 'Unpublish' : 'Publish'}
                  className="text-ink3 hover:text-ink transition-colors p-1.5">
                  {c.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <Link href={`/courses/${c.slug}`} title="View as member" className="text-ink3 hover:text-ink transition-colors p-1.5">
                  <ExternalLink className="w-4 h-4" />
                </Link>
                <button onClick={() => removeCourse(c)} title="Delete course" className="text-ink3 hover:text-red-400 transition-colors p-1.5">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setOpenId(openId === c.id ? null : c.id)}
                  className="text-xs font-bold text-yellow-500 rounded-lg px-2.5 py-1.5 hover:bg-elevated transition-colors">
                  {openId === c.id ? 'Close' : 'Lessons'}
                </button>
              </div>

              {openId === c.id && <LessonEditor courseId={c.id} onChanged={load} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- new course ---------- */
function NewCourseForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<(typeof LEVELS)[number]>('beginner')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    setError('')
    if (!title.trim() || !description.trim()) { setError('Title and description are required.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, level }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Could not create the course.'); return }
      onCreated()
    } finally { setSaving(false) }
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-ink text-sm">New course</h2>
        <button onClick={onClose} className="text-ink3 hover:text-ink"><X className="w-4 h-4" /></button>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course title" className={inputCls} />
      <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will members learn?" rows={2} className={inputCls} />
      <div className="flex gap-2">
        {LEVELS.map(l => (
          <button key={l} onClick={() => setLevel(l)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition-colors ${level === l ? 'bg-yellow-500 text-black' : 'bg-sunken border border-line text-ink3'}`}>
            {l}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button onClick={save} disabled={saving}
        className="w-full rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black text-sm font-bold py-2 transition-colors">
        {saving ? 'Creating…' : 'Create course'}
      </button>
    </div>
  )
}

/* ---------- lessons ---------- */
function LessonEditor({ courseId, onChanged }: { courseId: string; onChanged: () => void }) {
  const [lessons, setLessons] = useState<AdminLesson[]>([])
  const [loading, setLoading] = useState(true)

  const [url, setUrl] = useState('')
  const [section, setSection] = useState('')
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [checking, setChecking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/courses/${courseId}/lessons`)
    setLessons(res.ok ? await res.json() : [])
    setLoading(false)
  }, [courseId])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- see note above
  useEffect(() => { load() }, [load])

  // Existing sections make a natural picklist — most lessons join one.
  const sections = [...new Set(lessons.map(l => l.section))]
  const totalRuntime = formatTotalDuration(lessons.map(l => l.durationSec))

  async function check() {
    setError(''); setLookup(null)
    if (!url.trim()) return
    setChecking(true)
    try {
      const res = await fetch('/api/admin/courses/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Could not verify that link.'); return }
      setLookup(d)
    } catch {
      setError('Could not reach YouTube. Try again.')
    } finally { setChecking(false) }
  }

  async function add() {
    setError('')
    if (!section.trim()) { setError('Give the lesson a section.'); return }
    setAdding(true)
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, section }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setError(d.error || 'Could not add the lesson.'); return }
      setUrl(''); setLookup(null)
      await load(); onChanged()
    } finally { setAdding(false) }
  }

  async function remove(l: AdminLesson) {
    if (!confirm(`Remove "${l.title}"? Members lose their completion of it.`)) return
    setLessons(prev => prev.filter(x => x.id !== l.id))
    await fetch(`/api/admin/lessons/${l.id}`, { method: 'DELETE' })
    onChanged()
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= lessons.length) return
    const next = [...lessons]
    ;[next[index], next[target]] = [next[target], next[index]]
    setLessons(next)
    await fetch(`/api/admin/courses/${courseId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonIds: next.map(l => l.id) }),
    }).catch(() => load())
  }

  return (
    <div className="border-t border-line p-4 space-y-4 bg-sunken/40">
      {/* add lesson */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Add a lesson</p>
        <div className="flex gap-2">
          <input value={url} onChange={e => { setUrl(e.target.value); setLookup(null) }}
            placeholder="Paste a YouTube URL" className={inputCls} />
          <button onClick={check} disabled={checking || !url.trim()}
            className="shrink-0 rounded-lg bg-elevated hover:bg-line disabled:opacity-60 text-ink text-xs font-bold px-3 transition-colors">
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
          </button>
        </div>

        {lookup && (
          <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-400/5 p-2.5">
            <div className="relative w-24 aspect-video rounded-lg overflow-hidden shrink-0 bg-elevated">
              <Image src={youtubeThumb(lookup.youtubeId)} alt="" fill sizes="96px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400">
                <CheckCircle2 className="w-3 h-3" /> Verified on YouTube
              </p>
              <p className="text-xs font-semibold text-ink truncate">{lookup.title}</p>
              <p className="text-[10px] text-ink3 truncate">
                {lookup.educator}
                {formatDuration(lookup.durationSec) && ` · ${formatDuration(lookup.durationSec)}`}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input value={section} onChange={e => setSection(e.target.value)} list={`sections-${courseId}`}
            placeholder="Section (e.g. Foundations)" className={inputCls} />
          <datalist id={`sections-${courseId}`}>
            {sections.map(s => <option key={s} value={s} />)}
          </datalist>
          <button onClick={add} disabled={adding || !lookup}
            title={!lookup ? 'Check the link first' : undefined}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-xs font-bold px-3 transition-colors">
            <Plus className="w-3.5 h-3.5" /> {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* curriculum */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider">Curriculum</p>
          {totalRuntime && <p className="text-[10px] text-ink3">{lessons.length} lessons · {totalRuntime}</p>}
        </div>

        {loading ? (
          <p className="text-xs text-ink3 py-4 text-center">Loading…</p>
        ) : lessons.length === 0 ? (
          <p className="text-xs text-ink3 py-4 text-center">No lessons yet.</p>
        ) : (
          <div className="space-y-1">
            {lessons.map((l, i) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg bg-surface border border-line px-2 py-1.5">
                <span className="text-[10px] font-bold text-ink3 w-5 text-center shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink truncate">{l.title}</p>
                  <p className="text-[10px] text-ink3 truncate">
                    {l.section}
                    {l.educator && ` · ${l.educator}`}
                    {formatDuration(l.durationSec) && ` · ${formatDuration(l.durationSec)}`}
                  </p>
                </div>
                <div className="flex items-center shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                    className="p-1 text-ink3 hover:text-ink disabled:opacity-30 transition-colors">
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === lessons.length - 1} aria-label="Move down"
                    className="p-1 text-ink3 hover:text-ink disabled:opacity-30 transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <a href={`https://www.youtube.com/watch?v=${l.youtubeId}`} target="_blank" rel="noopener noreferrer"
                    aria-label="Open on YouTube" className="p-1 text-ink3 hover:text-ink transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => remove(l)} aria-label="Remove lesson"
                    className="p-1 text-ink3 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
