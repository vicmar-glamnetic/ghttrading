# GHT Community — Project Documentation

A **Facebook-style social network** for the Gold Heist Trading community,
intended for **community.ghttrading.co**. Full-stack Next.js app with auth, a
PostgreSQL database, a news feed, profiles, groups, and trading-themed sections
(signals, analysis, journal, education).

> **Status:** Code is built and the initial DB schema/migration exists. It still
> needs a **PostgreSQL database provisioned** and a **deployment** (not yet
> live). See §9.

---

## 1. Overview

| | |
|---|---|
| **Product** | Facebook-like social network for the trading community |
| **Intended URL** | community.ghttrading.co (subdomain — sibling to the main landing site) |
| **App name** | "GHT Community" (`NEXT_PUBLIC_APP_NAME`) |
| **Status** | Code complete; needs DB + deploy |
| **Relationship** | Separate app from `../landing` (the marketing site). They share the brand and domain, not code. |

---

## 2. Tech Stack

- **Next.js 16** (App Router, TypeScript) + **React 19**
- **PostgreSQL** + **Prisma 7** ORM (via `@prisma/adapter-pg` + `pg`)
- **NextAuth.js v5** (beta) — credentials auth + `@auth/prisma-adapter`
- **Tailwind CSS v4** + **Radix UI** primitives (avatar, dialog, dropdown, tabs, toast, separator)
- **UploadThing** — image/media uploads
- **Resend** — transactional email (password reset, etc.)
- **bcryptjs** — password hashing
- `class-variance-authority`, `clsx`, `tailwind-merge`, `date-fns`, `lucide-react`

> ⚠️ The `README.md` mentions **Stripe** (subscriptions) and **Cloudinary**
> (images). In the current code, **image uploads use UploadThing** and **email
> uses Resend**; **Stripe is not installed** — subscriptions are aspirational /
> not yet wired. `next.config.ts` still allows Cloudinary image hosts in
> `remotePatterns`, but uploads go through UploadThing.

---

## 3. Project Structure

```
community/
├── prisma/
│   ├── schema.prisma            # DB models (see §5)
│   ├── migrations/
│   │   └── 20260527065334_init  # initial migration
│   └── seed.ts                  # seed data (admin@ghttrading.co / password123)
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth route group (own layout)
│   │   │   ├── login/ register/ forgot-password/ reset-password/
│   │   ├── (main)/              # Logged-in app (own layout + loading)
│   │   │   ├── page.tsx         # News feed (home)
│   │   │   ├── signals/ analysis/ education/ journal/ events/
│   │   │   ├── groups/ pages/ friends/ notifications/ saved/ settings/
│   │   ├── api/
│   │   │   ├── posts/ groups/ journal/ notifications/ pages/  # REST routes
│   │   │   ├── upload/                # upload route
│   │   │   └── uploadthing/           # UploadThing core + route handler
│   │   ├── layout.tsx           # Root layout
│   │   ├── manifest.ts          # PWA manifest
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/              # Navbar, LeftSidebar, RightSidebar, MobileBottomNav
│   │   ├── feed/FeedClient.tsx  # Infinite-scroll feed
│   │   ├── posts/               # CreatePost, PostCard, MediaUpload
│   │   ├── ui/                  # Avatar, Button, ImageLightbox
│   │   ├── Providers.tsx        # Session/theme providers
│   │   └── SessionGuard.tsx     # Client auth gate
│   ├── lib/
│   │   ├── auth.ts              # NextAuth setup
│   │   ├── auth.config.ts       # Auth config (providers, callbacks)
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── email.ts             # Resend email helpers
│   │   └── utils.ts
│   ├── generated/prisma/        # ⚙️ Generated Prisma client (do not edit)
│   ├── types/                   # App types + next-auth type augmentation
│   └── middleware.ts            # Route protection (redirects unauthed users)
├── README.md                    # Quick start
└── PROJECT.md                   # This file
```

### Route groups
- **`(auth)`** — login, register, forgot/reset password. Public, own layout.
- **`(main)`** — the authenticated app shell (navbar + sidebars + feed). Guarded
  by `middleware.ts` / `SessionGuard`.

---

## 4. Features

- **Auth** — register, login, logout; password reset via emailed token
  (Resend). Passwords hashed with bcrypt.
- **News feed** — create posts (with media), infinite scroll, like & comment.
- **Profiles** — avatars, cover photos, follow/unfollow.
- **Social graph** — follows + friend requests.
- **Groups & Pages** — community groups and followable pages.
- **Notifications** — activity notifications.
- **Trading sections** — `signals`, `analysis`, `education`, `journal` (trade
  journal entries), `events`. These give the network its trading-community
  identity vs. a generic Facebook clone.
- **Saved** posts, **Search**, **Settings**.
- **Mobile** — bottom nav + responsive layout; PWA manifest.

---

## 5. Database Schema — `prisma/schema.prisma`

Prisma client is generated to **`src/generated/prisma`** (custom output — import
from there / via `src/lib/db.ts`, not `@prisma/client` directly).

**Models:**
- **Auth/NextAuth:** `User`, `Account`, `Session`, `VerificationToken`,
  `PasswordResetToken`
- **Content:** `Post`, `Comment`, `Like`, `JournalEntry`
- **Social graph:** `Follow`, `FriendRequest`, `Notification`
- **Communities:** `Group`, `GroupMember`, `Page`, `PageFollow`

Initial migration: `prisma/migrations/20260527065334_init`.

---

## 6. Environment Variables — `.env`

| Var | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (**required**) |
| `AUTH_SECRET` | NextAuth secret — `openssl rand -base64 32` (**required**) |
| `NEXTAUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `NEXT_PUBLIC_APP_NAME` | Display name ("GHT Community") |

Additional secrets to add for full functionality (not in the base `.env`):
- **UploadThing** token (image uploads)
- **Resend** API key (emails)

---

## 7. Scripts — `package.json`

| Command | Action |
|---|---|
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | `prisma generate && next build` |
| `npm start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:generate` | `prisma generate` |
| `npm run db:seed` | Seed DB (`ts-node prisma/seed.ts`) |
| `npm run db:studio` | Prisma Studio (DB GUI) |
| `postinstall` | `prisma generate` (runs automatically) |

---

## 8. Local Development

```bash
cd community
npm install

# 1. Provision a Postgres DB (Neon / Supabase / Railway / local) and set
#    DATABASE_URL + AUTH_SECRET in .env
# 2. Apply schema
npm run db:migrate          # or: npx prisma migrate dev --name init
# 3. (optional) seed — creates admin@ghttrading.co / password123
npm run db:seed
# 4. Run
npm run dev
```

Node 20+ recommended.

---

## 9. Deployment (Outstanding)

Not yet deployed. To go live on **community.ghttrading.co**:

1. **Provision a managed Postgres** (Neon/Supabase/Railway). Copy its
   `DATABASE_URL`.
2. **Deploy to Vercel** (same flow as the landing site): import the repo, set
   **Root Directory** to `community` if needed.
3. **Set env vars** in Vercel: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`
   (= `https://community.ghttrading.co`), `NEXT_PUBLIC_APP_URL`,
   `NEXT_PUBLIC_APP_NAME`, plus UploadThing + Resend keys.
4. **Run migrations** against the production DB (`prisma migrate deploy`).
   The `build` script runs `prisma generate`; migrations must be applied
   separately (e.g. a deploy step or one-off command).
5. **DNS:** add a `community` subdomain record at GoDaddy pointing to Vercel,
   and add `community.ghttrading.co` in the Vercel project's Domains.

---

## 10. Notes & Caveats

- **Prisma output is custom** (`src/generated/prisma`). Always run
  `prisma generate` after schema changes (the `build`/`postinstall` scripts do).
- **`AGENTS.md` warning:** this is Next.js 16 with breaking changes vs. older
  versions — check `node_modules/next/dist/docs/` before relying on older
  conventions.
- **Stripe subscriptions** described in the README are **not implemented** in the
  current dependencies; add Stripe if/when paid tiers are needed.
- The **seed admin** (`admin@ghttrading.co` / `password123`) is for local/dev
  only — change or remove before production.
- This app is independent of the `../landing` marketing site; they only share
  the brand and parent domain.
