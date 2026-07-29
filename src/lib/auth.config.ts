import type { NextAuthConfig } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import { hasAccess } from './billing'
import { isVerificationExempt, needsVerification } from './identity'

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
    // Expose role + subscription status to the authorized() check below.
    session({ session, token }) {
      if (token && session.user) {
        session.user.role = (token.role as string) ?? 'member'
        session.user.subscriptionStatus = (token.subscriptionStatus as string) ?? 'free'
        session.user.accmMember = (token.accmMember as boolean) ?? true
        session.user.trialEndsAt = (token.trialEndsAt as string) ?? null
        session.user.approved = (token.approved as boolean | undefined) ?? true
        session.user.accmVerifyStatus = (token.accmVerifyStatus as string) ?? 'unverified'
      }
      return session
    },
    authorized({ auth, request }) {
      const { nextUrl } = request
      const isLoggedIn = !!auth?.user
      const isAuthPage =
        nextUrl.pathname.startsWith('/login') ||
        nextUrl.pathname.startsWith('/register') ||
        nextUrl.pathname.startsWith('/verify-email') ||
        nextUrl.pathname.startsWith('/forgot-password') ||
        nextUrl.pathname.startsWith('/reset-password')
      const isApiRoute = nextUrl.pathname.startsWith('/api')
      const isPublicPage =
        nextUrl.pathname.startsWith('/terms') ||
        nextUrl.pathname.startsWith('/privacy') ||
        nextUrl.pathname.startsWith('/help')

      // Unverified ACCM members are blocked from changing anything until a coach
      // approves their proof. The popup is the UX, but a popup is only a
      // suggestion — anyone with devtools can dismiss it — so the block has to
      // live server-side as well. Writes only: reads stay open so the gate can
      // load, and so nothing is gained by leaving the app half-broken.
      if (isLoggedIn && auth?.user && needsVerification(auth.user) && !isVerificationExempt(nextUrl.pathname)) {
        const isWrite = request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'OPTIONS'
        if (isWrite) {
          return Response.json(
            { error: 'Your ACCM account is still being verified. You can post once a coach approves it.' },
            { status: 403 },
          )
        }
      }

      if (isApiRoute) return true
      if (isPublicPage) return true
      if (isAuthPage) return isLoggedIn ? Response.redirect(new URL('/', nextUrl)) : true
      if (!isLoggedIn) return Response.redirect(new URL('/login', nextUrl))

      // Full paywall: once the 3-day free trial ends without an active
      // subscription, the ENTIRE app is locked — not just premium sections.
      // ACCM members, staff (admin/coach), and active/comp subscribers always
      // pass hasAccess(), so only expired-trial non-ACCM members are locked out.
      // The upgrade + pending pages stay reachable so they can still subscribe
      // (or sign out from there).
      const isBillingPage =
        nextUrl.pathname === '/upgrade' ||
        nextUrl.pathname.startsWith('/upgrade/') ||
        nextUrl.pathname.startsWith('/pending')
      if (!isBillingPage && auth?.user && !hasAccess(auth.user)) {
        return Response.redirect(new URL('/upgrade', nextUrl))
      }
      return true
    },
  },
}
