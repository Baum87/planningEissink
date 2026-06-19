import { useState, useMemo } from 'react'
import { UPDATES } from '../lib/updates'

const STORAGE_KEY = 'planning_gezien_updates'

function getGezienIds() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function slaGezienOp(ids) {
  const bestaand = getGezienIds()
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set([...bestaand, ...ids])]))
}

export default function UpdatesBadge({ rol }) {
  const [open, setOpen] = useState(false)
  const [gezienIds, setGezienIds] = useState(getGezienIds)

  const relevanteUpdates = useMemo(
    () => UPDATES.filter((u) => !u.rollen || u.rollen.includes(rol)),
    [rol],
  )

  const ongezieneUpdates = useMemo(
    () => relevanteUpdates.filter((u) => !gezienIds.includes(u.id)),
    [relevanteUpdates, gezienIds],
  )

  function sluitEnMarkeer() {
    const ids = ongezieneUpdates.map((u) => u.id)
    slaGezienOp(ids)
    setGezienIds(getGezienIds())
    setOpen(false)
  }

  if (ongezieneUpdates.length === 0) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-5 h-5"
        aria-label="Nieuwe functionaliteiten beschikbaar"
        title="Nieuw"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 pt-16 px-4 pb-8 overflow-y-auto"
          onClick={sluitEnMarkeer}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={sluitEnMarkeer}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
              aria-label="Sluiten"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <h1 className="text-lg font-semibold text-gray-900">Nieuw in de app</h1>
            </div>

            <div className="space-y-6">
              {ongezieneUpdates.map((update) => (
                <div key={update.id}>
                  <div className="text-xs text-gray-400 mb-1">{update.datum}</div>
                  <h2 className="text-base font-bold text-gray-900 mb-3">{update.titel}</h2>
                  <ul className="space-y-3">
                    {update.items.map((item, i) => {
                      const [subtitel, ...rest] = item.split(' — ')
                      const uitleg = rest.join(' — ')
                      return (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-gray-300 shrink-0 mt-0.5 select-none">—</span>
                          <span>
                            <span className="font-semibold text-gray-900">{subtitel}</span>
                            {uitleg && <span className="text-gray-500"> — {uitleg}</span>}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>

            <button
              onClick={sluitEnMarkeer}
              className="mt-8 w-full py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-700 transition-colors"
            >
              Begrepen
            </button>
          </div>
        </div>
      )}
    </>
  )
}
