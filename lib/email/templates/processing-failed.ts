import { baseTemplate } from './base'
import { sendEmail }    from '../index'

interface Params {
  to:            string
  recipientName: string
  reconName:     string
  reconId:       string
  orgName:       string
  errorMessage:  string
}

export async function sendProcessingFailed(p: Params) {
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reconcile.sngadvisers.com'
  const reconUrl = `${appUrl}/reconciliations/${p.reconId}`

  const html = baseTemplate({
    title:    `Processing failed — ${p.reconName}`,
    preheader: `Action needed: file processing failed for ${p.reconName}`,
    body: `
      <h1>Processing failed</h1>
      <p>Hi ${p.recipientName},</p>
      <p>The reconciliation <strong>${p.reconName}</strong> could not be processed.</p>

      <div style="padding:14px 16px;background:#fef2f2;border:1px solid #fecaca;
        border-radius:8px;margin:16px 0;">
        <div style="font-size:12px;font-weight:700;color:#dc2626;
          text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">
          Error
        </div>
        <div style="font-size:13.5px;color:#7f1d1d;font-family:monospace;
          word-break:break-all;">
          ${p.errorMessage}
        </div>
      </div>

      <p>Please check your file formats and re-upload. Reconcile supports CSV and Excel (.xlsx) files.
         Make sure column headers are present and the date format is consistent.</p>

      <a href="${reconUrl}" class="btn">Re-upload Files →</a>

      <div class="meta">
        <div class="meta-row">
          <span class="meta-label">Reconciliation</span>
          <span class="meta-val">${p.reconName}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Organisation</span>
          <span class="meta-val">${p.orgName}</span>
        </div>
      </div>
    `,
  })

  return sendEmail({ to: p.to, subject: `Action needed: processing failed — ${p.reconName}`, html })
}
