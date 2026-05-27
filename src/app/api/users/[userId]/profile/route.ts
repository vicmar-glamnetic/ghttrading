import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId } = await params

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
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

    const { password, ...safeUser } = user

    return NextResponse.json({
      ...safeUser,
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

    const user = await db.user.update({
      where: { id: userId },
      data: { name, bio, location, website, image, coverImage },
      select: { id: true, name: true, bio: true, location: true, website: true, image: true, coverImage: true, username: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('[USER_PROFILE_PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
