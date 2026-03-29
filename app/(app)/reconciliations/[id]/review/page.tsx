export const dynamic = 'force-dynamic'

import { redirect }        from 'next/navigation'
import { createClient }    from '@/lib/supabase/server'
import { Header }          from '@/components/layout/Header'
import { ReviewQueueView } from '@/components/reconciliation/ReviewQueueView'
import Link                from 'next/link'
import type { Reconciliation, ReconMismatch } from '@/types'

interface Props { params: Promise<{ id: string }> }

export default async function ReviewQueuePage({ params }: Props) {
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
    .select('id, name, period_start, period_end, status, job_status, open_mismatches, total_mismatches')
    .eq('id', id)
    .eq('org_id', mb.org_id)
    .maybeSingle()

  if (!recon) redirect('/dashboard')

  // Load all mismatches for this reconciliation (max 500 — sufficient for review)
  const { data: mismatches } = await supabase
    .from('recon_mismatches')
    .select('id, mismatch_type, review_status, severity, description, diff_data, bank_entry_id, book_entry_id, detected_at, created_at')
    .eq('reconciliation_id', id)
    .order('severity',    { ascending: false })
    .order('detected_at', { ascending: true  })
    .limit(500)

  const r = recon as Reconciliation

  return (
    <div className="app-content">
      <Header title={`Review — ${r.name}`} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Sub-header */}
        <div style={{ padding: '0.85rem 2rem', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0 }}>
          <Link href={`/reconciliations/${id}`}
            style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Workspace
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {r.open_mismatches} open · {r.total_mismatches} total
          </span>
        </div>

        {/* Main interactive view */}
        <ReviewQueueView
          mismatches={(mismatches ?? []) as ReconMismatch[]}
          reconId={id}
        />
      </div>
    </div>
  )
}
