import { useState, useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth, heeftVolledigeToegang, isGebruiker } from '../context/AuthContext'
import {
  createToewijzing,
  deleteToewijzing,
} from '../services/toewijzingenService'
import { useMonteurs, useGroepen, useToewijzingen, useProjecten, usePeriodes, useProfielen } from '../hooks/queries'
import { projKleur } from '../lib/kleurenpalet'
import { profielenUitProjecten } from '../lib/profielen'
import { avatarKleur, initialen, monteurNaam } from '../lib/avatar'
import { getMaandag, plusDagen, naarStr, isoWeek, fDag, fDagNaam, prevWerkdag, nextWerkdag, plusWerkdagen, aaneengesloten } from '../lib/datum'
import { useIsMobile } from '../hooks/useIsMobile'
import InplanModal from '../components/InplanModal'
import MonteurPopup from '../components/MonteurPopup'

// ─── Constanten ───────────────────────────────────────────────────────────────

const NAAM_B = 200
const DAG_B  = 100
const ROW_H  = 48
const WEEK_H = 32
const DAG_H  = 40

// ─── Planning ─────────────────────────────────────────────────────────────────

export default function Planning({ onNavigate }) {
  const { rol, user } = useAuth()
  const vandaag = naarStr(new Date())
  const kanInplannen = heeftVolledigeToegang(rol)

  const [startDatum, setStartDatum] = useState(() => getMaandag(new Date()))
  const [toonWeekend, setToonWeekend] = useState(false)
  const [toonUitgebreid, setToonUitgebreid] = useState(false)
  const [uitgeklapt, setUitgeklapt] = useState(new Set())
  const [zoek, setZoek] = useState('')
  const [filterExpertise, setFilterExpertise] = useState('')
  const [filterProjectleider, setFilterProjectleider] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [alleenIngepland, setAlleenIngepland] = useState(false)
  const [modal, setModal] = useState(null)
  const [monteurPopup, setMonteurPopup] = useState(null)

  const isMobile = useIsMobile()

  // ── Datum berekeningen ──────────────────────────────────────────────────────

  const aantalDagen = toonUitgebreid ? 56 : 21
  const dagBreedte  = isMobile ? 0 : toonUitgebreid ? 40 : DAG_B
  const naamBreedte = isMobile ? 70 : NAAM_B
  const van = naarStr(startDatum)
  const tot = naarStr(plusDagen(startDatum, aantalDagen - 1))

  // ── Data queries ───────────────────────────────────────────────────────────

  const queryClient = useQueryClient()
  const { data: monteurs = [], isLoading: loadingMonteurs, error: errorMonteurs } = useMonteurs({ metVandaag: true })
  const { data: groepen = [], isLoading: loadingGroepen } = useGroepen()
  const { data: toewijzingen = [], isLoading: loadingTv, error: errorTv } = useToewijzingen(van, tot)
  const { data: projecten = [] } = useProjecten()
  const { data: periodes = [] } = usePeriodes()
  const { data: profielen = [], isLoading: loadingProf } = useProfielen()
  const loading = loadingMonteurs || loadingGroepen || loadingTv || loadingProf
  const error = errorMonteurs || errorTv

  const alleDagen = useMemo(
    () => Array.from({ length: aantalDagen }, (_, i) => plusDagen(startDatum, i)),
    [startDatum, aantalDagen]
  )

  const zDagen = useMemo(() => {
    if (isMobile) {
      const result = []
      let cur = new Date(startDatum)
      while (result.length < 3) {
        if (cur.getDay() !== 0 && cur.getDay() !== 6) result.push(new Date(cur))
        cur.setDate(cur.getDate() + 1)
      }
      return result
    }
    return alleDagen.filter((d) => toonWeekend || (d.getDay() !== 0 && d.getDay() !== 6))
  }, [alleDagen, toonWeekend, isMobile, startDatum])

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
    const basis = isMobile ? zDagen : alleDagen
    const wks = [...new Set(basis.map(isoWeek))]
    return wks.length === 1 ? `Wk ${wks[0]}` : `Wk ${wks[0]} – ${wks[wks.length - 1]}`
  }, [alleDagen, zDagen, isMobile])

  // ── Auto-initialisatie uitgeklapt op basis van groepen ─────────────────────

  useEffect(() => {
    if (groepen.length > 0) {
      setUitgeklapt((prev) => prev.size > 0 ? prev : new Set(groepen.map((g) => g.id)))
    }
  }, [groepen])

  // ── Auto-filter voor Gebruiker-rol ─────────────────────────────────────────

  useEffect(() => {
    if (isGebruiker(rol) && user && profielen.length > 0) {
      const mijnProfiel = profielen.find((pr) => pr.user_id === user.id)
      if (mijnProfiel) setFilterProjectleider(mijnProfiel.id)
    }
  }, [profielen, rol, user])

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

  const alleProjectleiders = useMemo(() => profielenUitProjecten(projecten), [projecten])

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

  const hardSkipDagen = useMemo(() => {
    const set = new Set()
    for (const [date, p] of periodeMap) { if (p.blokkeer !== false) set.add(date) }
    return set
  }, [periodeMap])

  const softSkipDagen = useMemo(() => {
    const set = new Set()
    for (const [date, p] of periodeMap) { if (p.blokkeer === false) set.add(date) }
    return set
  }, [periodeMap])

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
    return new Set(projecten.filter((p) => p.projectleider_id === filterProjectleider).map((p) => p.id))
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

  // Monteur-IDs met minimaal één toewijzing in de zichtbare periode
  const ingeplandeMonteurIds = useMemo(
    () => new Set(toewijzingen.map((tv) => tv.monteur_id)),
    [toewijzingen]
  )

  // ── Rijen opbouwen: eigen → groepen → zzp ─────────────────────────────────

  const rijen = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    const match = (m) =>
      (!q || monteurNaam(m).toLowerCase().includes(q)) &&
      (!filterExpertise || (m.expertises ?? []).includes(filterExpertise)) &&
      (!gefilterdeMonteurIds || gefilterdeMonteurIds.has(m.id)) &&
      (!gefilterdeMonteurIdsProject || gefilterdeMonteurIdsProject.has(m.id)) &&
      (!alleenIngepland || ingeplandeMonteurIds.has(m.id))

    const eigen = monteurs
      .filter((m) => m.type === 'Intern' && match(m) && !groepLedenIds.has(m.id))
      .sort((a, b) => (a.achternaam ?? '').localeCompare(b.achternaam ?? '', 'nl'))
    const zzp = monteurs
      .filter((m) => m.type === 'Onderaannemer' && match(m) && !groepLedenIds.has(m.id))
      .sort((a, b) => (a.bedrijfsnaam ?? '').localeCompare(b.bedrijfsnaam ?? '', 'nl'))

    const groepRijen = groepen.flatMap((g) => {
      const leden = (g.groep_leden ?? [])
        .map((gl) => monteurs.find((m) => m.id === gl.monteur_id))
        .filter(Boolean)
      const matchendeLeden = leden.filter(match)
      if (matchendeLeden.length === 0) return []
      const rij = [{ type: 'groep', groep: g, leden }]
      if (uitgeklapt.has(g.id)) {
        rij.push(
          ...matchendeLeden.map((m) => ({ type: 'groeplid', monteur: m, groepId: g.id }))
        )
      }
      return rij
    })

    return [
      ...eigen.map((m) => ({ type: 'monteur', monteur: m })),
      ...groepRijen,
      ...zzp.map((m) => ({ type: 'monteur', monteur: m })),
    ]
  }, [monteurs, groepen, groepLedenIds, uitgeklapt, zoek, filterExpertise, gefilterdeMonteurIds, gefilterdeMonteurIdsProject, alleenIngepland, ingeplandeMonteurIds])

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
          createToewijzing({ monteur_id: m.id, project_id: projectId, datum_van: van, datum_tot: tot }, hardSkipDagen)
        )
      )
    } else {
      await createToewijzing({
        monteur_id: modal.monteur.id,
        project_id: projectId,
        datum_van: van,
        datum_tot: tot,
      }, hardSkipDagen)
    }
    setModal(null)
    await queryClient.invalidateQueries({ queryKey: ['toewijzingen'] })
  }

  async function handleVerwijder(id) {
    await deleteToewijzing(id)
    setModal(null)
    await queryClient.invalidateQueries({ queryKey: ['toewijzingen'] })
  }

  async function handleVerwijderPeriode(ids) {
    await Promise.all(ids.map((id) => deleteToewijzing(id)))
    setModal(null)
    await queryClient.invalidateQueries({ queryKey: ['toewijzingen'] })
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
          className="hidden md:block px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white text-gray-600"
        >
          <option value="">Alle expertises</option>
          {alleExpertises.map((ex) => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>

        <select
          value={filterProjectleider}
          onChange={(e) => setFilterProjectleider(e.target.value)}
          className="hidden md:block px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white text-gray-600"
        >
          <option value="">Alle PL</option>
          {alleProjectleiders.map((pl) => (
            <option key={pl.id} value={pl.id}>{pl.afkorting}</option>
          ))}
        </select>

        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="hidden md:block px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white text-gray-600 max-w-[200px]"
        >
          <option value="">Alle projecten</option>
          {[...projecten]
            .sort((a, b) => (a.werknummer ?? '').localeCompare(b.werknummer ?? '', 'nl'))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.werknummer}{(p.projectleider?.afkorting ?? p.projectleider_initialen) ? ` · ${p.projectleider?.afkorting ?? p.projectleider_initialen}` : ''} — {p.omschrijving}
              </option>
            ))}
        </select>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setStartDatum((d) => isMobile ? plusWerkdagen(d, -3) : plusDagen(d, -aantalDagen))}
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
            onClick={() => setStartDatum((d) => isMobile ? plusWerkdagen(d, 3) : plusDagen(d, aantalDagen))}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors text-lg leading-none"
          >
            ›
          </button>
        </div>

        <span className="text-sm font-semibold text-gray-700">{periodeLabel}</span>

        <div className="ml-auto flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-sm text-gray-500">Ingepland</span>
            <button
              type="button"
              role="switch"
              aria-checked={alleenIngepland}
              onClick={() => setAlleenIngepland((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors focus:outline-none ${
                alleenIngepland ? 'bg-gray-800' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${
                  alleenIngepland ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </label>
          <label className="hidden md:flex items-center gap-2 cursor-pointer select-none">
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
          <label className="hidden md:flex items-center gap-2 cursor-pointer select-none">
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
          {error?.message || error}
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
              style={{ width: naamBreedte }}
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
              style={{ width: naamBreedte }}
            />
            {zDagen.map((d) => {
              const str = naarStr(d)
              const isVandaag = str === vandaag
              const isWeekend = d.getDay() === 0 || d.getDay() === 6
              const periode = !isWeekend ? periodeMap.get(str) : null
              const isPeriode = !!periode
              const isHardPeriode = isPeriode && periode.blokkeer !== false
              return (
                <div
                  key={str}
                  className={`border-l border-gray-100 shrink-0 flex flex-col items-center justify-center gap-0.5 ${
                    isWeekend ? 'bg-gray-100' : isHardPeriode ? 'bg-amber-100' : isPeriode ? 'bg-yellow-50' : 'bg-gray-50'
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
                    className="flex border-b border-gray-200 bg-gray-50"
                    style={{ minHeight: 40 }}
                  >
                    <div
                      className={`sticky left-0 z-10 bg-gray-50 border-r border-gray-100 flex items-center shrink-0 cursor-pointer select-none ${isMobile ? 'gap-0.5 px-1' : 'gap-2 px-3'}`}
                      style={{ width: naamBreedte }}
                      onClick={() => toggleGroep(rij.groep.id)}
                    >
                      <span
                        className="text-gray-400 text-sm leading-none transition-transform duration-150 shrink-0"
                        style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : '' }}
                      >
                        ›
                      </span>
                      <div className="min-w-0">
                        <div className={`font-semibold text-gray-700 truncate ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
                          {rij.groep.naam}
                        </div>
                        {!isMobile && (
                          <div className="text-xs text-gray-400">
                            {rij.leden.length} leden
                          </div>
                        )}
                      </div>
                    </div>
                    {zDagen.map((d) => {
                      const dagStr = naarStr(d)
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      const periode = !isWeekend ? periodeMap.get(dagStr) : null
                      const isPeriode = !!periode
                      const isHardPeriode = isPeriode && periode.blokkeer !== false
                      return (
                        <div
                          key={dagStr}
                          onClick={kanInplannen ? () => openGroepModal(rij.groep, rij.leden, dagStr) : undefined}
                          className={`border-l border-gray-100 flex items-center justify-center transition-colors ${
                            kanInplannen ? 'cursor-pointer group/cel' : ''
                          } ${
                            isWeekend ? 'bg-gray-100/50 hover:bg-gray-100' : isHardPeriode ? 'bg-amber-50' : isPeriode ? 'bg-yellow-50/60' : kanInplannen ? 'hover:bg-gray-100/60' : ''
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
                  className="flex border-b border-gray-200 group/rij"
                  style={{ height: ROW_H }}
                >
                  {/* Naam cel */}
                  <div
                    className={`sticky left-0 z-10 border-r border-gray-100 flex items-center shrink-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isGroeplid
                        ? isMobile ? 'bg-gray-50 pl-4 pr-1 py-2' : 'bg-gray-50 pl-8 pr-3 py-2 gap-2'
                        : isMobile ? 'bg-white px-2 py-2' : 'bg-white px-3 py-2 gap-2'
                    }`}
                    style={{ width: naamBreedte }}
                    onClick={() => setMonteurPopup(monteur)}
                  >
                    {isMobile ? (
                      <div className="min-w-0 w-full">
                        <div className="text-[11px] font-semibold text-gray-900 leading-tight">
                          {(monteur.voornaam?.[0] ?? monteur.bedrijfsnaam?.[0] ?? '?').toUpperCase()}.
                        </div>
                        <div className="text-[11px] text-gray-500 truncate leading-tight">
                          {monteur.achternaam ?? monteur.bedrijfsnaam ?? ''}
                        </div>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>

                  {/* Dag cellen */}
                  {zDagen.map((d) => {
                    const dagStr = naarStr(d)
                    const isVandaag = dagStr === vandaag
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    const periode = !isWeekend ? periodeMap.get(dagStr) : null
                    const isPeriode = !!periode
                    const isHardPeriode = isPeriode && periode.blokkeer !== false
                    const tvList = tvVoorDag(monteur.id, dagStr)

                    if (tvList.length > 0) {
                      return (
                        <div
                          key={dagStr}
                          className="relative border-l border-white/40 flex flex-row overflow-hidden group/cel cursor-pointer"
                          style={{ flex: 1, minWidth: dagBreedte, height: ROW_H }}
                        >
                          {tvList.map((tv, i) => {
                            const kleur = projKleur(tv.projecten)
                            const compact = toonUitgebreid || ((dagBreedte || 90) / tvList.length < 40)
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
                            : isHardPeriode
                            ? 'bg-amber-50'
                            : isPeriode
                            ? 'bg-yellow-50/60'
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
