import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { notify } from '@/lib/notify'
import { postInclude, finalizePosts } from '@/lib/postInclude'
import { notifyMentions } from '@/lib/mentions'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const cursor = searchParams.get('cursor')
    const userId = searchParams.get('userId')   // filter by specific author
    const limit = 10

    let whereClause: Record<string, unknown>

    if (userId) {
      // Profile view — show only that user's public posts (or own posts for own profile), never group posts
      whereClause = {
        authorId: userId,
        groupId: null,
        ...(userId !== session.user.id ? { privacy: 'public' } : {}),
      }
    } else {
      // Main feed — own posts + followed users + followed pages + public, never group posts
      const [following, pageFollows] = await Promise.all([
        db.follow.findMany({ where: { followerId: session.user.id }, select: { followingId: true } }),
        db.pageFollow.findMany({ where: { followerId: session.user.id }, select: { pageId: true } }),
      ])
      const followingIds = following.map((f: { followingId: string }) => f.followingId)
      const followedPageIds = pageFollows.map((f: { pageId: string }) => f.pageId)
      whereClause = {
        groupId: null,
        OR: [
          { authorId: session.user.id, pageId: null },
          { authorId: { in: followingIds }, pageId: null },
          { pageId: { in: followedPageIds } },
          { privacy: 'public', pageId: null },
        ],
      }
    }

    const posts = await db.post.findMany({
      where: whereClause,
      include: postInclude(session.user.id),
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    let nextCursor: string | undefined
    if (posts.length > limit) {
      const next = posts.pop()
      nextCursor = next?.id
    }

    const postsWithReactions = await finalizePosts(posts, session.user.id)

    return NextResponse.json({ posts: postsWithReactions, nextCursor }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    console.error('[POSTS_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, images, feeling, location, privacy, sharedPostId } = await req.json()
    const uid = session.user.id

    // Sharing: point at the original (sharing a share shares what it shared),
    // and only public, non-group posts can be shared.
    let shareOf: { id: string; authorId: string } | null = null
    if (sharedPostId) {
      const target = await db.post.findUnique({
        where: { id: String(sharedPostId) },
        select: { id: true, authorId: true, privacy: true, groupId: true, sharedPost: { select: { id: true, authorId: true, privacy: true, groupId: true } } },
      })
      const original = target?.sharedPost ?? target
      if (!original || original.privacy !== 'public' || original.groupId) {
        return NextResponse.json({ error: 'This post can’t be shared.' }, { status: 400 })
      }
      shareOf = { id: original.id, authorId: original.authorId }
    }

    if (!shareOf && !content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const post = await db.post.create({
      data: {
        content: String(content ?? '').trim(),
        images: shareOf ? [] : images || [],
        feeling: shareOf ? null : feeling,
        location,
        privacy: privacy || 'public',
        authorId: uid,
        ...(shareOf ? { isShare: true, sharedPostId: shareOf.id } : {}),
      },
      include: postInclude(uid),
    })

    if (shareOf && shareOf.authorId !== uid) {
      await notify({
        data: { type: 'share', message: `${session.user.name} shared your post`, receiverId: shareOf.authorId, senderId: uid, link: `/posts/${post.id}` },
      })
    }
    await notifyMentions({ text: post.content, senderId: uid, senderName: session.user.name, link: `/posts/${post.id}`, where: 'post' })

    const [shaped] = await finalizePosts([post], uid)
    return NextResponse.json(shaped, { status: 201 })
  } catch (error) {
    console.error('[POSTS_POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
