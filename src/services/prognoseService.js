import { supabase, getTenantId } from '../lib/supabase'

const PROJECTLEIDER_SELECT = '*, projectleider:profielen!projectleider_id(id, afkorting, weergave_naam)'

export async function getPrognoseProjecten(van, tot) {
  let query = supabase
    .from('prognose_projecten')
    .select(PROJECTLEIDER_SELECT)
    .order('start_datum', { ascending: true })

  // Gooit projecten weg die sowieso na het zichtbare venster beginnen.
  // Precieze overlap-check (start_datum + duur_weken * 7 > van) doet de aanroeper.
  if (tot) query = query.lte('start_datum', tot)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createPrognoseProject(velden) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('prognose_projecten')
    .insert({ ...velden, tenant_id })
    .select(PROJECTLEIDER_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function updatePrognoseProject(id, updates) {
  const { data, error } = await supabase
    .from('prognose_projecten')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(PROJECTLEIDER_SELECT)
    .single()
  if (error) throw error
  return data
}

export async function deletePrognoseProject(id) {
  const { error } = await supabase.from('prognose_projecten').delete().eq('id', id)
  if (error) throw error
}

// Maakt via Edge Function een operationeel project aan en koppelt dit aan het prognose-record.
// Vereist dat Stap 2 (supabase/functions/prognose-in-opdracht) is uitgerold.
export async function setInOpdracht(id) {
  const { data, error } = await supabase.functions.invoke('prognose-in-opdracht', {
    body: { prognose_project_id: id },
  })
  if (error) throw error
  return data
}
