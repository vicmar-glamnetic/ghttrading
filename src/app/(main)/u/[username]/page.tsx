import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'

/** @mention links point here: /u/<username> → that member's profile. */
export default async function UsernameRedirect({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const user = await db.user.findFirst({
    where: { username: { equals: decodeURIComponent(username), mode: 'insensitive' } },
    select: { id: true },
  })
  if (!user) notFound()
  redirect(`/profile/${user.id}`)
}
