# Basata Tracker

A fast, focused productivity tracker for AR associates to log and analyze their daily document workflow. Built with React, TypeScript, Supabase, and Tailwind CSS — with per-user data isolation, cross-device sync, and an append-only audit trail.

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Per-category totals, trend charts, weekly breakdowns, day-of-week averages, and a contribution heatmap |
| **Daily Log** | Full history with search, pagination, inline edit/delete, and CSV/JSON export |
| **Counter** | Tap-to-count interface for tracking docs live; auto-saves to today's log and syncs across devices |
| **Date Range Report** | Filter by preset or custom range with summary stats and category breakdown |
| **Daily Activity** | Team-wide view of who logged today (powered by a Supabase Edge Function) |
| **Users** | Directory of all registered users with profile and sign-in details |
| **Settings** | Manage custom categories (add, edit, reorder, delete), update profile, change password, delete account |
| **Help & Cheat Sheet** | In-app guidance and a Phoenix Heart reference page |
| **Auth** | Email/password sign-up and sign-in via Supabase; every record is scoped to its owner |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · TypeScript · Vite 5 |
| UI | shadcn/ui · Tailwind CSS · Lucide icons |
| Charts | Recharts |
| Backend / DB | Supabase — Postgres, Auth, Row Level Security, Edge Functions (Deno) |
| Server state | TanStack React Query |
| Validation | Zod (every mutation and query response) |
| Routing | React Router v6 |
| Testing | Vitest · Testing Library · jsdom |

---

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- A [Supabase](https://supabase.com) project
- [Supabase CLI](https://supabase.com/docs/guides/cli) (to apply migrations and deploy Edge Functions)

### 1. Clone and install

```bash
git clone https://github.com/HumayunK01/BasataTracker.git
cd BasataTracker
npm install
```

### 2. Configure environment

Copy the example file and fill in your Supabase project's API values:

```bash
cp .env.example .env.local
```

```env
# .env.local — never commit this file (it is gitignored)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_publishable_key
```

> The **service role key** is never used by the frontend. It is read only by
> Edge Functions via `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` and must be
> configured as a Supabase Function secret, not in any `.env` file.

### 3. Apply the database schema

The schema is defined by migrations in `supabase/migrations/` — do **not**
hand-write tables. Link your project and push:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This creates `daily_logs`, `categories`, `audit_logs`, and `profiles`, all
with Row Level Security policies, plus the `delete_own_account()` function and
the new-user profile trigger.

### 4. Deploy the Edge Functions

The Daily Activity and Users pages call server-side functions:

```bash
supabase functions deploy list-users
supabase functions deploy smart-worker
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

### 5. Run locally

```bash
npm run dev
```

The app runs at **http://localhost:8080**.

---

## Project Structure

```
src/
├── components/
│   ├── ar/            # App-specific components (Sidebar, Charts, Table, Heatmap, …)
│   └── ui/            # shadcn/ui primitives (only those in use)
├── hooks/             # Data & logic hooks
│   ├── useAuth.ts            # Session, expiry checks, refresh
│   ├── useDailyLogs.ts       # Log CRUD + Zod validation + rate limit
│   ├── useCategories.ts      # Category CRUD + Zod validation
│   ├── useDailyActivity.ts   # Team activity via Edge Function
│   ├── useProfile.ts         # Profile read/update
│   ├── useAuditLog.ts        # Append-only audit events
│   └── useMutationRateLimit.ts  # Client-side sliding-window limiter
├── integrations/supabase/   # Supabase client + generated DB types
├── lib/               # Utilities (CSV/JSON export, category colors)
├── pages/             # Route pages
├── types/             # Shared types and date/format helpers
└── test/              # Vitest suites (incl. security verification)

supabase/
├── migrations/        # Source of truth for the database schema
└── functions/         # Deno Edge Functions (list-users, smart-worker)
```

---

## Scripts

```bash
npm run dev         # Start dev server (port 8080)
npm run build       # Production build
npm run build:dev   # Development-mode build
npm run preview     # Preview the production build
npm run lint        # Run ESLint
npm run test        # Run the test suite once (Vitest)
npm run test:watch  # Run tests in watch mode
```

---

## Data Model

All tables enable Postgres **Row Level Security**; every policy is scoped to
`auth.uid()`, so a user can only ever read or write their own rows.

| Table | Purpose |
|---|---|
| **`daily_logs`** | One row per user per day. Category counts live in a single `counts` JSONB column (migrated away from fixed columns), plus `is_off_day` and `notes`. |
| **`categories`** | Per-user ordered list of document categories. Drives counters, charts, and log forms dynamically. |
| **`audit_logs`** | Append-only record of sensitive actions (log/category changes, account deletion, password change). No update/delete policies — entries are immutable. |
| **`profiles`** | First/last name per user, auto-created on signup via a trigger. |

A `SECURITY DEFINER` function, `delete_own_account()`, lets a user delete only
their own auth account (revoked from `PUBLIC`, granted to `authenticated`).

---

## Security

- **Input validation** — Every mutation and query response is parsed with Zod schemas before it touches the database or UI.
- **Rate limiting** — A sliding-window limiter guards mutations; the login form additionally caps attempts (5 / 60s) as a UX defense. Authoritative rate limiting is enforced by Supabase Auth and RLS server-side.
- **Headers** — The dev server sets CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy` (see `vite.config.ts`). Production deployments should harden the CSP further (nonce-based, no `unsafe-*`).
- **Secrets** — Only the public anon key reaches the client. The service role key is confined to Edge Functions via Supabase Function secrets.
- **Audit trail** — Sensitive actions are recorded in an append-only `audit_logs` table.

A regression test suite (`src/test/security-claims.test.ts`) empirically
verifies the input-validation and rate-limit behavior.

---

## Deployment

The app is a static SPA. `vercel.json` rewrites all routes to `index.html`
for client-side routing.

```bash
npm run build      # outputs to dist/
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages). Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build-time
environment variables in your host's dashboard.

---

## License

Private project — all rights reserved.
