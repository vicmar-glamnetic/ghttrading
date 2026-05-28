import type { NextAuthConfig } from 'next-auth'

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
