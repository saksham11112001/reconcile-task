import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'

const CAN_MANAGE = ['owner', 'admin', 'reviewer'] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: mb } = await supabase
    .from('org_members').select('org_id')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: client, error } = await supabase
    .from('clients').select('*')
    .eq('id', id).eq('org_id', mb.org_id).maybeSingle()
  if (error || !client) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch reconciliation stats for this client
  const { data: recons } = await supabase
    .from('reconciliations')
    .select('id, status, job_status, open_mismatches, period_end, created_at')
    .eq('org_id', mb.org_id)
    .eq('client_id', id)
    .order('period_end', { ascending: false })

  return NextResponse.json({ data: client, recons: recons ?? [] })
}

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
  const allowedFields = ['name','gstin','contact_person','email','phone','company','industry','notes','status','color']
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowedFields) {
    if (key in body) patch[key] = body[key] || null
  }
  if (body.name !== undefined) {
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    patch.name = body.name.trim()
  }

  const { data, error } = await supabase
    .from('clients').update(patch)
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

  // Soft-delete: set status to inactive
  const { error } = await supabase
    .from('clients').update({ status: 'inactive', updated_at: new Date().toISOString() })
    .eq('id', id).eq('org_id', mb.org_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
