import { useRef, useCallback } from 'react'

type Request = () => Promise<void>

export function useRequestQueue() {
  const queue   = useRef<Request[]>([])
  const running = useRef(false)

  const process = useCallback(async () => {
    if (running.current) return
    running.current = true
    while (queue.current.length > 0) {
      const next = queue.current.shift()!
      try { await next() } catch (e) { console.error('[queue]', e) }
    }
    running.current = false
  }, [])

  const enqueue = useCallback((request: Request) => {
    queue.current.push(request)
    process()
  }, [process])

  const enqueueDebounced = useCallback((id: string, request: Request) => {
    queue.current = queue.current.filter((r: any) => r.__id !== id)
    const tagged: any = request
    tagged.__id = id
    queue.current.push(tagged)
    process()
  }, [process])

  return { enqueue, enqueueDebounced }
}
