import 'next-auth'

declare module 'next-auth' {
  interface Session {
    error?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      username?: string | null
      role?: string | null
      subscriptionStatus?: string | null
      accmMember?: boolean | null
      trialEndsAt?: string | null
    }
  }

  interface User {
    username?: string | null
    role?: string | null
    subscriptionStatus?: string | null
    accmMember?: boolean | null
    trialEndsAt?: Date | string | null
    sessionToken?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    username?: string | null
    role?: string | null
    subscriptionStatus?: string | null
    accmMember?: boolean | null
    trialEndsAt?: string | null
    sessionToken?: string | null
    error?: string
  }
}
