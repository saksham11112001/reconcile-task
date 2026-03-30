export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { ClientsView }  from './ClientsView'
import type { Client, OrgRole } from '@/types'

const CAN_MANAGE: OrgRole[] = ['owner', 'admin', 'reviewer']

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const [{ data: clients }, { data: reconStats }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, gstin, contact_person, email, phone, status, color, industry, created_at, updated_at')
      .eq('org_id', mb.org_id)
      .order('name'),
    supabase
      .from('reconciliations')
      .select('client_id, open_mismatches, period_end, job_status')
      .eq('org_id', mb.org_id)
      .order('period_end', { ascending: false }),
  ])

  // Build per-client summary maps
  const openMismatchMap: Record<string, number> = {}
  const lastPeriodMap:   Record<string, string> = {}
  const lastJobMap:      Record<string, string> = {}
  const seen = new Set<string>()

  for (const r of reconStats ?? []) {
    if (!r.client_id) continue
    openMismatchMap[r.client_id] = (openMismatchMap[r.client_id] ?? 0) + (r.open_mismatches ?? 0)
    if (!seen.has(r.client_id)) {
      seen.add(r.client_id)
      lastPeriodMap[r.client_id] = r.period_end
      lastJobMap[r.client_id]    = r.job_status
    }
  }

  const list = ((clients ?? []) as Client[]).map(c => ({
    ...c,
    open_mismatches: openMismatchMap[c.id] ?? 0,
    last_period_end: lastPeriodMap[c.id]   ?? null,
    last_job_status: lastJobMap[c.id]      ?? null,
  }))

  const canManage = CAN_MANAGE.includes(mb.role as OrgRole)

  return (
    <div className="app-content">
      <Header title="Clients" />
      <ClientsView clients={list} canManage={canManage} />
    </div>
  )
}
