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
      approved?: boolean | null
    }
  }

  interface User {
    username?: string | null
    role?: string | null
    subscriptionStatus?: string | null
    accmMember?: boolean | null
    trialEndsAt?: Date | string | null
    approved?: boolean | null
    sessionToken?: string | null
    rememberMe?: boolean
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
    approved?: boolean | null
    sessionToken?: string | null
    rememberMe?: boolean
    error?: string
  }
}
