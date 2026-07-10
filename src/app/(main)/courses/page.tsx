'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap, PlayCircle, CheckCircle2 } from 'lucide-react'
import { youtubeThumb, percentComplete, LEVEL_LABEL } from '@/lib/courses'

interface CourseCard {
  id: string
  slug: string
  title: string
  description: string
  level: string
  coverImage: string | null
  lessonCount: number
  completedCount: number
  enrolled: boolean
  previewYoutubeId: string | null
  totalDuration: string | null
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(d => setCourses(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h1 className="font-bold text-ink text-lg leading-tight">Courses</h1>
          <p className="text-xs text-ink3">Structured video paths — go at your own pace, we track where you left off.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[0, 1].map(i => (
            <div key={i} className="rounded-2xl border border-line bg-surface overflow-hidden animate-pulse">
              <div className="aspect-video bg-elevated" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 bg-elevated rounded" />
                <div className="h-3 w-full bg-elevated rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="text-sm text-ink2">No courses published yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {courses.map(c => {
            const pct = percentComplete(c.completedCount, c.lessonCount)
            const done = c.lessonCount > 0 && c.completedCount === c.lessonCount
            const thumb = c.coverImage ?? (c.previewYoutubeId ? youtubeThumb(c.previewYoutubeId) : null)
            return (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="group rounded-2xl border border-line bg-surface overflow-hidden hover:border-yellow-500/40 transition-colors flex flex-col"
              >
                <div className="relative aspect-video bg-elevated overflow-hidden">
                  {thumb && (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 bg-black/60 rounded-full px-2 py-0.5">
                      {LEVEL_LABEL[c.level] ?? c.level}
                    </span>
                    <span className="text-[10px] font-semibold text-white/90 bg-black/60 rounded-full px-2 py-0.5">
                      {c.lessonCount} lesson{c.lessonCount === 1 ? '' : 's'}
                      {c.totalDuration && ` · ${c.totalDuration}`}
                    </span>
                    {done && (
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-black/60 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Complete
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="font-bold text-ink group-hover:text-yellow-500 transition-colors">{c.title}</h2>
                  <p className="text-xs text-ink3 mt-1 line-clamp-2 flex-1">{c.description}</p>

                  {c.enrolled ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-ink3">{c.completedCount} of {c.lessonCount} complete</span>
                        <span className="font-bold text-yellow-500">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-elevated overflow-hidden">
                        <div className="h-full rounded-full bg-yellow-500 transition-[width]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ) : (
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-500">
                      <PlayCircle className="w-4 h-4" /> Start course
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
