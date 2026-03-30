-- ─── Migration 005: Period finalization, doc requests, checklists, audit logs ──
-- Run in Supabase SQL editor.

-- ── 1. Period finalization columns on reconciliations ────────────────────────
ALTER TABLE reconciliations
  ADD COLUMN IF NOT EXISTS is_finalized  boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalized_at  timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by  uuid        REFERENCES auth.users(id);

-- ── 2. Document requests table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doc_requests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id         uuid        REFERENCES clients(id) ON DELETE SET NULL,
  reconciliation_id uuid        REFERENCES reconciliations(id) ON DELETE SET NULL,
  title             text        NOT NULL,
  description       text,
  status            text        NOT NULL DEFAULT 'requested'
                    CHECK (status IN ('requested','received','pending','overdue','cancelled')),
  due_date          date,
  requested_by      uuid        REFERENCES auth.users(id),
  responded_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Reconciliation checklists ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recon_checklists (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  reconciliation_id   uuid        NOT NULL REFERENCES reconciliations(id) ON DELETE CASCADE,
  uploads_received    boolean     NOT NULL DEFAULT false,
  review_complete     boolean     NOT NULL DEFAULT false,
  exceptions_handled  boolean     NOT NULL DEFAULT false,
  documents_complete  boolean     NOT NULL DEFAULT false,
  ready_to_finalize   boolean     NOT NULL DEFAULT false,
  notes               text,
  updated_by          uuid        REFERENCES auth.users(id),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reconciliation_id)
);

-- ── 4. Audit log table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  entity_type  text        NOT NULL,  -- 'reconciliation'|'mismatch'|'client'|'doc_request'|'upload'
  entity_id    text        NOT NULL,
  action       text        NOT NULL,  -- 'created'|'finalized'|'mismatch_resolved'|'doc_requested' etc.
  actor_id     uuid        REFERENCES auth.users(id),
  actor_name   text,
  meta         jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_org_entity ON audit_logs (org_id, entity_type, entity_id, created_at DESC);

-- ── 5. Expand role check for client_upload role ──────────────────────────────
ALTER TABLE org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE org_members ADD CONSTRAINT org_members_role_check
  CHECK (role IN ('owner','admin','reviewer','analyst','viewer','client_upload'));

-- ── 6. RLS for doc_requests ──────────────────────────────────────────────────
ALTER TABLE doc_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view doc_requests"
  ON doc_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id  = doc_requests.org_id
        AND om.is_active = true
    )
  );

CREATE POLICY "reviewers can manage doc_requests"
  ON doc_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id  = doc_requests.org_id
        AND om.is_active = true
        AND om.role IN ('owner','admin','reviewer','analyst')
    )
  );

-- ── 7. RLS for recon_checklists ──────────────────────────────────────────────
ALTER TABLE recon_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view recon_checklists"
  ON recon_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id  = recon_checklists.org_id
        AND om.is_active = true
    )
  );

CREATE POLICY "reviewers can upsert recon_checklists"
  ON recon_checklists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id  = recon_checklists.org_id
        AND om.is_active = true
        AND om.role IN ('owner','admin','reviewer','analyst')
    )
  );

-- ── 8. RLS for audit_logs (read-only for members; insert via service role) ──
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view audit_logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.user_id = auth.uid()
        AND om.org_id  = audit_logs.org_id
        AND om.is_active = true
    )
  );
