# Basata Tracker

A fast, focused productivity tracker for AR associates to log and analyze daily document workflow — built with React, TypeScript, Supabase, and Tailwind CSS.

---

## Features

- **Dashboard** — Per-category document totals, trend charts, weekly breakdowns, and day-of-week averages
- **Daily Log** — Full log history with search, pagination, inline edit, delete, and CSV export
- **Counter** — Real-time tap-to-count interface for tracking docs while you work; saves directly to today's log
- **Date Range Report** — Filter logs by preset or custom date range with summary stats and category breakdown
- **Settings** — Manage custom categories (add, edit, reorder, delete) and change your password
- **Auth** — Email/password sign-in and sign-up via Supabase; each user's data is fully isolated

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Backend / DB | Supabase (Postgres + Auth + RLS) |
| State | TanStack React Query |
| Routing | React Router v6 |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone and install

```bash
git clone <repo-url>
cd fast-task-view
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

### 3. Set up the database

Run the following SQL in your Supabase SQL editor:

```sql
-- Categories table
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  key text not null,
  label text not null,
  short text not null,
  position integer not null default 0,
  created_at timestamptz default now(),
  unique(user_id, key)
);
alter table categories enable row level security;
create policy "Users manage own categories" on categories
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Daily logs table
create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  log_date date not null,
  worked_on_ng integer not null default 0,
  moved_to_indexing integer not null default 0,
  ekg integer not null default 0,
  cath_lab integer not null default 0,
  roi integer not null default 0,
  fax_back integer not null default 0,
  extra jsonb default '{}',
  is_off_day boolean not null default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, log_date)
);
alter table daily_logs enable row level security;
create policy "Users manage own logs" on daily_logs
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

### 4. Run locally

```bash
npm run dev
```

App runs at `http://localhost:8080`

---

## Project Structure

```
src/
├── components/
│   ├── ar/           # App-specific components (Sidebar, Charts, Table, etc.)
│   └── ui/           # shadcn/ui base components
├── hooks/            # Data hooks (useAuth, useDailyLogs, useCategories)
├── integrations/     # Supabase client
├── lib/              # Utilities (CSV export, etc.)
├── pages/            # Route pages (Index, DailyLog, Counter, Report, Settings, Login)
└── types/            # Shared types and date/format helpers
```

---

## Scripts

```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run test       # Run tests (Vitest)
```

---

## Data Model

- **`daily_logs`** — One row per user per day. Fixed columns for built-in categories + `extra` JSONB for custom ones.
- **`categories`** — Per-user ordered list of document categories. Drives all counters, charts, and log forms dynamically.

All data is scoped by `user_id` with Supabase Row Level Security — users can only ever read and write their own records.
