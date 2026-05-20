import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState(null)
  const [bezig, setBezig] = useState(false)
  const [resetVerzonden, setResetVerzonden] = useState(false)

  async function handleInloggen(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: wachtwoord,
    })
    if (error) setFout('Onbekend e-mailadres of onjuist wachtwoord.')
    setBezig(false)
  }

  async function handleWachtwoordVergeten() {
    if (!email) {
      setFout('Vul eerst je e-mailadres in.')
      return
    }
    setBezig(true)
    setFout(null)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/?type=recovery`,
    })
    setResetVerzonden(true)
    setBezig(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-10 text-center">
          <span className="text-xl font-semibold text-gray-900 tracking-tight">
            Planning
          </span>
        </div>

        <form onSubmit={handleInloggen} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              E-mailadres
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
              placeholder="naam@bedrijf.nl"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Wachtwoord
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {fout && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
              {fout}
            </div>
          )}

          <button
            type="submit"
            disabled={bezig}
            className="w-full py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {bezig ? 'Inloggen…' : 'Inloggen'}
          </button>

          {resetVerzonden ? (
            <p className="text-center text-xs text-green-600">
              Reset-link verstuurd — controleer je inbox.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleWachtwoordVergeten}
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Wachtwoord vergeten?
            </button>
          )}
        </form>

      </div>
    </div>
  )
}
