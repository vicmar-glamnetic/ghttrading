import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { requireAdmin, ROLES, FREE_ROLES, type Role } from '@/lib/admin'

const USER_SELECT = {
  id: true, name: true, email: true, username: true, image: true,
  role: true, accmMember: true, subscriptionStatus: true, paymentRef: true, trialEndsAt: true, subscriptionEnd: true, createdAt: true,
}

export async function GET(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const params = new URL(req.url).searchParams
  const q = params.get('q')?.trim()
  const role = params.get('role')?.trim()

  const where: Record<string, unknown> = {}
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
    ]
  }
  if (role && (ROLES as readonly string[]).includes(role)) where.role = role

  const [users, counts] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: 'desc' }, select: USER_SELECT }),
    db.user.groupBy({ by: ['role'], _count: { _all: true } }),
  ])

  const byRole: Record<string, number> = {}
  for (const c of counts) byRole[c.role] = c._count._all
  const total = Object.values(byRole).reduce((a, b) => a + b, 0)

  return NextResponse.json({
    users,
    stats: {
      total,
      admin: byRole.admin ?? 0,
      coach: byRole.coach ?? 0,
      member: byRole.member ?? 0,
    },
  })
}

export async function POST(req: Request) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, email, password, role } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  const chosenRole: Role = (ROLES as readonly string[]).includes(role) ? role : 'member'

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 })

  const hashedPassword = await bcrypt.hash(String(password), 12)

  const baseUsername = String(name).toLowerCase().replace(/\s+/g, '').slice(0, 15) || 'trader'
  let username = baseUsername
  let counter = 1
  while (await db.user.findUnique({ where: { username } })) {
    username = `${baseUsername}${counter++}`
  }

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      username,
      role: chosenRole,
      emailVerified: new Date(), // admin-created accounts are trusted/verified
      // Free-access roles are marked comped so billing never paywalls them.
      subscriptionStatus: FREE_ROLES.includes(chosenRole) ? 'comp' : 'free',
    },
    select: USER_SELECT,
  })

  return NextResponse.json(user, { status: 201 })
}
