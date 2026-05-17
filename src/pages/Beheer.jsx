import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  lijstGebruikers,
  uitnodigen,
  rolWijzigen,
  verwijderen,
} from '../services/gebruikersbeheerService'

const ROLLEN = ['admin', 'planner', 'gebruiker', 'monteur']
const ROL_LABELS = { admin: 'Admin', planner: 'Planner', gebruiker: 'Gebruiker', monteur: 'Monteur' }

function fDatum(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Beheer() {
  const { user } = useAuth()
  const [gebruikers, setGebruikers] = useState([])
  const [laden, setLaden] = useState(true)
  const [fout, setFout] = useState(null)
  const [toonModal, setToonModal] = useState(false)

  async function laad() {
    setLaden(true)
    setFout(null)
    try {
      const { gebruikers: lijst } = await lijstGebruikers()
      setGebruikers(lijst)
    } catch (e) {
      setFout(e.message)
    } finally {
      setLaden(false)
    }
  }

  useEffect(() => { laad() }, [])

  async function handleRolWijzig(user_id, rol) {
    try {
      await rolWijzigen(user_id, rol)
      setGebruikers((prev) => prev.map((g) => g.id === user_id ? { ...g, rol } : g))
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleVerwijder(g) {
    if (!confirm(`${g.naam || g.email} verwijderen? Dit kan niet ongedaan worden.`)) return
    try {
      await verwijderen(g.id)
      setGebruikers((prev) => prev.filter((x) => x.id !== g.id))
    } catch (e) {
      alert(e.message)
    }
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gebruikersbeheer</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {laden ? 'Laden…' : `${gebruikers.length} gebruiker${gebruikers.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setToonModal(true)}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          Uitnodigen
        </button>
      </div>

      {fout && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {fout}
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-auto flex-1 min-h-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Naam</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">E-mail</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Toegevoegd</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Laatste login</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {laden ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Laden…</td>
              </tr>
            ) : gebruikers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Geen gebruikers gevonden</td>
              </tr>
            ) : (
              gebruikers.map((g) => {
                const isZijzelf = g.id === user?.id
                return (
                  <tr key={g.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {g.naam || '—'}
                      {isZijzelf && <span className="ml-2 text-xs text-gray-400">(jij)</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{g.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={g.rol}
                        disabled={isZijzelf}
                        onChange={(e) => handleRolWijzig(g.id, e.target.value)}
                        className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ROLLEN.map((r) => (
                          <option key={r} value={r}>{ROL_LABELS[r]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fDatum(g.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500">{fDatum(g.last_sign_in_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {!isZijzelf && (
                        <button
                          onClick={() => handleVerwijder(g)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Verwijderen
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {toonModal && (
        <UitnodigModal
          onClose={() => setToonModal(false)}
          onSuccess={() => { setToonModal(false); laad() }}
        />
      )}
    </div>
  )
}

function UitnodigModal({ onClose, onSuccess }) {
  const [email, setEmail] = useState('')
  const [naam, setNaam] = useState('')
  const [afkorting, setAfkorting] = useState('')
  const [rol, setRol] = useState('gebruiker')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    try {
      await uitnodigen(email.trim(), naam.trim(), afkorting.trim() || null, rol)
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
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="naam@bedrijf.nl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volledige naam</label>
            <input
              type="text"
              required
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Jan Jansen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Afkorting{' '}
              <span className="text-gray-400 font-normal">(optioneel, max 4 tekens)</span>
            </label>
            <input
              type="text"
              value={afkorting}
              onChange={(e) => setAfkorting(e.target.value.slice(0, 4).toUpperCase())}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="JJ"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {ROLLEN.map((r) => (
                <option key={r} value={r}>{ROL_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {fout && <p className="text-sm text-red-600">{fout}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={bezig}
              className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {bezig ? 'Uitnodigen…' : 'Uitnodiging sturen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
