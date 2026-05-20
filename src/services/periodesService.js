import { supabase, getTenantId } from '../lib/supabase'

export async function getPeriodes() {
  const { data, error } = await supabase
    .from('periodes')
    .select('*')
    .order('datum_van')
  if (error) throw error
  return data
}

export async function createPeriode({ naam, datum_van, datum_tot, blokkeer }) {
  const tenant_id = await getTenantId()
  const { data, error } = await supabase
    .from('periodes')
    .insert({ tenant_id, naam, datum_van, datum_tot, blokkeer })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePeriode(id, { naam, datum_van, datum_tot, blokkeer }) {
  const { data, error } = await supabase
    .from('periodes')
    .update({ naam, datum_van, datum_tot, blokkeer })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePeriode(id) {
  const { error } = await supabase.from('periodes').delete().eq('id', id)
  if (error) throw error
}
