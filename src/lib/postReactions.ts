import { db } from './db'
import type { ReactionSummary } from '@/types'

/**
 * Returns a per-post breakdown of reaction counts by type, computed in a single
 * groupBy query. Attach the result to feed posts so the UI can render which
 * reactions a post received (e.g. 👍❤️😂) alongside the total.
 */
export async function summarizeReactions(postIds: string[]): Promise<Record<string, ReactionSummary[]>> {
  if (postIds.length === 0) return {}

  const grouped = await db.like.groupBy({
    by: ['postId', 'type'],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  })

  const map: Record<string, ReactionSummary[]> = {}
  for (const g of grouped) {
    if (!g.postId) continue
    ;(map[g.postId] ??= []).push({ type: g.type, count: g._count._all })
  }
  for (const key in map) map[key].sort((a, b) => b.count - a.count)
  return map
}

/** Attach a `reactions` summary array to each post. */
export async function withReactionSummaries<T extends { id: string }>(posts: T[]): Promise<(T & { reactions: ReactionSummary[] })[]> {
  const summaries = await summarizeReactions(posts.map(p => p.id))
  return posts.map(p => ({ ...p, reactions: summaries[p.id] ?? [] }))
}
