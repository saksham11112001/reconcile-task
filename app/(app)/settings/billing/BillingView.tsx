'use client'

import { useState } from 'react'
import { Check, Zap, X } from 'lucide-react'
import { toast } from '@/store/appStore'

const PLANS = [
  {
    key:      'starter',
    name:     'Starter',
    tagline:  'For small CA firms and independent practitioners',
    monthly:  2999,
    annual:   2399,
    color:    '#0d9488',
    popular:  false,
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
      'Reviewer & approver assignment',
      'Priority support',
    ],
  },
  {
    key:      'pro',
    name:     'Pro',
    tagline:  'For growing firms with larger teams and more clients',
    monthly:  7999,
    annual:   6399,
    color:    '#7c3aed',
    popular:  true,
    features: [
      'Up to 15 team members',
      'Unlimited active clients',
      'Everything in Starter',
      'Advanced RBAC (owner / admin / reviewer / analyst / viewer)',
      'Assignee & approver per reconciliation',
      'Bulk mismatch actions (resolve / ignore / escalate)',
      'Full audit trail for all decisions',
      'Period finalization workflow',
      'Document request center',
      'Client health score & filters',
      'Reconciliation checklist',
      'Client portal (upload-only access)',
      'Priority email & chat support',
      'Dedicated onboarding session',
    ],
    notIncluded: [],
  },
]

interface Props {
  orgName:    string
  currentPlan: string
  canManage:  boolean
}

export function BillingView({ orgName, currentPlan, canManage }: Props) {
  const [annual,  setAnnual]  = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  function handleUpgrade(planKey: string) {
    if (!canManage) {
      toast.error('Only owners and admins can manage the plan.')
      return
    }
    setLoading(planKey)
    // Stub — integrate Razorpay or payment gateway here
    setTimeout(() => {
      setLoading(null)
      toast.info('Payment integration coming soon. Contact hello@sngadvisers.com to upgrade.')
    }, 800)
  }

  return (
    <div style={{ maxWidth: 900 }}>

      {/* Current plan banner */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>Current plan</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ textTransform: 'capitalize' }}>{currentPlan}</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 8px',
              borderRadius: 4, background: '#f0fdf4', color: '#15803d',
              border: '1px solid #bbf7d0' }}>Active</span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Organisation: <strong style={{ color: 'var(--text-primary)' }}>{orgName}</strong>
        </div>
      </div>

      {/* Annual toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 12, marginBottom: '1.5rem' }}>
        <span style={{ fontSize: 13.5, fontWeight: annual ? 400 : 600,
          color: annual ? 'var(--text-muted)' : 'var(--text-primary)' }}>Monthly</span>
        <button onClick={() => setAnnual(v => !v)}
          style={{ width: 44, height: 24, borderRadius: 12, border: 'none',
            background: annual ? '#0d9488' : 'var(--border)',
            cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
          <span style={{ position: 'absolute', top: 2, left: annual ? 22 : 2,
            width: 20, height: 20, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}/>
        </button>
        <span style={{ fontSize: 13.5, fontWeight: annual ? 600 : 400,
          color: annual ? 'var(--text-primary)' : 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: 6 }}>
          Annual
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px',
            borderRadius: 4, background: '#f0fdf4', color: '#15803d' }}>
            Save 20%
          </span>
        </span>
      </div>

      {/* Plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.25rem', marginBottom: '1.5rem' }}>
        {PLANS.map(plan => {
          const price    = annual ? plan.annual : plan.monthly
          const isCurrent = plan.key === currentPlan
          return (
            <div key={plan.key} className="card"
              style={{ overflow: 'hidden', position: 'relative',
                border: plan.popular ? '2px solid var(--brand)' : '1px solid var(--border)' }}>

              {plan.popular && (
                <div style={{ position: 'absolute', top: 0, right: 0,
                  background: 'var(--brand)', color: '#fff',
                  fontSize: 11, fontWeight: 700, padding: '4px 12px',
                  borderBottomLeftRadius: 8, letterSpacing: '0.05em' }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ padding: '1.5rem 1.5rem 1rem' }}>
                <h3 style={{ margin: '0 0 3px', fontSize: 18, fontWeight: 700,
                  color: 'var(--text-primary)' }}>
                  {plan.name}
                </h3>
                <p style={{ margin: '0 0 1rem', fontSize: 12.5, color: 'var(--text-muted)' }}>
                  {plan.tagline}
                </p>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4,
                  marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)',
                    lineHeight: 1 }}>
                    ₹{price.toLocaleString('en-IN')}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 3 }}>
                    / month{annual ? ' (billed annually)' : ''}
                  </span>
                </div>

                {isCurrent ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, padding: '0.65rem', borderRadius: 8, fontSize: 13.5,
                    fontWeight: 600, background: 'var(--surface-subtle)',
                    color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    <Check style={{ width: 14, height: 14 }}/> Current plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={loading === plan.key || !canManage}
                    style={{ width: '100%', padding: '0.65rem', borderRadius: 8,
                      border: 'none', cursor: canManage ? 'pointer' : 'not-allowed',
                      fontSize: 13.5, fontWeight: 600,
                      background: plan.popular ? 'var(--brand)' : 'var(--surface-subtle)',
                      color: plan.popular ? '#fff' : 'var(--text-primary)',
                      opacity: loading === plan.key ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {loading === plan.key
                      ? 'Processing…'
                      : plan.key === 'pro' && currentPlan === 'starter'
                        ? <><Zap style={{ width: 14, height: 14 }}/> Upgrade to Pro</>
                        : currentPlan === 'pro' ? 'Downgrade to Starter' : 'Get Started'
                    }
                  </button>
                )}
              </div>

              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.65rem' }}>
                    Included
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 0.75rem',
                    display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                        <Check style={{ width: 13, height: 13, color: '#0d9488',
                          flexShrink: 0, marginTop: 2 }}/>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {plan.notIncluded.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        marginBottom: '0.65rem', marginTop: '0.5rem', opacity: 0.6 }}>
                        Not included
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0,
                        display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {plan.notIncluded.map(f => (
                          <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                            <X style={{ width: 12, height: 12, color: 'var(--border)',
                              flexShrink: 0, marginTop: 2 }}/>
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              {f}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Contact note */}
      <div className="card" style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted)' }}>
          Need a custom plan for a larger firm?{' '}
          <a href="mailto:hello@sngadvisers.com"
            style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
            Contact us
          </a>
          {' '}or call us. Annual billing available at 20% discount.
        </p>
      </div>
    </div>
  )
}
