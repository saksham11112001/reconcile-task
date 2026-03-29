import { NextResponse }      from 'next/server'
import { createClient }      from '@/lib/supabase/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { inngest }           from '@/lib/inngest/client'

interface Ctx { params: Promise<{ id: string }> }

async function getMemberAndRecon(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  reconId: string,
) {
  const { data: mb } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (!mb) return { mb: null, recon: null }

  const { data: recon } = await supabase
    .from('reconciliations')
    .select('id, org_id, job_status, status')
    .eq('id', reconId)
    .eq('org_id', mb.org_id)
    .maybeSingle()

  return { mb, recon }
}

// ─── GET /api/reconciliations/[id]/uploads ─────────────────────
// Returns the upload records for this reconciliation (max 2: bank + ledger)

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { mb, recon } = await getMemberAndRecon(supabase, user.id, id)
    if (!mb)    return NextResponse.json({ error: 'No org' },    { status: 403 })
    if (!recon) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('recon_uploads')
      .select('*')
      .eq('reconciliation_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[uploads GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// ─── POST /api/reconciliations/[id]/uploads ────────────────────
// Records a file upload and updates the job_status.
//
// Body: { file_type: 'bank_statement'|'ledger', file_name, file_size?, storage_path? }
//
// Job status transitions:
//   pending  → uploaded  (first file recorded)
//   uploaded → uploaded  (second file recorded — stays until both parsed)
//   After both files uploaded, job_status moves to 'ready' (or 'processing' if async)
// For now (no async worker): both files present → 'ready'

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const { mb, recon } = await getMemberAndRecon(supabase, user.id, id)
    if (!mb)    return NextResponse.json({ error: 'No org' },    { status: 403 })
    if (!recon) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (recon.status === 'completed') {
      return NextResponse.json({ error: 'Cannot add files to a completed reconciliation.' }, { status: 409 })
    }

    const body = await request.json()
    const { file_type, file_name, file_size, storage_path } = body

    if (!['bank_statement', 'ledger'].includes(file_type)) {
      return NextResponse.json({ error: 'file_type must be bank_statement or ledger.' }, { status: 400 })
    }
    if (!file_name?.trim()) {
      return NextResponse.json({ error: 'file_name is required.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Upsert upload record (one per file_type per recon — replacing previous upload)
    const { data: upload, error: uploadError } = await admin
      .from('recon_uploads')
      .upsert(
        {
          org_id:            recon.org_id,
          reconciliation_id: id,
          file_type,
          file_name:         file_name.trim(),
          file_size:         file_size ?? null,
          storage_path:      storage_path ?? null,
          uploaded_by:       user.id,
          // clear any previous parse state on re-upload
          row_count:         null,
          parsed_at:         null,
          parse_error:       null,
        },
        { onConflict: 'reconciliation_id,file_type' }
      )
      .select()
      .single()

    if (uploadError) throw uploadError

    // Re-check how many files are now uploaded
    const { data: uploads } = await admin
      .from('recon_uploads')
      .select('file_type')
      .eq('reconciliation_id', id)

    const uploadedTypes = (uploads ?? []).map((u: { file_type: string }) => u.file_type)
    const bothUploaded  = uploadedTypes.includes('bank_statement') && uploadedTypes.includes('ledger')

    // Determine new job_status
    // Both files present → kick off async processing via Inngest
    // Keep 'failed' sticky unless re-upload clears it
    let newJobStatus: string
    if (recon.job_status === 'failed') {
      newJobStatus = 'uploaded'  // re-upload clears the failure state
    } else if (bothUploaded) {
      newJobStatus = 'uploaded'  // will transition to 'processing' when Inngest picks it up
    } else {
      newJobStatus = 'uploaded'
    }

    await admin
      .from('reconciliations')
      .update({ job_status: newJobStatus, job_error: null })
      .eq('id', id)

    // Fire Inngest event when both files are ready
    if (bothUploaded) {
      await inngest.send({
        name: 'reconciliation/files.ready',
        data: {
          reconciliation_id: id,
          org_id:            recon.org_id,
        },
      })
    }

    return NextResponse.json({ upload, job_status: newJobStatus }, { status: 201 })
  } catch (err) {
    console.error('[uploads POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
