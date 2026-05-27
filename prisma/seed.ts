import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const password = await bcrypt.hash('password123', 12)

  // Create admin user
  const admin = await db.user.upsert({
    where: { email: 'admin@ghttrading.co' },
    update: {},
    create: {
      name: 'GHT Admin',
      email: 'admin@ghttrading.co',
      password,
      username: 'ghtadmin',
      bio: 'Welcome to GHT Community!',
    },
  })

  // Create sample users
  const users = await Promise.all([
    db.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: { name: 'Alice Johnson', email: 'alice@example.com', password, username: 'alicejohnson', bio: 'Love trading and connecting!' },
    }),
    db.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: { name: 'Bob Smith', email: 'bob@example.com', password, username: 'bobsmith', bio: 'Crypto enthusiast' },
    }),
    db.user.upsert({
      where: { email: 'carol@example.com' },
      update: {},
      create: { name: 'Carol Davis', email: 'carol@example.com', password, username: 'caroldavis', bio: 'Day trader & blogger' },
    }),
  ])

  // Create sample posts
  await db.post.createMany({
    data: [
      { content: 'Welcome to GHT Community! 🎉 Excited to connect with fellow traders and enthusiasts here!', authorId: admin.id, privacy: 'public' },
      { content: 'Just made a great trade today. The market is looking bullish! 📈 Who else is feeling positive about the next few months?', authorId: users[0].id, privacy: 'public' },
      { content: 'New to the community! Looking forward to learning from everyone here. Feel free to connect! 👋', authorId: users[1].id, privacy: 'public' },
      { content: 'Tips for beginners: Always do your research before investing. Never invest more than you can afford to lose. Stay patient! 💡', authorId: users[2].id, privacy: 'public' },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seed complete!')
  console.log('Admin login: admin@ghttrading.co / password123')
}

main().catch(console.error).finally(() => db.$disconnect())
