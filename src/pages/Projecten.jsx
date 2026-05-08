import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getProjectenMetStats,
  createProject,
  updateProject,
  deleteProject,
} from '../services/projectenService'

const TODAY = new Date().toISOString().split('T')[0]

const EUR = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const LEEG = {
  werknummer: '',
  omschrijving: '',
  opdrachtgever: '',
  aanneemsom: '',
  plaats: '',
  adres: '',
}

const KOLOMMEN = [
  { veld: 'werknummer',    label: 'Werknummer',    mono: true },
  { veld: 'omschrijving',  label: 'Omschrijving'               },
  { veld: 'opdrachtgever', label: 'Opdrachtgever'              },
  { veld: 'plaats',        label: 'Plaats'                     },
  { veld: 'aanneemsom',    label: 'Aanneemsom',    rechts: true },
  { veld: 'pers',          label: 'Pers.',         rechts: true },
  { veld: 'mandagen',      label: 'Mandagen',      rechts: true },
]

function berekenPers(toewijzingen) {
  return toewijzingen.filter(
    (t) => t.datum_van <= TODAY && t.datum_tot >= TODAY
  ).length
}

function berekenMandagen(toewijzingen) {
  return toewijzingen.reduce((sum, t) => {
    const dagen =
      Math.round(
        (new Date(t.datum_tot) - new Date(t.datum_van)) / 86400000
      ) + 1
    return sum + Math.max(0, dagen)
  }, 0)
}

export default function Projecten() {
  const { rol } = useAuth()
  const kanBewerken = rol === 'beheerder' || rol === 'planner'

  const [projecten, setProjecten] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoek, setZoek] = useState('')
  const [filterPL, setFilterPL] = useState('')
  const [sort, setSort] = useState({ veld: 'created_at', dir: 'desc' })
  const [modal, setModal] = useState(null)
  const [formulier, setFormulier] = useState(LEEG)
  const [bezig, setBezig] = useState(false)
  const [verwijderConfirm, setVerwijderConfirm] = useState(false)

  async function laadProjecten() {
    setLoading(true)
    setError(null)
    try {
      const data = await getProjectenMetStats()
      setProjecten(data)
    } catch {
      setError(
        'Kon projecten niet ophalen. Controleer de verbinding met Supabase.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    laadProjecten()
  }, [])

  const verrijkt = useMemo(
    () =>
      projecten.map((p) => ({
        ...p,
        pers: berekenPers(p.toewijzingen ?? []),
        mandagen: berekenMandagen(p.toewijzingen ?? []),
      })),
    [projecten]
  )

  const alleInitialen = useMemo(
    () => [...new Set(projecten.map((p) => p.projectleider_initialen).filter(Boolean))].sort(),
    [projecten]
  )

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return verrijkt.filter(
      (p) =>
        (!filterPL || p.projectleider_initialen === filterPL) &&
        (!q ||
          p.werknummer?.toLowerCase().includes(q) ||
          p.omschrijving?.toLowerCase().includes(q) ||
          p.opdrachtgever?.toLowerCase().includes(q))
    )
  }, [verrijkt, zoek, filterPL])

  const gesorteerd = useMemo(() => {
    const { veld, dir } = sort
    return [...gefilterd].sort((a, b) => {
      const av = a[veld] ?? ''
      const bv = b[veld] ?? ''
      const cmp =
        typeof av === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'nl')
      return dir === 'asc' ? cmp : -cmp
    })
  }, [gefilterd, sort])

  function toggleSort(veld) {
    setSort((prev) =>
      prev.veld === veld
        ? { veld, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { veld, dir: 'asc' }
    )
  }

  function openNieuw() {
    setFormulier(LEEG)
    setModal({ mode: 'nieuw' })
  }

  async function handleVerwijder() {
    setBezig(true)
    try {
      await deleteProject(modal.project.id)
      setModal(null)
      setVerwijderConfirm(false)
      await laadProjecten()
    } catch (err) {
      alert('Verwijderen mislukt: ' + err.message)
    } finally {
      setBezig(false)
    }
  }

  function openBewerk(project) {
    setFormulier({
      werknummer: project.werknummer ?? '',
      omschrijving: project.omschrijving ?? '',
      opdrachtgever: project.opdrachtgever ?? '',
      aanneemsom: project.aanneemsom ?? '',
      plaats: project.plaats ?? '',
      adres: project.adres ?? '',
    })
    setModal({ mode: 'bewerk', project })
  }

  async function handleOpslaan(e) {
    e.preventDefault()
    setBezig(true)
    try {
      const payload = {
        ...formulier,
        aanneemsom:
          formulier.aanneemsom === '' ? null : Number(formulier.aanneemsom),
      }
      if (modal.mode === 'nieuw') {
        await createProject(payload)
      } else {
        await updateProject(modal.project.id, payload)
      }
      setModal(null)
      await laadProjecten()
    } catch (err) {
      alert('Opslaan mislukt: ' + err.message)
    } finally {
      setBezig(false)
    }
  }

  const totaalAanneemsom = gesorteerd.reduce(
    (s, p) => s + (p.aanneemsom ?? 0),
    0
  )
  const totaalMandagen = gesorteerd.reduce((s, p) => s + p.mandagen, 0)

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center mb-4 gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Zoek op werknummer, omschrijving of opdrachtgever…"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          className="w-80 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
        />
        <select
          value={filterPL}
          onChange={(e) => setFilterPL(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors bg-white text-gray-600"
        >
          <option value="">Alle PL</option>
          {alleInitialen.map((ini) => (
            <option key={ini} value={ini}>{ini}</option>
          ))}
        </select>
        <div className="ml-auto">
          {kanBewerken && (
            <button
              onClick={openNieuw}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
            >
              + Nieuw project
            </button>
          )}
        </div>
      </div>

      {/* Fout */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Laden */}
      {loading && (
        <div className="py-20 text-center text-sm text-gray-400">
          Projecten laden…
        </div>
      )}

      {/* Tabel */}
      {!loading && !error && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {KOLOMMEN.map((k) => (
                  <th
                    key={k.veld}
                    onClick={() => toggleSort(k.veld)}
                    className={`px-4 py-2.5 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-900 transition-colors whitespace-nowrap ${
                      k.rechts ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {k.label}
                      {sort.veld === k.veld && (
                        <span className="text-gray-800 text-xs">
                          {sort.dir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {gesorteerd.length === 0 ? (
                <tr>
                  <td
                    colSpan={KOLOMMEN.length + 1}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Geen projecten gevonden
                  </td>
                </tr>
              ) : (
                gesorteerd.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                      {p.werknummer}
                      {p.projectleider_initialen && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-sans font-medium non-italic">
                          {p.projectleider_initialen}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                      {p.omschrijving}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.opdrachtgever || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.plaats || '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                      {p.aanneemsom != null ? EUR.format(p.aanneemsom) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {p.pers}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                      {p.mandagen}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {kanBewerken && (
                        <button
                          onClick={() => openBewerk(p)}
                          title="Bewerken"
                          className="text-gray-300 hover:text-gray-700 transition-colors"
                        >
                          <EditIcon />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totaalbalk */}
          <div className="flex items-center gap-6 px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm">
            <span className="text-gray-500">
              <span className="font-medium text-gray-900">
                {gesorteerd.length}
              </span>{' '}
              projecten
            </span>
            <span className="text-gray-500">
              Aanneemsom:{' '}
              <span className="font-medium text-gray-900">
                {EUR.format(totaalAanneemsom)}
              </span>
            </span>
            <span className="text-gray-500">
              Mandagen:{' '}
              <span className="font-medium text-gray-900">{totaalMandagen}</span>
            </span>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
          onClick={() => { setModal(null); setVerwijderConfirm(false) }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              {modal.mode === 'nieuw' ? 'Nieuw project' : 'Project bewerken'}
            </h2>

            <form onSubmit={handleOpslaan} className="space-y-4">
              <Veld label="Werknummer" vereist>
                <input
                  required
                  value={formulier.werknummer}
                  onChange={(e) =>
                    setFormulier((f) => ({ ...f, werknummer: e.target.value }))
                  }
                  className={INVOER}
                  placeholder="bijv. 2025-001"
                />
              </Veld>

              <Veld label="Omschrijving" vereist>
                <input
                  required
                  value={formulier.omschrijving}
                  onChange={(e) =>
                    setFormulier((f) => ({
                      ...f,
                      omschrijving: e.target.value,
                    }))
                  }
                  className={INVOER}
                  placeholder="Korte omschrijving van het project"
                />
              </Veld>

              <div className="grid grid-cols-2 gap-3">
                <Veld label="Opdrachtgever">
                  <input
                    value={formulier.opdrachtgever}
                    onChange={(e) =>
                      setFormulier((f) => ({
                        ...f,
                        opdrachtgever: e.target.value,
                      }))
                    }
                    className={INVOER}
                  />
                </Veld>
                <Veld label="Aanneemsom (€)">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formulier.aanneemsom}
                    onChange={(e) =>
                      setFormulier((f) => ({
                        ...f,
                        aanneemsom: e.target.value,
                      }))
                    }
                    className={INVOER}
                    placeholder="0"
                  />
                </Veld>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Veld label="Plaats">
                  <input
                    value={formulier.plaats}
                    onChange={(e) =>
                      setFormulier((f) => ({ ...f, plaats: e.target.value }))
                    }
                    className={INVOER}
                  />
                </Veld>
                <Veld label="Adres">
                  <input
                    value={formulier.adres}
                    onChange={(e) =>
                      setFormulier((f) => ({ ...f, adres: e.target.value }))
                    }
                    className={INVOER}
                  />
                </Veld>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {modal.mode === 'bewerk' && (
                  verwijderConfirm ? (
                    <span className="text-sm text-gray-500 mr-auto flex items-center gap-2">
                      Zeker?
                      <button
                        type="button"
                        disabled={bezig}
                        onClick={handleVerwijder}
                        className="text-red-600 font-medium hover:text-red-800 transition-colors disabled:opacity-50"
                      >
                        Ja
                      </button>
                      <span className="text-gray-300">·</span>
                      <button
                        type="button"
                        onClick={() => setVerwijderConfirm(false)}
                        className="text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        Nee
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setVerwijderConfirm(true)}
                      className="mr-auto px-4 py-2 text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      Verwijderen
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => { setModal(null); setVerwijderConfirm(false) }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={bezig}
                  className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {bezig ? 'Opslaan…' : 'Opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const INVOER =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors'

function Veld({ label, vereist, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">
        {label}
        {vereist && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
