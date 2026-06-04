import { useState, useMemo, useEffect, useRef } from 'react'
import { projKleur } from '../lib/kleurenpalet'

export default function ProjectZoeker({ projecten, value, onChange, onNieuwProject }) {
  const [zoek, setZoek] = useState('')
  const inputRef = useRef(null)

  const geselecteerd = value ? projecten.find((p) => p.id === value) : null

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    if (!q) return projecten
    return projecten.filter(
      (p) =>
        p.werknummer?.toLowerCase().includes(q) ||
        p.omschrijving?.toLowerCase().includes(q)
    )
  }, [projecten, zoek])

  useEffect(() => {
    if (!geselecteerd && inputRef.current) inputRef.current.focus()
  }, [geselecteerd])

  function selecteer(p) {
    onChange(p.id)
    setZoek('')
  }

  function wis() {
    onChange('')
    setZoek('')
  }

  if (geselecteerd) {
    const kleur = projKleur(geselecteerd)
    return (
      <button
        type="button"
        onClick={wis}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-left hover:opacity-80 transition-opacity"
        style={{ backgroundColor: kleur.bg }}
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold font-mono truncate leading-tight" style={{ color: kleur.fg }}>
            {geselecteerd.werknummer}
            {geselecteerd.projectleider_initialen && (
              <span className="font-sans font-medium">
                {' · '}{geselecteerd.projectleider_initialen}
              </span>
            )}
          </div>
          <div className="text-xs truncate leading-tight" style={{ color: kleur.fg, opacity: 0.75 }}>
            {geselecteerd.omschrijving}
          </div>
        </div>
        <span className="text-xs shrink-0" style={{ color: kleur.fg, opacity: 0.5 }}>✕</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="text"
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        placeholder="Zoek op werknummer of omschrijving…"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
      />
      {gefilterd.length > 0 ? (
        <ul className="border border-gray-200 rounded-lg overflow-y-auto" style={{ maxHeight: 192 }}>
          {gefilterd.map((p) => (
            <li key={p.id} className="border-b border-gray-100 last:border-b-0">
              <button
                type="button"
                onClick={() => selecteer(p)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-semibold font-mono text-gray-700">
                  {p.werknummer}
                  {p.projectleider_initialen && (
                    <span className="font-sans font-medium text-gray-500">
                      {' · '}{p.projectleider_initialen}
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-400 ml-2">{p.omschrijving}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2.5 text-xs text-gray-400">
            Geen projecten gevonden
          </div>
          {zoek.trim() && onNieuwProject && (
            <button
              type="button"
              onClick={onNieuwProject}
              className="w-full px-3 py-2.5 text-xs text-left text-blue-600 hover:bg-blue-50 transition-colors border-t border-gray-100"
            >
              ＋ Nieuw project aanmaken
            </button>
          )}
        </div>
      )}
    </div>
  )
}
