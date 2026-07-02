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
export const aanmaken = (email, naam, afkorting, rol, wachtwoord) =>
  roepAan('aanmaken', { email, naam, afkorting, rol, wachtwoord })
export const rolWijzigen = (user_id, rol) => roepAan('rol_wijzigen', { user_id, rol })
export const updateGebruiker = (user_id, { naam, email, afkorting, wachtwoord, rol, avatar_kleur }) =>
  roepAan('wijzigen', { user_id, naam, email, afkorting, wachtwoord, rol, avatar_kleur })
export const verwijderen = (user_id) => roepAan('verwijderen', { user_id })

export const profielAanmaken = (naam, afkorting) =>
  roepAan('profiel_aanmaken', { naam, afkorting })

export const profielKoppelen = (profiel_id, email) =>
  roepAan('profiel_koppelen', { profiel_id, email, redirectTo: `${window.location.origin}/?type=invite` })

export const profielKoppelenAanmaken = (profiel_id, email, wachtwoord) =>
  roepAan('profiel_koppelen_aanmaken', { profiel_id, email, wachtwoord })

export async function getProfielen() {
  const { data, error } = await supabase
    .from('profielen')
    .select('id, user_id, afkorting, weergave_naam, avatar_kleur')
    .order('weergave_naam')
  if (error) throw new Error(error.message)
  return data ?? []
}

export const profielenZonderAccount = async () => {
  const { data, error } = await supabase
    .from('profielen')
    .select('id, weergave_naam, afkorting, created_at')
    .is('user_id', null)
    .order('weergave_naam')
  if (error) throw new Error(error.message)
  return data
}

export const alleProfielen = async () => {
  const { data, error } = await supabase
    .from('profielen')
    .select('id, user_id, weergave_naam, afkorting, created_at, avatar_kleur')
    .order('weergave_naam')
  if (error) throw new Error(error.message)
  return data ?? []
}

export const profielVerwijderen = async (profiel_id) => {
  const { error } = await supabase
    .from('profielen')
    .delete()
    .eq('id', profiel_id)
  if (error) throw new Error(error.message)
}

export const profielUpdaten = async (profiel_id, velden) => {
  const { error } = await supabase
    .from('profielen')
    .update(velden)
    .eq('id', profiel_id)
  if (error) throw new Error(error.message)
}
