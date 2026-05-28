import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json()
    if (!token || !password) return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const resetToken = await db.passwordResetToken.findUnique({ where: { token } })

    if (!resetToken) return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    if (resetToken.expires < new Date()) {
      await db.passwordResetToken.delete({ where: { token } })
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 12)

    await db.user.update({
      where: { email: resetToken.email },
      data: { password: hashed, sessionToken: null }, // invalidate any active sessions
    })

    await db.passwordResetToken.delete({ where: { token } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[RESET_PASSWORD]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
