import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { GitCompare }   from 'lucide-react'

export default async function LandingPage() {
  // Redirect already-logged-in users straight to the app
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect('/dashboard')
  } catch {}

  // ─── Design tokens ───────────────────────────────────────────
  const F = '#f97316'   // orange — primary CTA
  const T = '#0d9488'   // teal — brand accent
  const D = '#0f172a'   // dark text
  const M = '#64748b'   // muted text
  const S = '#f8fafc'   // subtle surface
  const W = '#ffffff'

  const primaryCTA: React.CSSProperties = {
    background: F, color: W,
    padding: '13px 28px', borderRadius: 10,
    fontSize: 15, fontWeight: 700, textDecoration: 'none',
    boxShadow: '0 4px 20px rgba(249,115,22,0.38)',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    whiteSpace: 'nowrap', letterSpacing: '-0.2px',
  }

  const outlineCTA: React.CSSProperties = {
    background: W, color: '#374151',
    padding: '13px 24px', borderRadius: 10,
    fontSize: 15, fontWeight: 600, textDecoration: 'none',
    border: '1.5px solid #e2e8f0', display: 'inline-flex',
    alignItems: 'center', gap: 6,
  }

  // ─── Content data ─────────────────────────────────────────────

  const coreFeatures = [
    {
      badge: 'Zero manual work',
      badgeBg: '#fff7ed', badgeColor: F, badgeBorder: '#fed7aa',
      title: 'Upload once. Mismatches found instantly.',
      desc: 'Drop your bank statement and ledger in any format — CSV or Excel. Reconcile parses both and automatically flags every discrepancy across 7 mismatch categories.',
      cardBg: '#fff7ed', cardBorder: '#fed7aa', shadowColor: F,
      visual: 'upload',
    },
    {
      badge: 'Structured review',
      badgeBg: '#f0fdfa', badgeColor: T, badgeBorder: '#99f6e4',
      title: 'Review queue built for CA workflows.',
      desc: 'Every mismatch lands in a structured queue. Filter by status, type, or severity. Resolve, ignore, or escalate each item — with a mandatory note for audit trail.',
      cardBg: '#f0fdfa', cardBorder: '#99f6e4', shadowColor: T,
      visual: 'queue',
    },
    {
      badge: 'Audit-ready exports',
      badgeBg: '#faf5ff', badgeColor: '#7c3aed', badgeBorder: '#ddd6fe',
      title: 'One-click reports your clients trust.',
      desc: 'Export a clean reconciliation summary or the full mismatch list as CSV. Every decision is timestamped and attributed. Your clients get a report, not a spreadsheet.',
      cardBg: '#faf5ff', cardBorder: '#ddd6fe', shadowColor: '#7c3aed',
      visual: 'report',
    },
  ]

  const steps = [
    { n: '01', icon: '📂', title: 'Upload your files', desc: 'Bank statement and ledger — CSV or Excel. No template needed.' },
    { n: '02', icon: '🔍', title: 'Review mismatches', desc: 'Auto-detected discrepancies appear in a structured queue, sorted by severity.' },
    { n: '03', icon: '✅', title: 'Resolve & export', desc: 'Mark each item resolved, ignored, or escalated. Download the final report.' },
  ]

  const mismatchTypes = [
    { label: 'Amount Mismatch',    bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
    { label: 'Missing in Bank',    bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    { label: 'Missing in Ledger',  bg: '#fdf4ff', color: '#7c3aed', border: '#e9d5ff' },
    { label: 'Date Mismatch',      bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    { label: 'Duplicate Entry',    bg: '#fff1f2', color: '#be123c', border: '#fecdd3' },
    { label: 'Tax Mismatch',       bg: '#fefce8', color: '#a16207', border: '#fef08a' },
    { label: 'GSTIN Mismatch',     bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  ]

  const forWhom = [
    { icon: '🏛️', title: 'CA & Accounting Firms', desc: 'Month-end bank reco for all your clients in one place. Deliver audit-ready reports, not raw spreadsheets.' },
    { icon: '💼', title: 'Finance Controllers',    desc: 'Track every discrepancy with a full decision audit trail. No more "I thought Priya fixed that."' },
    { icon: '🏢', title: 'CFOs & Founders',        desc: 'Know exactly which accounts are clean and which have open items — before your auditors ask.' },
    { icon: '📐', title: 'Audit Teams',            desc: 'Pre-reconciled data with timestamped decisions. Cut fieldwork time dramatically.' },
  ]

  const securityItems = [
    { icon: '🔐', title: 'End-to-end encryption',   desc: 'TLS 1.3 in transit, AES-256 at rest. Your financial data stays locked.' },
    { icon: '🏢', title: 'Org-isolated data',        desc: 'Row-level security ensures your data is never accessible by another org.' },
    { icon: '📋', title: 'Full decision audit log',  desc: 'Every resolve/escalate/ignore is timestamped and attributed. Court-ready trail.' },
    { icon: '🗑️', title: 'Your data, your control', desc: 'Export or delete everything at any time. Zero lock-in, ever.' },
    { icon: '👥', title: 'Role-based access',        desc: 'Owner, admin, member — granular permissions per team member.' },
    { icon: '🇮🇳', title: 'Made for India',          desc: 'GST, TDS, GSTIN reconciliation built-in. INR-first, not an afterthought.' },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: W, colorScheme: 'light',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      overflowX: 'hidden', color: D,
    }}>

      {/* ─── STICKY NAV ─────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center',
        padding: '0 5%', height: 64, gap: 24,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: D, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: T,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitCompare style={{ width: 17, height: 17, color: W }}/>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>Reconcile</span>
        </Link>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 32 }}>
          {[['How it works', '#how-it-works'], ['Features', '#features'], ['Who it\'s for', '#for-whom']].map(([label, href]) => (
            <a key={label} href={href} style={{ color: M, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
              {label}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Link href="/login" style={{ color: M, fontSize: 14, textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
          <Link href="/login" style={{ ...primaryCTA, padding: '9px 22px', fontSize: 14, boxShadow: '0 3px 14px rgba(249,115,22,0.35)' }}>
            Get started free →
          </Link>
        </div>
      </nav>

      {/* ─── HERO ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '76px 5% 56px',
        display: 'flex', alignItems: 'center', gap: 60, flexWrap: 'wrap' }}>

        {/* Left copy */}
        <div style={{ flex: '1 1 360px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#fff7ed', border: '1px solid #fed7aa',
            borderRadius: 99, padding: '5px 14px', marginBottom: 24,
          }}>
            <span style={{ fontSize: 13 }}>🇮🇳</span>
            <span style={{ color: '#c2410c', fontSize: 12, fontWeight: 700 }}>
              Built for CA firms · GST & GSTIN aware · INR-first
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 900,
            lineHeight: 1.06, letterSpacing: '-2.5px', margin: '0 0 20px',
          }}>
            Bank reconciliation<br />
            that takes <span style={{ color: F }}>minutes,</span><br />
            not days.
          </h1>

          <p style={{ fontSize: 17, color: M, lineHeight: 1.78, marginBottom: 32, maxWidth: 460 }}>
            Upload your bank statement and ledger. Reconcile auto-detects every mismatch,
            gives your team a structured review queue, and exports audit-ready reports — in one workflow.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
            <Link href="/login" style={{ ...primaryCTA, padding: '15px 32px', fontSize: 16, boxShadow: '0 6px 24px rgba(249,115,22,0.42)' }}>
              Start reconciling free →
            </Link>
            <a href="#how-it-works" style={{ ...outlineCTA, padding: '15px 22px', fontSize: 15 }}>
              See how it works
            </a>
          </div>

          <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 32px', lineHeight: 1.6 }}>
            ✓ No credit card &nbsp;·&nbsp; ✓ CSV & Excel supported &nbsp;·&nbsp; ✓ Setup in 10 minutes
          </p>

          <div style={{ display: 'flex', gap: 32, paddingTop: 24, borderTop: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
            {[['7', 'mismatch types auto-detected'], ['100%', 'decision audit trail'], ['1-click', 'CSV & report export']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 20, fontWeight: 800, color: D, letterSpacing: '-0.5px' }}>{v}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, maxWidth: 100 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — app mockup */}
        <div style={{ flex: '1 1 320px', maxWidth: 520 }}>
          <div style={{
            borderRadius: 18, overflow: 'hidden',
            boxShadow: '0 28px 64px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
          }}>
            {/* Browser chrome */}
            <div style={{ background: S, padding: '10px 14px', display: 'flex',
              alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: 5 }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => (
                  <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'block' }}/>
                ))}
              </div>
              <div style={{ flex: 1, background: W, border: '1px solid #e2e8f0', borderRadius: 6, height: 22,
                display: 'flex', alignItems: 'center', padding: '0 10px' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>app.reconcile.in/review</span>
              </div>
            </div>

            {/* App content */}
            <div style={{ background: W, padding: 16 }}>
              {/* Summary tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
                {[
                  { label: 'Total', value: '38', bg: S,        color: D,        border: '#e2e8f0' },
                  { label: 'Open',  value: '12', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                  { label: 'Resolved', value: '21', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                  { label: 'Escalated', value: '5', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
                ].map(t => (
                  <div key={t.label} style={{ padding: '8px 10px', borderRadius: 8, background: t.bg,
                    border: `1px solid ${t.border}`, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: t.color, lineHeight: 1 }}>{t.value}</div>
                    <div style={{ fontSize: 9.5, color: t.color, opacity: 0.7, marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.label}</div>
                  </div>
                ))}
              </div>

              {/* Tab bar */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 10, gap: 2 }}>
                {[['Open','#b91c1c','#fef2f2',true],['Escalated','#92400e','#fffbeb',false],['Resolved','#15803d','#f0fdf4',false]].map(([label, color, bg, active]) => (
                  <div key={String(label)} style={{
                    padding: '6px 12px', fontSize: 11.5, fontWeight: active ? 700 : 500,
                    color: active ? String(color) : '#94a3b8',
                    borderBottom: active ? `2px solid ${color}` : '2px solid transparent',
                    marginBottom: -1, cursor: 'default',
                  }}>
                    {String(label)}
                  </div>
                ))}
              </div>

              {/* Mismatch rows */}
              {[
                { type: 'Amount Mismatch',   typeBg: '#fffbeb', typeColor: '#92400e', sev: 'High',   sevBg: '#fef2f2', sevColor: '#b91c1c', desc: 'Bank: ₹82,400 · Ledger: ₹80,000 · Δ ₹2,400', status: 'Open',      stBg: '#fef2f2', stColor: '#b91c1c' },
                { type: 'Missing in Bank',   typeBg: '#fef2f2', typeColor: '#b91c1c', sev: 'High',   sevBg: '#fef2f2', sevColor: '#b91c1c', desc: 'Ledger ref: INV-2024-0091 not found',         status: 'Open',      stBg: '#fef2f2', stColor: '#b91c1c' },
                { type: 'GSTIN Mismatch',    typeBg: '#f0fdf4', typeColor: '#166534', sev: 'Medium', sevBg: '#fffbeb', sevColor: '#92400e', desc: 'Bank GSTIN: 27AABCS1429B1Z · Ledger differs',  status: 'Escalated', stBg: '#fffbeb', stColor: '#92400e' },
                { type: 'Date Mismatch',     typeBg: '#eff6ff', typeColor: '#1d4ed8', sev: 'Low',    sevBg: '#f1f5f9', sevColor: '#64748b', desc: 'Bank: 14 Mar · Ledger: 16 Mar',                status: 'Open',      stBg: '#fef2f2', stColor: '#b91c1c' },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 7, marginBottom: 5,
                  background: i === 0 ? '#fff7ed' : S,
                  border: `1px solid ${i === 0 ? '#fed7aa' : '#f1f5f9'}`,
                  cursor: 'default',
                }}>
                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                    background: row.typeBg, color: row.typeColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {row.type}
                  </span>
                  <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: row.sevBg, color: row.sevColor, flexShrink: 0 }}>
                    {row.sev}
                  </span>
                  <span style={{ flex: 1, fontSize: 10.5, color: M, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.desc}
                  </span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                    background: row.stBg, color: row.stColor, flexShrink: 0 }}>
                    {row.status}
                  </span>
                </div>
              ))}

              {/* Action strip */}
              <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 8,
                background: '#fff7ed', border: '1px solid #fed7aa',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#92400e', fontWeight: 600 }}>
                  💡 12 mismatches pending review
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: F }}>Review all →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TRUST BAR ──────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9',
        padding: '16px 5%', background: S }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex',
          alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginRight: 4 }}>
            Designed for
          </span>
          {['CA Firms', 'CPA Practices', 'Finance Controllers', 'Audit Teams', 'CFO Offices', 'Startup Finance'].map(s => (
            <span key={s} style={{ fontSize: 12, fontWeight: 700, color: '#475569',
              background: W, border: '1px solid #e2e8f0', padding: '4px 12px', borderRadius: 99 }}>
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ─── HOW IT WORKS ───────────────────────────────────── */}
      <div id="how-it-works" style={{ maxWidth: 960, margin: '0 auto', padding: '88px 5% 72px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-block', background: '#fff7ed', color: F,
            fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 99,
            border: '1px solid #fed7aa', marginBottom: 16 }}>
            HOW IT WORKS
          </div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900,
            letterSpacing: '-1.5px', marginBottom: 12, color: D }}>
            From upload to clean report<br />in three steps
          </h2>
          <p style={{ fontSize: 16, color: M, maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
            No configuration. No mapping. Just drop your files and go.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
          {steps.map((step, i) => (
            <div key={step.n} style={{ position: 'relative' }}>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', top: 28, left: 'calc(50% + 60px)',
                  width: 'calc(100% - 40px)', height: 1,
                  background: 'linear-gradient(90deg, #e2e8f0, transparent)',
                  display: 'none' }}/>
              )}
              <div style={{ background: W, border: '1px solid #f1f5f9', borderRadius: 18,
                padding: '28px 24px', textAlign: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', margin: '0 auto 18px',
                  background: '#fff7ed', border: `2px solid #fed7aa`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 22 }}>{step.icon}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: F,
                  letterSpacing: '0.08em', marginBottom: 8 }}>
                  STEP {step.n}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 10,
                  letterSpacing: '-0.4px', color: D }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: M, lineHeight: 1.7, margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── MISMATCH TYPES PILL STRIP ───────────────────────── */}
      <div style={{ background: S, borderTop: '1px solid #f1f5f9',
        borderBottom: '1px solid #f1f5f9', padding: '24px 5%' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textAlign: 'center',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            7 mismatch types detected automatically
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {mismatchTypes.map(m => (
              <span key={m.label} style={{
                fontSize: 12.5, fontWeight: 600, padding: '5px 13px', borderRadius: 6,
                background: m.bg, color: m.color, border: `1px solid ${m.border}`,
              }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── CORE FEATURES ──────────────────────────────────── */}
      <div id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 5% 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-block', background: '#f0fdfa', color: T,
            fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 99,
            border: '1px solid #99f6e4', marginBottom: 16 }}>
            CORE FEATURES
          </div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900,
            letterSpacing: '-1.5px', marginBottom: 12 }}>
            Everything your team needs.<br />Nothing they don't.
          </h2>
          <p style={{ fontSize: 16, color: M, maxWidth: 460, margin: '0 auto', lineHeight: 1.7 }}>
            Built specifically for Indian CA firms and finance teams.
          </p>
        </div>

        {coreFeatures.map((f, i) => (
          <div key={f.title} style={{
            display: 'flex', alignItems: 'center', gap: 64,
            marginBottom: 88, flexWrap: 'wrap',
            flexDirection: i % 2 === 1 ? 'row-reverse' : 'row',
          }}>
            <div style={{ flex: '1 1 320px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center',
                background: f.badgeBg, border: `1px solid ${f.badgeBorder}`,
                borderRadius: 99, padding: '4px 14px', marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: f.badgeColor }}>{f.badge}</span>
              </div>
              <h3 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px',
                marginBottom: 14, lineHeight: 1.2, color: D }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 16, color: M, lineHeight: 1.75,
                marginBottom: 28, maxWidth: 420 }}>
                {f.desc}
              </p>
              <Link href="/login" style={{ ...primaryCTA, padding: '11px 24px', fontSize: 14 }}>
                Try it free →
              </Link>
            </div>

            <div style={{ flex: '1 1 280px', maxWidth: 400 }}>
              <div style={{
                background: f.cardBg, border: `1.5px solid ${f.cardBorder}`,
                borderRadius: 20, padding: 28,
                boxShadow: `0 12px 40px ${f.shadowColor}18`,
              }}>
                {/* Upload visual */}
                {f.visual === 'upload' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>FILES UPLOADED</div>
                    {[
                      { name: 'HDFC_Bank_March.csv',    size: '48 KB', rows: '312 rows', icon: '🏦', ready: true },
                      { name: 'Tally_Ledger_March.xlsx', size: '62 KB', rows: '298 rows', icon: '📒', ready: true },
                    ].map(file => (
                      <div key={file.name} style={{ background: W, borderRadius: 10, padding: '12px 14px',
                        border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{file.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: D,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: 11, color: M, marginTop: 1 }}>
                            {file.size} · {file.rows}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px',
                          borderRadius: 99, background: '#f0fdf4', color: '#15803d',
                          border: '1px solid #bbf7d0' }}>
                          ✓ Ready
                        </span>
                      </div>
                    ))}
                    <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 10,
                      background: '#fff7ed', border: '1px solid #fed7aa',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: F }}>38 mismatches detected</span>
                      <span style={{ fontSize: 11, color: '#92400e' }}>across 7 categories</span>
                    </div>
                  </div>
                )}

                {/* Queue visual */}
                {f.visual === 'queue' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T, marginBottom: 4 }}>REVIEW QUEUE · OPEN (12)</div>
                    {[
                      { type: 'Amount Mismatch', sev: 'High', action: 'Resolved', actionBg: '#f0fdf4', actionColor: '#15803d' },
                      { type: 'Missing in Bank', sev: 'High', action: 'Escalated', actionBg: '#fffbeb', actionColor: '#92400e' },
                      { type: 'GSTIN Mismatch',  sev: 'Med',  action: 'Ignored',   actionBg: '#f1f5f9', actionColor: '#64748b' },
                    ].map((row, ri) => (
                      <div key={ri} style={{ background: W, borderRadius: 10, padding: '10px 14px',
                        border: '1px solid #e2e8f0', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                            background: '#fffbeb', color: '#92400e', whiteSpace: 'nowrap' }}>
                            {row.type}
                          </span>
                          <span style={{ fontSize: 10, color: M }}>{row.sev}</span>
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px',
                          borderRadius: 99, background: row.actionBg, color: row.actionColor,
                          whiteSpace: 'nowrap' }}>
                          ✓ {row.action}
                        </span>
                      </div>
                    ))}
                    <div style={{ padding: '10px 14px', borderRadius: 10,
                      background: '#f0fdfa', border: '1px solid #99f6e4',
                      fontSize: 12, color: T, fontWeight: 600 }}>
                      📋 Every decision logged with timestamp + note
                    </div>
                  </div>
                )}

                {/* Report visual */}
                {f.visual === 'report' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>RECONCILIATION REPORT</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Period', value: 'Mar 2024' },
                        { label: 'Status', value: 'Complete' },
                        { label: 'Matched', value: '294 entries' },
                        { label: 'Net diff', value: '₹0.00' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: W, padding: '8px 10px', borderRadius: 8,
                          border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: 9.5, color: M, textTransform: 'uppercase',
                            letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: D }}>{value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '10px 14px', borderRadius: 10,
                      background: '#f0fdf4', border: '1px solid #bbf7d0',
                      display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📄</span>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#15803d' }}>
                          HDFC_March_Reconciliation.csv
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>38 rows · all decisions included</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['Summary CSV', 'Mismatches CSV'].map(btn => (
                        <div key={btn} style={{ flex: 1, padding: '8px', borderRadius: 8,
                          background: W, border: '1px solid #e2e8f0',
                          fontSize: 11.5, fontWeight: 600, color: '#374151',
                          textAlign: 'center', cursor: 'default' }}>
                          ⬇ {btn}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── WHO IT'S FOR ───────────────────────────────────── */}
      <div id="for-whom" style={{ background: S, borderTop: '1px solid #f1f5f9', padding: '80px 5%' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', background: '#fff7ed', color: F,
              fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 99,
              border: '1px solid #fed7aa', marginBottom: 16 }}>
              WHO IT'S FOR
            </div>
            <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900,
              letterSpacing: '-1px', marginBottom: 12, color: D }}>
              Built for the people who own the numbers
            </h2>
            <p style={{ fontSize: 15, color: M, maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
              Whether you're a solo CA or a 50-person finance team, Reconcile fits your workflow.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            {forWhom.map(item => (
              <div key={item.title} style={{ background: W, border: '1px solid #f1f5f9',
                borderRadius: 18, padding: '26px 22px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s, border-color 0.2s' }}>
                <div style={{ fontSize: 30, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8,
                  letterSpacing: '-0.3px', color: D }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 13.5, color: M, lineHeight: 1.7, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── DARK FEATURE CALLOUT ─────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
        padding: '80px 5%',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto',
          display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
              background: `${F}20`, border: `1px solid ${F}40`,
              borderRadius: 99, padding: '5px 14px', marginBottom: 24 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fb923c' }}>📋 Full audit trail</span>
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900,
              color: W, letterSpacing: '-1px', marginBottom: 16, lineHeight: 1.15 }}>
              Every decision,<br />
              <span style={{ color: F }}>forever on record.</span>
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.78, marginBottom: 28, maxWidth: 420 }}>
              Reconcile logs every resolve, ignore, and escalate — with who did it,
              when, and why. Your auditors will love you. Your clients will trust you.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
              {['Timestamped decisions', 'Attributed by user', 'Append-only log', 'Exportable audit trail', 'Note per decision'].map(tag => (
                <span key={tag} style={{ fontSize: 12, fontWeight: 600,
                  color: '#fb923c', background: `${F}18`,
                  border: `1px solid ${F}35`, padding: '4px 12px', borderRadius: 99 }}>
                  {tag}
                </span>
              ))}
            </div>
            <Link href="/login" style={{ background: F, color: W, padding: '13px 28px',
              borderRadius: 10, fontSize: 15, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(249,115,22,0.45)',
              display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Start for free →
            </Link>
          </div>

          <div style={{ flex: '1 1 280px', maxWidth: 340 }}>
            <div style={{ background: 'rgba(255,255,255,0.07)',
              borderRadius: 18, padding: 22,
              border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', marginBottom: 16 }}>
                DECISION HISTORY
              </div>
              {[
                { action: 'Resolved',  note: 'Confirmed with HDFC statement on file.',  who: 'Priya S.', time: '2 hrs ago',  color: '#15803d', bg: '#f0fdf4' },
                { action: 'Escalated', note: 'GSTIN doesn\'t match TAN. Sent to client.', who: 'Rahul M.', time: '5 hrs ago',  color: '#92400e', bg: '#fffbeb' },
                { action: 'Ignored',   note: 'Timing difference — acceptable per policy.', who: 'Priya S.', time: 'Yesterday', color: '#64748b', bg: '#f1f5f9' },
              ].map((d, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.06)',
                  borderRadius: 10, padding: '12px 14px', marginBottom: 8,
                  border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 4, background: d.bg, color: d.color }}>
                      {d.action}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)' }}>{d.time}</span>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)',
                    margin: '0 0 5px', lineHeight: 1.5 }}>
                    {d.note}
                  </p>
                  <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>by {d.who}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECURITY GRID ──────────────────────────────────── */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '80px 5%' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#f0fdfa', border: '1px solid #99f6e4',
            borderRadius: 99, padding: '5px 16px', marginBottom: 20 }}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: T }}>Security & compliance</span>
          </div>
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900,
            letterSpacing: '-1px', marginBottom: 12, color: D }}>
            Your financial data deserves better than a shared spreadsheet
          </h2>
          <p style={{ fontSize: 15, color: M, maxWidth: 460,
            margin: '0 auto', lineHeight: 1.7 }}>
            Enterprise-grade security, built for the sensitivity of reconciliation data.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {securityItems.map(item => (
            <div key={item.title} style={{ background: S, border: '1px solid #f1f5f9',
              borderRadius: 16, padding: '22px 18px' }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{item.icon}</div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: D, marginBottom: 6 }}>{item.title}</h3>
              <p style={{ fontSize: 12.5, color: M, lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── FINAL CTA ──────────────────────────────────────── */}
      <div style={{ background: F, padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900,
            color: W, letterSpacing: '-1.5px', marginBottom: 14, lineHeight: 1.1 }}>
            Stop reconciling in spreadsheets.
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 17,
            marginBottom: 36, lineHeight: 1.7, maxWidth: 440, margin: '0 auto 36px' }}>
            Give your team a proper tool. Get clean reports your clients can trust.
            Start in under 10 minutes.
          </p>
          <Link href="/login" style={{
            background: W, color: F,
            padding: '17px 44px', borderRadius: 12,
            fontSize: 17, fontWeight: 800, textDecoration: 'none',
            boxShadow: '0 8px 28px rgba(0,0,0,0.2)',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            letterSpacing: '-0.3px',
          }}>
            Get started free →
          </Link>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, marginTop: 16 }}>
            No credit card · CSV & Excel supported · Made in India 🇮🇳
          </p>
        </div>
      </div>

      {/* ─── FOOTER ─────────────────────────────────────────── */}
      <footer style={{ background: '#0f172a',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '28px 5%',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: T,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitCompare style={{ width: 14, height: 14, color: W }}/>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            Reconcile · Made in India 🇮🇳
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecoration: 'none' }}>Sign in</Link>
          <a href="mailto:support@sngadvisers.com" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, textDecoration: 'none' }}>Contact</a>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>
          © 2026 SNG Advisers. All rights reserved.
        </p>
      </footer>

    </div>
  )
}
