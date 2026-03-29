import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM   = process.env.FROM_EMAIL ?? 'Reconcile <noreply@sngadvisers.com>'

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to:      string | string[]
  subject: string
  html:    string
}) {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_...') {
    console.log('[email] RESEND_API_KEY not set — skipping send to', to, '|', subject)
    return { id: 'dev-skipped' }
  }
  const { data, error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(`Resend error: ${error.message}`)
  return data
}
