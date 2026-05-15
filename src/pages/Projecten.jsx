import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth, heeftVolledigeToegang } from '../context/AuthContext'
import { useTenant } from '../context/TenantContext'
import {
  getProjectenMetStats,
  createProject,
  updateProject,
  deleteProject,
} from '../services/projectenService'
import { KLEURENPALET, projKleur, minstGebruikteKleur } from '../lib/kleurenpalet'

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

const LEEG = {
  werknummer: '',
  omschrijving: '',
  opdrachtgever: '',
  opmerkingen: '',
  projectleider_initialen: '',
  kleur: '',
  plaats: '',
  adres: '',
}

const KOLOMMEN = [
  { veld: 'werknummer',    config: 'werknummer',    label: 'Werknummer',    mono: true },
  { veld: 'omschrijving',  config: 'omschrijving',  label: 'Omschrijving'              },
  { veld: 'opdrachtgever', config: 'opdrachtgever', label: 'Opdrachtgever'             },
  { veld: 'plaats',        config: 'plaats',        label: 'Plaats'                    },
  { veld: 'adres',         config: 'adres',         label: 'Adres'                     },
  { veld: 'opmerkingen',   config: 'opmerkingen',   label: 'Opmerkingen'               },
  { veld: 'pers',          config: 'aantal_personen',label: 'Pers.',    rechts: true, breedte: 55 },
  { veld: 'mandagen',      config: 'mandagen',      label: 'Mandagen', rechts: true, breedte: 55 },
  { veld: 'created_at',    config: 'created_at',    label: 'Ingevoerd',rechts: true, breedte: 90 },
]

function berekenPers(toewijzingen) {
  const today = new Date().toISOString().split('T')[0]
  return toewijzingen.filter(
    (t) => t.datum_van <= today && t.datum_tot >= today
  ).length
}

function berekenMandagen(toewijzingen) {
  return toewijzingen.length
}

export default function Projecten() {
  const { rol } = useAuth()
  const { kolomZichtbaar, veldLabel } = useTenant()
  const kanBewerken = heeftVolledigeToegang(rol)

  const [projecten, setProjecten] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoek, setZoek] = useState('')
  const [filterPL, setFilterPL] = useState('')
  const [sort, setSort] = useState({ veld: 'created_at', dir: 'desc' })
  const [modal, setModal] = useState(null)
  const [formulier, setFormulier] = useState(LEEG)
  const [bezig, setBezig] = useState(false)
  const [verwijderBevestig, setVerwijderBevestig] = useState(null)
  const [kleurPicker, setKleurPicker] = useState(null) // { projectId, top, left }
  const kleurPickerRef = useRef(null)

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

  useEffect(() => {
    if (!kleurPicker) return
    function handler(e) {
      if (kleurPickerRef.current && !kleurPickerRef.current.contains(e.target)) {
        setKleurPicker(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [kleurPicker])

  async function handleKleurKiezen(projectId, hex) {
    try {
      await updateProject(projectId, { kleur: hex })
      setKleurPicker(null)
      await laadProjecten()
    } catch (err) {
      alert('Kleur opslaan mislukt: ' + err.message)
    }
  }

  function openKleurPicker(e, projectId) {
    const rect = e.currentTarget.getBoundingClientRect()
    const popupH = 160
    const top = rect.bottom + 4 + popupH > window.innerHeight
      ? rect.top - popupH - 4
      : rect.bottom + 4
    setKleurPicker({ projectId, top, left: rect.left })
  }

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
    setFormulier({ ...LEEG, kleur: minstGebruikteKleur(projecten) })
    setModal({ mode: 'nieuw' })
  }

  async function handleVerwijder(id) {
    try {
      await deleteProject(id)
      setVerwijderBevestig(null)
      await laadProjecten()
    } catch (err) {
      alert('Verwijderen mislukt: ' + err.message)
    }
  }

  function openBewerk(project) {
    setFormulier({
      werknummer: project.werknummer ?? '',
      omschrijving: project.omschrijving ?? '',
      opdrachtgever: project.opdrachtgever ?? '',
      opmerkingen: project.opmerkingen ?? '',
      projectleider_initialen: project.projectleider_initialen ?? '',
      kleur: project.kleur ?? '',
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
        opmerkingen: formulier.opmerkingen || null,
        projectleider_initialen:
          formulier.projectleider_initialen.trim().toUpperCase() || null,
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

  const totaalMandagen = gesorteerd.reduce((s, p) => s + p.mandagen, 0)
  const zichtbareKolommen = KOLOMMEN.filter((k) => kolomZichtbaar('projecten', k.config))

  return (
    <div className="flex flex-col min-h-0 flex-1">
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
        <div className="border border-gray-200 rounded-xl overflow-auto flex-1 min-h-0">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-8 pl-4 py-2.5" />
                {zichtbareKolommen.map((k) => (
                  <th
                    key={k.veld}
                    onClick={() => toggleSort(k.veld)}
                    style={k.breedte ? { width: k.breedte } : undefined}
                    className={`px-4 py-2.5 font-medium text-gray-500 cursor-pointer select-none hover:text-gray-900 transition-colors whitespace-nowrap ${
                      k.rechts ? 'text-right' : 'text-left'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {veldLabel('projecten', k.config, k.label)}
                      {sort.veld === k.veld && (
                        <span className="text-gray-800 text-xs">
                          {sort.dir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="sticky right-0 w-20 px-4 py-2.5 bg-gray-50" />
              </tr>
            </thead>
            <tbody>
              {gesorteerd.length === 0 ? (
                <tr>
                  <td
                    colSpan={zichtbareKolommen.length + 2}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Geen projecten gevonden
                  </td>
                </tr>
              ) : (
                gesorteerd.map((p) => (
                  <tr
                    key={p.id}
                    className="group border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="pl-4 py-3">
                      <button
                        onClick={kanBewerken ? (e) => openKleurPicker(e, p.id) : undefined}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          backgroundColor: projKleur(p).bg,
                          cursor: kanBewerken ? 'pointer' : 'default',
                          display: 'block',
                          flexShrink: 0,
                        }}
                        title={kanBewerken ? 'Kleur wijzigen' : undefined}
                      />
                    </td>
                    {kolomZichtbaar('projecten', 'werknummer') && (
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                        {p.werknummer}
                        {p.projectleider_initialen && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-sans font-medium non-italic">
                            {p.projectleider_initialen}
                          </span>
                        )}
                      </td>
                    )}
                    {kolomZichtbaar('projecten', 'omschrijving') && (
                      <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                        {p.omschrijving}
                      </td>
                    )}
                    {kolomZichtbaar('projecten', 'opdrachtgever') && (
                      <td className="px-4 py-3 text-gray-600">{p.opdrachtgever || '—'}</td>
                    )}
                    {kolomZichtbaar('projecten', 'plaats') && (
                      <td className="px-4 py-3 text-gray-600">{p.plaats || '—'}</td>
                    )}
                    {kolomZichtbaar('projecten', 'adres') && (
                      <td className="px-4 py-3 text-gray-600">{p.adres || '—'}</td>
                    )}
                    {kolomZichtbaar('projecten', 'opmerkingen') && (
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate text-xs">
                        {p.opmerkingen || '—'}
                      </td>
                    )}
                    {kolomZichtbaar('projecten', 'aantal_personen') && (
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{p.pers}</td>
                    )}
                    {kolomZichtbaar('projecten', 'mandagen') && (
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">{p.mandagen}</td>
                    )}
                    {kolomZichtbaar('projecten', 'created_at') && (
                      <td className="px-4 py-3 text-right tabular-nums text-gray-400 text-xs whitespace-nowrap">
                        {p.created_at ? new Date(p.created_at).toLocaleDateString('nl-NL') : '—'}
                      </td>
                    )}
                    <td className="sticky right-0 px-4 py-3 text-right bg-white group-hover:bg-gray-50 transition-colors">
                      {kanBewerken && (
                        verwijderBevestig === p.id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-gray-500">Zeker?</span>
                            <button
                              onClick={() => handleVerwijder(p.id)}
                              className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                            >
                              Ja
                            </button>
                            <button
                              onClick={() => setVerwijderBevestig(null)}
                              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              Nee
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3">
                            <button
                              onClick={() => openBewerk(p)}
                              title="Bewerken"
                              className="text-gray-300 hover:text-gray-700 transition-colors"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => setVerwijderBevestig(p.id)}
                              title="Verwijderen"
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <TrashIcon />
                            </button>
                          </span>
                        )
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
              <span className="font-medium text-gray-900">{gesorteerd.length}</span>{' '}
              projecten
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
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
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
                      setFormulier((f) => ({ ...f, opdrachtgever: e.target.value }))
                    }
                    className={INVOER}
                  />
                </Veld>
                <Veld label="Projectleider">
                  <input
                    list="pl-initialen"
                    value={formulier.projectleider_initialen}
                    onChange={(e) =>
                      setFormulier((f) => ({
                        ...f,
                        projectleider_initialen: e.target.value.toUpperCase(),
                      }))
                    }
                    className={INVOER}
                    placeholder="bijv. RB"
                    maxLength={5}
                  />
                  <datalist id="pl-initialen">
                    {alleInitialen.map((ini) => (
                      <option key={ini} value={ini} />
                    ))}
                  </datalist>
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

              <Veld label="Opmerkingen">
                <textarea
                  rows={3}
                  value={formulier.opmerkingen}
                  onChange={(e) =>
                    setFormulier((f) => ({ ...f, opmerkingen: e.target.value }))
                  }
                  className={INVOER + ' resize-none'}
                  placeholder="Vrij invulbare notitie…"
                />
              </Veld>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
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

      {/* Kleurpicker popup */}
      {kleurPicker && (
        <div
          ref={kleurPickerRef}
          style={{ position: 'fixed', top: kleurPicker.top, left: kleurPicker.left, zIndex: 100, width: 220 }}
          className="bg-white rounded-xl shadow-xl border border-gray-200 p-2.5"
        >
          <div className="grid grid-cols-10 gap-1">
            {KLEURENPALET.map((hex) => {
              const actief = projecten.find((p) => p.id === kleurPicker.projectId)?.kleur === hex
              return (
                <button
                  key={hex}
                  onClick={() => handleKleurKiezen(kleurPicker.projectId, hex)}
                  style={{
                    backgroundColor: hex,
                    width: 18,
                    height: 18,
                    borderRadius: 3,
                    outline: actief ? '2px solid white' : 'none',
                    boxShadow: actief ? '0 0 0 3px #374151' : 'none',
                    cursor: 'pointer',
                    display: 'block',
                  }}
                />
              )
            })}
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
