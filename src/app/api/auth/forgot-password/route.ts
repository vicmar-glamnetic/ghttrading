import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } })

    // Always return success to avoid user enumeration
    if (!user) return NextResponse.json({ success: true })

    // Delete any existing reset tokens for this email
    await db.passwordResetToken.deleteMany({ where: { email: email.toLowerCase() } })

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.passwordResetToken.create({
      data: { email: email.toLowerCase(), token, expires },
    })

    await sendPasswordResetEmail(email.toLowerCase(), token)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[FORGOT_PASSWORD]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
