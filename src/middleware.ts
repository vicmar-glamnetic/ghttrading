import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { type NextRequest, NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

// Wrap in try-catch so a corrupted/oversized JWT cookie never causes a 500.
// When the cookie can't be decrypted, clear it and let the user log in fresh.
export default async function middleware(req: NextRequest) {
  try {
    return await (auth as unknown as (r: NextRequest) => Promise<Response | undefined>)(req)
  } catch {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    const res = NextResponse.redirect(url)
    res.cookies.delete('authjs.session-token')
    res.cookies.delete('__Secure-authjs.session-token')
    res.cookies.delete('next-auth.session-token')
    res.cookies.delete('__Secure-next-auth.session-token')
    return res
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|mp4|webm|json)).*)',
  ],
}
