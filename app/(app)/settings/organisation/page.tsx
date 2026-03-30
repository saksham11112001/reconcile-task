export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { OrgSettingsView } from './OrgSettingsView'

export default async function OrganisationSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id, role, organisations(id, name, billing_email)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) redirect('/onboarding')

  const org = mb.organisations as unknown as { id: string; name: string; billing_email: string | null } | null
  if (!org) redirect('/onboarding')

  const isOwnerOrAdmin = ['owner', 'admin'].includes(mb.role)

  return (
    <div className="app-content">
      <Header title="Organisation" />
      <div className="page-container">
        <OrgSettingsView
          org={org}
          role={mb.role}
          canEdit={isOwnerOrAdmin}
        />
      </div>
    </div>
  )
}
