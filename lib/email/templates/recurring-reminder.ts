import { baseTemplate } from './base'
import { sendEmail }    from '../index'

interface Params {
  to:            string
  recipientName: string
  scheduleName:  string
  clientName:    string | null
  dueDate:       string
  frequency:     string
  daysUntilDue:  number
  orgName:       string
  schedulesUrl:  string
}

export async function sendRecurringReminder(p: Params) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reconcile.sngadvisers.com'
  const newUrl = `${appUrl}/reconciliations/new`

  const urgency = p.daysUntilDue <= 1
    ? `<span style="background:#fef2f2;color:#dc2626;padding:3px 8px;
        border-radius:4px;font-size:12px;font-weight:700;">DUE TOMORROW</span>`
    : p.daysUntilDue <= 3
    ? `<span style="background:#fffbeb;color:#d97706;padding:3px 8px;
        border-radius:4px;font-size:12px;font-weight:700;">DUE IN ${p.daysUntilDue} DAYS</span>`
    : `<span style="background:#f0fdf4;color:#16a34a;padding:3px 8px;
        border-radius:4px;font-size:12px;font-weight:700;">${p.daysUntilDue} DAYS LEFT</span>`

  const html = baseTemplate({
    title:    `Reminder: ${p.scheduleName} due ${p.dueDate}`,
    preheader: `Your ${p.frequency} reconciliation is due on ${p.dueDate}`,
    body: `
      <h1>Reconciliation due soon ${urgency}</h1>
      <p>Hi ${p.recipientName},</p>
      <p>A reminder that the following recurring reconciliation is coming up:</p>

      <div style="padding:18px 20px;background:#f0fdfa;border:1px solid #99f6e4;
        border-radius:10px;margin:20px 0;">
        <div style="font-size:17px;font-weight:700;color:#0f172a;margin-bottom:6px;">
          ${p.scheduleName}
        </div>
        ${p.clientName
          ? `<div style="font-size:13px;color:#475569;margin-bottom:4px;">Client: <strong>${p.clientName}</strong></div>`
          : ''}
        <div style="font-size:13px;color:#475569;margin-bottom:4px;">
          Due: <strong>${p.dueDate}</strong>
        </div>
        <div style="font-size:13px;color:#475569;">
          Frequency: <strong>${p.frequency}</strong>
        </div>
      </div>

      <p>Upload the bank statement and ledger for this period to start the reconciliation.</p>

      <a href="${newUrl}" class="btn">Create Reconciliation →</a>
      <br/>
      <a href="${p.schedulesUrl}" style="font-size:13px;color:#0d9488;text-decoration:none;">
        View all schedules
      </a>

      <div class="meta">
        <div class="meta-row">
          <span class="meta-label">Organisation</span>
          <span class="meta-val">${p.orgName}</span>
        </div>
      </div>
    `,
  })

  return sendEmail({
    to:      p.to,
    subject: `Reminder: ${p.scheduleName} due ${p.dueDate}`,
    html,
  })
}
