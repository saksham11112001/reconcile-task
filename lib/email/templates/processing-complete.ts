import { baseTemplate } from './base'
import { sendEmail }    from '../index'

interface Params {
  to:            string
  recipientName: string
  reconName:     string
  reconId:       string
  orgName:       string
  totalMatched:  number
  totalMismatches: number
  openMismatches: number
  periodStart:   string
  periodEnd:     string
}

export async function sendProcessingComplete(p: Params) {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reconcile.sngadvisers.com'
  const reviewUrl = `${appUrl}/reconciliations/${p.reconId}/review`
  const reportUrl = `${appUrl}/reconciliations/${p.reconId}/report`

  const html = baseTemplate({
    title:    `Processing complete — ${p.reconName}`,
    preheader: `${p.totalMismatches} mismatch${p.totalMismatches !== 1 ? 'es' : ''} detected · ${p.totalMatched} entries matched`,
    body: `
      <h1>Processing complete</h1>
      <p>Hi ${p.recipientName},</p>
      <p>The reconciliation <strong>${p.reconName}</strong> for <strong>${p.orgName}</strong> has been processed.</p>

      <div class="kpi-row">
        <div class="kpi kpi-green">
          <div class="kpi-num">${p.totalMatched}</div>
          <div class="kpi-lbl">Matched</div>
        </div>
        <div class="kpi ${p.openMismatches > 0 ? 'kpi-red' : 'kpi-green'}">
          <div class="kpi-num">${p.openMismatches}</div>
          <div class="kpi-lbl">Open Issues</div>
        </div>
        <div class="kpi">
          <div class="kpi-num">${p.totalMismatches}</div>
          <div class="kpi-lbl">Total Mismatches</div>
        </div>
      </div>

      ${p.openMismatches > 0
        ? `<p>${p.openMismatches} mismatch${p.openMismatches !== 1 ? 'es need' : ' needs'} review.
           Click below to open the review queue.</p>
           <a href="${reviewUrl}" class="btn">Review Mismatches →</a>`
        : `<p>No open mismatches — this reconciliation looks clean.</p>
           <a href="${reportUrl}" class="btn">View Report →</a>`
      }

      <div class="meta">
        <div class="meta-row">
          <span class="meta-label">Reconciliation</span>
          <span class="meta-val">${p.reconName}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Period</span>
          <span class="meta-val">${p.periodStart} – ${p.periodEnd}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Organisation</span>
          <span class="meta-val">${p.orgName}</span>
        </div>
      </div>
    `,
  })

  return sendEmail({ to: p.to, subject: `Processing complete — ${p.reconName}`, html })
}
