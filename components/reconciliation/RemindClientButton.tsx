'use client'

import { useState } from 'react'
import { Bell, Loader } from 'lucide-react'
import { toast } from '@/store/appStore'

interface Props {
  reconId: string
}

export function RemindClientButton({ reconId }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const res = await fetch(`/api/reconciliations/${reconId}/remind`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      const d = await res.json()
      toast.success(`Upload reminder sent to ${d.sent_to ?? 'client'}.`)
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error ?? 'Failed to send reminder.')
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn btn-outline btn-sm"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
        opacity: loading ? 0.65 : 1 }}>
      {loading
        ? <Loader style={{ width: 13, height: 13 }} className="animate-spin"/>
        : <Bell  style={{ width: 13, height: 13 }}/>
      }
      {loading ? 'Sending…' : 'Remind Client'}
    </button>
  )
}
