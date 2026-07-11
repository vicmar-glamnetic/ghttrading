import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId } = await params
    const isOwn = userId === session.user.id

    // Explicit select: this response is readable by any signed-in member, so it
    // must never carry credentials (password, sessionToken) or billing fields.
    // The ACCM number is a private account identifier — expose it to the owner only.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, username: true, image: true, coverImage: true,
        bio: true, location: true, website: true, role: true, createdAt: true,
        lastSeenAt: true,
        ...(isOwn ? { accmNumber: true } : {}),
        _count: { select: { followers: true, following: true, posts: true } },
        followers: { where: { followerId: session.user.id }, select: { followerId: true } },
      },
    })

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const friendRequest = await db.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: userId },
          { senderId: userId, receiverId: session.user.id },
        ],
      },
    })

    return NextResponse.json({
      ...user,
      isFollowing: user.followers.length > 0,
      friendRequest,
    })
  } catch (error) {
    console.error('[USER_PROFILE_GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId } = await params
    if (userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { name, bio, location, website, image, coverImage } = body

    // Optional username change — validated + uniqueness-checked.
    let username: string | undefined
    if (body.username !== undefined) {
      username = String(body.username).trim().toLowerCase()
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return NextResponse.json(
          { error: 'Username must be 3–20 characters: lowercase letters, numbers, or underscores.' },
          { status: 400 },
        )
      }
      const taken = await db.user.findFirst({ where: { username, NOT: { id: userId } }, select: { id: true } })
      if (taken) return NextResponse.json({ error: 'That username is already taken.' }, { status: 409 })
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { name, bio, location, website, image, coverImage, ...(username !== undefined ? { username } : {}) },
      select: { id: true, name: true, bio: true, location: true, website: true, image: true, coverImage: true, username: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('[USER_PROFILE_PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
