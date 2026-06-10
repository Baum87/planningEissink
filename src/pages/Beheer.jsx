import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { fDatumKort } from '../lib/datum'
import {
  lijstGebruikers,
  uitnodigen,
  aanmaken,
  rolWijzigen,
  updateGebruiker,
  verwijderen,
  profielAanmaken,
  profielKoppelen,
  profielKoppelenAanmaken,
  profielenZonderAccount,
  profielVerwijderen,
  profielUpdaten,
} from '../services/gebruikersbeheerService'
import { createPeriode, updatePeriode, deletePeriode } from '../services/periodesService'
import { usePeriodes } from '../hooks/queries'

const ROLLEN = ['admin', 'planner', 'gebruiker', 'monteur']
const ROL_LABELS = { admin: 'Admin', planner: 'Planner', gebruiker: 'Gebruiker', monteur: 'Monteur' }

const TABS = [
  { id: 'gebruikers', label: 'Gebruikers' },
  { id: 'periodes',   label: 'Periodes' },
]

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

function EditIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export default function Beheer() {
  const [actieveTab, setActieveTab] = useState('gebruikers')

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActieveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              actieveTab === tab.id
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actieveTab === 'gebruikers' && <GebruikersTab />}
      {actieveTab === 'periodes'   && <PeriodesTab />}
    </div>
  )
}

// ─── Gebruikers tab ───────────────────────────────────────────────────────────

function GebruikersTab() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: gebruikers = [], isLoading: laden, error: fout } = useQuery({
    queryKey: ['beheer-gebruikers'],
    queryFn: async () => {
      const [{ gebruikers: lijst }, profielen] = await Promise.all([
        lijstGebruikers(),
        profielenZonderAccount(),
      ])
      const metAccount = lijst.map((g) => ({ ...g, heeftAccount: true }))
      const zonderAccount = profielen.map((p) => ({
        id: p.id,
        naam: p.weergave_naam,
        afkorting: p.afkorting,
        email: null,
        rol: null,
        created_at: p.created_at,
        last_sign_in_at: null,
        heeftAccount: false,
      }))
      return [...metAccount, ...zonderAccount]
    },
  })

  async function herlaad() {
    await queryClient.invalidateQueries({ queryKey: ['beheer-gebruikers'] })
  }
  const [sort, setSort] = useState({ veld: 'achternaam', dir: 'asc' })

  function toggleSortG(veld) {
    setSort((prev) => prev.veld === veld
      ? { veld, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { veld, dir: 'asc' }
    )
  }

  const gesorteerd = useMemo(() => {
    const { veld, dir } = sort
    function sortVal(g) {
      if (veld === 'achternaam') return g.naam?.split(' ').slice(1).join(' ') ?? ''
      if (veld === 'voornaam')   return g.naam?.split(' ')[0] ?? ''
      return String(g[veld] ?? '')
    }
    return [...gebruikers].sort((a, b) => {
      const cmp = sortVal(a).localeCompare(sortVal(b), 'nl')
      return dir === 'asc' ? cmp : -cmp
    })
  }, [gebruikers, sort])

  const [toonModal, setToonModal] = useState(null) // null | 'uitnodigen' | 'aanmaken' | 'persoon' | { koppelen: id }
  const [verwijderBevestig, setVerwijderBevestig] = useState(null)
  const [bewerkenGebruiker, setBewerkenGebruiker] = useState(null)
  const [bewerkenProfiel, setBewerkenProfiel] = useState(null)

  async function handleRolWijzig(user_id, rol) {
    await rolWijzigen(user_id, rol)
    await herlaad()
  }

  const [actiFout, setActiFout] = useState(null)

  async function handleVerwijder(g) {
    try {
      if (g.heeftAccount) {
        await verwijderen(g.id)
      } else {
        await profielVerwijderen(g.id)
      }
      await herlaad()
      setVerwijderBevestig(null)
    } catch (e) {
      setActiFout(e.message)
    }
  }

  return (
    <>
      {actiFout && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{actiFout}</span>
          <button onClick={() => setActiFout(null)} className="text-red-400 hover:text-red-700 shrink-0">✕</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gebruikersbeheer</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {laden ? 'Laden…' : `${gebruikers.length} gebruiker${gebruikers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setToonModal('persoon')}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Persoon toevoegen
          </button>
          <button
            onClick={() => setToonModal('aanmaken')}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Aanmaken
          </button>
          <button
            onClick={() => setToonModal('uitnodigen')}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Uitnodigen
          </button>
        </div>
      </div>

      {fout && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{fout?.message || fout}</div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-auto flex-1 min-h-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {[
                { label: 'Voornaam',      veld: 'voornaam' },
                { label: 'Achternaam',    veld: 'achternaam' },
                { label: '',              veld: 'afkorting' },
                { label: 'E-mail',        veld: 'email' },
                { label: 'Rol',           veld: 'rol' },
                { label: 'Toegevoegd',    veld: 'created_at' },
                { label: 'Laatste login', veld: 'last_sign_in_at' },
              ].map(({ label, veld }) => (
                <th
                  key={veld}
                  onClick={() => toggleSortG(veld)}
                  className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors whitespace-nowrap"
                >
                  {label}
                  {sort.veld === veld && (
                    <span className="ml-1 text-xs text-gray-800">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {laden ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Laden…</td></tr>
            ) : gesorteerd.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Geen gebruikers gevonden</td></tr>
            ) : (
              gesorteerd.map((g) => {
                const isZijzelf = g.id === user?.id
                return (
                  <tr
                    key={g.id}
                    onClick={() => {
                      if (verwijderBevestig === g.id) return
                      if (g.heeftAccount) setBewerkenGebruiker(g)
                      else setBewerkenProfiel(g)
                    }}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 group cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {g.naam?.split(' ')[0] || '—'}
                      {isZijzelf && <span className="ml-2 text-xs text-gray-400">(jij)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{g.naam?.split(' ').slice(1).join(' ') || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{g.afkorting ?? ''}</td>
                    <td className="px-4 py-3 text-gray-500">{g.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      {g.heeftAccount ? (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {ROL_LABELS[g.rol] ?? g.rol}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                          Geen account
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fDatumKort(g.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{g.last_sign_in_at ? fDatumKort(g.last_sign_in_at) : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {!isZijzelf && (
                        verwijderBevestig === g.id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-gray-500">Zeker?</span>
                            <button onClick={(e) => { e.stopPropagation(); handleVerwijder(g) }} className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">Ja</button>
                            <button onClick={(e) => { e.stopPropagation(); setVerwijderBevestig(null) }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Nee</button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-3">
                            {!g.heeftAccount && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setToonModal({ koppelen: g.id }) }}
                                className="text-xs text-blue-500 hover:text-blue-700 transition-colors whitespace-nowrap"
                              >
                                Koppel account
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setVerwijderBevestig(g.id) }}
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
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {toonModal === 'uitnodigen' && (
        <UitnodigModal
          onClose={() => setToonModal(null)}
          onSuccess={() => { setToonModal(null); laad() }}
        />
      )}
      {toonModal === 'aanmaken' && (
        <AanmakenModal
          onClose={() => setToonModal(null)}
          onSuccess={() => { setToonModal(null); laad() }}
        />
      )}
      {toonModal === 'persoon' && (
        <ProfielAanmakenModal
          onClose={() => setToonModal(null)}
          onSuccess={() => { setToonModal(null); laad() }}
        />
      )}
      {toonModal?.koppelen && (
        <ProfielKoppelenModal
          profielId={toonModal.koppelen}
          onClose={() => setToonModal(null)}
          onSuccess={() => { setToonModal(null); laad() }}
        />
      )}
      {bewerkenProfiel && (
        <ProfielBewerkenModal
          profiel={bewerkenProfiel}
          onOpgeslagen={herlaad}
          onClose={() => setBewerkenProfiel(null)}
        />
      )}
      {bewerkenGebruiker && (
        <GebruikerModal
          gebruiker={bewerkenGebruiker}
          isZijzelf={bewerkenGebruiker.id === user?.id}
          onOpgeslagen={herlaad}
          onClose={() => setBewerkenGebruiker(null)}
        />
      )}
    </>
  )
}

// ─── Periodes tab ─────────────────────────────────────────────────────────────

function PeriodesTab() {
  const queryClient = useQueryClient()
  const { data: periodes = [], isLoading: laden, error: foutObj } = usePeriodes()
  const fout = foutObj?.message || null
  const [sort, setSort] = useState({ veld: 'datum_van', dir: 'asc' })
  const [modal, setModal] = useState(null) // null | periode-object (bewerk) | 'nieuw'
  const [verwijderBevestig, setVerwijderBevestig] = useState(null)
  const [actiFout, setActiFout] = useState(null)

  function toggleSortP(veld) {
    setSort((prev) => prev.veld === veld
      ? { veld, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { veld, dir: 'asc' }
    )
  }

  const gesorteerd = useMemo(() => {
    const { veld, dir } = sort
    return [...periodes].sort((a, b) => {
      const av = a[veld] ?? ''
      const bv = b[veld] ?? ''
      const cmp = String(av).localeCompare(String(bv), 'nl')
      return dir === 'asc' ? cmp : -cmp
    })
  }, [periodes, sort])

  async function handleVerwijder(p) {
    try {
      await deletePeriode(p.id)
      await queryClient.invalidateQueries({ queryKey: ['periodes'] })
      setVerwijderBevestig(null)
    } catch (e) {
      setActiFout(e.message)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Periodes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Feestdagen en vakantieperiodes</p>
        </div>
        <button
          onClick={() => setModal('nieuw')}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Toevoegen
        </button>
      </div>

      {(fout || actiFout) && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{fout || actiFout}</span>
          {actiFout && <button onClick={() => setActiFout(null)} className="text-red-400 hover:text-red-700 shrink-0">✕</button>}
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-auto flex-1 min-h-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {[
                { label: 'Naam',  veld: 'naam' },
                { label: 'Van',   veld: 'datum_van' },
                { label: 'Tot',   veld: 'datum_tot' },
                { label: 'Type',  veld: 'blokkeer' },
              ].map(({ label, veld }) => (
                <th
                  key={veld}
                  onClick={() => toggleSortP(veld)}
                  className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors whitespace-nowrap"
                >
                  {label}
                  {sort.veld === veld && (
                    <span className="ml-1 text-xs text-gray-800">{sort.dir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {laden ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Laden…</td></tr>
            ) : gesorteerd.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Geen periodes gevonden</td></tr>
            ) : (
              gesorteerd.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => verwijderBevestig !== p.id && setModal(p)}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 group cursor-pointer"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{p.naam}</td>
                  <td className="px-4 py-3 text-gray-600">{fDatumKort(p.datum_van)}</td>
                  <td className="px-4 py-3 text-gray-600">{fDatumKort(p.datum_tot)}</td>
                  <td className="px-4 py-3">
                    {p.blokkeer !== false ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                        Feestdag
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                        Bouwvak / vakantie
                      </span>
                    )}
                  </td>
                  <td className="sticky right-0 px-4 py-3 text-right bg-white group-hover:bg-gray-50 transition-colors">
                    {verwijderBevestig === p.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-gray-500">Zeker?</span>
                        <button onClick={(e) => { e.stopPropagation(); handleVerwijder(p) }} className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors">Ja</button>
                        <button onClick={(e) => { e.stopPropagation(); setVerwijderBevestig(null) }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Nee</button>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setVerwijderBevestig(p.id) }}
                        title="Verwijderen"
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <PeriodeModal
          periode={modal === 'nieuw' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); queryClient.invalidateQueries({ queryKey: ['periodes'] }) }}
        />
      )}
    </>
  )
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function UitnodigModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [afkorting, setAfkorting] = useState('')
  const [rol, setRol] = useState('gebruiker')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      const naam = `${voornaam.trim()} ${achternaam.trim()}`.trim()
      await uitnodigen(email.trim(), naam, afkorting.trim() || null, rol)
      onSuccess()
    } catch (e) {
      setFout(e.message)
      setBezig(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Gebruiker uitnodigen</h2>
        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="naam@bedrijf.nl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voornaam</label>
              <input type="text" required value={voornaam} onChange={(e) => setVoornaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Achternaam</label>
              <input type="text" required value={achternaam} onChange={(e) => setAchternaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jansen" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Afkorting <span className="text-gray-400 font-normal">(optioneel, max 4 tekens)</span>
            </label>
            <input type="text" value={afkorting} onChange={(e) => setAfkorting(e.target.value.slice(0, 4).toUpperCase())}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="JJ" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              {ROLLEN.map((r) => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
            </select>
          </div>
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={bezig}
              className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {bezig ? 'Uitnodigen…' : 'Uitnodiging sturen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AanmakenModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [afkorting, setAfkorting] = useState('')
  const [rol, setRol] = useState('gebruiker')
  const [wachtwoord, setWachtwoord] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      const naam = `${voornaam.trim()} ${achternaam.trim()}`.trim()
      await aanmaken(email.trim(), naam, afkorting.trim() || null, rol, wachtwoord)
      onSuccess()
    } catch (e) {
      setFout(e.message)
      setBezig(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Gebruiker aanmaken</h2>
        <p className="text-sm text-gray-400 mb-5">Geen e-mail verstuurd — deel de inloggegevens zelf.</p>
        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="naam@bedrijf.nl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voornaam</label>
              <input type="text" required value={voornaam} onChange={(e) => setVoornaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Achternaam</label>
              <input type="text" required value={achternaam} onChange={(e) => setAchternaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jansen" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Afkorting <span className="text-gray-400 font-normal">(optioneel, max 4 tekens)</span>
            </label>
            <input type="text" value={afkorting} onChange={(e) => setAfkorting(e.target.value.slice(0, 4).toUpperCase())}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="JJ" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              {ROLLEN.map((r) => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
            <input type="text" required minLength={8} value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Minimaal 8 tekens" />
          </div>
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={bezig}
              className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {bezig ? 'Aanmaken…' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GebruikerModal({ gebruiker, isZijzelf, onOpgeslagen, onClose }) {
  const naamDelen = (gebruiker.naam ?? '').split(' ')
  const [voornaam, setVoornaam] = useState(naamDelen[0] ?? '')
  const [achternaam, setAchternaam] = useState(naamDelen.slice(1).join(' ') ?? '')
  const [email, setEmail] = useState(gebruiker.email ?? '')
  const [afkorting, setAfkorting] = useState(gebruiker.afkorting ?? '')
  const [rol, setRol] = useState(gebruiker.rol)
  const [wachtwoord, setWachtwoord] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      const naam = `${voornaam.trim()} ${achternaam.trim()}`.trim()
      await updateGebruiker(gebruiker.id, {
        naam:       naam                                 || undefined,
        email:      email.trim()                         || undefined,
        afkorting:  afkorting.trim()                     || null,
        wachtwoord: wachtwoord                           || undefined,
        rol:        rol !== gebruiker.rol ? rol : undefined,
      })
      onOpgeslagen({ ...gebruiker, naam, email: email.trim(), afkorting: afkorting.trim() || null, rol })
      onClose()
    } catch (e) {
      setFout(e.message)
      setBezig(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-gray-900 mb-5">Gebruiker bewerken</h2>
        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voornaam</label>
              <input type="text" value={voornaam} onChange={(e) => setVoornaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jan" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Achternaam</label>
              <input type="text" value={achternaam} onChange={(e) => setAchternaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jansen" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Afkorting <span className="text-gray-400 font-normal">(optioneel, max 4 tekens)</span>
            </label>
            <input type="text" value={afkorting}
              onChange={(e) => setAfkorting(e.target.value.slice(0, 4).toUpperCase())}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="bijv. JK" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nieuw wachtwoord <span className="text-gray-400 font-normal">(laat leeg om niet te wijzigen)</span>
            </label>
            <input type="text" value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)}
              minLength={wachtwoord ? 8 : undefined}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Minimaal 8 tekens" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select value={rol} disabled={isZijzelf} onChange={(e) => setRol(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
              {ROLLEN.map((r) => <option key={r} value={r}>{ROL_LABELS[r]}</option>)}
            </select>
          </div>
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={bezig}
              className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {bezig ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProfielBewerkenModal({ profiel, onOpgeslagen, onClose }) {
  const naamDelen = (profiel.naam ?? '').split(' ')
  const [voornaam, setVoornaam] = useState(naamDelen[0] ?? '')
  const [achternaam, setAchternaam] = useState(naamDelen.slice(1).join(' ') ?? '')
  const [afkorting, setAfkorting] = useState(profiel.afkorting ?? '')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      const naam = `${voornaam.trim()} ${achternaam.trim()}`.trim()
      await profielUpdaten(profiel.id, { weergave_naam: naam, afkorting: afkorting.trim() || null })
      onOpgeslagen({ ...profiel, naam, afkorting: afkorting.trim() || null })
      onClose()
    } catch (e) {
      setFout(e.message)
      setBezig(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-gray-900 mb-5">Persoon bewerken</h2>
        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voornaam</label>
              <input type="text" value={voornaam} onChange={(e) => setVoornaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jan" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Achternaam</label>
              <input type="text" value={achternaam} onChange={(e) => setAchternaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jansen" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Afkorting <span className="text-gray-400 font-normal">(max 4 tekens)</span>
            </label>
            <input type="text" value={afkorting} onChange={(e) => setAfkorting(e.target.value.slice(0, 4).toUpperCase())}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="JJ" />
          </div>
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={bezig}
              className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {bezig ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProfielAanmakenModal({ onClose, onSuccess }) {
  const [voornaam, setVoornaam] = useState('')
  const [achternaam, setAchternaam] = useState('')
  const [afkorting, setAfkorting] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      const naam = `${voornaam.trim()} ${achternaam.trim()}`.trim()
      await profielAanmaken(naam, afkorting.trim() || null)
      onSuccess()
    } catch (e) {
      setFout(e.message)
      setBezig(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Persoon toevoegen</h2>
        <p className="text-sm text-gray-400 mb-5">Geen loginaccount — alleen naam en afkorting. Geschikt voor projectleiders als referentie.</p>
        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voornaam</label>
              <input type="text" required value={voornaam} onChange={(e) => setVoornaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jan" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Achternaam</label>
              <input type="text" required value={achternaam} onChange={(e) => setAchternaam(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Jansen" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Afkorting <span className="text-gray-400 font-normal">(max 4 tekens)</span>
            </label>
            <input type="text" value={afkorting} onChange={(e) => setAfkorting(e.target.value.slice(0, 4).toUpperCase())}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="JJ" />
          </div>
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={bezig}
              className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {bezig ? 'Toevoegen…' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProfielKoppelenModal({ profielId, onClose, onSuccess }) {
  const [modus, setModus] = useState('uitnodigen') // 'uitnodigen' | 'aanmaken'
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      if (modus === 'uitnodigen') {
        await profielKoppelen(profielId, email.trim())
      } else {
        await profielKoppelenAanmaken(profielId, email.trim(), wachtwoord)
      }
      onSuccess()
    } catch (e) {
      setFout(e.message)
      setBezig(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Loginaccount koppelen</h2>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-5">
          {[['uitnodigen', 'Via uitnodiging'], ['aanmaken', 'Direct aanmaken']].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => { setModus(val); setFout(null) }}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
                modus === val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-5">
          {modus === 'uitnodigen'
            ? 'Stuurt een e-mail waarmee de persoon zelf een wachtwoord instelt.'
            : 'Geen e-mail verstuurd — deel de inloggegevens zelf.'}
        </p>

        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="naam@bedrijf.nl" autoFocus />
          </div>
          {modus === 'aanmaken' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
              <input type="text" required minLength={8} value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Minimaal 8 tekens" />
            </div>
          )}
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={bezig}
              className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {bezig ? 'Bezig…' : modus === 'uitnodigen' ? 'Uitnodiging sturen' : 'Aanmaken'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PeriodeModal({ periode, onClose, onSuccess }) {
  const isBewerk = !!periode
  const [naam, setNaam] = useState(periode?.naam ?? '')
  const [van, setVan] = useState(periode?.datum_van ?? '')
  const [tot, setTot] = useState(periode?.datum_tot ?? '')
  const [blokkeer, setBlokkeer] = useState(periode ? periode.blokkeer !== false : true)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      if (isBewerk) {
        await updatePeriode(periode.id, { naam: naam.trim(), datum_van: van, datum_tot: tot, blokkeer })
      } else {
        await createPeriode({ naam: naam.trim(), datum_van: van, datum_tot: tot, blokkeer })
      }
      onSuccess()
    } catch (e) {
      setFout(e.message)
      setBezig(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          {isBewerk ? 'Periode bewerken' : 'Periode toevoegen'}
        </h2>
        <form onSubmit={submit} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
            <input type="text" required value={naam} onChange={(e) => setNaam(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Kerst, Bouwvak 2025…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Van</label>
              <input type="date" required value={van}
                onChange={(e) => { setVan(e.target.value); if (e.target.value > tot) setTot(e.target.value) }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tot</label>
              <input type="date" required value={tot} min={van} onChange={(e) => setTot(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={blokkeer ? 'feestdag' : 'bouwvak'} onChange={(e) => setBlokkeer(e.target.value === 'feestdag')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
              <option value="feestdag">Feestdag — altijd geblokkeerd</option>
              <option value="bouwvak">Bouwvak / vakantie — wel inplanbaar</option>
            </select>
          </div>
          {fout && <p className="text-sm text-red-600">{fout}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Annuleren
            </button>
            <button type="submit" disabled={bezig}
              className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
              {bezig ? 'Opslaan…' : isBewerk ? 'Opslaan' : 'Toevoegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
