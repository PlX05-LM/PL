import { useEffect, useRef } from 'react'

export function useDebouncedCallback<T extends unknown[]>(
  fn: (...args: T) => void,
  delayMs: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingArgs = useRef<T | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const flush = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    if (pendingArgs.current) {
      const args = pendingArgs.current
      pendingArgs.current = null
      fnRef.current(...args)
    }
  }

  useEffect(() => {
    // Flush any unsaved change if the tab is closed/reloaded or hidden before
    // the debounce delay elapses, so a hard navigation never discards edits.
    const onHide = () => flush()
    window.addEventListener('beforeunload', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('beforeunload', onHide)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (...args: T) => {
    if (timer.current) clearTimeout(timer.current)
    pendingArgs.current = args
    timer.current = setTimeout(() => {
      pendingArgs.current = null
      fnRef.current(...args)
    }, delayMs)
  }
}
