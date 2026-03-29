'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const origFetch = window.fetch

    window.fetch = async (...args) => {
      try {
        const res = await origFetch(...args)
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url ?? ''
        const isApiRoute = url.startsWith('/api/')

        if (isApiRoute && res.status === 401) {
          const clone = res.clone()
          try {
            const data = await clone.json()
            if (data?.error === 'Unauthorised' || data?.code === 'PGRST301') {
              router.push('/login?error=session_expired')
            }
          } catch {}
        }
        return res
      } catch (err) {
        throw err
      }
    }

    return () => { window.fetch = origFetch }
  }, [router])

  return <>{children}</>
}
