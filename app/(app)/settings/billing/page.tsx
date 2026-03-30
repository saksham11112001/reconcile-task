export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { BillingView }  from './BillingView'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id, role, organisations(id, name)')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const org = mb.organisations as unknown as { id: string; name: string } | null

  return (
    <div className="app-content">
      <Header title="Billing & Plan" />
      <div className="page-container">
        <BillingView
          orgName={org?.name ?? ''}
          currentPlan="starter"
          canManage={['owner','admin'].includes(mb.role)}
        />
      </div>
    </div>
  )
}
