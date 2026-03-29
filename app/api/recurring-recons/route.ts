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
    .from('recurring_recons')
    .select(`
      id, name, frequency, status, day_of_month, remind_days, auto_create,
      assigned_to, next_due_date, last_created_at, created_at, client_id,
      clients ( name )
    `)
    .eq('org_id', mb.org_id)
    .order('next_due_date', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Flatten client name
  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    client_name: (r.clients as { name?: string } | null)?.name ?? null,
    clients: undefined,
  }))
  return NextResponse.json({ data: rows })
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
  if (!['monthly', 'quarterly'].includes(body.frequency))
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 })

  const dayOfMonth = Math.min(28, Math.max(1, parseInt(body.day_of_month ?? '1', 10) || 1))

  // Compute next_due_date
  const nextDue = computeNextDue(body.frequency, dayOfMonth)

  const { data, error } = await supabase
    .from('recurring_recons')
    .insert({
      org_id:       mb.org_id,
      name:         body.name.trim(),
      client_id:    body.client_id  || null,
      frequency:    body.frequency,
      day_of_month: dayOfMonth,
      remind_days:  parseInt(body.remind_days ?? '3', 10) || 3,
      auto_create:  body.auto_create ?? false,
      assigned_to:  body.assigned_to || null,
      status:       'active',
      next_due_date: nextDue,
      created_by:   user.id,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}

// ── helpers ───────────────────────────────────────────────────

function computeNextDue(frequency: string, day: number): string {
  const now = new Date()
  let year  = now.getFullYear()
  let month = now.getMonth() // 0-based

  if (frequency === 'monthly') {
    // Next month
    month += 1
    if (month > 11) { month = 0; year += 1 }
  } else {
    // quarterly: next quarter start
    const quarterStart = Math.floor(month / 3) * 3 + 3
    month = quarterStart % 12
    if (quarterStart >= 12) year += 1
  }

  const maxDay = new Date(year, month + 1, 0).getDate()
  const d      = new Date(year, month, Math.min(day, maxDay))
  return d.toISOString().slice(0, 10)
}
