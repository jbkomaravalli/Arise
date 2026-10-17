# ARISE

**A real-life RPG progression platform.** Your real-life actions determine your
progression: complete structured quests across three development paths, earn XP,
raise attributes, and climb from E-rank Awakening to SS-rank Transcendent.

ARISE is a premium, dark-fantasy personal-development system built around
fitness (**VITALITY**), technical learning (**INTELLIGENCE**), and mindset
(**DISCIPLINE**). Original branding, original content, original engine —
thematically inspired by the *feeling* of awakening and leveling up, with no
third-party anime assets.

---

## Table of contents

- [What is implemented](#what-is-implemented)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Commands](#commands)
- [Folder structure](#folder-structure)
- [Architecture](#architecture)
- [Progression rules](#progression-rules)
- [Supabase configuration](#supabase-configuration)
- [Deployment (Vercel)](#deployment-vercel)
- [Security model](#security-model)
- [Testing](#testing)
- [Outstanding issues & external requirements](#outstanding-issues--external-requirements)

---

## What is implemented

**Product**

- Landing page, signup, login, password reset, 4-step onboarding (paths, goals,
  timezone, confirmation).
- Daily/weekly quest board with deterministic per-day generation, filters,
  acceptance-criteria completion dialogs, and streak-safe idempotent sync.
- Quest engine: XP rewards from server configuration, level curve, attribute
  curve, ranks E→SS, achievements, skill tree with prerequisites.
- Three development paths with seeded content: **41 quest templates, 20 Academy
  lessons with quizzes, 23 skills, 13 achievements**, plus workout templates.
- Training module (log sessions, intensity/focus weighting), Mindset module
  (guided reflections, focus timer), Academy (sequential lessons + quizzes).
- Profile, History feed (deduplicated progression events), Analytics (Recharts),
  Settings (theme: surface mode + accent color, persisted).
- Celebration overlay on level-ups/achievements; responsive desktop sidebar +
  mobile bottom navigation; reduced-motion and keyboard-accessible UI.
- Full local mode: runs with zero credentials using localStorage + salted PBKDF2
  local accounts, so the app is usable before Supabase is configured.

**Engineering**

- TypeScript strict mode; React 19 + Vite 7 + Tailwind 4; React Hook Form + Zod.
- Dual data layer: one repository interface with **local** and **Supabase**
  implementations selected by environment presence.
- Authoritative server-side progression: 9 `SECURITY DEFINER` RPCs compute all
  XP/rewards; clients cannot fabricate rewards.
- 3 SQL migrations + generated seed (`npm run seed:generate` keeps the seed in
  lockstep with `src/content`).
- Vitest unit/component tests for the core engine and UI, plus a **PGlite
  database verification harness** (`npm run db:verify`) that proves RLS, RPC
  authorization, XP idempotency, and client/server formula parity against a real
  in-process Postgres — no cloud account needed.

---

## Tech stack

| Layer     | Choice |
|-----------|--------|
| Frontend  | React 19, Vite 7, TypeScript (strict), Tailwind CSS 4 |
| UI        | Radix primitives (dialog, switch, tooltip), lucide-react icons, Motion |
| Forms     | React Hook Form + Zod |
| Charts    | Recharts |
| Routing   | React Router 7 |
| Backend   | Supabase (Postgres + Auth + RLS + RPCs) |
| Tests     | Vitest + Testing Library; PGlite for DB verification |
| Deploy    | Vercel (frontend) + Supabase (hosted backend) |

---

## Quick start

```bash
# 1. Install dependencies (Node >= 20.19)
npm install

# 2. Configure environment (optional for local mode)
cp .env.example .env

# 3. Start the dev server
npm run dev          # http://localhost:5173
```

For local/demo use without Supabase, set `VITE_ENABLE_LOCAL_MODE=true` in a
development environment. Production builds require Supabase and never fall
back to browser storage.

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck (`tsc --noEmit`) then production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript strict check, no emit |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm test` | Vitest unit + component tests (single run) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with coverage |
| `npm run seed:generate` | Regenerate `supabase/seed.sql` from `src/content` |
| `npm run db:verify` | Run the PGlite DB harness (migrations, RLS, RPCs, parity) |

---

## Folder structure

```
arise/
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql        # tables, constraints, triggers, RLS policies
│   │   ├── 0002_progression.sql   # stats/level/attribute/rank/achievement engine
│   │   └── 0003_operations.sql    # 9 SECURITY DEFINER RPCs + grants
│   └── seed.sql                   # GENERATED — quests, lessons, skills, achievements
├── scripts/
│   ├── generate-seed.ts           # src/content -> supabase/seed.sql
│   └── verify-db.ts               # PGlite verification harness (npm run db:verify)
├── src/
│   ├── app/                       # AuthProvider, DataProvider, ThemeController, router
│   ├── components/
│   │   ├── brand/                 # ARISE wordmark (original SVG)
│   │   ├── features/              # QuestCard, CelebrationOverlay
│   │   ├── layout/                # AppShell, navigation (sidebar + mobile nav)
│   │   └── ui/                    # design system primitives (button, card, dialog…)
│   ├── content/                   # SOURCE OF TRUTH: quests, lessons, skills, achievements
│   ├── core/                      # pure engine: level, attributes, rank, quests,
│   │                              #   streaks, stats, progression, skills, achievements
│   │   └── __tests__/             # engine unit tests
│   ├── data/
│   │   ├── local/                 # localStorage repository + local auth (PBKDF2)
│   │   └── supabase/              # supabase-js repository + auth, mappers
│   ├── lib/                       # cn(), time, defaults, quest helpers
│   ├── pages/
│   │   ├── auth/                  # login, signup, forgot/reset password
│   │   └── app/                   # dashboard, quests, academy, training, mindset,
│   │                              #   skills, attributes, history, analytics,
│   │                              #   profile, settings, lesson, quest detail
│   └── styles/                    # Tailwind entry + design tokens
├── .env.example                   # environment template (see comments inside)
└── vite.config.ts                 # Vite + Tailwind + test config
```

---

## Architecture

**One engine, two runtimes.** `src/core` is a pure, dependency-free TypeScript
engine (level curve, attribute curve, rank ladder, streaks, quest eligibility,
achievement rules). The Supabase backend mirrors those formulas in PostgreSQL so
the server is authoritative. `npm run db:verify` asserts the two engines agree,
so the UI and the database can never silently drift.

**Data layer.** `src/data/repository.ts` defines the interface; the app selects
`localRepository` (localStorage) only when explicitly enabled for development,
or `supabaseRepository` when valid `VITE_SUPABASE_URL` +
`VITE_SUPABASE_ANON_KEY` credentials are present. Production never selects the
local repository. All reads in Supabase mode come
from one `arise_bootstrap()` RPC; all writes go through the nine operation RPCs.

**Never trust the browser.** XP amounts, level-ups, rank-ups, achievement
unlocks, and quest eligibility are computed inside `SECURITY DEFINER` functions
using seeded configuration. Client requests carry only intent (which quest, what
evidence); the server validates ownership, cadence windows, level gates, and
skill prerequisites, then pays rewards exactly once via idempotency keys.

---

## Progression rules

- **Levels** — cumulative XP to reach level L: `T(L) = 100 × (L − 1)²`, capped
  at 100. Level 1 starts at 0 XP.
- **Attributes** (STR / END / MOB / TEC / PRO / DIS) — weighted XP accumulates
  per attribute from transactions; score `= round(100 × (1 − e^(−xp/600)))`.
- **Ranks** — E → D → C → B → A → S → SS, each with configuration-driven
  requirements (level, quests, active days, achievements, per-path quests,
  lessons, workouts, streak). Ladder lives in `src/core/config.ts`
  (`RANK_LADDER`) and is mirrored by `arise_stats()` in SQL.
- **Streaks** — active days count completed quests, logged workouts, journal
  entries, and completed focus sessions; configured rest days don't break a
  streak.

---

## Supabase configuration

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema, in order:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push          # applies supabase/migrations/*.sql in order
   ```
   Or paste `0001_schema.sql`, `0002_progression.sql`, `0003_operations.sql`,
   then `seed.sql` into the SQL editor, in that order.
3. (Recommended) `supabase gen types typescript --linked-project > src/data/supabase/database.types.ts`
4. Get the project URL and anon/publishable key from *Project Settings → API*.
5. Put them in `.env`:
   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon/publishable key>
   VITE_APP_ORIGIN=https://your-domain.example
   ```
6. In *Authentication → URL Configuration*, set the Site URL and add
   `http://localhost:5173` (and your production URL) to redirect URLs.
7. Email/password is enabled by default; adjust *Authentication → Providers*
   as desired.

**Rules**

- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (plus optional
  `VITE_APP_ORIGIN`) belong in `.env`.
- **Never** put the `service_role` key, database passwords, or any privileged
  credential in a `VITE_` variable — it ships to every visitor.

---

## Deployment (Vercel)

```bash
npm run build     # verify locally first: typecheck + vite build -> dist/
```

1. Import the repo into Vercel (framework preset: **Vite**).
   - Build command: `npm run build`
   - Output directory: `dist`
2. Add the environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_APP_ORIGIN=https://<your-domain>`) to the Vercel project, then redeploy.
3. Add the production URL to Supabase *Authentication → URL Configuration*.

The app is a static SPA; no server runtime is required. Supabase serves the
database and auth.

---

## Security model

Enforced in SQL and verified by `npm run db:verify` (71 assertions against a
real Postgres):

- **RLS on every table.** User-owned tables are scoped to `auth.uid()`.
  Content tables (`quest_templates`, `achievements`, `skill_defs`,
  `lesson_defs`) are read-only for clients. Reward tables (`xp_transactions`,
  `user_attributes`, `user_skills`, `user_achievements`, `progression_events`)
  have **no client write policies** — only `SECURITY DEFINER` functions write
  them.
- **Guard trigger.** `quest_assignments` cannot be completed, reopened,
  re-owned, or re-dated by a client update; completion goes through
  `arise_complete_quest()` only.
- **RPC authorization.** The nine operation RPCs are revoked from `anon` and
  `public`, granted to `authenticated`. Internal helpers (`arise_stats`,
  `arise_refresh_attributes`, `arise_evaluate_progress`,
  `arise_milestone_events`) are revoked from clients entirely.
- **Cross-user isolation.** RPCs resolve ownership from `auth.uid()`; touching
  another user's rows raises `quest_not_found` (or equivalent).
- **Idempotency.** Every reward has a unique ledger key
  (`quest:<id>`, `lesson:<id>`, `journal:<date>`, …); retries and concurrent
  duplicates pay exactly once.
- **Local mode** never sends passwords anywhere: they're salted and hashed with
  PBKDF2 in the browser, and local mode is clearly labeled in the UI.

---

## Testing

```bash
npm test                 # engine + component tests (Vitest, jsdom)
npm run db:verify        # DB harness: migrations, seed, RLS, guard triggers,
                         # RPC authz, XP idempotency, TS↔SQL parity, ranks
```

The harness runs migrations and the seed in an in-process Postgres (PGlite),
so database verification needs **no Supabase account and no credentials**. It
covers: migration/seed application, profile auto-provisioning, the RLS matrix
(alice/bob/anon), grant hygiene, guard triggers, daily-sync idempotency,
quest/lesson/reflection/workout/focus XP payouts, retry no-ops, cross-user
refusals, account-deletion cascade, level/attribute formula parity over value
sweeps, and rank-ladder parity for synthetic users at every tier — including a
B-rank candidate correctly blocked by an unbalanced path.

**Manual QA performed** (headless browser, full flow): signup → onboarding →
dashboard → quest completion with acceptance criteria → celebration overlay →
quests/history/analytics/attributes/academy/lesson+quiz/training/skill-tree/
mindset/profile/settings → theme persistence across reload → mobile viewport
(390px) responsive check with zero horizontal overflow and working bottom
navigation. Zero console errors across the session.

---

## Outstanding issues & external requirements

**External configuration required (not blockers in code):**

1. **Supabase project** — create one and apply migrations + seed (see above).
   Until then the app runs fully in local mode.
2. **Vercel project** — connect the repo and set the two `VITE_` variables.
3. **Email deliverability** — password-reset emails use Supabase's built-in
   SMTP (rate-limited on the free tier); configure a custom SMTP provider for
   production use.
4. **Push reminders** — intentionally not implemented; settings screen states
   this honestly. Would require a notification service + user consent flow.

**Known limitations / next steps:**

- The Supabase TypeScript types file is not generated yet (recommended in the
  setup steps); the repository layer uses hand-written mappers.
- Realtime multi-device sync is not wired (single-user flows are complete).
- The optional-feature list (PWA, sound, guilds/leaderboards, custom quests,
  import/export) is deferred by design until the core is in production use.
- Not deployed by this build — no deployment was performed; follow
  [Deployment (Vercel)](#deployment-vercel) after configuring Supabase.
