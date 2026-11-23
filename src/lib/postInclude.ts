import type { Prisma } from '@/generated/prisma/client'
import { withReactionSummaries } from '@/lib/postReactions'

export const AUTHOR_SELECT = { id: true, name: true, image: true, username: true } as const

/**
 * Everything a PostCard needs, in one place so the feed, profile, group, page
 * and single-post views all load posts (and shares) the same way.
 */
export function postInclude(userId: string) {
  return {
    author: { select: AUTHOR_SELECT },
    page: { select: { id: true, name: true, image: true, verified: true } },
    group: { select: { id: true, name: true, image: true } },
    _count: { select: { likes: true, comments: true, shares: true } },
    likes: { where: { userId }, select: { userId: true, type: true } },
    sharedPost: {
      select: {
        id: true, content: true, images: true, feeling: true, privacy: true, createdAt: true, authorId: true, groupId: true,
        author: { select: AUTHOR_SELECT },
        page: { select: { id: true, name: true, image: true, verified: true } },
      },
    },
    comments: {
      where: { parentId: null },
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { likes: true, replies: true } },
        likes: { where: { userId }, select: { userId: true, type: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: AUTHOR_SELECT },
            _count: { select: { likes: true } },
            likes: { where: { userId }, select: { userId: true, type: true } },
          },
        },
      },
    },
  } satisfies Prisma.PostInclude
}

type SharedRef = { sharedPost: { privacy: string; authorId: string; groupId: string | null } | null }

/**
 * Adds reaction summaries, and hides a shared original that's no longer
 * public (made private, or it's in a group) from everyone but its author.
 */
export async function finalizePosts<T extends { id: string } & SharedRef>(posts: T[], userId: string) {
  const withReactions = await withReactionSummaries(posts)
  return withReactions.map(p => {
    const sp = p.sharedPost
    const hidden = sp && sp.authorId !== userId && (sp.privacy !== 'public' || sp.groupId)
    return hidden ? { ...p, sharedPost: null } : p
  })
}
