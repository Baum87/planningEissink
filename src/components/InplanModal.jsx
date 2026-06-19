import { useState, useMemo } from 'react'
import { avatarKleur, monteurNaam, initialen } from '../lib/avatar'
import { projKleur } from '../lib/kleurenpalet'
import { fDatumLang, fBereikLang } from '../lib/datum'
import { berekenWerkdagen } from '../services/toewijzingenService'
import ProjectZoeker from './ProjectZoeker'

export default function InplanModal({ modal, projecten, kanInplannen, onInplannen, onVerwijder, onClose, onNaarProjecten, periodeData, onVerwijderPeriode, onWijzigPeriode, skipDagen }) {
  const isBewerk = modal.type === 'bewerk'
  const isGroep  = modal.type === 'groep'
  const { dag } = modal

  const [projectId, setProjectId] = useState('')
  const [van, setVan] = useState(dag)
  const [tot, setTot] = useState(dag)
  const [bezig, setBezig] = useState(false)
  const [periodeConfirm, setPeriodeConfirm] = useState(false)
  const [fout, setFout] = useState(null)
  const [wijzigModus, setWijzigModus] = useState(false)
  const [wijzigVan, setWijzigVan] = useState(periodeData?.van ?? dag)
  const [wijzigTot, setWijzigTot] = useState(periodeData?.tot ?? dag)

  const [avgBg, avgFg] = avatarKleur(isGroep ? modal.groep?.naam ?? '' : monteurNaam(modal.monteur ?? {}))

  const heeftPeriode = isBewerk && periodeData && periodeData.aantalDagen > 1

  const werkdagenPreview = useMemo(() => {
    if (!wijzigModus) return null
    return berekenWerkdagen(wijzigVan, wijzigTot, skipDagen ?? new Set())
  }, [wijzigModus, wijzigVan, wijzigTot, skipDagen])

  const overgeslagenPreview = useMemo(() => {
    if (!wijzigModus || !werkdagenPreview) return 0
    const zonder = berekenWerkdagen(wijzigVan, wijzigTot)
    return zonder.length - werkdagenPreview.length
  }, [wijzigModus, wijzigVan, wijzigTot, werkdagenPreview])

  async function handleVerwijderDag() {
    setBezig(true); setFout(null)
    try { await onVerwijder(modal.tv.id) }
    catch (err) { setFout(err.message); setBezig(false) }
  }

  async function handleVerwijderPeriode() {
    setBezig(true); setFout(null)
    try { await onVerwijderPeriode(periodeData.ids) }
    catch (err) { setFout(err.message); setBezig(false) }
  }

  async function handleWijzigen() {
    setBezig(true); setFout(null)
    try { await onWijzigPeriode(periodeData.ids, wijzigVan, wijzigTot) }
    catch (err) { setFout(err.message); setBezig(false) }
  }

  // ── Modus 1: bestaande toewijzing bekijken / wijzigen ─────────────────────
  if (isBewerk) {
    const kleur   = projKleur(modal.tv.projecten)
    const project = modal.tv.projecten

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" onClick={wijzigModus ? undefined : onClose}>
        <div className="bg-white w-full h-full overflow-y-auto sm:h-auto sm:rounded-2xl sm:shadow-2xl sm:max-w-sm sm:mx-4 sm:overflow-hidden" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center gap-3 p-5 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ backgroundColor: avgBg, color: avgFg }}>
              {initialen(monteurNaam(modal.monteur))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">{monteurNaam(modal.monteur)}</div>
              <div className="text-xs text-gray-400 capitalize">
                {wijzigModus ? 'Periode wijzigen' : fDatumLang(dag)}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 text-base leading-none ml-2">✕</button>
          </div>

          {/* Project badge */}
          <div className="px-5 pt-5">
            <div className="rounded-xl p-4" style={{ backgroundColor: kleur.bg }}>
              <div className="text-xs font-bold leading-snug" style={{ color: kleur.fg }}>
                {project?.werknummer}
                {project?.projectleider_initialen && (
                  <span className="font-normal opacity-75"> · {project.projectleider_initialen}</span>
                )}
              </div>
              <div className="text-sm mt-0.5 leading-snug font-medium" style={{ color: kleur.fg }}>
                {project?.omschrijving}
              </div>
              {project?.plaats && (
                <div className="text-xs mt-1.5" style={{ color: kleur.fg, opacity: 0.65 }}>{project.plaats}</div>
              )}
            </div>
          </div>

          {/* Wijzig modus */}
          {wijzigModus ? (
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Van</label>
                  <input
                    type="date"
                    value={wijzigVan}
                    onChange={(e) => { setWijzigVan(e.target.value); if (e.target.value > wijzigTot) setWijzigTot(e.target.value) }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tot</label>
                  <input
                    type="date"
                    value={wijzigTot}
                    min={wijzigVan}
                    onChange={(e) => setWijzigTot(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              </div>

              {werkdagenPreview !== null && (
                <p className="text-xs text-gray-500">
                  {werkdagenPreview.length === 0
                    ? <span className="text-red-500">Geen werkdagen in deze periode</span>
                    : <>
                        {werkdagenPreview.length} werkdag{werkdagenPreview.length !== 1 ? 'en' : ''}
                        {overgeslagenPreview > 0 && (
                          <span className="text-amber-600">
                            {' · '}{overgeslagenPreview} dag{overgeslagenPreview !== 1 ? 'en' : ''} overgeslagen (feestdag)
                          </span>
                        )}
                      </>
                  }
                </p>
              )}

              {fout && <p className="text-xs text-red-600">{fout}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setWijzigModus(false); setFout(null) }}
                  disabled={bezig}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={handleWijzigen}
                  disabled={bezig || !werkdagenPreview || werkdagenPreview.length === 0}
                  className="flex-1 px-4 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {bezig ? 'Opslaan…' : werkdagenPreview ? `Opslaan — ${werkdagenPreview.length}d` : 'Opslaan'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-3">
              {/* Periode info */}
              {heeftPeriode && (
                <p className="text-xs text-gray-500">
                  Ingepland van{' '}
                  <span className="font-medium text-gray-700">{fBereikLang(periodeData.van, periodeData.tot)}</span>
                  {' '}
                  <span className="text-gray-400">({periodeData.aantalDagen} dagen)</span>
                </p>
              )}

              {/* Knoppen — alleen voor beheerder/planner */}
              {kanInplannen && (
                <div className="flex flex-col gap-2">
                  {heeftPeriode && (
                    periodeConfirm ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 rounded-xl border border-red-100">
                        <span className="text-xs text-red-600 flex-1">Zeker? {periodeData.aantalDagen} dagen verwijderen</span>
                        <button type="button" onClick={handleVerwijderPeriode} disabled={bezig} className="text-xs font-semibold text-red-600 hover:text-red-800 px-2 transition-colors">Ja</button>
                        <span className="text-gray-300 text-xs select-none">·</span>
                        <button type="button" onClick={() => setPeriodeConfirm(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2 transition-colors">Nee</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setPeriodeConfirm(true)} disabled={bezig}
                        className="w-full px-4 py-2.5 text-sm text-red-400 border border-red-100 rounded-xl hover:bg-red-50 transition-colors text-left">
                        Verwijder periode <span className="text-xs text-red-300">({periodeData.aantalDagen} dagen)</span>
                      </button>
                    )
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={handleVerwijderDag} disabled={bezig}
                      className="flex-1 px-4 py-2.5 text-sm text-red-400 border border-red-100 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
                      {bezig ? 'Verwijderen…' : 'Verwijder dag'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWijzigModus(true)}
                      className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Wijzigen
                    </button>
                  </div>
                  {fout && <p className="text-xs text-red-600 pt-1">{fout}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Nieuw / Groep: toewijzing aanmaken ─────────────────────────────────────
  async function handleInplannen(e) {
    e.preventDefault()
    setBezig(true); setFout(null)
    try { await onInplannen(projectId, van, tot) }
    catch (err) { setFout(err.message) }
    finally { setBezig(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" onClick={onClose}>
      <div className="bg-white w-full h-full overflow-y-auto sm:h-auto sm:rounded-2xl sm:shadow-2xl sm:max-w-sm sm:mx-4 sm:max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-5 pb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ backgroundColor: avgBg, color: avgFg }}>
            {isGroep ? modal.groep.naam.slice(0, 2).toUpperCase() : initialen(monteurNaam(modal.monteur))}
          </div>
          <div className="flex-1 min-w-0">
            {isGroep ? (
              <>
                <div className="text-sm font-semibold text-gray-900">Groep: {modal.groep.naam}</div>
                <div className="text-xs text-gray-400">{modal.leden.length} leden worden ingepland · {fDatumLang(dag)}</div>
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-gray-900">{monteurNaam(modal.monteur)}</div>
                <div className="text-xs text-gray-400 capitalize">{fDatumLang(dag)}</div>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 text-base leading-none ml-2">✕</button>
        </div>

        <form onSubmit={handleInplannen} className="px-5 pb-5 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Project</label>
            <ProjectZoeker projecten={projecten} value={projectId} onChange={setProjectId} onNieuwProject={onNaarProjecten} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Van</label>
              <input type="date" required value={van} onChange={(e) => { setVan(e.target.value); if (e.target.value > tot) setTot(e.target.value) }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tot</label>
              <input type="date" required value={tot} min={van} onChange={(e) => setTot(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors" />
            </div>
          </div>
          {fout && <p className="text-xs text-red-600">{fout}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={bezig || !projectId}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {bezig ? 'Opslaan…' : isGroep ? `${modal.leden.length} leden inplannen` : 'Inplannen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
