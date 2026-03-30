'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fmtDate } from '@/lib/utils/format'
import { RefreshCw, Calendar, Users2, CheckCircle2 } from 'lucide-react'
import { ScheduleActions } from './ScheduleActions'
import { InlineScheduleRow } from '@/components/reconciliation/InlineScheduleRow'
import type { RecurringRecon, OrgRole, Client } from '@/types'

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: '#f0fdf4', color: '#15803d', label: 'Active'    },
  paused:    { bg: '#fffbeb', color: '#92400e', label: 'Paused'    },
  cancelled: { bg: '#f1f5f9', color: '#64748b', label: 'Cancelled' },
}

const FREQ_LABEL: Record<string, string> = {
  monthly:   'Monthly',
  quarterly: 'Quarterly',
}

const COL_COUNT = 7   // Schedule Client Frequency NextDue AutoCreate Status Actions

interface Props {
  schedules: (RecurringRecon & { client_name: string | null })[]
  clients:   Pick<Client, 'id' | 'name'>[]
  canManage: boolean
  today:     string
}

export function SchedulesView({ schedules: initial, clients, canManage, today }: Props) {
  const router = useRouter()
  const [list, setList] = useState(initial)

  function handleCreated(s: RecurringRecon) {
    setList(prev => [{ ...s, client_name: clients.find(c => c.id === s.client_id)?.name ?? null }, ...prev])
    router.refresh()
  }

  const active    = list.filter(s => s.status === 'active')
  const paused    = list.filter(s => s.status === 'paused')
  const cancelled = list.filter(s => s.status === 'cancelled')

  return (
    <>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Recurring Schedules
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {active.length} active · {paused.length} paused · {cancelled.length} cancelled
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <RefreshCw style={{ width: 44, height: 44, color: 'var(--border)', margin: '0 auto 1rem' }}/>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            No recurring schedules
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 1.25rem' }}>
            Set up recurring schedules to auto-create reconciliations each month or quarter.
          </p>
        </div>
      ) : null}

      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
              {['Schedule', 'Client', 'Frequency', 'Next Due', 'Auto-create', 'Status', ''].map(h => (
                <th key={h} style={{ padding: '0.55rem 1rem', textAlign: 'left',
                  fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(s => {
              const st        = STATUS_STYLE[s.status] ?? STATUS_STYLE.active
              const isOverdue = s.next_due_date && s.next_due_date < today && s.status === 'active'

              return (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RefreshCw style={{ width: 14, height: 14, color: 'var(--brand)', flexShrink: 0 }}/>
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {s.name}
                      </span>
                    </div>
                    {s.last_created_at && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 22 }}>
                        Last created: {fmtDate(s.last_created_at)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {s.client_name ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Users2 style={{ width: 12, height: 12 }}/> {s.client_name}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar style={{ width: 12, height: 12 }}/>
                      {FREQ_LABEL[s.frequency] ?? s.frequency}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        · day {s.day_of_month}
                      </span>
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                    {s.next_due_date ? (
                      <span style={{ fontSize: 13, fontWeight: 500,
                        color: isOverdue ? '#b91c1c' : 'var(--text-primary)' }}>
                        {fmtDate(s.next_due_date)}
                        {isOverdue && (
                          <span style={{ fontSize: 11, fontWeight: 700, marginLeft: 5,
                            background: '#fef2f2', color: '#b91c1c',
                            padding: '1px 6px', borderRadius: 5 }}>
                            overdue
                          </span>
                        )}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {s.auto_create ? (
                      <CheckCircle2 style={{ width: 15, height: 15, color: '#15803d' }}/>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, padding: '2px 7px',
                      borderRadius: 6, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {canManage && s.status !== 'cancelled' && (
                      <ScheduleActions scheduleId={s.id} status={s.status} />
                    )}
                  </td>
                </tr>
              )
            })}

            {/* Inline add row */}
            {canManage && (
              <InlineScheduleRow
                clients={clients}
                colSpan={COL_COUNT}
                onCreated={handleCreated}
              />
            )}
          </tbody>
        </table>
      </div>

      {/* Info box */}
      {list.length > 0 && (
        <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem',
          background: 'var(--surface-subtle)', border: '1px solid var(--border)',
          borderRadius: 8, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>About recurring schedules:</strong>{' '}
          When auto-create is enabled, a new reconciliation record is created automatically when the due date arrives.
          You still need to upload the bank and ledger files to start processing.
          Reminders are sent {active[0]?.remind_days ?? 3} days before each due date.
        </div>
      )}
    </>
  )
}
