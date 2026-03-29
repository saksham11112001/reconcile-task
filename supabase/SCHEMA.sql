-- ═══════════════════════════════════════════════════════════════
-- RECONCILE — Initial Schema
-- Run in: Supabase SQL Editor (separate project from Planora)
-- ═══════════════════════════════════════════════════════════════

-- ─── Core tenant tables ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organisations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  billing_email TEXT,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY,  -- = auth.uid()
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('owner','admin','member')),
  is_active  BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ,
  joined_at  TIMESTAMPTZ,
  UNIQUE(org_id, user_id)
);

-- ─── Reconciliation tables ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS reconciliations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','in_progress','completed')),
  opening_balance  NUMERIC(15,2) DEFAULT 0,
  closing_balance  NUMERIC(15,2) DEFAULT 0,
  -- populated when status → completed
  total_matched    INT DEFAULT 0,
  total_unmatched  INT DEFAULT 0,
  net_difference   NUMERIC(15,2) DEFAULT 0,
  created_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recon_entries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  reconciliation_id UUID NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  source            TEXT NOT NULL CHECK (source IN ('bank','book')),
  entry_date        DATE NOT NULL,
  description       TEXT,
  reference         TEXT,
  amount            NUMERIC(15,2) NOT NULL,
  is_matched        BOOLEAN NOT NULL DEFAULT false,
  is_flagged        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recon_matches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  reconciliation_id UUID NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  bank_entry_id     UUID NOT NULL REFERENCES recon_entries(id) ON DELETE CASCADE,
  book_entry_id     UUID NOT NULL REFERENCES recon_entries(id) ON DELETE CASCADE,
  match_type        TEXT NOT NULL CHECK (match_type IN ('auto','manual')),
  matched_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  matched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bank_entry_id),
  UNIQUE(book_entry_id)
);

CREATE TABLE IF NOT EXISTS recon_flags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  entry_id   UUID NOT NULL REFERENCES recon_entries(id) ON DELETE CASCADE,
  note       TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_org_members_user   ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_recon_org          ON reconciliations(org_id);
CREATE INDEX IF NOT EXISTS idx_entries_recon      ON recon_entries(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_matches_recon      ON recon_matches(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_flags_entry        ON recon_flags(entry_id);

-- ─── Row Level Security ────────────────────────────────────────

ALTER TABLE organisations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_matches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_flags     ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own profile
CREATE POLICY "users_own" ON users
  FOR ALL USING (auth.uid() = id);

-- Org members can see their own memberships
CREATE POLICY "org_members_own" ON org_members
  FOR ALL USING (user_id = auth.uid());

-- Org data scoped to active members
CREATE POLICY "orgs_member" ON organisations
  FOR ALL USING (
    id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "reconciliations_member" ON reconciliations
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "entries_member" ON recon_entries
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "matches_member" ON recon_matches
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "flags_member" ON recon_flags
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );
