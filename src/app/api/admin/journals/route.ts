import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireStaff, ROLES } from '@/lib/admin'

/**
 * Journal adoption report — who has ever written a journal entry and who
 * hasn't, all-time. Open to coaches as well as admins: chasing the members who
 * never started is coaching work. Entry contents are never returned, only
 * counts and dates.
 */
export async function GET(req: Request) {
  const session = await requireStaff()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const params = new URL(req.url).searchParams
  const q = params.get('q')?.trim()
  const role = params.get('role')?.trim()
  const has = params.get('has')?.trim() // 'true' = has journalled, 'false' = never

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (role && (ROLES as readonly string[]).includes(role)) where.role = role

  // Two round-trips instead of a per-user subquery: the roster, then one
  // grouped pass over journal_entries for counts and first/last dates.
  const [users, grouped, totalEntries, everJournalled, totalUsers] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, username: true, image: true,
        role: true, approved: true, accmMember: true, createdAt: true, lastSeenAt: true,
      },
    }),
    db.journalEntry.groupBy({
      by: ['authorId'],
      _count: { _all: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
    db.journalEntry.count(),
    // Site-wide, so the tiles don't shift as the search box is typed in.
    db.user.count({ where: { journalEntries: { some: {} } } }),
    db.user.count(),
  ])

  const byAuthor = new Map(grouped.map(g => [g.authorId, g]))

  const rows = users.map(u => {
    const g = byAuthor.get(u.id)
    return {
      ...u,
      entryCount: g?._count._all ?? 0,
      firstEntryAt: g?._min.createdAt ?? null,
      lastEntryAt: g?._max.createdAt ?? null,
    }
  })

  const filtered = has === 'true' ? rows.filter(r => r.entryCount > 0)
    : has === 'false' ? rows.filter(r => r.entryCount === 0)
    : rows

  return NextResponse.json({
    users: filtered,
    stats: {
      totalUsers,
      withJournal: everJournalled,
      withoutJournal: totalUsers - everJournalled,
      totalEntries,
    },
  })
}
