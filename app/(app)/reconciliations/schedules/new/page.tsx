export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { NewScheduleForm } from './NewScheduleForm'
import type { OrgRole, Client } from '@/types'

const CAN_MANAGE: OrgRole[] = ['owner', 'admin', 'reviewer']

export default async function NewSchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')
  if (!CAN_MANAGE.includes(mb.role as OrgRole)) redirect('/reconciliations/schedules')

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('org_id', mb.org_id)
    .eq('status', 'active')
    .order('name')

  return (
    <div className="app-content">
      <Header title="New Recurring Schedule" />
      <div className="page-container" style={{ maxWidth: 600 }}>
        <NewScheduleForm clients={(clients ?? []) as Pick<Client, 'id' | 'name'>[]} />
      </div>
    </div>
  )
}
