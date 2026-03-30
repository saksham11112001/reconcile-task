import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/organisation — update org name / billing_email (owner/admin only)
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })
    if (!['owner', 'admin'].includes(mb.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { name, billing_email } = body

    const updates: Record<string, string> = {}
    if (typeof name === 'string' && name.trim()) updates.name = name.trim()
    if (typeof billing_email === 'string') updates.billing_email = billing_email.trim() || ''

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('organisations')
      .update(updates)
      .eq('id', mb.org_id)
      .select('id, name, billing_email')
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[organisation PATCH]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
