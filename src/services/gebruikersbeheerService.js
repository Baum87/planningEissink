import { supabase } from '../lib/supabase'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gebruikersbeheer`

async function roepAan(actie, body = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ actie, ...body }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Onbekende fout')
  return data
}

export const lijstGebruikers = () => roepAan('lijst')
export const uitnodigen = (email, naam, afkorting, rol) =>
  roepAan('uitnodigen', { email, naam, afkorting, rol, redirectTo: `${window.location.origin}/?type=invite` })
export const rolWijzigen = (user_id, rol) => roepAan('rol_wijzigen', { user_id, rol })
export const verwijderen = (user_id) => roepAan('verwijderen', { user_id })
