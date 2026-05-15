import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export const ROLLEN = ['admin', 'planner', 'gebruiker', 'monteur']

export function AuthProvider({ children }) {
  // undefined = sessie nog aan het laden, null = niet ingelogd, object = ingelogd
  const [user, setUser] = useState(undefined)
  const [rol, setRol] = useState(null)
  const [initialen, setInitialen] = useState(null)

  // TODO gebruikersbeheer: rol wordt nu handmatig gezet via Supabase Dashboard of Admin API.
  // Koppel hier later een Edge Function aan (bijv. POST /functions/v1/set-user-rol) zodat
  // beheerders rollen zelf kunnen toewijzen vanuit de app.
  function verwerkUser(u) {
    setUser(u ?? null)
    setRol(u?.app_metadata?.rol ?? null)
    setInitialen(u?.user_metadata?.initialen ?? null)
  }

  useEffect(() => {
    // getUser() haalt verse data op van de server (user_metadata altijd actueel)
    supabase.auth.getUser().then(({ data: { user } }) => verwerkUser(user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      verwerkUser(session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function uitloggen() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, rol, initialen, uitloggen }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function isAdmin(rol)          { return rol === 'admin' }
export function isPlanner(rol)        { return rol === 'planner' }
export function isGebruiker(rol)      { return rol === 'gebruiker' }
export function isMonteur(rol)        { return rol === 'monteur' }

export function heeftVolledigeToegang(rol) {
  return isAdmin(rol) || isPlanner(rol)
}
