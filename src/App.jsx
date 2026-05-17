import { useState, useMemo } from 'react'
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

function AppInner() {
  const { user, rol, uitloggen } = useAuth()
  const { tenant } = useTenant()
  const [activeTab, setActiveTab] = useState('planning')

  const TABS = useMemo(
    () => ALLE_TABS.filter((t) => !t.rollen || t.rollen.includes(rol)),
    [rol]
  )

  // Sessie wordt opgehaald — niets tonen om flicker te voorkomen
  if (user === undefined) return null

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
