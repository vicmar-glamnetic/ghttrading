import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { FeedClient } from '@/components/feed/FeedClient'
import { postInclude, finalizePosts } from '@/lib/postInclude'
import type { PostWithDetails } from '@/types'

export default async function FeedPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const uid = session.user.id
  const limit = 10

  const [following, pageFollows, me] = await Promise.all([
    db.follow.findMany({ where: { followerId: uid }, select: { followingId: true } }),
    db.pageFollow.findMany({ where: { followerId: uid }, select: { pageId: true } }),
    db.user.findUnique({ where: { id: uid }, select: { id: true, name: true, image: true } }),
  ])

  const followingIds = following.map(f => f.followingId)
  const followedPageIds = pageFollows.map(f => f.pageId)

  const postsRaw = await db.post.findMany({
    where: {
      groupId: null,
      OR: [
        { authorId: uid },
        { authorId: { in: followingIds } },
        { pageId: { in: followedPageIds } },
        { privacy: 'public', pageId: null },
      ],
    },
    include: postInclude(uid),
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  })

  let nextCursor: string | undefined
  if (postsRaw.length > limit) {
    const next = postsRaw.pop()
    nextCursor = next?.id
  }

  const posts = await finalizePosts(postsRaw, uid)

  return (
    <FeedClient
      initialPosts={posts as unknown as PostWithDetails[]}
      initialNextCursor={nextCursor}
      currentUserId={uid}
      me={me ?? { id: uid, name: session.user.name ?? null, image: session.user.image ?? null }}
    />
  )
}
