# Reconcile — Deployment Checklist

## Pre-deployment: Environment Variables

Copy `.env.example` to `.env.local` and fill in all values.

| Variable | Where to get it | Required |
|----------|-----------------|----------|
| `NEXT_PUBLIC_RECONCILE_SUPABASE_URL` | Supabase → Settings → API | ✅ |
| `NEXT_PUBLIC_RECONCILE_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ |
| `RECONCILE_SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | ✅ |
| `NEXT_PUBLIC_APP_URL` | Your production domain, e.g. `https://recon.yourdomain.com` | ✅ |
| `RESEND_API_KEY` | resend.com → API Keys | ✅ for email |
| `FROM_EMAIL` | Your verified Resend sending address | ✅ for email |
| `INNGEST_EVENT_KEY` | app.inngest.com → Settings → Event Keys | ✅ for jobs |
| `INNGEST_SIGNING_KEY` | app.inngest.com → Settings → Signing Keys | ✅ for jobs |

---

## Step 1: Database Setup (Supabase)

Run all migrations in order in the Supabase SQL editor:

1. `supabase/SCHEMA.sql` — Base schema (run first on a fresh project)
2. `supabase/MIGRATIONS/001_job_status.sql`
3. `supabase/MIGRATIONS/002_mismatches.sql`
4. `supabase/MIGRATIONS/003_clients_recurring.sql`
5. `supabase/MIGRATIONS/004_storage_bucket.sql`
6. `supabase/MIGRATIONS/005_features.sql`

### Supabase Auth Config
- Go to **Authentication → URL Configuration**
- Set **Site URL** to your production domain: `https://recon.yourdomain.com`
- Add **Redirect URLs**: `https://recon.yourdomain.com/**`

### Supabase Storage
- Migration 004 creates the `recon-files` private bucket automatically.
- Verify it appears under **Storage** in your Supabase dashboard.

---

## Step 2: Resend (Email)
1. Verify your sending domain at [resend.com/domains](https://resend.com/domains)
2. Add DKIM + SPF DNS records provided by Resend
3. Create an API key and add it to env vars
4. Set `FROM_EMAIL` to an address on your verified domain

---

## Step 3: Inngest (Background Jobs)
1. Create a free account at [app.inngest.com](https://app.inngest.com)
2. Copy your **Event Key** and **Signing Key** to env vars
3. After deploying to Vercel, go to Inngest → Apps → Sync App
4. Enter: `https://recon.yourdomain.com/api/inngest`
5. Confirm both functions appear: `process-reconciliation` and `recurring-daily-check`

---

## Step 4: Deploy to Vercel

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select the `reconcile-task` repo
4. Framework: **Next.js** (auto-detected)
5. Add all environment variables from Step 0 under **Settings → Environment Variables**
6. Click **Deploy**

### Vercel environment variables to set:
- All 8 variables listed in the table above
- Set `NEXT_PUBLIC_APP_URL` to `https://recon.yourdomain.com` (your final domain)

---

## Step 5: Custom Domain (GoDaddy → Vercel)

1. In Vercel: Project → **Settings → Domains** → Add `recon.yourdomain.com`
2. In GoDaddy: DNS → Add record:
   - Type: `CNAME`
   - Name: `recon`
   - Value: `cname.vercel-dns.com`
   - TTL: 600
3. Wait 5–30 minutes for DNS propagation
4. Vercel will auto-provision SSL

---

## Step 6: Post-deploy Verification

- [ ] `/` redirects to `/dashboard` for authenticated users
- [ ] `/login` loads and allows sign-in via email/password
- [ ] Onboarding flow creates a new org
- [ ] Clients page loads and shows filter/search
- [ ] New reconciliation can be created
- [ ] File upload works (check Supabase Storage)
- [ ] Inngest functions are synced (check app.inngest.com)
- [ ] Invite email arrives (check Resend logs)
- [ ] Dark mode toggle works
- [ ] Mobile sidebar opens/closes

---

## Known Limits / Notes

- **File size limit**: 10 MB per file (set in `004_storage_bucket.sql`)
- **Mismatch limit**: Review queue loads max 500 mismatches per reconciliation
- **Cron schedule**: `recurring-daily-check` runs at 02:30 UTC (08:00 IST)
- **Email fallback**: If `RESEND_API_KEY` is unset or placeholder, emails are skipped silently (dev mode)
- **Inngest fallback**: If keys are unset, Inngest events queue but won't process in production
