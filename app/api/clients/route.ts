import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'

const CAN_MANAGE = ['owner', 'admin', 'reviewer'] as const

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: mb } = await supabase
    .from('org_members').select('org_id')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb) return NextResponse.json({ data: [] })

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, gstin, contact_person, email, phone, status, color, industry, created_at, updated_at')
    .eq('org_id', mb.org_id)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: mb } = await supabase
    .from('org_members').select('org_id, role')
    .eq('user_id', user.id).eq('is_active', true).maybeSingle()
  if (!mb || !CAN_MANAGE.includes(mb.role as typeof CAN_MANAGE[number]))
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })

  const body = await request.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('clients')
    .insert({
      org_id:         mb.org_id,
      name:           body.name.trim(),
      gstin:          body.gstin?.trim()          || null,
      contact_person: body.contact_person?.trim() || null,
      email:          body.email?.trim()          || null,
      phone:          body.phone?.trim()          || null,
      company:        body.company?.trim()        || null,
      industry:       body.industry?.trim()       || null,
      notes:          body.notes?.trim()          || null,
      status:         body.status                 || 'active',
      color:          body.color                  || '#0d9488',
      created_by:     user.id,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
