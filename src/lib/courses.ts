// Course helpers shared by the API routes and the /courses pages.

/** Lessons store the bare 11-char id, so the player builds its own embed URL. */
export function youtubeEmbedUrl(youtubeId: string) {
  return `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`
}

/** hqdefault exists for every video; maxresdefault does not. */
export function youtubeThumb(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
}

export function percentComplete(completed: number, total: number) {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export interface LessonLike {
  id: string
  section: string
  order: number
}

/**
 * Group lessons into their curriculum sections, preserving lesson order and
 * first-appearance order of the sections themselves.
 */
export function groupBySection<T extends LessonLike>(lessons: T[]): { section: string; lessons: T[] }[] {
  const sections: { section: string; lessons: T[] }[] = []
  for (const lesson of [...lessons].sort((a, b) => a.order - b.order)) {
    let bucket = sections.find(s => s.section === lesson.section)
    if (!bucket) {
      bucket = { section: lesson.section, lessons: [] }
      sections.push(bucket)
    }
    bucket.lessons.push(lesson)
  }
  return sections
}

/**
 * The lesson a member should land on: the first unfinished one. A fully
 * completed course resumes at the last lesson rather than nowhere.
 */
export function nextLessonId<T extends LessonLike>(lessons: T[], completedIds: Set<string>): string | null {
  const ordered = [...lessons].sort((a, b) => a.order - b.order)
  const next = ordered.find(l => !completedIds.has(l.id))
  return next?.id ?? ordered[ordered.length - 1]?.id ?? null
}

/** 809 → "13:29", 3649 → "1:00:49". Null when the runtime isn't known. */
export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

/** Total runtime of a course, e.g. "4h 12m". Null when nothing is known. */
export function formatTotalDuration(durations: (number | null | undefined)[]): string | null {
  const total = durations.reduce<number>((sum, d) => sum + (d ?? 0), 0)
  if (total <= 0) return null
  const h = Math.floor(total / 3600)
  const m = Math.round((total % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}
