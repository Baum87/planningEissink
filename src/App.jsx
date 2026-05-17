import { useState, useMemo } from 'react'
import { supabase } from './lib/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TenantProvider, useTenant } from './context/TenantContext'
import Login from './pages/Login'
import Planning from './pages/Planning'
import Overzicht from './pages/Overzicht'
import Projecten from './pages/Projecten'
import Monteurs from './pages/Monteurs'
import Beheer from './pages/Beheer'

const ALLE_TABS = [
  { id: 'planning',  label: 'Planning',  component: Planning,  rollen: null },
  { id: 'overzicht', label: 'Overzicht', component: Overzicht, rollen: null },
  { id: 'projecten', label: 'Projecten', component: Projecten, rollen: null },
  { id: 'monteurs',  label: 'Monteurs',  component: Monteurs,  rollen: null },
  { id: 'beheer',    label: 'Beheer',    component: Beheer,    rollen: ['admin'] },
]

function WachtwoordInstellen() {
  const { setMoetWachtwoordInstellen } = useAuth()
  const [wachtwoord, setWachtwoord] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBezig(true)
    setFout(null)
    const { error } = await supabase.auth.updateUser({ password: wachtwoord })
    if (error) {
      setFout(error.message)
      setBezig(false)
      return
    }
    window.history.replaceState(null, '', window.location.pathname)
    setMoetWachtwoordInstellen(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-xl font-semibold text-gray-900 tracking-tight">Planning</span>
        </div>
        <p className="text-sm text-gray-500 text-center mb-6">Kies een wachtwoord om door te gaan.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Nieuw wachtwoord</label>
            <input
              type="password"
              required
              minLength={8}
              autoFocus
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors"
              placeholder="Minimaal 8 tekens"
            />
          </div>
          {fout && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">{fout}</div>
          )}
          <button
            type="submit"
            disabled={bezig}
            className="w-full py-2.5 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {bezig ? 'Opslaan…' : 'Wachtwoord instellen'}
          </button>
        </form>
      </div>
    </div>
  )
}

function AppInner() {
  const { user, rol, uitloggen, moetWachtwoordInstellen } = useAuth()
  const { tenant } = useTenant()
  const [activeTab, setActiveTab] = useState('planning')

  const TABS = useMemo(
    () => ALLE_TABS.filter((t) => !t.rollen || t.rollen.includes(rol)),
    [rol]
  )

  // Sessie wordt opgehaald — niets tonen om flicker te voorkomen
  if (user === undefined) return null

  // Uitnodiging of wachtwoord-reset link aangeklikt
  if (moetWachtwoordInstellen) return <WachtwoordInstellen />

  // Niet ingelogd
  if (user === null) return <Login />



  const ActivePage = (TABS.find((t) => t.id === activeTab) ?? TABS[0]).component

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex items-center gap-1 h-14">
            <span className="text-sm font-semibold text-gray-900 mr-6">
              {tenant?.naam ?? 'Planning'}
            </span>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-4">
              {(user?.app_metadata?.naam || user?.email) && (
                <span className="text-xs text-gray-400">
                  {user.app_metadata?.naam || user.email}
                </span>
              )}
              <button
                onClick={uitloggen}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </header>

      <main
        className={`px-6 py-6${activeTab !== 'planning' && activeTab !== 'overzicht' ? ' max-w-screen-xl mx-auto' : ''}${activeTab === 'projecten' || activeTab === 'monteurs' ? ' flex flex-col overflow-hidden' : ''}`}
        style={activeTab === 'projecten' || activeTab === 'monteurs' ? { height: 'calc(100vh - 57px)' } : undefined}
      >
        <ActivePage onNavigate={setActiveTab} />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <AppInner />
      </TenantProvider>
    </AuthProvider>
  )
}
