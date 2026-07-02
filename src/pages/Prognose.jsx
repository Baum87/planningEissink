import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth, kanPrognose } from '../context/AuthContext'
import { usePrognoseProjecten } from '../hooks/queries'
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

function overlapt(project, weekStart) {
  const pStart = new Date(project.start_datum + 'T00:00:00')
  const pEind  = new Date(pStart)
  pEind.setDate(pEind.getDate() + project.duur_weken * 7)
  const wEind = new Date(weekStart)
  wEind.setDate(wEind.getDate() + 7)
  return pStart < wEind && pEind > weekStart
}

// ─── Prognose ─────────────────────────────────────────────────────────────────

export default function Prognose() {
  const { rol } = useAuth()
  const queryClient = useQueryClient()

  const [startDatum, setStartDatum] = useState(() => getMaandag(new Date()))
  const [toonPotentieel, setToonPotentieel] = useState(true)
  const [filterPl, setFilterPl] = useState('')
  const [modal, setModal] = useState(null)

  const van = naarStr(startDatum)
  const tot = naarStr(plusDagen(startDatum, WEKEN * 7))
  const { data: projecten = [], isLoading, error } = usePrognoseProjecten(van, tot)

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
      return a.omschrijving.localeCompare(b.omschrijving)
    })
  }, [projecten, toonPotentieel, filterPl])

  const totaalPerWeek = useMemo(() =>
    weken.map((wk) =>
      rijen.reduce((som, p) => {
        if (!p.aanneemsom || !overlapt(p, wk)) return som
        return som + Number(p.aanneemsom) / p.duur_weken
      }, 0)
    ),
    [rijen, weken]
  )

  function navigeer(delta) {
    setStartDatum((d) => {
      const r = new Date(d)
      r.setDate(r.getDate() + delta * 7)
      return r
    })
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

      {/* ── Toolbar ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">

        {/* PL filter — verschijnt zodra er projecten met een PL zijn */}
        {alleProjectleiders.length > 0 && (
          <select
            value={filterPl}
            onChange={(e) => setFilterPl(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white text-gray-600"
          >
            <option value="">Alle PL</option>
            {alleProjectleiders.map((pl) => (
              <option key={pl.id} value={pl.id}>{pl.afkorting}</option>
            ))}
          </select>
        )}

        {/* Navigatie */}
        <div className="flex items-center gap-0.5">
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

        <span className="text-sm font-semibold text-gray-700">{periodeLabel}</span>

        <div className="ml-auto flex items-center gap-4">
          {/* Toggle Potentieel — zelfde switch-stijl als Planning */}
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
        className="border border-gray-200 rounded-xl overflow-auto"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
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
            {weken.map((d, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center border-l border-gray-100 shrink-0"
                style={{ width: WEEK_B }}
              >
                <span className="text-[10px] text-gray-400 leading-none">{d.getFullYear()}</span>
                <span className="text-[11px] font-semibold text-gray-600 leading-none mt-0.5">Wk {isoWeek(d)}</span>
              </div>
            ))}
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
            const [bg, fg] = avatarKleur(pl?.weergave_naam || 'Z')
            const afk   = pl?.afkorting ?? '—'
            const kleur = projKleur(project)

            return (
              <div
                key={project.id}
                className="flex border-b border-gray-100 hover:bg-gray-50/50 group"
                style={{ height: ROW_H }}
              >
                {/* Linker infocolom: PL avatar — naam/opdrachtgever — aanneemsom/duur */}
                <div
                  className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 border-r border-gray-100 flex items-center gap-2 px-3 shrink-0"
                  style={{ width: NAAM_B, cursor: kanWritten ? 'pointer' : 'default' }}
                  onClick={() => kanWritten && openBewerk(project)}
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
                  <div className="text-right shrink-0 ml-1">
                    {project.aanneemsom && (
                      <div className="text-[10px] font-medium text-gray-600">
                        {compactBedrag(Number(project.aanneemsom))}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400">{project.duur_weken}w</div>
                  </div>
                </div>

                {/* Week cellen */}
                {weken.map((weekStart, i) => {
                  const raakt = overlapt(project, weekStart)
                  return (
                    <div
                      key={i}
                      className="border-l border-gray-100 shrink-0 flex items-center"
                      style={{ width: WEEK_B, height: ROW_H, cursor: kanWritten ? 'pointer' : 'default' }}
                      onClick={() => {
                        if (!kanWritten) return
                        if (raakt) openBewerk(project)
                        else openNieuw(naarStr(weekStart))
                      }}
                    >
                      {raakt && (
                        <div
                          className="w-full mx-0.5 rounded-sm"
                          style={{
                            height: 20,
                            backgroundColor: kleur.bg,
                            ...(project.status === 'potentieel' ? {
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.5) 4px, rgba(255,255,255,0.5) 8px)',
                            } : {}),
                          }}
                        />
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
                  className="border-l border-gray-100 shrink-0 flex items-center justify-center"
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
