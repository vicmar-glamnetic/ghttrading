// One-time back-fix: align stored journal P&L sign with the win/loss result.
// Prior to the normalizePnl fix, a loss logged as a positive number (e.g. 80
// instead of -80) was stored — and shown — as a profit. This corrects any
// entry where the sign contradicts the selected result:
//   - result 'loss' with pnl > 0  -> negate
//   - result 'win'  with pnl < 0  -> negate
// Run once:  npx tsx scripts/backfill-journal-pnl.ts
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const suspects = await db.journalEntry.findMany({
    where: {
      OR: [
        { result: 'loss', pnl: { gt: 0 } },
        { result: 'win', pnl: { lt: 0 } },
      ],
    },
    select: { id: true, result: true, pnl: true, title: true, authorId: true },
  })

  if (suspects.length === 0) {
    console.log('No mismatched entries found. Nothing to fix.')
    return
  }

  console.log(`Found ${suspects.length} entr${suspects.length === 1 ? 'y' : 'ies'} to correct:`)
  for (const e of suspects) {
    const fixed = -(e.pnl as number)
    console.log(`  ${e.id} (${e.result}) "${e.title ?? 'Untitled'}": ${e.pnl} -> ${fixed}`)
    await db.journalEntry.update({ where: { id: e.id }, data: { pnl: fixed } })
  }
  console.log(`\nDone. Corrected ${suspects.length} entr${suspects.length === 1 ? 'y' : 'ies'}.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
