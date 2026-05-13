import { useState, useEffect, useMemo } from 'react'
import { useAuth, isGebruiker } from '../context/AuthContext'
import { getMonteurs } from '../services/monteursService'
import { getToewijzingen } from '../services/toewijzingenService'
import { getProjecten } from '../services/projectenService'
import { getPeriodes } from '../services/periodesService'
import { projKleur } from '../lib/kleurenpalet'

// ─── Constanten ───────────────────────────────────────────────────────────────

const NAAM_B = 200
const DAG_B  = 100
const WEEK_H = 32
const DAG_H  = 40
const ROW_H  = 48

// ─── Hulpfuncties ─────────────────────────────────────────────────────────────

function getMaandag(d) {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  const dag = r.getDay()
  r.setDate(r.getDate() - (dag === 0 ? 6 : dag - 1))
  return r
}

function plusDagen(d, n) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function naarStr(d) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dow = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - dow)
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t - y) / 86400000 + 1) / 7)
}

function fDag(d) {
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
}

function fDagNaam(d) {
  return d.toLocaleDateString('nl-NL', { weekday: 'short' }).slice(0, 2)
}

function fDatumLang(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── Overzicht ────────────────────────────────────────────────────────────────

export default function Overzicht() {
  const { rol, initialen } = useAuth()
  const vandaag = naarStr(new Date())
  const [startDatum, setStartDatum] = useState(() => getMaandag(new Date()))
  const [toonWeekend, setToonWeekend] = useState(false)
  const [monteurs, setMonteurs] = useState([])
  const [toewijzingen, setToewijzingen] = useState([])
  const [projecten, setProjecten] = useState([])
  const [periodes, setPeriodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [popup, setPopup] = useState(null)
  const [filterProjectleider, setFilterProjectleider] = useState(
    () => isGebruiker(rol) ? (initialen ?? '') : ''
  )
  const [toonUitgebreid, setToonUitgebreid] = useState(false)

  // ── Datum berekeningen ──────────────────────────────────────────────────────

  const aantalDagen = toonUitgebreid ? 56 : 21
  const dagBreedte = toonUitgebreid ? 40 : DAG_B

  const alleDagen = useMemo(
    () => Array.from({ length: aantalDagen }, (_, i) => plusDagen(startDatum, i)),
    [startDatum, aantalDagen]
  )

  const zDagen = useMemo(
    () => alleDagen.filter((d) => toonWeekend || (d.getDay() !== 0 && d.getDay() !== 6)),
    [alleDagen, toonWeekend]
  )

  const weekGroepen = useMemo(() => {
    const gs = []
    let cur = null
    zDagen.forEach((d) => {
      const wk = isoWeek(d)
      if (wk !== cur) { gs.push({ wk, dagen: [d] }); cur = wk }
      else gs[gs.length - 1].dagen.push(d)
    })
    return gs
  }, [zDagen])

  const periodeLabel = useMemo(() => {
    const wks = [...new Set(alleDagen.map(isoWeek))]
    return wks.length === 1 ? `Wk ${wks[0]}` : `Wk ${wks[0]} – ${wks[wks.length - 1]}`
  }, [alleDagen])

  // ── Data laden ─────────────────────────────────────────────────────────────

  async function laad() {
    setLoading(true)
    setError(null)
    try {
      const van = naarStr(startDatum)
      const tot = naarStr(plusDagen(startDatum, aantalDagen - 1))
      const [m, tv, p, per] = await Promise.all([
        getMonteurs(),
        getToewijzingen(van, tot),
        getProjecten(),
        getPeriodes(),
      ])
      setMonteurs(m)
      setToewijzingen(tv)
      setProjecten(p)
      setPeriodes(per)
    } catch {
      setError('Kon overzicht niet ophalen. Controleer de verbinding.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    laad()
  }, [startDatum, toonUitgebreid])

  // ── Data verwerking ────────────────────────────────────────────────────────

  // projectId → dagStr → [monteurId, ...]
  const projectDagMap = useMemo(() => {
    const periodeVan = naarStr(startDatum)
    const periodeTot = naarStr(plusDagen(startDatum, aantalDagen - 1))
    const map = new Map()

    toewijzingen.forEach((tv) => {
      if (!map.has(tv.project_id)) map.set(tv.project_id, new Map())
      const dagMap = map.get(tv.project_id)

      // Itereer alleen over de overlap met de zichtbare periode
      const start = tv.datum_van > periodeVan ? tv.datum_van : periodeVan
      const eind  = tv.datum_tot < periodeTot ? tv.datum_tot : periodeTot

      let cur = new Date(start + 'T00:00:00')
      const eindD = new Date(eind + 'T00:00:00')

      while (cur <= eindD) {
        const s = naarStr(cur)
        if (!dagMap.has(s)) dagMap.set(s, [])
        dagMap.get(s).push(tv.monteur_id)
        cur = plusDagen(cur, 1)
      }
    })

    return map
  }, [toewijzingen, startDatum, aantalDagen])

  const alleInitialen = useMemo(
    () => [...new Set(projecten.map((p) => p.projectleider_initialen).filter(Boolean))].sort(),
    [projecten]
  )

  const periodeMap = useMemo(() => {
    const map = new Map()
    for (const p of periodes) {
      let cur = new Date(p.datum_van + 'T00:00:00')
      const eind = new Date(p.datum_tot + 'T00:00:00')
      while (cur <= eind) {
        const str = naarStr(cur)
        if (!map.has(str)) map.set(str, p)
        cur.setDate(cur.getDate() + 1)
      }
    }
    return map
  }, [periodes])

  // Projecten die op minimaal één zichtbare dag een toewijzing hebben
  const zichtbareProjecten = useMemo(() => {
    const dagStrs = new Set(zDagen.map(naarStr))
    const projMap = Object.fromEntries(projecten.map((p) => [p.id, p]))

    return [...projectDagMap.entries()]
      .filter(([, dagMap]) => [...dagMap.keys()].some((d) => dagStrs.has(d)))
      .map(([id]) => projMap[id])
      .filter(Boolean)
      .filter((p) => !filterProjectleider || p.projectleider_initialen === filterProjectleider)
      .sort((a, b) =>
        String(a.werknummer ?? '').localeCompare(String(b.werknummer ?? ''), 'nl')
      )
  }, [projectDagMap, zDagen, projecten, filterProjectleider])

  const monteursMap = useMemo(
    () => Object.fromEntries(monteurs.map((m) => [m.id, m])),
    [monteurs]
  )

  function popupMonteurs(projectId, dagStr) {
    const ids = projectDagMap.get(projectId)?.get(dagStr) ?? []
    return ids.map((id) => monteursMap[id]).filter(Boolean)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setStartDatum((d) => plusDagen(d, -aantalDagen))}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-lg leading-none"
          >
            ‹
          </button>
          <button
            onClick={() => setStartDatum(getMaandag(new Date()))}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            Vandaag
          </button>
          <button
            onClick={() => setStartDatum((d) => plusDagen(d, aantalDagen))}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-lg leading-none"
          >
            ›
          </button>
        </div>

        <span className="text-sm font-semibold text-gray-700">{periodeLabel}</span>

        <select
          value={filterProjectleider}
          onChange={(e) => setFilterProjectleider(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white text-gray-600"
        >
          <option value="">Alle PL</option>
          {alleInitialen.map((ini) => (
            <option key={ini} value={ini}>{ini}</option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-gray-500">8 weken</span>
            <button
              type="button"
              role="switch"
              aria-checked={toonUitgebreid}
              onClick={() => setToonUitgebreid((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
                toonUitgebreid ? 'bg-gray-800' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                  toonUitgebreid ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-gray-500">Weekend</span>
            <button
              type="button"
              role="switch"
              aria-checked={toonWeekend}
              onClick={() => setToonWeekend((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
                toonWeekend ? 'bg-gray-800' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                  toonWeekend ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      <div
        className="border border-gray-200 rounded-xl overflow-auto"
        style={{ maxHeight: 'calc(100vh - 185px)' }}
      >
        <div>
          {/* Week-header */}
          <div
            className="sticky top-0 z-20 flex bg-white border-b border-gray-200"
            style={{ height: WEEK_H }}
          >
            <div
              className="sticky left-0 z-30 bg-white border-r border-gray-100 shrink-0"
              style={{ width: NAAM_B }}
            />
            {weekGroepen.map((wg) => (
              <div
                key={wg.wk}
                className="border-l border-gray-100 flex items-center px-3"
                style={{ flex: wg.dagen.length, minWidth: wg.dagen.length * dagBreedte }}
              >
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Wk {wg.wk}
                </span>
              </div>
            ))}
          </div>

          {/* Dag-header */}
          <div
            className="sticky z-20 flex bg-gray-50 border-b border-gray-200"
            style={{ top: WEEK_H, height: DAG_H }}
          >
            <div
              className="sticky left-0 z-30 bg-gray-50 border-r border-gray-100 shrink-0"
              style={{ width: NAAM_B }}
            />
            {zDagen.map((d) => {
              const str = naarStr(d)
              const isVandaag = str === vandaag
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              const isPeriode = !isWeekend && periodeMap.has(str)
              return (
                <div
                  key={str}
                  className={`border-l border-gray-100 shrink-0 flex flex-col items-center justify-center gap-0.5 ${
                    isWeekend ? 'bg-gray-100' : isPeriode ? 'bg-amber-100' : ''
                  }`}
                  style={{ flex: 1, minWidth: dagBreedte }}
                >
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide leading-none">
                    {fDagNaam(d)}
                  </span>
                  <span
                    className={`text-xs font-semibold leading-none ${
                      isVandaag ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {fDag(d)}
                  </span>
                  {isVandaag && (
                    <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Laden */}
          {loading && (
            <div className="py-20 text-center text-sm text-gray-400">
              Overzicht laden…
            </div>
          )}

          {/* Project rijen */}
          {!loading && zichtbareProjecten.map((project) => {
            const kleur  = projKleur(project)
            const dagMap = projectDagMap.get(project.id) ?? new Map()

            return (
              <div
                key={project.id}
                className="flex border-b border-gray-100 last:border-b-0"
                style={{ height: ROW_H }}
              >
                {/* Naam cel */}
                <div
                  className="sticky left-0 z-10 bg-white border-r border-gray-100 flex flex-col justify-center px-3 shrink-0"
                  style={{ width: NAAM_B }}
                >
                  <div className="text-xs font-semibold text-gray-900 font-mono truncate leading-tight">
                    {project.werknummer}
                    {project.projectleider_initialen && (
                      <span className="font-sans font-medium text-gray-500">
                        {' · '}{project.projectleider_initialen}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate leading-tight">
                    {project.omschrijving}
                  </div>
                </div>

                {/* Dag cellen */}
                {zDagen.map((d) => {
                  const dagStr    = naarStr(d)
                  const isVandaag = dagStr === vandaag
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  const isPeriode = !isWeekend && periodeMap.has(dagStr)
                  const aantal    = (dagMap.get(dagStr) ?? []).length

                  if (aantal > 0) {
                    return (
                      <div
                        key={dagStr}
                        onClick={() => setPopup({ project, dag: dagStr })}
                        className="border-l border-white/40 flex items-center justify-center cursor-pointer hover:opacity-75 transition-opacity"
                        style={{
                          flex: 1,
                          minWidth: dagBreedte,
                          height: ROW_H,
                          backgroundColor: kleur.bg,
                        }}
                      >
                        <span className="text-sm font-semibold" style={{ color: kleur.fg }}>
                          {aantal}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={dagStr}
                      className={`border-l border-gray-100 ${
                        isVandaag ? 'bg-blue-50/30' : isWeekend ? 'bg-gray-50' : isPeriode ? 'bg-amber-50' : ''
                      }`}
                      style={{ flex: 1, minWidth: dagBreedte, height: ROW_H }}
                    />
                  )
                })}
              </div>
            )
          })}

          {!loading && zichtbareProjecten.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              Geen projecten met inplanningen in deze periode
            </div>
          )}
        </div>
      </div>

      {/* Detail popup */}
      {popup && (
        <DetailPopup
          project={popup.project}
          dag={popup.dag}
          monteurs={popupMonteurs(popup.project.id, popup.dag)}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}

// ─── DetailPopup ──────────────────────────────────────────────────────────────

function DetailPopup({ project, dag, monteurs, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-4 border-b border-gray-100">
          <div className="min-w-0 pr-4">
            <div className="text-xs text-gray-400 capitalize mb-0.5">
              {fDatumLang(dag)}
            </div>
            <div className="text-sm font-semibold text-gray-900 truncate">
              {project.werknummer} — {project.omschrijving}
            </div>
            {(project.adres || project.plaats) && (
              <div className="text-xs text-gray-500 mt-1">
                {[project.adres, project.plaats].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 text-base leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Monteurslijst */}
        <div className="p-5">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            {monteurs.length} monteur{monteurs.length !== 1 ? 's' : ''} ingepland
          </div>
          <ul className="space-y-2.5">
            {monteurs.map((m) => (
              <li key={m.id}>
                <div className="text-sm text-gray-900">
                  {[m.voornaam, m.achternaam].filter(Boolean).join(' ')}
                </div>
                {m.bedrijfsnaam && (
                  <div className="text-xs text-gray-400">{m.bedrijfsnaam}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
