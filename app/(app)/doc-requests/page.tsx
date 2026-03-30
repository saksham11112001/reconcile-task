export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { DocRequestsView } from './DocRequestsView'
import type { DocRequest, Client, OrgRole } from '@/types'

const CAN_MANAGE: OrgRole[] = ['owner','admin','reviewer','analyst']

export default async function DocRequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const [{ data: requests }, { data: clients }] = await Promise.all([
    supabase
      .from('doc_requests')
      .select('*, clients(name), reconciliations(name)')
      .eq('org_id', mb.org_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('clients')
      .select('id, name, color, status')
      .eq('org_id', mb.org_id)
      .eq('status', 'active')
      .order('name'),
  ])

  const rows = (requests ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    client_name: (r.clients as { name?: string } | null)?.name ?? null,
    recon_name:  (r.reconciliations as { name?: string } | null)?.name ?? null,
    clients:     undefined,
    reconciliations: undefined,
  })) as unknown as DocRequest[]

  const canManage = CAN_MANAGE.includes(mb.role as OrgRole)

  return (
    <div className="app-content">
      <Header title="Document Requests" />
      <DocRequestsView
        requests={rows}
        clients={(clients ?? []) as Pick<Client, 'id' | 'name' | 'color'>[]}
        canManage={canManage}
      />
    </div>
  )
}
