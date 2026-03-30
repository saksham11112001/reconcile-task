// Sent as a manual or automated follow-up when a doc request is still pending/overdue.

import { clientBaseTemplate } from './client-base'
import { sendEmail }          from '../index'

interface Params {
  to:            string
  clientName:    string
  orgName:       string
  requestTitle:  string
  description:   string | null
  dueDate:       string | null  // formatted date string
  isOverdue:     boolean
  reconName:     string | null
  requestId:     string
}

export async function sendClientDocReminder(p: Params) {
  const urgencyBadge = p.isOverdue
    ? `<span class="badge-urgent">OVERDUE</span>`
    : p.dueDate
    ? `<span class="badge-warn">Due: ${p.dueDate}</span>`
    : ''

  const subjectPrefix = p.isOverdue ? '[OVERDUE]' : '[Reminder]'

  const html = clientBaseTemplate({
    title:    `${p.isOverdue ? 'Overdue' : 'Reminder'}: ${p.requestTitle}`,
    preheader: `${p.orgName} is still waiting for: ${p.requestTitle}${p.isOverdue ? ' — this is overdue' : ''}`,
    orgName:  p.orgName,
    body: `
      <h1>Document still needed ${urgencyBadge}</h1>
      <p>Hi ${p.clientName},</p>
      <p>This is a${p.isOverdue ? 'n overdue' : ''} reminder that <strong>${p.orgName}</strong>
         is still waiting for the following document from you:</p>

      <div class="highlight-box"
        style="${p.isOverdue ? 'background:#fef2f2;border-color:#fecaca;' : ''}">
        <div class="title">${p.requestTitle}</div>
        ${p.description
          ? `<div class="detail" style="margin-top:8px;color:#334155;">${p.description}</div>`
          : ''}
        ${p.reconName
          ? `<div class="detail" style="margin-top:8px;">Related to: <strong>${p.reconName}</strong></div>`
          : ''}
        ${p.dueDate
          ? `<div class="detail" style="margin-top:8px;${p.isOverdue ? 'color:#dc2626;font-weight:600;' : ''}">
               ${p.isOverdue ? 'Was due:' : 'Due:'} <strong>${p.dueDate}</strong>
             </div>`
          : ''}
      </div>

      <p>Please send this at your earliest convenience by replying to this email or
         contacting your CA at <strong>${p.orgName}</strong>.</p>

      <p style="font-size:13px;color:#94a3b8;margin-top:24px;">
        Reference ID: <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">${p.requestId.slice(0, 8).toUpperCase()}</code>
      </p>
    `,
  })

  return sendEmail({
    to:      p.to,
    subject: `${subjectPrefix} [${p.orgName}] ${p.requestTitle}`,
    html,
  })
}
