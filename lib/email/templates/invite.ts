import { baseTemplate } from './base'
import { sendEmail }    from '../index'

interface Params {
  to:          string
  inviteeName: string
  inviterName: string
  orgName:     string
  role:        string
  inviteUrl:   string
}

const ROLE_LABELS: Record<string, string> = {
  admin:    'Admin',
  reviewer: 'Reviewer',
  analyst:  'Analyst',
  viewer:   'Viewer',
}

export async function sendInvite(p: Params) {
  const roleLabel = ROLE_LABELS[p.role] ?? p.role

  const html = baseTemplate({
    title:    `You've been invited to ${p.orgName} on Reconcile`,
    preheader: `${p.inviterName} has invited you to join ${p.orgName}`,
    body: `
      <h1>You've been invited</h1>
      <p>Hi${p.inviteeName ? ` ${p.inviteeName}` : ''},</p>
      <p><strong>${p.inviterName}</strong> has invited you to join
         <strong>${p.orgName}</strong> on Reconcile as a <strong>${roleLabel}</strong>.</p>

      <p>Reconcile is a reconciliation workflow platform for CA firms and finance teams.
         You'll be able to review mismatches, manage reconciliations, and collaborate with your team.</p>

      <a href="${p.inviteUrl}" class="btn">Accept Invitation →</a>

      <p style="font-size:13px;color:#94a3b8;margin-top:24px;">
        This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
      </p>
    `,
  })

  return sendEmail({
    to:      p.to,
    subject: `You've been invited to ${p.orgName} on Reconcile`,
    html,
  })
}
