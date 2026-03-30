export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { StatusBadge, JobStatusBadge } from '@/components/ui/Badge'
import { ReconChecklist }   from '@/components/reconciliation/ReconChecklist'
import { ActivityTimeline } from '@/components/reconciliation/ActivityTimeline'
import { FinalizeWrapper }  from '@/components/reconciliation/FinalizeWrapper'
import { fmtDate }      from '@/lib/utils/format'
import Link             from 'next/link'
import { FileText, CheckCircle, AlertCircle, Clock, TriangleAlert, ClipboardList } from 'lucide-react'
import { RemindClientButton } from '@/components/reconciliation/RemindClientButton'
import type { Reconciliation, ReconUpload, OrgRole } from '@/types'

interface Props { params: Promise<{ id: string }> }

const CAN_FINALIZE: OrgRole[] = ['owner', 'admin', 'reviewer']

export default async function ReconciliationWorkspacePage({ params }: Props) {
  const { id }   = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) redirect('/onboarding')

  const [
    { data: recon },
    { data: uploads },
    { data: mismatchRows },
    { data: checklistData },
  ] = await Promise.all([
    supabase
      .from('reconciliations')
      .select('*')
      .eq('id', id)
      .eq('org_id', mb.org_id)
      .maybeSingle(),
    supabase
      .from('recon_uploads')
      .select('*')
      .eq('reconciliation_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('recon_mismatches')
      .select('review_status, severity')
      .eq('reconciliation_id', id),
    supabase
      .from('recon_checklists')
      .select('*')
      .eq('reconciliation_id', id)
      .eq('org_id', mb.org_id)
      .maybeSingle(),
  ])

  if (!recon) redirect('/dashboard')

  const mismatchSummary = { total: 0, open: 0, resolved: 0, ignored: 0, escalated: 0, high: 0 }
  for (const m of (mismatchRows ?? [])) {
    mismatchSummary.total++
    if (m.review_status in mismatchSummary) mismatchSummary[m.review_status as keyof typeof mismatchSummary]++
    if (m.severity === 'high') mismatchSummary.high++
  }

  const r = recon as Reconciliation
  const uploadList = (uploads ?? []) as ReconUpload[]

  const bankUpload = uploadList.find(u => u.file_type === 'bank_statement') ?? null
  const bookUpload = uploadList.find(u => u.file_type === 'ledger')         ?? null

  // Build checklist defaults (handles null case)
  const checklist = {
    uploads_received:   checklistData?.uploads_received   ?? (!!bankUpload && !!bookUpload),
    review_complete:    checklistData?.review_complete    ?? (mismatchSummary.total > 0 && mismatchSummary.open === 0),
    exceptions_handled: checklistData?.exceptions_handled ?? false,
    documents_complete: checklistData?.documents_complete ?? false,
    ready_to_finalize:  checklistData?.ready_to_finalize  ?? false,
    notes:              checklistData?.notes              ?? null,
  }

  const canFinalize = CAN_FINALIZE.includes(mb.role as OrgRole)

  return (
    <div className="app-content">
      <Header title={r.name} />
      <div className="page-container">

        {/* ── Header row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <StatusBadge    status={r.status} />
          <JobStatusBadge status={r.job_status} />
          {r.is_finalized && (
            <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px',
              borderRadius: 6, background: '#f0fdf4', color: '#15803d',
              border: '1px solid #bbf7d0' }}>
              Finalized
            </span>
          )}
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Remind client to upload files */}
            {r.client_id && ['pending', 'uploaded'].includes(r.job_status) && canFinalize && (
              <RemindClientButton reconId={id} />
            )}
            {canFinalize && (
              <FinalizeWrapper
                reconId={id}
                isFinalized={r.is_finalized ?? false}
                openCount={mismatchSummary.open}
                canFinalize={canFinalize}
              />
            )}
            {mismatchSummary.total > 0 && !r.is_finalized && (
              <Link href={`/reconciliations/${id}/review`} className="btn btn-brand btn-sm">
                Review Queue {mismatchSummary.open > 0 && `(${mismatchSummary.open} open)`}
              </Link>
            )}
            {r.status === 'completed' && (
              <Link href={`/reconciliations/${id}/report`} className="btn btn-outline btn-sm">
                View Report
              </Link>
            )}
            <Link href="/reconciliations" className="btn btn-ghost btn-sm">
              ← All Reconciliations
            </Link>
          </div>
        </div>

        {/* ── Finalized banner ── */}
        {r.is_finalized && (
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10,
            padding: '0.85rem 1.1rem', borderRadius: 8,
            background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle style={{ width: 16, height: 16, color: '#15803d', flexShrink: 0 }}/>
            <span style={{ fontSize: 13.5, color: '#15803d', fontWeight: 500 }}>
              This period has been finalized
              {r.finalized_at ? ` on ${fmtDate(r.finalized_at)}` : ''}.
              No further edits are expected.
            </span>
          </div>
        )}

        {/* ── Job status banner ── */}
        <JobStatusBanner jobStatus={r.job_status} jobError={r.job_error} reconId={id} />

        {/* ── Two-column layout: uploads + checklist ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
          marginTop: '1.25rem' }}>

          {/* Uploaded files */}
          <div>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: 12, fontWeight: 600,
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Uploaded Files
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <UploadCard label="Bank Statement"      upload={bankUpload} />
              <UploadCard label="Ledger / Book entries" upload={bookUpload} />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: 12, fontWeight: 600,
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Period Checklist
            </h3>
            <ReconChecklist
              reconId={id}
              initial={checklist}
              readOnly={r.is_finalized ?? false}
            />
          </div>
        </div>

        {/* ── Mismatch summary ── */}
        {mismatchSummary.total > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: 12, fontWeight: 600,
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Mismatches
            </h3>
            <MismatchSummaryBar summary={mismatchSummary} reconId={id} />
          </div>
        )}

        {/* ── All-clear state ── */}
        {r.job_status === 'ready' && mismatchSummary.total === 0 && (
          <div className="card" style={{ marginTop: '1.5rem', padding: '2rem',
            textAlign: 'center', border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
            <CheckCircle style={{ width: 28, height: 28, color: '#15803d', margin: '0 auto 0.75rem' }}/>
            <p style={{ color: '#15803d', fontSize: 14.5, margin: 0, fontWeight: 600 }}>
              No mismatches found — perfect match.
            </p>
            <p style={{ color: '#15803d', fontSize: 12.5, margin: '4px 0 0', opacity: 0.75 }}>
              Both files were processed and all entries matched successfully.
            </p>
          </div>
        )}

        {/* ── Activity timeline ── */}
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: 12, fontWeight: 600,
            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Activity
          </h3>
          <ActivityTimeline reconId={id} />
        </div>

      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────

function JobStatusBanner({ jobStatus, jobError, reconId }: {
  jobStatus: string
  jobError:  string | null
  reconId:   string
}) {
  if (jobStatus === 'ready') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10,
        padding: '0.85rem 1.1rem', borderRadius: 8,
        background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <CheckCircle style={{ width: 16, height: 16, color: '#15803d', flexShrink: 0 }}/>
        <span style={{ fontSize: 13.5, color: '#15803d', fontWeight: 500 }}>
          Both files uploaded and matched. Review queue is available.
        </span>
      </div>
    )
  }
  if (jobStatus === 'failed') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '0.85rem 1.1rem', borderRadius: 8,
        background: '#fef2f2', border: '1px solid #fecaca' }}>
        <AlertCircle style={{ width: 16, height: 16, color: '#b91c1c', flexShrink: 0, marginTop: 1 }}/>
        <div>
          <span style={{ fontSize: 13.5, color: '#b91c1c', fontWeight: 500 }}>
            Processing failed.
          </span>
          {jobError && (
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#b91c1c', opacity: 0.8 }}>
              {jobError}
            </p>
          )}
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#b91c1c', opacity: 0.7 }}>
            Re-upload the files to retry.
          </p>
        </div>
      </div>
    )
  }
  if (jobStatus === 'pending') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10,
        padding: '0.85rem 1.1rem', borderRadius: 8,
        background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
        <Clock style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }}/>
        <span style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>
          No files uploaded yet.{' '}
          <Link href={`/reconciliations/new?id=${reconId}`}
            style={{ color: 'var(--brand)', fontWeight: 500 }}>
            Upload files →
          </Link>
        </span>
      </div>
    )
  }
  if (jobStatus === 'uploaded') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10,
        padding: '0.85rem 1.1rem', borderRadius: 8,
        background: '#eff6ff', border: '1px solid #bfdbfe' }}>
        <Clock style={{ width: 16, height: 16, color: '#1d4ed8', flexShrink: 0 }}/>
        <span style={{ fontSize: 13.5, color: '#1d4ed8' }}>
          One file uploaded. Upload the second file to start matching.
        </span>
      </div>
    )
  }
  if (jobStatus === 'processing') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10,
        padding: '0.85rem 1.1rem', borderRadius: 8,
        background: '#fffbeb', border: '1px solid #fde68a' }}>
        <Clock style={{ width: 16, height: 16, color: '#92400e', flexShrink: 0 }}/>
        <span style={{ fontSize: 13.5, color: '#92400e' }}>
          Processing files — this usually takes under a minute. Refresh to check.
        </span>
      </div>
    )
  }
  return null
}

function MismatchSummaryBar({ summary, reconId }: {
  summary: { total: number; open: number; resolved: number; ignored: number; escalated: number; high: number }
  reconId: string
}) {
  const tiles = [
    { label: 'Total',     value: summary.total,     bg: 'var(--surface-subtle)', color: 'var(--text-primary)', border: 'var(--border)' },
    { label: 'Open',      value: summary.open,      bg: '#fef2f2',               color: '#b91c1c',             border: '#fecaca' },
    { label: 'Escalated', value: summary.escalated, bg: '#fffbeb',               color: '#92400e',             border: '#fde68a' },
    { label: 'Resolved',  value: summary.resolved,  bg: '#f0fdf4',               color: '#15803d',             border: '#bbf7d0' },
    { label: 'Ignored',   value: summary.ignored,   bg: 'var(--surface-subtle)', color: 'var(--text-muted)',   border: 'var(--border)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
        {tiles.map(({ label, value, bg, color, border }) => (
          <div key={label} style={{ padding: '0.85rem 1rem', borderRadius: 8,
            background: bg, border: `1px solid ${border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11.5, fontWeight: 500, color, opacity: 0.75,
              marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {summary.high > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
          padding: '0.7rem 1rem', borderRadius: 8,
          background: '#fef2f2', border: '1px solid #fecaca' }}>
          <TriangleAlert style={{ width: 15, height: 15, color: '#b91c1c', flexShrink: 0 }}/>
          <span style={{ fontSize: 13, color: '#b91c1c' }}>
            <strong>{summary.high}</strong> high-severity mismatch{summary.high !== 1 ? 'es' : ''} need attention.
          </span>
        </div>
      )}

      {summary.open === 0 && summary.total > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
          padding: '0.7rem 1rem', borderRadius: 8,
          background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <CheckCircle style={{ width: 15, height: 15, color: '#15803d', flexShrink: 0 }}/>
          <span style={{ fontSize: 13, color: '#15803d', fontWeight: 500 }}>
            All mismatches reviewed.
          </span>
        </div>
      )}

      {summary.open > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.8rem 1rem', borderRadius: 8,
          background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList style={{ width: 15, height: 15, color: 'var(--text-muted)', flexShrink: 0 }}/>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{summary.open}</strong>{' '}
              mismatch{summary.open !== 1 ? 'es' : ''} pending review
            </span>
          </div>
          <Link href={`/reconciliations/${reconId}/review`}
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Open Review Queue →
          </Link>
        </div>
      )}
    </div>
  )
}

function UploadCard({ label, upload }: { label: string; upload: ReconUpload | null }) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: upload ? '#f0fdf4' : 'var(--surface-subtle)',
        border: `1px solid ${upload ? '#bbf7d0' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {upload
          ? <CheckCircle style={{ width: 17, height: 17, color: '#15803d' }}/>
          : <FileText    style={{ width: 17, height: 17, color: 'var(--text-muted)' }}/>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600,
          color: upload ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {label}
        </div>
        {upload ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {upload.file_name}
            {upload.file_size ? ` · ${(upload.file_size / 1024).toFixed(1)} KB` : ''}
            {upload.row_count  ? ` · ${upload.row_count} rows` : ''}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
            Not uploaded
          </div>
        )}
      </div>
    </div>
  )
}
