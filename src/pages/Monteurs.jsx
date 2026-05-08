import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getMonteurs,
  createMonteur,
  updateMonteur,
  deleteMonteur,
  getGroepen,
  createGroep,
  updateGroepNaam,
  deleteGroep,
  setGroepLeden,
} from '../services/monteursService'

const EXPERTISE_OPTIES = ['Plafonds', 'Wanden', 'Systeemwanden', 'Afsmeren', 'Overig']
const FILTER_OPTIES = ['Allemaal', ...EXPERTISE_OPTIES]

const AVATAR_KLEUREN = [
  ['#dbeafe', '#1e40af'],
  ['#dcfce7', '#166534'],
  ['#fef3c7', '#92400e'],
  ['#fce7f3', '#9d174d'],
  ['#ede9fe', '#5b21b6'],
  ['#ffedd5', '#9a3412'],
  ['#cffafe', '#155e75'],
  ['#d1fae5', '#064e3b'],
]

function avatarKleur(naam = '') {
  return AVATAR_KLEUREN[naam.charCodeAt(0) % AVATAR_KLEUREN.length]
}

function initialen(naam = '') {
  return naam.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function monteurNaam(m) {
  return [m.voornaam, m.achternaam].filter(Boolean).join(' ')
}

const LEEG_MONTEUR = {
  voornaam: '',
  achternaam: '',
  bedrijfsnaam: '',
  type: 'Eissink',
  expertises: [],
  telefoon: '',
  woonplaats: '',
}

const KOLOMMEN = [
  { veld: 'voornaam',     label: 'Voornaam'     },
  { veld: 'achternaam',   label: 'Achternaam'   },
  { veld: 'bedrijfsnaam', label: 'Bedrijfsnaam' },
  { veld: 'type',         label: 'Type'         },
  { veld: 'expertises',   label: 'Expertise'    },
  { veld: 'telefoon',     label: 'Telefoon'     },
  { veld: 'woonplaats',   label: 'Woonplaats'   },
]

// ─── Hoofdpagina ──────────────────────────────────────────────────────────────

export default function Monteurs() {
  const { rol } = useAuth()
  const kanBewerken = rol === 'beheerder' || rol === 'planner'

  const [monteurs, setMonteurs] = useState([])
  const [groepen, setGroepen] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoek, setZoek] = useState('')
  const [filter, setFilter] = useState('Allemaal')
  const [sort, setSort] = useState({ veld: 'achternaam', dir: 'asc' })
  const [monteurModal, setMonteurModal] = useState(null)
  const [groepModal, setGroepModal] = useState(null)
  const [verwijderBevestig, setVerwijderBevestig] = useState(null)

  async function laad() {
    setLoading(true)
    setError(null)
    try {
      const [m, g] = await Promise.all([getMonteurs(), getGroepen()])
      setMonteurs(m)
      setGroepen(g)
    } catch {
      setError('Kon data niet ophalen. Controleer de verbinding met Supabase.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    laad()
  }, [])

  const gefilterd = useMemo(() => {
    const q = zoek.trim().toLowerCase()
    return monteurs.filter((m) => {
      const matchZoek =
        !q ||
        m.voornaam?.toLowerCase().includes(q) ||
        m.achternaam?.toLowerCase().includes(q) ||
        m.bedrijfsnaam?.toLowerCase().includes(q) ||
        m.expertises?.some((e) => e.toLowerCase().includes(q))
      const matchFilter =
        filter === 'Allemaal' ||
        m.expertises?.some((e) => e.toLowerCase() === filter.toLowerCase())
      return matchZoek && matchFilter
    })
  }, [monteurs, zoek, filter])

  const gesorteerd = useMemo(() => {
    const { veld, dir } = sort
    return [...gefilterd].sort((a, b) => {
      const av = veld === 'expertises' ? (a.expertises ?? []).join(', ') : (a[veld] ?? '')
      const bv = veld === 'expertises' ? (b.expertises ?? []).join(', ') : (b[veld] ?? '')
      const cmp = String(av).localeCompare(String(bv), 'nl')
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

  async function handleVerwijder(id) {
    try {
      await deleteMonteur(id)
      setVerwijderBevestig(null)
      await laad()
    } catch (err) {
      alert('Verwijderen mislukt: ' + err.message)
    }
  }

  return (
    <div>
      {/* ── Groepen ─────────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Groepen</h2>
          {kanBewerken && (
            <button
              onClick={() => setGroepModal({ mode: 'nieuw' })}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              + Nieuwe groep
            </button>
          )}
        </div>

        {!loading && groepen.length === 0 ? (
          <p className="text-sm text-gray-400">Nog geen groepen aangemaakt.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {groepen.map((g) => (
              <GroepKaart
                key={g.id}
                groep={g}
                monteurs={monteurs}
                kanBewerken={kanBewerken}
                onBeheer={() => setGroepModal({ mode: 'bewerk', groep: g })}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="search"
          placeholder="Zoek op naam, bedrijf of expertise…"
          value={zoek}
          onChange={(e) => setZoek(e.target.value)}
          className="w-72 px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors"
        />
        <div className="flex gap-1.5 flex-wrap">
          {FILTER_OPTIES.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filter === opt
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {kanBewerken && (
          <button
            onClick={() => setMonteurModal({ mode: 'nieuw' })}
            className="ml-auto px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            + Nieuwe monteur
          </button>
        )}
      </div>

      {/* ── Error / Loading ──────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="py-20 text-center text-sm text-gray-400">
          Monteurs laden…
        </div>
      )}

      {/* ── Tabel ───────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {KOLOMMEN.map((k) => (
                  <th
                    key={k.veld}
                    onClick={() => toggleSort(k.veld)}
                    className="px-4 py-2.5 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-900 transition-colors whitespace-nowrap"
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
                {kanBewerken && <th className="w-20 px-4 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {gesorteerd.length === 0 ? (
                <tr>
                  <td
                    colSpan={KOLOMMEN.length + 1}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    Geen monteurs gevonden
                  </td>
                </tr>
              ) : (
                gesorteerd.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-600">{m.voornaam || '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{m.achternaam}</td>
                    <td className="px-4 py-3 text-gray-600">{m.bedrijfsnaam || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          m.type === 'Eissink'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {(m.expertises ?? []).length > 0 ? m.expertises.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.telefoon || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.woonplaats || '—'}</td>
                    {kanBewerken && (
                      <td className="px-4 py-3 text-right">
                        {verwijderBevestig === m.id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs text-gray-500">Zeker?</span>
                            <button
                              onClick={() => handleVerwijder(m.id)}
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
                              onClick={() => setMonteurModal({ mode: 'bewerk', monteur: m })}
                              title="Bewerken"
                              className="text-gray-300 hover:text-gray-700 transition-colors"
                            >
                              <EditIcon />
                            </button>
                            <button
                              onClick={() => setVerwijderBevestig(m.id)}
                              title="Verwijderen"
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <TrashIcon />
                            </button>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Totaalbalk */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
            <span className="font-medium text-gray-900">{gesorteerd.length}</span> monteurs
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {monteurModal && (
        <MonteurModal
          modal={monteurModal}
          onClose={() => setMonteurModal(null)}
          onOpgeslagen={laad}
        />
      )}
      {groepModal && (
        <GroepModal
          modal={groepModal}
          monteurs={monteurs}
          onClose={() => setGroepModal(null)}
          onOpgeslagen={laad}
        />
      )}
    </div>
  )
}

// ─── GroepKaart ───────────────────────────────────────────────────────────────

function GroepKaart({ groep, monteurs, kanBewerken, onBeheer }) {
  const leden = (groep.groep_leden ?? [])
    .map((gl) => { const m = monteurs.find((x) => x.id === gl.monteur_id); return m ? monteurNaam(m) : null })
    .filter(Boolean)

  return (
    <div className="flex items-center gap-4 px-4 py-3 border border-gray-200 rounded-xl bg-white">
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900">{groep.naam}</div>
        <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">
          {leden.length === 0 ? 'Geen leden' : leden.join(', ')}
        </div>
      </div>
      {kanBewerken && (
        <button
          onClick={onBeheer}
          className="text-xs text-gray-400 hover:text-gray-700 whitespace-nowrap transition-colors"
        >
          Beheren
        </button>
      )}
    </div>
  )
}

// ─── MonteurModal ─────────────────────────────────────────────────────────────

function MonteurModal({ modal, onClose, onOpgeslagen }) {
  const [formulier, setFormulier] = useState(() =>
    modal.mode === 'bewerk'
      ? {
          voornaam:     modal.monteur.voornaam     ?? '',
          achternaam:   modal.monteur.achternaam   ?? '',
          bedrijfsnaam: modal.monteur.bedrijfsnaam ?? '',
          type:         modal.monteur.type         ?? 'Eissink',
          expertises:   modal.monteur.expertises   ?? [],
          telefoon:     modal.monteur.telefoon     ?? '',
          woonplaats:   modal.monteur.woonplaats   ?? '',
        }
      : { ...LEEG_MONTEUR }
  )
  const [bezig, setBezig] = useState(false)

  function toggleExpertise(opt) {
    setFormulier((f) => ({
      ...f,
      expertises: f.expertises.includes(opt)
        ? f.expertises.filter((e) => e !== opt)
        : [...f.expertises, opt],
    }))
  }

  async function handleOpslaan(e) {
    e.preventDefault()
    setBezig(true)
    try {
      const payload = {
        voornaam:     formulier.voornaam     || null,
        achternaam:   formulier.achternaam,
        bedrijfsnaam: formulier.bedrijfsnaam || null,
        type:         formulier.type,
        expertises:   formulier.expertises,
        telefoon:     formulier.telefoon     || null,
        woonplaats:   formulier.woonplaats   || null,
      }
      if (modal.mode === 'nieuw') {
        await createMonteur(payload)
      } else {
        await updateMonteur(modal.monteur.id, payload)
      }
      onOpgeslagen()
      onClose()
    } catch (err) {
      alert('Opslaan mislukt: ' + err.message)
    } finally {
      setBezig(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-base font-semibold text-gray-900 mb-5">
        {modal.mode === 'nieuw' ? 'Nieuwe monteur' : 'Monteur bewerken'}
      </h2>
      <form onSubmit={handleOpslaan} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Veld label="Voornaam">
            <input
              value={formulier.voornaam}
              onChange={(e) => setFormulier((f) => ({ ...f, voornaam: e.target.value }))}
              className={INVOER}
              placeholder="Voornaam"
            />
          </Veld>
          <Veld label="Achternaam" vereist>
            <input
              required
              value={formulier.achternaam}
              onChange={(e) => setFormulier((f) => ({ ...f, achternaam: e.target.value }))}
              className={INVOER}
              placeholder="Achternaam"
            />
          </Veld>
        </div>

        <Veld label="Bedrijfsnaam">
          <input
            value={formulier.bedrijfsnaam}
            onChange={(e) => setFormulier((f) => ({ ...f, bedrijfsnaam: e.target.value }))}
            className={INVOER}
            placeholder="Bedrijfsnaam (optioneel)"
          />
        </Veld>

        <Veld label="Type">
          <div className="flex gap-2">
            {['Eissink', 'Onderaannemer'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormulier((f) => ({ ...f, type: t }))}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  formulier.type === t
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Veld>

        <Veld label="Expertises">
          <div className="flex flex-wrap gap-2">
            {EXPERTISE_OPTIES.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleExpertise(opt)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  formulier.expertises.includes(opt)
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </Veld>

        <div className="grid grid-cols-2 gap-3">
          <Veld label="Telefoon">
            <input
              type="tel"
              value={formulier.telefoon}
              onChange={(e) => setFormulier((f) => ({ ...f, telefoon: e.target.value }))}
              className={INVOER}
              placeholder="06-12345678"
            />
          </Veld>
          <Veld label="Woonplaats">
            <input
              value={formulier.woonplaats}
              onChange={(e) => setFormulier((f) => ({ ...f, woonplaats: e.target.value }))}
              className={INVOER}
            />
          </Veld>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={ANNULEER}>
            Annuleren
          </button>
          <button type="submit" disabled={bezig} className={OPSLAAN}>
            {bezig ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── GroepModal ───────────────────────────────────────────────────────────────

function GroepModal({ modal, monteurs, onClose, onOpgeslagen }) {
  const bestaand = modal.groep ?? null
  const [naam, setNaam] = useState(bestaand?.naam ?? '')
  const [leden, setLeden] = useState(() =>
    (bestaand?.groep_leden ?? []).map((gl) => gl.monteur_id)
  )
  const [toevoegenId, setToevoegenId] = useState('')
  const [bevestigVerwijder, setBevestigVerwijder] = useState(false)
  const [bezig, setBezig] = useState(false)

  const beschikbaar = monteurs.filter((m) => !leden.includes(m.id))

  function verwijderLid(id) {
    setLeden((prev) => prev.filter((l) => l !== id))
  }

  function voegLidToe() {
    if (!toevoegenId || leden.includes(toevoegenId)) return
    setLeden((prev) => [...prev, toevoegenId])
    setToevoegenId('')
  }

  async function handleOpslaan(e) {
    e.preventDefault()
    if (!naam.trim()) return
    setBezig(true)
    try {
      let groepId
      if (modal.mode === 'nieuw') {
        const g = await createGroep(naam.trim())
        groepId = g.id
      } else {
        await updateGroepNaam(bestaand.id, naam.trim())
        groepId = bestaand.id
      }
      await setGroepLeden(groepId, leden)
      onOpgeslagen()
      onClose()
    } catch (err) {
      alert('Opslaan mislukt: ' + err.message)
    } finally {
      setBezig(false)
    }
  }

  async function handleVerwijder() {
    setBezig(true)
    try {
      await deleteGroep(bestaand.id)
      onOpgeslagen()
      onClose()
    } catch (err) {
      alert('Verwijderen mislukt: ' + err.message)
    } finally {
      setBezig(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-base font-semibold text-gray-900 mb-5">
        {modal.mode === 'nieuw' ? 'Nieuwe groep' : 'Groep beheren'}
      </h2>
      <form onSubmit={handleOpslaan} className="space-y-4">
        <Veld label="Groepsnaam" vereist>
          <input
            required
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            className={INVOER}
            placeholder="Bijv. Ploeg Noord"
          />
        </Veld>

        <Veld label="Leden">
          <div className="space-y-0.5">
            {leden.length === 0 && (
              <p className="text-xs text-gray-400 py-1">Nog geen leden toegevoegd.</p>
            )}
            {leden.map((id) => {
              const m = monteurs.find((x) => x.id === id)
              if (!m) return null
              const nm = monteurNaam(m)
              const [bg, fg] = avatarKleur(nm)
              return (
                <div key={id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={{ backgroundColor: bg, color: fg }}
                    >
                      {initialen(nm)}
                    </div>
                    <span className="text-sm text-gray-900">{nm}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => verwijderLid(id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Verwijderen
                  </button>
                </div>
              )
            })}
          </div>
        </Veld>

        {beschikbaar.length > 0 && (
          <div className="flex gap-2">
            <select
              value={toevoegenId}
              onChange={(e) => setToevoegenId(e.target.value)}
              className={`flex-1 ${INVOER}`}
            >
              <option value="">Monteur toevoegen…</option>
              {beschikbaar.map((m) => (
                <option key={m.id} value={m.id}>
                  {monteurNaam(m)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={voegLidToe}
              disabled={!toevoegenId}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Toevoegen
            </button>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div>
            {modal.mode === 'bewerk' &&
              (bevestigVerwijder ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Zeker weten?</span>
                  <button
                    type="button"
                    onClick={handleVerwijder}
                    disabled={bezig}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Ja, verwijderen
                  </button>
                  <button
                    type="button"
                    onClick={() => setBevestigVerwijder(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Annuleren
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setBevestigVerwijder(true)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Groep verwijderen
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={ANNULEER}>
              Annuleren
            </button>
            <button type="submit" disabled={bezig} className={OPSLAAN}>
              {bezig ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ─── Gedeelde hulpcomponenten ─────────────────────────────────────────────────

function Modal({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

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

function TrashIcon() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

const INVOER =
  'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 transition-colors'
const ANNULEER =
  'px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors'
const OPSLAAN =
  'px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors'
