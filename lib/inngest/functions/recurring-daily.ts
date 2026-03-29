import { inngest }             from '../client'
import { createAdminClient }   from '@/lib/supabase/admin'
import { sendRecurringReminder } from '@/lib/email/templates/recurring-reminder'
import { sendAutoCreated }       from '@/lib/email/templates/auto-created'

// ─── Cron: runs every day at 08:00 IST (02:30 UTC) ───────────────
// 1. Send reminders for schedules due within `remind_days`
// 2. Auto-create reconciliation records for schedules with auto_create=true
//    whose next_due_date is today or overdue
// 3. Advance next_due_date for any schedule that just triggered

export const recurringDailyCheck = inngest.createFunction(
  {
    id:       'recurring-daily-check',
    name:     'Recurring Schedules Daily Check',
    triggers: [{ cron: '30 2 * * *' }],   // 02:30 UTC = 08:00 IST
  },
  async ({ step }: { step: any }) => {
    const admin = createAdminClient()
    const today = new Date()
    const todayStr = today.toISOString().slice(0, 10)

    // ── Fetch all active schedules ─────────────────────────────
    const { schedules, orgMap, clientMap, orgMembersMap } = await step.run('fetch-schedules', async () => {
      const { data: schedules } = await admin
        .from('recurring_recons')
        .select('*')
        .eq('status', 'active')
        .not('next_due_date', 'is', null)

      // Collect unique org IDs
      const orgIds = [...new Set((schedules ?? []).map((s: { org_id: string }) => s.org_id))]

      // Fetch org names + owner/admin emails in one go
      const [{ data: orgs }, { data: members }, { data: clients }] = await Promise.all([
        admin.from('organisations').select('id, name').in('id', orgIds),
        admin.from('org_members')
          .select('org_id, role, users(name, email)')
          .in('org_id', orgIds)
          .eq('is_active', true)
          .in('role', ['owner', 'admin', 'reviewer']),
        admin.from('clients').select('id, name').in('org_id', orgIds),
      ])

      // Build lookup maps
      const orgMap: Record<string, string> = {}
      ;(orgs ?? []).forEach((o: { id: string; name: string }) => { orgMap[o.id] = o.name })

      const clientMap: Record<string, string> = {}
      ;(clients ?? []).forEach((c: { id: string; name: string }) => { clientMap[c.id] = c.name })

      // Org → list of {email, name}
      const orgMembersMap: Record<string, { name: string; email: string }[]> = {}
      ;(members ?? []).forEach((m: { org_id: string; users: unknown }) => {
        const u = m.users as { name?: string; email?: string } | null
        if (!u?.email) return
        if (!orgMembersMap[m.org_id]) orgMembersMap[m.org_id] = []
        orgMembersMap[m.org_id].push({ name: u.name ?? 'there', email: u.email })
      })

      return { schedules: schedules ?? [], orgMap, clientMap, orgMembersMap }
    })

    const results = {
      reminders:    0,
      autoCreated:  0,
      errors:       [] as string[],
    }

    for (const s of schedules) {
      const dueDate    = new Date(s.next_due_date)
      const dueDateStr = s.next_due_date as string
      const daysUntil  = Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000)

      // ── Send reminder ────────────────────────────────────────
      if (daysUntil >= 0 && daysUntil <= (s.remind_days ?? 3)) {
        await step.run(`reminder-${s.id}`, async () => {
          const orgName    = orgMap[s.org_id]   ?? s.org_id
          const clientName = s.client_id ? (clientMap[s.client_id] ?? null) : null
          const appUrl     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reconcile.sngadvisers.com'
          const schedulesUrl = `${appUrl}/reconciliations/schedules`

          // Notify assignee or all reviewers
          const recipients = getRecipients(s, orgMembersMap, s.org_id)

          for (const r of recipients) {
            await sendRecurringReminder({
              to:            r.email,
              recipientName: r.name,
              scheduleName:  s.name,
              clientName,
              dueDate:       formatDate(dueDateStr),
              frequency:     capitalize(s.frequency),
              daysUntilDue:  daysUntil,
              orgName,
              schedulesUrl,
            }).catch(err => results.errors.push(`reminder ${s.id}: ${err}`))
          }
          results.reminders++
        })
      }

      // ── Auto-create ──────────────────────────────────────────
      if (s.auto_create && dueDateStr <= todayStr) {
        await step.run(`auto-create-${s.id}`, async () => {
          try {
            const { periodStart, periodEnd } = computePeriod(s.frequency, dueDate)
            const reconName = `${s.name} — ${formatMonthYear(dueDate)}`

            const { data: newRecon, error } = await admin
              .from('reconciliations')
              .insert({
                org_id:      s.org_id,
                client_id:   s.client_id ?? null,
                name:        reconName,
                period_start: periodStart,
                period_end:   periodEnd,
                status:       'draft',
                job_status:   'pending',
                created_by:   null,
              })
              .select('id, name')
              .single()

            if (error) throw error

            // Advance next_due_date
            const nextDue = advanceDueDate(s.frequency, dueDate, s.day_of_month)
            await admin
              .from('recurring_recons')
              .update({ next_due_date: nextDue, last_created_at: todayStr })
              .eq('id', s.id)

            // Notify
            const orgName    = orgMap[s.org_id]   ?? s.org_id
            const clientName = s.client_id ? (clientMap[s.client_id] ?? null) : null
            const recipients = getRecipients(s, orgMembersMap, s.org_id)

            for (const r of recipients) {
              await sendAutoCreated({
                to:            r.email,
                recipientName: r.name,
                scheduleName:  s.name,
                reconName,
                reconId:       newRecon!.id,
                clientName,
                periodStart,
                periodEnd,
                orgName,
              }).catch(console.error)
            }

            results.autoCreated++
          } catch (e) {
            results.errors.push(`auto-create ${s.id}: ${String(e)}`)
          }
        })
      }
    }

    return results
  }
)

function getRecipients(
  s: { assigned_to?: string | null; org_id: string },
  map: Record<string, { name: string; email: string }[]>,
  orgId: string,
): { name: string; email: string }[] {
  // If assigned_to is set, only that user — but we don't have their email easily here
  // Fall back to all reviewers/admins for the org
  return map[orgId] ?? []
}

// ─── Date helpers ──────────────────────────────────────────────

function computePeriod(
  frequency: string,
  dueDate:   Date,
): { periodStart: string; periodEnd: string } {
  if (frequency === 'monthly') {
    // Period = prior calendar month
    const y = dueDate.getFullYear()
    const m = dueDate.getMonth() // 0-based
    const prevMonth = m === 0 ? 11 : m - 1
    const prevYear  = m === 0 ? y - 1 : y
    const start = new Date(prevYear, prevMonth, 1)
    const end   = new Date(prevYear, prevMonth + 1, 0)
    return { periodStart: fmt(start), periodEnd: fmt(end) }
  } else {
    // Quarterly — prior quarter
    const q = Math.floor(dueDate.getMonth() / 3)
    const prevQ = q === 0 ? 3 : q - 1
    const prevY = q === 0 ? dueDate.getFullYear() - 1 : dueDate.getFullYear()
    const start = new Date(prevY, prevQ * 3, 1)
    const end   = new Date(prevY, prevQ * 3 + 3, 0)
    return { periodStart: fmt(start), periodEnd: fmt(end) }
  }
}

function advanceDueDate(frequency: string, current: Date, dayOfMonth: number): string {
  const y = current.getFullYear()
  const m = current.getMonth()
  let nextYear  = y
  let nextMonth = m + (frequency === 'monthly' ? 1 : 3)
  if (nextMonth > 11) { nextMonth -= 12; nextYear += 1 }
  const maxDay = new Date(nextYear, nextMonth + 1, 0).getDate()
  const d = new Date(nextYear, nextMonth, Math.min(dayOfMonth, maxDay))
  return fmt(d)
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDate(s: string): string {
  const d = new Date(s)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
