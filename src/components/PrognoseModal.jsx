import { useState, useMemo, useEffect } from 'react'
import { KLEURENPALET } from '../lib/kleurenpalet'
import { getMaandag, naarStr, isoWeek } from '../lib/datum'
import { useProfielen } from '../hooks/queries'

function vandaagMaandag() {
  return naarStr(getMaandag(new Date()))
}

export default function PrognoseModal({
  project,
  startDatum,
  autoKleur,
  onSave,
  onVerwijder,
  onInOpdracht,
  onClose,
}) {
  const isBewerk = !!project
  const { data: profielen = [] } = useProfielen()

  const [omschrijving, setOmschrijving]       = useState(project?.omschrijving ?? '')
  const [projectnummer, setProjectnummer]     = useState(project?.projectnummer ?? '')
  const [opdrachtgever, setOpdrachtgever]     = useState(project?.opdrachtgever ?? '')
  const [projectleiderId, setProjectleiderId] = useState(project?.projectleider_id ?? '')
  const [status, setStatus]                   = useState(project?.status ?? 'in_opdracht')
  const [aanneemsom, setAanneemsom]           = useState(
    project?.aanneemsom != null ? String(Math.round(Number(project.aanneemsom))) : ''
  )
  const [startD, setStartD]     = useState(project?.start_datum ?? startDatum ?? vandaagMaandag())
  const [duurWeken, setDuurWeken] = useState(project?.duur_weken != null ? String(project.duur_weken) : '')
  const [kleur, setKleur]       = useState(project?.kleur ?? autoKleur)

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const [kiesKleur, setKiesKleur]               = useState(false)
  const [bezig, setBezig]                       = useState(false)
  const [fout, setFout]                         = useState(null)
  const [verwijderConfirm, setVerwijderConfirm] = useState(false)
  const [inOpdrachtConfirm, setInOpdrachtConfirm] = useState(false)

  function handleStartDatum(val) {
    if (!val) return
    setStartD(naarStr(getMaandag(new Date(val + 'T00:00:00'))))
  }

  const startWeekLabel = startD
    ? `Wk ${isoWeek(new Date(startD + 'T00:00:00'))} · ${startD.slice(0, 4)}`
    : '—'

  const eindWeekLabel = useMemo(() => {
    if (!startD || !duurWeken) return '—'
    const d = new Date(startD + 'T00:00:00')
    d.setDate(d.getDate() + Number(duurWeken) * 7 - 1)
    return `Wk ${isoWeek(d)} · ${d.getFullYear()}`
  }, [startD, duurWeken])

  async function handleOpslaan(e) {
    e.preventDefault()
    if (!omschrijving.trim()) { setFout('Omschrijving is verplicht'); return }
    if (!duurWeken || Number(duurWeken) < 1) { setFout('Duur moet minimaal 1 week zijn'); return }
    setBezig(true); setFout(null)
    const velden = {
      omschrijving:     omschrijving.trim(),
      projectnummer:    projectnummer.trim() || null,
      opdrachtgever:    opdrachtgever.trim() || null,
      projectleider_id: projectleiderId || null,
      status,
      aanneemsom:       aanneemsom !== '' ? Number(aanneemsom) : null,
      start_datum:      startD,
      duur_weken:       Number(duurWeken),
      kleur,
    }
    try {
      await onSave(velden)
      onClose()
    } catch (err) {
      setFout(err.message)
      setBezig(false)
    }
  }

  async function handleVerwijder() {
    setBezig(true); setFout(null)
    try {
      await onVerwijder()
      onClose()
    } catch (err) {
      setFout(err.message)
      setBezig(false)
    }
  }

  async function handleInOpdracht() {
    setBezig(true); setFout(null)
    try {
      await onInOpdracht()
      onClose()
    } catch (err) {
      setFout('Statusovergang mislukt: ' + err.message)
      setBezig(false)
    }
  }

  // ── Bevestigingsscherm: in opdracht zetten ────────────────────────────────
  if (inOpdrachtConfirm) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
        onClick={() => { setInOpdrachtConfirm(false); setFout(null) }}
      >
        <div
          className="bg-white w-full h-full overflow-y-auto sm:h-auto sm:rounded-2xl sm:shadow-2xl sm:max-w-sm sm:mx-4 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-semibold text-gray-900 mb-2">Project in opdracht zetten?</p>
          <p className="text-sm text-gray-500 mb-6">
            Dit maakt automatisch een operationeel project aan voor de planner.
            Het prognose-project blijft bestaan en wordt er aan gekoppeld.
          </p>
          {fout && <p className="text-xs text-red-600 mb-4">{fout}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setInOpdrachtConfirm(false); setFout(null) }}
              className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              onClick={handleInOpdracht}
              disabled={bezig}
              className="flex-1 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {bezig ? 'Bezig…' : 'Bevestigen'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Hoofd-formulier ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" onClick={onClose}>
      <div
        className="bg-white w-full h-full overflow-y-auto sm:h-auto sm:rounded-2xl sm:shadow-2xl sm:max-w-sm sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            {isBewerk ? 'Project bewerken' : 'Nieuw project'}
          </h2>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors text-base leading-none">✕</button>
        </div>

        <form onSubmit={handleOpslaan} className="p-5 space-y-4">

          {/* Omschrijving */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Omschrijving *</label>
            <input
              type="text"
              autoFocus
              value={omschrijving}
              onChange={(e) => setOmschrijving(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
              placeholder="Projectnaam of korte omschrijving"
            />
          </div>

          {/* Projectnummer */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Projectnummer</label>
            <input
              type="text"
              value={projectnummer}
              onChange={(e) => setProjectnummer(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
              placeholder="Optioneel"
            />
          </div>

          {/* Opdrachtgever */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Opdrachtgever</label>
            <input
              type="text"
              value={opdrachtgever}
              onChange={(e) => setOpdrachtgever(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
              placeholder="Optioneel"
            />
          </div>

          {/* Projectleider */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Projectleider</label>
            <select
              value={projectleiderId}
              onChange={(e) => setProjectleiderId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors bg-white"
            >
              <option value="">— Geen —</option>
              {profielen.map((p) => (
                <option key={p.id} value={p.id}>{p.weergave_naam}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
            <div className="flex rounded-xl border border-gray-200 overflow-hidden">
              {[
                { value: 'in_opdracht', label: 'In opdracht' },
                { value: 'potentieel',  label: 'Potentieel' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    status === value ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Aanneemsom */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Aanneemsom</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
              <input
                type="number"
                min="0"
                step="1"
                value={aanneemsom}
                onChange={(e) => setAanneemsom(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          {/* Startweek + Duur — preview op eigen regel zodat inputs altijd gelijk staan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500">Startweek</label>
              <p className="text-[10px] text-gray-400 mb-1.5">{startWeekLabel}</p>
              <input
                type="date"
                value={startD}
                onChange={(e) => handleStartDatum(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Duur (weken)</label>
              <p className="text-[10px] text-gray-400 mb-1.5">t/m {eindWeekLabel}</p>
              <input
                type="number"
                min="1"
                step="1"
                value={duurWeken}
                onChange={(e) => setDuurWeken(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
                placeholder="1"
              />
            </div>
          </div>

          {/* Kleur — chip toont huidige kleur, "Wijzig" klapt swatches uit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Kleur</label>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: kleur }} />
                <button
                  type="button"
                  onClick={() => setKiesKleur((v) => !v)}
                  className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {kiesKleur ? 'Verberg' : 'Wijzig'}
                </button>
              </div>
            </div>
            {kiesKleur && (
              <div className="flex flex-wrap gap-1.5">
                {KLEURENPALET.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setKleur(c)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      kleur === c ? 'ring-2 ring-offset-1 ring-gray-500 scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Fout */}
          {fout && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">{fout}</div>
          )}

          {/* Opslaan + Verwijder */}
          <div className="flex gap-3 pt-1">
            {isBewerk && (
              <button
                type="button"
                onClick={() => verwijderConfirm ? handleVerwijder() : setVerwijderConfirm(true)}
                disabled={bezig}
                className={`py-2.5 px-4 text-xs font-medium rounded-xl transition-colors disabled:opacity-50 ${
                  verwijderConfirm
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'text-red-400 border border-red-200 hover:bg-red-50'
                }`}
              >
                {verwijderConfirm ? 'Zeker weten?' : 'Verwijder'}
              </button>
            )}
            <button
              type="submit"
              disabled={bezig}
              className="flex-1 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {bezig ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>

          {/* In opdracht zetten — alleen als nog geen operationeel project gekoppeld */}
          {isBewerk && !project.operationeel_project_id && (
            <button
              type="button"
              onClick={() => setInOpdrachtConfirm(true)}
              className="w-full py-2 text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Project in opdracht zetten →
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
