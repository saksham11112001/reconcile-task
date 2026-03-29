import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/api'

// GET /api/reconciliations — list org reconciliations
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })

    const { data, error } = await supabase
      .from('reconciliations')
      .select('*')
      .eq('org_id', mb.org_id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[reconciliations GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// POST /api/reconciliations — create new reconciliation
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })

    const body = await request.json()
    const { name, period_start, period_end, opening_balance, closing_balance, client_id } = body

    if (!name?.trim() || !period_start || !period_end) {
      return NextResponse.json({ error: 'name, period_start and period_end are required.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('reconciliations')
      .insert({
        org_id:          mb.org_id,
        name:            name.trim(),
        client_id:       client_id || null,
        period_start,
        period_end,
        opening_balance: opening_balance ?? 0,
        closing_balance: closing_balance ?? 0,
        status:          'draft',
        job_status:      'pending',
        created_by:      user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('[reconciliations POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
