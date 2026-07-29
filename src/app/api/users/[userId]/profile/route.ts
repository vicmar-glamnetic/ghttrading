import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { canSeeRealName, isGatedMember } from '@/lib/identity'

export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userId } = await params
    const isOwn = userId === session.user.id
    // Real names are for staff and the owner only (canSeeRealName). Selecting the
    // column conditionally means it can't leak through a stray spread further down.
    const showRealName = canSeeRealName(session.user, userId)

    // Explicit select: this response is readable by any signed-in member, so it
    // must never carry credentials (password, sessionToken) or billing fields.
    // The ACCM number is a private account identifier — expose it to the owner only.
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, username: true, image: true, coverImage: true,
        bio: true, location: true, website: true, role: true, createdAt: true,
        lastSeenAt: true, accmVerifyStatus: true, accmMember: true,
        ...(isOwn ? { accmNumber: true, accmRejectReason: true } : {}),
        ...(showRealName ? { realName: true } : {}),
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
    const { bio, location, website, image, coverImage } = body
    let name = body.name

    const me = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, accmMember: true, name: true, accmNumber: true },
    })
    if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // ACCM members own a formatted, step-up-protected identity ("<Name> - <number>").
    // There is exactly one door for changing it — POST /api/me/identity — so this
    // general-purpose endpoint can't be used to sidestep the format or the e-mailed
    // code. Everything else on the profile still saves normally.
    const gated = isGatedMember(me)
    if (gated) {
      if (body.accmNumber !== undefined && String(body.accmNumber).trim() !== (me.accmNumber ?? '')) {
        return NextResponse.json(
          { error: 'Change your ACCM number from Settings → Account identity.', identityLocked: true },
          { status: 400 },
        )
      }
      if (name !== undefined && String(name).trim() !== (me.name ?? '')) {
        return NextResponse.json(
          { error: 'Change your display name from Settings → Account identity.', identityLocked: true },
          { status: 400 },
        )
      }
      name = undefined // never write it from here
    }

    // Optional ACCM number change — required (non-empty) + uniqueness-checked.
    // Only reachable by staff and other-broker members (gated members returned above).
    let accmNumber: string | undefined
    if (!gated && body.accmNumber !== undefined) {
      accmNumber = String(body.accmNumber).trim()
      if (!accmNumber) return NextResponse.json({ error: 'ACCM number is required.' }, { status: 400 })
      const taken = await db.user.findFirst({ where: { accmNumber, NOT: { id: userId } }, select: { id: true } })
      if (taken) return NextResponse.json({ error: 'That ACCM number is already registered to another account.' }, { status: 409 })
    }

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
      data: {
        name, bio, location, website, image, coverImage,
        ...(username !== undefined ? { username } : {}),
        ...(accmNumber !== undefined ? { accmNumber } : {}),
      },
      select: { id: true, name: true, bio: true, location: true, website: true, image: true, coverImage: true, username: true, accmNumber: true },
    })

    return NextResponse.json(user)
  } catch (error) {
    // Unique-index race on the ACCM number: two saves of the same value at once.
    if ((error as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'That ACCM number is already registered to another account.' }, { status: 409 })
    }
    console.error('[USER_PROFILE_PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
