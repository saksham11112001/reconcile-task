import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/api'

interface Ctx { params: Promise<{ id: string }> }

async function getOrgAndRecon(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, reconId: string) {
  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) return { mb: null, recon: null }

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('*')
    .eq('id', reconId)
    .eq('org_id', mb.org_id)
    .maybeSingle()

  return { mb, recon }
}

// GET /api/reconciliations/[id]
export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { mb, recon } = await getOrgAndRecon(supabase, user.id, id)
    if (!mb)    return NextResponse.json({ error: 'No org' },   { status: 403 })
    if (!recon) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(recon)
  } catch (err) {
    console.error('[recon GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// PATCH /api/reconciliations/[id]
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { mb, recon } = await getOrgAndRecon(supabase, user.id, id)
    if (!mb)    return NextResponse.json({ error: 'No org' },   { status: 403 })
    if (!recon) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (recon.status === 'completed') {
      return NextResponse.json({ error: 'Cannot edit a completed reconciliation.' }, { status: 409 })
    }

    const body = await request.json()
    const allowed = ['name', 'period_start', 'period_end', 'opening_balance', 'closing_balance', 'job_status', 'job_error']
    const patch: Record<string, unknown> = {}
    for (const k of allowed) { if (k in body) patch[k] = body[k] }

    const { data, error } = await supabase
      .from('reconciliations')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[recon PATCH]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// DELETE /api/reconciliations/[id]
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { mb, recon } = await getOrgAndRecon(supabase, user.id, id)
    if (!mb)    return NextResponse.json({ error: 'No org' },   { status: 403 })
    if (!recon) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (!['owner', 'admin'].includes(mb.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (recon.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft reconciliations can be deleted.' }, { status: 409 })
    }

    const { error } = await supabase.from('reconciliations').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[recon DELETE]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
