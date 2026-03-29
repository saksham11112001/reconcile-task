import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvite }        from '@/lib/email/templates/invite'

// GET /api/team — list org members
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })

    const { data, error } = await supabase
      .from('org_members')
      .select('id, role, is_active, invited_at, joined_at, users(id, name, email, avatar_url)')
      .eq('org_id', mb.org_id)
      .order('joined_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[team GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// PATCH /api/team — update member role
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
    if (!['owner', 'admin'].includes(mb.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { memberId, role } = await request.json()
    const validRoles = ['admin', 'reviewer', 'analyst', 'viewer']
    if (!memberId || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('org_members')
      .update({ role })
      .eq('id', memberId)
      .eq('org_id', mb.org_id)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[team PATCH]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// POST /api/team — invite a new team member by email
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members')
      .select('org_id, role, users(name)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })
    if (!['owner', 'admin'].includes(mb.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, role = 'analyst', name = '' } = await request.json()
    if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch org details
    const { data: org } = await admin
      .from('organisations').select('id, name').eq('id', mb.org_id).single()

    // Use Supabase admin to invite user
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reconcile.sngadvisers.com'
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email.trim(),
      { redirectTo: `${appUrl}/onboarding` }
    )
    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })

    // Record in org_members (will be activated on first login via onboarding)
    await admin.from('org_members').upsert({
      org_id:     mb.org_id,
      user_id:    inviteData.user.id,
      role,
      is_active:  false,
      invited_at: new Date().toISOString(),
    }, { onConflict: 'org_id,user_id' })

    // Send invite email
    const inviterName = (mb.users as { name?: string } | null)?.name ?? 'A team member'
    await sendInvite({
      to:          email.trim(),
      inviteeName: name,
      inviterName,
      orgName:     org?.name ?? '',
      role,
      inviteUrl:   `${appUrl}/onboarding`,
    }).catch(console.error)

    return NextResponse.json({ ok: true, userId: inviteData.user.id }, { status: 201 })
  } catch (err) {
    console.error('[team POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
