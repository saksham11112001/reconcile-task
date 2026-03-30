// Sent to a client when a reconciliation is awaiting their file uploads.

import { clientBaseTemplate } from './client-base'
import { sendEmail }          from '../index'

interface Params {
  to:           string
  clientName:   string
  orgName:      string
  reconName:    string
  periodStart:  string   // formatted
  periodEnd:    string   // formatted
  note:         string | null   // optional custom message from the CA
  reconId:      string
}

export async function sendClientUploadReminder(p: Params) {
  const html = clientBaseTemplate({
    title:    `Files needed — ${p.reconName}`,
    preheader: `${p.orgName} needs your bank statement and ledger for ${p.periodStart} – ${p.periodEnd}`,
    orgName:  p.orgName,
    body: `
      <h1>Files needed for reconciliation</h1>
      <p>Hi ${p.clientName},</p>
      <p><strong>${p.orgName}</strong> is preparing the reconciliation for the period
         <strong>${p.periodStart} – ${p.periodEnd}</strong> and needs the following files from you:</p>

      <div class="highlight-box">
        <div class="title">${p.reconName}</div>
        <div class="detail" style="margin-top:8px;">
          Period: <strong>${p.periodStart} – ${p.periodEnd}</strong>
        </div>
        <div style="margin-top:14px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#0d9488;display:inline-block;flex-shrink:0;"></span>
            <span style="font-size:13px;color:#334155;">Bank statement for the period</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#0d9488;display:inline-block;flex-shrink:0;"></span>
            <span style="font-size:13px;color:#334155;">Ledger / books export for the period</span>
          </div>
        </div>
      </div>

      ${p.note
        ? `<div style="padding:14px 18px;background:#f8fafc;border-left:3px solid #0d9488;
              border-radius:0 8px 8px 0;margin:20px 0;">
             <div style="font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;
               letter-spacing:0.05em;margin-bottom:6px;">Note from your CA</div>
             <p style="margin:0;font-size:14px;color:#334155;">${p.note}</p>
           </div>`
        : ''}

      <p>Please share the files as CSV or Excel exports. If you need any help with the format,
         contact your CA at <strong>${p.orgName}</strong>.</p>

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
          <span class="meta-label">Requested by</span>
          <span class="meta-val">${p.orgName}</span>
        </div>
      </div>
    `,
  })

  return sendEmail({
    to:      p.to,
    subject: `[${p.orgName}] Files needed: ${p.reconName} (${p.periodStart} – ${p.periodEnd})`,
    html,
  })
}
