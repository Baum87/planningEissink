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

function HandleidingModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 pt-16 px-4 pb-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors text-xl leading-none"
          aria-label="Sluiten"
        >
          ✕
        </button>

        <h1 className="text-lg font-semibold text-gray-900 mb-6">Handleiding</h1>

        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Rollen</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Rol</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Wat je kunt</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-900">Planner</td>
                  <td className="px-4 py-2 text-gray-600">Alles bekijken én bewerken: inplannen, projecten aanmaken, monteurs beheren</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-900">Gebruiker</td>
                  <td className="px-4 py-2 text-gray-600">Alleen bekijken. Na inloggen automatisch gefilterd op je eigen naam</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Beheer (gebruikers aanmaken, periodes instellen) is voorbehouden aan de Admin.</p>
        </section>

        {[
          {
            titel: 'Planning',
            inhoud: [
              { kop: 'Navigeren', items: ['Gebruik de pijltjes bovenaan om een week voor of achteruit te bladeren.', 'Klik op "Vandaag" om terug te springen naar de huidige week.'] },
              { kop: 'Filters', items: ['Monteur — filter op één specifieke persoon. Als Gebruiker staat dit bij inloggen automatisch op je eigen naam.', 'Projectleider — toon alleen projecten van een specifieke projectleider.'] },
              { kop: 'Weergave-opties (toggles rechtsboven)', items: ['Weekend tonen — voeg zaterdag en zondag toe aan de weekweergave.', 'Vrije periodes — markeer bouwvak, feestdagen en andere geblokkeerde periodes.', 'Groepen — toon monteurs gegroepeerd in plaats van individueel.'] },
              { kop: 'Inplannen (alleen Planner)', items: ['Klik op een cel in de planning om een toewijzing aan te maken.', 'Kies het project, de start- en einddatum en sla op.', 'Klik op een bestaande toewijzing om deze te bewerken of te verwijderen.'] },
            ],
          },
          {
            titel: 'Overzicht',
            inhoud: [
              { kop: null, items: ['Toont toewijzingen in een andere weergave — handig voor een snel overzicht per periode.', 'Filter op projectleider via de dropdown bovenaan.', 'Als Gebruiker zie je automatisch je eigen toewijzingen.'] },
            ],
          },
          {
            titel: 'Projecten',
            inhoud: [
              { kop: null, items: ['Lijst van alle projecten met werknummer, omschrijving, opdrachtgever, plaats en projectleider.', 'Gebruik de zoekbalk om snel een project te vinden.', 'Klik op een kolom om te sorteren.'] },
              { kop: 'Aanmaken / bewerken (alleen Planner)', items: ['Klik op "Nieuw project" om een project toe te voegen.', 'Klik op een project in de lijst om het te bewerken.', 'Verplichte velden: werknummer en omschrijving.'] },
            ],
          },
          {
            titel: 'Monteurs',
            inhoud: [
              { kop: null, items: ['Filter op Intern / Onderaannemer via de knoppen bovenaan.', 'Gebruik de zoekbalk om te zoeken op naam of bedrijfsnaam.'] },
              { kop: 'Aanmaken / bewerken (alleen Planner)', items: ['Klik op "Nieuwe monteur" om een monteur toe te voegen.', 'Verplicht veld: achternaam en type (Intern of Onderaannemer).', 'Groepen aanmaken: klik op "Nieuwe groep" en voeg monteurs toe.'] },
            ],
          },
        ].map(({ titel, inhoud }) => (
          <section key={titel} className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">{titel}</h2>
            {inhoud.map(({ kop, items }, i) => (
              <div key={i} className="mb-2">
                {kop && <p className="text-xs font-medium text-gray-500 mb-1">{kop}</p>}
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  {items.map((item, j) => <li key={j}>{item}</li>)}
                </ul>
              </div>
            ))}
          </section>
        ))}

        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Veelgestelde vragen</h2>
          {[
            { v: 'Ik zie niet de juiste persoon in het filter.', a: 'Controleer of er een profiel voor deze persoon aangemaakt is. Dit doet de Admin via Beheer.' },
            { v: 'Ik kan niets bewerken.', a: 'Je hebt waarschijnlijk de rol Gebruiker. Neem contact op met de Admin als je bewerkrechten nodig hebt.' },
            { v: 'De planning laadt niet.', a: 'Controleer de internetverbinding. Als het probleem aanhoudt, neem contact op met de beheerder van de app.' },
          ].map(({ v, a }) => (
            <div key={v} className="mb-3">
              <p className="text-sm font-medium text-gray-800">{v}</p>
              <p className="text-sm text-gray-500">{a}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
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
  const { tenant } = useTenant()
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
              className="hidden md:block text-sm font-semibold text-gray-900 mr-6 hover:text-gray-600 transition-colors"
            >
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
              {naam && (
                <span className="text-xs text-gray-400">{naam}</span>
              )}
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

      {handleidingOpen && <HandleidingModal onClose={() => setHandleidingOpen(false)} />}

      <main
        className={`px-6 py-6${activeTab !== 'planning' && activeTab !== 'overzicht' ? ' max-w-screen-xl mx-auto' : ''}${activeTab === 'projecten' || activeTab === 'monteurs' ? ' flex flex-col overflow-hidden' : ''}`}
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
