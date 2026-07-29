// Force-sign-out every member. Coaches and admins are deliberately untouched.
//
// How it works: sign-in mints a random `sessionToken` on the user row and copies
// it into the JWT (see src/lib/auth.ts). The jwt() callback re-checks the two
// against each other, so clearing the column invalidates every live JWT for that
// member — the next check flags SessionInvalid and SessionGuard signs them out.
//
// Timing: that check runs at most every 5 minutes per session, so members drop
// off over the following ~5 minutes rather than instantly.
//
// Run once:  npx tsx scripts/logout-members.ts
//            npx tsx scripts/logout-members.ts --dry-run
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

const dryRun = process.argv.includes('--dry-run')

async function main() {
  // role='member' only. Anyone who is currently signed in has a non-null token;
  // rows already null are skipped so the count reflects real sign-outs.
  const where = { role: 'member', sessionToken: { not: null } } as const

  const affected = await db.user.count({ where })
  console.log(`${affected} member session${affected === 1 ? '' : 's'} to invalidate (coaches/admins untouched).`)

  if (dryRun) {
    const sample = await db.user.findMany({ where, select: { email: true }, take: 10 })
    console.log('Dry run — nothing written. Sample:', sample.map(u => u.email).join(', ') || '(none)')
    return
  }

  if (affected === 0) return

  // Also drop the adapter's DB-side sessions. The app runs a JWT strategy so
  // these aren't what authenticates a request, but leaving stale rows behind
  // after a mass sign-out is just litter.
  const { count } = await db.user.updateMany({ where, data: { sessionToken: null } })
  const cleared = await db.session.deleteMany({ where: { user: { role: 'member' } } })

  console.log(`Signed out ${count} members. Cleared ${cleared.count} adapter session rows.`)
  console.log('Members will be redirected to /login within ~5 minutes as each session revalidates.')
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(() => db.$disconnect())
