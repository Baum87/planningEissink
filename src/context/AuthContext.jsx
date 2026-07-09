import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = sessie nog aan het laden, null = niet ingelogd, object = ingelogd
  const [user, setUser] = useState(undefined)
  const [rol, setRol] = useState(null)
  const [naam, setNaam] = useState(null)
  const [initialen, setInitialen] = useState(null)
  const [moetWachtwoordInstellen, setMoetWachtwoordInstellen] = useState(false)
  const [linkFout, setLinkFout] = useState(null)

  function verwerkUser(u) {
    setUser(u ?? null)
    setRol(u?.app_metadata?.rol ?? null)
    setNaam(u?.app_metadata?.naam ?? u?.email ?? null)
    setInitialen(u?.app_metadata?.afkorting ?? null)
  }

  useEffect(() => {
    let subscription

    // Pas ná deze initiële afhandeling gaan we luisteren naar auth-events, zodat een
    // eventuele nog actieve (stale) sessie nooit tussentijds via onAuthStateChange
    // wordt teruggezet terwijl de invite/recovery-link nog wordt verwerkt.
    async function init() {
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const queryParams = new URLSearchParams(window.location.search)
      const type = hashParams.get('type') || queryParams.get('type')
      const code = queryParams.get('code')
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const isUitnodigingOfReset = type === 'invite' || type === 'recovery'
      const heeftToken = !!code || (!!accessToken && !!refreshToken)

      if (isUitnodigingOfReset && heeftToken) {
        // Eerst een eventuele al actieve sessie in deze browser opruimen, zodat die
        // nooit stilzwijgend blijft hangen als het wisselen hieronder faalt.
        await supabase.auth.signOut()

        // Twee mogelijke linkformaten van Supabase: PKCE (?code=...) of het oudere
        // implicit-formaat (#access_token=...&refresh_token=...).
        const { error } = code
          ? await supabase.auth.exchangeCodeForSession(code)
          : await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

        window.history.replaceState(null, '', window.location.pathname)
        if (error) {
          setLinkFout('Deze link is verlopen of al gebruikt. Vraag een nieuwe uitnodiging of reset-link aan.')
          setUser(null)
        } else {
          const { data: { user } } = await supabase.auth.getUser()
          verwerkUser(user)
          setMoetWachtwoordInstellen(true)
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        verwerkUser(user)
      }

      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        verwerkUser(session?.user)
      })
      subscription = data.subscription
    }
    init()

    return () => subscription?.unsubscribe()
  }, [])

  async function uitloggen() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, rol, naam, initialen, uitloggen, moetWachtwoordInstellen, setMoetWachtwoordInstellen, linkFout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function isGebruiker(rol)      { return rol === 'gebruiker' }
export function isManagement(rol)     { return rol === 'management' }
export function kanPrognose(rol)      { return rol === 'admin' || rol === 'management' }

export function heeftVolledigeToegang(rol) {
  return rol === 'admin' || rol === 'planner'
}
