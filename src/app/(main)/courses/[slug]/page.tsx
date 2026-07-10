'use client'
import { useEffect, useMemo, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Circle, PlayCircle, ChevronRight, Loader2 } from 'lucide-react'
import { youtubeEmbedUrl, groupBySection, nextLessonId, percentComplete, formatDuration, formatTotalDuration, LEVEL_LABEL } from '@/lib/courses'

interface Lesson {
  id: string
  section: string
  title: string
  youtubeId: string
  educator: string | null
  summary: string | null
  durationSec: number | null
  order: number
}
interface Course {
  id: string
  slug: string
  title: string
  description: string
  level: string
  lessons: Lesson[]
  enrolled: boolean
  completedLessonIds: string[]
}

export default function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/courses/${slug}`)
      .then(async r => {
        if (!r.ok) { setNotFound(true); return null }
        return r.json()
      })
      .then((d: Course | null) => {
        if (!d) return
        setCourse(d)
        const done = new Set(d.completedLessonIds)
        setCompleted(done)
        // Resume where they left off rather than always at lesson one.
        setActiveId(nextLessonId(d.lessons, done))
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  const sections = useMemo(() => (course ? groupBySection(course.lessons) : []), [course])
  const totalRuntime = useMemo(
    () => (course ? formatTotalDuration(course.lessons.map(l => l.durationSec)) : null),
    [course],
  )
  const active = course?.lessons.find(l => l.id === activeId) ?? null
  const pct = course ? percentComplete(completed.size, course.lessons.length) : 0

  const ordered = course?.lessons ?? []
  const activeIndex = ordered.findIndex(l => l.id === activeId)
  const upNext = activeIndex >= 0 ? ordered[activeIndex + 1] ?? null : null

  async function enrol() {
    if (!course || course.enrolled) return
    setCourse({ ...course, enrolled: true })
    await fetch(`/api/courses/${slug}/enroll`, { method: 'POST' }).catch(() => {})
  }

  async function toggleComplete(lessonId: string, done: boolean) {
    setSaving(true)
    // Optimistic — the checkbox should never lag the click.
    setCompleted(prev => {
      const next = new Set(prev)
      if (done) next.add(lessonId); else next.delete(lessonId)
      return next
    })
    try {
      const res = await fetch(`/api/lessons/${lessonId}/complete`, { method: done ? 'POST' : 'DELETE' })
      if (!res.ok) throw new Error('failed')
      if (done && course && !course.enrolled) setCourse({ ...course, enrolled: true })
    } catch {
      // Roll back so the UI never claims progress the server didn't record.
      setCompleted(prev => {
        const next = new Set(prev)
        if (done) next.delete(lessonId); else next.add(lessonId)
        return next
      })
    } finally {
      setSaving(false)
    }
  }

  async function completeAndAdvance() {
    if (!active) return
    await toggleComplete(active.id, true)
    if (upNext) setActiveId(upNext.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-ink3">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    )
  }

  if (notFound || !course) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-10 text-center space-y-3">
        <p className="text-sm text-ink2">That course doesn&apos;t exist.</p>
        <Link href="/courses" className="text-xs font-semibold text-yellow-500">Back to courses</Link>
      </div>
    )
  }

  const isDone = active ? completed.has(active.id) : false

  return (
    <div className="space-y-4">
      <Link href="/courses" className="inline-flex items-center gap-1.5 text-xs text-ink3 hover:text-ink transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> All courses
      </Link>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-4 items-start">
        {/* player */}
        <div className="space-y-3 min-w-0">
          <div className="rounded-2xl border border-line bg-surface overflow-hidden">
            <div className="aspect-video bg-black">
              {active && (
                <iframe
                  key={active.id}
                  src={youtubeEmbedUrl(active.youtubeId)}
                  title={active.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink3">{active?.section}</p>
                  <h1 className="font-bold text-ink mt-0.5">{active?.title}</h1>
                  {active?.educator && <p className="text-xs text-ink3 mt-0.5">by {active.educator}</p>}
                </div>
                <button
                  onClick={() => toggleComplete(active!.id, !isDone)}
                  disabled={saving || !active}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
                    isDone ? 'bg-green-400/15 text-green-400' : 'bg-elevated text-ink2 hover:text-ink'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                  {isDone ? 'Completed' : 'Mark complete'}
                </button>
              </div>

              {active?.summary && <p className="text-sm text-ink2 mt-3 leading-relaxed">{active.summary}</p>}

              {upNext && (
                <button
                  onClick={completeAndAdvance}
                  disabled={saving}
                  className="mt-4 w-full flex items-center justify-between gap-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-bold text-sm px-4 py-2.5 transition-colors"
                >
                  <span>Complete &amp; continue</span>
                  <span className="flex items-center gap-1 text-xs font-semibold truncate">
                    {upNext.title} <ChevronRight className="w-4 h-4 shrink-0" />
                  </span>
                </button>
              )}
              {!upNext && isDone && (
                <p className="mt-4 text-center text-xs font-semibold text-green-400">
                  🎉 That&apos;s the whole course — nice work.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* curriculum */}
        <div className="rounded-2xl border border-line bg-surface overflow-hidden lg:sticky lg:top-16">
          <div className="p-4 border-b border-line">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-ink text-sm">{course.title}</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">
                {LEVEL_LABEL[course.level] ?? course.level}
              </span>
            </div>
            {totalRuntime && <p className="text-[10px] text-ink3 mt-0.5">{course.lessons.length} lessons · {totalRuntime} total</p>}
            <div className="flex items-center justify-between text-[10px] mt-2 mb-1">
              <span className="text-ink3">{completed.size} of {course.lessons.length} complete</span>
              <span className="font-bold text-yellow-500">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
              <div className="h-full rounded-full bg-yellow-500 transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            {!course.enrolled && (
              <button onClick={enrol} className="mt-3 w-full rounded-lg bg-elevated hover:bg-line text-ink text-xs font-bold py-2 transition-colors">
                Enrol — it&apos;s included
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {sections.map(({ section, lessons }) => (
              <div key={section} className="mb-2">
                <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ink3">{section}</p>
                {lessons.map(l => {
                  const done = completed.has(l.id)
                  const isActive = l.id === activeId
                  return (
                    <button
                      key={l.id}
                      onClick={() => setActiveId(l.id)}
                      className={`w-full flex items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                        isActive ? 'bg-yellow-500/10' : 'hover:bg-elevated'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      ) : isActive ? (
                        <PlayCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-ink3 shrink-0 mt-0.5" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className={`block text-xs leading-snug ${isActive ? 'text-ink font-semibold' : done ? 'text-ink3' : 'text-ink2'}`}>
                          {l.title}
                        </span>
                        {formatDuration(l.durationSec) && (
                          <span className="block text-[10px] text-ink3 mt-0.5">{formatDuration(l.durationSec)}</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
