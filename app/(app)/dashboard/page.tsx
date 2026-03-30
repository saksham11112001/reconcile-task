export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { StatusBadge, JobStatusBadge } from '@/components/ui/Badge'
import { fmtDate }      from '@/lib/utils/format'
import Link             from 'next/link'
import {
  Plus, FileUp, ClipboardList, AlertCircle, Users2, GitCompare,
  CheckCircle2, Clock, TrendingUp, RefreshCw,
} from 'lucide-react'
import type { Reconciliation, Client } from '@/types'
import type { ReactNode } from 'react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const [
    { data: recons },
    { count: resolvedCount },
    { count: escalatedCount },
    { data: clients },
    { data: recurringList },
  ] = await Promise.all([
    supabase
      .from('reconciliations')
      .select('id, name, client_id, period_start, period_end, status, job_status, total_matched, total_unmatched, total_mismatches, open_mismatches, created_at')
      .eq('org_id', mb.org_id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('recon_mismatches')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', mb.org_id)
      .eq('review_status', 'resolved'),
    supabase
      .from('recon_mismatches')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', mb.org_id)
      .eq('review_status', 'escalated'),
    supabase
      .from('clients')
      .select('id, name, color, status')
      .eq('org_id', mb.org_id)
      .eq('status', 'active'),
    supabase
      .from('recurring_recons')
      .select('id, name, frequency, next_due_date, client_id')
      .eq('org_id', mb.org_id)
      .eq('status', 'active')
      .order('next_due_date', { ascending: true })
      .limit(5),
  ])

  const list           = (recons    ?? []) as unknown as Reconciliation[]
  const activeClients  = (clients   ?? []) as Pick<Client, 'id' | 'name' | 'color' | 'status'>[]
  const recurring      = recurringList ?? []

  // KPI derivations
  const totalJobs       = list.length
  const openMismatches  = list.reduce((s, r) => s + (r.open_mismatches ?? 0), 0)
  const failedJobs      = list.filter(r => r.job_status === 'failed').length
  const processingJobs  = list.filter(r => r.job_status === 'processing').length
  const completedJobs   = list.filter(r => r.status === 'completed').length
  const resolvedTotal   = resolvedCount  ?? 0
  const escalatedTotal  = escalatedCount ?? 0

  // Pending actions = recons needing user attention
  const needingReview  = list.filter(r => (r.open_mismatches ?? 0) > 0 && r.job_status === 'ready')
  const needingUpload  = list.filter(r => r.job_status === 'pending')
  const hasFailed      = list.filter(r => r.job_status === 'failed')

  // Client name map
  const clientMap: Record<string, string> = {}
  activeClients.forEach(c => { clientMap[c.id] = c.name })

  const today   = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  return (
    <div className="app-content">
      <Header title="Dashboard" />
      <div className="page-container">

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              Overview
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {activeClients.length} active client{activeClients.length !== 1 ? 's' : ''} · {totalJobs} reconciliation{totalJobs !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/clients/new" className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Users2 style={{ width: 14, height: 14 }}/> Add Client
            </Link>
            <Link href="/reconciliations/new" className="btn btn-brand"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Plus style={{ width: 14, height: 14 }}/> New Reconciliation
            </Link>
          </div>
        </div>

        {/* KPI cards row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
          gap: '1rem', marginBottom: '1.75rem' }}>
          <KpiCard
            icon={Users2}
            label="Active Clients"
            value={activeClients.length}
            color="var(--brand)"
            bg="var(--brand-light)"
            border="var(--brand-border)"
            href="/clients"
          />
          <KpiCard
            icon={GitCompare}
            label="Total Reconciliations"
            value={totalJobs}
            color="var(--text-primary)"
            bg="var(--surface-subtle)"
            border="var(--border)"
          />
          <KpiCard
            icon={AlertCircle}
            label="Open Mismatches"
            value={openMismatches}
            color={openMismatches > 0 ? '#b91c1c' : '#15803d'}
            bg={openMismatches > 0 ? '#fef2f2' : '#f0fdf4'}
            border={openMismatches > 0 ? '#fecaca' : '#bbf7d0'}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Resolved"
            value={resolvedTotal}
            color="#15803d"
            bg="#f0fdf4"
            border="#bbf7d0"
          />
          <KpiCard
            icon={TrendingUp}
            label="Escalated"
            value={escalatedTotal}
            color={escalatedTotal > 0 ? '#92400e' : 'var(--text-muted)'}
            bg={escalatedTotal > 0 ? '#fffbeb' : 'var(--surface-subtle)'}
            border={escalatedTotal > 0 ? '#fde68a' : 'var(--border)'}
          />
          <KpiCard
            icon={Clock}
            label="Failed Jobs"
            value={failedJobs}
            color={failedJobs > 0 ? '#b91c1c' : 'var(--text-muted)'}
            bg={failedJobs > 0 ? '#fef2f2' : 'var(--surface-subtle)'}
            border={failedJobs > 0 ? '#fecaca' : 'var(--border)'}
          />
        </div>

        {/* Two-column layout for pending actions + upcoming */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
          marginBottom: '1.5rem' }}>

          {/* Pending Actions */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Pending Actions
              </span>
              {(needingReview.length + needingUpload.length + hasFailed.length) > 0 && (
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 7px',
                  borderRadius: 10, background: '#fef2f2', color: '#b91c1c' }}>
                  {needingReview.length + needingUpload.length + hasFailed.length}
                </span>
              )}
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {needingReview.length === 0 && needingUpload.length === 0 && hasFailed.length === 0 ? (
                <div style={{ padding: '1.5rem 1.1rem', textAlign: 'center',
                  fontSize: 13, color: 'var(--text-muted)' }}>
                  No pending actions
                </div>
              ) : (
                <>
                  {hasFailed.slice(0, 3).map(r => (
                    <ActionItem key={r.id}
                      href={`/reconciliations/${r.id}`}
                      icon={<AlertCircle style={{ width: 13, height: 13, color: '#b91c1c' }}/>}
                      label={r.name}
                      sub="Processing failed — fix upload"
                      accent="#b91c1c"
                    />
                  ))}
                  {needingUpload.slice(0, 3).map(r => (
                    <ActionItem key={r.id}
                      href={`/reconciliations/${r.id}`}
                      icon={<FileUp style={{ width: 13, height: 13, color: 'var(--brand)' }}/>}
                      label={r.name}
                      sub="Awaiting file uploads"
                      accent="var(--brand)"
                    />
                  ))}
                  {needingReview.slice(0, 4).map(r => (
                    <ActionItem key={r.id}
                      href={`/reconciliations/${r.id}/review`}
                      icon={<ClipboardList style={{ width: 13, height: 13, color: '#92400e' }}/>}
                      label={r.name}
                      sub={`${r.open_mismatches} open mismatch${(r.open_mismatches ?? 0) !== 1 ? 'es' : ''} to review`}
                      accent="#92400e"
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Upcoming Schedules */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1.1rem', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Upcoming Schedules
              </span>
              <Link href="/reconciliations/schedules"
                style={{ fontSize: 12, color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
                View all
              </Link>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {recurring.length === 0 ? (
                <div style={{ padding: '1.5rem 1.1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 8px' }}>
                    No recurring schedules yet.
                  </p>
                  <Link href="/reconciliations/schedules/new"
                    style={{ fontSize: 12.5, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
                    + Create schedule
                  </Link>
                </div>
              ) : (
                recurring.map((r: { id: string; name: string; frequency: string; next_due_date?: string; client_id?: string }) => {
                  const isOverdue = r.next_due_date && r.next_due_date < todayStr
                  return (
                    <ActionItem key={r.id}
                      href="/reconciliations/schedules"
                      icon={<RefreshCw style={{ width: 13, height: 13, color: isOverdue ? '#b91c1c' : 'var(--brand)' }}/>}
                      label={r.name}
                      sub={r.next_due_date
                        ? `Due ${fmtDate(r.next_due_date)} · ${r.frequency}`
                        : r.frequency}
                      accent={isOverdue ? '#b91c1c' : 'var(--text-muted)'}
                    />
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent reconciliations */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Recent Reconciliations
          </h3>
          {list.length > 0 && (
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              {list.length} total
            </span>
          )}
        </div>

        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                  {['Name', 'Client', 'Period', 'Status', 'Files', 'Mismatches', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.55rem 1rem', textAlign: 'left',
                      fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 15).map(r => (
                  <ReconRow key={r.id} r={r} clientName={r.client_id ? clientMap[r.client_id] : undefined} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {processingJobs > 0 && (
          <div style={{ marginTop: '1rem', padding: '0.75rem 1rem',
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: 8, fontSize: 13, color: '#1e40af',
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock style={{ width: 14, height: 14, flexShrink: 0 }}/>
            {processingJobs} reconciliation{processingJobs !== 1 ? 's are' : ' is'} currently processing.
            Refresh to check for updates.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── KPI card ──────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, color, bg, border, href }: {
  icon:   React.ElementType
  label:  string
  value:  number
  color:  string
  bg:     string
  border: string
  href?:  string
}) {
  const content = (
    <div style={{ padding: '1.1rem 1.25rem', borderRadius: 10,
      background: bg, border: `1px solid ${border}`,
      display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <Icon style={{ width: 18, height: 18, color, opacity: 0.6 }}/>
      </div>
      <div style={{ fontSize: 12.5, color, opacity: 0.75, fontWeight: 500 }}>{label}</div>
    </div>
  )
  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
        {content}
      </Link>
    )
  }
  return content
}

// ─── Action item ───────────────────────────────────────────────

function ActionItem({ href, icon, label, sub, accent }: {
  href:   string
  icon:   ReactNode
  label:  string
  sub:    string
  accent: string
}) {
  return (
    <Link href={href} className="action-item-row"
      style={{ display: 'flex', alignItems: 'center', gap: 10,
        padding: '0.6rem 1.1rem', textDecoration: 'none',
        borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </div>
        <div style={{ fontSize: 11.5, color: accent, marginTop: 1 }}>{sub}</div>
      </div>
    </Link>
  )
}

// ─── Table row ─────────────────────────────────────────────────

function ReconRow({ r, clientName }: { r: Reconciliation; clientName?: string }) {
  const needsUpload  = r.job_status === 'pending' || r.job_status === 'uploaded'
  const hasFailed    = r.job_status === 'failed'
  const hasOpenItems = (r.open_mismatches ?? 0) > 0

  return (
    <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
      <td style={{ padding: '0.65rem 1rem', fontWeight: 500,
        color: 'var(--text-primary)', fontSize: 13.5, maxWidth: 200 }}>
        <Link href={`/reconciliations/${r.id}`}
          style={{ color: 'inherit', textDecoration: 'none',
            display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {r.name}
        </Link>
      </td>
      <td style={{ padding: '0.65rem 1rem', fontSize: 12.5, color: 'var(--text-muted)',
        maxWidth: 120 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block' }}>
          {clientName ?? '—'}
        </span>
      </td>
      <td style={{ padding: '0.65rem 1rem', fontSize: 12.5, color: 'var(--text-secondary)',
        whiteSpace: 'nowrap' }}>
        {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
      </td>
      <td style={{ padding: '0.65rem 1rem' }}>
        <StatusBadge status={r.status} />
      </td>
      <td style={{ padding: '0.65rem 1rem' }}>
        <JobStatusBadge status={r.job_status} />
      </td>
      <td style={{ padding: '0.65rem 1rem', fontSize: 13 }}>
        {(r.total_mismatches ?? 0) > 0 ? (
          <span style={{ color: hasOpenItems ? '#b91c1c' : '#15803d', fontWeight: 500 }}>
            {hasOpenItems ? `${r.open_mismatches} open` : 'All reviewed'}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        )}
      </td>
      <td style={{ padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}>
        {hasFailed ? (
          <Link href={`/reconciliations/${r.id}`}
            style={{ fontSize: 12.5, color: '#b91c1c', textDecoration: 'none',
              fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle style={{ width: 12, height: 12 }}/> Fix
          </Link>
        ) : needsUpload ? (
          <Link href={`/reconciliations/${r.id}`}
            style={{ fontSize: 12.5, color: 'var(--brand)', textDecoration: 'none',
              fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <FileUp style={{ width: 12, height: 12 }}/> Upload
          </Link>
        ) : hasOpenItems ? (
          <Link href={`/reconciliations/${r.id}/review`}
            style={{ fontSize: 12.5, color: '#92400e', textDecoration: 'none',
              fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ClipboardList style={{ width: 12, height: 12 }}/> Review
          </Link>
        ) : (
          <Link href={`/reconciliations/${r.id}`}
            style={{ fontSize: 12.5, color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>
            Open →
          </Link>
        )}
      </td>
    </tr>
  )
}

// ─── Empty state ───────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
      <GitCompare style={{ width: 44, height: 44, color: 'var(--border)', margin: '0 auto 1rem' }}/>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
        No reconciliations yet
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '0 0 1.25rem' }}>
        Add your clients, then create a reconciliation to get started.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Link href="/clients/new" className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Users2 style={{ width: 14, height: 14 }}/> Add Client
        </Link>
        <Link href="/reconciliations/new" className="btn btn-brand"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Plus style={{ width: 14, height: 14 }}/> New Reconciliation
        </Link>
      </div>
    </div>
  )
}
