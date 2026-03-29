import { baseTemplate } from './base'
import { sendEmail }    from '../index'

interface Params {
  to:            string
  recipientName: string
  scheduleName:  string
  reconName:     string
  reconId:       string
  clientName:    string | null
  periodStart:   string
  periodEnd:     string
  orgName:       string
}

export async function sendAutoCreated(p: Params) {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reconcile.sngadvisers.com'
  const reconUrl = `${appUrl}/reconciliations/${p.reconId}`

  const html = baseTemplate({
    title:    `Auto-created: ${p.reconName}`,
    preheader: `A new reconciliation was auto-created for ${p.scheduleName}`,
    body: `
      <h1>Reconciliation auto-created</h1>
      <p>Hi ${p.recipientName},</p>
      <p>A new reconciliation has been automatically created for the recurring schedule
         <strong>${p.scheduleName}</strong>.</p>

      <div style="padding:18px 20px;background:#f0fdfa;border:1px solid #99f6e4;
        border-radius:10px;margin:20px 0;">
        <div style="font-size:16px;font-weight:700;color:#0f172a;margin-bottom:8px;">
          ${p.reconName}
        </div>
        ${p.clientName
          ? `<div style="font-size:13px;color:#475569;margin-bottom:4px;">Client: <strong>${p.clientName}</strong></div>`
          : ''}
        <div style="font-size:13px;color:#475569;">
          Period: <strong>${p.periodStart} – ${p.periodEnd}</strong>
        </div>
      </div>

      <p>Upload the bank statement and ledger to start processing.</p>
      <a href="${reconUrl}" class="btn">Open Reconciliation →</a>

      <div class="meta">
        <div class="meta-row">
          <span class="meta-label">Schedule</span>
          <span class="meta-val">${p.scheduleName}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Organisation</span>
          <span class="meta-val">${p.orgName}</span>
        </div>
      </div>
    `,
  })

  return sendEmail({ to: p.to, subject: `Auto-created: ${p.reconName}`, html })
}
