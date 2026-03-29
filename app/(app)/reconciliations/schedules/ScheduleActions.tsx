'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pause } from 'lucide-react'

export function ScheduleActions({ scheduleId, status }: { scheduleId: string; status: string }) {
  const router   = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const newStatus = status === 'active' ? 'paused' : 'active'
    await fetch(`/api/recurring-recons/${scheduleId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    })
    router.refresh()
    setLoading(false)
  }

  if (status === 'cancelled') return null

  return (
    <button disabled={loading} onClick={toggle}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 12, padding: '3px 8px', borderRadius: 5, cursor: 'pointer',
        border: '1px solid',
        ...(status === 'active'
          ? { background: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }
          : { background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }),
      }}>
      {status === 'active'
        ? <><Pause style={{ width: 11, height: 11 }}/> {loading ? '...' : 'Pause'}</>
        : loading ? '...' : 'Resume'}
    </button>
  )
}
