export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { StatusBadge, JobStatusBadge } from '@/components/ui/Badge'
import { fmtDate }      from '@/lib/utils/format'
import Link             from 'next/link'
import { FileText, CheckCircle, AlertCircle, Clock, TriangleAlert, ClipboardList } from 'lucide-react'
import type { Reconciliation, ReconUpload } from '@/types'

interface Props { params: Promise<{ id: string }> }

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

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('*')
    .eq('id', id)
    .eq('org_id', mb.org_id)
    .maybeSingle()

  if (!recon) redirect('/dashboard')

  const { data: uploads } = await supabase
    .from('recon_uploads')
    .select('*')
    .eq('reconciliation_id', id)
    .order('created_at', { ascending: true })

  // Mismatch summary counts (one query, no row data needed here)
  const { data: mismatchRows } = await supabase
    .from('recon_mismatches')
    .select('review_status, severity')
    .eq('reconciliation_id', id)

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

  return (
    <div className="app-content">
      <Header title={r.name} />
      <div className="page-container">

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <StatusBadge    status={r.status} />
          <JobStatusBadge status={r.job_status} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {mismatchSummary.total > 0 && (
              <Link href={`/reconciliations/${id}/review`} className="btn btn-brand btn-sm">
                Review Queue {mismatchSummary.open > 0 && `(${mismatchSummary.open} open)`}
              </Link>
            )}
            {r.status === 'completed' && (
              <Link href={`/reconciliations/${id}/report`} className="btn btn-outline btn-sm">
                View Report
              </Link>
            )}
            <Link href="/reconciliations/new" className="btn btn-ghost btn-sm">
              ← New recon
            </Link>
          </div>
        </div>

        {/* Job status banner */}
        <JobStatusBanner jobStatus={r.job_status} jobError={r.job_error} reconId={id} />

        {/* Uploaded files */}
        <div style={{ marginTop: '1.25rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: 14, fontWeight: 600,
            color: 'var(--text-secondary)', textTransform: 'uppercase',
            letterSpacing: '0.06em' }}>
            Uploaded files
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <UploadCard
              label="Bank Statement"
              upload={bankUpload}
              reconId={id}
              fileType="bank_statement"
            />
            <UploadCard
              label="Ledger / Book entries"
              upload={bookUpload}
              reconId={id}
              fileType="ledger"
            />
          </div>
        </div>

        {/* Mismatch summary — shown once there are any mismatches */}
        {mismatchSummary.total > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: 14, fontWeight: 600,
              color: 'var(--text-secondary)', textTransform: 'uppercase',
              letterSpacing: '0.06em' }}>
              Mismatches
            </h3>
            <MismatchSummaryBar summary={mismatchSummary} reconId={id} />
          </div>
        )}

        {/* Workspace area */}
        {r.job_status === 'ready' && mismatchSummary.total === 0 && (
          <div className="card" style={{ marginTop: '1.5rem', padding: '2rem',
            textAlign: 'center', border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
            <p style={{ color: '#15803d', fontSize: 14, margin: 0, fontWeight: 500 }}>
              Both files uploaded. Ready for reconciliation.
            </p>
            <p style={{ color: '#15803d', fontSize: 12.5, margin: '6px 0 0', opacity: 0.75 }}>
              Matching will run automatically once processing begins.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Sub-components (server-renderable) ────────────────────────

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
          Both files uploaded. Ready for matching.
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
            A file failed to process.
          </span>
          {jobError && (
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#b91c1c', opacity: 0.8 }}>
              {jobError}
            </p>
          )}
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
          <Link href="/reconciliations/new" style={{ color: 'var(--brand)', fontWeight: 500 }}>
            Go to upload
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
          Waiting for both files. Upload the missing file to continue.
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
    { label: 'Total',     value: summary.total,     bg: 'var(--surface-subtle)', color: 'var(--text-primary)',  border: 'var(--border)' },
    { label: 'Open',      value: summary.open,      bg: '#fef2f2',               color: '#b91c1c',              border: '#fecaca' },
    { label: 'Escalated', value: summary.escalated, bg: '#fffbeb',               color: '#92400e',              border: '#fde68a' },
    { label: 'Resolved',  value: summary.resolved,  bg: '#f0fdf4',               color: '#15803d',              border: '#bbf7d0' },
    { label: 'Ignored',   value: summary.ignored,   bg: 'var(--surface-subtle)', color: 'var(--text-muted)',    border: 'var(--border)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Stat tiles */}
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

      {/* High-severity alert */}
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

      {/* All clear */}
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

      {/* Review queue CTA */}
      {summary.open > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.8rem 1rem', borderRadius: 8,
          background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList style={{ width: 15, height: 15, color: 'var(--text-muted)', flexShrink: 0 }}/>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{summary.open}</strong> mismatch{summary.open !== 1 ? 'es' : ''} pending review
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

function UploadCard({ label, upload, reconId, fileType }: {
  label:    string
  upload:   ReconUpload | null
  reconId:  string
  fileType: string
}) {
  return (
    <div className="card" style={{ padding: '1.1rem 1.25rem', display: 'flex',
      alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: upload ? '#f0fdf4' : 'var(--surface-subtle)',
        border: `1px solid ${upload ? '#bbf7d0' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {upload
          ? <CheckCircle style={{ width: 18, height: 18, color: '#15803d' }}/>
          : <FileText    style={{ width: 18, height: 18, color: 'var(--text-muted)' }}/>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600,
          color: upload ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {label}
        </div>
        {upload ? (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {upload.file_name}
            {upload.file_size && ` · ${(upload.file_size / 1024).toFixed(1)} KB`}
            {upload.row_count  && ` · ${upload.row_count} rows`}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Not uploaded
          </div>
        )}
      </div>
    </div>
  )
}
