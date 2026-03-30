// ─── Tenant ────────────────────────────────────────────────────

export interface Organisation {
  id: string
  name: string
  billing_email: string | null
  logo_url: string | null
  created_at: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar_url: string | null
  created_at: string
}

export type OrgRole = 'owner' | 'admin' | 'reviewer' | 'analyst' | 'viewer' | 'client_upload'

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: OrgRole
  is_active: boolean
  invited_at: string | null
  joined_at: string | null
}

// ─── Reconciliation ────────────────────────────────────────────

export type ReconStatus = 'draft' | 'in_progress' | 'completed'

// Processing pipeline state — separate from workflow status
export type JobStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed'

export type FileType = 'bank_statement' | 'ledger'

export interface Reconciliation {
  id: string
  org_id: string
  name: string
  client_id: string | null
  period_start: string
  period_end: string
  status: ReconStatus
  job_status: JobStatus
  job_error: string | null
  opening_balance: number
  closing_balance: number
  total_matched: number
  total_unmatched: number
  net_difference: number
  total_mismatches: number
  open_mismatches: number
  is_finalized: boolean
  finalized_at: string | null
  finalized_by: string | null
  assignee_id: string | null
  approver_id: string | null
  created_by: string | null
  completed_at: string | null
  created_at: string
}

export interface ReconUpload {
  id: string
  org_id: string
  reconciliation_id: string
  file_type: FileType
  file_name: string
  file_size: number | null
  storage_path: string | null
  row_count: number | null
  parsed_at: string | null
  parse_error: string | null
  uploaded_by: string | null
  created_at: string
}

export type EntrySource = 'bank' | 'book'

export interface ReconEntry {
  id: string
  org_id: string
  reconciliation_id: string
  source: EntrySource
  entry_date: string
  description: string | null
  reference: string | null
  amount: number
  is_matched: boolean
  is_flagged: boolean
  created_at: string
}

export type MatchType = 'auto' | 'manual'

export interface ReconMatch {
  id: string
  org_id: string
  reconciliation_id: string
  bank_entry_id: string
  book_entry_id: string
  match_type: MatchType
  matched_by: string | null
  matched_at: string
}

export interface ReconFlag {
  id: string
  org_id: string
  entry_id: string
  note: string | null
  created_by: string | null
  created_at: string
}

// ─── Mismatches ────────────────────────────────────────────────

export type MismatchType =
  | 'missing_in_bank'
  | 'missing_in_ledger'
  | 'amount_mismatch'
  | 'date_mismatch'
  | 'duplicate'
  | 'tax_mismatch'
  | 'gstin_mismatch'

export type ReviewStatus = 'open' | 'resolved' | 'ignored' | 'escalated'

export type MismatchSeverity = 'low' | 'medium' | 'high'

export type DecisionType = 'resolved' | 'ignored' | 'escalated' | 'reopened'

export interface ReconMismatch {
  id:                 string
  org_id:             string
  reconciliation_id:  string
  mismatch_type:      MismatchType
  review_status:      ReviewStatus
  bank_entry_id:      string | null
  book_entry_id:      string | null
  diff_data:          Record<string, unknown> | null
  description:        string | null
  severity:           MismatchSeverity
  detected_at:        string
  created_at:         string
}

export interface MismatchDecision {
  id:           string
  org_id:       string
  mismatch_id:  string
  decision:     DecisionType
  note:         string | null
  decided_by:   string | null
  decided_at:   string
}

// ─── Clients ───────────────────────────────────────────────────

export type ClientStatus = 'active' | 'inactive' | 'prospect'

export type ClientHealth = 'healthy' | 'needs_review' | 'at_risk'

export interface Client {
  id:             string
  org_id:         string
  name:           string
  gstin:          string | null
  contact_person: string | null
  email:          string | null
  phone:          string | null
  company:        string | null
  industry:       string | null
  notes:          string | null
  status:         ClientStatus
  color:          string
  created_by:     string | null
  created_at:     string
  updated_at:     string
}

// Summary shape returned from joined queries
export interface ClientSummary extends Client {
  open_mismatches:       number
  total_reconciliations: number
  last_period_end:       string | null
  last_job_status:       string | null
  health:                ClientHealth
}

// ─── Recurring Reconciliations ─────────────────────────────────

export type RecurringFrequency = 'monthly' | 'quarterly'

export type RecurringStatus = 'active' | 'paused' | 'cancelled'

export interface RecurringRecon {
  id:           string
  org_id:       string
  client_id:    string | null
  name:         string
  frequency:    RecurringFrequency
  status:       RecurringStatus
  day_of_month: number           // 1-28
  assigned_to:  string | null    // user_id of reviewer
  auto_create:  boolean
  remind_days:  number           // days before due date to send reminder
  created_by:   string | null
  created_at:   string
  updated_at:   string
  // joined
  client_name?:  string | null
  next_due_date?: string | null
  last_created_at?: string | null
}

// ─── Document Requests ─────────────────────────────────────────

export type DocRequestStatus = 'requested' | 'received' | 'pending' | 'overdue' | 'cancelled'

export interface DocRequest {
  id:                 string
  org_id:             string
  client_id:          string | null
  reconciliation_id:  string | null
  title:              string
  description:        string | null
  status:             DocRequestStatus
  due_date:           string | null
  requested_by:       string | null
  responded_at:       string | null
  created_at:         string
  updated_at:         string
  // joined
  client_name?:       string | null
  recon_name?:        string | null
}

// ─── Reconciliation Checklist ──────────────────────────────────

export interface ReconChecklist {
  id:                  string
  org_id:              string
  reconciliation_id:   string
  uploads_received:    boolean
  review_complete:     boolean
  exceptions_handled:  boolean
  documents_complete:  boolean
  ready_to_finalize:   boolean
  notes:               string | null
  updated_by:          string | null
  updated_at:          string
}

// ─── Audit Log ─────────────────────────────────────────────────

export type AuditAction =
  | 'recon_created'
  | 'recon_finalized'
  | 'recon_unfinalized'
  | 'upload_created'
  | 'mismatch_resolved'
  | 'mismatch_ignored'
  | 'mismatch_escalated'
  | 'mismatch_reopened'
  | 'client_created'
  | 'client_updated'
  | 'doc_requested'
  | 'doc_received'
  | 'doc_cancelled'
  | 'checklist_updated'

export interface AuditLog {
  id:          string
  org_id:      string
  entity_type: string
  entity_id:   string
  action:      AuditAction | string
  actor_id:    string | null
  actor_name:  string | null
  meta:        Record<string, unknown> | null
  created_at:  string
}

// ─── Session (Zustand store) ────────────────────────────────────

export interface SessionUser {
  id: string
  name: string
  email: string
  avatar_url: string | null
}

export interface SessionOrg {
  id: string
  name: string
}

export interface AppSession {
  user: SessionUser
  org: SessionOrg
  role: OrgRole
}
