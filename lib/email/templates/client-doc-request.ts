// Sent to the client when a new document request is raised for them.

import { clientBaseTemplate } from './client-base'
import { sendEmail }          from '../index'

interface Params {
  to:            string
  clientName:    string        // contact person name or fallback to company name
  orgName:       string        // the CA firm
  requestTitle:  string
  description:   string | null
  dueDate:       string | null // formatted date string
  reconName:     string | null // linked reconciliation, if any
  requestId:     string        // doc_request.id — for tracking
}

export async function sendClientDocRequest(p: Params) {
  const dueBadge = p.dueDate
    ? `<span class="badge-warn">Due: ${p.dueDate}</span>`
    : ''

  const html = clientBaseTemplate({
    title:    `Document requested — ${p.requestTitle}`,
    preheader: `${p.orgName} has requested a document from you${p.dueDate ? ` · Due ${p.dueDate}` : ''}`,
    orgName:  p.orgName,
    body: `
      <h1>Document requested ${dueBadge}</h1>
      <p>Hi ${p.clientName},</p>
      <p><strong>${p.orgName}</strong> has requested the following document from you:</p>

      <div class="highlight-box">
        <div class="title">${p.requestTitle}</div>
        ${p.description
          ? `<div class="detail" style="margin-top:8px;color:#334155;">${p.description}</div>`
          : ''}
        ${p.reconName
          ? `<div class="detail" style="margin-top:8px;">Related to: <strong>${p.reconName}</strong></div>`
          : ''}
        ${p.dueDate
          ? `<div class="detail" style="margin-top:8px;">Please provide this by: <strong>${p.dueDate}</strong></div>`
          : ''}
      </div>

      <p>Please send the requested document by replying to this email or by sharing it
         with your contact at <strong>${p.orgName}</strong>.</p>

      <p style="font-size:13px;color:#94a3b8;margin-top:24px;">
        Reference ID: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${p.requestId.slice(0, 8).toUpperCase()}</code>
      </p>
    `,
  })

  return sendEmail({
    to:      p.to,
    subject: `[${p.orgName}] Document requested: ${p.requestTitle}`,
    html,
  })
}
