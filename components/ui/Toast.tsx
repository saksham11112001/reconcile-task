'use client'
import { useToastStore } from '@/store/appStore'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export function ToastContainer() {
  const { toasts, remove } = useToastStore()
  if (!toasts.length) return null

  const cfg = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d', icon: CheckCircle },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c', icon: XCircle     },
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', icon: Info         },
  }

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => {
        const { bg, border, color, icon: Icon } = cfg[t.type as keyof typeof cfg] ?? cfg.info
        return (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px', borderRadius: 10,
            background: bg, border: `1px solid ${border}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            minWidth: 240, maxWidth: 360, pointerEvents: 'all',
          }}>
            <Icon style={{ width: 16, height: 16, color, flexShrink: 0 }}/>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color, lineHeight: 1.4 }}>{t.message}</span>
            <button onClick={() => remove(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color, opacity: 0.6, padding: 2 }}>
              <X style={{ width: 13, height: 13 }}/>
            </button>
          </div>
        )
      })}
    </div>
  )
}
