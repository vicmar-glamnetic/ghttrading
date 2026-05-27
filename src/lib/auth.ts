import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { db } from './db'
import { authConfig } from './auth.config'

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

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) return null

        const passwordsMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!passwordsMatch) return null

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
          image: user.image,
          username: user.username,
          sessionToken,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fresh sign-in — store the new session token in the JWT
        token.id = user.id
        token.username = (user as { username?: string }).username
        token.sessionToken = (user as { sessionToken?: string }).sessionToken
      } else if (token.id) {
        // Subsequent requests — verify the session token still matches the DB
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { sessionToken: true },
        })
        if (!dbUser || dbUser.sessionToken !== token.sessionToken) {
          // Another device logged in and replaced the session token
          token.error = 'SessionInvalid'
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        if (token.error) {
          session.error = token.error as string
        }
      }
      return session
    },
  },
})
