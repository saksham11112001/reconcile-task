import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'

const CAN_MANAGE = ['owner', 'admin', 'reviewer'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb || !CAN_MANAGE.includes(mb.role as typeof CAN_MANAGE[number]))
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })

  const body = await request.json()
  const allowed = ['name','client_id','frequency','day_of_month','remind_days','auto_create','assigned_to','status']
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of allowed) {
    if (k in body) patch[k] = body[k] ?? null
  }

  const { data, error } = await supabase
    .from('recurring_recons').update(patch)
    .eq('id', id).eq('org_id', mb.org_id)
    .select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb || !['owner', 'admin'].includes(mb.role))
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })

  const { error } = await supabase
    .from('recurring_recons').update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id).eq('org_id', mb.org_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
