import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate username from name
    const baseUsername = name.toLowerCase().replace(/\s+/g, '').slice(0, 15)
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
      },
      select: { id: true, name: true, email: true, username: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('[REGISTER]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
