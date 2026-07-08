import { NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'

// Confirm the emailed code and mark the account verified.
export async function POST(req: Request) {
  try {
    const { email: rawEmail, code } = await req.json()
    const email = String(rawEmail || '').trim().toLowerCase()
    if (!email || !code) return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })

    const record = await db.emailVerificationCode.findUnique({ where: { email } })
    if (!record || record.code !== String(code).trim()) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }
    if (record.expires < new Date()) {
      return NextResponse.json({ error: 'Code expired — request a new one' }, { status: 400 })
    }

    await db.user.update({ where: { email }, data: { emailVerified: new Date() } })
    await db.emailVerificationCode.delete({ where: { email } }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[VERIFY_EMAIL]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Resend a fresh code.
export async function PUT(req: Request) {
  try {
    const { email: rawEmail } = await req.json()
    const email = String(rawEmail || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const user = await db.user.findUnique({ where: { email }, select: { emailVerified: true } })
    if (!user) return NextResponse.json({ error: 'No account for that email' }, { status: 400 })
    if (user.emailVerified) return NextResponse.json({ error: 'Already verified' }, { status: 400 })

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const expires = new Date(Date.now() + 15 * 60 * 1000)
    await db.emailVerificationCode.upsert({ where: { email }, create: { email, code, expires }, update: { code, expires } })
    await sendVerificationEmail(email, code)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[VERIFY_EMAIL_RESEND]', error)
    return NextResponse.json({ error: 'Could not resend code' }, { status: 500 })
  }
}
