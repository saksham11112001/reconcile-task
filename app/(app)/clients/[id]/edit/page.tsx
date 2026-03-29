export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { ClientEditForm } from './ClientEditForm'
import type { Client, OrgRole } from '@/types'

const CAN_MANAGE: OrgRole[] = ['owner', 'admin', 'reviewer']

interface Props { params: Promise<{ id: string }> }

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')
  if (!CAN_MANAGE.includes(mb.role as OrgRole)) redirect(`/clients/${id}`)

  const { data: client } = await supabase
    .from('clients').select('*')
    .eq('id', id).eq('org_id', mb.org_id).maybeSingle()
  if (!client) redirect('/clients')

  return (
    <div className="app-content">
      <Header title="Edit Client" />
      <div className="page-container" style={{ maxWidth: 660 }}>
        <ClientEditForm client={client as Client} />
      </div>
    </div>
  )
}
