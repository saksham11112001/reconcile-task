-- ═══════════════════════════════════════════════════════════════
-- MIGRATION 001 — Reconciliation job status backbone
-- Run in: Supabase SQL Editor (Reconcile project only)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Add job_status to reconciliations ─────────────────────
--
-- job_status tracks the processing pipeline state (separate from
-- workflow status which tracks the matching/completion lifecycle):
--   pending    → job created, no files uploaded yet
--   uploaded   → at least one file uploaded
--   processing → files being parsed (future: async worker)
--   ready      → both files parsed, entries loaded, ready to match
--   failed     → one or more files failed to parse

ALTER TABLE reconciliations
  ADD COLUMN IF NOT EXISTS job_status TEXT
    NOT NULL DEFAULT 'pending'
    CHECK (job_status IN ('pending','uploaded','processing','ready','failed'));

ALTER TABLE reconciliations
  ADD COLUMN IF NOT EXISTS job_error TEXT;          -- last error message if failed

-- ─── 2. recon_uploads — one row per uploaded file per job ─────

CREATE TABLE IF NOT EXISTS recon_uploads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  reconciliation_id UUID NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  file_type         TEXT NOT NULL CHECK (file_type IN ('bank_statement','ledger')),
  file_name         TEXT NOT NULL,
  file_size         BIGINT,
  storage_path      TEXT,                       -- Supabase Storage path (set after upload)
  row_count         INT,                        -- populated after successful parse
  parsed_at         TIMESTAMPTZ,                -- when parsing completed
  parse_error       TEXT,                       -- error message if parse failed
  uploaded_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- only one upload record per file_type per reconciliation (latest wins via upsert)
  UNIQUE(reconciliation_id, file_type)
);

CREATE INDEX IF NOT EXISTS idx_uploads_recon ON recon_uploads(reconciliation_id);

ALTER TABLE recon_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uploads_member" ON recon_uploads
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ─── 3. Supabase Storage bucket ───────────────────────────────
-- Run manually in the Supabase dashboard → Storage:
--   Bucket name: recon-uploads
--   Type: Private
--   No public access
