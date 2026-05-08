import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Planning from './pages/Planning'
import Overzicht from './pages/Overzicht'
import Projecten from './pages/Projecten'
import Monteurs from './pages/Monteurs'

const TABS = [
  { id: 'planning',  label: 'Planning',  component: Planning  },
  { id: 'overzicht', label: 'Overzicht', component: Overzicht },
  { id: 'projecten', label: 'Projecten', component: Projecten },
  { id: 'monteurs',  label: 'Monteurs',  component: Monteurs  },
]

function AppInner() {
  const { user, rol, uitloggen } = useAuth()
  const [activeTab, setActiveTab] = useState('planning')

  // Sessie wordt opgehaald — niets tonen om flicker te voorkomen
  if (user === undefined) return null

  // Niet ingelogd
  if (user === null) return <Login />



  const ActivePage = TABS.find((t) => t.id === activeTab).component

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-screen-xl mx-auto px-6">
          <div className="flex items-center gap-1 h-14">
            <span className="text-sm font-semibold text-gray-900 mr-6">
              Eissink Planning
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
              {(user?.user_metadata?.naam || user?.email) && (
                <span className="text-xs text-gray-400">
                  {user.user_metadata?.naam || user.email}
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

      <main className={`px-6 py-6${activeTab !== 'planning' && activeTab !== 'overzicht' ? ' max-w-screen-xl mx-auto' : ''}`}>
        <ActivePage onNavigate={setActiveTab} />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
