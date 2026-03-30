// Client-facing email wrapper — clean, professional HTML for external recipients.

export function clientBaseTemplate({
  title,
  preheader,
  body,
  orgName,
  unsubscribeNote,
}: {
  title:            string
  preheader:        string
  body:             string
  orgName:          string
  unsubscribeNote?: string
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://reconcile.sngadvisers.com'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
    .wrapper { max-width:580px; margin:32px auto; background:#fff; border-radius:12px;
      border:1px solid #e2e8f0; overflow:hidden; }
    .header { background:#0d9488; padding:24px 32px; }
    .header-logo { font-size:18px; font-weight:700; color:#fff; letter-spacing:-0.3px; }
    .header-sub  { font-size:12.5px; color:rgba(255,255,255,0.75); margin-top:2px; }
    .body { padding:32px; color:#334155; }
    .body h1 { margin:0 0 8px; font-size:20px; font-weight:700; color:#0f172a; }
    .body p  { margin:0 0 16px; font-size:14.5px; line-height:1.7; color:#475569; }
    .btn { display:inline-block; padding:12px 24px; background:#0d9488; color:#fff !important;
      border-radius:8px; text-decoration:none; font-size:14px; font-weight:600; margin:8px 0 20px; }
    .highlight-box { padding:18px 20px; background:#f0fdfa; border:1px solid #99f6e4;
      border-radius:10px; margin:20px 0; }
    .highlight-box .title { font-size:16px; font-weight:700; color:#0f172a; margin-bottom:6px; }
    .highlight-box .detail { font-size:13px; color:#475569; margin-bottom:4px; }
    .meta { margin-top:24px; padding-top:20px; border-top:1px solid #e2e8f0; }
    .meta-row { display:flex; justify-content:space-between; margin-bottom:8px; }
    .meta-label { font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; }
    .meta-val   { font-size:13px; color:#334155; font-weight:500; }
    .badge-urgent { display:inline-block; background:#fef2f2; color:#dc2626; padding:3px 8px;
      border-radius:4px; font-size:12px; font-weight:700; }
    .badge-warn  { display:inline-block; background:#fffbeb; color:#d97706; padding:3px 8px;
      border-radius:4px; font-size:12px; font-weight:700; }
    .footer { padding:20px 32px; background:#f8fafc; border-top:1px solid #e2e8f0;
      font-size:12px; color:#94a3b8; line-height:1.6; }
    .footer a { color:#0d9488; text-decoration:none; }
  </style>
</head>
<body>
  <!-- preheader -->
  <span style="display:none;font-size:1px;color:#fff;max-height:0;overflow:hidden;">${preheader}</span>

  <div class="wrapper">
    <div class="header">
      <div class="header-logo">Reconcile</div>
      <div class="header-sub">A message from ${orgName}</div>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      ${unsubscribeNote ?? `This email was sent on behalf of <strong>${orgName}</strong> via Reconcile.`}
      If you have questions, reply to this email or contact your CA firm directly.
    </div>
  </div>
</body>
</html>`
}
