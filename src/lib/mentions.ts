import { db } from '@/lib/db'
import { extractMentions } from '@/lib/mentionText'
import { notifyMany } from '@/lib/notify'

/**
 * Notify everyone @mentioned in `text` (except the writer and anyone in `skip`,
 * e.g. the post author who already gets a comment notification). For group
 * posts pass `groupId` so only members are notified — others couldn't open it.
 */
export async function notifyMentions({ text, senderId, senderName, link, where, groupId, skip = [] }: {
  text: string
  senderId: string
  senderName: string | null | undefined
  link: string
  where: 'post' | 'comment'
  groupId?: string | null
  skip?: string[]
}) {
  const names = extractMentions(text)
  if (names.length === 0) return
  try {
    const users = await db.user.findMany({
      where: {
        OR: names.map(username => ({ username: { equals: username, mode: 'insensitive' as const } })),
        id: { notIn: [senderId, ...skip] },
        ...(groupId ? { groupMemberships: { some: { groupId, status: 'active' } } } : {}),
      },
      select: { id: true },
    })
    if (users.length === 0) return
    await notifyMany(users.map(u => ({
      type: 'mention',
      message: `${senderName || 'Someone'} mentioned you in a ${where}`,
      receiverId: u.id,
      senderId,
      link,
    })))
  } catch (err) {
    // A missed mention notification shouldn't fail the post or comment.
    console.error('[MENTIONS]', err)
  }
}
