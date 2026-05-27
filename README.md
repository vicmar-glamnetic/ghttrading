# GHT Community

A Facebook-like social network for community.ghttrading.co

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js v5 (credentials)
- **Styling:** Tailwind CSS
- **Payments:** Stripe ($2/month subscriptions)
- **Images:** Cloudinary

## Getting Started

### 1. Database Setup

You need a PostgreSQL database. Options:
- **Local:** Install PostgreSQL and create a database
- **Neon (free):** https://neon.tech
- **Supabase (free):** https://supabase.com
- **Railway:** https://railway.app

Update `DATABASE_URL` in `.env`

### 2. Environment Variables

Copy `.env` and fill in your values:
```bash
cp .env .env.local
```

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Random 32+ char string (run: `openssl rand -base64 32`)

Optional (for full functionality):
- Cloudinary credentials (image uploads)
- Stripe keys (payments)

### 3. Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Seed Database (optional)

```bash
npx ts-node prisma/seed.ts
# Admin: admin@ghttrading.co / password123
```

### 5. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Deployment

See the DNS/Deployment Guide for instructions on deploying to community.ghttrading.co

## Features

- User registration & login
- News feed with infinite scroll
- Create posts with privacy settings
- Like & comment on posts
- User profiles with cover photos
- Follow/unfollow users
- Friend request system
- Notifications
- Search users
- Settings page
- Stripe subscription ready ($2/month)

## Stripe Setup (for paid subscriptions)

1. Create a Stripe account at stripe.com
2. Create a product with $2/month price
3. Add keys to `.env`
4. For webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
# ghttrading
