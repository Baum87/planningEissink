import { useState, useDeferredValue } from 'react'

export function useZoek() {
  const [zoek, setZoek] = useState('')
  const zoekDeferred = useDeferredValue(zoek)
  return [zoek, setZoek, zoekDeferred]
}
