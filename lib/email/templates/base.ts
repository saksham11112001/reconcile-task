// Shared email wrapper — generates clean HTML for all Reconcile emails.

export function baseTemplate({
  title,
  preheader,
  body,
}: {
  title:    string
  preheader: string
  body:     string
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
    .header-logo span { opacity:0.7; font-weight:400; }
    .body { padding:32px; color:#334155; }
    .body h1 { margin:0 0 8px; font-size:20px; font-weight:700; color:#0f172a; }
    .body p  { margin:0 0 16px; font-size:14.5px; line-height:1.7; color:#475569; }
    .btn { display:inline-block; padding:12px 24px; background:#0d9488; color:#fff !important;
      border-radius:8px; text-decoration:none; font-size:14px; font-weight:600; margin:8px 0 20px; }
    .meta { margin-top:24px; padding-top:20px; border-top:1px solid #e2e8f0; }
    .meta-row { display:flex; justify-content:space-between; margin-bottom:8px; }
    .meta-label { font-size:12px; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; }
    .meta-val   { font-size:13px; color:#334155; font-weight:500; }
    .kpi-row { display:flex; gap:12px; margin:20px 0; }
    .kpi { flex:1; padding:14px 16px; background:#f8fafc; border:1px solid #e2e8f0;
      border-radius:8px; text-align:center; }
    .kpi-num { font-size:24px; font-weight:700; color:#0d9488; line-height:1; }
    .kpi-lbl { font-size:11px; color:#94a3b8; margin-top:4px; text-transform:uppercase; letter-spacing:0.05em; }
    .kpi-red .kpi-num { color:#dc2626; }
    .kpi-amber .kpi-num { color:#d97706; }
    .kpi-green .kpi-num { color:#16a34a; }
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
      <div class="header-logo">Reconcile <span>by SNG Advisers</span></div>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      You're receiving this because you're a member of your organisation on Reconcile.
      <a href="${appUrl}/settings/organisation">Manage notifications</a> ·
      <a href="${appUrl}">Open Reconcile</a>
    </div>
  </div>
</body>
</html>`
}
