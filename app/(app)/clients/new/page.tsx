export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { NewClientForm } from './NewClientForm'
import type { OrgRole } from '@/types'

const CAN_MANAGE: OrgRole[] = ['owner', 'admin', 'reviewer']

export default async function NewClientPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')
  if (!CAN_MANAGE.includes(mb.role as OrgRole)) redirect('/clients')

  return (
    <div className="app-content">
      <Header title="New Client" />
      <div className="page-container" style={{ maxWidth: 660 }}>
        <NewClientForm />
      </div>
    </div>
  )
}
