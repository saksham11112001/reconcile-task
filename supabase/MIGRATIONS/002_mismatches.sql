-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 002 — Mismatch data model
-- Run in: Supabase SQL Editor (Reconcile project only)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. recon_mismatches ──────────────────────────────────────
--
-- One row per detected discrepancy within a reconciliation job.
-- Populated by the comparison engine (next step); structure only here.
--
-- mismatch_type values:
--   missing_in_bank   → entry exists in ledger but not in bank statement
--   missing_in_ledger → entry exists in bank but not in ledger
--   amount_mismatch   → same reference found in both but amounts differ
--   date_mismatch     → same reference found in both but dates differ
--   duplicate         → same entry appears more than once in one source
--   tax_mismatch      → GST/TDS computed amount differs from ledger amount
--   gstin_mismatch    → GSTIN on invoice doesn't match the bank narration/ref
--
-- review_status values:
--   open       → newly detected, needs attention
--   resolved   → user confirmed it is corrected / reconciled
--   ignored    → user confirmed it is a known / acceptable difference
--   escalated  → flagged for senior review or external clarification

CREATE TABLE IF NOT EXISTS recon_mismatches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES organisations(id)    ON DELETE CASCADE,
  reconciliation_id   UUID NOT NULL REFERENCES reconciliations(id)  ON DELETE CASCADE,

  -- Classification
  mismatch_type       TEXT NOT NULL CHECK (mismatch_type IN (
                        'missing_in_bank',
                        'missing_in_ledger',
                        'amount_mismatch',
                        'date_mismatch',
                        'duplicate',
                        'tax_mismatch',
                        'gstin_mismatch'
                      )),

  -- Review lifecycle
  review_status       TEXT NOT NULL DEFAULT 'open'
                      CHECK (review_status IN ('open','resolved','ignored','escalated')),

  -- Links to source entries (either or both may be set depending on type)
  bank_entry_id       UUID REFERENCES recon_entries(id) ON DELETE SET NULL,
  book_entry_id       UUID REFERENCES recon_entries(id) ON DELETE SET NULL,

  -- Structured diff — what exactly differs (stored as jsonb for flexibility)
  -- Examples:
  --   amount_mismatch:  { "bank_amount": 1000, "book_amount": 1100, "delta": -100 }
  --   date_mismatch:    { "bank_date": "2026-03-01", "book_date": "2026-03-05" }
  --   gstin_mismatch:   { "bank_gstin": "27AAA...", "book_gstin": "29BBB..." }
  diff_data           JSONB,

  -- Human-readable description (set by engine, editable by user via decision)
  description         TEXT,

  -- Severity hint for UI triage (set by engine)
  severity            TEXT NOT NULL DEFAULT 'medium'
                      CHECK (severity IN ('low','medium','high')),

  -- Audit
  detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. recon_mismatch_decisions ─────────────────────────────
--
-- Append-only log of every review action taken on a mismatch.
-- Latest row for a given mismatch_id = current decision.
-- Keeping history lets managers audit what was done and by whom.

CREATE TABLE IF NOT EXISTS recon_mismatch_decisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id)       ON DELETE CASCADE,
  mismatch_id     UUID NOT NULL REFERENCES recon_mismatches(id)    ON DELETE CASCADE,

  -- What the reviewer decided
  decision        TEXT NOT NULL CHECK (decision IN ('resolved','ignored','escalated','reopened')),

  -- Free-text note from reviewer
  note            TEXT,

  -- Who decided
  decided_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_mismatches_recon
  ON recon_mismatches(reconciliation_id);

CREATE INDEX IF NOT EXISTS idx_mismatches_status
  ON recon_mismatches(reconciliation_id, review_status);

CREATE INDEX IF NOT EXISTS idx_mismatches_type
  ON recon_mismatches(reconciliation_id, mismatch_type);

CREATE INDEX IF NOT EXISTS idx_decisions_mismatch
  ON recon_mismatch_decisions(mismatch_id);

-- ─── 4. Row Level Security ────────────────────────────────────

ALTER TABLE recon_mismatches          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recon_mismatch_decisions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mismatches_member" ON recon_mismatches
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "decisions_member" ON recon_mismatch_decisions
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ─── 5. Summary counters on reconciliations ──────────────────
-- Add denormalised counters so the dashboard doesn't need
-- a COUNT(*) query per row.

ALTER TABLE reconciliations
  ADD COLUMN IF NOT EXISTS total_mismatches   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_mismatches    INT NOT NULL DEFAULT 0;
