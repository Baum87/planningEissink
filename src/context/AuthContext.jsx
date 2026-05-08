import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export const ROLLEN = ['beheerder', 'planner', 'projectleider']

export function AuthProvider({ children }) {
  // undefined = sessie nog aan het laden, null = niet ingelogd, object = ingelogd
  const [user, setUser] = useState(undefined)
  const [rol, setRol] = useState(null)

  function verwerkUser(u) {
    setUser(u ?? null)
    setRol(u?.user_metadata?.rol ?? null)
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
    <AuthContext.Provider value={{ user, rol, uitloggen }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function isBeheerder(rol)      { return rol === 'beheerder' }
export function isPlanner(rol)        { return rol === 'planner' }
export function isProjectleider(rol)  { return rol === 'projectleider' }

// Volledige toegang voor beheerder en planner
export function heeftVolledigeToegang(rol) {
  return isBeheerder(rol) || isPlanner(rol)
}
