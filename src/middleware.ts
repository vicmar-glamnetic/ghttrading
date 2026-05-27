import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

// Use the edge-compatible config only — no Prisma, no Node.js modules.
export default NextAuth(authConfig).auth

export const config = {
  // Exclude _next internals, static files, and all public assets (images, fonts, etc.)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|otf|mp4|webm)).*)'],
}
