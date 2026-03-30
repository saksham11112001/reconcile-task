export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { SchedulesView } from './SchedulesView'
import type { RecurringRecon, OrgRole, Client } from '@/types'

const CAN_MANAGE: OrgRole[] = ['owner', 'admin', 'reviewer']

export default async function SchedulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const [{ data: rows }, { data: clientRows }] = await Promise.all([
    supabase
      .from('recurring_recons')
      .select(`
        id, name, frequency, status, day_of_month, remind_days, auto_create,
        next_due_date, last_created_at, created_at, client_id,
        clients ( name )
      `)
      .eq('org_id', mb.org_id)
      .order('next_due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('clients')
      .select('id, name')
      .eq('org_id', mb.org_id)
      .eq('status', 'active')
      .order('name'),
  ])

  const schedules = ((rows ?? []) as Record<string, unknown>[]).map(r => ({
    ...r,
    client_name: (r.clients as { name?: string } | null)?.name ?? null,
  })) as (RecurringRecon & { client_name: string | null })[]

  const clients = (clientRows ?? []) as Pick<Client, 'id' | 'name'>[]

  const canManage = CAN_MANAGE.includes(mb.role as OrgRole)
  const today     = new Date().toISOString().slice(0, 10)

  return (
    <div className="app-content">
      <Header title="Recurring Schedules" />
      <div className="page-container">
        <SchedulesView
          schedules={schedules}
          clients={clients}
          canManage={canManage}
          today={today}
        />
      </div>
    </div>
  )
}
