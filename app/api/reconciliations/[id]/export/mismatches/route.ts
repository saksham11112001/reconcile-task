import { createClient } from '@/lib/supabase/server'
import { NextRequest }   from 'next/server'

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) return new Response('Forbidden', { status: 403 })

  // Verify this reconciliation belongs to the org
  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id, name')
    .eq('id', id)
    .eq('org_id', mb.org_id)
    .maybeSingle()
  if (!recon) return new Response('Not found', { status: 404 })

  const { data: rows } = await supabase
    .from('recon_mismatches')
    .select('id, mismatch_type, severity, review_status, description, diff_data, detected_at, created_at')
    .eq('reconciliation_id', id)
    .order('severity',    { ascending: false })
    .order('detected_at', { ascending: true  })
    .limit(10000)

  const csv = toCSV(
    (rows ?? []).map(m => ({
      id:             m.id,
      mismatch_type:  m.mismatch_type,
      severity:       m.severity,
      review_status:  m.review_status,
      description:    m.description ?? '',
      diff_data:      m.diff_data ? JSON.stringify(m.diff_data) : '',
      detected_at:    m.detected_at,
      created_at:     m.created_at,
    }))
  )

  const filename = `mismatches_${recon.name.replace(/[^a-z0-9]/gi, '_')}_${dateSuffix()}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// ─── Helpers ───────────────────────────────────────────────────

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape  = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n')
}

function dateSuffix() {
  return new Date().toISOString().slice(0, 10)
}
