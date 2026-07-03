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
import Statistieken from './pages/Statistieken'
import UpdatesBadge from './components/UpdatesBadge'
import Prognose from './pages/Prognose'
import HandleidingModal from './components/HandleidingModal'

const ALLE_TABS = [
  { id: 'planning',     label: 'Planning',     component: Planning,     rollen: null },
  { id: 'overzicht',   label: 'Overzicht',    component: Overzicht,    rollen: null },
  { id: 'projecten',   label: 'Projecten',    component: Projecten,    rollen: null },
  { id: 'monteurs',    label: 'Monteurs',     component: Monteurs,     rollen: null },
  { id: 'prognose',    label: 'Prognose',     component: Prognose,     rollen: ['admin', 'management'] },
  { id: 'beheer',      label: 'Beheer',       component: Beheer,       rollen: ['admin'] },
  { id: 'statistieken',label: 'Statistieken', component: Statistieken, rollen: ['admin'] },
]

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7v4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="4.5" r="0.8" fill="currentColor" />
    </svg>
  )
}

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
  const { user, rol, naam, uitloggen, moetWachtwoordInstellen } = useAuth()
  const { tenant, error: tenantError } = useTenant()
  const [activeTab, setActiveTab] = useState('planning')
  const [hamburgerOpen, setHamburgerOpen] = useState(false)
  const [handleidingOpen, setHandleidingOpen] = useState(false)

  function navigeerNaar(tabId) {
    setActiveTab(tabId)
    setHamburgerOpen(false)
  }

  const TABS = useMemo(
    () => ALLE_TABS.filter((t) => !t.rollen || t.rollen.includes(rol)),
    [rol]
  )

  // Sessie wordt opgehaald — niets tonen om flicker te voorkomen
  if (user === undefined) return null

  // Recovery/invite: wacht tot PKCE code-exchange klaar is voor het formulier toont
  if (moetWachtwoordInstellen && user === null) return null

  // Uitnodiging of wachtwoord-reset link aangeklikt
  if (moetWachtwoordInstellen) return <WachtwoordInstellen />

  // Niet ingelogd
  if (user === null) return <Login />

  // Tenant kon niet geladen worden
  if (tenantError) return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <p className="text-sm font-medium text-gray-900 mb-2">De app kon niet worden geladen.</p>
        <p className="text-sm text-gray-500 mb-4">Controleer je internetverbinding en ververs de pagina.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Pagina verversen
        </button>
        <p className="text-xs text-gray-400 mt-6">Blijft dit probleem? Neem contact op via hello@byggr.nl</p>
      </div>
    </div>
  )

  const ActivePage = (TABS.find((t) => t.id === activeTab) ?? TABS[0]).component

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="relative flex items-center gap-1 h-14">

            {/* Mobiel: logo links (vaste breedte zodat naam gecentreerd blijft) */}
            <div className="md:hidden w-8 shrink-0 flex items-center">
              {tenant?.logo_url && (
                <img src={tenant.logo_url} alt="" className="h-7 w-7 object-contain rounded" />
              )}
            </div>

            {/* Tenant naam — desktop links, mobiel gecentreerd — beide klikbaar naar planning */}
            <button
              onClick={() => navigeerNaar('planning')}
              className="hidden md:flex items-center gap-2 text-sm font-semibold text-gray-900 mr-6 hover:text-gray-600 transition-colors"
            >
              {tenant?.logo_url && (
                <img src={tenant.logo_url} alt="" className="h-7 w-7 object-contain rounded" />
              )}
              {tenant?.naam ?? 'Planning'}
            </button>
            <button
              onClick={() => navigeerNaar('planning')}
              className="md:hidden absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-900 hover:text-gray-600 transition-colors"
            >
              {tenant?.naam ?? 'Planning'}
            </button>

            {/* Desktop tabs */}
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigeerNaar(tab.id)}
                className={`hidden md:flex px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Desktop: gebruiker + info + uitloggen */}
            <div className="hidden md:flex ml-auto items-center gap-4">
              <UpdatesBadge rol={rol} />
              {naam && (
                <span className="text-xs text-gray-400">{naam}</span>
              )}
              <button
                onClick={() => setHandleidingOpen(true)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Handleiding"
                title="Handleiding"
              >
                <InfoIcon />
              </button>
              <button onClick={uitloggen} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                Uitloggen
              </button>
            </div>

            {/* Mobiel: hamburger rechts (zelfde breedte als logo voor symmetrie) */}
            <button
              className="md:hidden ml-auto w-8 flex justify-end p-1 text-gray-500 hover:text-gray-900 transition-colors"
              onClick={() => setHamburgerOpen((v) => !v)}
            >
              <HamburgerIcon />
            </button>
          </div>
        </div>

        {/* Mobiel dropdown — zweeft over de pagina */}
        {hamburgerOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 z-20 bg-white border-b border-gray-200 shadow-lg">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigeerNaar(tab.id)}
                className={`w-full px-6 py-3.5 text-center text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-gray-50 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UpdatesBadge rol={rol} />
                {naam && <span className="text-xs text-gray-400">{naam}</span>}
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { setHandleidingOpen(true); setHamburgerOpen(false) }}
                  className="text-gray-400 hover:text-gray-700 transition-colors"
                  aria-label="Handleiding"
                >
                  <InfoIcon />
                </button>
                <button onClick={uitloggen} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
                  Uitloggen
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {handleidingOpen && <HandleidingModal onClose={() => setHandleidingOpen(false)} openSectie={activeTab} />}

      <main
        className={`px-6 py-6${activeTab !== 'planning' && activeTab !== 'overzicht' && activeTab !== 'prognose' ? ' max-w-screen-xl mx-auto' : ''}${activeTab === 'projecten' || activeTab === 'monteurs' ? ' flex flex-col overflow-hidden' : ''}`}
        style={activeTab === 'projecten' || activeTab === 'monteurs' ? { height: 'calc(100vh - 57px)' } : undefined}
      >
        <ActivePage onNavigate={navigeerNaar} />
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
