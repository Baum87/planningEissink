import { Navigate } from 'react-router-dom'

// Blokkeert een route serverside-achtig op rol i.p.v. alleen de knop te
// verbergen — voorkomt dat een onbevoegde rol een pagina bereikt door
// de URL direct in te typen. De onderliggende data blijft sowieso
// beschermd via Supabase RLS; dit is puur voor een nette UX.
export default function RouteGuard({ toegestaneRollen, rol, fallbackPad, children }) {
  if (toegestaneRollen && !toegestaneRollen.includes(rol)) {
    return <Navigate to={fallbackPad} replace />
  }
  return children
}
