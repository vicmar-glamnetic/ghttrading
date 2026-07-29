import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { encode } from 'next-auth/jwt'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { db } from './db'
import { consumeTicket } from './securityCode'
import { authConfig, stripLargePicture } from './auth.config'

// "Remember me" session lengths. When the box is checked the session lasts the
// full 30 days; when it's unchecked we mint a short-lived token so the login
// doesn't outlive the day (useful on shared/public machines).
const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
const SHORT_MAX_AGE = 24 * 60 * 60 // 1 day

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt', maxAge: REMEMBER_MAX_AGE }, // 30 days (cookie lifetime)
  jwt: {
    // The cookie's own expiry is fixed at session.maxAge, but the token's `exp`
    // claim is what actually decides whether a session is still valid. Shorten
    // it for non-"remember me" logins so those sessions expire early even though
    // the cookie lingers. token.rememberMe is set in the jwt() callback below.
    async encode(params) {
      const maxAge = params.token?.rememberMe ? REMEMBER_MAX_AGE : SHORT_MAX_AGE
      return encode({ ...params, maxAge })
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        rememberMe: { label: 'Remember me', type: 'text' },
        passkeyTicket: { label: 'Passkey ticket', type: 'text' },
      },
      async authorize(credentials) {
        let user = null

        // --- Passkey sign-in ---------------------------------------------
        // The ticket is only minted after /api/auth/passkey/login/verify has
        // checked the assertion against the stored public key, so reaching here
        // with a valid one means the device already proved the member's
        // identity — no password involved. Routing it through authorize()
        // rather than minting a session directly keeps every sign-in on one
        // path: same emailVerified gate, same session-token rotation below.
        if (typeof credentials?.passkeyTicket === 'string' && credentials.passkeyTicket) {
          const userId = await consumeTicket(credentials.passkeyTicket, 'passkey')
          if (!userId) return null
          user = await db.user.findUnique({ where: { id: userId } })
          if (!user) return null
        } else {
          // --- Password sign-in --------------------------------------------
          if (!credentials?.email || !credentials?.password) return null

          // Case-insensitive so login works regardless of how the email was typed.
          const email = String(credentials.email).trim().toLowerCase()
          user = await db.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
          })

          if (!user || !user.password) return null

          const passwordsMatch = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (!passwordsMatch) return null
        }

        // Block sign-in until the email is verified (new sign-ups must confirm).
        if (!user.emailVerified) return null

        // Generate a new session token — this invalidates all other active sessions
        const sessionToken = randomUUID()
        await db.user.update({
          where: { id: user.id },
          data: { sessionToken },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          // Keep large/data-URI avatars out of the JWT (see stripLargePicture).
          image: user.image && !user.image.startsWith('data:') && user.image.length <= 512 ? user.image : null,
          username: user.username,
          role: user.role,
          subscriptionStatus: user.subscriptionStatus,
          accmMember: user.accmMember,
          trialEndsAt: user.trialEndsAt,
          approved: user.approved,
          sessionToken,
          rememberMe: credentials.rememberMe !== 'false',
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        // Fresh sign-in — store the new session token in the JWT
        token.id = user.id
        token.username = (user as { username?: string }).username
        token.role = (user as { role?: string }).role
        token.subscriptionStatus = (user as { subscriptionStatus?: string }).subscriptionStatus
        token.accmMember = (user as { accmMember?: boolean }).accmMember
        token.trialEndsAt = (user as { trialEndsAt?: Date | null }).trialEndsAt?.toISOString?.() ?? null
        token.approved = (user as { approved?: boolean }).approved
        token.sessionToken = (user as { sessionToken?: string }).sessionToken
        token.rememberMe = (user as { rememberMe?: boolean }).rememberMe
        token.lastVerified = Date.now()
      } else if (token.id) {
        // Only hit the DB once every 5 minutes — SessionGuard calls update()
        // on the same interval, so invalidation still propagates quickly.
        // An explicit update() (e.g. after editing your profile) forces a refresh.
        const FIVE_MIN = 5 * 60 * 1000
        const due = trigger === 'update' || !token.lastVerified || Date.now() - (token.lastVerified as number) > FIVE_MIN
        if (due) {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: { sessionToken: true, username: true, role: true, subscriptionStatus: true, accmMember: true, trialEndsAt: true, approved: true },
          })
          if (!dbUser || dbUser.sessionToken !== token.sessionToken) {
            token.error = 'SessionInvalid'
          } else {
            token.username = dbUser.username // pick up username changes
            token.role = dbUser.role // pick up role changes
            token.subscriptionStatus = dbUser.subscriptionStatus // pick up billing changes
            token.accmMember = dbUser.accmMember
            token.trialEndsAt = dbUser.trialEndsAt ? dbUser.trialEndsAt.toISOString() : null
            token.approved = dbUser.approved // pick up approval
            token.lastVerified = Date.now()
          }
        }
      }
      // Never let an oversized avatar bloat the session cookie.
      return stripLargePicture(token)
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = (token.role as string) ?? 'member'
        session.user.subscriptionStatus = (token.subscriptionStatus as string) ?? 'free'
        session.user.accmMember = (token.accmMember as boolean) ?? true
        session.user.trialEndsAt = (token.trialEndsAt as string) ?? null
        session.user.approved = (token.approved as boolean | undefined) ?? true
        if (token.error) {
          session.error = token.error as string
        }
      }
      return session
    },
  },
})
