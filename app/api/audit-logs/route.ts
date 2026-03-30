import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/api'

// GET /api/audit-logs?entity_type=&entity_id=&limit=
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { data: mb } = await supabase
      .from('org_members').select('org_id')
      .eq('user_id', user.id).eq('is_active', true).maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entity_type')
    const entityId   = searchParams.get('entity_id')
    const limitStr   = searchParams.get('limit')
    const limit      = limitStr ? Math.min(parseInt(limitStr), 100) : 20

    let q = supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', mb.org_id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (entityType) q = q.eq('entity_type', entityType)
    if (entityId)   q = q.eq('entity_id', entityId)

    const { data, error } = await q
    if (error) throw error

    return NextResponse.json({ data: data ?? [] })
  } catch (err) {
    console.error('[audit-logs GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
