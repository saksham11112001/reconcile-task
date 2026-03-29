import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/api'

// PATCH /api/profile
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await request.json()
    const patch: Record<string, unknown> = {}
    if (body.name)       patch.name       = String(body.name).trim()
    if (body.avatar_url) patch.avatar_url = String(body.avatar_url)

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    console.error('[profile PATCH]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
