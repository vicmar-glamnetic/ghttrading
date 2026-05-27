import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

// Use the edge-compatible config only — no Prisma, no Node.js modules.
export default NextAuth(authConfig).auth

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
