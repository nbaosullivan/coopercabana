# Málaga Stag 2026 — Stag Do Organiser

A mobile-first, zero-friction event app for organising a stag do: itinerary, shared
expenses, flight coordination, and a checklist — each attendee signs in with their
own 4-digit PIN (set once via the group password on first login).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (dark mode by default)
- Supabase Postgres (Free Tier) — with an automatic in-memory mock fallback
- Lucide React icons
- 100% deployable on Vercel's + Supabase's free tiers

## Quick start (no setup required)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no `.env.local`, the app
automatically uses the in-memory mock dataset in `lib/mockData.ts` — pre-seeded
with 4 attendees, a Day 1–2 itinerary, and sample expenses. No PINs are set yet
(`'*'`), so sign in with the group password (`coops`) and you'll be asked to
create your own PIN (Nick is the admin).

## Connecting a real Supabase project (optional)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, paste and run the contents of `schema.sql`.
3. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key:

   ```bash
   cp .env.example .env.local
   ```

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxxxx
   ```

4. Restart `npm run dev`. The app now reads and writes to Postgres instead of
   the in-memory mock — no code changes required, the switch is automatic
   (see `lib/supabase.ts` and `lib/db.ts`).

## Deploying (free)

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com) (free tier).
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel
   project settings (optional — omit them to run on the mock dataset in
   production too).
4. Deploy. Share the URL with the group.

## How login works

There are no emails, magic links, or password resets. Each person picks their
name from a dropdown and signs in with a personal 4-digit PIN. On success, a
`stag_user_id` HTTP-only cookie is set so the session survives app restarts.
"Switch user" in the account menu clears it.

First time in (PIN column is `'*'`, meaning "not set"), they log in with the
shared group password and are prompted to set their own 4-digit PIN. From then
on that PIN is theirs alone; the group password no longer gets them in.

## Project structure

```
├── app/
│   ├── actions.ts          # Server Actions — all mutations & data fetches
│   ├── layout.tsx          # Root layout: header, bottom nav, user context
│   ├── page.tsx             # Redirects to /schedule
│   ├── schedule/page.tsx
│   ├── money/page.tsx
│   ├── flights/page.tsx
│   └── tasks/page.tsx
├── components/
│   ├── Header.tsx           # Dynamic personal action banner
│   ├── BottomNav.tsx
│   ├── LoginModal.tsx
│   ├── UserProvider.tsx     # Client-side auth/user context
│   ├── ScheduleView.tsx / ScheduleCard.tsx
│   ├── MoneyView.tsx / FinanceCard.tsx
│   ├── FlightsView.tsx / FlightMatrix.tsx
│   └── TasksView.tsx
├── lib/
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── db.ts                # Data-access layer (Supabase ⇄ mock switch)
│   ├── supabase.ts          # Supabase client + config check
│   ├── mockData.ts          # In-memory fallback dataset
│   └── session.ts           # PIN-auth cookie helpers
├── schema.sql                # Postgres schema + seed data
└── .env.example
```
# coopercabana
