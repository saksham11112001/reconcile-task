export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { ReconciliationsView } from '../ReconciliationsView'
import type { Reconciliation, Client } from '@/types'

export default async function MyReconciliationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const [{ data: recons }, { data: clients }] = await Promise.all([
    supabase
      .from('reconciliations')
      .select('id, name, client_id, assignee_id, approver_id, created_by, period_start, period_end, status, job_status, total_mismatches, open_mismatches, total_matched, created_at')
      .eq('org_id', mb.org_id)
      .or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name, color')
      .eq('org_id', mb.org_id),
  ])

  return (
    <div className="app-content">
      <Header title="My Reconciliations" />
      <div className="page-container">
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            My Reconciliations
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Reconciliations assigned to you or created by you.
          </p>
        </div>
        <ReconciliationsView
          list={(recons ?? []) as unknown as Reconciliation[]}
          clients={(clients ?? []) as Pick<Client, 'id' | 'name' | 'color'>[]}
          currentUserId={user.id}
          myMode
        />
      </div>
    </div>
  )
}
