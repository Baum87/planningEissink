import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = sessie nog aan het laden, null = niet ingelogd, object = ingelogd
  const [user, setUser] = useState(undefined)
  const [rol, setRol] = useState(null)
  const [naam, setNaam] = useState(null)
  const [initialen, setInitialen] = useState(null)

  // Detecteer uitnodiging of wachtwoord-reset link — implicit flow via hash, PKCE via query string
  const [moetWachtwoordInstellen, setMoetWachtwoordInstellen] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const hashType = hashParams.get('type')
    if (hashType === 'invite' || hashType === 'recovery') return true
    const queryParams = new URLSearchParams(window.location.search)
    const queryType = queryParams.get('type')
    return queryType === 'invite' || queryType === 'recovery'
  })

  function verwerkUser(u) {
    setUser(u ?? null)
    setRol(u?.app_metadata?.rol ?? null)
    setNaam(u?.app_metadata?.naam ?? u?.email ?? null)
    setInitialen(u?.app_metadata?.afkorting ?? null)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => verwerkUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setMoetWachtwoordInstellen(true)
      verwerkUser(session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function uitloggen() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, rol, naam, initialen, uitloggen, moetWachtwoordInstellen, setMoetWachtwoordInstellen }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function isGebruiker(rol)      { return rol === 'gebruiker' }

export function heeftVolledigeToegang(rol) {
  return rol === 'admin' || rol === 'planner'
}
