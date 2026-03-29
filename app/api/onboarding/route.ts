import { NextResponse }       from 'next/server'
import { createClient }       from '@/lib/supabase/api'
import { createAdminClient }  from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { name } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Organisation name is required.' }, { status: 400 })

    const admin = createAdminClient()

    // Check user not already in an org
    const { data: existing } = await admin
      .from('org_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'Already in an organisation.' }, { status: 409 })

    // Create org
    const { data: org, error: orgError } = await admin
      .from('organisations')
      .insert({ name: name.trim(), billing_email: user.email })
      .select('id')
      .single()

    if (orgError || !org) return NextResponse.json({ error: 'Failed to create organisation.' }, { status: 500 })

    // Upsert user profile
    await admin.from('users').upsert({
      id:    user.id,
      name:  user.user_metadata?.full_name ?? user.email ?? 'User',
      email: user.email ?? '',
    }, { onConflict: 'id' })

    // Create owner membership
    await admin.from('org_members').insert({
      org_id:    org.id,
      user_id:   user.id,
      role:      'owner',
      is_active: true,
      joined_at: new Date().toISOString(),
    })

    return NextResponse.json({ orgId: org.id })
  } catch (err) {
    console.error('[onboarding]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
