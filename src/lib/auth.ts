import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { db } from './db'
import { authConfig, stripLargePicture } from './auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Case-insensitive so login works regardless of how the email was typed.
        const email = String(credentials.email).trim().toLowerCase()
        const user = await db.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        })

        if (!user || !user.password) return null

        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordsMatch) return null

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
