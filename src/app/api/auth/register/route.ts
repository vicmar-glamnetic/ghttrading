import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomInt } from 'crypto'
import { db } from '@/lib/db'
import { verifyTurnstile } from '@/lib/turnstile'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(req: Request) {
  try {
    const { name, email, password, turnstileToken } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Bot check (skipped automatically if Turnstile isn't configured).
    if (!(await verifyTurnstile(turnstileToken))) {
      return NextResponse.json({ error: 'Bot verification failed. Please try again.' }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate username from name
    const baseUsername = String(name).toLowerCase().replace(/\s+/g, '').slice(0, 15) || 'trader'
    let username = baseUsername
    let counter = 1
    while (await db.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter++}`
    }

    // Create the account unverified — they must confirm the emailed code.
    await db.user.create({
      data: { name, email, password: hashedPassword, username }, // emailVerified stays null
      select: { id: true },
    })

    // Generate + store a 6-digit code (15 min expiry) and email it.
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const expires = new Date(Date.now() + 15 * 60 * 1000)
    await db.emailVerificationCode.upsert({
      where: { email },
      create: { email, code, expires },
      update: { code, expires },
    })

    try {
      await sendVerificationEmail(email, code)
    } catch (e) {
      console.error('[REGISTER_EMAIL]', e)
      return NextResponse.json({ error: 'Could not send verification email. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ needsVerification: true, email }, { status: 201 })
  } catch (error) {
    console.error('[REGISTER]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
