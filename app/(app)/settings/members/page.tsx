export const dynamic = 'force-dynamic'

import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header }       from '@/components/layout/Header'
import { MembersView }  from './MembersView'
import type { OrgRole } from '@/types'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) redirect('/onboarding')

  const { data: members } = await supabase
    .from('org_members')
    .select('id, role, is_active, invited_at, joined_at, users(id, name, email)')
    .eq('org_id', mb.org_id)
    .order('joined_at', { ascending: true })

  return (
    <div className="app-content">
      <Header title="Team Members" />
      <div className="page-container">
        <MembersView
          members={(members ?? []) as any[]}
          currentRole={mb.role as OrgRole}
        />
      </div>
    </div>
  )
}
