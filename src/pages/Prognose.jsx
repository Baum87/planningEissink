import { useState, useMemo, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth, kanPrognose } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
import { usePrognoseProjecten, usePeriodes } from '../hooks/queries'
import { projKleur, minstGebruikteKleur } from '../lib/kleurenpalet'
import { avatarKleur } from '../lib/avatar'
import { getMaandag, naarStr, isoWeek, plusDagen } from '../lib/datum'
import {
  createPrognoseProject,
  updatePrognoseProject,
  deletePrognoseProject,
  setInOpdracht,
} from '../services/prognoseService'
import PrognoseModal from '../components/PrognoseModal'

// ─── Constanten ───────────────────────────────────────────────────────────────

const NAAM_B   = 280
const WEEK_B   = 85
const WEKEN    = 26
const ROW_H    = 48
const HEADER_H = 40
const NAV_STAP = 4

// ─── Hulpfuncties ─────────────────────────────────────────────────────────────

function compactBedrag(val) {
  if (!val || val === 0) return ''
  if (val >= 1_000_000) return `€${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000)     return `€${Math.round(val / 1_000)}k`
  return `€${Math.round(val)}`
}

function weekOverlaptPeriode(weekStart, periode) {
  const pVan  = new Date(periode.datum_van + 'T00:00:00')
  const pTot  = new Date(periode.datum_tot + 'T00:00:00')
  pTot.setDate(pTot.getDate() + 1) // datum_tot is inclusief
  const wEind = new Date(weekStart)
  wEind.setDate(wEind.getDate() + 7)
  return pVan < wEind && pTot > weekStart
}

function overlapt(project, weekStart, bouwvakSet = new Set()) {
  if (!project.start_datum || !project.duur_weken) return false
  const pStart = new Date(project.start_datum + 'T00:00:00')
  const wEind  = new Date(weekStart)
  wEind.setDate(wEind.getDate() + 7)
  if (pStart >= wEind) return false

  if (project.door_bouwvak) {
    const pEind = new Date(pStart)
    pEind.setDate(pEind.getDate() + project.duur_weken * 7)
    return pEind > weekStart
  }

  // Werkweken: geen balk in bouwvak-week
  const weekStr = naarStr(weekStart)
  if (bouwvakSet.has(weekStr)) return false

  // Tel niet-bouwvak-weken van projectstart tot deze week
  let werkWekenVoor = 0
  const cur = new Date(pStart)
  while (naarStr(cur) !== weekStr) {
    if (!bouwvakSet.has(naarStr(cur))) werkWekenVoor++
    cur.setDate(cur.getDate() + 7)
  }
  return werkWekenVoor < project.duur_weken
}

// ─── Prognose ─────────────────────────────────────────────────────────────────

export default function Prognose() {
  const { rol } = useAuth()
  const { tenant } = useTenant()
  const queryClient = useQueryClient()

  const [startDatum, setStartDatum] = useState(() => getMaandag(new Date()))
  const [toonPotentieel, setToonPotentieel] = useState(true)
  const [toonWeekbedrag, setToonWeekbedrag] = useState(true)
  const [filterPl, setFilterPl] = useState('')
  const [modal, setModal] = useState(null)
  const [drag, setDrag] = useState(null) // { project, startX, startScrollLeft, weekDelta }
  const [editDuur, setEditDuur] = useState(null) // { projectId, waarde }
  const containerRef = useRef(null)
  const wasDragged = useRef(false)

  const van = naarStr(startDatum)
  const tot = naarStr(plusDagen(startDatum, WEKEN * 7))
  const { data: projecten = [], isLoading, error } = usePrognoseProjecten(van, tot)
  const { data: periodes = [] } = usePeriodes()

  const weken = useMemo(
    () => Array.from({ length: WEKEN }, (_, i) => {
      const d = new Date(startDatum)
      d.setDate(d.getDate() + i * 7)
      return d
    }),
    [startDatum]
  )

  const periodeLabel = useMemo(() => {
    const w1 = isoWeek(weken[0])
    const w2 = isoWeek(weken[WEKEN - 1])
    const j1 = weken[0].getFullYear()
    const j2 = weken[WEKEN - 1].getFullYear()
    return j1 === j2
      ? `Wk ${w1} – Wk ${w2} · ${j1}`
      : `Wk ${w1} · ${j1} – Wk ${w2} · ${j2}`
  }, [weken])

  const alleProjectleiders = useMemo(() => {
    const map = new Map()
    projecten.forEach((p) => {
      if (p.projectleider) map.set(p.projectleider.id, p.projectleider)
    })
    return [...map.values()].sort((a, b) => (a.afkorting ?? '').localeCompare(b.afkorting ?? ''))
  }, [projecten])

  const rijen = useMemo(() => {
    let gefilterd = toonPotentieel
      ? projecten
      : projecten.filter((p) => p.status !== 'potentieel')
    if (filterPl) gefilterd = gefilterd.filter((p) => p.projectleider_id === filterPl)
    return [...gefilterd].sort((a, b) => {
      const afkA = a.projectleider?.afkorting ?? 'zzz'
      const afkB = b.projectleider?.afkorting ?? 'zzz'
      if (afkA !== afkB) return afkA.localeCompare(afkB)
      // Binnen zelfde PL: projecten met startdatum voor projecten zonder
      if (!!a.start_datum !== !!b.start_datum) return a.start_datum ? -1 : 1
      return a.omschrijving.localeCompare(b.omschrijving)
    })
  }, [projecten, toonPotentieel, filterPl])

  const weekInfo = useMemo(() =>
    weken.map((weekStart) => {
      const bouwvak    = periodes.filter(p => p.blokkeer === false && weekOverlaptPeriode(weekStart, p))
      const feestdagen = periodes.filter(p => p.blokkeer !== false && weekOverlaptPeriode(weekStart, p))
      return { isBouwvak: bouwvak.length > 0, feestdagen }
    }),
    [weken, periodes]
  )

  const bouwvakWeekenSet = useMemo(() => {
    const set = new Set()
    periodes.filter(p => p.blokkeer === false).forEach(p => {
      const cur = getMaandag(new Date(p.datum_van + 'T00:00:00'))
      const tot = new Date(p.datum_tot + 'T00:00:00')
      while (cur <= tot) { set.add(naarStr(cur)); cur.setDate(cur.getDate() + 7) }
    })
    return set
  }, [periodes])

  const totaalPerWeek = useMemo(() =>
    weken.map((wk) =>
      rijen.reduce((som, p) => {
        if (!p.aanneemsom || !overlapt(p, wk, bouwvakWeekenSet)) return som
        return som + Number(p.aanneemsom) / p.duur_weken
      }, 0)
    ),
    [rijen, weken, bouwvakWeekenSet]
  )

  function navigeer(delta) {
    setStartDatum((d) => {
      const r = new Date(d)
      r.setDate(r.getDate() + delta * 7)
      return r
    })
  }

  // ── Drag ──────────────────────────────────────────────────────────────────

  function handleBarPointerDown(e, project) {
    e.preventDefault()
    e.stopPropagation()
    setDrag({
      project,
      startX: e.clientX,
      startScrollLeft: containerRef.current?.scrollLeft ?? 0,
      weekDelta: 0,
    })
  }

  useEffect(() => {
    if (!drag) return

    function handlePointerMove(e) {
      const currentScroll = containerRef.current?.scrollLeft ?? 0
      const totalDeltaX = (e.clientX - drag.startX) + (currentScroll - drag.startScrollLeft)
      const weekDelta = Math.round(totalDeltaX / WEEK_B)
      setDrag((d) => d ? { ...d, weekDelta } : d)
    }

    async function handlePointerUp() {
      if (drag.weekDelta !== 0) {
        wasDragged.current = true
        const d = new Date(drag.project.start_datum + 'T00:00:00')
        d.setDate(d.getDate() + drag.weekDelta * 7)
        const nieuweStartDate = getMaandag(d)
        // Snap voorbij bouwvak als project niet doorloopt
        if (!drag.project.door_bouwvak) {
          while (bouwvakWeekenSet.has(naarStr(nieuweStartDate))) {
            nieuweStartDate.setDate(nieuweStartDate.getDate() + 7)
          }
        }
        try {
          await updatePrognoseProject(drag.project.id, { start_datum: naarStr(nieuweStartDate) })
          await queryClient.invalidateQueries({ queryKey: ['prognose-projecten'] })
        } catch {
          // project springt terug naar originele positie via query invalidation
        }
      }
      setDrag(null)
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') setDrag(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [drag, bouwvakWeekenSet])

  async function handleDuurOpslaan() {
    if (!editDuur) return
    const weken = parseInt(editDuur.waarde, 10)
    if (!weken || weken < 1) { setEditDuur(null); return }
    setEditDuur(null)
    try {
      await updatePrognoseProject(editDuur.projectId, { duur_weken: weken })
      await queryClient.invalidateQueries({ queryKey: ['prognose-projecten'] })
    } catch {
      // project springt terug via query invalidation
    }
  }

  // ── Modals openen ─────────────────────────────────────────────────────────

  function openNieuw(startD) {
    setModal({
      type: 'nieuw',
      startDatum: startD,
      autoKleur: minstGebruikteKleur(projecten),
    })
  }

  function openBewerk(project) {
    setModal({ type: 'bewerk', project })
  }

  // ── Handlers (alle async, invalidate awaited) ─────────────────────────────

  async function handleSave(velden) {
    if (modal.type === 'bewerk') {
      await updatePrognoseProject(modal.project.id, velden)
    } else {
      await createPrognoseProject(velden)
    }
    await queryClient.invalidateQueries({ queryKey: ['prognose-projecten'] })
  }

  async function handleVerwijder() {
    await deletePrognoseProject(modal.project.id)
    await queryClient.invalidateQueries({ queryKey: ['prognose-projecten'] })
  }

  async function handleInOpdracht() {
    await setInOpdracht(modal.project.id)
    await queryClient.invalidateQueries({ queryKey: ['prognose-projecten'] })
  }

  // ─────────────────────────────────────────────────────────────────────────

  const kanWritten = kanPrognose(rol)

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">Laden…</div>
  )
  if (error) return (
    <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error.message}</div>
  )

  return (
    <div className="flex flex-col gap-3">

      {/* ── Print-only header ─────────────────────────────────────────────────── */}
      <div className="hidden print:flex items-center gap-3 mb-2">
        {tenant?.logo_url && (
          <img src={tenant.logo_url} alt="" className="h-8 w-8 object-contain rounded" />
        )}
        <div>
          <div className="text-xs text-gray-500">{tenant?.naam}</div>
          <div className="text-sm font-semibold text-gray-900">Prognose planning</div>
        </div>
        <span className="ml-4 text-sm text-gray-500">{periodeLabel}</span>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div className="print:hidden flex items-center gap-3 flex-wrap">

        {/* PL filter — verschijnt zodra er projecten met een PL zijn */}
        {alleProjectleiders.length > 0 && (
          <select
            value={filterPl}
            onChange={(e) => setFilterPl(e.target.value)}
            className="print:hidden px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white text-gray-600"
          >
            <option value="">Alle PL</option>
            {alleProjectleiders.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.afkorting}</option>
            ))}
          </select>
        )}

        {/* Navigatie */}
        <div className="print:hidden flex items-center gap-0.5">
          <button
            onClick={() => navigeer(-NAV_STAP)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-lg leading-none"
          >‹</button>
          <button
            onClick={() => setStartDatum(getMaandag(new Date()))}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >Vandaag</button>
          <button
            onClick={() => navigeer(NAV_STAP)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-lg leading-none"
          >›</button>
        </div>

        <span className="print:hidden text-sm font-semibold text-gray-700">{periodeLabel}</span>

        <div className="print:hidden ml-auto flex items-center gap-4">
          {/* Toggle Potentieel */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-gray-500">Potentieel</span>
            <button
              type="button"
              role="switch"
              aria-checked={toonPotentieel}
              onClick={() => setToonPotentieel((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
                toonPotentieel ? 'bg-gray-800' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                  toonPotentieel ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          {/* Toggle Weekbedrag */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-gray-500">Weekbedrag</span>
            <button
              type="button"
              role="switch"
              aria-checked={toonWeekbedrag}
              onClick={() => setToonWeekbedrag((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
                toonWeekbedrag ? 'bg-gray-800' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                  toonWeekbedrag ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
            title="Afdrukken op A0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6V2h8v4" />
              <rect x="2" y="6" width="12" height="7" rx="1.5" />
              <path d="M4 10h8M4 13h5" />
            </svg>
            Afdrukken
          </button>

          {kanWritten && (
            <button
              onClick={() => openNieuw(undefined)}
              className="px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              + Nieuw project
            </button>
          )}
        </div>
      </div>

      {/* ── Grid — zelfde container-aanpak als Planning ───────────────────────── */}
      <div
        ref={containerRef}
        className="border border-gray-200 rounded-xl overflow-auto prognose-scroll-container"
        style={{ maxHeight: 'calc(100vh - 160px)', userSelect: drag ? 'none' : 'auto' }}
      >
        <div style={{ minWidth: NAAM_B + WEKEN * WEEK_B }}>

          {/* Week-header — sticky binnen de scrollbare container */}
          <div
            className="sticky top-0 z-20 flex bg-gray-50 border-b border-gray-200"
            style={{ height: HEADER_H }}
          >
            <div
              className="sticky left-0 z-30 bg-gray-50 border-r border-gray-100 shrink-0 flex items-center px-4"
              style={{ width: NAAM_B }}
            >
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Project</span>
            </div>
            {weken.map((d, i) => {
              const info = weekInfo[i]
              return (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center border-l border-gray-100 shrink-0 ${info?.isBouwvak ? 'bg-amber-100' : ''}`}
                  style={{ width: WEEK_B }}
                >
                  {info?.isBouwvak ? (
                    <>
                      <span className="text-[10px] text-amber-700 font-medium leading-none uppercase tracking-wide">Bouwvak</span>
                      <span className="text-[11px] font-semibold text-gray-600 leading-none mt-0.5">Wk {isoWeek(d)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-gray-400 leading-none">{d.getFullYear()}</span>
                      <span className="text-[11px] font-semibold text-gray-600 leading-none mt-0.5 flex items-center gap-0.5">
                        Wk {isoWeek(d)}
                        {info?.feestdagen.length > 0 && (
                          <span
                            title={info.feestdagen.map(f => f.naam).join(', ')}
                            className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"
                          />
                        )}
                      </span>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Lege staat */}
          {rijen.length === 0 && (
            <div className="flex items-center justify-center py-20 text-sm text-gray-400">
              {kanWritten && !filterPl
                ? 'Nog geen projecten — klik op "+ Nieuw project" om te beginnen.'
                : 'Geen projecten gevonden.'}
            </div>
          )}

          {/* Projectrijen */}
          {rijen.map((project) => {
            const pl = project.projectleider
            // avatarKleur vereist een niet-lege string — 'Z' als fallback bij ontbrekende PL
            const [bg, fg] = avatarKleur(pl?.weergave_naam || 'Z', pl?.avatar_kleur)
            const afk   = pl?.afkorting ?? '—'
            const kleur = projKleur(project)

            const isDragging = drag?.project.id === project.id
            const effectiefProject = isDragging && drag.weekDelta !== 0 && project.start_datum
              ? (() => {
                  const d = new Date(project.start_datum + 'T00:00:00')
                  d.setDate(d.getDate() + drag.weekDelta * 7)
                  const snapDate = getMaandag(d)
                  if (!project.door_bouwvak) {
                    while (bouwvakWeekenSet.has(naarStr(snapDate))) {
                      snapDate.setDate(snapDate.getDate() + 7)
                    }
                  }
                  return { ...project, start_datum: naarStr(snapDate) }
                })()
              : project

            return (
              <div
                key={project.id}
                className={`flex border-b border-gray-100 hover:bg-gray-50/50 group ${isDragging ? 'opacity-75' : ''}`}
                style={{ height: ROW_H }}
              >
                {/* Linker infocolom */}
                <div
                  className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-r border-gray-100 flex items-center gap-2 px-3 shrink-0 select-none"
                  style={{ width: NAAM_B }}
                >
                  {/* Drag + modal zone: avatar + naam */}
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0"
                    style={{ cursor: kanWritten ? (isDragging ? 'grabbing' : 'pointer') : 'default' }}
                    onPointerDown={(e) => kanWritten && handleBarPointerDown(e, project)}
                    onClick={() => {
                      if (wasDragged.current) { wasDragged.current = false; return }
                      kanWritten && openBewerk(project)
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      {afk}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900 truncate">{project.omschrijving}</div>
                      {project.opdrachtgever && (
                        <div className="text-[10px] text-gray-400 truncate">{project.opdrachtgever}</div>
                      )}
                    </div>
                  </div>

                  {/* Aanneemsom + duur chip */}
                  <div className="flex flex-col items-end shrink-0 gap-0.5">
                    {project.aanneemsom && (
                      <span className="text-xs font-medium text-gray-600">
                        {compactBedrag(Number(project.aanneemsom))}
                      </span>
                    )}
                    {editDuur?.projectId === project.id ? (
                      <input
                        type="number"
                        min="1"
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        value={editDuur.waarde}
                        onChange={(e) => setEditDuur((d) => ({ ...d, waarde: e.target.value }))}
                        onBlur={handleDuurOpslaan}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleDuurOpslaan()
                          if (e.key === 'Escape') setEditDuur(null)
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-10 px-1 py-0.5 text-xs border border-gray-400 rounded bg-white text-gray-900 outline-none text-center"
                      />
                    ) : (
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (kanWritten) setEditDuur({ projectId: project.id, waarde: String(project.duur_weken) })
                        }}
                        className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                          kanWritten
                            ? 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400 cursor-pointer'
                            : 'border-transparent text-gray-400 cursor-default'
                        }`}
                      >
                        {project.duur_weken != null ? `${project.duur_weken}w` : '—'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Week cellen */}
                {weken.map((weekStart, i) => {
                  const raakt = overlapt(effectiefProject, weekStart, bouwvakWeekenSet)
                  const info  = weekInfo[i]
                  return (
                    <div
                      key={i}
                      className={`border-l border-gray-100 shrink-0 flex items-center ${info?.isBouwvak ? 'bg-amber-50' : ''}`}
                      style={{ width: WEEK_B, height: ROW_H, cursor: !kanWritten ? 'default' : isDragging ? 'grabbing' : raakt ? 'grab' : 'default' }}
                      onPointerDown={(e) => { if (kanWritten && raakt) handleBarPointerDown(e, project) }}
                    >
                      {raakt && (
                        <div
                          className="w-full mx-0.5 rounded-sm flex items-center justify-center"
                          style={{
                            height: 20,
                            backgroundColor: kleur.bg,
                            ...(project.status === 'potentieel' ? {
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.5) 4px, rgba(255,255,255,0.5) 8px)',
                            } : {}),
                          }}
                        >
                          {toonWeekbedrag && project.status === 'in_opdracht' && project.aanneemsom && (
                            <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.5)', lineHeight: 1 }}>
                              {compactBedrag(Number(project.aanneemsom) / project.duur_weken)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Totaalregel */}
          {rijen.length > 0 && (
            <div
              className="flex bg-gray-50 border-t border-gray-200"
              style={{ height: ROW_H }}
            >
              <div
                className="sticky left-0 bg-gray-50 border-r border-gray-100 flex items-center px-3 shrink-0"
                style={{ width: NAAM_B }}
              >
                <span className="text-xs font-semibold text-gray-500">Aanneemsom / week</span>
              </div>
              {totaalPerWeek.map((som, i) => (
                <div
                  key={i}
                  className={`border-l border-gray-100 shrink-0 flex items-center justify-center ${weekInfo[i]?.isBouwvak ? 'bg-amber-50' : ''}`}
                  style={{ width: WEEK_B }}
                >
                  {som > 0 && (
                    <span className="text-[10px] font-medium text-gray-600">{compactBedrag(som)}</span>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {modal && (
        <PrognoseModal
          project={modal.type === 'bewerk' ? modal.project : null}
          startDatum={modal.startDatum}
          autoKleur={modal.autoKleur}
          onSave={handleSave}
          onVerwijder={handleVerwijder}
          onInOpdracht={handleInOpdracht}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
