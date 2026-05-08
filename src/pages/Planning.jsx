import { useState, useEffect, useMemo } from 'react'
import { getMonteurs, getGroepen } from '../services/monteursService'
import {
  getToewijzingen,
  createToewijzing,
  updateToewijzing,
  deleteToewijzing,
} from '../services/toewijzingenService'
import { getProjecten } from '../services/projectenService'

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

function fBereik(van, tot) {
  const v = new Date(van + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  const t = new Date(tot + 'T00:00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
  return van === tot ? v : `${v} t/m ${t}`
}

// ─── Planning ─────────────────────────────────────────────────────────────────

export default function Planning() {
  const [startDatum, setStartDatum] = useState(() => getMaandag(new Date()))
  const [toonWeekend, setToonWeekend] = useState(false)
  const [monteurs, setMonteurs] = useState([])
  const [groepen, setGroepen] = useState([])
  const [toewijzingen, setToewijzingen] = useState([])
  const [projecten, setProjecten] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uitgeklapt, setUitgeklapt] = useState(new Set())
  const [zoek, setZoek] = useState('')
  const [modal, setModal] = useState(null)

  // ── Datum berekeningen ──────────────────────────────────────────────────────

  const alleDagen = useMemo(
    () => Array.from({ length: 21 }, (_, i) => plusDagen(startDatum, i)),
    [startDatum]
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
      const tot = naarStr(plusDagen(startDatum, 20))
      const [m, g, tv, p] = await Promise.all([
        getMonteurs(),
        getGroepen(),
        getToewijzingen(van, tot),
        getProjecten(),
      ])
      setMonteurs(m)
      setGroepen(g)
      setToewijzingen(tv)
      setProjecten(p)
    } catch {
      setError('Kon planning niet ophalen. Controleer de verbinding.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    laad()
  }, [startDatum])

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

  // ── Rijen opbouwen: eigen → groepen → zzp ─────────────────────────────────

  const rijen = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    const match = (m) => !q || monteurNaam(m).toLowerCase().includes(q)

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
  }, [monteurs, groepen, groepLedenIds, uitgeklapt, zoek])

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
          createToewijzing({ monteur_id: m.id, project_id: projectId, datum_van: van, datum_tot: tot })
        )
      )
    } else {
      await createToewijzing({
        monteur_id: modal.monteur.id,
        project_id: projectId,
        datum_van: van,
        datum_tot: tot,
      })
    }
    setModal(null)
    await laad()
  }

  async function handleBewerken(id, van, tot) {
    await updateToewijzing(id, van, tot)
    setModal(null)
    await laad()
  }

  async function handleVerwijder(id) {
    await deleteToewijzing(id)
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

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setStartDatum((d) => plusDagen(d, -21))}
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
            onClick={() => setStartDatum((d) => plusDagen(d, 21))}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-lg leading-none"
          >
            ›
          </button>
        </div>

        <span className="text-sm font-semibold text-gray-700">{periodeLabel}</span>

        <label className="ml-auto flex items-center gap-2 cursor-pointer select-none">
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
                style={{ flex: wg.dagen.length, minWidth: wg.dagen.length * DAG_B }}
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
              return (
                <div
                  key={str}
                  className={`border-l border-gray-100 shrink-0 flex flex-col items-center justify-center gap-0.5 ${
                    isWeekend ? 'bg-gray-100' : ''
                  }`}
                  style={{ flex: 1, minWidth: DAG_B }}
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
                      return (
                        <div
                          key={dagStr}
                          onClick={() => openGroepModal(rij.groep, rij.leden, dagStr)}
                          className={`border-l border-gray-100 cursor-pointer group/cel flex items-center justify-center transition-colors ${
                            isWeekend ? 'bg-gray-100/50 hover:bg-gray-100' : 'hover:bg-gray-100/60'
                          }`}
                          style={{ flex: 1, minWidth: DAG_B, minHeight: 40 }}
                        >
                          <span className="text-gray-300 opacity-0 group-hover/cel:opacity-100 transition-opacity text-lg leading-none select-none">
                            +
                          </span>
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
                    className={`sticky left-0 z-10 border-r border-gray-100 flex items-center gap-2 shrink-0 ${
                      isGroeplid ? 'bg-gray-50 pl-8 pr-3 py-2' : 'bg-white px-3 py-2'
                    }`}
                    style={{ width: NAAM_B }}
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
                      <div className="text-[10px] text-gray-400 truncate leading-tight">
                        {(monteur.expertises ?? []).slice(0, 1).join(', ') || monteur.type}
                      </div>
                    </div>
                  </div>

                  {/* Dag cellen */}
                  {zDagen.map((d) => {
                    const dagStr = naarStr(d)
                    const isVandaag = dagStr === VANDAAG
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    const tvList = tvVoorDag(monteur.id, dagStr)

                    if (tvList.length > 0) {
                      return (
                        <div
                          key={dagStr}
                          className="border-l border-white/40 flex flex-row overflow-hidden"
                          style={{ flex: 1, minWidth: DAG_B, height: ROW_H }}
                        >
                          {tvList.map((tv, i) => {
                            const kleur = projKleur(tv.project_id)
                            const compact = DAG_B / tvList.length < 40
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
                        </div>
                      )
                    }

                    return (
                      <div
                        key={dagStr}
                        onClick={() => openModal(monteur, dagStr)}
                        className={`border-l border-gray-100 cursor-pointer group/cel flex items-center justify-center transition-colors ${
                          isVandaag
                            ? 'bg-blue-50/30'
                            : isWeekend
                            ? 'bg-gray-50'
                            : 'hover:bg-gray-50'
                        }`}
                        style={{ flex: 1, minWidth: DAG_B, height: ROW_H }}
                      >
                        <span className="text-gray-300 opacity-0 group-hover/cel:opacity-100 transition-opacity text-xl leading-none select-none">
                          +
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            })}

          {!loading && rijen.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              Geen monteurs gevonden
            </div>
          )}
        </div>
      </div>

      {/* Inplan modal */}
      {modal && (
        <InplanModal
          modal={modal}
          projecten={projecten}
          onInplannen={handleInplannen}
          onBewerken={handleBewerken}
          onVerwijder={handleVerwijder}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ─── InplanModal ──────────────────────────────────────────────────────────────

function InplanModal({ modal, projecten, onInplannen, onBewerken, onVerwijder, onClose }) {
  const isBewerk = modal.type === 'bewerk'
  const isGroep  = modal.type === 'groep'
  const { dag } = modal

  const [projectId, setProjectId] = useState('')
  const [van, setVan] = useState(isBewerk ? modal.tv.datum_van : dag)
  const [tot, setTot] = useState(isBewerk ? modal.tv.datum_tot : dag)
  const [bezig, setBezig] = useState(false)

  const [avgBg, avgFg] = avatarKleur(isGroep ? modal.groep.naam : monteurNaam(modal.monteur))
  const bewerkKleur = isBewerk ? projKleur(modal.tv.project_id) : null

  async function handleOpslaan(e) {
    e.preventDefault()
    setBezig(true)
    try {
      if (isBewerk) {
        await onBewerken(modal.tv.id, van, tot)
      } else {
        await onInplannen(projectId, van, tot)
      }
    } catch (err) {
      alert('Opslaan mislukt: ' + err.message)
    } finally {
      setBezig(false)
    }
  }

  async function handleVerwijder() {
    setBezig(true)
    try {
      await onVerwijder(modal.tv.id)
    } catch (err) {
      alert('Verwijderen mislukt: ' + err.message)
    } finally {
      setBezig(false)
    }
  }

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
        {isBewerk ? (
          <div className="p-5 pb-4" style={{ backgroundColor: bewerkKleur.bg }}>
            <div
              className="text-sm font-bold truncate"
              style={{ color: bewerkKleur.fg }}
            >
              {modal.tv.projecten?.werknummer} — {modal.tv.projecten?.omschrijving}
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: bewerkKleur.fg, opacity: 0.7 }}
            >
              {monteurNaam(modal.monteur)} · {fBereik(modal.tv.datum_van, modal.tv.datum_tot)}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-5 pb-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ backgroundColor: avgBg, color: avgFg }}
            >
              {isGroep
                ? modal.groep.naam.slice(0, 2).toUpperCase()
                : initialen(monteurNaam(modal.monteur))}
            </div>
            <div>
              {isGroep ? (
                <>
                  <div className="text-sm font-semibold text-gray-900">
                    Groep: {modal.groep.naam}
                  </div>
                  <div className="text-xs text-gray-400">
                    {modal.leden.length} leden worden ingepland · {fDatumLang(dag)}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-gray-900">{monteurNaam(modal.monteur)}</div>
                  <div className="text-xs text-gray-400 capitalize">{fDatumLang(dag)}</div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleOpslaan} className="px-5 pb-5 space-y-3">
          {/* Project selector — alleen bij nieuw/groep */}
          {!isBewerk && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Project</label>
              <select
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white"
              >
                <option value="">Kies project…</option>
                {projecten.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.werknummer} — {p.omschrijving}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Datums */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Van</label>
              <input
                type="date"
                required
                value={van}
                onChange={(e) => {
                  setVan(e.target.value)
                  if (e.target.value > tot) setTot(e.target.value)
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tot</label>
              <input
                type="date"
                required
                value={tot}
                min={van}
                onChange={(e) => setTot(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
              />
            </div>
          </div>

          {/* Knoppen */}
          <div className="flex items-center justify-end gap-2 pt-1">
            {isBewerk && (
              <button
                type="button"
                onClick={handleVerwijder}
                disabled={bezig}
                className="px-4 py-2 text-sm text-red-400 hover:text-red-600 transition-colors mr-auto"
              >
                Verwijderen
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={bezig || (!isBewerk && !projectId)}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {bezig
                ? 'Opslaan…'
                : isBewerk
                ? 'Opslaan'
                : isGroep
                ? `${modal.leden.length} leden inplannen`
                : 'Inplannen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
