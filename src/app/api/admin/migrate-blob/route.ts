import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { requireAdmin } from '@/lib/admin'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const maxDuration = 60

// Convert one base64 data URL to a Blob file and return its URL.
async function migrate(dataUrl: string): Promise<string> {
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl)
  if (!m) return dataUrl
  const contentType = m[1]
  const buffer = Buffer.from(m[2], 'base64')
  const ext = (contentType.split('/')[1] || 'bin').split('+')[0]
  const blob = await put(`migrated/media.${ext}`, buffer, { access: 'public', contentType, addRandomSuffix: true })
  return blob.url
}

// One-time migration of existing base64 images (stored in the DB) to Vercel
// Blob. Processes a small batch per call — the admin UI loops until done.
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    let migrated = 0

    // User avatars
    for (const u of await db.user.findMany({ where: { image: { startsWith: 'data:' } }, select: { id: true, image: true }, take: 4 })) {
      await db.user.update({ where: { id: u.id }, data: { image: await migrate(u.image!) } }); migrated++
    }
    // User covers
    for (const u of await db.user.findMany({ where: { coverImage: { startsWith: 'data:' } }, select: { id: true, coverImage: true }, take: 4 })) {
      await db.user.update({ where: { id: u.id }, data: { coverImage: await migrate(u.coverImage!) } }); migrated++
    }
    // Group images/covers
    for (const g of await db.group.findMany({ where: { OR: [{ image: { startsWith: 'data:' } }, { coverImage: { startsWith: 'data:' } }] }, select: { id: true, image: true, coverImage: true }, take: 4 })) {
      await db.group.update({ where: { id: g.id }, data: {
        image: g.image?.startsWith('data:') ? await migrate(g.image) : g.image,
        coverImage: g.coverImage?.startsWith('data:') ? await migrate(g.coverImage) : g.coverImage,
      } }); migrated++
    }
    // Page images/covers
    for (const p of await db.page.findMany({ where: { OR: [{ image: { startsWith: 'data:' } }, { coverImage: { startsWith: 'data:' } }] }, select: { id: true, image: true, coverImage: true }, take: 4 })) {
      await db.page.update({ where: { id: p.id }, data: {
        image: p.image?.startsWith('data:') ? await migrate(p.image) : p.image,
        coverImage: p.coverImage?.startsWith('data:') ? await migrate(p.coverImage) : p.coverImage,
      } }); migrated++
    }
    // Post media (String[]) — find posts still holding a data: entry.
    const posts = await db.$queryRaw<{ id: string; images: string[] }[]>`
      SELECT id, images FROM posts WHERE EXISTS (SELECT 1 FROM unnest(images) e WHERE e LIKE 'data:%') LIMIT 2`
    for (const p of posts) {
      const next: string[] = []
      for (const img of p.images) next.push(img.startsWith('data:') ? await migrate(img) : img)
      await db.post.update({ where: { id: p.id }, data: { images: next } }); migrated++
    }

    // Remaining count so the UI can show progress.
    const [uCount, gCount, pgCount, postRows] = await Promise.all([
      db.user.count({ where: { OR: [{ image: { startsWith: 'data:' } }, { coverImage: { startsWith: 'data:' } }] } }),
      db.group.count({ where: { OR: [{ image: { startsWith: 'data:' } }, { coverImage: { startsWith: 'data:' } }] } }),
      db.page.count({ where: { OR: [{ image: { startsWith: 'data:' } }, { coverImage: { startsWith: 'data:' } }] } }),
      db.$queryRaw<{ c: number }[]>`SELECT count(*)::int AS c FROM posts WHERE EXISTS (SELECT 1 FROM unnest(images) e WHERE e LIKE 'data:%')`,
    ])
    const remaining = uCount + gCount + pgCount + (postRows[0]?.c ?? 0)

    return NextResponse.json({ migrated, remaining, done: migrated === 0 })
  } catch (error) {
    console.error('[MIGRATE_BLOB]', error)
    return NextResponse.json({ error: (error as Error).message || 'Migration failed' }, { status: 500 })
  }
}
