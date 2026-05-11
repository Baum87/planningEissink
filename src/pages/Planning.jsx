import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth, heeftVolledigeToegang, isProjectleider } from '../context/AuthContext'
import { getMonteurs, getGroepen } from '../services/monteursService'
import {
  getToewijzingen,
  createToewijzing,
  deleteToewijzing,
} from '../services/toewijzingenService'
import { getProjecten } from '../services/projectenService'
import { getPeriodes } from '../services/periodesService'

// ─── Constanten ───────────────────────────────────────────────────────────────

const NAAM_B = 200
const DAG_B  = 100
const ROW_H  = 48
const WEEK_H = 32
const DAG_H  = 40

const VANDAAG = naarStr(new Date())

const PROJ_KLEUREN = [
  { bg: '#dbeafe', fg: '#1e40af' },
  { bg: '#dcfce7', fg: '#166534' },
  { bg: '#fef3c7', fg: '#92400e' },
  { bg: '#fce7f3', fg: '#9d174d' },
  { bg: '#ede9fe', fg: '#5b21b6' },
  { bg: '#ffedd5', fg: '#9a3412' },
  { bg: '#cffafe', fg: '#155e75' },
  { bg: '#d1fae5', fg: '#064e3b' },
]

const AVATAR_KLEUREN = [
  ['#dbeafe', '#1e40af'], ['#dcfce7', '#166534'], ['#fef3c7', '#92400e'],
  ['#fce7f3', '#9d174d'], ['#ede9fe', '#5b21b6'], ['#ffedd5', '#9a3412'],
  ['#cffafe', '#155e75'], ['#d1fae5', '#064e3b'],
]

// ─── Hulpfuncties ─────────────────────────────────────────────────────────────

function projKleur(id = '') {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PROJ_KLEUREN[h % PROJ_KLEUREN.length]
}

function avatarKleur(naam = '') {
  return AVATAR_KLEUREN[naam.charCodeAt(0) % AVATAR_KLEUREN.length]
}

function initialen(naam = '') {
  return naam.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

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

function monteurNaam(m) {
  return [m.voornaam, m.achternaam].filter(Boolean).join(' ')
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
  })
}

function fBereikLang(van, tot) {
  const opts = { weekday: 'short', day: 'numeric', month: 'long' }
  const v = new Date(van + 'T00:00:00').toLocaleDateString('nl-NL', opts)
  const t = new Date(tot + 'T00:00:00').toLocaleDateString('nl-NL', opts)
  return van === tot ? v : `${v} t/m ${t}`
}

function prevWerkdag(str) {
  let d = new Date(str + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1)
  return naarStr(d)
}

function nextWerkdag(str) {
  let d = new Date(str + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1)
  return naarStr(d)
}

function aaneengesloten(daten, vanDag) {
  const set = new Set(daten)
  if (!set.has(vanDag)) return [vanDag]
  const block = [vanDag]
  let cur = vanDag
  while (true) {
    const prev = prevWerkdag(cur)
    if (set.has(prev)) { block.unshift(prev); cur = prev } else break
  }
  cur = vanDag
  while (true) {
    const next = nextWerkdag(cur)
    if (set.has(next)) { block.push(next); cur = next } else break
  }
  return block
}

// ─── Planning ─────────────────────────────────────────────────────────────────

export default function Planning({ onNavigate }) {
  const { rol, initialen } = useAuth()
  const kanInplannen = heeftVolledigeToegang(rol)

  const [startDatum, setStartDatum] = useState(() => getMaandag(new Date()))
  const [toonWeekend, setToonWeekend] = useState(false)
  const [monteurs, setMonteurs] = useState([])
  const [groepen, setGroepen] = useState([])
  const [toewijzingen, setToewijzingen] = useState([])
  const [projecten, setProjecten] = useState([])
  const [periodes, setPeriodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uitgeklapt, setUitgeklapt] = useState(new Set())
  const [zoek, setZoek] = useState('')
  const [filterExpertise, setFilterExpertise] = useState('')
  const [filterProjectleider, setFilterProjectleider] = useState(
    () => isProjectleider(rol) ? (initialen ?? '') : ''
  )
  const [filterProject, setFilterProject] = useState('')
  const [modal, setModal] = useState(null)
  const [monteurPopup, setMonteurPopup] = useState(null)
  const [toonZesWeken, setToonZesWeken] = useState(false)

  // ── Datum berekeningen ──────────────────────────────────────────────────────

  const aantalDagen = toonZesWeken ? 56 : 21
  const dagBreedte = toonZesWeken ? 40 : DAG_B

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
      const [m, g, tv, p, per] = await Promise.all([
        getMonteurs(),
        getGroepen(),
        getToewijzingen(van, tot),
        getProjecten(),
        getPeriodes(),
      ])
      setMonteurs(m)
      setGroepen(g)
      setToewijzingen(tv)
      setProjecten(p)
      setPeriodes(per)
    } catch {
      setError('Kon planning niet ophalen. Controleer de verbinding.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    laad()
  }, [startDatum, toonZesWeken])

  // ── Toewijzingen map per monteur ───────────────────────────────────────────

  const tvMap = useMemo(() => {
    const m = {}
    toewijzingen.forEach((t) => {
      if (!m[t.monteur_id]) m[t.monteur_id] = []
      m[t.monteur_id].push(t)
    })
    return m
  }, [toewijzingen])

  function tvVoorDag(monteurId, dagStr) {
    return (tvMap[monteurId] ?? []).filter(
      (t) => t.datum_van <= dagStr && t.datum_tot >= dagStr
    )
  }

  // ── Groepleden deduplicatie ────────────────────────────────────────────────

  const groepLedenIds = useMemo(
    () => new Set(groepen.flatMap((g) => (g.groep_leden ?? []).map((gl) => gl.monteur_id))),
    [groepen]
  )

  const alleExpertises = useMemo(
    () => [...new Set(monteurs.flatMap((m) => m.expertises ?? []))].sort((a, b) => a.localeCompare(b, 'nl')),
    [monteurs]
  )

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

  const skipDagen = useMemo(() => new Set(periodeMap.keys()), [periodeMap])

  const periodeData = useMemo(() => {
    if (!modal || modal.type !== 'bewerk') return null
    const { monteur, dag, tv } = modal
    const relevantTvs = (tvMap[monteur.id] ?? []).filter((t) => t.project_id === tv.project_id)
    const daten = relevantTvs.map((t) => t.datum_van)
    const block = aaneengesloten(daten, dag)
    const ids = relevantTvs.filter((t) => block.includes(t.datum_van)).map((t) => t.id)
    return { van: block[0], tot: block[block.length - 1], aantalDagen: block.length, ids }
  }, [modal, tvMap])

  // Project-IDs die bij de actieve projectleider filter horen
  const filterProjectIds = useMemo(() => {
    if (!filterProjectleider) return null
    return new Set(projecten.filter((p) => p.projectleider_initialen === filterProjectleider).map((p) => p.id))
  }, [projecten, filterProjectleider])

  // Monteur-IDs die in de zichtbare periode op een gefilterd project staan
  const gefilterdeMonteurIds = useMemo(() => {
    if (!filterProjectIds) return null
    return new Set(toewijzingen.filter((tv) => filterProjectIds.has(tv.project_id)).map((tv) => tv.monteur_id))
  }, [toewijzingen, filterProjectIds])

  // Monteur-IDs die in de zichtbare periode op het geselecteerde project staan
  const gefilterdeMonteurIdsProject = useMemo(() => {
    if (!filterProject) return null
    return new Set(toewijzingen.filter((tv) => tv.project_id === filterProject).map((tv) => tv.monteur_id))
  }, [toewijzingen, filterProject])

  // ── Rijen opbouwen: eigen → groepen → zzp ─────────────────────────────────

  const rijen = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    const match = (m) =>
      (!q || monteurNaam(m).toLowerCase().includes(q)) &&
      (!filterExpertise || (m.expertises ?? []).includes(filterExpertise)) &&
      (!gefilterdeMonteurIds || gefilterdeMonteurIds.has(m.id)) &&
      (!gefilterdeMonteurIdsProject || gefilterdeMonteurIdsProject.has(m.id))

    const eigen = monteurs.filter((m) => m.type === 'Eissink'       && match(m) && !groepLedenIds.has(m.id))
    const zzp   = monteurs.filter((m) => m.type === 'Onderaannemer' && match(m) && !groepLedenIds.has(m.id))

    const groepRijen = groepen.flatMap((g) => {
      const leden = (g.groep_leden ?? [])
        .map((gl) => monteurs.find((m) => m.id === gl.monteur_id))
        .filter(Boolean)
      const rij = [{ type: 'groep', groep: g, leden }]
      if (uitgeklapt.has(g.id)) {
        rij.push(
          ...leden.filter(match).map((m) => ({ type: 'groeplid', monteur: m, groepId: g.id }))
        )
      }
      return rij
    })

    return [
      ...eigen.map((m) => ({ type: 'monteur', monteur: m })),
      ...groepRijen,
      ...zzp.map((m) => ({ type: 'monteur', monteur: m })),
    ]
  }, [monteurs, groepen, groepLedenIds, uitgeklapt, zoek, filterExpertise, gefilterdeMonteurIds, gefilterdeMonteurIdsProject])

  function toggleGroep(id) {
    setUitgeklapt((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  // ── Modal handlers ─────────────────────────────────────────────────────────

  function openModal(monteur, dagStr, tv = null) {
    if (tv) {
      setModal({ type: 'bewerk', monteur, dag: dagStr, tv })
    } else {
      setModal({ type: 'nieuw', monteur, dag: dagStr })
    }
  }

  function openGroepModal(groep, leden, dagStr) {
    setModal({ type: 'groep', groep, leden, dag: dagStr })
  }

  async function handleInplannen(projectId, van, tot) {
    if (modal.type === 'groep') {
      await Promise.all(
        modal.leden.map((m) =>
          createToewijzing({ monteur_id: m.id, project_id: projectId, datum_van: van, datum_tot: tot }, skipDagen)
        )
      )
    } else {
      await createToewijzing({
        monteur_id: modal.monteur.id,
        project_id: projectId,
        datum_van: van,
        datum_tot: tot,
      }, skipDagen)
    }
    setModal(null)
    await laad()
  }

  async function handleVerwijder(id) {
    await deleteToewijzing(id)
    setModal(null)
    await laad()
  }

  async function handleVerwijderPeriode(ids) {
    await Promise.all(ids.map((id) => deleteToewijzing(id)))
    setModal(null)
    await laad()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Zoek monteur…"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          className="w-44 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
        />

        <select
          value={filterExpertise}
          onChange={(e) => setFilterExpertise(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white text-gray-600"
        >
          <option value="">Alle expertises</option>
          {alleExpertises.map((ex) => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>

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

        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white text-gray-600 max-w-[200px]"
        >
          <option value="">Alle projecten</option>
          {[...projecten]
            .sort((a, b) => (a.werknummer ?? '').localeCompare(b.werknummer ?? '', 'nl'))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.werknummer}{p.projectleider_initialen ? ` · ${p.projectleider_initialen}` : ''} — {p.omschrijving}
              </option>
            ))}
        </select>

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

        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-gray-500">8 weken</span>
            <button
              type="button"
              role="switch"
              aria-checked={toonZesWeken}
              onClick={() => setToonZesWeken((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
                toonZesWeken ? 'bg-gray-800' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                  toonZesWeken ? 'left-[18px]' : 'left-0.5'
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

          {/* Week-header — sticky top */}
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

          {/* Dag-header — sticky onder week-header */}
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
              const isVandaag = str === VANDAAG
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
              Planning laden…
            </div>
          )}

          {/* Rijen */}
          {!loading &&
            rijen.map((rij) => {

              // ── Groep header rij ─────────────────────────────────────────
              if (rij.type === 'groep') {
                const open = uitgeklapt.has(rij.groep.id)
                return (
                  <div
                    key={`groep-${rij.groep.id}`}
                    className="flex border-b border-gray-100 bg-gray-50/80"
                    style={{ minHeight: 40 }}
                  >
                    <div
                      className="sticky left-0 z-10 bg-gray-50 border-r border-gray-100 flex items-center gap-2 px-3 shrink-0 cursor-pointer select-none"
                      style={{ width: NAAM_B }}
                      onClick={() => toggleGroep(rij.groep.id)}
                    >
                      <span
                        className="text-gray-400 text-sm leading-none transition-transform duration-150 shrink-0"
                        style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : '' }}
                      >
                        ›
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-700 truncate">
                          {rij.groep.naam}
                        </div>
                        <div className="text-xs text-gray-400">
                          {rij.leden.length} leden
                        </div>
                      </div>
                    </div>
                    {zDagen.map((d) => {
                      const dagStr = naarStr(d)
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      const isPeriode = !isWeekend && periodeMap.has(dagStr)
                      return (
                        <div
                          key={dagStr}
                          onClick={kanInplannen ? () => openGroepModal(rij.groep, rij.leden, dagStr) : undefined}
                          className={`border-l border-gray-100 flex items-center justify-center transition-colors ${
                            kanInplannen ? 'cursor-pointer group/cel' : ''
                          } ${
                            isWeekend ? 'bg-gray-100/50 hover:bg-gray-100' : isPeriode ? 'bg-amber-50' : kanInplannen ? 'hover:bg-gray-100/60' : ''
                          }`}
                          style={{ flex: 1, minWidth: dagBreedte, minHeight: 40 }}
                        >
                          {kanInplannen && (
                            <span className="text-gray-300 opacity-0 group-hover/cel:opacity-100 transition-opacity text-lg leading-none select-none">
                              +
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              }

              // ── Monteur rij (eigen/zzp en groeplid) ──────────────────────
              const monteur = rij.monteur
              const isGroeplid = rij.type === 'groeplid'
              const [avgBg, avgFg] = avatarKleur(monteurNaam(monteur))

              return (
                <div
                  key={`${rij.type}-${monteur.id}${rij.groepId ? `-${rij.groepId}` : ''}`}
                  className="flex border-b border-gray-100 group/rij"
                  style={{ height: ROW_H }}
                >
                  {/* Naam cel */}
                  <div
                    className={`sticky left-0 z-10 border-r border-gray-100 flex items-center gap-2 shrink-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isGroeplid ? 'bg-gray-50 pl-8 pr-3 py-2' : 'bg-white px-3 py-2'
                    }`}
                    style={{ width: NAAM_B }}
                    onClick={() => setMonteurPopup(monteur)}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ backgroundColor: avgBg, color: avgFg }}
                    >
                      {initialen(monteurNaam(monteur))}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-900 truncate leading-tight">
                        {monteurNaam(monteur)}
                      </div>
                      {monteur.bedrijfsnaam && (
                        <div className="text-[10px] text-gray-400 truncate leading-tight">
                          {monteur.bedrijfsnaam}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dag cellen */}
                  {zDagen.map((d) => {
                    const dagStr = naarStr(d)
                    const isVandaag = dagStr === VANDAAG
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    const isPeriode = !isWeekend && periodeMap.has(dagStr)
                    const tvList = tvVoorDag(monteur.id, dagStr)

                    if (tvList.length > 0) {
                      return (
                        <div
                          key={dagStr}
                          className="relative border-l border-white/40 flex flex-row overflow-hidden group/cel cursor-pointer"
                          style={{ flex: 1, minWidth: dagBreedte, height: ROW_H }}
                        >
                          {tvList.map((tv, i) => {
                            const kleur = projKleur(tv.project_id)
                            const compact = toonZesWeken || (dagBreedte / tvList.length < 40)
                            return (
                              <div
                                key={tv.id}
                                onClick={() => openModal(monteur, dagStr, tv)}
                                title={`${tv.projecten?.werknummer} — ${tv.projecten?.omschrijving}`}
                                className="cursor-pointer flex flex-col justify-center overflow-hidden"
                                style={{
                                  width: `${100 / tvList.length}%`,
                                  height: '100%',
                                  backgroundColor: kleur.bg,
                                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.5)' : undefined,
                                  padding: compact ? 0 : '4px 6px',
                                  flexShrink: 0,
                                }}
                              >
                                {!compact && (
                                  <>
                                    <div
                                      className="text-[10px] font-bold leading-tight truncate"
                                      style={{ color: kleur.fg }}
                                    >
                                      {tv.projecten?.werknummer}
                                      {tv.projecten?.projectleider_initialen && (
                                        <span style={{ opacity: 0.75 }}>
                                          {' · '}{tv.projecten.projectleider_initialen}
                                        </span>
                                      )}
                                    </div>
                                    <div
                                      className="text-[10px] leading-tight truncate"
                                      style={{ color: kleur.fg, opacity: 0.72 }}
                                    >
                                      {tv.projecten?.omschrijving}
                                    </div>
                                  </>
                                )}
                              </div>
                            )
                          })}
                          {kanInplannen && (
                            <button
                              type="button"
                              onClick={() => openModal(monteur, dagStr)}
                              title="Nog een project toevoegen"
                              className="absolute top-0.5 right-0.5 z-20 w-4 h-4 flex items-center justify-center text-[11px] leading-none text-white bg-black/25 rounded-sm opacity-0 group-hover/cel:opacity-100 transition-opacity hover:bg-black/45"
                            >
                              +
                            </button>
                          )}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={dagStr}
                        onClick={kanInplannen ? () => openModal(monteur, dagStr) : undefined}
                        className={`border-l border-gray-100 flex items-center justify-center transition-colors ${
                          kanInplannen ? 'cursor-pointer group/cel' : ''
                        } ${
                          isVandaag
                            ? 'bg-blue-50/30'
                            : isWeekend
                            ? 'bg-gray-50'
                            : isPeriode
                            ? 'bg-amber-50'
                            : kanInplannen ? 'hover:bg-gray-50' : ''
                        }`}
                        style={{ flex: 1, minWidth: dagBreedte, height: ROW_H }}
                      >
                        {kanInplannen && (
                          <span className="text-gray-300 opacity-0 group-hover/cel:opacity-100 transition-opacity text-xl leading-none select-none">
                            +
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}

          {!loading && rijen.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              {filterProject
                ? `Geen monteurs ingepland op dit project in deze periode`
                : filterProjectleider
                ? `Geen monteurs ingepland op projecten van ${filterProjectleider} in deze periode`
                : 'Geen monteurs gevonden'}
            </div>
          )}
        </div>
      </div>

      {/* Inplan modal */}
      {modal && (
        <InplanModal
          modal={modal}
          projecten={projecten}
          kanInplannen={kanInplannen}
          onInplannen={handleInplannen}
          onVerwijder={handleVerwijder}
          onClose={() => setModal(null)}
          onNaarProjecten={onNavigate ? () => { setModal(null); onNavigate('projecten') } : undefined}
          periodeData={periodeData}
          onVerwijderPeriode={handleVerwijderPeriode}
        />
      )}

      {/* Monteur detail popup */}
      {monteurPopup && (
        <MonteurPopup
          monteur={monteurPopup}
          onClose={() => setMonteurPopup(null)}
        />
      )}

    </div>
  )
}

// ─── MonteurPopup ─────────────────────────────────────────────────────────────

function MonteurPopup({ monteur, onClose }) {
  const naam = monteurNaam(monteur)
  const [avgBg, avgFg] = avatarKleur(naam)

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
        <div className="flex items-center gap-4 p-5 pb-4 border-b border-gray-100">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ backgroundColor: avgBg, color: avgFg }}
          >
            {initialen(naam)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 truncate">{naam || '—'}</div>
            <div className="text-xs text-gray-400 truncate">{monteur.type || ''}</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 text-base leading-none"
          >
            ✕
          </button>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          <Regel label="Bedrijf"    waarde={monteur.bedrijfsnaam || '—'} />
          <Regel label="Type"       waarde={monteur.type || '—'} />
          <Regel label="Telefoon"   waarde={monteur.telefoon || '—'} />
          <Regel label="Woonplaats" waarde={monteur.woonplaats || '—'} />
          <Regel
            label="Vandaag"
            waarde={
              monteur.toewijzing_vandaag
                ? `${monteur.toewijzing_vandaag.projecten?.werknummer} — ${monteur.toewijzing_vandaag.projecten?.omschrijving}`
                : '—'
            }
          />
          <div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
              Expertises
            </div>
            {(monteur.expertises ?? []).length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {monteur.expertises.map((ex) => (
                  <span
                    key={ex}
                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-md"
                  >
                    {ex}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm text-gray-900">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Regel({ label, waarde }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide w-20 shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-900">{waarde}</span>
    </div>
  )
}

// ─── ProjectZoeker ────────────────────────────────────────────────────────────

function ProjectZoeker({ projecten, value, onChange, onNieuwProject }) {
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
    const kleur = projKleur(geselecteerd.id)
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

// ─── InplanModal ──────────────────────────────────────────────────────────────

function InplanModal({ modal, projecten, kanInplannen, onInplannen, onVerwijder, onClose, onNaarProjecten, periodeData, onVerwijderPeriode }) {
  const isBewerk = modal.type === 'bewerk'
  const isGroep  = modal.type === 'groep'
  const { dag } = modal

  const [projectId, setProjectId] = useState('')
  const [van, setVan] = useState(dag)
  const [tot, setTot] = useState(dag)
  const [bezig, setBezig] = useState(false)
  const [periodeConfirm, setPeriodeConfirm] = useState(false)

  const [avgBg, avgFg] = avatarKleur(isGroep ? modal.groep?.naam ?? '' : monteurNaam(modal.monteur ?? {}))

  const heeftPeriode = isBewerk && periodeData && periodeData.aantalDagen > 1

  async function handleVerwijderDag() {
    setBezig(true)
    try { await onVerwijder(modal.tv.id) }
    catch (err) { alert('Verwijderen mislukt: ' + err.message); setBezig(false) }
  }

  async function handleVerwijderPeriode() {
    setBezig(true)
    try { await onVerwijderPeriode(periodeData.ids) }
    catch (err) { alert('Verwijderen mislukt: ' + err.message); setBezig(false) }
  }

  // ── Modus 1: bestaande toewijzing bekijken ─────────────────────────────────
  if (isBewerk) {
    const kleur   = projKleur(modal.tv.project_id)
    const project = modal.tv.projecten

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center gap-3 p-5 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ backgroundColor: avgBg, color: avgFg }}>
              {initialen(monteurNaam(modal.monteur))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">{monteurNaam(modal.monteur)}</div>
              <div className="text-xs text-gray-400 capitalize">{fDatumLang(dag)}</div>
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors shrink-0 text-base leading-none ml-2">✕</button>
          </div>

          {/* Inhoud */}
          <div className="p-5 space-y-3">
            {/* Project badge */}
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

            {/* Periode info */}
            {heeftPeriode && (
              <p className="text-xs text-gray-500">
                Ingepland van{' '}
                <span className="font-medium text-gray-700">{fBereikLang(periodeData.van, periodeData.tot)}</span>
                {' '}
                <span className="text-gray-400">({periodeData.aantalDagen} dagen)</span>
              </p>
            )}
          </div>

          {/* Knoppen — alleen voor beheerder/planner */}
          {kanInplannen && (
            <div className="px-5 pb-5 flex flex-col gap-2">
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
                <button type="button" disabled
                  className="flex-1 px-4 py-2.5 text-sm text-gray-300 border border-gray-100 rounded-xl cursor-not-allowed">
                  Wijzigen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Nieuw / Groep: toewijzing aanmaken ─────────────────────────────────────
  async function handleInplannen(e) {
    e.preventDefault()
    setBezig(true)
    try { await onInplannen(projectId, van, tot) }
    catch (err) { alert('Opslaan mislukt: ' + err.message) }
    finally { setBezig(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-5 pb-4">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ backgroundColor: avgBg, color: avgFg }}>
            {isGroep ? modal.groep.naam.slice(0, 2).toUpperCase() : initialen(monteurNaam(modal.monteur))}
          </div>
          <div>
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
