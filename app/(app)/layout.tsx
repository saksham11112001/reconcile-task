export const dynamic = 'force-dynamic'

import { redirect }          from 'next/navigation'
import { AppShell }          from './AppShell'
import { AuthErrorBoundary } from '@/components/auth/AuthErrorBoundary'
import { createClient }      from '@/lib/supabase/server'
import type { AppSession }   from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) redirect('/login')

  // Get membership + org in one query
  const { data: membership } = await supabase
    .from('org_members')
    .select('role, is_active, organisations(id, name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) {
    // Check for pending invite
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data: pending } = await admin
      .from('org_members')
      .select('id')
      .eq('user_id', user.id)
      .order('invited_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (pending) {
      await admin.from('org_members').update({ is_active: true }).eq('id', pending.id)
      redirect('/dashboard')
    }
    redirect('/onboarding')
  }

  const org = membership.organisations as any
  if (!org) redirect('/onboarding')

  const { data: profile } = await supabase
    .from('users')
    .select('id, name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const session: AppSession = {
    user: {
      id:         user.id,
      name:       profile?.name  ?? user.email ?? 'User',
      email:      profile?.email ?? user.email ?? '',
      avatar_url: profile?.avatar_url ?? null,
    },
    org:  { id: org.id, name: org.name },
    role: membership.role as AppSession['role'],
  }

  return (
    <AuthErrorBoundary>
      <AppShell session={session}>
        {children}
      </AppShell>
    </AuthErrorBoundary>
  )
}
