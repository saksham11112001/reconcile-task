// Cron: runs daily at 08:30 IST (03:00 UTC)
// Sends reminder emails to clients whose doc requests are overdue or due within 2 days.
// Also flips status to 'overdue' for any past-due 'requested'/'pending' rows.

import { inngest }                from '../client'
import { createAdminClient }      from '@/lib/supabase/admin'
import { sendClientDocReminder }  from '@/lib/email/templates/client-doc-reminder'

export const docRequestOverdueCheck = inngest.createFunction(
  {
    id:       'doc-request-overdue-check',
    name:     'Doc Request Overdue Check',
    triggers: [{ cron: '0 3 * * *' }],   // 03:00 UTC = 08:30 IST
  },
  async ({ step }: { step: any }) => {
    const admin   = createAdminClient()
    const todayStr = new Date().toISOString().slice(0, 10)

    // ── Step 1: mark overdue ─────────────────────────────────────
    await step.run('mark-overdue', async () => {
      await admin
        .from('doc_requests')
        .update({ status: 'overdue', updated_at: new Date().toISOString() })
        .in('status', ['requested', 'pending'])
        .not('due_date', 'is', null)
        .lt('due_date', todayStr)
    })

    // ── Step 2: fetch requests due within 2 days OR already overdue ──
    const { requests, orgMap, clientMap, reconMap } = await step.run('fetch-due-requests', async () => {
      const twoDaysOut = new Date()
      twoDaysOut.setDate(twoDaysOut.getDate() + 2)
      const twoDaysStr = twoDaysOut.toISOString().slice(0, 10)

      // Requests that are overdue OR due soon (within 2 days)
      const { data: requests } = await admin
        .from('doc_requests')
        .select('id, org_id, client_id, reconciliation_id, title, description, due_date, status')
        .in('status', ['overdue', 'requested', 'pending'])
        .not('client_id', 'is', null)
        .or(`status.eq.overdue,and(due_date.lte.${twoDaysStr},due_date.gte.${todayStr})`)

      const rows = requests ?? []

      // Collect IDs for batch lookups
      const orgIds    = [...new Set(rows.map((r: { org_id: string }) => r.org_id))]
      const clientIds = [...new Set(rows.map((r: { client_id: string }) => r.client_id).filter(Boolean))]
      const reconIds  = [...new Set(rows.map((r: { reconciliation_id?: string | null }) => r.reconciliation_id).filter(Boolean))]

      const [{ data: orgs }, { data: clients }, { data: recons }] = await Promise.all([
        admin.from('organisations').select('id, name').in('id', orgIds),
        admin.from('clients').select('id, name, email, contact_person').in('id', clientIds),
        reconIds.length > 0
          ? admin.from('reconciliations').select('id, name').in('id', reconIds)
          : Promise.resolve({ data: [] }),
      ])

      const orgMap: Record<string, string> = {}
      ;(orgs ?? []).forEach((o: { id: string; name: string }) => { orgMap[o.id] = o.name })

      const clientMap: Record<string, { name: string; email: string | null; contact_person: string | null }> = {}
      ;(clients ?? []).forEach((c: { id: string; name: string; email: string | null; contact_person: string | null }) => {
        clientMap[c.id] = { name: c.name, email: c.email, contact_person: c.contact_person }
      })

      const reconMap: Record<string, string> = {}
      ;((recons ?? []) as { id: string; name: string }[]).forEach(r => { reconMap[r.id] = r.name })

      return { requests: rows, orgMap, clientMap, reconMap }
    })

    const results = { reminded: 0, skipped: 0, errors: [] as string[] }

    for (const dr of requests) {
      await step.run(`remind-${dr.id}`, async () => {
        const client = clientMap[dr.client_id]
        if (!client?.email) { results.skipped++; return }

        const orgName    = orgMap[dr.org_id] ?? 'Your CA firm'
        const clientName = client.contact_person || client.name || 'there'
        const isOverdue  = dr.status === 'overdue'
        const fmtDue     = dr.due_date
          ? new Date(dr.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : null
        const reconName  = dr.reconciliation_id ? (reconMap[dr.reconciliation_id] ?? null) : null

        await sendClientDocReminder({
          to:           client.email,
          clientName,
          orgName,
          requestTitle: dr.title,
          description:  dr.description ?? null,
          dueDate:      fmtDue,
          isOverdue,
          reconName,
          requestId:    dr.id,
        }).catch(err => results.errors.push(`remind ${dr.id}: ${err}`))

        results.reminded++
      })
    }

    return results
  }
)
