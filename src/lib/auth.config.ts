import type { NextAuthConfig } from 'next-auth'
import type { JWT } from 'next-auth/jwt'

// A large avatar (e.g. a base64 data: URI) baked into the JWT bloats the session
// cookie until it's chunked into Set-Cookie headers that exceed the edge header
// limit — which crashes the middleware with "response headers exceed the maximum
// size". Keep the token tiny by dropping any oversized `picture` claim. Avatars
// still load everywhere else from the DB (feed/profile APIs, not the cookie).
export function stripLargePicture(token: JWT): JWT {
  if (typeof token.picture === 'string' && (token.picture.startsWith('data:') || token.picture.length > 512)) {
    delete token.picture
  }
  return token
}

// Edge-compatible auth config — NO Prisma, NO bcrypt, NO Node.js-only modules.
// Used only in middleware.ts (Edge Runtime).
// The full auth with PrismaAdapter lives in auth.ts (Node.js runtime only).
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    newUser: '/onboarding',
  },
  providers: [], // providers are added in auth.ts — not needed for middleware
  callbacks: {
    jwt({ token }) {
      return stripLargePicture(token)
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register') ||
        nextUrl.pathname.startsWith('/forgot-password') ||
        nextUrl.pathname.startsWith('/reset-password')
      const isApiRoute = nextUrl.pathname.startsWith('/api')

      if (isApiRoute) return true
      if (isAuthPage) return isLoggedIn ? Response.redirect(new URL('/', nextUrl)) : true
      if (!isLoggedIn) return Response.redirect(new URL('/login', nextUrl))
      return true
    },
  },
}
