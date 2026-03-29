import { useState, useCallback } from 'react'

export function useOptimistic<T>(initial: T) {
  const [state, setState] = useState<T>(initial)

  const optimistic = useCallback((mutate: (prev: T) => T): T => {
    const snapshot = state
    setState(prev => mutate(prev))
    return snapshot
  }, [state])

  const revert = useCallback((snapshot: T) => {
    setState(snapshot)
  }, [])

  const confirm = useCallback((next: T) => {
    setState(next)
  }, [])

  return { state, setState, optimistic, revert, confirm }
}
