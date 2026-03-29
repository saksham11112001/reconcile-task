import { cn } from '@/lib/utils/cn'
import type { ReconStatus, EntrySource, JobStatus, ReviewStatus, MismatchType, MismatchSeverity } from '@/types'

// ─── Status badge ──────────────────────────────────────────────

const statusCfg: Record<ReconStatus, { label: string; bg: string; color: string }> = {
  draft:       { label: 'Draft',       bg: '#f1f5f9', color: '#64748b' },
  in_progress: { label: 'In Progress', bg: '#eff6ff', color: '#1d4ed8' },
  completed:   { label: 'Completed',   bg: '#f0fdf4', color: '#15803d' },
}

export function StatusBadge({ status }: { status: ReconStatus }) {
  const { label, bg, color } = statusCfg[status] ?? statusCfg.draft
  return (
    <span className="badge" style={{ background: bg, color }}>
      {label}
    </span>
  )
}

// ─── Job status badge ──────────────────────────────────────────

const jobStatusCfg: Record<JobStatus, { label: string; bg: string; color: string }> = {
  pending:    { label: 'Pending',    bg: '#f1f5f9', color: '#64748b' },
  uploaded:   { label: 'Uploaded',   bg: '#eff6ff', color: '#1d4ed8' },
  processing: { label: 'Processing', bg: '#fffbeb', color: '#92400e' },
  ready:      { label: 'Ready',      bg: '#f0fdf4', color: '#15803d' },
  failed:     { label: 'Failed',     bg: '#fef2f2', color: '#b91c1c' },
}

export function JobStatusBadge({ status }: { status: JobStatus | string }) {
  const cfg = jobStatusCfg[status as JobStatus] ?? jobStatusCfg.pending
  return (
    <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

// ─── Source badge ──────────────────────────────────────────────

const sourceCfg: Record<EntrySource, { label: string; bg: string; color: string }> = {
  bank: { label: 'Bank', bg: '#eff6ff', color: '#1d4ed8' },
  book: { label: 'Book', bg: '#fdf4ff', color: '#7c3aed' },
}

export function SourceBadge({ source }: { source: EntrySource }) {
  const { label, bg, color } = sourceCfg[source]
  return (
    <span className="badge" style={{ background: bg, color }}>
      {label}
    </span>
  )
}

// ─── Review status badge ───────────────────────────────────────

const reviewStatusCfg: Record<ReviewStatus, { label: string; bg: string; color: string }> = {
  open:      { label: 'Open',      bg: '#fef2f2', color: '#b91c1c' },
  resolved:  { label: 'Resolved',  bg: '#f0fdf4', color: '#15803d' },
  ignored:   { label: 'Ignored',   bg: '#f1f5f9', color: '#64748b' },
  escalated: { label: 'Escalated', bg: '#fffbeb', color: '#92400e' },
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus | string }) {
  const cfg = reviewStatusCfg[status as ReviewStatus] ?? reviewStatusCfg.open
  return <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
}

// ─── Mismatch type badge ────────────────────────────────────────

const mismatchTypeCfg: Record<MismatchType, { label: string; bg: string; color: string }> = {
  missing_in_bank:   { label: 'Missing in Bank',   bg: '#fef2f2', color: '#b91c1c' },
  missing_in_ledger: { label: 'Missing in Ledger', bg: '#fdf4ff', color: '#7c3aed' },
  amount_mismatch:   { label: 'Amount Mismatch',   bg: '#fffbeb', color: '#92400e' },
  date_mismatch:     { label: 'Date Mismatch',     bg: '#eff6ff', color: '#1d4ed8' },
  duplicate:         { label: 'Duplicate',         bg: '#fff1f2', color: '#be123c' },
  tax_mismatch:      { label: 'Tax Mismatch',      bg: '#fefce8', color: '#a16207' },
  gstin_mismatch:    { label: 'GSTIN Mismatch',    bg: '#f0fdf4', color: '#166534' },
}

export function MismatchTypeBadge({ type }: { type: MismatchType | string }) {
  const cfg = mismatchTypeCfg[type as MismatchType]
  if (!cfg) return <span className="badge" style={{ background: '#f1f5f9', color: '#64748b' }}>{type}</span>
  return <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
}

// ─── Severity badge ─────────────────────────────────────────────

const severityCfg: Record<MismatchSeverity, { label: string; bg: string; color: string }> = {
  low:    { label: 'Low',    bg: '#f1f5f9', color: '#64748b' },
  medium: { label: 'Medium', bg: '#fffbeb', color: '#92400e' },
  high:   { label: 'High',   bg: '#fef2f2', color: '#b91c1c' },
}

export function SeverityBadge({ severity }: { severity: MismatchSeverity | string }) {
  const cfg = severityCfg[severity as MismatchSeverity] ?? severityCfg.medium
  return <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
}

// ─── Generic badge ─────────────────────────────────────────────

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'error' | 'warning'
  className?: string
}

const variantCfg = {
  default: { bg: '#f1f5f9', color: '#64748b' },
  success: { bg: '#f0fdf4', color: '#15803d' },
  error:   { bg: '#fef2f2', color: '#b91c1c' },
  warning: { bg: '#fffbeb', color: '#92400e' },
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const { bg, color } = variantCfg[variant]
  return (
    <span className={cn('badge', className)} style={{ background: bg, color }}>
      {children}
    </span>
  )
}
