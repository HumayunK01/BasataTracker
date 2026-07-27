# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

AR (Accounts Receivable) associates at a healthcare-adjacent document processing operation. Their daily job is receiving, processing, and indexing inbound faxed documents — each document passes through multiple verification steps before it's considered resolved. They work in shifts, often switching between devices mid-day.

## Product Purpose

A fast, focused productivity tracker for AR associates to log and analyze their daily document workflow. Replaces ad-hoc spreadsheets with per-user data isolation, cross-device sync, and an append-only audit trail that satisfies record-keeping requirements.

## Positioning

Two mechanisms a spreadsheet or generic tracker cannot truthfully claim:
1. **Append-only immutable audit trail** — every mutation (log save, category change, account delete) is recorded in an immutable table, satisfying legal/record-keeping constraints.
2. **Cross-device live sync** — a tap-to-count interface that auto-saves to the server and broadcasts activity between devices, so an associate can start counting on one workstation and pick up on another midsession.

## Operating Context

- Associates work at desk stations with multiple monitors, but also access the tracker on mobile between stations.
- Documents arrive as faxes; each must progress through steps (typically 3 sequential steps for fax, independent steps for indexable).
- Daily counts are logged per-category (user-defined categories like "Worked on NG", "Reviewed", etc.).
- Shift-based work means sessions span several hours; a 10-hour hard session cap forces periodic re-authentication.
- External reference docs are used: Phoenix Heart cheat sheet and Test Patients & Labeling guide (linked in sidebar).
- Primary timezone: America/Chicago.

## Capabilities and Constraints

- **Capabilities**: Daily log CRUD, tap-to-count counter with auto-save, dual-mode tracker (fax sequential / indexable independent), date-range reporting with export (CSV, JSON, PDF), credential vault with folder organization, contribution heatmap, trend charts (Recharts), custom user-defined categories with drag reorder, user profiles, password change, account deletion with confirmation.
- **Technical constraints**: Supabase Postgres with RLS (every row scoped to auth.uid()), Vite SPA with React Router, Zod validation on all mutations, client-side rate limiting, 10-hour session cap, CSP and security headers in Vite config.
- **UI build constraints**: Current stack is shadcn/ui + Tailwind CSS + Lucide icons + `motion` (Framer Motion). Redesign must stay within these unless a clear case exists to swap a dependency.
- **Data model**: `daily_logs` (JSONB counts per-category), `categories` (per-user), `fax_tracker` / `indexable_tracker` (3-step status per patient), `credentials` / `credential_folders` (vault), `audit_logs` (append-only), `profiles` (name), `daily_goal` (DB column exists).

## Brand Commitments

- **Name**: Basata Tracker (must stay).
- **Logo**: `public/lightlogo.png` (must stay; used in sidebar, login, about card, and PDF exports).
- **Version**: Current tag is v1.2.x.
- No other binding brand identity; full visual redesign freedom otherwise.

## Evidence on Hand

- All source code at D:\Projects\BasataTracker
- Supabase project with real schema and migrations
- Reference docs: Phoenix Heart Cheat Sheet, Test Patients & Labeling (external Google Docs linked in sidebar)
- No user research, testimonials, or analytics available

## Product Principles

1. **Data integrity first** — every mutation is validated (Zod), rate-limited, and audited. The audit trail is immutable.
2. **Speed over features** — the counter must feel instant; no unnecessary network waits between taps. Stale-while-revalidate patterns preferred.
3. **Per-user sovereignty** — every row belongs to exactly one user via RLS. No shared data, no admin panels.
4. **Cross-device seamlessness** — start on one device, continue on another. Server state is the source of truth.
5. **Progressive disclosure** — the counter surface is simple and fast; analytics, reports, and vault are deeper tools surfaced through navigation, not pushed upfront.

## Accessibility & Inclusion

- Respects `prefers-reduced-motion` for all animations.
- Keyboard navigation supported on primary interfaces (counter 1-9 shortcuts, sidebar).
- 10-hour session cap with 15-minute warning — accommodates shift workers without unexpected lockouts.
- No product-specific accessibility standard was established beyond these.
