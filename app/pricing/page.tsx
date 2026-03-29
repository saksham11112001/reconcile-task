import Link from 'next/link'
import { Check, GitCompare } from 'lucide-react'
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Pricing — Reconcile',
  description: 'Simple, transparent pricing for CA firms and finance teams.',
}

// ─── Plan data ──────────────────────────────────────────────────

const PLANS = [
  {
    name:       'Starter',
    tagline:    'For small CA firms and independent practitioners',
    price:      '₹2,999',
    period:     '/month',
    highlight:  false,
    cta:        'Start Free Trial',
    ctaHref:    '/login',
    features: [
      'Up to 3 team members',
      'Up to 15 active clients',
      'Monthly & quarterly reconciliations',
      'Bank + ledger file processing',
      'Mismatch detection & review queue',
      'Resolve, ignore, escalate mismatches',
      'CSV exports (mismatches + summary)',
      'Recurring reconciliation schedules',
      'Email alerts & reminders',
      'Report generation per reconciliation',
      'Dashboard & KPIs',
      'Email support',
    ],
    notIncluded: [
      'Advanced RBAC (reviewer / analyst / viewer)',
      'Bulk mismatch actions',
      'Audit trail',
      'Reviewer assignment',
      'Priority support',
    ],
  },
  {
    name:       'Pro',
    tagline:    'For growing firms with larger teams and more clients',
    price:      '₹7,999',
    period:     '/month',
    highlight:  true,
    cta:        'Start Free Trial',
    ctaHref:    '/login',
    features: [
      'Up to 15 team members',
      'Unlimited active clients',
      'Everything in Starter',
      'Advanced RBAC (owner / admin / reviewer / analyst / viewer)',
      'Reviewer assignment per reconciliation',
      'Bulk mismatch actions (resolve / ignore / escalate)',
      'Audit trail for all decisions',
      'Period finalization workflow',
      'Client-wise and period-wise reports',
      'Advanced mismatch filters',
      'Escalation management',
      'Priority email & chat support',
      'Dedicated onboarding session',
    ],
    notIncluded: [],
  },
]

// ─── Page ───────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8fafc)', fontFamily: 'inherit' }}>

      {/* Nav */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0',
        padding: '0 2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0d9488',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitCompare style={{ width: 14, height: 14, color: '#fff' }}/>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>Reconcile</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login"
            style={{ fontSize: 13.5, color: '#64748b', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
          <Link href="/login"
            style={{ fontSize: 13.5, fontWeight: 600, padding: '6px 16px',
              background: '#0d9488', color: '#fff',
              borderRadius: 7, textDecoration: 'none' }}>
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '3.5rem 1rem 2rem' }}>
        <div style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20,
          background: '#f0fdfa', border: '1px solid #99f6e4',
          fontSize: 12.5, fontWeight: 600, color: '#0d9488', marginBottom: '1rem' }}>
          Simple, transparent pricing
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem',
          lineHeight: 1.15 }}>
          Priced for CA firms
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', maxWidth: 500, margin: '0 auto 0.5rem',
          lineHeight: 1.6 }}>
          No hidden charges. No per-transaction fees.
          Start with a 14-day free trial — no credit card required.
        </p>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
          Annual plans available at 20% discount. Contact us for team pricing.
        </p>
      </div>

      {/* Plan cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 440px))',
        gap: '1.5rem',
        maxWidth: 960,
        margin: '0 auto',
        padding: '1rem 1.5rem 3rem',
        justifyContent: 'center',
      }}>
        {PLANS.map(plan => (
          <div key={plan.name}
            style={{
              background: '#fff',
              borderRadius: 14,
              border: plan.highlight ? '2px solid #0d9488' : '1px solid #e2e8f0',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: plan.highlight
                ? '0 8px 32px rgba(13,148,136,0.13)'
                : '0 2px 12px rgba(0,0,0,0.05)',
            }}>

            {plan.highlight && (
              <div style={{ position: 'absolute', top: 0, right: 0,
                background: '#0d9488', color: '#fff',
                fontSize: 11.5, fontWeight: 700, padding: '5px 14px',
                borderBottomLeftRadius: 10, letterSpacing: '0.05em' }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ padding: '1.75rem 1.75rem 1.25rem' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                {plan.name}
              </h2>
              <p style={{ margin: '0 0 1.25rem', fontSize: 13.5, color: '#64748b' }}>
                {plan.tagline}
              </p>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: '1.5rem' }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: 14, color: '#94a3b8', marginBottom: 4 }}>
                  {plan.period}
                </span>
              </div>

              <Link href={plan.ctaHref}
                style={{
                  display: 'block', textAlign: 'center',
                  padding: '0.75rem 1rem', borderRadius: 8,
                  fontWeight: 600, fontSize: 14, textDecoration: 'none',
                  ...(plan.highlight
                    ? { background: '#0d9488', color: '#fff' }
                    : { background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }),
                }}>
                {plan.cta}
              </Link>
            </div>

            <div style={{ padding: '0 1.75rem 1.75rem' }}>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8',
                  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                  What's included
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem',
                  display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {plan.features.map(f => (
                    <FeatureLine key={f} text={f} included />
                  ))}
                </ul>

                {plan.notIncluded.length > 0 && (
                  <>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#cbd5e1',
                      textTransform: 'uppercase', letterSpacing: '0.07em',
                      marginBottom: '0.75rem', marginTop: '0.5rem' }}>
                      Not included
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0,
                      display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {plan.notIncluded.map(f => (
                        <FeatureLine key={f} text={f} included={false} />
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* FAQ / Notes */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 1.5rem 4rem' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a',
          textAlign: 'center', marginBottom: '1.75rem' }}>
          Common questions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {FAQs.map(({ q, a }) => (
            <div key={q} style={{ padding: '1rem 1.25rem', background: '#fff',
              borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>{q}</div>
              <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.6 }}>{a}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '2.5rem',
          padding: '1.5rem', background: '#f0fdfa',
          borderRadius: 12, border: '1px solid #99f6e4' }}>
          <p style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, margin: '0 0 6px' }}>
            Need a custom plan for a larger firm?
          </p>
          <p style={{ fontSize: 13.5, color: '#0d9488', margin: 0 }}>
            Contact us at{' '}
            <a href="mailto:hello@sngadvisers.com" style={{ color: '#0d9488', fontWeight: 600 }}>
              hello@sngadvisers.com
            </a>
          </p>
        </div>
      </div>

    </div>
  )
}

// ─── Feature line ────────────────────────────────────────────────

function FeatureLine({ text, included }: { text: string; included: boolean }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      {included ? (
        <Check style={{ width: 14, height: 14, color: '#0d9488',
          flexShrink: 0, marginTop: 2 }}/>
      ) : (
        <span style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 14 14" fill="none" style={{ width: 10, height: 10 }}>
            <path d="M2 2l10 10M12 2L2 12" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </span>
      )}
      <span style={{ fontSize: 13.5, color: included ? '#334155' : '#94a3b8',
        lineHeight: 1.4 }}>
        {text}
      </span>
    </li>
  )
}

// ─── FAQs ────────────────────────────────────────────────────────

const FAQs: { q: string; a: ReactNode }[] = [
  {
    q: 'Is there a free trial?',
    a: 'Yes — all plans come with a 14-day free trial. No credit card required to get started.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect at the start of the next billing cycle.',
  },
  {
    q: 'How are clients counted?',
    a: 'A client is a business or individual you run reconciliations for. Archived or inactive clients do not count toward your limit.',
  },
  {
    q: 'What file formats are supported?',
    a: 'Reconcile processes CSV and Excel files for both bank statements and ledger exports. Most tally and banking exports are supported.',
  },
  {
    q: 'Is the data secure?',
    a: 'All data is encrypted at rest and in transit. Files are processed securely and we do not share your data with third parties.',
  },
]
