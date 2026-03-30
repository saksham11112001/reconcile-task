# Reconcile — Complete Project Handover

> **Project:** Reconcile — Bank reconciliation SaaS for CA firms
> **Stack:** Next.js 15 (App Router) · TypeScript · Supabase · Inngest · Resend · Zustand
> **Repo:** github.com/saksham11112001/reconcile-task
> **Live:** https://recon.sng-adwisers.com
> **Vercel project:** reconcile-task
> **Date:** March 2026

---

## 1. What the app does

Reconcile is a multi-tenant SaaS for Indian CA firms. Each firm (organisation) can:
- Create clients and run bank-vs-ledger reconciliations
- Upload CSV/Excel files; the backend processes them and flags mismatches
- Review, resolve, ignore, or escalate mismatches individually or in bulk
- Finalize periods with a lock workflow
- Track document requests to clients
- Assign reconciliations to team members with an approver
- View audit trails for all decisions
- Generate and export per-reconciliation reports

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript (strict) |
| Database + Auth | Supabase (Postgres + Row Level Security) |
| Storage | Supabase Storage (`recon-files` bucket) |
| Background jobs | Inngest v4 |
| Email | Resend (via `@resend/node`) |
| State management | Zustand (`useAppStore`, `useToastStore`) |
| Styling | CSS variables (`globals.css`) — no Tailwind |
| Deployment | Vercel |
| DNS | GoDaddy → CNAME → `cname.vercel-dns.com` |

---

## 3. Environment Variables (Vercel + `.env.local`)

```env
NEXT_PUBLIC_RECONCILE_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_RECONCILE_SUPABASE_ANON_KEY=<anon key>
RECONCILE_SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_APP_URL=https://recon.sng-adwisers.com
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@sng-adwisers.com
INNGEST_EVENT_KEY=<inngest event key>
INNGEST_SIGNING_KEY=<inngest signing key>
```

---

## 4. Database Migrations (run in order)

All SQL files are in `supabase/MIGRATIONS/`:

| File | Contents |
|---|---|
| `001_job_status.sql` | Base `reconciliations` table with job_status |
| `002_mismatches.sql` | `recon_mismatches`, `recon_entries`, `recon_matches` |
| `003_clients_recurring.sql` | `clients`, `recurring_recons`, `recon_uploads` tables |
| `004_storage_bucket.sql` | `recon-files` storage bucket + RLS policies |
| `005_features.sql` | `doc_requests`, `recon_checklists`, `audit_logs` tables; `is_finalized` on reconciliations; `client_upload` role |
| `006_assignee_approver.sql` | `assignee_id` + `approver_id` on reconciliations |

Run each in Supabase SQL editor → SQL Editor → New query.

---

## 5. All Database Tables

### `organisations`
- `id`, `name`, `billing_email`, `logo_url`, `created_at`

### `users` (public mirror of auth.users)
- `id`, `name`, `email`, `avatar_url`, `created_at`

### `org_members`
- `id`, `org_id`, `user_id`, `role` (owner/admin/reviewer/analyst/viewer/client_upload), `is_active`, `invited_at`, `joined_at`

### `clients`
- `id`, `org_id`, `name`, `gstin`, `contact_name`, `contact_email`, `color`, `status` (active/prospect/inactive), `industry`, `notes`, `created_by`, `created_at`

### `reconciliations`
- `id`, `org_id`, `name`, `client_id`, `period_start`, `period_end`
- `status` (draft/in_progress/completed), `job_status` (pending/uploaded/processing/ready/failed)
- `opening_balance`, `closing_balance`, `total_matched`, `total_unmatched`, `net_difference`
- `total_mismatches`, `open_mismatches`
- `is_finalized`, `finalized_at`, `finalized_by`
- `assignee_id`, `approver_id`, `created_by`, `created_at`

### `recon_uploads`
- `id`, `org_id`, `reconciliation_id`, `file_type` (bank_statement/ledger), `file_name`, `file_size`, `storage_path`, `created_at`

### `recon_entries`
- Individual transaction rows parsed from uploaded files

### `recon_matches`
- Matched pairs of bank ↔ ledger entries

### `recon_mismatches`
- `id`, `org_id`, `reconciliation_id`, `type`, `description`, `amount`, `severity`
- `review_status` (open/resolved/ignored/escalated), `decision`, `notes`, `reviewed_by`, `reviewed_at`

### `doc_requests`
- `id`, `org_id`, `client_id`, `reconciliation_id`, `title`, `description`
- `status` (requested/received/pending/overdue/cancelled), `due_date`, `created_by`

### `recon_checklists`
- One row per reconciliation: `uploads_received`, `review_complete`, `exceptions_handled`, `documents_complete`, `ready_to_finalize`

### `audit_logs`
- `id`, `org_id`, `entity_type`, `entity_id`, `action`, `actor_id`, `actor_name`, `meta` (jsonb), `created_at`

### `recurring_recons`
- `id`, `org_id`, `client_id`, `name`, `frequency`, `next_due_date`, `status`, `config`

---

## 6. All App Routes (Pages)

### Public
| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing page (redirects to /dashboard if logged in) |
| `/pricing` | `app/pricing/page.tsx` | Public pricing page with monthly/annual toggle |
| `/login` | `app/login/page.tsx` | Login (password + magic link + Google OAuth) |
| `/onboarding` | `app/onboarding/page.tsx` | Create org after first login |
| `/auth/callback` | `app/auth/callback/route.ts` | Supabase OAuth callback handler |

### App (authenticated, inside `app/(app)/`)
| Route | Description |
|---|---|
| `/dashboard` | KPI cards, pending actions, upcoming schedules, recent reconciliations |
| `/clients` | Client list with health score, search, status/health filters |
| `/clients/new` | Create new client |
| `/clients/[id]` | Client detail: reconciliations, contact info |
| `/clients/[id]/edit` | Edit client details |
| `/reconciliations` | All reconciliations (modal to create new, client filter, All/Mine toggle) |
| `/reconciliations/my` | My reconciliations (assigned to / created by current user) |
| `/reconciliations/new` | Standalone new reconciliation form (assignee + approver fields) |
| `/reconciliations/schedules` | Recurring schedule list |
| `/reconciliations/schedules/new` | Create recurring schedule |
| `/reconciliations/[id]` | Workspace: files, checklist, finalize, activity timeline |
| `/reconciliations/[id]/review` | Review queue: mismatch table, bulk actions, filters |
| `/reconciliations/[id]/report` | Full report: stats, mismatch breakdown, export |
| `/doc-requests` | Document request center: tabs by status, new request modal |
| `/reports` | Reports hub: all processed reconciliations with "View Report" links |
| `/settings` | Settings hub (grid of setting sections) |
| `/settings/organisation` | Edit org name + billing email |
| `/settings/members` | Team members list, invite, role change, edit name |
| `/settings/billing` | Pricing tiers, current plan, upgrade (stub) |
| `/settings/appearance` | Light / dark / system theme toggle |
| `/profile` | User profile page |

---

## 7. All API Routes

### Reconciliations
| Method | Route | Description |
|---|---|---|
| GET | `/api/reconciliations` | List org reconciliations |
| POST | `/api/reconciliations` | Create (with client_id, assignee_id, approver_id) |
| GET/PATCH/DELETE | `/api/reconciliations/[id]` | Get, update status, delete |
| POST | `/api/reconciliations/[id]/uploads` | Register uploaded file |
| GET | `/api/reconciliations/[id]/mismatches` | List mismatches (with filters) |
| PATCH | `/api/reconciliations/[id]/mismatches/[mismatchId]` | Resolve/ignore/escalate single mismatch |
| POST | `/api/reconciliations/[id]/mismatches/bulk` | Bulk action (max 200) |
| POST | `/api/reconciliations/[id]/finalize` | Finalize or un-finalize period |
| GET/PATCH | `/api/reconciliations/[id]/checklist` | Get or upsert checklist |
| GET | `/api/reconciliations/[id]/export/mismatches` | CSV export of mismatches |
| GET | `/api/reconciliations/[id]/export/summary` | JSON export of summary |

### Clients
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/clients` | List or create clients |
| GET/PATCH/DELETE | `/api/clients/[id]` | Get, update, or delete client |

### Team & Org
| Method | Route | Description |
|---|---|---|
| GET | `/api/team` | List org members |
| PATCH | `/api/team` | Update member role or member name |
| POST | `/api/team` | Invite member by email (Supabase admin invite) |
| PATCH | `/api/organisation` | Update org name / billing_email |

### Doc Requests
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/doc-requests` | List or create document requests |
| PATCH/DELETE | `/api/doc-requests/[id]` | Update status or delete |

### Audit Logs
| Method | Route | Description |
|---|---|---|
| GET | `/api/audit-logs` | List logs by entity_type + entity_id |

### Recurring + Inngest
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/recurring-recons` | List or create recurring schedules |
| PATCH/DELETE | `/api/recurring-recons/[id]` | Update or delete schedule |
| POST | `/api/inngest` | Inngest webhook — handles `recon/process` and cron |

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/onboarding` | Create org + org_member on first login |
| GET/PATCH | `/api/profile` | Get or update user profile |

---

## 8. Key Components

### Layout
- `components/layout/Sidebar.tsx` — Nav sidebar with all routes
- `components/layout/Header.tsx` — Page header with title
- `app/(app)/AppShell.tsx` — Shell that wraps all app pages

### Reconciliation
- `components/reconciliation/NewReconciliationModal.tsx` — 2-step modal (details + upload), includes client/assignee/approver
- `components/reconciliation/ReviewQueueView.tsx` — Mismatch table with bulk select, filters
- `components/reconciliation/FinalizeWrapper.tsx` + `FinalizeButton.tsx` — Period lock/unlock UI
- `components/reconciliation/ReconChecklist.tsx` — 5-item readiness checklist with progress bar
- `components/reconciliation/ActivityTimeline.tsx` — Audit log timeline
- `components/reconciliation/MismatchDetailPanel.tsx` — Side panel for mismatch details

### UI
- `components/ui/Badge.tsx` — `StatusBadge`, `JobStatusBadge`, `SeverityBadge`
- `components/ui/Toast.tsx` — Toast notification renderer

### Settings
- `app/(app)/settings/billing/BillingView.tsx` — Plan cards with monthly/annual toggle
- `app/(app)/settings/organisation/OrgSettingsView.tsx` — Inline edit org details
- `app/(app)/settings/members/MembersView.tsx` — Member list with role + name editing

### Reconciliations views
- `app/(app)/reconciliations/ReconciliationsView.tsx` — Client filter + All/Mine toggle + modal trigger

---

## 9. OrgRole Hierarchy

```
owner > admin > reviewer > analyst > viewer > client_upload
```
- **owner** — Full access, billing, delete org
- **admin** — Manage members, all CRUD
- **reviewer** — Create/review reconciliations, finalize periods
- **analyst** — Create reconciliations, upload files
- **viewer** — Read-only
- **client_upload** — Upload-only (client portal, future feature)

---

## 10. Supabase Setup Checklist

1. Run migrations 001 → 006 in order
2. Auth → URL Configuration:
   - Site URL: `https://recon.sng-adwisers.com`
   - Redirect URLs: `https://recon.sng-adwisers.com/**`, `http://localhost:3000/**`
3. Auth → Sign In / Providers → Enable **Google** (add Client ID + Secret from Google Cloud Console)
4. Storage → ensure `recon-files` bucket exists (created by migration 004)
5. Google Cloud Console → OAuth Client → Authorized redirect URIs must include:
   `https://<project-ref>.supabase.co/auth/v1/callback`

---

## 11. Inngest Setup

1. Go to [app.inngest.com](https://app.inngest.com) → create app
2. Add `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to Vercel env vars
3. After deploying, go to Inngest dashboard → **Sync app** → enter `https://recon.sng-adwisers.com/api/inngest`
4. Cron function fires at `30 2 * * *` (08:00 IST) to create recurring reconciliations

---

## 12. Vercel + DNS Setup

1. Push to GitHub → auto-deploy triggers in Vercel
2. Vercel Settings → Domains → Add `recon.sng-adwisers.com`
3. GoDaddy DNS: Add CNAME `recon` → `cname.vercel-dns.com`
4. Wait 5–30 min for DNS propagation
5. All env vars must be set in Vercel Settings → Environment Variables
6. After any env var change: click **Redeploy** in Vercel

---

## 13. Features Implemented

### Core
- [x] Multi-tenant with RLS (org-scoped data isolation)
- [x] Google OAuth + Magic link + Password login
- [x] Onboarding flow (create org on first login)
- [x] Role-based access control (6 roles)

### Clients
- [x] Full CRUD (create, edit, archive, delete)
- [x] Client health score (healthy / needs_review / at_risk)
- [x] Search + status/health filters

### Reconciliations
- [x] Create via modal (with client, assignee, approver)
- [x] File upload to Supabase Storage (bank statement + ledger)
- [x] Background processing via Inngest
- [x] Mismatch review queue (filter, sort, bulk actions)
- [x] Resolve / ignore / escalate with notes
- [x] Period finalization lock
- [x] Reconciliation checklist (5 items, progress bar)
- [x] Activity timeline (audit log per reconciliation)
- [x] Recurring schedules with cron
- [x] CSV + summary export
- [x] Report page per reconciliation
- [x] Assignee + approver fields
- [x] All reconciliations / My reconciliations views
- [x] Client filter on reconciliations list

### Document Requests
- [x] Create doc requests linked to client/reconciliation
- [x] Status workflow (requested → received / overdue / cancelled)
- [x] Filter by status/client

### Reports
- [x] Per-reconciliation report with stats
- [x] Reports hub page listing all processed reconciliations
- [x] CSV export of mismatches

### Settings
- [x] Settings hub (grid layout)
- [x] Edit organisation (name + billing email)
- [x] Team member management (invite, role change, name edit)
- [x] Billing & Plan page with pricing tiers
- [x] Appearance (light/dark/system theme)

### Pricing
- [x] Public `/pricing` page with Starter (₹2,999) + Pro (₹7,999)
- [x] Monthly/Annual toggle (20% discount)
- [x] Linked from nav

---

## 14. Known Stubs / Future Work

| Feature | Status | Notes |
|---|---|---|
| Payment / Razorpay | Stub | `BillingView` shows toast "contact us"; wire up Razorpay `createOrder` |
| Client portal (`client_upload` role) | Foundation only | Role exists in DB; separate client-facing UI not built |
| Saved filters | Not built | Planned; store filter presets per user in DB |
| WhatsApp notifications | Not built | Inngest function sends email; add WhatsApp via Interakt/Gupshup |
| SSO / SAML | Not built | Pro roadmap item |
| Mobile responsive sidebar | Partial | `sidebarOpen` state exists in Zustand but mobile toggle UI not wired |

---

## 15. File Structure Summary

```
reconcile-task/
├── app/
│   ├── (app)/                    # Authenticated app
│   │   ├── dashboard/
│   │   ├── clients/
│   │   ├── reconciliations/
│   │   │   ├── [id]/             # Workspace, review, report
│   │   │   ├── my/               # My reconciliations
│   │   │   ├── new/              # Standalone form
│   │   │   └── schedules/
│   │   ├── doc-requests/
│   │   ├── reports/              # Reports hub
│   │   ├── settings/
│   │   │   ├── page.tsx          # Settings hub
│   │   │   ├── organisation/
│   │   │   ├── members/
│   │   │   ├── billing/          # Plan + pricing
│   │   │   └── appearance/
│   │   └── profile/
│   ├── api/                      # All API routes
│   ├── auth/callback/
│   ├── login/
│   ├── onboarding/
│   └── pricing/
├── components/
│   ├── layout/                   # Sidebar, Header
│   ├── reconciliation/           # Modal, Review, Checklist, Timeline, Finalize
│   └── ui/                       # Badge, Toast
├── lib/
│   ├── supabase/                 # client.ts, server.ts, api.ts, admin.ts
│   ├── email/                    # Resend templates
│   ├── inngest/                  # Job functions
│   └── utils/
├── store/                        # Zustand stores
├── types/                        # index.ts — all interfaces
├── supabase/MIGRATIONS/          # 001–006 SQL files
├── .env.example
├── DEPLOY.md
├── HANDOVER.md                   # This file
└── next.config.ts
```

---

## 16. How to Run Locally

```bash
git clone https://github.com/saksham11112001/reconcile-task
cd reconcile-task
npm install
cp .env.example .env.local
# Fill in all env vars in .env.local
npm run dev
# Open http://localhost:3000
```

---

## 17. Deployment Steps (Quick Reference)

1. Push to `main` → Vercel auto-deploys
2. If env vars changed → go to Vercel → Settings → redeploy
3. New DB migration → run SQL in Supabase dashboard
4. New Inngest functions → Inngest dashboard → re-sync app URL

---

*Last updated: March 2026 — Handover from development session*
