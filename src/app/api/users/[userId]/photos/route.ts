import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const isVideo = (url: string) => url.startsWith('data:video') || /\.(mp4|mov|webm|avi)$/i.test(url)

/**
 * Photos a member has posted, newest first, for the Photos tab. Same visibility
 * as their Posts tab: public posts only unless it's your own profile, and never
 * group posts.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId } = await params
  const posts = await db.post.findMany({
    where: {
      authorId: userId,
      groupId: null,
      isShare: false,
      NOT: { images: { isEmpty: true } },
      ...(userId !== session.user.id ? { privacy: 'public' } : {}),
    },
    select: { id: true, images: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const photos = posts.flatMap(p => p.images.filter(u => !isVideo(u)).map(url => ({ url, postId: p.id })))
  return NextResponse.json(photos.slice(0, 200))
}
