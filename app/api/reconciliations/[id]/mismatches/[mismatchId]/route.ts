import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Audit helper ───────────────────────────────────────────────

async function logAudit(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string, reconId: string, decision: string,
  userId: string, userName: string | null,
) {
  await admin.from('audit_logs').insert({
    org_id:      orgId,
    entity_type: 'reconciliation',
    entity_id:   reconId,
    action:      `mismatch_${decision}`,
    actor_id:    userId,
    actor_name:  userName,
    meta:        { decision },
  }).then(null, () => {}) // non-blocking
}

interface Ctx { params: Promise<{ id: string; mismatchId: string }> }

// ─── PATCH /api/reconciliations/[id]/mismatches/[mismatchId] ──
//
// Updates review_status on the mismatch AND appends a decision log row.
//
// Body:
//   { decision: 'resolved'|'ignored'|'escalated'|'reopened', note?: string }
//
// Status transitions:
//   resolved  → review_status = 'resolved'
//   ignored   → review_status = 'ignored'
//   escalated → review_status = 'escalated'
//   reopened  → review_status = 'open'

const DECISION_TO_STATUS: Record<string, string> = {
  resolved:  'resolved',
  ignored:   'ignored',
  escalated: 'escalated',
  reopened:  'open',
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id, mismatchId } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Verify org membership
    const { data: mb } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()
    if (!mb) return NextResponse.json({ error: 'No org' }, { status: 403 })

    // Verify mismatch belongs to this recon and org
    const { data: mismatch } = await supabase
      .from('recon_mismatches')
      .select('id, org_id, reconciliation_id, review_status')
      .eq('id', mismatchId)
      .eq('reconciliation_id', id)
      .eq('org_id', mb.org_id)
      .maybeSingle()

    if (!mismatch) return NextResponse.json({ error: 'Mismatch not found.' }, { status: 404 })

    const body = await request.json()
    const { decision, note } = body

    const validDecisions = ['resolved', 'ignored', 'escalated', 'reopened']
    if (!validDecisions.includes(decision)) {
      return NextResponse.json(
        { error: `decision must be one of: ${validDecisions.join(', ')}` },
        { status: 400 }
      )
    }

    const newStatus = DECISION_TO_STATUS[decision]
    const admin     = createAdminClient()

    // 1. Update review_status on the mismatch
    const { data: updated, error: updateError } = await admin
      .from('recon_mismatches')
      .update({ review_status: newStatus })
      .eq('id', mismatchId)
      .select('id, review_status, mismatch_type, severity')
      .single()

    if (updateError) throw updateError

    // 2. Append decision log
    const { error: logError } = await admin
      .from('recon_mismatch_decisions')
      .insert({
        org_id:      mb.org_id,
        mismatch_id: mismatchId,
        decision,
        note:        note?.trim() || null,
        decided_by:  user.id,
      })

    if (logError) throw logError

    // 3. Re-sync open_mismatches counter on the reconciliation
    const { count: openCount } = await admin
      .from('recon_mismatches')
      .select('*', { count: 'exact', head: true })
      .eq('reconciliation_id', id)
      .eq('review_status', 'open')

    await admin
      .from('reconciliations')
      .update({ open_mismatches: openCount ?? 0 })
      .eq('id', id)

    // 4. Audit log (non-blocking)
    const { data: profile } = await supabase
      .from('users').select('name').eq('id', user.id).maybeSingle()
    await logAudit(admin, mb.org_id, id, decision, user.id,
      (profile as { name?: string } | null)?.name ?? null)

    return NextResponse.json({ mismatch: updated, open_mismatches: openCount ?? 0 })
  } catch (err) {
    console.error('[mismatch PATCH]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// ─── GET /api/reconciliations/[id]/mismatches/[mismatchId] ────
// Returns a single mismatch with its full decision history.

export async function GET(_req: Request, { params }: Ctx) {
  const { id, mismatchId } = await params
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

    const { data: mismatch, error } = await supabase
      .from('recon_mismatches')
      .select('*')
      .eq('id', mismatchId)
      .eq('reconciliation_id', id)
      .eq('org_id', mb.org_id)
      .maybeSingle()

    if (error)    throw error
    if (!mismatch) return NextResponse.json({ error: 'Mismatch not found.' }, { status: 404 })

    const { data: decisions } = await supabase
      .from('recon_mismatch_decisions')
      .select('id, decision, note, decided_by, decided_at')
      .eq('mismatch_id', mismatchId)
      .order('decided_at', { ascending: false })

    return NextResponse.json({ mismatch, decisions: decisions ?? [] })
  } catch (err) {
    console.error('[mismatch GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
