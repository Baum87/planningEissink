import { useState, useEffect, useRef } from 'react'

/**
 * Beheert loading/error/data voor één async fetchFn.
 * - herlaad() triggert een handmatige refresh (bijv. na een mutatie)
 * - setData() staat optimistic updates toe zonder een full re-fetch
 * - deps werkt als useEffect deps: re-fetch bij wijziging
 */
export function useAsyncData(fetchFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)
  const fnRef = useRef(fetchFn)
  fnRef.current = fetchFn

  useEffect(() => {
    let actief = true
    setLoading(true)
    setError(null)
    fnRef.current()
      .then((result) => { if (actief) { setData(result); setLoading(false) } })
      .catch((err)   => { if (actief) { setError(err?.message ?? 'Fout bij laden'); setLoading(false) } })
    return () => { actief = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps])

  return { data, setData, loading, error, herlaad: () => setTick((n) => n + 1) }
}
